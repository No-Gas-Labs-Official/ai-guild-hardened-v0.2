const express = require('express');
const Joi = require('joi');
const { ptbCompiler } = require('../services/ptbCompiler');
const { authenticateWallet } = require('../middleware/auth');
const { simulateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// Validation schema
const simulateSchema = Joi.object({
  transactionBytes: Joi.string().required(),
  walletAddress: Joi.string().required().pattern(/^0x[a-fA-F0-9]{40,}$/),
});

// POST /api/simulate - Simulate transaction execution
router.post('/', simulateLimiter, authenticateWallet, async (req, res) => {
  try {
    // Validate request
    const { error, value } = simulateSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        details: error.details[0].message,
      });
    }

    const { transactionBytes, walletAddress } = value;

    // Simulate transaction
    const simulationResult = await ptbCompiler.simulate(transactionBytes);

    if (!simulationResult.success) {
      return res.status(400).json({
        error: 'Simulation Error',
        details: simulationResult.error,
      });
    }

    res.json({
      success: true,
      simulation: {
        effects: simulationResult.effects,
        events: simulationResult.events,
        gasUsed: simulationResult.gasUsed,
        gasCost: simulationResult.gasCost,
        status: simulationResult.status,
      },
      message: 'Simulation completed successfully',
    });

  } catch (error) {
    console.error('Simulate error:', error);
    res.status(500).json({
      error: 'Simulation failed',
      details: error.message,
    });
  }
});

// POST /api/simulate/flow - Simulate flow execution without deploying
router.post('/flow', simulateLimiter, authenticateWallet, async (req, res) => {
  try {
    const { nodes, edges, walletAddress, packageId } = req.body;

    if (!nodes || !edges) {
      return res.status(400).json({
        error: 'Validation Error',
        details: 'Nodes and edges are required',
      });
    }

    // Build transaction block from flow
    const txResult = await ptbCompiler.buildFromFlow(nodes, edges, packageId);

    if (!txResult.success) {
      return res.status(400).json({
        error: 'Transaction Build Error',
        details: txResult.error,
      });
    }

    // Simulate the built transaction
    const simulationResult = await ptbCompiler.simulate(txResult.transactionBytes);

    if (!simulationResult.success) {
      return res.status(400).json({
        error: 'Simulation Error',
        details: simulationResult.error,
      });
    }

    res.json({
      success: true,
      transactionBytes: txResult.transactionBytes,
      simulation: {
        effects: simulationResult.effects,
        events: simulationResult.events,
        gasUsed: simulationResult.gasUsed,
        gasCost: simulationResult.gasCost,
        status: simulationResult.status,
      },
      message: 'Flow simulation completed successfully',
    });

  } catch (error) {
    console.error('Simulate flow error:', error);
    res.status(500).json({
      error: 'Flow simulation failed',
      details: error.message,
    });
  }
});

module.exports = router;