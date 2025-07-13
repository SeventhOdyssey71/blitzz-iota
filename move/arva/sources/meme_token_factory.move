module blitz::meme_token_factory {
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use iota::coin::{Self, Coin, TreasuryCap, CoinMetadata};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::url::{Self, Url};
    use iota::table::{Self, Table};
    use iota::clock::{Self, Clock};
    use iota::dynamic_object_field as dof;
    use iota::dynamic_field as df;

    // Import our DEX for liquidity provision
    use blitz::simple_dex;

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
    const E_TOKEN_EXISTS: u64 = 10;

    // Constants
    const CREATION_FEE: u64 = 2_000_000_000; // 2 IOTA
    const BONDING_CURVE_TARGET: u64 = 4_000_000_000_000; // 4,000 IOTA
    const INITIAL_VIRTUAL_LIQUIDITY: u64 = 30_000_000_000; // 30 IOTA virtual liquidity
    const DEV_ALLOCATION_PERCENT: u64 = 5; // 5% to creator
    const BONDING_CURVE_ALLOCATION_PERCENT: u64 = 85; // 85% for bonding curve
    const PLATFORM_FEE_PERCENT: u64 = 2; // 2% platform fee on trades

    // One-time witness for creating the platform
    public struct MEME_TOKEN_FACTORY has drop {}

    // Platform singleton
    public struct Platform has key {
        id: UID,
        treasury: Balance<iota::iota::IOTA>,
        total_tokens_created: u64,
        total_volume: u64,
        admin: address,
    }

    // Generic bonding curve that can hold any token type
    public struct BondingCurve has key {
        id: UID,
        symbol: String,
        name: String,
        description: String,
        image_url: Option<Url>,
        creator: address,
        reserve_iota: Balance<iota::iota::IOTA>,
        virtual_iota_reserve: u64,
        virtual_token_reserve: u64,
        total_supply: u64,
        tokens_sold: u64,
        is_graduated: bool,
        created_at: u64,
        metadata_id: ID,
        // Dynamic fields will store:
        // - "treasury_cap": TreasuryCap<T>
        // - "reserve_tokens": Balance<T>
    }

    // Events
    public struct TokenCreated has copy, drop {
        curve_id: ID,
        symbol: String,
        name: String,
        creator: address,
        total_supply: u64,
        dev_allocation: u64,
        bonding_curve_allocation: u64,
        timestamp: u64,
    }

    public struct TokenPurchased has copy, drop {
        curve_id: ID,
        buyer: address,
        iota_amount: u64,
        token_amount: u64,
        new_price: u64,
        timestamp: u64,
    }

    public struct TokenSold has copy, drop {
        curve_id: ID,
        seller: address,
        token_amount: u64,
        iota_amount: u64,
        new_price: u64,
        timestamp: u64,
    }

    public struct BondingCurveGraduated has copy, drop {
        curve_id: ID,
        symbol: String,
        total_raised: u64,
        final_price: u64,
        timestamp: u64,
    }

    // Initialize the platform
    fun init(witness: MEME_TOKEN_FACTORY, ctx: &mut TxContext) {
        let platform = Platform {
            id: object::new(ctx),
            treasury: balance::zero(),
            total_tokens_created: 0,
            total_volume: 0,
            admin: tx_context::sender(ctx),
        };
        transfer::share_object(platform);
    }

    // Create a new meme token with its own type
    public fun create_token<T: drop>(
        witness: T,
        platform: &mut Platform,
        payment: Coin<iota::iota::IOTA>,
        symbol: vector<u8>,
        name: vector<u8>,
        description: vector<u8>,
        image_url: vector<u8>,
        decimals: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ): ID {
        // Verify payment
        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= CREATION_FEE, E_INSUFFICIENT_PAYMENT);
        
        // Add fee to treasury
        balance::join(&mut platform.treasury, coin::into_balance(payment));
        
        // Validate inputs
        let symbol_str = string::utf8(symbol);
        let name_str = string::utf8(name);
        assert!(string::length(&symbol_str) >= 2 && string::length(&symbol_str) <= 10, E_INVALID_SYMBOL);
        
        // Calculate total supply (1 billion tokens with decimals)
        let total_supply = 1_000_000_000 * iota::math::pow(10, decimals);
        
        // Create the token
        let (treasury_cap, metadata) = coin::create_currency<T>(
            witness,
            decimals,
            symbol,
            name,
            description,
            option::some(url::new_unsafe_from_bytes(image_url)),
            ctx
        );
        
        let metadata_id = object::id(&metadata);
        
        // Calculate allocations
        let dev_allocation = (total_supply * DEV_ALLOCATION_PERCENT) / 100;
        let bonding_curve_allocation = (total_supply * BONDING_CURVE_ALLOCATION_PERCENT) / 100;
        
        // Mint tokens
        let dev_coins = coin::mint(&mut treasury_cap, dev_allocation, ctx);
        let bonding_curve_balance = balance::create_from_coin(
            coin::mint(&mut treasury_cap, bonding_curve_allocation, ctx)
        );
        
        // Create bonding curve
        let bonding_curve = BondingCurve {
            id: object::new(ctx),
            symbol: symbol_str,
            name: name_str,
            description: string::utf8(description),
            image_url: if (vector::is_empty(&image_url)) {
                option::none()
            } else {
                option::some(url::new_unsafe_from_bytes(image_url))
            },
            creator: tx_context::sender(ctx),
            reserve_iota: balance::zero(),
            virtual_iota_reserve: INITIAL_VIRTUAL_LIQUIDITY,
            virtual_token_reserve: bonding_curve_allocation,
            total_supply: bonding_curve_allocation,
            tokens_sold: 0,
            is_graduated: false,
            created_at: clock::timestamp_ms(clock),
            metadata_id,
        };
        
        let curve_id = object::id(&bonding_curve);
        
        // Store treasury cap and token reserve in dynamic fields
        dof::add(&mut bonding_curve.id, b"treasury_cap", treasury_cap);
        df::add(&mut bonding_curve.id, b"reserve_tokens", bonding_curve_balance);
        
        // Update platform stats
        platform.total_tokens_created = platform.total_tokens_created + 1;
        
        // Emit event
        event::emit(TokenCreated {
            curve_id,
            symbol: symbol_str,
            name: name_str,
            creator: tx_context::sender(ctx),
            total_supply,
            dev_allocation,
            bonding_curve_allocation,
            timestamp: clock::timestamp_ms(clock),
        });
        
        // Transfer dev allocation to creator
        transfer::public_transfer(dev_coins, tx_context::sender(ctx));
        
        // Make metadata public
        transfer::public_share_object(metadata);
        
        // Share bonding curve
        transfer::share_object(bonding_curve);
        
        curve_id
    }

    // Buy tokens from bonding curve
    public fun buy<T>(
        bonding_curve: &mut BondingCurve,
        platform: &mut Platform,
        payment: Coin<iota::iota::IOTA>,
        min_tokens_out: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<T> {
        assert!(!bonding_curve.is_graduated, E_BONDING_CURVE_COMPLETE);
        
        let payment_amount = coin::value(&payment);
        assert!(payment_amount > 0, E_ZERO_AMOUNT);
        
        // Calculate platform fee
        let platform_fee = (payment_amount * PLATFORM_FEE_PERCENT) / 100;
        let amount_after_fee = payment_amount - platform_fee;
        
        // Get current reserves
        let token_reserve_ref = df::borrow<vector<u8>, Balance<T>>(&bonding_curve.id, b"reserve_tokens");
        let current_token_reserve = balance::value(token_reserve_ref);
        
        // Calculate tokens out using constant product formula
        let tokens_out = calculate_tokens_out(
            amount_after_fee,
            bonding_curve.virtual_iota_reserve + balance::value(&bonding_curve.reserve_iota),
            bonding_curve.virtual_token_reserve + current_token_reserve
        );
        
        assert!(tokens_out >= min_tokens_out, E_SLIPPAGE_EXCEEDED);
        assert!(tokens_out <= current_token_reserve, E_INSUFFICIENT_BALANCE);
        
        // Split platform fee
        let payment_balance = coin::into_balance(payment);
        let platform_fee_balance = balance::split(&mut payment_balance, platform_fee);
        balance::join(&mut platform.treasury, platform_fee_balance);
        
        // Update IOTA reserve
        balance::join(&mut bonding_curve.reserve_iota, payment_balance);
        
        // Take tokens from reserve
        let token_reserve = df::borrow_mut<vector<u8>, Balance<T>>(&mut bonding_curve.id, b"reserve_tokens");
        let token_balance = balance::split(token_reserve, tokens_out);
        let tokens = coin::from_balance(token_balance, ctx);
        
        // Update stats
        bonding_curve.tokens_sold = bonding_curve.tokens_sold + tokens_out;
        platform.total_volume = platform.total_volume + payment_amount;
        
        // Calculate new price for event
        let new_price = calculate_current_price(
            bonding_curve.virtual_iota_reserve + balance::value(&bonding_curve.reserve_iota),
            bonding_curve.virtual_token_reserve + balance::value(token_reserve)
        );
        
        // Check if graduated (4,000 IOTA raised)
        if (balance::value(&bonding_curve.reserve_iota) >= BONDING_CURVE_TARGET) {
            graduate_bonding_curve<T>(bonding_curve, platform, clock, ctx);
        }
        
        // Emit event
        event::emit(TokenPurchased {
            curve_id: object::id(bonding_curve),
            buyer: tx_context::sender(ctx),
            iota_amount: payment_amount,
            token_amount: tokens_out,
            new_price,
            timestamp: clock::timestamp_ms(clock),
        });
        
        tokens
    }

    // Sell tokens back to bonding curve
    public fun sell<T>(
        bonding_curve: &mut BondingCurve,
        platform: &mut Platform,
        tokens: Coin<T>,
        min_iota_out: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ): Coin<iota::iota::IOTA> {
        assert!(!bonding_curve.is_graduated, E_BONDING_CURVE_COMPLETE);
        
        let token_amount = coin::value(&tokens);
        assert!(token_amount > 0, E_ZERO_AMOUNT);
        
        // Get current reserves
        let token_reserve_ref = df::borrow<vector<u8>, Balance<T>>(&bonding_curve.id, b"reserve_tokens");
        let current_token_reserve = balance::value(token_reserve_ref);
        
        // Calculate IOTA out using constant product formula
        let iota_out = calculate_iota_out(
            token_amount,
            bonding_curve.virtual_iota_reserve + balance::value(&bonding_curve.reserve_iota),
            bonding_curve.virtual_token_reserve + current_token_reserve
        );
        
        // Apply platform fee
        let platform_fee = (iota_out * PLATFORM_FEE_PERCENT) / 100;
        let iota_after_fee = iota_out - platform_fee;
        
        assert!(iota_after_fee >= min_iota_out, E_SLIPPAGE_EXCEEDED);
        assert!(iota_out <= balance::value(&bonding_curve.reserve_iota), E_INSUFFICIENT_BALANCE);
        
        // Add tokens back to reserve
        let token_reserve = df::borrow_mut<vector<u8>, Balance<T>>(&mut bonding_curve.id, b"reserve_tokens");
        balance::join(token_reserve, coin::into_balance(tokens));
        
        // Take IOTA from reserve
        let iota_balance = balance::split(&mut bonding_curve.reserve_iota, iota_out);
        let platform_fee_balance = balance::split(&mut iota_balance, platform_fee);
        balance::join(&mut platform.treasury, platform_fee_balance);
        
        let iota_payment = coin::from_balance(iota_balance, ctx);
        
        // Update stats
        bonding_curve.tokens_sold = bonding_curve.tokens_sold - token_amount;
        platform.total_volume = platform.total_volume + iota_out;
        
        // Calculate new price for event
        let new_price = calculate_current_price(
            bonding_curve.virtual_iota_reserve + balance::value(&bonding_curve.reserve_iota),
            bonding_curve.virtual_token_reserve + balance::value(token_reserve)
        );
        
        // Emit event
        event::emit(TokenSold {
            curve_id: object::id(bonding_curve),
            seller: tx_context::sender(ctx),
            token_amount,
            iota_amount: iota_after_fee,
            new_price,
            timestamp: clock::timestamp_ms(clock),
        });
        
        iota_payment
    }

    // Graduate bonding curve and create DEX pool
    fun graduate_bonding_curve<T>(
        bonding_curve: &mut BondingCurve,
        platform: &mut Platform,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        bonding_curve.is_graduated = true;
        
        // Get final price
        let token_reserve_ref = df::borrow<vector<u8>, Balance<T>>(&bonding_curve.id, b"reserve_tokens");
        let final_price = calculate_current_price(
            bonding_curve.virtual_iota_reserve + balance::value(&bonding_curve.reserve_iota),
            bonding_curve.virtual_token_reserve + balance::value(token_reserve_ref)
        );
        
        // Take all IOTA and tokens
        let iota_balance = balance::withdraw_all(&mut bonding_curve.reserve_iota);
        let token_reserve = df::borrow_mut<vector<u8>, Balance<T>>(&mut bonding_curve.id, b"reserve_tokens");
        let token_balance = balance::withdraw_all(token_reserve);
        
        // Convert to coins for DEX
        let iota_coin = coin::from_balance(iota_balance, ctx);
        let token_coin = coin::from_balance(token_balance, ctx);
        
        // Create liquidity pool on main DEX
        simple_dex::create_pool(iota_coin, token_coin, ctx);
        
        // Emit graduation event
        event::emit(BondingCurveGraduated {
            curve_id: object::id(bonding_curve),
            symbol: bonding_curve.symbol,
            total_raised: BONDING_CURVE_TARGET,
            final_price,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    // Calculation helpers
    fun calculate_tokens_out(iota_in: u64, iota_reserve: u64, token_reserve: u64): u64 {
        // Constant product formula: xy = k
        // tokens_out = (iota_in * token_reserve) / (iota_reserve + iota_in)
        let numerator = (iota_in as u128) * (token_reserve as u128);
        let denominator = (iota_reserve as u128) + (iota_in as u128);
        ((numerator / denominator) as u64)
    }

    fun calculate_iota_out(tokens_in: u64, iota_reserve: u64, token_reserve: u64): u64 {
        // Constant product formula: xy = k
        // iota_out = (tokens_in * iota_reserve) / (token_reserve + tokens_in)
        let numerator = (tokens_in as u128) * (iota_reserve as u128);
        let denominator = (token_reserve as u128) + (tokens_in as u128);
        ((numerator / denominator) as u64)
    }

    fun calculate_current_price(iota_reserve: u64, token_reserve: u64): u64 {
        // Price = iota_reserve / token_reserve (scaled by 1e9 for precision)
        ((iota_reserve as u128) * 1_000_000_000 / (token_reserve as u128)) as u64
    }

    // View functions
    public fun get_curve_info(bonding_curve: &BondingCurve): (
        String, // symbol
        String, // name
        u64,    // tokens_sold
        u64,    // total_supply
        bool,   // is_graduated
        u64,    // iota_reserve
        u64     // progress_percent
    ) {
        let progress = (balance::value(&bonding_curve.reserve_iota) * 100) / BONDING_CURVE_TARGET;
        (
            bonding_curve.symbol,
            bonding_curve.name,
            bonding_curve.tokens_sold,
            bonding_curve.total_supply,
            bonding_curve.is_graduated,
            balance::value(&bonding_curve.reserve_iota),
            progress
        )
    }

    public fun get_price<T>(bonding_curve: &BondingCurve): u64 {
        let token_reserve_ref = df::borrow<vector<u8>, Balance<T>>(&bonding_curve.id, b"reserve_tokens");
        calculate_current_price(
            bonding_curve.virtual_iota_reserve + balance::value(&bonding_curve.reserve_iota),
            bonding_curve.virtual_token_reserve + balance::value(token_reserve_ref)
        )
    }

    public fun get_market_cap<T>(bonding_curve: &BondingCurve): u64 {
        let price = get_price<T>(bonding_curve);
        (bonding_curve.total_supply * price) / 1_000_000_000
    }

    // Admin functions
    public entry fun withdraw_fees(
        platform: &mut Platform,
        amount: u64,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == platform.admin, E_NOT_AUTHORIZED);
        assert!(amount <= balance::value(&platform.treasury), E_INSUFFICIENT_BALANCE);
        
        let withdrawal = coin::take(&mut platform.treasury, amount, ctx);
        transfer::public_transfer(withdrawal, platform.admin);
    }

    public entry fun update_admin(
        platform: &mut Platform,
        new_admin: address,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == platform.admin, E_NOT_AUTHORIZED);
        platform.admin = new_admin;
    }
}