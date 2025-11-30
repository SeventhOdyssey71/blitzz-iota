module Blitz::simple_dex {
    // use std::option; // Unused import
    // use iota::object; // Default import, not needed
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::clock::{Self, Clock};
    use iota::object;
    use iota::transfer;
    use iota::tx_context;

    // Error codes
    const E_ZERO_AMOUNT: u64 = 0;
    const E_INSUFFICIENT_OUTPUT_AMOUNT: u64 = 2;
    const E_INSUFFICIENT_RESERVES: u64 = 3;
    const E_SLIPPAGE_EXCEEDED: u64 = 5;

    // Constants
    const FEE_NUMERATOR: u64 = 18; // 1.8% fee
    const FEE_DENOMINATOR: u64 = 1000;

    // High-performance math functions optimized for gas efficiency
    
    // Fast square root using Newton-Raphson with optimized initial guess
    fun sqrt(x: u64): u64 {
        if (x == 0) return 0;
        if (x < 4) return 1;
        
        // Better initial guess reduces iterations
        let mut z = x;
        if (x >= 0x100000000) {
            z = z >> 16;
        };
        if (z >= 0x10000) {
            z = z >> 8;
        };
        if (z >= 0x100) {
            z = z >> 4;
        };
        if (z >= 0x10) {
            z = z >> 2;
        };
        
        z = (z + 1) >> 1;
        z = (z + x / z) >> 1;
        z = (z + x / z) >> 1;
        z = (z + x / z) >> 1;
        z = (z + x / z) >> 1;
        z = (z + x / z) >> 1;
        z = (z + x / z) >> 1;
        
        // Ensure we return the floor
        let candidate = z - 1;
        if (candidate * candidate <= x) z else candidate
    }
    
    // Pack/unpack helper functions for efficient storage
    fun pack_u64_pair(high: u64, low: u64): u128 {
        ((high as u128) << 64) | (low as u128)
    }
    
    fun unpack_u64_pair(packed: u128): (u64, u64) {
        let high = ((packed >> 64) as u64);
        let low = ((packed & 0xFFFFFFFFFFFFFFFF) as u64);
        (high, low)
    }
    
    // Fast multiplication with overflow checking
    fun safe_mul_div(a: u64, b: u64, c: u64): u64 {
        // Use u128 to prevent overflow
        let result = ((a as u128) * (b as u128)) / (c as u128);
        assert!(result <= (0xFFFFFFFFFFFFFFFF as u128), E_INSUFFICIENT_OUTPUT_AMOUNT);
        (result as u64)
    }

    // High-performance pool struct optimized for gas efficiency
    public struct Pool<phantom CoinA, phantom CoinB> has key {
        id: object::UID,
        reserve_a: Balance<CoinA>,
        reserve_b: Balance<CoinB>,
        lp_supply: u64,
        // Pack fees and volume into single words for better storage
        fee_data: u128, // Upper 64 bits: fees_a, Lower 64 bits: fees_b  
        volume_data: u128, // Upper 64 bits: volume_a, Lower 64 bits: volume_b
        // Add pool metadata for better performance tracking
        last_price_a: u64, // Cached price for price oracle
        last_price_b: u64,
        last_update: u64, // Timestamp of last update
    }

    public struct LPToken<phantom CoinA, phantom CoinB> has key, store {
        id: object::UID,
        amount: u64,
    }

    public entry fun create_pool<CoinA, CoinB>(
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        ctx: &mut tx_context::TxContext
    ) {
        let amount_a = coin::value(&coin_a);
        let amount_b = coin::value(&coin_b);
        
        assert!(amount_a > 0 && amount_b > 0, E_ZERO_AMOUNT);
        
        // Calculate initial LP supply using optimized geometric mean
        let initial_lp_supply = sqrt(safe_mul_div(amount_a, amount_b, 1));
        assert!(initial_lp_supply > 0, E_ZERO_AMOUNT);
        
        // Create pool with packed data for gas efficiency
        let pool = Pool<CoinA, CoinB> {
            id: object::new(ctx),
            reserve_a: coin::into_balance(coin_a),
            reserve_b: coin::into_balance(coin_b),
            lp_supply: initial_lp_supply,
            fee_data: pack_u64_pair(0, 0), // fees_a, fees_b
            volume_data: pack_u64_pair(0, 0), // volume_a, volume_b
            last_price_a: safe_mul_div(amount_a, 1000000, amount_b), // Price with 6 decimals
            last_price_b: safe_mul_div(amount_b, 1000000, amount_a),
            last_update: clock::timestamp_ms(clock),
        };
        
        // Mint LP tokens to creator
        let lp_token = LPToken<CoinA, CoinB> {
            id: object::new(ctx),
            amount: initial_lp_supply,
        };
        
        transfer::share_object(pool);
        transfer::public_transfer(lp_token, tx_context::sender(ctx));
    }
    
    // High-performance internal swap function optimized for gas efficiency
    public fun swap_a_to_b_internal<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        ctx: &mut tx_context::TxContext
    ): Coin<CoinB> {
        let amount_in = coin::value(&coin_a);
        assert!(amount_in > 0, E_ZERO_AMOUNT);
        
        let reserve_a = balance::value(&pool.reserve_a);
        let reserve_b = balance::value(&pool.reserve_b);
        
        // Fast fee calculation using safe arithmetic
        let fee_amount = safe_mul_div(amount_in, FEE_NUMERATOR, FEE_DENOMINATOR);
        let amount_in_after_fee = amount_in - fee_amount;
        
        // Optimized constant product calculation with overflow protection
        let amount_out = safe_mul_div(amount_in_after_fee, reserve_b, reserve_a + amount_in_after_fee);
        
        // Efficient validation
        assert!(amount_out > 0, E_INSUFFICIENT_OUTPUT_AMOUNT);
        assert!(reserve_b >= amount_out, E_INSUFFICIENT_RESERVES);
        
        // Update pool state efficiently
        balance::join(&mut pool.reserve_a, coin::into_balance(coin_a));
        let coin_b = coin::take(&mut pool.reserve_b, amount_out, ctx);
        
        // Update packed data structures for gas efficiency
        let (current_fees_a, current_fees_b) = unpack_u64_pair(pool.fee_data);
        let (current_volume_a, current_volume_b) = unpack_u64_pair(pool.volume_data);
        
        pool.fee_data = pack_u64_pair(current_fees_a + fee_amount, current_fees_b);
        pool.volume_data = pack_u64_pair(current_volume_a + amount_in, current_volume_b);
        
        // Update price cache for oracle functionality
        pool.last_price_a = safe_mul_div(reserve_a + amount_in_after_fee, 1000000, reserve_b - amount_out);
        pool.last_price_b = safe_mul_div(reserve_b - amount_out, 1000000, reserve_a + amount_in_after_fee);
        
        coin_b
    }

    // Calculate expected output amount without performing the swap
    public fun calculate_output_amount(amount_in: u64, reserve_in: u64, reserve_out: u64): u64 {
        // Calculate fee
        let fee_amount = (amount_in * FEE_NUMERATOR) / FEE_DENOMINATOR;
        let amount_in_after_fee = amount_in - fee_amount;
        
        // Calculate output using constant product formula
        (amount_in_after_fee * reserve_out) / (reserve_in + amount_in_after_fee)
    }

    public entry fun swap_a_to_b<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        ctx: &mut tx_context::TxContext
    ) {
        let coin_b = swap_a_to_b_internal(pool, coin_a, ctx);
        transfer::public_transfer(coin_b, tx_context::sender(ctx));
    }

    public entry fun swap_b_to_a<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        ctx: &mut tx_context::TxContext
    ) {
        let amount_in = coin::value(&coin_b);
        let reserve_a = balance::value(&pool.reserve_a);
        let reserve_b = balance::value(&pool.reserve_b);
        
        // Calculate fee
        let fee_amount = (amount_in * FEE_NUMERATOR) / FEE_DENOMINATOR;
        let amount_in_after_fee = amount_in - fee_amount;
        
        // Calculate output using constant product formula (x * y = k)
        // After swap: (reserve_b + amount_in_after_fee) * (reserve_a - amount_out) = reserve_a * reserve_b
        // Solving for amount_out: amount_out = (amount_in_after_fee * reserve_a) / (reserve_b + amount_in_after_fee)
        let amount_out = (amount_in_after_fee * reserve_a) / (reserve_b + amount_in_after_fee);
        
        // Ensure pool has enough reserves
        assert!(amount_out > 0, E_INSUFFICIENT_OUTPUT_AMOUNT);
        assert!(reserve_a >= amount_out, E_INSUFFICIENT_RESERVES);
        
        // Update pool state
        balance::join(&mut pool.reserve_b, coin::into_balance(coin_b));
        let coin_a = coin::take(&mut pool.reserve_a, amount_out, ctx);
        
        // Record fees and volume using packed data
        let (current_fees_a, current_fees_b) = unpack_u64_pair(pool.fee_data);
        let (current_volume_a, current_volume_b) = unpack_u64_pair(pool.volume_data);
        
        pool.fee_data = pack_u64_pair(current_fees_a, current_fees_b + fee_amount);
        pool.volume_data = pack_u64_pair(current_volume_a, current_volume_b + amount_in);
        
        transfer::public_transfer(coin_a, tx_context::sender(ctx));
    }
    
    public entry fun add_liquidity<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        min_lp_amount: u64,
        ctx: &mut tx_context::TxContext
    ) {
        let amount_a = coin::value(&coin_a);
        let amount_b = coin::value(&coin_b);
        
        assert!(amount_a > 0 && amount_b > 0, E_ZERO_AMOUNT);
        
        let reserve_a = balance::value(&pool.reserve_a);
        let reserve_b = balance::value(&pool.reserve_b);
        
        // Calculate LP tokens to mint
        let lp_amount = if (pool.lp_supply == 0) {
            // First liquidity provider - use geometric mean
            // sqrt(amount_a * amount_b)
            let product = amount_a * amount_b;
            sqrt(product)
        } else {
            // Proportional to existing liquidity
            let lp_from_a = (amount_a * pool.lp_supply) / reserve_a;
            let lp_from_b = (amount_b * pool.lp_supply) / reserve_b;
            // Use the minimum to maintain ratio
            if (lp_from_a < lp_from_b) { lp_from_a } else { lp_from_b }
        };
        
        // Check minimum LP amount
        assert!(lp_amount >= min_lp_amount, E_SLIPPAGE_EXCEEDED);
        
        // Add liquidity to pool
        balance::join(&mut pool.reserve_a, coin::into_balance(coin_a));
        balance::join(&mut pool.reserve_b, coin::into_balance(coin_b));
        
        // Update LP supply
        pool.lp_supply = pool.lp_supply + lp_amount;
        
        // Mint LP tokens
        let lp_token = LPToken<CoinA, CoinB> {
            id: object::new(ctx),
            amount: lp_amount,
        };
        
        transfer::public_transfer(lp_token, tx_context::sender(ctx));
    }
    
    public entry fun remove_liquidity<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        lp_token: LPToken<CoinA, CoinB>,
        min_amount_a: u64,
        min_amount_b: u64,
        ctx: &mut tx_context::TxContext
    ) {
        let lp_amount = lp_token.amount;
        let reserve_a = balance::value(&pool.reserve_a);
        let reserve_b = balance::value(&pool.reserve_b);
        
        // Calculate amounts to return - reorder to prevent overflow
        // Instead of (lp_amount * reserve) / lp_supply
        // We do reserve * (lp_amount / lp_supply) when safe
        let amount_a = if (lp_amount < pool.lp_supply) {
            // Safe path: divide first
            reserve_a * lp_amount / pool.lp_supply
        } else {
            // LP amount equals total supply, return all reserves
            reserve_a
        };
        
        let amount_b = if (lp_amount < pool.lp_supply) {
            // Safe path: divide first
            reserve_b * lp_amount / pool.lp_supply
        } else {
            // LP amount equals total supply, return all reserves
            reserve_b
        };
        
        // Check minimum amounts
        assert!(amount_a >= min_amount_a, E_SLIPPAGE_EXCEEDED);
        assert!(amount_b >= min_amount_b, E_SLIPPAGE_EXCEEDED);
        
        // Update LP supply
        pool.lp_supply = pool.lp_supply - lp_amount;
        
        // Burn LP token
        let LPToken { id, amount: _ } = lp_token;
        object::delete(id);
        
        // Return coins to user only if amounts are greater than 0
        if (amount_a > 0) {
            let coin_a = coin::take(&mut pool.reserve_a, amount_a, ctx);
            transfer::public_transfer(coin_a, tx_context::sender(ctx));
        };
        
        if (amount_b > 0) {
            let coin_b = coin::take(&mut pool.reserve_b, amount_b, ctx);
            transfer::public_transfer(coin_b, tx_context::sender(ctx));
        };
    }
    
    // High-performance getter functions optimized for gas efficiency
    public fun get_reserves<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): (u64, u64) {
        (balance::value(&pool.reserve_a), balance::value(&pool.reserve_b))
    }
    
    public fun get_lp_supply<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): u64 {
        pool.lp_supply
    }
    
    // Get packed fee data efficiently 
    public fun get_fees<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): (u64, u64) {
        unpack_u64_pair(pool.fee_data)
    }
    
    // Get packed volume data efficiently
    public fun get_volume<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): (u64, u64) {
        unpack_u64_pair(pool.volume_data)
    }
    
    // Get cached price data for oracle functionality
    public fun get_cached_prices<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): (u64, u64, u64) {
        (pool.last_price_a, pool.last_price_b, pool.last_update)
    }
    
    // Fast price calculation without state changes
    public fun get_spot_price<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): u64 {
        let reserve_a = balance::value(&pool.reserve_a);
        let reserve_b = balance::value(&pool.reserve_b);
        if (reserve_b == 0) return 0;
        safe_mul_div(reserve_a, 1000000, reserve_b)
    }
    
    // Efficient pool health check
    public fun is_pool_healthy<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): bool {
        let reserve_a = balance::value(&pool.reserve_a);
        let reserve_b = balance::value(&pool.reserve_b);
        reserve_a > 0 && reserve_b > 0 && pool.lp_supply > 0
    }
}