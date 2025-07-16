#[test_only]
module Blitz::iota_stiota_swap_tests {
    use Blitz::simple_staking::{Self, StakingPool, StakedIOTA};
    use iota::coin::{Self};
    use iota::iota::IOTA;
    use iota::test_scenario::{Self, Scenario};

    const USER: address = @0xA;
    const ADMIN: address = @0xB;

    fun setup_test(): Scenario {
        let mut scenario = test_scenario::begin(ADMIN);
        {
            simple_staking::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        scenario
    }

    #[test]
    fun test_stake_iota() {
        let mut scenario = setup_test();
        
        // Stake some IOTA
        test_scenario::next_tx(&mut scenario, USER);
        {
            let mut pool = test_scenario::take_shared<StakingPool>(&scenario);
            let iota_coin = coin::mint_for_testing<IOTA>(1000000000, test_scenario::ctx(&mut scenario)); // 1 IOTA
            
            // Perform staking
            simple_staking::stake(
                &mut pool,
                iota_coin,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(pool);
        };
        
        // Check user received stIOTA
        test_scenario::next_tx(&mut scenario, USER);
        {
            let stiota_coin = test_scenario::take_from_sender<StakedIOTA>(&scenario);
            // Should receive 1 stIOTA at 1:1 rate
            assert!(simple_staking::get_amount(&stiota_coin) == 1000000000, 0);
            test_scenario::return_to_sender(&scenario, stiota_coin);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multiple_stakes() {
        let mut scenario = setup_test();
        
        // First stake
        test_scenario::next_tx(&mut scenario, USER);
        {
            let mut pool = test_scenario::take_shared<StakingPool>(&scenario);
            let iota_coin = coin::mint_for_testing<IOTA>(1000000000, test_scenario::ctx(&mut scenario)); // 1 IOTA
            
            simple_staking::stake(
                &mut pool,
                iota_coin,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(pool);
        };
        
        // Second stake
        test_scenario::next_tx(&mut scenario, USER);
        {
            let mut pool = test_scenario::take_shared<StakingPool>(&scenario);
            let iota_coin = coin::mint_for_testing<IOTA>(2000000000, test_scenario::ctx(&mut scenario)); // 2 IOTA
            
            simple_staking::stake(
                &mut pool,
                iota_coin,
                test_scenario::ctx(&mut scenario)
            );
            
            test_scenario::return_shared(pool);
        };
        
        // Check user received first stIOTA token
        test_scenario::next_tx(&mut scenario, USER);
        {
            let stiota_coin1 = test_scenario::take_from_sender<StakedIOTA>(&scenario);
            
            // Should receive 1 stIOTA
            assert!(simple_staking::get_amount(&stiota_coin1) == 1000000000, 0);
            
            test_scenario::return_to_sender(&scenario, stiota_coin1);
        };
        
        // Check user received second stIOTA token
        test_scenario::next_tx(&mut scenario, USER);
        {
            let stiota_coin2 = test_scenario::take_from_sender<StakedIOTA>(&scenario);
            
            // Should receive 2 stIOTA
            assert!(simple_staking::get_amount(&stiota_coin2) == 2000000000, 1);
            
            test_scenario::return_to_sender(&scenario, stiota_coin2);
        };
        
        test_scenario::end(scenario);
    }
}