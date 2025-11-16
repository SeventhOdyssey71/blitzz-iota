/// Oracle Module implementing price feeds with IOTA Move patterns
/// Provides secure, time-weighted price data for DeFi protocols
module arva::oracle {
    use std::vector;
    use std::option::{Self, Option};
    use iota::object::{Self, UID, ID};
    use iota::tx_context::{Self, TxContext};
    use iota::clock::{Self, Clock};
    use iota::event;
    use iota::transfer;
    use arva::advanced_math::{Self, FixedPoint};

    /// Price feed structure
    public struct PriceFeed has key {
        id: UID,
        asset_name: vector<u8>,
        price: FixedPoint,
        last_updated: u64,
        decimals: u8,
        historical_prices: vector<PriceEntry>,
        max_history: u64,
        deviation_threshold: FixedPoint, // Maximum allowed price deviation
        update_frequency: u64, // Minimum time between updates (ms)
        aggregation_method: u8, // 0: latest, 1: TWAP, 2: median
    }

    /// Individual price entry for historical data
    public struct PriceEntry has store, copy, drop {
        price: FixedPoint,
        timestamp: u64,
        confidence: u8, // 0-100 confidence score
    }

    /// Oracle capability for authorized price updates
    public struct OracleCap has key, store {
        id: UID,
        feed_id: ID,
        authority: address,
    }

    /// Price aggregator for multiple sources
    public struct PriceAggregator has key {
        id: UID,
        asset_name: vector<u8>,
        feeds: vector<ID>,
        weights: vector<u64>, // Corresponding weights for each feed
        min_sources: u64,     // Minimum number of sources required
        max_deviation: FixedPoint, // Maximum deviation between sources
        aggregated_price: FixedPoint,
        last_updated: u64,
    }

    /// TWAP (Time-Weighted Average Price) calculator
    public struct TWAPOracle has key {
        id: UID,
        asset_name: vector<u8>,
        window_size: u64,     // Time window in milliseconds
        price_history: vector<PriceEntry>,
        current_twap: FixedPoint,
        last_updated: u64,
    }

    /// Events
    public struct PriceUpdated has copy, drop {
        feed_id: ID,
        asset_name: vector<u8>,
        old_price: u128,
        new_price: u128,
        timestamp: u64,
        confidence: u8,
    }

    public struct AggregatedPriceUpdated has copy, drop {
        aggregator_id: ID,
        asset_name: vector<u8>,
        price: u128,
        num_sources: u64,
        timestamp: u64,
    }

    public struct TWAPUpdated has copy, drop {
        oracle_id: ID,
        asset_name: vector<u8>,
        twap: u128,
        window_size: u64,
        timestamp: u64,
    }

    /// Error codes
    const E_UNAUTHORIZED: u64 = 1;
    const E_STALE_PRICE: u64 = 2;
    const E_INVALID_PRICE: u64 = 3;
    const E_INSUFFICIENT_SOURCES: u64 = 4;
    const E_PRICE_DEVIATION_TOO_HIGH: u64 = 5;
    const E_UPDATE_TOO_FREQUENT: u64 = 6;
    const E_INVALID_CONFIGURATION: u64 = 7;

    /// Aggregation methods
    const METHOD_LATEST: u8 = 0;
    const METHOD_TWAP: u8 = 1;
    const METHOD_MEDIAN: u8 = 2;

    /// Create a new price feed
    public fun create_price_feed(
        asset_name: vector<u8>,
        initial_price: u64,
        decimals: u8,
        max_history: u64,
        deviation_threshold: u64, // In basis points
        update_frequency: u64,
        aggregation_method: u8,
        clock: &Clock,
        ctx: &mut TxContext
    ): (PriceFeed, OracleCap) {
        let current_time = clock::timestamp_ms(clock);
        let price_fp = advanced_math::from_u64(initial_price);
        let deviation_fp = advanced_math::from_raw((deviation_threshold as u128) * 1000000000000000); // Convert basis points

        let initial_entry = PriceEntry {
            price: price_fp,
            timestamp: current_time,
            confidence: 100,
        };

        let feed = PriceFeed {
            id: object::new(ctx),
            asset_name: asset_name,
            price: price_fp,
            last_updated: current_time,
            decimals,
            historical_prices: vector::singleton(initial_entry),
            max_history,
            deviation_threshold: deviation_fp,
            update_frequency,
            aggregation_method,
        };

        let feed_id = object::id(&feed);
        let oracle_cap = OracleCap {
            id: object::new(ctx),
            feed_id,
            authority: tx_context::sender(ctx),
        };

        (feed, oracle_cap)
    }

