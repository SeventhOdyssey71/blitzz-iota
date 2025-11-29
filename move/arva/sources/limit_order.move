module Blitz::limit_order {
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::clock::{Self, Clock};
    use std::vector;

    const EOrderExpired: u64 = 1;
    const EInvalidPrice: u64 = 2;
    const EUnauthorized: u64 = 3;
    const EInvalidAmount: u64 = 4;
    const EOrderNotFound: u64 = 5;
    const EInvalidExpiry: u64 = 6;
    const EInsufficientBalance: u64 = 7;
    const EOrderBookFull: u64 = 8;
    const EInvalidFeeRate: u64 = 9;

    public struct OrderBook<phantom CoinA, phantom CoinB> has key {
        id: UID,
        buy_orders: vector<LimitOrder<CoinA, CoinB>>,
        sell_orders: vector<LimitOrder<CoinA, CoinB>>,
        fee_rate: u64, // Fee rate in basis points (e.g., 30 = 0.3%)
        collected_fees_a: Balance<CoinA>,
        collected_fees_b: Balance<CoinB>,
        admin: address,
    }

    public struct LimitOrder<phantom CoinA, phantom CoinB> has store {
        id: ID,
        owner: address,
        is_buy: bool,
        price: u64, // Price with 6 decimal precision (1 USDC = 1000000)
        amount: u64,
        filled_amount: u64,
        coin_a_balance: Balance<CoinA>,
        coin_b_balance: Balance<CoinB>,
        expire_at: u64,
        created_at: u64,
    }

    public struct OrderPlacedEvent has copy, drop {
        order_id: ID,
        owner: address,
        is_buy: bool,
        price: u64,
        amount: u64,
        expire_at: u64,
    }

    public struct OrderFilledEvent has copy, drop {
        order_id: ID,
        filled_amount: u64,
        is_partial: bool,
        execution_price: u64,
    }

    public struct OrderCancelledEvent has copy, drop {
        order_id: ID,
        owner: address,
        remaining_amount: u64,
    }

    public struct TradeExecutedEvent has copy, drop {
        buy_order_id: ID,
        sell_order_id: ID,
        amount: u64,
        price: u64,
        buyer: address,
        seller: address,
    }

    public entry fun create_order_book<CoinA, CoinB>(
        fee_rate: u64,
        ctx: &mut TxContext
    ) {
        // Validate fee rate
        assert!(fee_rate <= MAX_FEE_RATE, EInvalidFeeRate);
        
        let order_book = OrderBook<CoinA, CoinB> {
            id: object::new(ctx),
            buy_orders: vector::empty(),
            sell_orders: vector::empty(),
            fee_rate,
            collected_fees_a: balance::zero(),
            collected_fees_b: balance::zero(),
            admin: tx_context::sender(ctx),
        };
        transfer::share_object(order_book);
    }

    // Constants for validation
    const MIN_ORDER_SIZE: u64 = 1000; // Minimum order size to prevent spam
    const MAX_EXPIRY_DURATION: u64 = 7776000000; // 90 days in milliseconds
    const MIN_EXPIRY_DURATION: u64 = 60000; // 1 minute in milliseconds
    const PRICE_PRECISION: u64 = 1000000; // 6 decimal places
    const MAX_ORDERS_PER_SIDE: u64 = 1000; // Maximum orders per buy/sell side
    const MAX_FEE_RATE: u64 = 1000; // Maximum fee rate: 10% (1000 basis points)

    public entry fun place_buy_order<CoinA, CoinB>(
        order_book: &mut OrderBook<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        price: u64,
        amount: u64,
        expire_duration: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Input validation
        assert!(price > 0, EInvalidPrice);
        assert!(amount >= MIN_ORDER_SIZE, EInvalidAmount);
        assert!(expire_duration >= MIN_EXPIRY_DURATION && expire_duration <= MAX_EXPIRY_DURATION, EInvalidExpiry);
        
        let order_id = object::new(ctx);
        let owner = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let expire_at = current_time + expire_duration;

        // Calculate required coin B amount with overflow protection
        let required_coin_b = (amount * price) / PRICE_PRECISION;
        let coin_b_value = coin::value(&coin_b);
        assert!(coin_b_value >= required_coin_b, EInvalidAmount);
        
        // Split exact amount needed, return change if any
        let payment_coin = if (coin_b_value == required_coin_b) {
            coin_b
        } else {
            let change = coin::split(&mut coin_b, required_coin_b, ctx);
            // Return excess to sender
            transfer::public_transfer(coin_b, owner);
            change
        };

        let order = LimitOrder<CoinA, CoinB> {
            id: object::uid_to_inner(&order_id),
            owner,
            is_buy: true,
            price,
            amount,
            filled_amount: 0,
            coin_a_balance: balance::zero(),
            coin_b_balance: coin::into_balance(payment_coin),
            expire_at,
            created_at: current_time,
        };

        event::emit(OrderPlacedEvent {
            order_id: object::uid_to_inner(&order_id),
            owner,
            is_buy: true,
            price,
            amount,
            expire_at,
        });

        object::delete(order_id);
        
        match_order(order_book, order, clock, ctx);
    }

    public entry fun place_sell_order<CoinA, CoinB>(
        order_book: &mut OrderBook<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        price: u64,
        amount: u64,
        expire_duration: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Input validation
        assert!(price > 0, EInvalidPrice);
        assert!(amount >= MIN_ORDER_SIZE, EInvalidAmount);
        assert!(expire_duration >= MIN_EXPIRY_DURATION && expire_duration <= MAX_EXPIRY_DURATION, EInvalidExpiry);
        
        let coin_a_value = coin::value(&coin_a);
        assert!(coin_a_value >= amount, EInvalidAmount);
        
        let order_id = object::new(ctx);
        let owner = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let expire_at = current_time + expire_duration;
        
        // Split exact amount needed, return change if any
        let payment_coin = if (coin_a_value == amount) {
            coin_a
        } else {
            let change = coin::split(&mut coin_a, amount, ctx);
            // Return excess to sender
            transfer::public_transfer(coin_a, owner);
            change
        };

        let order = LimitOrder<CoinA, CoinB> {
            id: object::uid_to_inner(&order_id),
            owner,
            is_buy: false,
            price,
            amount,
            filled_amount: 0,
            coin_a_balance: coin::into_balance(payment_coin),
            coin_b_balance: balance::zero(),
            expire_at,
            created_at: current_time,
        };

        event::emit(OrderPlacedEvent {
            order_id: object::uid_to_inner(&order_id),
            owner,
            is_buy: false,
            price,
            amount,
            expire_at,
        });

        object::delete(order_id);
        
        match_order(order_book, order, clock, ctx);
    }

    fun match_order<CoinA, CoinB>(
        order_book: &mut OrderBook<CoinA, CoinB>,
        mut new_order: LimitOrder<CoinA, CoinB>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Check if order is expired
        if (new_order.expire_at <= current_time) {
            finalize_order(new_order, ctx);
            return
        };

        let (matching_orders, same_side_orders) = if (new_order.is_buy) {
            (&mut order_book.sell_orders, &mut order_book.buy_orders)
        } else {
            (&mut order_book.buy_orders, &mut order_book.sell_orders)
        };

        // Remove expired orders first
        remove_expired_orders(matching_orders, current_time, ctx);

        let mut i = 0;
        let mut len = vector::length(matching_orders);
        
        while (i < len && new_order.filled_amount < new_order.amount) {
            let counter_order = vector::borrow_mut(matching_orders, i);
            
            if ((new_order.is_buy && new_order.price >= counter_order.price) ||
                (!new_order.is_buy && new_order.price <= counter_order.price)) {
                
                let new_remaining = new_order.amount - new_order.filled_amount;
                let counter_remaining = counter_order.amount - counter_order.filled_amount;
                let fill_amount = if (new_remaining < counter_remaining) { 
                    new_remaining 
                } else { 
                    counter_remaining 
                };

                execute_trade(
                    &mut new_order, 
                    counter_order, 
                    fill_amount, 
                    order_book.fee_rate,
                    &mut order_book.collected_fees_a,
                    &mut order_book.collected_fees_b,
                    ctx
                );

                if (counter_order.filled_amount == counter_order.amount) {
                    finalize_order(vector::remove(matching_orders, i), ctx);
                    len = len - 1;
                } else {
                    i = i + 1;
                }
            } else {
                break // Orders are sorted by price, no need to check further
            }
        };

        if (new_order.filled_amount < new_order.amount && new_order.expire_at > current_time) {
            // Check order book capacity before adding new order
            assert!(vector::length(same_side_orders) < MAX_ORDERS_PER_SIDE, EOrderBookFull);
            insert_order(same_side_orders, new_order);
        } else {
            finalize_order(new_order, ctx);
        }
    }

    fun execute_trade<CoinA, CoinB>(
        taker_order: &mut LimitOrder<CoinA, CoinB>,
        maker_order: &mut LimitOrder<CoinA, CoinB>,
        amount: u64,
        fee_rate: u64,
        collected_fees_a: &mut Balance<CoinA>,
        collected_fees_b: &mut Balance<CoinB>,
        _ctx: &mut TxContext
    ) {
        let execution_price = maker_order.price;
        // Use proper price precision constant
        let coin_b_amount = (amount * execution_price) / PRICE_PRECISION;

        // Calculate fees in basis points (e.g., 30 = 0.3%)
        let fee_a = (amount * fee_rate) / 10000;
        let fee_b = (coin_b_amount * fee_rate) / 10000;
        
        let net_amount_a = amount - fee_a;
        let net_amount_b = coin_b_amount - fee_b;

        if (taker_order.is_buy) {
            // Taker buys A with B, Maker sells A for B
            let mut coin_a = balance::split(&mut maker_order.coin_a_balance, amount);
            let fee_a_balance = balance::split(&mut coin_a, fee_a);
            balance::join(collected_fees_a, fee_a_balance);
            balance::join(&mut taker_order.coin_a_balance, coin_a);
            
            let mut coin_b = balance::split(&mut taker_order.coin_b_balance, coin_b_amount);
            let fee_b_balance = balance::split(&mut coin_b, fee_b);
            balance::join(collected_fees_b, fee_b_balance);
            balance::join(&mut maker_order.coin_b_balance, coin_b);
        } else {
            // Taker sells A for B, Maker buys A with B
            let mut coin_a = balance::split(&mut taker_order.coin_a_balance, amount);
            let fee_a_balance = balance::split(&mut coin_a, fee_a);
            balance::join(collected_fees_a, fee_a_balance);
            balance::join(&mut maker_order.coin_a_balance, coin_a);
            
            let mut coin_b = balance::split(&mut maker_order.coin_b_balance, coin_b_amount);
            let fee_b_balance = balance::split(&mut coin_b, fee_b);
            balance::join(collected_fees_b, fee_b_balance);
            balance::join(&mut taker_order.coin_b_balance, coin_b);
        };

        taker_order.filled_amount = taker_order.filled_amount + amount;
        maker_order.filled_amount = maker_order.filled_amount + amount;

        event::emit(OrderFilledEvent {
            order_id: taker_order.id,
            filled_amount: amount,
            is_partial: taker_order.filled_amount < taker_order.amount,
            execution_price,
        });

        event::emit(OrderFilledEvent {
            order_id: maker_order.id,
            filled_amount: amount,
            is_partial: maker_order.filled_amount < maker_order.amount,
            execution_price,
        });

        event::emit(TradeExecutedEvent {
            buy_order_id: if (taker_order.is_buy) { taker_order.id } else { maker_order.id },
            sell_order_id: if (taker_order.is_buy) { maker_order.id } else { taker_order.id },
            amount,
            price: execution_price,
            buyer: if (taker_order.is_buy) { taker_order.owner } else { maker_order.owner },
            seller: if (taker_order.is_buy) { maker_order.owner } else { taker_order.owner },
        });
    }

    fun insert_order<CoinA, CoinB>(
        orders: &mut vector<LimitOrder<CoinA, CoinB>>,
        order: LimitOrder<CoinA, CoinB>
    ) {
        let mut i = 0;
        let len = vector::length(orders);
        
        while (i < len) {
            let existing = vector::borrow(orders, i);
            if ((order.is_buy && order.price > existing.price) ||
                (!order.is_buy && order.price < existing.price)) {
                break
            };
            i = i + 1;
        };
        
        vector::insert(orders, order, i);
    }

    fun remove_expired_orders<CoinA, CoinB>(
        orders: &mut vector<LimitOrder<CoinA, CoinB>>,
        current_time: u64,
        ctx: &mut TxContext
    ) {
        let mut i = 0;
        while (i < vector::length(orders)) {
            let order = vector::borrow(orders, i);
            if (order.expire_at <= current_time) {
                let expired_order = vector::remove(orders, i);
                finalize_order(expired_order, ctx);
            } else {
                i = i + 1;
            }
        }
    }

    fun finalize_order<CoinA, CoinB>(
        order: LimitOrder<CoinA, CoinB>,
        ctx: &mut TxContext
    ) {
        let LimitOrder {
            id: _,
            owner,
            is_buy: _,
            price: _,
            amount: _,
            filled_amount: _,
            coin_a_balance,
            coin_b_balance,
            expire_at: _,
            created_at: _,
        } = order;

        if (balance::value(&coin_a_balance) > 0) {
            transfer::public_transfer(
                coin::from_balance(coin_a_balance, ctx),
                owner
            );
        } else {
            balance::destroy_zero(coin_a_balance);
        };

        if (balance::value(&coin_b_balance) > 0) {
            transfer::public_transfer(
                coin::from_balance(coin_b_balance, ctx),
                owner
            );
        } else {
            balance::destroy_zero(coin_b_balance);
        };
    }

    public entry fun cancel_order<CoinA, CoinB>(
        order_book: &mut OrderBook<CoinA, CoinB>,
        order_id: ID,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let mut found = false;
        
        // Search in buy orders
        let mut i = 0;
        while (i < vector::length(&order_book.buy_orders)) {
            let order = vector::borrow(&order_book.buy_orders, i);
            if (order.id == order_id) {
                assert!(order.owner == sender, EUnauthorized);
                let cancelled_order = vector::remove(&mut order_book.buy_orders, i);
                let remaining_amount = cancelled_order.amount - cancelled_order.filled_amount;
                
                event::emit(OrderCancelledEvent {
                    order_id,
                    owner: sender,
                    remaining_amount,
                });
                
                finalize_order(cancelled_order, ctx);
                found = true;
                break
            };
            i = i + 1;
        };

        // Search in sell orders if not found
        if (!found) {
            i = 0;
            while (i < vector::length(&order_book.sell_orders)) {
                let order = vector::borrow(&order_book.sell_orders, i);
                if (order.id == order_id) {
                    assert!(order.owner == sender, EUnauthorized);
                    let cancelled_order = vector::remove(&mut order_book.sell_orders, i);
                    let remaining_amount = cancelled_order.amount - cancelled_order.filled_amount;
                    
                    event::emit(OrderCancelledEvent {
                        order_id,
                        owner: sender,
                        remaining_amount,
                    });
                    
                    finalize_order(cancelled_order, ctx);
                    found = true;
                    break
                };
                i = i + 1;
            };
        };

        assert!(found, EOrderNotFound);
    }

    public entry fun collect_fees<CoinA, CoinB>(
        order_book: &mut OrderBook<CoinA, CoinB>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == order_book.admin, EUnauthorized);

        if (balance::value(&order_book.collected_fees_a) > 0) {
            let fees_a = balance::withdraw_all(&mut order_book.collected_fees_a);
            transfer::public_transfer(
                coin::from_balance(fees_a, ctx),
                order_book.admin
            );
        };

        if (balance::value(&order_book.collected_fees_b) > 0) {
            let fees_b = balance::withdraw_all(&mut order_book.collected_fees_b);
            transfer::public_transfer(
                coin::from_balance(fees_b, ctx),
                order_book.admin
            );
        };
    }

    // View functions
    public fun get_order_book_info<CoinA, CoinB>(
        order_book: &OrderBook<CoinA, CoinB>
    ): (u64, u64, u64, u64, u64) {
        (
            vector::length(&order_book.buy_orders),
            vector::length(&order_book.sell_orders),
            order_book.fee_rate,
            balance::value(&order_book.collected_fees_a),
            balance::value(&order_book.collected_fees_b)
        )
    }

    public fun get_best_bid_price<CoinA, CoinB>(
        order_book: &OrderBook<CoinA, CoinB>
    ): u64 {
        if (vector::is_empty(&order_book.buy_orders)) {
            0
        } else {
            let best_bid = vector::borrow(&order_book.buy_orders, 0);
            best_bid.price
        }
    }

    public fun get_best_ask_price<CoinA, CoinB>(
        order_book: &OrderBook<CoinA, CoinB>
    ): u64 {
        if (vector::is_empty(&order_book.sell_orders)) {
            0
        } else {
            let best_ask = vector::borrow(&order_book.sell_orders, 0);
            best_ask.price
        }
    }
}