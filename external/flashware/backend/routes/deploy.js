const express = require('express');
const Joi = require('joi');
const { moveCompiler } = require('../services/moveCompiler');
const { authenticateWallet } = require('../middleware/auth');
const { deployLimiter } = require('../middleware/rateLimit');
const prisma = require('../utils/prisma');

const router = express.Router();

// Validation schema
const deploySchema = Joi.object({
  moveCode: Joi.string().required().min(100),
  nodes: Joi.array().required(),
  edges: Joi.array().required(),
  walletAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40,}$/),
});

// POST /api/deploy - Compile and deploy Move contract
router.post('/', deployLimiter, authenticateWallet, async (req, res) => {
  try {
    // Validate request
    const { error, value } = deploySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details[0].message,
      });
    }

    const { moveCode, nodes, edges, walletAddress } = value;

    // Compile Move code
    const compilationResult = await moveCompiler.compile(moveCode);
    if (!compilationResult.success) {
      return res.status(400).json({
        error: 'Compilation Error',
        details: compilationResult.error,
      });
    }

    // Deploy to Sui testnet
    const deploymentResult = await moveCompiler.deploy(
      compilationResult.bytecode,
      walletAddress
    );

    if (!deploymentResult.success) {
      return res.status(500).json({
        error: 'Deployment Error',
        details: deploymentResult.error,
      });
    }

    // Save deployment to database
    const deployment = await prisma.deployment.create({
      data: {
        packageId: deploymentResult.packageId,
        moveCode,
        nodes,
        edges,
        walletAddress,
        status: 'DEPLOYED',
        gasUsed: deploymentResult.gasUsed,
        transactionHash: deploymentResult.transactionHash,
      },
    });

    // Update environment with new package ID
    process.env.FLASHWARE_PACKAGE_ID = deploymentResult.packageId;

    res.json({
      success: true,
      packageId: deploymentResult.packageId,
      transactionHash: deploymentResult.transactionHash,
      gasUsed: deploymentResult.gasUsed,
      deploymentId: deployment.id,
      status: 'DEPLOYED',
      message: 'Contract deployed successfully to Sui testnet',
    });

  } catch (error) {
    console.error('Deploy error:', error);
    res.status(500).json({
      error: 'Deployment failed',
      details: error.message,
    });
  }
});

// GET /api/deploy/:packageId - Get deployment info
router.get('/:packageId', async (req, res) => {
  try {
    const { packageId } = req.params;

    const deployment = await prisma.deployment.findUnique({
      where: { packageId },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found',
      });
    }

    res.json({
      success: true,
      deployment: {
        id: deployment.id,
        packageId: deployment.packageId,
        status: deployment.status,
        gasUsed: deployment.gasUsed,
        transactionHash: deployment.transactionHash,
        createdAt: deployment.createdAt,
        executions: deployment.executions,
      },
    });

  } catch (error) {
    console.error('Get deployment error:', error);
    res.status(500).json({
      error: 'Failed to fetch deployment',
      details: error.message,
    });
  }
});

// GET /api/deploy/wallet/:address - Get deployments by wallet
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;

    const deployments = await prisma.deployment.findMany({
      where: { walletAddress: address },
      orderBy: { createdAt: 'desc' },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    res.json({
      success: true,
      deployments,
      count: deployments.length,
    });

  } catch (error) {
    console.error('Get deployments by wallet error:', error);
    res.status(500).json({
      error: 'Failed to fetch deployments',
      details: error.message,
    });
  }
});

module.exports = router;