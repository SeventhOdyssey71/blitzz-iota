/// Advanced Dollar Cost Averaging (DCA) module for IOTA Move VM
/// Implements automated trading strategies with enhanced features:
/// - Multi-pool support for diversified DCA
/// - Price impact protection
/// - Emergency pause mechanisms
/// - Fee collection and distribution
/// - Automated execution via keepers
module Blitz::dca_v2 {
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::clock::{Self, Clock};
    use iota::dynamic_field as df;
    use iota::table::{Self, Table};
    use std::vector;
    use std::option::{Self, Option};
    use std::string::String;
    use Blitz::simple_dex::{Self, Pool};

    // Error codes
    const EInvalidInterval: u64 = 1;
    const EInvalidOrderCount: u64 = 2;
    const EStrategyNotFound: u64 = 3;
    const EUnauthorized: u64 = 4;
    const EPriceOutOfRange: u64 = 5;
    const EInvalidAmount: u64 = 6;
    const EStrategyNotActive: u64 = 7;
    const EIntervalNotElapsed: u64 = 8;
    const EInsufficientFunds: u64 = 9;
    const EMaxStrategiesExceeded: u64 = 10;
    const EStrategyPaused: u64 = 11;
    const EInvalidPriceRange: u64 = 12;

    // Constants
    const MAX_STRATEGIES_PER_USER: u64 = 50;
    const MIN_INTERVAL_MS: u64 = 300000; // 5 minutes
    const MAX_ORDERS: u64 = 10000; // ~27 years daily
    const KEEPER_FEE_BPS: u64 = 10; // 0.1% keeper fee
    const PLATFORM_FEE_BPS: u64 = 5; // 0.05% platform fee

    /// Global DCA registry - shared object
    public struct DCARegistry has key {
        id: UID,
        strategies: Table<ID, bool>, // strategy_id -> active
        user_strategies: Table<address, vector<ID>>, // user -> strategy_ids
        total_strategies: u64,
        total_volume: u64,
        admin: address,
        paused: bool,
        keeper_registry: Table<address, bool>, // authorized keepers
    }

    /// Individual DCA strategy - shared object for automation
    public struct DCAStrategy<phantom CoinA, phantom CoinB> has key {
        id: UID,
        owner: address,
        pool_id: ID,
        
        // Core strategy parameters
        source_balance: Balance<CoinA>,
        received_balance: Balance<CoinB>,
        amount_per_order: u64,
        interval_ms: u64,
        total_orders: u64,
        executed_orders: u64,
        
        // Timing and execution
        created_at: u64,
        last_execution_time: u64,
        next_execution_time: u64,
        
        // Price protection
        min_price: Option<u64>, // min CoinB per CoinA (scaled by 1e9)
        max_price: Option<u64>, // max CoinB per CoinA (scaled by 1e9)
        max_slippage_bps: u64, // max slippage in basis points
        
        // Status and metadata
        is_active: bool,
        is_paused: bool,
        name: String,
        
        // Accumulated stats
        total_invested: u64,
        total_received: u64,
        total_fees_paid: u64,
        average_price: u64, // weighted average price
        
        // Emergency controls
        emergency_pause: bool,
    }

    /// Admin capability for registry management
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Keeper capability for automated execution
    public struct KeeperCap has key, store {
        id: UID,
        keeper_address: address,
    }

    // ==================== EVENTS ====================

    public struct DCARegistryCreated has copy, drop {
        registry_id: ID,
        admin: address,
    }

    public struct DCAStrategyCreated has copy, drop {
        strategy_id: ID,
        owner: address,
        pool_id: ID,
        coin_a_type: String,
        coin_b_type: String,
        amount_per_order: u64,
        interval_ms: u64,
        total_orders: u64,
        total_investment: u64,
        name: String,
    }

    public struct DCAOrderExecuted has copy, drop {
        strategy_id: ID,
        order_number: u64,
        amount_in: u64,
        amount_out: u64,
        price: u64, // amount_out / amount_in * 1e9
        keeper_fee: u64,
        platform_fee: u64,
        timestamp: u64,
        keeper: address,
    }

    public struct DCAStrategyPaused has copy, drop {
        strategy_id: ID,
        owner: address,
        reason: String,
    }

    public struct DCAStrategyResumed has copy, drop {
        strategy_id: ID,
        owner: address,
    }

    public struct DCAStrategyCancelled has copy, drop {
        strategy_id: ID,
        owner: address,
        refunded_amount: u64,
        received_amount: u64,
    }

