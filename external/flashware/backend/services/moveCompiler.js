const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { SuiClient, SuiUtils } = require('@mysten/sui.js');

class MoveCompiler {
  constructor() {
    this.suiClient = new SuiClient({
      url: process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io',
    });
    this.tempDir = '/tmp/flashware-compilation';
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async compile(moveCode) {
    try {
      const sessionId = Date.now().toString();
      const contractDir = path.join(this.tempDir, sessionId);
      fs.mkdirSync(contractDir, { recursive: true });

      // Write Move.toml
      const moveToml = this.generateMoveToml();
      fs.writeFileSync(path.join(contractDir, 'Move.toml'), moveToml);

      // Create sources directory and write contract
      const sourcesDir = path.join(contractDir, 'sources');
      fs.mkdirSync(sourcesDir, { recursive: true });
      
      // Write the main contract file
      const contractFile = path.join(sourcesDir, 'flashware_strategy.move');
      fs.writeFileSync(contractFile, moveCode);

      // Write dependency contracts
      await this.writeDependencyContracts(sourcesDir);

      // Compile using sui move build
      const buildCommand = `cd ${contractDir} && sui move build --dump-bytecode-as-base64`;
      
      try {
        const output = execSync(buildCommand, { 
          encoding: 'utf8',
          timeout: 30000, // 30 second timeout
        });

        // Parse bytecode from output
        const bytecodeMatch = output.match(/Bytecode: ([a-zA-Z0-9+/=]+)/);
        if (!bytecodeMatch) {
          throw new Error('Failed to extract bytecode from compilation output');
        }

        const bytecode = bytecodeMatch[1];

        // Clean up
        fs.rmSync(contractDir, { recursive: true, force: true });

        return {
          success: true,
          bytecode,
          dependencies: ['flashware'],
        };

      } catch (compileError) {
        // Clean up on error
        fs.rmSync(contractDir, { recursive: true, force: true });
        
        return {
          success: false,
          error: compileError.message || 'Compilation failed',
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Compilation setup failed',
      };
    }
  }

  async deploy(bytecode, walletAddress) {
    try {
      // This would deploy the compiled bytecode to Sui testnet
      // For now, we'll simulate deployment with a mock package ID
      
      const packageId = SuiUtils.normalizeSuiAddress(
        '0x' + Array.from({length: 40}, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('')
      );

      const transactionHash = SuiUtils.normalizeSuiAddress(
        '0x' + Array.from({length: 64}, () => 
          Math.floor(Math.random() * 16).toString(16)
        ).join('')
      );

      const gasUsed = Math.floor(Math.random() * 50000000) + 10000000; // 0.01-0.05 SUI

      return {
        success: true,
        packageId,
        transactionHash,
        gasUsed,
        network: 'testnet',
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Deployment failed',
      };
    }
  }

  generateMoveToml() {
    return `[package]
name = "flashware_strategy"
version = "0.0.1"
edition = "2024.beta"

[dependencies]
Sui = { git = "https://github.com/MystenLabs/sui.git", subdir = "crates/sui-framework/packages/sui-framework", rev = "framework/testnet" }
flashware = { local = "../flashware" }

[addresses]
flashware_strategy = "0x0"
flashware = "0xDEADBEEF"
`;
  }

  async writeDependencyContracts(sourcesDir) {
    // Flash loan contract
    const flashLoanCode = `
module flashware::flash_loan {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use flashware::pool::Pool;
    use flashware::receipt::FlashLoanReceipt;

    public fun borrow<T>(
        pool: &mut Pool<T>,
        amount: u64,
        ctx: &mut TxContext
    ): (Coin<T>, FlashLoanReceipt<T>) {
        let borrowed_coins = pool.withdraw(amount);
        let receipt = FlashLoanReceipt {
            amount,
            pool_id: object::id(pool),
            borrowed_at: tx_context::epoch(ctx),
        };
        
        (borrowed_coins, receipt)
    }

    public fun repay<T>(
        pool: &mut Pool<T>,
        coins: Coin<T>,
        receipt: FlashLoanReceipt<T>,
        ctx: &mut TxContext
    ) {
        let FlashLoanReceipt { amount, pool_id: _, borrowed_at: _ } = receipt;
        
        // Verify amount matches (could add interest here)
        assert!(coin::value(&coins) >= amount, E_INSUFFICIENT_REPAYMENT);
        
        pool.deposit(coins);
    }
}`;
    
    fs.writeFileSync(path.join(sourcesDir, 'flash_loan.move'), flashLoanCode);

    // Pool contract
    const poolCode = `
module flashware::pool {
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::TxContext;
    use std::option::Option;

    public struct Pool<T> has key, store {
        id: UID,
        balance: u64,
        coin_type: phantomdata<T>,
    }

    public fun new<T>(ctx: &mut TxContext): Pool<T> {
        Pool {
            id: object::new(ctx),
            balance: 0,
            coin_type: phantomdata,
        }
    }

    public fun deposit<T>(self: &mut Pool<T>, coins: Coin<T>) {
        self.balance = self.balance + coin::value(&coins);
        coin::destroy_zero(coins);
    }

    public fun withdraw<T>(self: &mut Pool<T>, amount: u64): Coin<T> {
        assert!(self.balance >= amount, E_INSUFFICIENT_LIQUIDITY);
        self.balance = self.balance - amount;
        coin::zero<T>()
    }

    public fun balance<T>(self: &Pool<T>): u64 {
        self.balance
    }
}`;
    
    fs.writeFileSync(path.join(sourcesDir, 'pool.move'), poolCode);

    // Receipt contract
    const receiptCode = `
module flashware::receipt {
    use sui::object::{Self, UID};

    public struct FlashLoanReceipt<T> has drop {
        amount: u64,
        pool_id: ID,
        borrowed_at: u64,
    }
}`;
    
    fs.writeFileSync(path.join(sourcesDir, 'receipt.move'), receiptCode);
  }
}

module.exports = { moveCompiler: new MoveCompiler() };