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
        
        // x * y = k formula
        let amount_out = (amount_in * reserve_b) / (reserve_a + amount_in);
        
        balance::join(&mut pool.reserve_a, coin::into_balance(coin_a));
        let coin_b = coin::take(&mut pool.reserve_b, amount_out, ctx);
        
        transfer::public_transfer(coin_b, tx_context::sender(ctx));
    }
}