module flashware::flash_loan {
    use sui::coin::{Self, Coin};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::object::{Self, UID};
    use std::option::Option;
    use flashware::pool::{Self, Pool};
    use flashware::receipt::{Self, FlashLoanReceipt};

    /// Error codes
    const E_INSUFFICIENT_LIQUIDITY: u64 = 0;
    const E_INSUFFICIENT_REPAYMENT: u64 = 1;
    const E_INVALID_RECEIPT: u64 = 2;
    const E_EXPIRED_RECEIPT: u64 = 3;

    /// Borrow flash loan from pool
    /// Returns the borrowed coins and a receipt that must be consumed in the same transaction
    public fun borrow<T>(
        pool: &mut Pool<T>,
        amount: u64,
        ctx: &mut TxContext
    ): (Coin<T>, FlashLoanReceipt<T>) {
        // Check if pool has sufficient liquidity
        assert!(pool.balance() >= amount, E_INSUFFICIENT_LIQUIDITY);
        
        // Withdraw tokens from pool
        let borrowed_coins = pool.withdraw(amount);
        
        // Create hot potato receipt (must be consumed in same transaction)
        let receipt = receipt::new(
            amount,
            object::id(pool),
            tx_context::epoch(ctx),
            ctx
        );
        
        (borrowed_coins, receipt)
    }

    /// Repay flash loan with receipt
    /// This consumes the receipt and deposits coins back to pool
    public fun repay<T>(
        pool: &mut Pool<T>,
        coins: Coin<T>,
        receipt: FlashLoanReceipt<T>,
        ctx: &mut TxContext
    ) {
        let FlashLoanReceipt {
            amount,
            pool_id,
            borrowed_at,
            uid
        } = receipt;

        // Verify this receipt is for the correct pool
        assert!(object::id(pool) == pool_id, E_INVALID_RECEIPT);
        
        // Verify receipt hasn't expired (e.g., 1 epoch timeout for safety)
        let current_epoch = tx_context::epoch(ctx);
        assert!(current_epoch <= borrowed_at + 1, E_EXPIRED_RECEIPT);
        
        // Verify repayment amount covers the borrowed amount
        // In a real implementation, you might add interest here
        let repayment_amount = coin::value(&coins);
        assert!(repayment_amount >= amount, E_INSUFFICIENT_REPAYMENT);
        
        // Deposit coins back to pool
        pool.deposit(coins);
        
        // Destroy the receipt UID
        object::delete(uid);
    }

    /// Emergency function to handle expired receipts
    /// This would only be called in exceptional circumstances
    public fun handle_expired_receipt<T>(
        receipt: FlashLoanReceipt<T>,
        ctx: &mut TxContext
    ) {
        let FlashLoanReceipt { amount: _, pool_id: _, borrowed_at: _, uid } = receipt;
        
        // In a real implementation, you might want to:
        // 1. Log the expiration event
        // 2. Potentially slash the borrower's collateral
        // 3. Notify the pool manager
        
        // For now, just destroy the receipt
        object::delete(uid);
    }

    /// Get the amount borrowed from a receipt (read-only)
    public fun receipt_amount<T>(receipt: &FlashLoanReceipt<T>): u64 {
        receipt.amount()
    }

    /// Get the pool ID from a receipt (read-only)
    public fun receipt_pool_id<T>(receipt: &FlashLoanReceipt<T>): ID {
        receipt.pool_id()
    }

    /// Get the epoch when the loan was borrowed (read-only)
    public fun receipt_borrowed_at<T>(receipt: &FlashLoanReceipt<T>): u64 {
        receipt.borrowed_at()
    }
}