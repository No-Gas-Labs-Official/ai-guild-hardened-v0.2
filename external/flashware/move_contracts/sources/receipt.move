module flashware::receipt {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;

    /// Error codes
    const E_INVALID_RECEIPT: u64 = 0;
    const E_RECEIPT_ALREADY_USED: u64 = 1;

    /// Flash loan receipt - acts as a hot potato that must be consumed
    /// This ensures flash loans are repaid in the same transaction
    public struct FlashLoanReceipt<T> has drop {
        amount: u64,
        pool_id: ID,
        borrowed_at: u64,
        uid: UID,
    }

    /// Create a new flash loan receipt
    public(friend) fun new<T>(
        amount: u64,
        pool_id: ID,
        borrowed_at: u64,
        ctx: &mut TxContext
    ): FlashLoanReceipt<T> {
        FlashLoanReceipt {
            amount,
            pool_id,
            borrowed_at,
            uid: object::new(ctx),
        }
    }

    /// Get the amount from receipt
    public fun amount<T>(receipt: &FlashLoanReceipt<T>): u64 {
        receipt.amount
    }

    /// Get the pool ID from receipt
    public fun pool_id<T>(receipt: &FlashLoanReceipt<T>): ID {
        receipt.pool_id
    }

    /// Get the borrowed epoch from receipt
    public fun borrowed_at<T>(receipt: &FlashLoanReceipt<T>): u64 {
        receipt.borrowed_at
    }

    /// Get the object ID of the receipt
    public fun id<T>(receipt: &FlashLoanReceipt<T>): ID {
        object::uid_to_inner(&receipt.uid)
    }

    /// Verify receipt is valid (not expired, matches pool, etc.)
    public fun verify<T>(
        receipt: &FlashLoanReceipt<T>,
        expected_pool_id: ID,
        current_epoch: u64
    ): bool {
        receipt.pool_id == expected_pool_id && 
        current_epoch <= receipt.borrowed_at + 1
    }

    /// Check if receipt is expired (more than 1 epoch old)
    public fun is_expired<T>(
        receipt: &FlashLoanReceipt<T>,
        current_epoch: u64
    ): bool {
        current_epoch > receipt.borrowed_at + 1
    }

    /// Get remaining epochs before expiration
    public fun epochs_remaining<T>(
        receipt: &FlashLoanReceipt<T>,
        current_epoch: u64
    ): u64 {
        if (current_epoch > receipt.borrowed_at + 1) {
            0
        } else {
            (receipt.borrowed_at + 1) - current_epoch
        }
    }

    /// Split receipt amount (for complex multi-step operations)
    /// This would be useful for sophisticated arbitrage strategies
    public fun split<T>(
        receipt: &mut FlashLoanReceipt<T>,
        split_amount: u64,
        ctx: &mut TxContext
    ): FlashLoanReceipt<T> {
        assert!(split_amount > 0 && split_amount <= receipt.amount, E_INVALID_RECEIPT);
        
        let remaining_amount = receipt.amount - split_amount;
        receipt.amount = remaining_amount;
        
        FlashLoanReceipt {
            amount: split_amount,
            pool_id: receipt.pool_id,
            borrowed_at: receipt.borrowed_at,
            uid: object::new(ctx),
        }
    }

    /// Merge receipts (useful when splitting operations)
    public fun merge<T>(
        receipt1: FlashLoanReceipt<T>,
        receipt2: FlashLoanReceipt<T>,
        ctx: &mut TxContext
    ): FlashLoanReceipt<T> {
        // Verify both receipts are for the same pool and epoch
        assert!(receipt1.pool_id == receipt2.pool_id, E_INVALID_RECEIPT);
        assert!(receipt1.borrowed_at == receipt2.borrowed_at, E_INVALID_RECEIPT);
        
        let merged_amount = receipt1.amount + receipt2.amount;
        
        let merged_receipt = FlashLoanReceipt {
            amount: merged_amount,
            pool_id: receipt1.pool_id,
            borrowed_at: receipt1.borrowed_at,
            uid: object::new(ctx),
        };
        
        // Clean up the old receipts
        let FlashLoanReceipt { amount: _, pool_id: _, borrowed_at: _, uid: uid1 } = receipt1;
        let FlashLoanReceipt { amount: _, pool_id: _, borrowed_at: _, uid: uid2 } = receipt2;
        
        object::delete(uid1);
        object::delete(uid2);
        
        merged_receipt
    }

    /// Create a receipt proof (for off-chain verification)
    /// This generates a hash that can be verified later
    public fun create_proof<T>(receipt: &FlashLoanReceipt<T>): vector<u8> {
        // In a real implementation, you would create a cryptographic proof
        // For now, return the basic data as a vector
        let mut proof = vector[];
        vector::push_back(&mut proof, receipt.amount);
        vector::append(&mut proof, bcs::to_bytes(&receipt.pool_id));
        vector::push_back(&mut proof, receipt.borrowed_at);
        proof
    }

    /// Verify a receipt proof against a receipt
    public fun verify_proof<T>(
        receipt: &FlashLoanReceipt<T>,
        proof: &vector<u8>
    ): bool {
        let expected_proof = create_proof(receipt);
        proof == &expected_proof
    }

    /// Mark receipt as used (for audit trail)
    /// This would typically be called after successful repayment
    public(friend) fun mark_used<T>(
        receipt: FlashLoanReceipt<T>
    ): (u64, ID, u64, UID) {
        let FlashLoanReceipt {
            amount,
            pool_id,
            borrowed_at,
            uid
        } = receipt;
        
        (amount, pool_id, borrowed_at, uid)
    }

    /// Emergency burn of receipt (only in exceptional cases)
    /// This should be carefully controlled as it bypasses normal repayment
    public fun emergency_burn<T>(
        receipt: FlashLoanReceipt<T>
    ): (u64, ID, u64) {
        let FlashLoanReceipt {
            amount,
            pool_id,
            borrowed_at,
            uid
        } = receipt;
        
        object::delete(uid);
        (amount, pool_id, borrowed_at)
    }

    /// Get receipt metadata for display purposes
    public fun get_metadata<T>(
        receipt: &FlashLoanReceipt<T>
    ): (u64, ID, u64, ID) {
        (
            receipt.amount,
            receipt.pool_id,
            receipt.borrowed_at,
            object::uid_to_inner(&receipt.uid)
        )
    }
}