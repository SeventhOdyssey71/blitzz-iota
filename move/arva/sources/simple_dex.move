module Blitz::simple_dex {
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID};
    use iota::tx_context::TxContext;
    use iota::transfer;

    // AMM Pool
    public struct Pool<phantom CoinA, phantom CoinB> has key {
        id: UID,
        reserve_a: Balance<CoinA>,
        reserve_b: Balance<CoinB>,
        lp_supply: u64,
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
        
        // Simple fixed rate: 1:1 for most pairs
        // You can adjust this based on your needs
        let amount_out = amount_in;
        
        // Ensure pool has enough reserves
        assert!(reserve_b >= amount_out, 1);
        
        balance::join(&mut pool.reserve_a, coin::into_balance(coin_a));
        let coin_b = coin::take(&mut pool.reserve_b, amount_out, ctx);
        
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
        
        // Simple fixed rate: 1:1 for most pairs
        let amount_out = amount_in;
        
        // Ensure pool has enough reserves
        assert!(reserve_a >= amount_out, 1);
        
        balance::join(&mut pool.reserve_b, coin::into_balance(coin_b));
        let coin_a = coin::take(&mut pool.reserve_a, amount_out, ctx);
        
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
}