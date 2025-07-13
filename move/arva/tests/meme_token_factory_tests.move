#[test_only]
module blitz::meme_token_factory_tests {
    use blitz::meme_token_factory::{Self, Platform, BondingCurve, MEME_TOKEN_FACTORY};
    use iota::coin::{Self, Coin};
    use iota::test_scenario::{Self as ts, Scenario};
    use iota::clock::{Self, Clock};
    use iota::test_utils;
    use std::string;

    // Test token witness
    public struct TEST_MEME has drop {}

    const ADMIN: address = @0xAD;
    const ALICE: address = @0xA1;
    const BOB: address = @0xB0B;
    
    const CREATION_FEE: u64 = 2_000_000_000; // 2 IOTA
    const DECIMALS: u8 = 9;

    fun init_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        {
            // Initialize platform
            meme_token_factory::init(MEME_TOKEN_FACTORY {}, ts::ctx(&mut scenario));
            
            // Create clock
            clock::create_for_testing(ts::ctx(&mut scenario));
        };
        scenario
    }

    #[test]
    fun test_platform_initialization() {
        let mut scenario = init_test();
        
        ts::next_tx(&mut scenario, ADMIN);
        {
            let platform = ts::take_shared<Platform>(&scenario);
            
            // Verify initial state
            let (tokens_created, volume, _) = meme_token_factory::get_platform_stats(&platform);
            assert!(tokens_created == 0, 0);
            assert!(volume == 0, 1);
            
            ts::return_shared(platform);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_create_token_success() {
        let mut scenario = init_test();
        
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Create payment
            let payment = coin::mint_for_testing<iota::iota::IOTA>(CREATION_FEE, ts::ctx(&mut scenario));
            
            // Create token
            let curve_id = meme_token_factory::create_token(
                TEST_MEME {},
                &mut platform,
                payment,
                b"TESTMEME",
                b"Test Meme Token",
                b"A test meme token for unit testing",
                b"https://example.com/image.png",
                DECIMALS,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // Verify platform stats updated
            let (tokens_created, _, _) = meme_token_factory::get_platform_stats(&platform);
            assert!(tokens_created == 1, 2);
            
            ts::return_shared(platform);
            ts::return_shared(clock);
        };
        
        // Check dev allocation was transferred
        ts::next_tx(&mut scenario, ALICE);
        {
            let dev_coins = ts::take_from_sender<Coin<TEST_MEME>>(&scenario);
            
            // 5% of 1 billion tokens = 50 million
            let expected_dev_allocation = 50_000_000 * 1_000_000_000; // with 9 decimals
            assert!(coin::value(&dev_coins) == expected_dev_allocation, 3);
            
            ts::return_to_sender(&scenario, dev_coins);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = blitz::meme_token_factory::E_INSUFFICIENT_PAYMENT)]
    fun test_create_token_insufficient_payment() {
        let mut scenario = init_test();
        
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Create insufficient payment
            let payment = coin::mint_for_testing<iota::iota::IOTA>(CREATION_FEE - 1, ts::ctx(&mut scenario));
            
            // This should fail
            meme_token_factory::create_token(
                TEST_MEME {},
                &mut platform,
                payment,
                b"TESTMEME",
                b"Test Meme Token",
                b"A test meme token",
                b"",
                DECIMALS,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(platform);
            ts::return_shared(clock);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_buy_tokens() {
        let mut scenario = init_test();
        
        // First create a token
        ts::next_tx(&mut scenario, ALICE);
        let curve_id = {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let payment = coin::mint_for_testing<iota::iota::IOTA>(CREATION_FEE, ts::ctx(&mut scenario));
            
            let id = meme_token_factory::create_token(
                TEST_MEME {},
                &mut platform,
                payment,
                b"TESTMEME",
                b"Test Meme Token",
                b"A test meme token",
                b"",
                DECIMALS,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(platform);
            ts::return_shared(clock);
            id
        };
        
        // Buy tokens
        ts::next_tx(&mut scenario, BOB);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let mut bonding_curve = ts::take_shared<BondingCurve>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Buy with 100 IOTA
            let buy_amount = 100_000_000_000; // 100 IOTA
            let payment = coin::mint_for_testing<iota::iota::IOTA>(buy_amount, ts::ctx(&mut scenario));
            
            let tokens = meme_token_factory::buy<TEST_MEME>(
                &mut bonding_curve,
                &mut platform,
                payment,
                0, // No slippage protection for test
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // Verify we received tokens
            assert!(coin::value(&tokens) > 0, 4);
            
            // Verify platform volume increased
            let (_, volume, _) = meme_token_factory::get_platform_stats(&platform);
            assert!(volume == buy_amount, 5);
            
            // Verify bonding curve state
            let (_, _, tokens_sold, _, _, iota_reserve, _) = meme_token_factory::get_curve_info(&bonding_curve);
            assert!(tokens_sold == coin::value(&tokens), 6);
            assert!(iota_reserve > 0, 7);
            
            ts::return_to_sender(&scenario, tokens);
            ts::return_shared(platform);
            ts::return_shared(bonding_curve);
            ts::return_shared(clock);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_sell_tokens() {
        let mut scenario = init_test();
        
        // Setup: Create token and buy some
        ts::next_tx(&mut scenario, ALICE);
        let curve_id = {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let payment = coin::mint_for_testing<iota::iota::IOTA>(CREATION_FEE, ts::ctx(&mut scenario));
            
            let id = meme_token_factory::create_token(
                TEST_MEME {},
                &mut platform,
                payment,
                b"TESTMEME",
                b"Test Meme Token",
                b"A test meme token",
                b"",
                DECIMALS,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(platform);
            ts::return_shared(clock);
            id
        };
        
        // Bob buys tokens
        ts::next_tx(&mut scenario, BOB);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let mut bonding_curve = ts::take_shared<BondingCurve>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment = coin::mint_for_testing<iota::iota::IOTA>(100_000_000_000, ts::ctx(&mut scenario));
            let tokens = meme_token_factory::buy<TEST_MEME>(
                &mut bonding_curve,
                &mut platform,
                payment,
                0,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, tokens);
            ts::return_shared(platform);
            ts::return_shared(bonding_curve);
            ts::return_shared(clock);
        };
        
        // Bob sells tokens
        ts::next_tx(&mut scenario, BOB);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let mut bonding_curve = ts::take_shared<BondingCurve>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let tokens = ts::take_from_sender<Coin<TEST_MEME>>(&scenario);
            
            let tokens_to_sell = coin::value(&tokens) / 2;
            let sell_tokens = coin::split(&mut tokens, tokens_to_sell, ts::ctx(&mut scenario));
            
            let iota_received = meme_token_factory::sell<TEST_MEME>(
                &mut bonding_curve,
                &mut platform,
                sell_tokens,
                0, // No slippage protection
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // Verify we received IOTA
            assert!(coin::value(&iota_received) > 0, 8);
            
            // Verify tokens_sold decreased
            let (_, _, tokens_sold, _, _, _, _) = meme_token_factory::get_curve_info(&bonding_curve);
            assert!(tokens_sold < tokens_to_sell * 2, 9); // Less than initial buy
            
            ts::return_to_sender(&scenario, tokens);
            ts::return_to_sender(&scenario, iota_received);
            ts::return_shared(platform);
            ts::return_shared(bonding_curve);
            ts::return_shared(clock);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_bonding_curve_graduation() {
        let mut scenario = init_test();
        
        // Create token
        ts::next_tx(&mut scenario, ALICE);
        let curve_id = {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let payment = coin::mint_for_testing<iota::iota::IOTA>(CREATION_FEE, ts::ctx(&mut scenario));
            
            let id = meme_token_factory::create_token(
                TEST_MEME {},
                &mut platform,
                payment,
                b"TESTMEME",
                b"Test Meme Token",
                b"A test meme token",
                b"",
                DECIMALS,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(platform);
            ts::return_shared(clock);
            id
        };
        
        // Buy enough to trigger graduation (4000 IOTA)
        ts::next_tx(&mut scenario, BOB);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let mut bonding_curve = ts::take_shared<BondingCurve>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            // Buy with 4100 IOTA (enough to trigger graduation after fees)
            let payment = coin::mint_for_testing<iota::iota::IOTA>(4_100_000_000_000, ts::ctx(&mut scenario));
            
            let tokens = meme_token_factory::buy<TEST_MEME>(
                &mut bonding_curve,
                &mut platform,
                payment,
                0,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            // Verify graduation
            let (_, _, _, _, is_graduated, _, progress) = meme_token_factory::get_curve_info(&bonding_curve);
            assert!(is_graduated == true, 10);
            assert!(progress >= 100, 11);
            
            ts::return_to_sender(&scenario, tokens);
            ts::return_shared(platform);
            ts::return_shared(bonding_curve);
            ts::return_shared(clock);
        };
        
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = blitz::meme_token_factory::E_BONDING_CURVE_COMPLETE)]
    fun test_buy_after_graduation_fails() {
        let mut scenario = init_test();
        
        // Setup graduated bonding curve
        ts::next_tx(&mut scenario, ALICE);
        let curve_id = {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let payment = coin::mint_for_testing<iota::iota::IOTA>(CREATION_FEE, ts::ctx(&mut scenario));
            
            let id = meme_token_factory::create_token(
                TEST_MEME {},
                &mut platform,
                payment,
                b"TESTMEME",
                b"Test Meme Token",
                b"A test meme token",
                b"",
                DECIMALS,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(platform);
            ts::return_shared(clock);
            id
        };
        
        // Graduate the curve
        ts::next_tx(&mut scenario, BOB);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let mut bonding_curve = ts::take_shared<BondingCurve>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment = coin::mint_for_testing<iota::iota::IOTA>(4_100_000_000_000, ts::ctx(&mut scenario));
            let tokens = meme_token_factory::buy<TEST_MEME>(
                &mut bonding_curve,
                &mut platform,
                payment,
                0,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, tokens);
            ts::return_shared(platform);
            ts::return_shared(bonding_curve);
            ts::return_shared(clock);
        };
        
        // Try to buy after graduation - should fail
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let mut bonding_curve = ts::take_shared<BondingCurve>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let payment = coin::mint_for_testing<iota::iota::IOTA>(100_000_000_000, ts::ctx(&mut scenario));
            
            // This should fail
            let tokens = meme_token_factory::buy<TEST_MEME>(
                &mut bonding_curve,
                &mut platform,
                payment,
                0,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, tokens);
            ts::return_shared(platform);
            ts::return_shared(bonding_curve);
            ts::return_shared(clock);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_price_calculation() {
        let mut scenario = init_test();
        
        // Create token
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let payment = coin::mint_for_testing<iota::iota::IOTA>(CREATION_FEE, ts::ctx(&mut scenario));
            
            meme_token_factory::create_token(
                TEST_MEME {},
                &mut platform,
                payment,
                b"TESTMEME",
                b"Test Meme Token",
                b"A test meme token",
                b"",
                DECIMALS,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(platform);
            ts::return_shared(clock);
        };
        
        // Check initial price
        ts::next_tx(&mut scenario, BOB);
        {
            let bonding_curve = ts::take_shared<BondingCurve>(&scenario);
            
            let initial_price = meme_token_factory::get_price<TEST_MEME>(&bonding_curve);
            assert!(initial_price > 0, 12);
            
            ts::return_shared(bonding_curve);
        };
        
        // Buy some tokens and check price increased
        ts::next_tx(&mut scenario, BOB);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let mut bonding_curve = ts::take_shared<BondingCurve>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            
            let initial_price = meme_token_factory::get_price<TEST_MEME>(&bonding_curve);
            
            let payment = coin::mint_for_testing<iota::iota::IOTA>(100_000_000_000, ts::ctx(&mut scenario));
            let tokens = meme_token_factory::buy<TEST_MEME>(
                &mut bonding_curve,
                &mut platform,
                payment,
                0,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            let new_price = meme_token_factory::get_price<TEST_MEME>(&bonding_curve);
            assert!(new_price > initial_price, 13);
            
            ts::return_to_sender(&scenario, tokens);
            ts::return_shared(platform);
            ts::return_shared(bonding_curve);
            ts::return_shared(clock);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_admin_functions() {
        let mut scenario = init_test();
        
        // Create token and generate some fees
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            let clock = ts::take_shared<Clock>(&scenario);
            let payment = coin::mint_for_testing<iota::iota::IOTA>(CREATION_FEE, ts::ctx(&mut scenario));
            
            meme_token_factory::create_token(
                TEST_MEME {},
                &mut platform,
                payment,
                b"TESTMEME",
                b"Test Meme Token",
                b"A test meme token",
                b"",
                DECIMALS,
                &clock,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(platform);
            ts::return_shared(clock);
        };
        
        // Admin withdraws fees
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            
            meme_token_factory::withdraw_fees(
                &mut platform,
                CREATION_FEE,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(platform);
        };
        
        // Check admin received fees
        ts::next_tx(&mut scenario, ADMIN);
        {
            let withdrawn = ts::take_from_sender<Coin<iota::iota::IOTA>>(&scenario);
            assert!(coin::value(&withdrawn) == CREATION_FEE, 14);
            ts::return_to_sender(&scenario, withdrawn);
        };
        
        // Update admin
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut platform = ts::take_shared<Platform>(&scenario);
            
            meme_token_factory::update_admin(
                &mut platform,
                ALICE,
                ts::ctx(&mut scenario)
            );
            
            ts::return_shared(platform);
        };
        
        ts::end(scenario);
    }
}