const { TransactionBlock } = require('@mysten/sui.js');
const { SuiClient } = require('@mysten/sui.js');

class PTBCompiler {
  constructor() {
    this.suiClient = new SuiClient({
      url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io',
    });
  }

  async build(transactionBlock, packageId, gasBudget = 10000000) {
    try {
      const tx = new TransactionBlock();
      
      // Set gas budget
      tx.setGasBudget(gasBudget);

      // Build the transaction based on the provided block structure
      const builtTx = this.buildFromBlockStructure(transactionBlock, packageId, tx);

      const transactionBytes = await builtTx.build({ client: this.suiClient });

      return {
        success: true,
        transactionBytes: Buffer.from(transactionBytes).toString('base64'),
        gasBudget,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Transaction build failed',
      };
    }
  }

  buildFromBlockStructure(blockStructure, packageId, tx) {
    // Extract blocks and connections from the structure
    const { nodes, edges } = blockStructure;

    // Find the borrow, swap, and repay nodes
    const borrowNode = nodes.find(n => n.type === 'borrow');
    const swapNodes = nodes.filter(n => n.type === 'swap');
    const repayNode = nodes.find(n => n.type === 'repay');

    if (!borrowNode || !repayNode) {
      throw new Error('Missing required Borrow or Repay nodes');
    }

    // Flash loan borrow
    const { amount, poolId, tokenType } = borrowNode.data.parameters;
    const pool = tx.object(poolId);
    const clock = tx.object('0x6'); // SUI clock object

    const [borrowedCoins, receipt] = tx.moveCall({
      target: `${packageId}::flash_loan::borrow`,
      arguments: [pool, tx.pure(amount), clock],
      typeArguments: [tokenType || '0x2::sui::SUI'],
    });

    let currentCoins = borrowedCoins;

    // Execute swaps
    swapNodes.forEach((swapNode, index) => {
      const { dexPoolId, inputToken, outputToken, minOutputAmount, amount: swapAmount } = swapNode.data.parameters;
      
      // For now, we'll use the full amount or a percentage
      const actualSwapAmount = swapAmount === '100%' ? undefined : parseInt(swapAmount);

      const [swapResult] = tx.moveCall({
        target: `${packageId}::${swapNode.data.parameters.dex || 'cetus'}::swap`,
        arguments: [
          tx.object(dexPoolId),
          actualSwapAmount ? coin::split(currentCoins, actualSwapAmount) : currentCoins,
          tx.pure(minOutputAmount || '0'),
          clock,
        ],
        typeArguments: [inputToken || '0x2::sui::SUI', outputToken],
      });

      // If we split coins, merge remaining back
      if (actualSwapAmount) {
        tx.moveCall({
          target: '0x2::coin::join',
          arguments: [currentCoins, coin::join(swapResult)],
          typeArguments: [inputToken || '0x2::sui::SUI'],
        });
      }

      currentCoins = swapResult;
    });

    // Repay flash loan
    tx.moveCall({
      target: `${packageId}::flash_loan::repay`,
      arguments: [pool, currentCoins, receipt],
      typeArguments: [tokenType || '0x2::sui::SUI'],
    });

    return tx;
  }

  async buildFromFlow(nodes, edges, packageId, gasBudget = 10000000) {
    try {
      const blockStructure = { nodes, edges };
      return await this.build(blockStructure, packageId, gasBudget);
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Flow build failed',
      };
    }
  }

  async simulate(transactionBytes) {
    try {
      const bytes = Buffer.from(transactionBytes, 'base64');
      
      const result = await this.suiClient.devInspectTransactionBlock({
        sender: '0x0000000000000000000000000000000000000000',
        transactionBlock: bytes,
      });

      if (result.error) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        effects: result.effects,
        events: result.events || [],
        gasUsed: result.effects.gasUsed?.computationCost || '0',
        gasCost: result.effects.gasUsed,
        status: result.effects.status.status,
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Simulation failed',
      };
    }
  }

  async getEvents(transactionHash) {
    try {
      const result = await this.suiClient.queryTransactionEvents({
        digest: transactionHash,
      });

      return result.data;

    } catch (error) {
      console.error('Failed to get events:', error);
      return [];
    }
  }

  calculateProfitLoss(events) {
    try {
      // Extract balance changes from events
      let inputAmount = 0;
      let outputAmount = 0;

      events.forEach(event => {
        if (event.type.includes('SwapEvent')) {
          const parsedJson = event.parsedJson;
          if (parsedJson.input_amount) {
            inputAmount += BigInt(parsedJson.input_amount);
          }
          if (parsedJson.output_amount) {
            outputAmount += BigInt(parsedJson.output_amount);
          }
        }
      });

      // Calculate profit/loss
      const profitLoss = outputAmount - inputAmount;
      return profitLoss.toString();

    } catch (error) {
      console.error('Failed to calculate profit/loss:', error);
      return '0';
    }
  }

  validateTransactionStructure(nodes, edges) {
    const errors = [];

    // Check if all required node types are present
    const hasBorrow = nodes.some(n => n.type === 'borrow');
    const hasRepay = nodes.some(n => n.type === 'repay');
    const hasSwap = nodes.some(n => n.type === 'swap');

    if (!hasBorrow) errors.push('Missing borrow node');
    if (!hasRepay) errors.push('Missing repay node');
    if (!hasSwap) errors.push('Missing swap node');

    // Check if all nodes are connected properly
    const nodeIds = nodes.map(n => n.id);
    const connectedNodes = new Set();

    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const unconnectedNodes = nodeIds.filter(id => !connectedNodes.has(id));
    if (unconnectedNodes.length > 0) {
      errors.push(`Unconnected nodes: ${unconnectedNodes.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = { ptbCompiler: new PTBCompiler() };