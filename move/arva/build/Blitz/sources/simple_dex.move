module Blitz::simple_dex {
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID};
    use iota::tx_context::TxContext;
    use iota::transfer;

    // Constants
    const FEE_NUMERATOR: u64 = 3; // 0.3% fee
    const FEE_DENOMINATOR: u64 = 1000;
    
    // Error codes
    const E_INSUFFICIENT_RESERVES: u64 = 1;
    const E_INSUFFICIENT_OUTPUT_AMOUNT: u64 = 2;
    
    // AMM Pool
    public struct Pool<phantom CoinA, phantom CoinB> has key {
        id: UID,
        reserve_a: Balance<CoinA>,
        reserve_b: Balance<CoinB>,
        lp_supply: u64,
        fees_a: u64, // Accumulated fees in token A
        fees_b: u64, // Accumulated fees in token B
        total_volume_a: u64, // Total volume traded in token A
        total_volume_b: u64, // Total volume traded in token B
    }

    // LP Token
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
        
        // Simple product for initial liquidity
        let lp_supply = amount_a;
        
        let pool = Pool<CoinA, CoinB> {
            id: object::new(ctx),
            reserve_a: coin::into_balance(coin_a),
            reserve_b: coin::into_balance(coin_b),
            lp_supply: lp_supply,
            fees_a: 0,
            fees_b: 0,
            total_volume_a: 0,
            total_volume_b: 0,
        };
        
        transfer::share_object(pool);
        
        let lp_token = LPToken<CoinA, CoinB> {
            id: object::new(ctx),
            amount: lp_supply,
        };
        
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
        let lp_amount = if (pool.lp_supply == 0) {
            // First liquidity provider
            amount_a
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
        
        // Calculate amounts to return
        let amount_a = (lp_amount * reserve_a) / pool.lp_supply;
        let amount_b = (lp_amount * reserve_b) / pool.lp_supply;
        
        // Update LP supply
        pool.lp_supply = pool.lp_supply - lp_amount;
        
        // Burn LP token
        let LPToken { id, amount: _ } = lp_token;
        object::delete(id);
        
        // Return coins to user
        let coin_a = coin::take(&mut pool.reserve_a, amount_a, ctx);
        let coin_b = coin::take(&mut pool.reserve_b, amount_b, ctx);
        
        transfer::public_transfer(coin_a, tx_context::sender(ctx));
        transfer::public_transfer(coin_b, tx_context::sender(ctx));
    }
    
    // Getter functions
    public fun get_reserves<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): (u64, u64) {
        (balance::value(&pool.reserve_a), balance::value(&pool.reserve_b))
    }
    
    public fun get_lp_supply<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): u64 {
        pool.lp_supply
    }
    
    public fun get_fees<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): (u64, u64) {
        (pool.fees_a, pool.fees_b)
    }
    
    public fun get_volume<CoinA, CoinB>(pool: &Pool<CoinA, CoinB>): (u64, u64) {
        (pool.total_volume_a, pool.total_volume_b)
    }
    
    // Calculate output amount for swap preview
    public fun calculate_swap_output<CoinA, CoinB>(
        pool: &Pool<CoinA, CoinB>,
        amount_in: u64,
        is_a_to_b: bool
    ): u64 {
        let (reserve_a, reserve_b) = get_reserves(pool);
        let fee_amount = (amount_in * FEE_NUMERATOR) / FEE_DENOMINATOR;
        let amount_in_after_fee = amount_in - fee_amount;
        
        if (is_a_to_b) {
            (amount_in_after_fee * reserve_b) / (reserve_a + amount_in_after_fee)
        } else {
            (amount_in_after_fee * reserve_a) / (reserve_b + amount_in_after_fee)
        }
    }
}