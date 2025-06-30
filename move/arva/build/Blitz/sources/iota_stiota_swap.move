module Blitz::iota_stiota_swap {
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::iota::IOTA;
    use iota::event;
    use iota::url;
    use std::option;

    // Error codes
    const E_INSUFFICIENT_BALANCE: u64 = 0;
    const E_INVALID_AMOUNT: u64 = 1;
    const E_POOL_PAUSED: u64 = 2;

    // One-time witness for the module
    public struct IOTA_STIOTA_SWAP has drop {}
    
    // stIOTA token
    public struct STIOTA has drop {}

    // Swap pool for IOTA <-> stIOTA
    public struct SwapPool has key {
        id: UID,
        iota_reserve: Balance<IOTA>,
        stiota_treasury: TreasuryCap<STIOTA>,
        total_stiota_supply: u64,
        exchange_rate: u64, // Rate with 9 decimals (1e9 = 1:1)
        fee_percentage: u64, // Fee in basis points (100 = 1%)
        paused: bool,
    }

    // Events
    public struct SwapEvent has copy, drop {
        user: address,
        iota_amount: u64,
        stiota_amount: u64,
        is_stake: bool,
        exchange_rate: u64,
    }

    // Initialize stIOTA token and swap pool
    fun init(witness: IOTA_STIOTA_SWAP, ctx: &mut TxContext) {
        // Create stIOTA currency
        let stiota_witness = STIOTA {};
        // Create stIOTA currency
        let (treasury_cap, metadata) = coin::create_currency<STIOTA>(
            stiota_witness,
            9, // decimals
            b"stIOTA",
            b"Staked IOTA",
            b"Liquid staking token for IOTA",
            option::none(),
            ctx
        );

        // Create swap pool
        let pool = SwapPool {
            id: object::new(ctx),
            iota_reserve: balance::zero<IOTA>(),
            stiota_treasury: treasury_cap,
            total_stiota_supply: 0,
            exchange_rate: 1000000000, // 1:1 initial rate
            fee_percentage: 10, // 0.1% fee
            paused: false,
        };

        // Share the pool and metadata
        transfer::share_object(pool);
        transfer::public_freeze_object(metadata);
    }

    // Swap IOTA for stIOTA (staking)
    public entry fun swap_iota_to_stiota(
        pool: &mut SwapPool,
        iota_coin: Coin<IOTA>,
        ctx: &mut TxContext
    ) {
        assert!(!pool.paused, E_POOL_PAUSED);
        
        let iota_amount = coin::value(&iota_coin);
        assert!(iota_amount > 0, E_INVALID_AMOUNT);

        // Calculate stIOTA amount based on exchange rate
        // stIOTA = (IOTA * 1e9) / exchange_rate
        let stiota_amount = calculate_stiota_amount(iota_amount, pool.exchange_rate, pool.fee_percentage);

        // Add IOTA to reserves
        balance::join(&mut pool.iota_reserve, coin::into_balance(iota_coin));

        // Mint stIOTA
        let stiota_coin = coin::mint(&mut pool.stiota_treasury, stiota_amount, ctx);
        pool.total_stiota_supply = pool.total_stiota_supply + stiota_amount;

        // Emit event
        event::emit(SwapEvent {
            user: tx_context::sender(ctx),
            iota_amount,
            stiota_amount,
            is_stake: true,
            exchange_rate: pool.exchange_rate,
        });

        // Transfer stIOTA to user
        transfer::public_transfer(stiota_coin, tx_context::sender(ctx));
    }

    // Swap stIOTA for IOTA (unstaking)
    public entry fun swap_stiota_to_iota(
        pool: &mut SwapPool,
        stiota_coin: Coin<STIOTA>,
        ctx: &mut TxContext
    ) {
        assert!(!pool.paused, E_POOL_PAUSED);
        
        let stiota_amount = coin::value(&stiota_coin);
        assert!(stiota_amount > 0, E_INVALID_AMOUNT);

        // Calculate IOTA amount based on exchange rate
        // IOTA = (stIOTA * exchange_rate) / 1e9
        let iota_amount = calculate_iota_amount(stiota_amount, pool.exchange_rate, pool.fee_percentage);
        
        // Check if pool has enough IOTA
        assert!(balance::value(&pool.iota_reserve) >= iota_amount, E_INSUFFICIENT_BALANCE);

        // Burn stIOTA
        coin::burn(&mut pool.stiota_treasury, stiota_coin);
        pool.total_stiota_supply = pool.total_stiota_supply - stiota_amount;

        // Withdraw IOTA from reserves
        let iota_coin = coin::take(&mut pool.iota_reserve, iota_amount, ctx);

        // Emit event
        event::emit(SwapEvent {
            user: tx_context::sender(ctx),
            iota_amount,
            stiota_amount,
            is_stake: false,
            exchange_rate: pool.exchange_rate,
        });

        // Transfer IOTA to user
        transfer::public_transfer(iota_coin, tx_context::sender(ctx));
    }

    // Calculate stIOTA amount with fee
    fun calculate_stiota_amount(iota_amount: u64, exchange_rate: u64, fee_percentage: u64): u64 {
        // Apply fee
        let amount_after_fee = iota_amount - ((iota_amount * fee_percentage) / 10000);
        // Calculate stIOTA
        (amount_after_fee * 1000000000) / exchange_rate
    }

    // Calculate IOTA amount with fee
    fun calculate_iota_amount(stiota_amount: u64, exchange_rate: u64, fee_percentage: u64): u64 {
        // Calculate IOTA
        let iota_amount = (stiota_amount * exchange_rate) / 1000000000;
        // Apply fee
        iota_amount - ((iota_amount * fee_percentage) / 10000)
    }

    // View functions
    public fun get_exchange_rate(pool: &SwapPool): u64 {
        pool.exchange_rate
    }

    public fun get_reserves(pool: &SwapPool): (u64, u64) {
        (balance::value(&pool.iota_reserve), pool.total_stiota_supply)
    }

    public fun get_fee_percentage(pool: &SwapPool): u64 {
        pool.fee_percentage
    }

    // Admin functions (for demonstration - in production these would be protected)
    public entry fun update_exchange_rate(
        pool: &mut SwapPool,
        new_rate: u64,
        _ctx: &mut TxContext
    ) {
        pool.exchange_rate = new_rate;
    }

    public entry fun pause_pool(
        pool: &mut SwapPool,
        _ctx: &mut TxContext
    ) {
        pool.paused = true;
    }

    public entry fun unpause_pool(
        pool: &mut SwapPool,
        _ctx: &mut TxContext
    ) {
        pool.paused = false;
    }
    
    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(IOTA_STIOTA_SWAP {}, ctx);
    }
}