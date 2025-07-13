module blitz::launchpad {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use iota::coin::{Self, Coin, TreasuryCap};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::url::{Self, Url};
    use iota::table::{Self, Table};
    use iota::clock::{Self, Clock};
    use iota::math;

    // Error codes
    const E_INSUFFICIENT_PAYMENT: u64 = 1;
    const E_INVALID_SYMBOL: u64 = 2;
    const E_INVALID_SUPPLY: u64 = 3;
    const E_NOT_AUTHORIZED: u64 = 4;
    const E_BONDING_CURVE_NOT_COMPLETE: u64 = 5;
    const E_BONDING_CURVE_COMPLETE: u64 = 6;
    const E_INSUFFICIENT_BALANCE: u64 = 7;
    const E_ZERO_AMOUNT: u64 = 8;
    const E_SLIPPAGE_EXCEEDED: u64 = 9;

    // Constants
    const CREATION_FEE: u64 = 2_000_000_000; // 2 IOTA
    const BONDING_CURVE_TARGET: u64 = 4_000_000_000_000; // 4,000 IOTA
    const INITIAL_VIRTUAL_LIQUIDITY: u64 = 30_000_000_000; // 30 IOTA virtual liquidity
    const DEV_ALLOCATION_PERCENT: u64 = 5; // 5% to creator
    const LIQUIDITY_ALLOCATION_PERCENT: u64 = 85; // 85% for bonding curve
    const PLATFORM_FEE_PERCENT: u64 = 2; // 2% platform fee on trades

    // Shared platform registry
    public struct PlatformRegistry has key {
        id: UID,
        treasury: Balance<iota::iota::IOTA>,
        tokens: Table<String, ID>,
        total_tokens_created: u64,
        total_volume: u64,
    }

    // Token info stored in registry
    public struct TokenInfo has key, store {
        id: UID,
        symbol: String,
        name: String,
        description: String,
        image_url: Option<Url>,
        creator: address,
        created_at: u64,
        treasury_cap_id: ID,
        bonding_curve_id: ID,
    }

    // Bonding curve for each token
    public struct BondingCurve<phantom T> has key {
        id: UID,
        symbol: String,
        creator: address,
        reserve_iota: Balance<iota::iota::IOTA>,
        reserve_token: Balance<T>,
        virtual_iota_reserve: u64,
        virtual_token_reserve: u64,
        total_supply: u64,
        tokens_sold: u64,
        is_graduated: bool,
        lp_tokens_locked: Option<ID>, // LP tokens locked when graduated
    }

    // Events
    public struct TokenCreated has copy, drop {
        token_id: ID,
        symbol: String,
        name: String,
        creator: address,
        total_supply: u64,
        timestamp: u64,
    }

    public struct TokenPurchased has copy, drop {
        token_id: ID,
        buyer: address,
        iota_amount: u64,
        token_amount: u64,
        timestamp: u64,
    }

    public struct TokenSold has copy, drop {
        token_id: ID,
        seller: address,
        token_amount: u64,
        iota_amount: u64,
        timestamp: u64,
    }

    public struct BondingCurveGraduated has copy, drop {
        token_id: ID,
        symbol: String,
        total_raised: u64,
        timestamp: u64,
    }

    // Initialize the platform
    fun init(ctx: &mut TxContext) {
        let registry = PlatformRegistry {
            id: object::new(ctx),
            treasury: balance::zero(),
            tokens: table::new(ctx),
            total_tokens_created: 0,
            total_volume: 0,
        };
        transfer::share_object(registry);
    }

    // Create a new meme token
    public entry fun create_token<T>(
        registry: &mut PlatformRegistry,
        payment: Coin<iota::iota::IOTA>,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        decimals: u8,
        total_supply: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Verify payment
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= CREATION_FEE, E_INSUFFICIENT_PAYMENT);
        
        // Add to treasury
        balance::join(&mut registry.treasury, coin::into_balance(payment));
        
        // Validate inputs
        let symbol_str = string::utf8(symbol);
        assert!(string::length(&symbol_str) >= 3 && string::length(&symbol_str) <= 10, E_INVALID_SYMBOL);
        assert!(total_supply > 0 && total_supply <= 1_000_000_000_000_000_000, E_INVALID_SUPPLY);
        
        // Create treasury cap for the new token
        let (treasury_cap, metadata) = coin::create_currency<T>(
            witness_placeholder<T>(),
            decimals,
            symbol,
            name,
            description,
            option::some(url::new_unsafe_from_bytes(image_url)),
            ctx
        );
        
        // Calculate allocations
        let dev_allocation = (total_supply * DEV_ALLOCATION_PERCENT) / 100;
        let liquidity_allocation = (total_supply * LIQUIDITY_ALLOCATION_PERCENT) / 100;
        
        // Mint initial supply
        let minted_coins = coin::mint(&mut treasury_cap, total_supply, ctx);
        
        // Split allocations
        let dev_coins = coin::split(&mut minted_coins, dev_allocation, ctx);
        let liquidity_coins = coin::into_balance(minted_coins);
        
        // Create token info
        let token_info = TokenInfo {
            id: object::new(ctx),
            symbol: symbol_str,
            name: string::utf8(name),
            description: string::utf8(description),
            image_url: if (vector::is_empty(&image_url)) {
                option::none()
            } else {
                option::some(url::new_unsafe_from_bytes(image_url))
            },
            creator: tx_context::sender(ctx),
            created_at: clock::timestamp_ms(clock),
            treasury_cap_id: object::id(&treasury_cap),
            bonding_curve_id: object::id_from_address(@0x0), // Will be updated
        };
        
        let token_id = object::id(&token_info);
        
        // Create bonding curve
        let bonding_curve = BondingCurve<T> {
            id: object::new(ctx),
            symbol: symbol_str,
            creator: tx_context::sender(ctx),
            reserve_iota: balance::zero(),
            reserve_token: liquidity_coins,
            virtual_iota_reserve: INITIAL_VIRTUAL_LIQUIDITY,
            virtual_token_reserve: liquidity_allocation,
            total_supply: liquidity_allocation,
            tokens_sold: 0,
            is_graduated: false,
            lp_tokens_locked: option::none(),
        };
        
        // Update token info with bonding curve ID
        token_info.bonding_curve_id = object::id(&bonding_curve);
        
        // Store in registry
        table::add(&mut registry.tokens, symbol_str, token_id);
        registry.total_tokens_created = registry.total_tokens_created + 1;
        
        // Emit event
        event::emit(TokenCreated {
            token_id,
            symbol: symbol_str,
            name: string::utf8(name),
            creator: tx_context::sender(ctx),
            total_supply,
            timestamp: clock::timestamp_ms(clock),
        });
        
        // Transfer ownership
        transfer::public_transfer(dev_coins, tx_context::sender(ctx));
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        transfer::public_share_object(metadata);
        transfer::share_object(token_info);
        transfer::share_object(bonding_curve);
    }

    // Buy tokens from bonding curve
    public entry fun buy_token<T>(
        bonding_curve: &mut BondingCurve<T>,
        registry: &mut PlatformRegistry,
        payment: Coin<iota::iota::IOTA>,
        min_tokens_out: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!bonding_curve.is_graduated, E_BONDING_CURVE_COMPLETE);
        
        let payment_amount = coin::value(&payment);
        assert!(payment_amount > 0, E_ZERO_AMOUNT);
        
        // Calculate platform fee
        let platform_fee = (payment_amount * PLATFORM_FEE_PERCENT) / 100;
        let amount_after_fee = payment_amount - platform_fee;
        
        // Calculate output using constant product formula
        let tokens_out = calculate_tokens_out(
            amount_after_fee,
            bonding_curve.virtual_iota_reserve + balance::value(&bonding_curve.reserve_iota),
            bonding_curve.virtual_token_reserve + balance::value(&bonding_curve.reserve_token)
        );
        
        assert!(tokens_out >= min_tokens_out, E_SLIPPAGE_EXCEEDED);
        assert!(tokens_out <= balance::value(&bonding_curve.reserve_token), E_INSUFFICIENT_BALANCE);
        
        // Update reserves
        let payment_balance = coin::into_balance(payment);
        let platform_fee_balance = balance::split(&mut payment_balance, platform_fee);
        balance::join(&mut registry.treasury, platform_fee_balance);
        balance::join(&mut bonding_curve.reserve_iota, payment_balance);
        
        // Transfer tokens to buyer
        let tokens = coin::take(&mut bonding_curve.reserve_token, tokens_out, ctx);
        transfer::public_transfer(tokens, tx_context::sender(ctx));
        
        // Update stats
        bonding_curve.tokens_sold = bonding_curve.tokens_sold + tokens_out;
        registry.total_volume = registry.total_volume + payment_amount;
        
        // Check if graduated
        if (balance::value(&bonding_curve.reserve_iota) >= BONDING_CURVE_TARGET) {
            graduate_bonding_curve(bonding_curve, clock, ctx);
        }
        
        // Emit event
        event::emit(TokenPurchased {
            token_id: object::id(bonding_curve),
            buyer: tx_context::sender(ctx),
            iota_amount: payment_amount,
            token_amount: tokens_out,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // Sell tokens back to bonding curve
    public entry fun sell_token<T>(
        bonding_curve: &mut BondingCurve<T>,
        registry: &mut PlatformRegistry,
        tokens: Coin<T>,
        min_iota_out: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!bonding_curve.is_graduated, E_BONDING_CURVE_COMPLETE);
        
        let token_amount = coin::value(&tokens);
        assert!(token_amount > 0, E_ZERO_AMOUNT);
        
        // Calculate output using constant product formula
        let iota_out = calculate_iota_out(
            token_amount,
            bonding_curve.virtual_iota_reserve + balance::value(&bonding_curve.reserve_iota),
            bonding_curve.virtual_token_reserve + balance::value(&bonding_curve.reserve_token)
        );
        
        // Apply platform fee
        let platform_fee = (iota_out * PLATFORM_FEE_PERCENT) / 100;
        let iota_after_fee = iota_out - platform_fee;
        
        assert!(iota_after_fee >= min_iota_out, E_SLIPPAGE_EXCEEDED);
        assert!(iota_out <= balance::value(&bonding_curve.reserve_iota), E_INSUFFICIENT_BALANCE);
        
        // Update reserves
        balance::join(&mut bonding_curve.reserve_token, coin::into_balance(tokens));
        
        // Transfer IOTA to seller
        let iota_payment = coin::take(&mut bonding_curve.reserve_iota, iota_out, ctx);
        let platform_fee_coin = coin::split(&mut iota_payment, platform_fee, ctx);
        balance::join(&mut registry.treasury, coin::into_balance(platform_fee_coin));
        transfer::public_transfer(iota_payment, tx_context::sender(ctx));
        
        // Update stats
        bonding_curve.tokens_sold = bonding_curve.tokens_sold - token_amount;
        registry.total_volume = registry.total_volume + iota_out;
        
        // Emit event
        event::emit(TokenSold {
            token_id: object::id(bonding_curve),
            seller: tx_context::sender(ctx),
            token_amount,
            iota_amount: iota_after_fee,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // Graduate bonding curve and add liquidity to DEX
    fun graduate_bonding_curve<T>(
        bonding_curve: &mut BondingCurve<T>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        bonding_curve.is_graduated = true;
        
        // In a real implementation, this would:
        // 1. Take all IOTA and remaining tokens
        // 2. Add them as liquidity to the main DEX
        // 3. Lock the LP tokens
        // 4. Allow trading on the main DEX
        
        event::emit(BondingCurveGraduated {
            token_id: object::id(bonding_curve),
            symbol: bonding_curve.symbol,
            total_raised: balance::value(&bonding_curve.reserve_iota),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // Helper functions
    fun calculate_tokens_out(iota_in: u64, iota_reserve: u64, token_reserve: u64): u64 {
        // xy = k formula
        // tokens_out = (iota_in * token_reserve) / (iota_reserve + iota_in)
        let numerator = (iota_in as u128) * (token_reserve as u128);
        let denominator = (iota_reserve as u128) + (iota_in as u128);
        ((numerator / denominator) as u64)
    }

    fun calculate_iota_out(tokens_in: u64, iota_reserve: u64, token_reserve: u64): u64 {
        // xy = k formula
        // iota_out = (tokens_in * iota_reserve) / (token_reserve + tokens_in)
        let numerator = (tokens_in as u128) * (iota_reserve as u128);
        let denominator = (token_reserve as u128) + (tokens_in as u128);
        ((numerator / denominator) as u64)
    }

    // Placeholder for witness pattern
    fun witness_placeholder<T>(): T {
        abort 0
    }

    // View functions
    public fun get_token_price<T>(bonding_curve: &BondingCurve<T>): u64 {
        let iota_reserve = bonding_curve.virtual_iota_reserve + balance::value(&bonding_curve.reserve_iota);
        let token_reserve = bonding_curve.virtual_token_reserve + balance::value(&bonding_curve.reserve_token);
        
        // Price = iota_reserve / token_reserve (in smallest units)
        (iota_reserve * 1_000_000_000) / token_reserve
    }

    public fun get_market_cap<T>(bonding_curve: &BondingCurve<T>): u64 {
        let price = get_token_price(bonding_curve);
        (bonding_curve.total_supply * price) / 1_000_000_000
    }

    public fun get_progress<T>(bonding_curve: &BondingCurve<T>): u64 {
        let current = balance::value(&bonding_curve.reserve_iota);
        (current * 100) / BONDING_CURVE_TARGET
    }
}