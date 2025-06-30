#[test_only]
module Blitz::staking_pool_tests {
    use iota::test_scenario::{Self, Scenario};
    use iota::coin::{Self, Coin};
    use iota::clock::{Self, Clock};
    use iota::iota::IOTA;
    use iota::test_utils;
    use Blitz::staking_pool::{Self, StakingPool, StakedIOTA, UnstakeRequest};

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
            staking_pool::init(test_scenario::ctx(&mut scenario));
        };
        
        // Check that pool was created
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            
            // Verify initial state
            assert!(staking_pool::get_exchange_rate(&pool) == 1_000_000_000, 0);
            assert!(staking_pool::get_total_staked(&pool) == 0, 1);
            assert!(staking_pool::get_total_stiota_supply(&pool) == 0, 2);
            
            test_scenario::return_shared(pool);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_stake_iota() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize pool
        {
            staking_pool::init(test_scenario::ctx(&mut scenario));
        };
        
        // Create clock
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            clock::share_for_testing(clock);
        };
        
        // User stakes IOTA
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let iota_coin = mint_iota(10_000_000_000, &mut scenario); // 10 IOTA
            
            staking_pool::stake(&mut pool, iota_coin, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
        };
        
        // Check stIOTA received
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let stiota = test_scenario::take_from_sender<StakedIOTA>(&scenario);
            
            // With 0.1% fee, user should receive 9.99 IOTA worth of stIOTA
            // At 1:1 rate, that's 9_990_000_000 stIOTA
            assert!(staking_pool::get_stiota_amount(&stiota) == 9_990_000_000, 0);
            
            test_scenario::return_to_sender(&scenario, stiota);
        };
        
        // Check pool state
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            
            assert!(staking_pool::get_total_staked(&pool) == 10_000_000_000, 1);
            assert!(staking_pool::get_total_stiota_supply(&pool) == 9_990_000_000, 2);
            
            test_scenario::return_shared(pool);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_unstake_and_claim() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize pool
        {
            staking_pool::init(test_scenario::ctx(&mut scenario));
        };
        
        // Create clock
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            clock::share_for_testing(clock);
        };
        
        // User stakes IOTA
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let iota_coin = mint_iota(10_000_000_000, &mut scenario);
            
            staking_pool::stake(&mut pool, iota_coin, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
        };
        
        // User unstakes stIOTA
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let stiota = test_scenario::take_from_sender<StakedIOTA>(&scenario);
            
            staking_pool::unstake(&mut pool, stiota, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
        };
        
        // Fast forward time past cooldown period
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let mut clock = test_scenario::take_shared<Clock>(&scenario);
            clock::increment_for_testing(&mut clock, 259_200_001); // 3 days + 1ms
            test_scenario::return_shared(clock);
        };
        
        // User claims IOTA
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let request = test_scenario::take_shared<UnstakeRequest>(&scenario);
            
            staking_pool::claim_unstaked(&mut pool, &mut request, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
            test_scenario::return_shared(request);
        };
        
        // Check user received IOTA back (minus fees)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let iota_coin = test_scenario::take_from_sender<Coin<IOTA>>(&scenario);
            
            // Original: 10 IOTA
            // Stake fee: 0.1% = 0.01 IOTA
            // Unstake fee: 0.1% = 0.00999 IOTA (on 9.99 IOTA)
            // Expected: ~9.98 IOTA
            assert!(coin::value(&iota_coin) == 9_980_010_000, 0);
            
            test_scenario::return_to_sender(&scenario, iota_coin);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    fun test_rewards_distribution() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize pool
        {
            staking_pool::init(test_scenario::ctx(&mut scenario));
        };
        
        // Create clock
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            clock::share_for_testing(clock);
        };
        
        // Two users stake IOTA
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let iota_coin = mint_iota(10_000_000_000, &mut scenario);
            
            staking_pool::stake(&mut pool, iota_coin, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
        };
        
        test_scenario::next_tx(&mut scenario, USER2);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let iota_coin = mint_iota(10_000_000_000, &mut scenario);
            
            staking_pool::stake(&mut pool, iota_coin, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
        };
        
        // Add rewards to pool
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let rewards = mint_iota(2_000_000_000, &mut scenario); // 2 IOTA rewards
            
            staking_pool::add_rewards(&mut pool, rewards, &clock, test_scenario::ctx(&mut scenario));
            
            // Check new exchange rate
            // Total IOTA: ~20 + 2 = 22 IOTA
            // Total stIOTA: ~19.98 stIOTA
            // Rate should be ~1.1 IOTA per stIOTA
            let new_rate = staking_pool::get_exchange_rate(&pool);
            assert!(new_rate > 1_000_000_000, 0); // Rate increased
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = staking_pool::EInsufficientAmount)]
    fun test_stake_below_minimum() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize pool
        {
            staking_pool::init(test_scenario::ctx(&mut scenario));
        };
        
        // Create clock
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            clock::share_for_testing(clock);
        };
        
        // Try to stake below minimum
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let iota_coin = mint_iota(500_000_000, &mut scenario); // 0.5 IOTA (below minimum)
            
            staking_pool::stake(&mut pool, iota_coin, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
        };
        
        test_scenario::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = staking_pool::ECooldownNotMet)]
    fun test_claim_before_cooldown() {
        let mut scenario = test_scenario::begin(ADMIN);
        
        // Initialize pool
        {
            staking_pool::init(test_scenario::ctx(&mut scenario));
        };
        
        // Create clock
        test_scenario::next_tx(&mut scenario, ADMIN);
        {
            let clock = clock::create_for_testing(test_scenario::ctx(&mut scenario));
            clock::share_for_testing(clock);
        };
        
        // User stakes and unstakes
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let iota_coin = mint_iota(10_000_000_000, &mut scenario);
            
            staking_pool::stake(&mut pool, iota_coin, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
        };
        
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let stiota = test_scenario::take_from_sender<StakedIOTA>(&scenario);
            
            staking_pool::unstake(&mut pool, stiota, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
        };
        
        // Try to claim immediately (should fail)
        test_scenario::next_tx(&mut scenario, USER1);
        {
            let pool = test_scenario::take_shared<StakingPool>(&scenario);
            let clock = test_scenario::take_shared<Clock>(&scenario);
            let request = test_scenario::take_shared<UnstakeRequest>(&scenario);
            
            staking_pool::claim_unstaked(&mut pool, &mut request, &clock, test_scenario::ctx(&mut scenario));
            
            test_scenario::return_shared(pool);
            test_scenario::return_shared(clock);
            test_scenario::return_shared(request);
        };
        
        test_scenario::end(scenario);
    }
}