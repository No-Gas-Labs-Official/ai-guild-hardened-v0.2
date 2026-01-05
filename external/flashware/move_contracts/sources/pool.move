module flashware::pool {
    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::TxContext;
    use std::vector;
    use std::option::Option;

    /// Error codes
    const E_INSUFFICIENT_LIQUIDITY: u64 = 0;
    const E_ZERO_AMOUNT: u64 = 1;
    const E_POOL_EMPTY: u64 = 2;
    const E_INVALID_AMOUNT: u64 = 3;

    /// A shared pool that provides liquidity for flash loans
    public struct Pool<T> has key, store {
        id: UID,
        balance: u64,
        total_borrowed: u64,
        total_repaid: u64,
        loan_count: u64,
        coin_type: phantomdata<T>,
    }

    /// Pool statistics
    public struct PoolStats has copy, drop {
        balance: u64,
        total_borrowed: u64,
        total_repaid: u64,
        loan_count: u64,
        utilization_rate: u64, // in basis points (10000 = 100%)
    }

    /// Create a new pool
    public fun new<T>(ctx: &mut TxContext): Pool<T> {
        Pool {
            id: object::new(ctx),
            balance: 0,
            total_borrowed: 0,
            total_repaid: 0,
            loan_count: 0,
            coin_type: phantomdata,
        }
    }

    /// Add liquidity to the pool
    public fun add_liquidity<T>(
        pool: &mut Pool<T>,
        coins: Coin<T>,
        _ctx: &mut TxContext
    ) {
        let amount = coin::value(&coins);
        assert!(amount > 0, E_ZERO_AMOUNT);
        
        pool.balance = pool.balance + amount;
        coin::destroy_zero(coins);
    }

    /// Remove liquidity from the pool
    public fun remove_liquidity<T>(
        pool: &mut Pool<T>,
        amount: u64,
        ctx: &mut TxContext
    ): Coin<T> {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(pool.balance >= amount, E_INSUFFICIENT_LIQUIDITY);
        
        pool.balance = pool.balance - amount;
        coin::zero<T>()
    }

    /// Internal function to withdraw for flash loans
    public(friend) fun withdraw<T>(
        pool: &mut Pool<T>,
        amount: u64
    ): Coin<T> {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(pool.balance >= amount, E_INSUFFICIENT_LIQUIDITY);
        
        pool.balance = pool.balance - amount;
        pool.total_borrowed = pool.total_borrowed + amount;
        pool.loan_count = pool.loan_count + 1;
        
        coin::zero<T>()
    }

    /// Internal function to deposit after flash loans
    public(friend) fun deposit<T>(
        pool: &mut Pool<T>,
        coins: Coin<T>
    ) {
        let amount = coin::value(&coins);
        pool.balance = pool.balance + amount;
        pool.total_repaid = pool.total_repaid + amount;
        coin::destroy_zero(coins);
    }

    /// Get pool balance
    public fun balance<T>(pool: &Pool<T>): u64 {
        pool.balance
    }

    /// Get total amount borrowed
    public fun total_borrowed<T>(pool: &Pool<T>): u64 {
        pool.total_borrowed
    }

    /// Get total amount repaid
    public fun total_repaid<T>(pool: &Pool<T>): u64 {
        pool.total_repaid
    }

    /// Get number of loans
    public fun loan_count<T>(pool: &Pool<T>): u64 {
        pool.loan_count
    }

    /// Calculate utilization rate (in basis points)
    public fun utilization_rate<T>(pool: &Pool<T>): u64 {
        if (pool.balance == 0) {
            0
        } else {
            (pool.total_borrowed * 10000) / (pool.balance + pool.total_borrowed)
        }
    }

    /// Get comprehensive pool statistics
    public fun get_stats<T>(pool: &Pool<T>): PoolStats {
        PoolStats {
            balance: pool.balance,
            total_borrowed: pool.total_borrowed,
            total_repaid: pool.total_repaid,
            loan_count: pool.loan_count,
            utilization_rate: utilization_rate(pool),
        }
    }

    /// Check if pool has sufficient liquidity
    public fun has_liquidity<T>(pool: &Pool<T>, amount: u64): bool {
        pool.balance >= amount
    }

    /// Get available liquidity (balance minus any reserves)
    public fun available_liquidity<T>(pool: &Pool<T>): u64 {
        // For now, return full balance
        // In production, you might want to keep some reserves
        pool.balance
    }

    /// Calculate max borrow amount
    public fun max_borrow<T>(pool: &Pool<T>): u64 {
        // Allow borrowing up to 80% of available liquidity
        (available_liquidity(pool) * 80) / 100
    }

    /// Emergency function to rebalance pool
    /// Only callable by pool admin (would need admin access control)
    public fun rebalance<T>(
        pool: &mut Pool<T>,
        _ctx: &mut TxContext
    ) {
        // This would typically:
        // 1. Check pool health
        // 2. Adjust parameters
        // 3. Handle edge cases
        // For now, it's a placeholder
    }

    /// Initialize pool with initial liquidity
    public fun create_with_liquidity<T>(
        initial_coins: Coin<T>,
        ctx: &mut TxContext
    ): Pool<T> {
        let mut pool = new(ctx);
        let amount = coin::value(&initial_coins);
        
        if (amount > 0) {
            pool.balance = amount;
            coin::destroy_zero(initial_coins);
        } else {
            coin::destroy_zero(initial_coins);
        }
        
        pool
    }

    /// Split pool balance (useful for complex operations)
    public fun split_balance<T>(
        pool: &mut Pool<T>,
        amount: u64,
        ctx: &mut TxContext
    ): (Pool<T>, Pool<T>) {
        assert!(amount > 0 && amount <= pool.balance, E_INVALID_AMOUNT);
        
        let pool1_balance = amount;
        let pool2_balance = pool.balance - amount;
        
        let pool1 = Pool {
            id: object::new(ctx),
            balance: pool1_balance,
            total_borrowed: 0,
            total_repaid: 0,
            loan_count: 0,
            coin_type: phantomdata,
        };
        
        let pool2 = Pool {
            id: object::new(ctx),
            balance: pool2_balance,
            total_borrowed: 0,
            total_repaid: 0,
            loan_count: 0,
            coin_type: phantomdata,
        };
        
        // Preserve statistics in the first pool
        let pool1_stats = Pool {
            id: pool1.id,
            balance: pool1.balance,
            total_borrowed: pool.total_borrowed,
            total_repaid: pool.total_repaid,
            loan_count: pool.loan_count,
            coin_type: phantomdata,
        };
        
        object::delete(pool.id);
        (pool1_stats, pool2)
    }

    /// Merge two pools
    public fun merge_pools<T>(
        pool1: Pool<T>,
        pool2: Pool<T>,
        ctx: &mut TxContext
    ): Pool<T> {
        let merged_balance = pool1.balance + pool2.balance;
        let merged_borrowed = pool1.total_borrowed + pool2.total_borrowed;
        let merged_repaid = pool1.total_repaid + pool2.total_repaid;
        let merged_count = pool1.loan_count + pool2.loan_count;
        
        let merged_pool = Pool {
            id: object::new(ctx),
            balance: merged_balance,
            total_borrowed: merged_borrowed,
            total_repaid: merged_repaid,
            loan_count: merged_count,
            coin_type: phantomdata,
        };
        
        object::delete(pool1.id);
        object::delete(pool2.id);
        
        merged_pool
    }
}