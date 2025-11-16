/// Flash Loan Module implementing IOTA Move's Hot Potato pattern
/// This module provides uncollateralized loans that must be repaid within the same transaction
module arva::flash_loan {
    use std::type_name::{Self, TypeName};
    use iota::object::{Self, UID};
    use iota::balance::{Self, Balance};
    use iota::coin::{Self, Coin};
    use iota::tx_context::{Self, TxContext};
    use iota::event;
    use iota::math;

    /// Hot Potato struct - cannot be stored, copied, or dropped
    /// Forces the user to repay the loan within the same transaction
    public struct FlashLoan<phantom T> {
        amount: u64,
        fee: u64,
        type_name: TypeName,
    }

    /// Flash loan pool for managing liquidity
    public struct FlashLoanPool<phantom T> has key {
        id: UID,
        balance: Balance<T>,
        fee_rate: u64, // Fee rate in basis points (e.g., 30 = 0.30%)
        total_borrowed: u64,
        total_repaid: u64,
    }

    /// Administrative capability for pool management
    public struct AdminCap has key, store {
        id: UID,
        pool_type: TypeName,
    }

    /// Events for tracking flash loan activity
    public struct FlashLoanBorrowed has copy, drop {
        pool_id: object::ID,
        borrower: address,
        amount: u64,
        fee: u64,
        coin_type: TypeName,
    }

    public struct FlashLoanRepaid has copy, drop {
        pool_id: object::ID,
        borrower: address,
        amount: u64,
        fee_paid: u64,
        coin_type: TypeName,
    }

    /// Error codes
    const E_INSUFFICIENT_LIQUIDITY: u64 = 1;
    const E_INVALID_REPAYMENT: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;

    /// Initialize a new flash loan pool
    public fun create_pool<T>(
        initial_liquidity: Coin<T>,
        fee_rate: u64,
        ctx: &mut TxContext
    ): (FlashLoanPool<T>, AdminCap) {
        let pool = FlashLoanPool<T> {
            id: object::new(ctx),
            balance: coin::into_balance(initial_liquidity),
            fee_rate,
            total_borrowed: 0,
            total_repaid: 0,
        };

        let admin_cap = AdminCap {
            id: object::new(ctx),
            pool_type: type_name::get<T>(),
        };

        (pool, admin_cap)
    }

    /// Borrow tokens from the flash loan pool
    /// Returns borrowed coins and a hot potato that must be consumed
    public fun borrow<T>(
        pool: &mut FlashLoanPool<T>,
        amount: u64,
        ctx: &mut TxContext
    ): (Coin<T>, FlashLoan<T>) {
        // Check liquidity availability
        assert!(balance::value(&pool.balance) >= amount, E_INSUFFICIENT_LIQUIDITY);

        // Calculate fee
        let fee = (amount * pool.fee_rate) / 10000;

        // Update pool statistics
        pool.total_borrowed = pool.total_borrowed + amount;

        // Create borrowed coins
        let borrowed_balance = balance::split(&mut pool.balance, amount);
        let borrowed_coins = coin::from_balance(borrowed_balance, ctx);

        // Create hot potato
        let hot_potato = FlashLoan<T> {
            amount,
            fee,
            type_name: type_name::get<T>(),
        };

        // Emit event
        event::emit(FlashLoanBorrowed {
            pool_id: object::id(pool),
            borrower: tx_context::sender(ctx),
            amount,
            fee,
            coin_type: type_name::get<T>(),
        });

        (borrowed_coins, hot_potato)
    }

    /// Repay the flash loan and consume the hot potato
    /// Must provide the exact amount plus fees
    public fun repay<T>(
        pool: &mut FlashLoanPool<T>,
        repayment: Coin<T>,
        loan: FlashLoan<T>,
        ctx: &mut TxContext
    ) {
        let FlashLoan { amount, fee, type_name: _ } = loan;
        let required_amount = amount + fee;
        
        // Verify repayment amount
        assert!(coin::value(&repayment) >= required_amount, E_INVALID_REPAYMENT);

        // Handle exact vs excess repayment
        if (coin::value(&repayment) > required_amount) {
            let excess = coin::split(&mut repayment, coin::value(&repayment) - required_amount, ctx);
            // Return excess to sender
            coin::keep(excess, ctx);
        };

        // Add repayment to pool
        let repayment_balance = coin::into_balance(repayment);
        balance::join(&mut pool.balance, repayment_balance);

        // Update statistics
        pool.total_repaid = pool.total_repaid + required_amount;

        // Emit event
        event::emit(FlashLoanRepaid {
            pool_id: object::id(pool),
            borrower: tx_context::sender(ctx),
            amount,
            fee_paid: fee,
            coin_type: type_name::get<T>(),
        });
    }

    /// Add liquidity to the pool (admin only)
    public fun add_liquidity<T>(
        pool: &mut FlashLoanPool<T>,
        liquidity: Coin<T>,
        _admin_cap: &AdminCap,
    ) {
        let liquidity_balance = coin::into_balance(liquidity);
        balance::join(&mut pool.balance, liquidity_balance);
    }

    /// Remove liquidity from the pool (admin only)
    public fun remove_liquidity<T>(
        pool: &mut FlashLoanPool<T>,
        amount: u64,
        admin_cap: &AdminCap,
        ctx: &mut TxContext
    ): Coin<T> {
        // Verify admin capability
        assert!(admin_cap.pool_type == type_name::get<T>(), E_UNAUTHORIZED);
        assert!(balance::value(&pool.balance) >= amount, E_INSUFFICIENT_LIQUIDITY);

        let withdrawn_balance = balance::split(&mut pool.balance, amount);
        coin::from_balance(withdrawn_balance, ctx)
    }

    /// Update fee rate (admin only)
    public fun set_fee_rate<T>(
        pool: &mut FlashLoanPool<T>,
        new_fee_rate: u64,
        admin_cap: &AdminCap,
    ) {
        assert!(admin_cap.pool_type == type_name::get<T>(), E_UNAUTHORIZED);
        pool.fee_rate = new_fee_rate;
    }

    /// View functions for pool information
    public fun pool_balance<T>(pool: &FlashLoanPool<T>): u64 {
        balance::value(&pool.balance)
    }

    public fun fee_rate<T>(pool: &FlashLoanPool<T>): u64 {
        pool.fee_rate
    }

    public fun total_borrowed<T>(pool: &FlashLoanPool<T>): u64 {
        pool.total_borrowed
    }

    public fun total_repaid<T>(pool: &FlashLoanPool<T>): u64 {
        pool.total_repaid
    }

    /// Calculate fee for a given loan amount
    public fun calculate_fee<T>(pool: &FlashLoanPool<T>, amount: u64): u64 {
        (amount * pool.fee_rate) / 10000
    }

    /// Check if pool has sufficient liquidity for a loan
    public fun has_liquidity<T>(pool: &FlashLoanPool<T>, amount: u64): bool {
        balance::value(&pool.balance) >= amount
    }
}