    public struct DCAStrategyCompleted has copy, drop {
        strategy_id: ID,
        owner: address,
        total_invested: u64,
        total_received: u64,
        average_price: u64,
        execution_duration_ms: u64,
    }

    // ==================== INITIALIZATION ====================

    /// Initialize the DCA registry (called once)
    public entry fun create_dca_registry(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        let registry_uid = object::new(ctx);
        let registry_id = object::uid_to_inner(&registry_uid);
        
        let registry = DCARegistry {
            id: registry_uid,
            strategies: table::new(ctx),
            user_strategies: table::new(ctx),
            total_strategies: 0,
            total_volume: 0,
            admin,
            paused: false,
            keeper_registry: table::new(ctx),
        };

        // Create admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };

        event::emit(DCARegistryCreated {
            registry_id,
            admin,
        });

        transfer::share_object(registry);
        transfer::transfer(admin_cap, admin);
    }

    // ==================== STRATEGY MANAGEMENT ====================

    /// Create a new DCA strategy
    public entry fun create_dca_strategy<CoinA, CoinB>(
        registry: &mut DCARegistry,
        pool: &Pool<CoinA, CoinB>,
        source_coin: Coin<CoinA>,
        amount_per_order: u64,
        interval_ms: u64,
        total_orders: u64,
        min_price: Option<u64>,
        max_price: Option<u64>,
        max_slippage_bps: u64,
        name: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);
        
        // Validate inputs
        assert!(!registry.paused, EStrategyPaused);
        assert!(interval_ms >= MIN_INTERVAL_MS, EInvalidInterval);
        assert!(total_orders > 0 && total_orders <= MAX_ORDERS, EInvalidOrderCount);
        assert!(amount_per_order > 0, EInvalidAmount);
        assert!(max_slippage_bps <= 5000, EInvalidPriceRange); // max 50% slippage

        let total_amount = coin::value(&source_coin);
        let expected_total = amount_per_order * total_orders;
        assert!(total_amount >= expected_total, EInsufficientFunds);

        // Check user strategy limit
        if (table::contains(&registry.user_strategies, owner)) {
            let user_strategies = table::borrow(&registry.user_strategies, owner);
            assert!(vector::length(user_strategies) < MAX_STRATEGIES_PER_USER, EMaxStrategiesExceeded);
        };

        // Validate price range
        if (option::is_some(&min_price) && option::is_some(&max_price)) {
            assert!(*option::borrow(&min_price) < *option::borrow(&max_price), EInvalidPriceRange);
        };

        let strategy_uid = object::new(ctx);
        let strategy_id = object::uid_to_inner(&strategy_uid);
        let current_time = clock::timestamp_ms(clock);
        let next_execution = current_time + interval_ms;

        let strategy = DCAStrategy<CoinA, CoinB> {
            id: strategy_uid,
            owner,
            pool_id: object::id(pool),
            source_balance: coin::into_balance(source_coin),
            received_balance: balance::zero(),
            amount_per_order,
            interval_ms,
            total_orders,
            executed_orders: 0,
            created_at: current_time,
            last_execution_time: current_time,
            next_execution_time: next_execution,
            min_price,
            max_price,
            max_slippage_bps,
            is_active: true,
            is_paused: false,
            name: std::string::utf8(name),
            total_invested: 0,
            total_received: 0,
            total_fees_paid: 0,
            average_price: 0,
            emergency_pause: false,
        };

        // Update registry
        table::add(&mut registry.strategies, strategy_id, true);
        if (!table::contains(&registry.user_strategies, owner)) {
            table::add(&mut registry.user_strategies, owner, vector::empty());
        };
        let user_strategies = table::borrow_mut(&mut registry.user_strategies, owner);
        vector::push_back(user_strategies, strategy_id);
        registry.total_strategies = registry.total_strategies + 1;

        event::emit(DCAStrategyCreated {
            strategy_id,
            owner,
            pool_id: object::id(pool),
            coin_a_type: std::string::utf8(b""), // TODO: Get actual type names
            coin_b_type: std::string::utf8(b""),
            amount_per_order,
            interval_ms,
            total_orders,
            total_investment: total_amount,
            name: std::string::utf8(name),
        });

