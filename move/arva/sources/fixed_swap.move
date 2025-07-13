module Blitz::fixed_swap {
    use iota::coin::{Self, Coin};
    // use iota::tx_context; // Default import, not needed
    // use iota::transfer; // Default import, not needed
    use iota::balance::{Self, Balance};
    // use iota::object; // Default import, not needed

    // Error codes
    const EInsufficientReserve: u64 = 1;
    const EInvalidAmount: u64 = 2;

    // Fixed exchange rates (multiply by 1000 for precision)
    // 1 IOTA = 1 stIOTA (1:1 rate)
    // 1 IOTA = 0.28 vUSD
    // 1 stIOTA = 0.28 vUSD
    const RATE_PRECISION: u64 = 1000;
    // const IOTA_TO_STIOTA_RATE: u64 = 1000; // 1:1
    // const IOTA_TO_VUSD_RATE: u64 = 280; // 0.28
    // const STIOTA_TO_VUSD_RATE: u64 = 280; // 0.28

    /// Fixed rate swap pool
    public struct SwapPool<phantom CoinA, phantom CoinB> has key {
        id: UID,
        reserve_a: Balance<CoinA>,
        reserve_b: Balance<CoinB>,
        rate_a_to_b: u64, // How much B for 1 A (with precision)
        admin: address,
    }

    /// Create a new swap pool with fixed rates
    public entry fun create_pool<CoinA, CoinB>(
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        rate_a_to_b: u64,
        ctx: &mut TxContext
    ) {
        let pool = SwapPool<CoinA, CoinB> {
            id: object::new(ctx),
            reserve_a: coin::into_balance(coin_a),
            reserve_b: coin::into_balance(coin_b),
            rate_a_to_b,
            admin: tx_context::sender(ctx),
        };
        
        transfer::share_object(pool);
    }

    /// Swap CoinA for CoinB at fixed rate
    public entry fun swap_a_to_b<CoinA, CoinB>(
        pool: &mut SwapPool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        ctx: &mut TxContext
    ) {
        let amount_a = coin::value(&coin_a);
        assert!(amount_a > 0, EInvalidAmount);
        
        // Calculate output amount based on fixed rate
        let amount_b = (amount_a * pool.rate_a_to_b) / RATE_PRECISION;
        
        // Check if pool has enough reserves
        assert!(balance::value(&pool.reserve_b) >= amount_b, EInsufficientReserve);
        
        // Add input to pool
        balance::join(&mut pool.reserve_a, coin::into_balance(coin_a));
        
        // Send output to user
        let coin_b = coin::from_balance(
            balance::split(&mut pool.reserve_b, amount_b),
            ctx
        );
        transfer::public_transfer(coin_b, tx_context::sender(ctx));
    }

    /// Swap CoinB for CoinA at fixed rate
    public entry fun swap_b_to_a<CoinA, CoinB>(
        pool: &mut SwapPool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        ctx: &mut TxContext
    ) {
        let amount_b = coin::value(&coin_b);
        assert!(amount_b > 0, EInvalidAmount);
        
        // Calculate output amount (inverse rate)
        let amount_a = (amount_b * RATE_PRECISION) / pool.rate_a_to_b;
        
        // Check if pool has enough reserves
        assert!(balance::value(&pool.reserve_a) >= amount_a, EInsufficientReserve);
        
        // Add input to pool
        balance::join(&mut pool.reserve_b, coin::into_balance(coin_b));
        
        // Send output to user
        let coin_a = coin::from_balance(
            balance::split(&mut pool.reserve_a, amount_a),
            ctx
        );
        transfer::public_transfer(coin_a, tx_context::sender(ctx));
    }

    /// Add liquidity to the pool (admin only)
    public entry fun add_liquidity<CoinA, CoinB>(
        pool: &mut SwapPool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == pool.admin, EInvalidAmount);
        
        balance::join(&mut pool.reserve_a, coin::into_balance(coin_a));
        balance::join(&mut pool.reserve_b, coin::into_balance(coin_b));
    }

    /// Get pool reserves
    public fun get_reserves<CoinA, CoinB>(pool: &SwapPool<CoinA, CoinB>): (u64, u64) {
        (balance::value(&pool.reserve_a), balance::value(&pool.reserve_b))
    }

    /// Calculate output amount for a swap
    public fun calculate_output_a_to_b<CoinA, CoinB>(
        pool: &SwapPool<CoinA, CoinB>,
        amount_a: u64
    ): u64 {
        (amount_a * pool.rate_a_to_b) / RATE_PRECISION
    }

    /// Calculate output amount for reverse swap
    public fun calculate_output_b_to_a<CoinA, CoinB>(
        pool: &SwapPool<CoinA, CoinB>,
        amount_b: u64
    ): u64 {
        (amount_b * RATE_PRECISION) / pool.rate_a_to_b
    }
}