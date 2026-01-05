const express = require('express');
const Joi = require('joi');
const { ptbCompiler } = require('../services/ptbCompiler');
const { authenticateWallet } = require('../middleware/auth');
const { executeLimiter } = require('../middleware/rateLimit');
const prisma = require('../utils/prisma');

const router = express.Router();

// Validation schema
const executeSchema = Joi.object({
  transactionBlock: Joi.object().required(),
  deploymentId: Joi.string().required(),
  walletAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40,}$/),
  gasBudget: Joi.number().default(10000000), // 0.01 SUI
});

// POST /api/execute - Build and prepare transaction for signing
router.post('/', executeLimiter, authenticateWallet, async (req, res) => {
  try {
    // Validate request
    const { error, value } = executeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details[0].message,
      });
    }

    const { transactionBlock, deploymentId, walletAddress, gasBudget } = value;

    // Get deployment info
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!deployment) {
      return res.status(404).json({
        error: 'Deployment not found',
      });
    }

    if (deployment.walletAddress !== walletAddress) {
      return res.status(403).json({
        error: 'Unauthorized',
        details: 'You can only execute your own deployments',
      });
    }

    // Build transaction block
    const txResult = await ptbCompiler.build(
      transactionBlock,
      deployment.packageId,
      gasBudget
    );

    if (!txResult.success) {
      return res.status(400).json({
        error: 'Transaction Build Error',
        details: txResult.error,
      });
    }

    // Save execution attempt
    const execution = await prisma.execution.create({
      data: {
        deploymentId,
        walletAddress,
        status: 'PENDING',
        gasBudget,
        transactionBytes: txResult.transactionBytes,
      },
    });

    res.json({
      success: true,
      executionId: execution.id,
      transactionBytes: txResult.transactionBytes,
      gasBudget,
      message: 'Transaction prepared. Please sign in your wallet.',
    });

  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({
      error: 'Execution preparation failed',
      details: error.message,
    });
  }
});

// POST /api/execute/confirm - Confirm transaction execution
router.post('/confirm', authenticateWallet, async (req, res) => {
  try {
    const { executionId, transactionHash, gasUsed, status, error } = req.body;

    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      return res.status(404).json({
        error: 'Execution not found',
      });
    }

    // Update execution status
    const updatedExecution = await prisma.execution.update({
      where: { id: executionId },
      data: {
        status: status || 'FAILED',
        transactionHash,
        gasUsed: gasUsed ? BigInt(gasUsed) : null,
        error,
        completedAt: new Date(),
      },
    });

    // If successful, parse events for profit/loss
    if (status === 'SUCCESS' && transactionHash) {
      const events = await ptbCompiler.getEvents(transactionHash);
      
      // Calculate profit/loss from events
      const profitLoss = ptbCompiler.calculateProfitLoss(events);
      
      await prisma.execution.update({
        where: { id: executionId },
        data: {
          profitLoss: profitLoss ? BigInt(profitLoss) : null,
          events,
        },
      });
    }

    res.json({
      success: true,
      execution: updatedExecution,
      message: 'Execution status updated',
    });

  } catch (error) {
    console.error('Execute confirm error:', error);
    res.status(500).json({
      error: 'Failed to confirm execution',
      details: error.message,
    });
  }
});

// GET /api/execute/:executionId - Get execution info
router.get('/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;

    const execution = await prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        deployment: {
          select: {
            packageId: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!execution) {
      return res.status(404).json({
        error: 'Execution not found',
      });
    }

    res.json({
      success: true,
      execution,
    });

  } catch (error) {
    console.error('Get execution error:', error);
    res.status(500).json({
      error: 'Failed to fetch execution',
      details: error.message,
    });
  }
});

// GET /api/execute/deployment/:deploymentId - Get executions for deployment
router.get('/deployment/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;

    const executions = await prisma.execution.findMany({
      where: { deploymentId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      executions,
      count: executions.length,
    });

  } catch (error) {
    console.error('Get executions by deployment error:', error);
    res.status(500).json({
      error: 'Failed to fetch executions',
      details: error.message,
    });
  }
});

module.exports = router;