        transfer::share_object(strategy);
    }

    /// Execute a DCA order (can be called by anyone, typically keepers)
    public entry fun execute_dca_order<CoinA, CoinB>(
        registry: &mut DCARegistry,
        strategy: &mut DCAStrategy<CoinA, CoinB>,
        pool: &mut Pool<CoinA, CoinB>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let executor = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        
        // Validate execution conditions
        assert!(!registry.paused && strategy.is_active && !strategy.is_paused, EStrategyNotActive);
        assert!(strategy.executed_orders < strategy.total_orders, EInvalidOrderCount);
        assert!(current_time >= strategy.next_execution_time, EIntervalNotElapsed);
        assert!(!strategy.emergency_pause, EStrategyPaused);

        // Calculate amount to swap (handle final order partial amount)
        let remaining_balance = balance::value(&strategy.source_balance);
        let amount_to_swap = if (remaining_balance < strategy.amount_per_order) {
            remaining_balance
        } else {
            strategy.amount_per_order
        };

        assert!(amount_to_swap > 0, EInsufficientFunds);

        // Get pool reserves for price calculation
        let (reserve_a, reserve_b, _) = simple_dex::get_reserves(pool);
        let expected_output = simple_dex::calculate_output_amount(amount_to_swap, reserve_a, reserve_b);
        
        // Price protection checks
        if (option::is_some(&strategy.min_price)) {
            let min_expected = (amount_to_swap * *option::borrow(&strategy.min_price)) / 1000000000;
            assert!(expected_output >= min_expected, EPriceOutOfRange);
        };

        if (option::is_some(&strategy.max_price)) {
            let max_expected = (amount_to_swap * *option::borrow(&strategy.max_price)) / 1000000000;
            assert!(expected_output <= max_expected, EPriceOutOfRange);
        };

        // Execute the swap
        let coin_to_swap = coin::from_balance(
            balance::split(&mut strategy.source_balance, amount_to_swap),
            ctx
        );

        let output_coin = simple_dex::swap_a_to_b(pool, coin_to_swap, ctx);
        let actual_output = coin::value(&output_coin);

        // Calculate fees
        let keeper_fee = (actual_output * KEEPER_FEE_BPS) / 10000;
        let platform_fee = (actual_output * PLATFORM_FEE_BPS) / 10000;
        let net_output = actual_output - keeper_fee - platform_fee;

        // Split fees and add to strategy
        let keeper_fee_coin = coin::split(&mut output_coin, keeper_fee, ctx);
        let platform_fee_coin = coin::split(&mut output_coin, platform_fee, ctx);
        
        // Transfer fees
        transfer::public_transfer(keeper_fee_coin, executor);
        transfer::public_transfer(platform_fee_coin, registry.admin);

        // Add net output to strategy
        balance::join(&mut strategy.received_balance, coin::into_balance(output_coin));

        // Update strategy state
        strategy.executed_orders = strategy.executed_orders + 1;
        strategy.last_execution_time = current_time;
        strategy.next_execution_time = current_time + strategy.interval_ms;
        strategy.total_invested = strategy.total_invested + amount_to_swap;
        strategy.total_received = strategy.total_received + net_output;
        strategy.total_fees_paid = strategy.total_fees_paid + keeper_fee + platform_fee;

        // Update average price (weighted)
        let current_price = (net_output * 1000000000) / amount_to_swap;
        if (strategy.average_price == 0) {
            strategy.average_price = current_price;
        } else {
            strategy.average_price = (strategy.average_price * (strategy.executed_orders - 1) + current_price) / strategy.executed_orders;
        };

        // Update registry volume
        registry.total_volume = registry.total_volume + amount_to_swap;

        event::emit(DCAOrderExecuted {
            strategy_id: object::id(strategy),
            order_number: strategy.executed_orders,
            amount_in: amount_to_swap,
            amount_out: actual_output,
            price: current_price,
            keeper_fee,
            platform_fee,
            timestamp: current_time,
            keeper: executor,
        });

        // Check if strategy is completed
        if (strategy.executed_orders >= strategy.total_orders || balance::value(&strategy.source_balance) == 0) {
            strategy.is_active = false;
            
            let execution_duration = current_time - strategy.created_at;
            
            event::emit(DCAStrategyCompleted {
                strategy_id: object::id(strategy),
                owner: strategy.owner,
                total_invested: strategy.total_invested,
                total_received: strategy.total_received,
                average_price: strategy.average_price,
                execution_duration_ms: execution_duration,
            });
        }
    }

    /// Pause a strategy (owner only)
    public entry fun pause_strategy<CoinA, CoinB>(
        strategy: &mut DCAStrategy<CoinA, CoinB>,
        reason: vector<u8>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == strategy.owner, EUnauthorized);
        assert!(strategy.is_active && !strategy.is_paused, EStrategyNotActive);
        
        strategy.is_paused = true;
        
        event::emit(DCAStrategyPaused {
            strategy_id: object::id(strategy),
            owner: strategy.owner,
            reason: std::string::utf8(reason),
        });
    }

    /// Resume a paused strategy (owner only)
    public entry fun resume_strategy<CoinA, CoinB>(
        strategy: &mut DCAStrategy<CoinA, CoinB>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == strategy.owner, EUnauthorized);
        assert!(strategy.is_active && strategy.is_paused, EStrategyNotActive);
        
        strategy.is_paused = false;
        // Reset next execution time
        strategy.next_execution_time = clock::timestamp_ms(clock) + strategy.interval_ms;
        
        event::emit(DCAStrategyResumed {
            strategy_id: object::id(strategy),
            owner: strategy.owner,
        });
    }

    /// Cancel and finalize a strategy (owner only)
    public entry fun cancel_strategy<CoinA, CoinB>(
        registry: &mut DCARegistry,
        strategy: DCAStrategy<CoinA, CoinB>,
        ctx: &mut TxContext
    ) {
        assert!(strategy.owner == tx_context::sender(ctx), EUnauthorized);
        
        let strategy_id = object::id(&strategy);
        let owner = strategy.owner;
        let refunded_amount = balance::value(&strategy.source_balance);
        let received_amount = balance::value(&strategy.received_balance);

        // Remove from registry
        table::remove(&mut registry.strategies, strategy_id);

        event::emit(DCAStrategyCancelled {
            strategy_id,
            owner,
            refunded_amount,
            received_amount,
        });

        // Finalize and destroy strategy
        finalize_strategy(strategy, ctx);
    }

    /// Internal function to finalize strategy and transfer remaining funds
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
            created_at: _,
            last_execution_time: _,
            next_execution_time: _,
            min_price: _,
            max_price: _,
            max_slippage_bps: _,
            is_active: _,
            is_paused: _,
            name: _,
            total_invested: _,
            total_received: _,
            total_fees_paid: _,
            average_price: _,
            emergency_pause: _,
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

        // Transfer accumulated received balance
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

    // ==================== ADMIN FUNCTIONS ====================

    /// Emergency pause all DCA operations (admin only)
    public entry fun emergency_pause(
        _: &AdminCap,
        registry: &mut DCARegistry,
    ) {
        registry.paused = true;
    }

    /// Resume all DCA operations (admin only)
    public entry fun emergency_resume(
        _: &AdminCap,
        registry: &mut DCARegistry,
    ) {
        registry.paused = false;
    }

    /// Add authorized keeper (admin only)
    public entry fun add_keeper(
        _: &AdminCap,
        registry: &mut DCARegistry,
        keeper: address,
        ctx: &mut TxContext
    ) {
        table::add(&mut registry.keeper_registry, keeper, true);
        
        let keeper_cap = KeeperCap {
            id: object::new(ctx),
            keeper_address: keeper,
        };
        
        transfer::transfer(keeper_cap, keeper);
    }

    // ==================== VIEW FUNCTIONS ====================

    /// Get strategy details
    public fun get_strategy_info<CoinA, CoinB>(
        strategy: &DCAStrategy<CoinA, CoinB>
    ): (u64, u64, u64, u64, u64, u64, bool, bool) {
        (
            strategy.executed_orders,
            strategy.total_orders,
            balance::value(&strategy.source_balance),
            balance::value(&strategy.received_balance),
            strategy.total_invested,
            strategy.total_received,
            strategy.is_active,
            strategy.is_paused
        )
    }

    /// Get strategy timing info
    public fun get_strategy_timing<CoinA, CoinB>(
        strategy: &DCAStrategy<CoinA, CoinB>
    ): (u64, u64, u64, u64) {
        (
            strategy.created_at,
            strategy.last_execution_time,
            strategy.next_execution_time,
            strategy.interval_ms
        )
    }

    /// Get strategy performance metrics
    public fun get_strategy_performance<CoinA, CoinB>(
        strategy: &DCAStrategy<CoinA, CoinB>
    ): (u64, u64, u64) {
        (
            strategy.average_price,
            strategy.total_fees_paid,
            strategy.total_received
        )
    }

    /// Check if strategy is ready for execution
    public fun is_ready_for_execution<CoinA, CoinB>(
        strategy: &DCAStrategy<CoinA, CoinB>,
        current_time: u64
    ): bool {
        strategy.is_active &&
        !strategy.is_paused &&
        !strategy.emergency_pause &&
        strategy.executed_orders < strategy.total_orders &&
        current_time >= strategy.next_execution_time &&
        balance::value(&strategy.source_balance) > 0
    }

    /// Get registry stats
    public fun get_registry_info(registry: &DCARegistry): (u64, u64, bool) {
        (
            registry.total_strategies,
            registry.total_volume,
            registry.paused
        )
    }
}