    /// Update price feed (oracle authorized only)
    public fun update_price(
        feed: &mut PriceFeed,
        cap: &OracleCap,
        new_price: u64,
        confidence: u8,
        clock: &Clock,
        ctx: &TxContext
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Verify authorization
        assert!(object::id(feed) == cap.feed_id, E_UNAUTHORIZED);
        assert!(cap.authority == tx_context::sender(ctx), E_UNAUTHORIZED);
        
        // Check update frequency
        assert!(
            current_time >= feed.last_updated + feed.update_frequency,
            E_UPDATE_TOO_FREQUENT
        );

        let new_price_fp = advanced_math::from_u64(new_price);
        let old_price_fp = feed.price;

        // Check price deviation if not the first update
        if (vector::length(&feed.historical_prices) > 1) {
            let price_diff = advanced_math::abs_diff(new_price_fp, old_price_fp);
            let deviation = advanced_math::div(price_diff, old_price_fp);
            assert!(
                advanced_math::compare(deviation, feed.deviation_threshold) <= 1,
                E_PRICE_DEVIATION_TOO_HIGH
            );
        };

        // Add new price entry
        let new_entry = PriceEntry {
            price: new_price_fp,
            timestamp: current_time,
            confidence,
        };

        vector::push_back(&mut feed.historical_prices, new_entry);

        // Maintain history size
        while (vector::length(&feed.historical_prices) > feed.max_history) {
            vector::remove(&mut feed.historical_prices, 0);
        };

        // Update current price based on aggregation method
        feed.price = calculate_aggregated_price(feed);
        feed.last_updated = current_time;

        event::emit(PriceUpdated {
            feed_id: object::id(feed),
            asset_name: feed.asset_name,
            old_price: advanced_math::to_raw(old_price_fp),
            new_price: advanced_math::to_raw(feed.price),
            timestamp: current_time,
            confidence,
        });
    }

    /// Calculate aggregated price based on method
    fun calculate_aggregated_price(feed: &PriceFeed): FixedPoint {
        if (feed.aggregation_method == METHOD_LATEST) {
            let latest_entry = vector::borrow(&feed.historical_prices, vector::length(&feed.historical_prices) - 1);
            latest_entry.price
        } else if (feed.aggregation_method == METHOD_TWAP) {
            calculate_twap(feed)
        } else if (feed.aggregation_method == METHOD_MEDIAN) {
            calculate_median_price(feed)
        } else {
            // Default to latest
            let latest_entry = vector::borrow(&feed.historical_prices, vector::length(&feed.historical_prices) - 1);
            latest_entry.price
        }
    }

    /// Calculate Time-Weighted Average Price
    fun calculate_twap(feed: &PriceFeed): FixedPoint {
        let history = &feed.historical_prices;
        let len = vector::length(history);
        
        if (len <= 1) {
            return vector::borrow(history, len - 1).price
        };

        let total_weighted_price = 0u128;
        let total_time = 0u64;
        let i = 1;

        while (i < len) {
            let current = vector::borrow(history, i);
            let previous = vector::borrow(history, i - 1);
            let time_diff = current.timestamp - previous.timestamp;
            
            total_weighted_price = total_weighted_price + 
                advanced_math::to_raw(previous.price) * (time_diff as u128);
            total_time = total_time + time_diff;
            i = i + 1;
        };

        if (total_time > 0) {
            advanced_math::from_raw(total_weighted_price / (total_time as u128))
        } else {
            vector::borrow(history, len - 1).price
        }
    }

    /// Calculate median price from recent entries
    fun calculate_median_price(feed: &PriceFeed): FixedPoint {
        let history = &feed.historical_prices;
        let len = vector::length(history);
        let window_size = if (len > 10) 10 else len;
        
        // Get recent prices
        let recent_prices = vector::empty<u128>();
        let i = len - window_size;
        
        while (i < len) {
            let entry = vector::borrow(history, i);
            vector::push_back(&mut recent_prices, advanced_math::to_raw(entry.price));
            i = i + 1;
        };

        // Sort prices (simple bubble sort for small arrays)
        let sorted = false;
        while (!sorted) {
            sorted = true;
            let j = 0;
            while (j < vector::length(&recent_prices) - 1) {
                if (*vector::borrow(&recent_prices, j) > *vector::borrow(&recent_prices, j + 1)) {
                    vector::swap(&mut recent_prices, j, j + 1);
                    sorted = false;
                };
                j = j + 1;
            };
        };

        // Return median
        let mid = window_size / 2;
        advanced_math::from_raw(*vector::borrow(&recent_prices, mid))
    }

