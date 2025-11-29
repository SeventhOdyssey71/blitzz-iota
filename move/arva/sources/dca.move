module Blitz::dca {
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::clock::{Self, Clock};
    use Blitz::simple_dex::{Self, Pool};
    use std::vector;

    const EInvalidInterval: u64 = 1;
    const EInvalidOrderCount: u64 = 2;
    const EStrategyExpired: u64 = 3;
    const EUnauthorized: u64 = 4;
    const EPriceOutOfRange: u64 = 5;
    const EInvalidAmount: u64 = 6;
    const EStrategyNotActive: u64 = 7;
    const EIntervalNotElapsed: u64 = 8;
    const EInsufficientBalance: u64 = 9;
    const ESlippageExceeded: u64 = 10;
    
    // Constants for validation
    const MIN_INTERVAL_MS: u64 = 300000; // 5 minutes minimum
    const MAX_INTERVAL_MS: u64 = 2592000000; // 30 days maximum
    const MAX_ORDERS: u64 = 365; // Maximum 365 orders (1 year daily)
    const MIN_ORDER_SIZE: u64 = 1000; // Minimum order size

    public struct DCARegistry has key {
        id: UID,
        strategies: vector<ID>,
        total_strategies: u64,
        admin: address,
    }

    public struct DCAStrategy<phantom CoinA, phantom CoinB> has key {
        id: UID,
        owner: address,
        pool_id: ID,
        source_balance: Balance<CoinA>,
        received_balance: Balance<CoinB>,
        amount_per_order: u64,
        interval_ms: u64,
        total_orders: u64,
        executed_orders: u64,
        last_execution_time: u64,
        min_amount_out: u64,
        max_amount_out: u64,
        created_at: u64,
        is_active: bool,
        accumulated_fees: u64,
    }

    public struct DCACreatedEvent has copy, drop {
        strategy_id: ID,
        owner: address,
        amount_per_order: u64,
        interval_ms: u64,
        total_orders: u64,
        total_amount: u64,
    }

    public struct DCAExecutedEvent has copy, drop {
        strategy_id: ID,
        order_number: u64,
        amount_in: u64,
        amount_out: u64,
        timestamp: u64,
    }

    public struct DCAPausedEvent has copy, drop {
        strategy_id: ID,
        owner: address,
        executed_orders: u64,
    }

    public struct DCAResumedEvent has copy, drop {
        strategy_id: ID,
        owner: address,
        remaining_orders: u64,
    }

    public struct DCACompletedEvent has copy, drop {
        strategy_id: ID,
        owner: address,
        total_executed: u64,
        total_received: u64,
    }

    public struct DCACancelledEvent has copy, drop {
        strategy_id: ID,
        owner: address,
        executed_orders: u64,
        refunded_amount: u64,
    }

    public entry fun create_dca_registry(ctx: &mut TxContext) {
        let registry = DCARegistry {
            id: object::new(ctx),
            strategies: vector::empty(),
            total_strategies: 0,
            admin: tx_context::sender(ctx),
        };
        transfer::share_object(registry);
    }

    // Simplified version without registry dependency
    public entry fun create_dca_strategy_simple<CoinA, CoinB>(
        pool: &Pool<CoinA, CoinB>,
        source_coin: Coin<CoinA>,
        interval_ms: u64,
        total_orders: u64,
        min_amount_out: u64,
        max_amount_out: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Enhanced input validation
        assert!(interval_ms >= MIN_INTERVAL_MS && interval_ms <= MAX_INTERVAL_MS, EInvalidInterval);
        assert!(total_orders > 0 && total_orders <= MAX_ORDERS, EInvalidOrderCount);
        
        let total_amount = coin::value(&source_coin);
        assert!(total_amount > 0, EInvalidAmount);
        
        let amount_per_order = total_amount / total_orders;
        assert!(amount_per_order >= MIN_ORDER_SIZE, EInvalidAmount);
        
        // Validate slippage parameters
        if (max_amount_out > 0) {
            assert!(max_amount_out >= min_amount_out, EPriceOutOfRange);
        };
        
        let strategy_uid = object::new(ctx);
        let strategy_id = object::uid_to_inner(&strategy_uid);
        
        let strategy = DCAStrategy<CoinA, CoinB> {
            id: strategy_uid,
            owner: tx_context::sender(ctx),
            pool_id: object::id(pool),
            source_balance: coin::into_balance(source_coin),
            received_balance: balance::zero(),
            amount_per_order,
            interval_ms,
            total_orders,
            executed_orders: 0,
            last_execution_time: clock::timestamp_ms(clock),
            min_amount_out,
            max_amount_out,
            created_at: clock::timestamp_ms(clock),
            is_active: true,
            accumulated_fees: 0,
        };

        event::emit(DCACreatedEvent {
            strategy_id,
            owner: tx_context::sender(ctx),
            amount_per_order,
            interval_ms,
            total_orders,
            total_amount,
        });

        // No registry needed! Just create the strategy directly
        transfer::share_object(strategy);
    }

    public entry fun create_dca_strategy<CoinA, CoinB>(
        registry: &mut DCARegistry,
        pool: &Pool<CoinA, CoinB>,
        source_coin: Coin<CoinA>,
        interval_ms: u64,
        total_orders: u64,
        min_amount_out: u64,
        max_amount_out: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Use same enhanced validation as simple version
        assert!(interval_ms >= MIN_INTERVAL_MS && interval_ms <= MAX_INTERVAL_MS, EInvalidInterval);
        assert!(total_orders > 0 && total_orders <= MAX_ORDERS, EInvalidOrderCount);
        
        let total_amount = coin::value(&source_coin);
        assert!(total_amount > 0, EInvalidAmount);
        
        let amount_per_order = total_amount / total_orders;
        assert!(amount_per_order >= MIN_ORDER_SIZE, EInvalidAmount);
        
        // Validate slippage parameters
        if (max_amount_out > 0) {
            assert!(max_amount_out >= min_amount_out, EPriceOutOfRange);
        };
        
        let strategy_uid = object::new(ctx);
        let strategy_id = object::uid_to_inner(&strategy_uid);
        
        let strategy = DCAStrategy<CoinA, CoinB> {
            id: strategy_uid,
            owner: tx_context::sender(ctx),
            pool_id: object::id(pool),
            source_balance: coin::into_balance(source_coin),
            received_balance: balance::zero(),
            amount_per_order,
            interval_ms,
            total_orders,
            executed_orders: 0,
            last_execution_time: clock::timestamp_ms(clock),
            min_amount_out,
            max_amount_out,
            created_at: clock::timestamp_ms(clock),
            is_active: true,
            accumulated_fees: 0,
        };

        event::emit(DCACreatedEvent {
            strategy_id,
            owner: tx_context::sender(ctx),
            amount_per_order,
            interval_ms,
            total_orders,
            total_amount,
        });

        vector::push_back(&mut registry.strategies, strategy_id);
        registry.total_strategies = registry.total_strategies + 1;

        transfer::share_object(strategy);
    }

    public entry fun execute_dca_order<CoinA, CoinB>(
        strategy: &mut DCAStrategy<CoinA, CoinB>,
        pool: &mut Pool<CoinA, CoinB>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Validate strategy state
        assert!(strategy.is_active, EStrategyNotActive);
        assert!(strategy.executed_orders < strategy.total_orders, EStrategyExpired);
        
        let current_time = clock::timestamp_ms(clock);
        let time_since_last = current_time - strategy.last_execution_time;
        
        // Allow some tolerance (30 seconds early execution to account for block time)
        assert!(time_since_last >= (strategy.interval_ms - 30000), EIntervalNotElapsed);

        // Calculate amount to swap with proper validation
        let source_balance_value = balance::value(&strategy.source_balance);
        assert!(source_balance_value > 0, EInsufficientBalance);
        
        let amount_to_swap = if (source_balance_value < strategy.amount_per_order) {
            source_balance_value // Use remaining balance for final execution
        } else {
            strategy.amount_per_order
        };
        
        // Minimum swap size check to prevent dust attacks
        assert!(amount_to_swap >= MIN_ORDER_SIZE, EInvalidAmount);

        // Calculate expected output using simple_dex functions with slippage protection
        let (reserve_a, reserve_b) = simple_dex::get_reserves(pool);
        let expected_output = simple_dex::calculate_output_amount(amount_to_swap, reserve_a, reserve_b);
        
        // Enhanced slippage protection
        if (strategy.min_amount_out > 0) {
            assert!(expected_output >= strategy.min_amount_out, ESlippageExceeded);
        };
        if (strategy.max_amount_out > 0) {
            assert!(expected_output <= strategy.max_amount_out, ESlippageExceeded);
        };

        // Prepare coin for swap
        let coin_to_swap = coin::from_balance(
            balance::split(&mut strategy.source_balance, amount_to_swap),
            ctx
        );

        // Execute swap using internal function that returns the coin
        let output_coin = simple_dex::swap_a_to_b_internal(pool, coin_to_swap, ctx);
        
        // Validate actual output matches expectation (additional slippage check)
        let actual_output = coin::value(&output_coin);
        if (strategy.min_amount_out > 0) {
            assert!(actual_output >= strategy.min_amount_out, ESlippageExceeded);
        };
        
        // Add the output to received balance
        balance::join(&mut strategy.received_balance, coin::into_balance(output_coin));

        // Update strategy state
        strategy.executed_orders = strategy.executed_orders + 1;
        strategy.last_execution_time = current_time;

        event::emit(DCAExecutedEvent {
            strategy_id: object::id(strategy),
            order_number: strategy.executed_orders,
            amount_in: amount_to_swap,
            amount_out: actual_output,
            timestamp: current_time,
        });

        // Check if strategy is complete
        if (strategy.executed_orders == strategy.total_orders) {
            strategy.is_active = false;
            event::emit(DCACompletedEvent {
                strategy_id: object::id(strategy),
                owner: strategy.owner,
                total_executed: strategy.executed_orders,
                total_received: balance::value(&strategy.received_balance),
            });
        }
    }

    public entry fun pause_strategy<CoinA, CoinB>(
        strategy: &mut DCAStrategy<CoinA, CoinB>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == strategy.owner, EUnauthorized);
        assert!(strategy.is_active, EStrategyNotActive);
        
        strategy.is_active = false;
        
        event::emit(DCAPausedEvent {
            strategy_id: object::id(strategy),
            owner: strategy.owner,
            executed_orders: strategy.executed_orders,
        });
    }

    public entry fun resume_strategy<CoinA, CoinB>(
        strategy: &mut DCAStrategy<CoinA, CoinB>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == strategy.owner, EUnauthorized);
        assert!(!strategy.is_active, EStrategyNotActive);
        assert!(strategy.executed_orders < strategy.total_orders, EStrategyExpired);
        
        strategy.is_active = true;
        strategy.last_execution_time = clock::timestamp_ms(clock); // Reset timer
        
        event::emit(DCAResumedEvent {
            strategy_id: object::id(strategy),
            owner: strategy.owner,
            remaining_orders: strategy.total_orders - strategy.executed_orders,
        });
    }

    public entry fun cancel_dca_strategy<CoinA, CoinB>(
        registry: &mut DCARegistry,
        strategy: DCAStrategy<CoinA, CoinB>,
        ctx: &mut TxContext
    ) {
        assert!(strategy.owner == tx_context::sender(ctx), EUnauthorized);
        
        let strategy_id = object::id(&strategy);
        let refunded_amount = balance::value(&strategy.source_balance);
        
        // Remove from registry
        let mut i = 0;
        let len = vector::length(&registry.strategies);
        while (i < len) {
            if (*vector::borrow(&registry.strategies, i) == strategy_id) {
                vector::remove(&mut registry.strategies, i);
                break
            };
            i = i + 1;
        };
        
        event::emit(DCACancelledEvent {
            strategy_id,
            owner: strategy.owner,
            executed_orders: strategy.executed_orders,
            refunded_amount,
        });

        finalize_strategy(strategy, ctx);
    }

    fun finalize_strategy<CoinA, CoinB>(
        strategy: DCAStrategy<CoinA, CoinB>,
        ctx: &mut TxContext
    ) {
        let DCAStrategy {
            id,
            owner,
            pool_id: _,
            source_balance,
            received_balance,
            amount_per_order: _,
            interval_ms: _,
            total_orders: _,
            executed_orders: _,
            last_execution_time: _,
            min_amount_out: _,
            max_amount_out: _,
            created_at: _,
            is_active: _,
            accumulated_fees: _,
        } = strategy;

        // Refund remaining source balance
        if (balance::value(&source_balance) > 0) {
            transfer::public_transfer(
                coin::from_balance(source_balance, ctx),
                owner
            );
        } else {
            balance::destroy_zero(source_balance);
        };

        // Transfer received balance
        if (balance::value(&received_balance) > 0) {
            transfer::public_transfer(
                coin::from_balance(received_balance, ctx),
                owner
            );
        } else {
            balance::destroy_zero(received_balance);
        };

        object::delete(id);
    }

    // View functions
    public fun get_strategy_info<CoinA, CoinB>(
        strategy: &DCAStrategy<CoinA, CoinB>
    ): (u64, u64, u64, u64, bool) {
        (
            strategy.executed_orders,
            strategy.total_orders,
            balance::value(&strategy.source_balance),
            balance::value(&strategy.received_balance),
            strategy.is_active
        )
    }

    public fun get_next_execution_time<CoinA, CoinB>(
        strategy: &DCAStrategy<CoinA, CoinB>
    ): u64 {
        strategy.last_execution_time + strategy.interval_ms
    }

    public fun get_remaining_orders<CoinA, CoinB>(
        strategy: &DCAStrategy<CoinA, CoinB>
    ): u64 {
        if (strategy.executed_orders >= strategy.total_orders) {
            0
        } else {
            strategy.total_orders - strategy.executed_orders
        }
    }

    public fun get_registry_info(registry: &DCARegistry): (u64, u64) {
        (vector::length(&registry.strategies), registry.total_strategies)
    }
}