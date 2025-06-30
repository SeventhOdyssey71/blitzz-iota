#[test_only]
module Blitz::iota_stiota_swap_tests {
    use Blitz::iota_stiota_swap::{Self, SwapPool, STIOTA, IOTA_STIOTA_SWAP};
    use iota::coin::{Self, Coin};
    use iota::iota::IOTA;
    use iota::test_scenario::{Self, Scenario};
    use iota::test_utils;

    const USER: address = @0xA;
    const ADMIN: address = @0xB;

    fun setup_test(): Scenario {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            iota_stiota_swap::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        scenario
    }

    #[test]
    fun test_swap_iota_to_stiota() {
        let mut scenario = setup_test();
        
        // Get the swap pool
        test_scenario::next_tx(&mut scenario, USER);
        {
            let mut pool = test_scenario::take_shared<SwapPool>(&scenario);
            let iota_coin = coin::mint_for_testing<IOTA>(1000000000, test_scenario::ctx(&mut scenario)); // 1 IOTA
            
            // Perform swap
            iota_stiota_swap::swap_iota_to_stiota(
                &mut pool,
                iota_coin,
                test_scenario::ctx(&mut scenario)
            );
            
            // Check reserves
            let (iota_reserve, stiota_supply) = iota_stiota_swap::get_reserves(&pool);
            assert!(iota_reserve == 1000000000, 0);
            assert!(stiota_supply == 999000000, 1); // After 0.1% fee
            
            test_scenario::return_shared(pool);
        };
        
        // Check user received stIOTA
        test_scenario::next_tx(&mut scenario, USER);
        {
            let stiota_coin = test_scenario::take_from_sender<Coin<STIOTA>>(&scenario);
            assert!(coin::value(&stiota_coin) == 999000000, 2);
            test_scenario::return_to_sender(&scenario, stiota_coin);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_swap_stiota_to_iota() {
        let mut scenario = setup_test();
        
        // First, stake some IOTA to get stIOTA
        test_scenario::next_tx(&mut scenario, USER);
        {
            let mut pool = test_scenario::take_shared<SwapPool>(&scenario);
            let iota_coin = coin::mint_for_testing<IOTA>(2000000000, test_scenario::ctx(&mut scenario)); // 2 IOTA
            
            iota_stiota_swap::swap_iota_to_stiota(
                &mut pool,
                iota_coin,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(pool);
        };
        
        // Now unstake half of the stIOTA
        test_scenario::next_tx(&mut scenario, USER);
        {
            let mut pool = test_scenario::take_shared<SwapPool>(&scenario);
            let stiota_coin = test_scenario::take_from_sender<Coin<STIOTA>>(&scenario);
            let unstake_coin = coin::split(&mut stiota_coin, 999000000, test_scenario::ctx(&mut scenario)); // Half
            
            iota_stiota_swap::swap_stiota_to_iota(
                &mut pool,
                unstake_coin,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_to_sender(&scenario, stiota_coin);
            test_scenario::return_shared(pool);
        };
        
        // Check user received IOTA back
        test_scenario::next_tx(&mut scenario, USER);
        {
            let iota_coin = test_scenario::take_from_sender<Coin<IOTA>>(&scenario);
            // Should receive ~0.998 IOTA after two 0.1% fees
            assert!(coin::value(&iota_coin) == 998001000, 3);
            test_scenario::return_to_sender(&scenario, iota_coin);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_exchange_rate_update() {
        let mut scenario = setup_test();
        
        // Update exchange rate
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut pool = test_scenario::take_shared<SwapPool>(&scenario);
            iota_stiota_swap::update_exchange_rate(&mut pool, 1100000000, test_scenario::ctx(&mut scenario)); // 1.1 rate
            assert!(iota_stiota_swap::get_exchange_rate(&pool) == 1100000000, 0);
            test_scenario::return_shared(pool);
        };
        
        // Swap with new rate
        test_scenario::next_tx(&mut scenario, USER);
        {
            let mut pool = test_scenario::take_shared<SwapPool>(&scenario);
            let iota_coin = coin::mint_for_testing<IOTA>(1100000000, test_scenario::ctx(&mut scenario)); // 1.1 IOTA
            
            iota_stiota_swap::swap_iota_to_stiota(
                &mut pool,
                iota_coin,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(pool);
        };
        
        // Check received amount with new rate
        test_scenario::next_tx(&mut scenario, USER);
        {
            let stiota_coin = test_scenario::take_from_sender<Coin<STIOTA>>(&scenario);
            // Should receive ~0.999 stIOTA (1.1 IOTA / 1.1 rate - fee)
            assert!(coin::value(&stiota_coin) == 999000000, 1);
            test_scenario::return_to_sender(&scenario, stiota_coin);
        };
        
        test_scenario::end(scenario);
    }
}