    /// Create price aggregator for multiple feeds
    public fun create_aggregator(
        asset_name: vector<u8>,
        feeds: vector<ID>,
        weights: vector<u64>,
        min_sources: u64,
        max_deviation: u64, // In basis points
        ctx: &mut TxContext
    ): PriceAggregator {
        assert!(vector::length(&feeds) == vector::length(&weights), E_INVALID_CONFIGURATION);
        assert!(vector::length(&feeds) >= min_sources, E_INVALID_CONFIGURATION);

        let max_dev_fp = advanced_math::from_raw((max_deviation as u128) * 1000000000000000);

        PriceAggregator {
            id: object::new(ctx),
            asset_name,
            feeds,
            weights,
            min_sources,
            max_deviation: max_dev_fp,
            aggregated_price: advanced_math::from_u64(0),
            last_updated: 0,
        }
    }

    /// Update aggregated price from multiple feeds
    public fun update_aggregated_price(
        aggregator: &mut PriceAggregator,
        feed_prices: vector<u64>,
        clock: &Clock,
    ) {
        assert!(vector::length(&feed_prices) >= aggregator.min_sources, E_INSUFFICIENT_SOURCES);
        assert!(vector::length(&feed_prices) == vector::length(&aggregator.weights), E_INVALID_CONFIGURATION);

        let current_time = clock::timestamp_ms(clock);
        let weighted_sum = 0u128;
        let total_weight = 0u64;
        let i = 0;

        // Calculate weighted average
        while (i < vector::length(&feed_prices)) {
            let price = *vector::borrow(&feed_prices, i);
            let weight = *vector::borrow(&aggregator.weights, i);
            
            weighted_sum = weighted_sum + (price as u128) * (weight as u128);
            total_weight = total_weight + weight;
            i = i + 1;
        };

        let new_price = advanced_math::from_raw((weighted_sum * 1000000000000000000) / (total_weight as u128));

        // Check deviation between sources
        validate_source_deviation(&feed_prices, aggregator.max_deviation);

        aggregator.aggregated_price = new_price;
        aggregator.last_updated = current_time;

        event::emit(AggregatedPriceUpdated {
            aggregator_id: object::id(aggregator),
            asset_name: aggregator.asset_name,
            price: advanced_math::to_raw(new_price),
            num_sources: vector::length(&feed_prices),
            timestamp: current_time,
        });
    }

    /// Validate that price sources don't deviate too much
    fun validate_source_deviation(prices: &vector<u64>, max_deviation: FixedPoint) {
        if (vector::length(prices) <= 1) return;

        let min_price = *vector::borrow(prices, 0);
        let max_price = *vector::borrow(prices, 0);
        let i = 1;

        while (i < vector::length(prices)) {
            let price = *vector::borrow(prices, i);
            if (price < min_price) min_price = price;
            if (price > max_price) max_price = price;
            i = i + 1;
        };

        if (min_price > 0) {
            let deviation = advanced_math::div(
                advanced_math::from_u64(max_price - min_price),
                advanced_math::from_u64(min_price)
            );
            assert!(advanced_math::compare(deviation, max_deviation) <= 1, E_PRICE_DEVIATION_TOO_HIGH);
        };
    }

    /// Get current price from feed
    public fun get_price(feed: &PriceFeed): (u64, u64) {
        (advanced_math::to_u64(feed.price), feed.last_updated)
    }

    /// Get price with confidence score
    public fun get_price_with_confidence(feed: &PriceFeed): (u64, u64, u8) {
        let latest_entry = vector::borrow(&feed.historical_prices, vector::length(&feed.historical_prices) - 1);
        (advanced_math::to_u64(feed.price), feed.last_updated, latest_entry.confidence)
    }

    /// Check if price is fresh
    public fun is_price_fresh(feed: &PriceFeed, max_age: u64, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        current_time <= feed.last_updated + max_age
    }

    /// Get aggregated price
    public fun get_aggregated_price(aggregator: &PriceAggregator): (u64, u64) {
        (advanced_math::to_u64(aggregator.aggregated_price), aggregator.last_updated)
    }

    /// Get historical price at specific timestamp
    public fun get_historical_price(feed: &PriceFeed, timestamp: u64): Option<u64> {
        let history = &feed.historical_prices;
        let i = 0;
        
        while (i < vector::length(history)) {
            let entry = vector::borrow(history, i);
            if (entry.timestamp == timestamp) {
                return option::some(advanced_math::to_u64(entry.price))
            };
            i = i + 1;
        };
        
        option::none()
    }
}