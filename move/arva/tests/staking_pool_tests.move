#[test_only]
module Blitz::staking_pool_tests {
    use iota::test_scenario::{Self, Scenario};
    use iota::coin::{Self, Coin};
    use iota::iota::IOTA;
    use Blitz::simple_staking::{Self, StakingPool, StakedIOTA};

    const ADMIN: address = @0xAD;
    const USER1: address = @0x1;
    const USER2: address = @0x2;

    // Helper function to create test IOTA coins
    fun mint_iota(amount: u64, scenario: &mut Scenario): Coin<IOTA> {
        coin::mint_for_testing<IOTA>(amount, test_scenario::ctx(scenario))
    }

    #[test]
    fun test_init_staking_pool() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize the staking pool
        {
            simple_staking::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        
        // Check that pool was created
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            
            // Verify initial state
            assert!(simple_staking::get_exchange_rate(&pool) == 1_000_000_000, 0);
            assert!(simple_staking::get_total_staked(&pool) == 0, 1);
            
            test_scenario::return_shared(pool);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_stake_iota() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize the staking pool
        {
            simple_staking::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        
        // Stake some IOTA
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut pool = test_scenario::take_shared<StakingPool>(&scenario);
            let iota_coin = mint_iota(10_000_000_000, &mut scenario); // 10 IOTA
            
            simple_staking::stake(&mut pool, iota_coin, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
        };
        
        // Check user received stIOTA
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let stiota = test_scenario::take_from_sender<StakedIOTA>(&scenario);
            
            // Should receive 10 stIOTA at 1:1 rate
            assert!(simple_staking::get_amount(&stiota) == 10_000_000_000, 0);
            
            test_scenario::return_to_sender(&scenario, stiota);
        };
        
        // Check pool state
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            
            assert!(simple_staking::get_total_staked(&pool) == 10_000_000_000, 1);
            
            test_scenario::return_shared(pool);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_multiple_users_stake() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize the staking pool
        {
            simple_staking::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        
        // User 1 stakes
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let mut pool = test_scenario::take_shared<StakingPool>(&scenario);
            let iota_coin = mint_iota(10_000_000_000, &mut scenario);
            
            simple_staking::stake(&mut pool, iota_coin, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
        };
        
        // User 2 stakes
        test_scenario::next_tx(&mut scenario, USER2);
        {
            let mut pool = test_scenario::take_shared<StakingPool>(&scenario);
            let iota_coin = mint_iota(20_000_000_000, &mut scenario);
            
            simple_staking::stake(&mut pool, iota_coin, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
        };
        
        // Check final pool state
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            
            assert!(simple_staking::get_total_staked(&pool) == 30_000_000_000, 0);
            
            test_scenario::return_shared(pool);
        };
        
        test_scenario::end(scenario);
    }
}