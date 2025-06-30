module Iota::limit_order {
    use iota::coin::{Self, Coin};
    use iota::balance::{Self, Balance};
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::transfer;
    use iota::event;
    use iota::clock::{Self, Clock};

    const EOrderExpired: u64 = 1;
    const EInvalidPrice: u64 = 2;
    const EUnauthorized: u64 = 3;

    public struct OrderBook<phantom CoinA, phantom CoinB> has key {
        id: UID,
        buy_orders: vector<LimitOrder<CoinA, CoinB>>,
        sell_orders: vector<LimitOrder<CoinA, CoinB>>,
    }

    public struct LimitOrder<phantom CoinA, phantom CoinB> has store {
        id: ID,
        owner: address,
        is_buy: bool,
        price: u64,
        amount: u64,
        filled_amount: u64,
        coin_a_balance: Balance<CoinA>,
        coin_b_balance: Balance<CoinB>,
        expire_at: u64,
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
    }

    public struct OrderCancelledEvent has copy, drop {
        order_id: ID,
        owner: address,
    }

    public entry fun create_order_book<CoinA, CoinB>(ctx: &mut TxContext) {
        let order_book = OrderBook<CoinA, CoinB> {
            id: object::new(ctx),
            buy_orders: vector::empty(),
            sell_orders: vector::empty(),
        };
        transfer::share_object(order_book);
    }

    public entry fun place_buy_order<CoinA, CoinB>(
        order_book: &mut OrderBook<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        price: u64,
        amount: u64,
        expire_duration: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(price > 0, EInvalidPrice);
        
        let order_id = object::new(ctx);
        let owner = tx_context::sender(ctx);
        let expire_at = clock::timestamp_ms(clock) + expire_duration;

        let order = LimitOrder<CoinA, CoinB> {
            id: object::uid_to_inner(&order_id),
            owner,
            is_buy: true,
            price,
            amount,
            filled_amount: 0,
            coin_a_balance: balance::zero(),
            coin_b_balance: coin::into_balance(coin_b),
            expire_at,
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
        
        match_order(order_book, order, ctx);
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
        assert!(price > 0, EInvalidPrice);
        
        let order_id = object::new(ctx);
        let owner = tx_context::sender(ctx);
        let expire_at = clock::timestamp_ms(clock) + expire_duration;

        let order = LimitOrder<CoinA, CoinB> {
            id: object::uid_to_inner(&order_id),
            owner,
            is_buy: false,
            price,
            amount,
            filled_amount: 0,
            coin_a_balance: coin::into_balance(coin_a),
            coin_b_balance: balance::zero(),
            expire_at,
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
        
        match_order(order_book, order, ctx);
    }

    fun match_order<CoinA, CoinB>(
        order_book: &mut OrderBook<CoinA, CoinB>,
        mut new_order: LimitOrder<CoinA, CoinB>,
        ctx: &mut TxContext
    ) {
        let (matching_orders, same_side_orders) = if (new_order.is_buy) {
            (&mut order_book.sell_orders, &mut order_book.buy_orders)
        } else {
            (&mut order_book.buy_orders, &mut order_book.sell_orders)
        };

        let i = 0;
        let len = vector::length(matching_orders);
        
        while (i < len && new_order.filled_amount < new_order.amount) {
            let counter_order = vector::borrow_mut(matching_orders, i);
            
            if ((new_order.is_buy && new_order.price >= counter_order.price) ||
                (!new_order.is_buy && new_order.price <= counter_order.price)) {
                
                let fill_amount = math::min(
                    new_order.amount - new_order.filled_amount,
                    counter_order.amount - counter_order.filled_amount
                );

                execute_trade(&mut new_order, counter_order, fill_amount, ctx);

                if (counter_order.filled_amount == counter_order.amount) {
                    finalize_order(vector::remove(matching_orders, i), ctx);
                    len = len - 1;
                } else {
                    i = i + 1;
                }
            } else {
                i = i + 1;
            }
        };

        if (new_order.filled_amount < new_order.amount) {
            insert_order(same_side_orders, new_order);
        } else {
            finalize_order(new_order, ctx);
        }
    }

    fun execute_trade<CoinA, CoinB>(
        taker_order: &mut LimitOrder<CoinA, CoinB>,
        maker_order: &mut LimitOrder<CoinA, CoinB>,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let coin_b_amount = (amount * maker_order.price) / 1000000;

        if (taker_order.is_buy) {
            let coin_a = balance::split(&mut maker_order.coin_a_balance, amount);
            balance::join(&mut taker_order.coin_a_balance, coin_a);
            
            let coin_b = balance::split(&mut taker_order.coin_b_balance, coin_b_amount);
            balance::join(&mut maker_order.coin_b_balance, coin_b);
        } else {
            let coin_a = balance::split(&mut taker_order.coin_a_balance, amount);
            balance::join(&mut maker_order.coin_a_balance, coin_a);
            
            let coin_b = balance::split(&mut maker_order.coin_b_balance, coin_b_amount);
            balance::join(&mut taker_order.coin_b_balance, coin_b);
        };

        taker_order.filled_amount = taker_order.filled_amount + amount;
        maker_order.filled_amount = maker_order.filled_amount + amount;

        event::emit(OrderFilledEvent {
            order_id: taker_order.id,
            filled_amount: amount,
            is_partial: taker_order.filled_amount < taker_order.amount,
        });

        event::emit(OrderFilledEvent {
            order_id: maker_order.id,
            filled_amount: amount,
            is_partial: maker_order.filled_amount < maker_order.amount,
        });
    }

    fun insert_order<CoinA, CoinB>(
        orders: &mut vector<LimitOrder<CoinA, CoinB>>,
        order: LimitOrder<CoinA, CoinB>
    ) {
        let i = 0;
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
        let found = false;
        
        let i = 0;
        while (i < vector::length(&order_book.buy_orders)) {
            let order = vector::borrow(&order_book.buy_orders, i);
            if (order.id == order_id) {
                assert!(order.owner == sender, EUnauthorized);
                let cancelled_order = vector::remove(&mut order_book.buy_orders, i);
                finalize_order(cancelled_order, ctx);
                found = true;
                break
            };
            i = i + 1;
        };

        if (!found) {
            i = 0;
            while (i < vector::length(&order_book.sell_orders)) {
                let order = vector::borrow(&order_book.sell_orders, i);
                if (order.id == order_id) {
                    assert!(order.owner == sender, EUnauthorized);
                    let cancelled_order = vector::remove(&mut order_book.sell_orders, i);
                    finalize_order(cancelled_order, ctx);
                    break
                };
                i = i + 1;
            };
        };

        event::emit(OrderCancelledEvent {
            order_id,
            owner: sender,
        });
    }

    use iota::math;
    use std::vector;
}