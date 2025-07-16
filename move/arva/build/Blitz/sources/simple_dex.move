module Blitz::simple_dex {
    // use std::option; // Unused import
    // use iota::object; // Default import, not needed
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    // use iota::transfer; // Default import, not needed
    // use iota::tx_context; // Default import, not needed

    // Error codes
    const E_ZERO_AMOUNT: u64 = 0;
    // const E_INSUFFICIENT_LIQUIDITY: u64 = 1; // Unused constant
    const E_INSUFFICIENT_OUTPUT_AMOUNT: u64 = 2;
    const E_INSUFFICIENT_RESERVES: u64 = 3;

    // Constants
    const FEE_NUMERATOR: u64 = 18; // 1.8% fee
    const FEE_DENOMINATOR: u64 = 1000;

    // Square root function using Babylonian method
    fun sqrt(x: u64): u64 {
        if (x == 0) {
            return 0
        };
        
        let mut z = x;
        let mut y = (z + 1) / 2;
        
        while (y < z) {
            z = y;
            y = (z + x / z) / 2;
        };
        
        z
    }

    public struct Pool<phantom CoinA, phantom CoinB> has key {
        id: UID,
        reserve_a: Balance<CoinA>,
        reserve_b: Balance<CoinB>,
        lp_supply: u64,
        fees_a: u64,
        fees_b: u64,
        total_volume_a: u64,
        total_volume_b: u64,
    }

    public struct LPToken<phantom CoinA, phantom CoinB> has key, store {
        id: UID,
        amount: u64,
    }

    public entry fun create_pool<CoinA, CoinB>(
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        ctx: &mut TxContext
    ) {
        let amount_a = coin::value(&coin_a);
        let amount_b = coin::value(&coin_b);
        
        assert!(amount_a > 0 && amount_b > 0, E_ZERO_AMOUNT);
        
        let pool = Pool<CoinA, CoinB> {
            id: object::new(ctx),
            reserve_a: coin::into_balance(coin_a),
            reserve_b: coin::into_balance(coin_b),
            lp_supply: amount_a, // Initial LP supply equals amount_a
            fees_a: 0,
            fees_b: 0,
            total_volume_a: 0,
            total_volume_b: 0,
        };
        
        // Mint LP tokens to creator
        let lp_token = LPToken<CoinA, CoinB> {
            id: object::new(ctx),
            amount: amount_a,
        };
        
        transfer::share_object(pool);
        transfer::public_transfer(lp_token, tx_context::sender(ctx));
    }
    
    public entry fun swap_a_to_b<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        ctx: &mut TxContext
    ) {
        let amount_in = coin::value(&coin_a);
        let reserve_a = balance::value(&pool.reserve_a);
        let reserve_b = balance::value(&pool.reserve_b);
        
        // Calculate fee
        let fee_amount = (amount_in * FEE_NUMERATOR) / FEE_DENOMINATOR;
        let amount_in_after_fee = amount_in - fee_amount;
        
        // Calculate output using constant product formula (x * y = k)
        // After swap: (reserve_a + amount_in_after_fee) * (reserve_b - amount_out) = reserve_a * reserve_b
        // Solving for amount_out: amount_out = (amount_in_after_fee * reserve_b) / (reserve_a + amount_in_after_fee)
        let amount_out = (amount_in_after_fee * reserve_b) / (reserve_a + amount_in_after_fee);
        
        // Ensure pool has enough reserves
        assert!(amount_out > 0, E_INSUFFICIENT_OUTPUT_AMOUNT);
        assert!(reserve_b >= amount_out, E_INSUFFICIENT_RESERVES);
        
        // Update pool state
        balance::join(&mut pool.reserve_a, coin::into_balance(coin_a));
        let coin_b = coin::take(&mut pool.reserve_b, amount_out, ctx);
        
        // Record fees and volume
        pool.fees_a = pool.fees_a + fee_amount;
        pool.total_volume_a = pool.total_volume_a + amount_in;
        
        transfer::public_transfer(coin_b, tx_context::sender(ctx));
    }

    public entry fun swap_b_to_a<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        ctx: &mut TxContext
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
        
        // Record fees and volume
        pool.fees_b = pool.fees_b + fee_amount;
        pool.total_volume_b = pool.total_volume_b + amount_in;
        
        transfer::public_transfer(coin_a, tx_context::sender(ctx));
    }
    
    public entry fun add_liquidity<CoinA, CoinB>(
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        coin_b: Coin<CoinB>,
        _min_lp_amount: u64,
        ctx: &mut TxContext
    ) {
        let amount_a = coin::value(&coin_a);
        let amount_b = coin::value(&coin_b);
        let reserve_a = balance::value(&pool.reserve_a);
        let reserve_b = balance::value(&pool.reserve_b);
        
        // Calculate LP tokens to mint
        let lp_amount = if (pool.lp_supply >= 0) {
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
        _min_amount_a: u64,
        _min_amount_b: u64,
        ctx: &mut TxContext
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
    
    // Getter functions
    public fun get_reserves<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): (u64, u64) {
        (balance::value(&pool.reserve_a), balance::value(&pool.reserve_b))
    }
    
    public fun get_lp_supply<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): u64 {
        pool.lp_supply
    }
}