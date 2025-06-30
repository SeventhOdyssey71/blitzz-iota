module Blitz::simple_staking {
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::iota::IOTA;

    // Simple staking pool
    public struct StakingPool has key {
        id: UID,
        total_staked: Balance<IOTA>,
        exchange_rate: u64,
    }

    // stIOTA token
    public struct StakedIOTA has key, store {
        id: UID,
        amount: u64,
    }

    fun init(ctx: &mut TxContext) {
        let pool = StakingPool {
            id: object::new(ctx),
            total_staked: balance::zero<IOTA>(),
            exchange_rate: 1000000000, // 1:1 initial rate
        };
        transfer::share_object(pool);
    }

    public entry fun stake(
        pool: &mut StakingPool,
        iota_coin: Coin<IOTA>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&iota_coin);
        let stiota_amount = (amount * 1000000000) / pool.exchange_rate;
        
        balance::join(&mut pool.total_staked, coin::into_balance(iota_coin));
        
        let stiota = StakedIOTA {
            id: object::new(ctx),
            amount: stiota_amount,
        };
        
        transfer::public_transfer(stiota, tx_context::sender(ctx));
    }
}