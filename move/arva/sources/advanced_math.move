/// Advanced Math Library implementing IOTA Move patterns
/// Provides high-precision mathematical operations for DeFi protocols
module arva::advanced_math {
    use std::vector;

    /// Error codes
    const E_DIVISION_BY_ZERO: u64 = 1;
    const E_OVERFLOW: u64 = 2;
    const E_INVALID_INPUT: u64 = 3;
    const E_SQRT_OF_NEGATIVE: u64 = 4;

    /// Constants for high-precision arithmetic
    const PRECISION: u128 = 1000000000000000000; // 10^18
    const MAX_U64: u64 = 18446744073709551615;

    /// Fixed-point number with 18 decimal places
    public struct FixedPoint has copy, drop, store {
        value: u128,
    }

    /// Create a fixed-point number from integer
    public fun from_u64(value: u64): FixedPoint {
        FixedPoint { value: (value as u128) * PRECISION }
    }

    /// Convert fixed-point number to integer (truncating decimals)
    public fun to_u64(fp: FixedPoint): u64 {
        (fp.value / PRECISION as u64)
    }

    /// Create fixed-point number from raw value
    public fun from_raw(value: u128): FixedPoint {
        FixedPoint { value }
    }

    /// Get raw value
    public fun to_raw(fp: FixedPoint): u128 {
        fp.value
    }

    /// Add two fixed-point numbers
    public fun add(a: FixedPoint, b: FixedPoint): FixedPoint {
        FixedPoint { value: a.value + b.value }
    }

    /// Subtract two fixed-point numbers
    public fun sub(a: FixedPoint, b: FixedPoint): FixedPoint {
        assert!(a.value >= b.value, E_OVERFLOW);
        FixedPoint { value: a.value - b.value }
    }

    /// Multiply two fixed-point numbers
    public fun mul(a: FixedPoint, b: FixedPoint): FixedPoint {
        let result = (a.value * b.value) / PRECISION;
        FixedPoint { value: result }
    }

    /// Divide two fixed-point numbers
    public fun div(a: FixedPoint, b: FixedPoint): FixedPoint {
        assert!(b.value > 0, E_DIVISION_BY_ZERO);
        let result = (a.value * PRECISION) / b.value;
        FixedPoint { value: result }
    }

    /// Calculate square root using Newton's method
    public fun sqrt(x: FixedPoint): FixedPoint {
        if (x.value == 0) return from_u64(0);
        
        let z = x.value;
        let y = (z + PRECISION) / 2;
        
        while (y < z) {
            z = y;
            y = (z + x.value / z) / 2;
        };
        
        FixedPoint { value: z }
    }

    /// Calculate power using exponentiation by squaring
    public fun pow(base: FixedPoint, exponent: u64): FixedPoint {
        if (exponent == 0) return from_u64(1);
        if (exponent == 1) return base;
        
        let result = from_u64(1);
        let base_copy = base;
        let exp_copy = exponent;
        
        while (exp_copy > 0) {
            if (exp_copy % 2 == 1) {
                result = mul(result, base_copy);
            };
            base_copy = mul(base_copy, base_copy);
            exp_copy = exp_copy / 2;
        };
        
        result
    }

    /// Calculate compound interest: A = P(1 + r/n)^(nt)
    public fun compound_interest(
        principal: FixedPoint,
        rate: FixedPoint,
        periods_per_year: u64,
        years: u64
    ): FixedPoint {
        let r_over_n = div(rate, from_u64(periods_per_year));
        let one_plus_r_over_n = add(from_u64(1), r_over_n);
        let exponent = periods_per_year * years;
        let compound_factor = pow(one_plus_r_over_n, exponent);
        mul(principal, compound_factor)
    }

    /// Calculate weighted average
    public fun weighted_average(values: vector<u64>, weights: vector<u64>): FixedPoint {
        assert!(vector::length(&values) == vector::length(&weights), E_INVALID_INPUT);
        assert!(vector::length(&values) > 0, E_INVALID_INPUT);
        
        let weighted_sum = 0u128;
        let total_weight = 0u64;
        let i = 0;
        
        while (i < vector::length(&values)) {
            let value = *vector::borrow(&values, i);
            let weight = *vector::borrow(&weights, i);
            
            weighted_sum = weighted_sum + (value as u128) * (weight as u128);
            total_weight = total_weight + weight;
            i = i + 1;
        };
        
        assert!(total_weight > 0, E_DIVISION_BY_ZERO);
        from_raw((weighted_sum * PRECISION) / (total_weight as u128))
    }

    /// Calculate exponential moving average
    public fun exponential_moving_average(
        current_value: FixedPoint,
        previous_ema: FixedPoint,
        alpha: FixedPoint
    ): FixedPoint {
        // EMA = α * current + (1 - α) * previous_ema
        let one = from_u64(1);
        let one_minus_alpha = sub(one, alpha);
        let term1 = mul(alpha, current_value);
        let term2 = mul(one_minus_alpha, previous_ema);
        add(term1, term2)
    }

    /// Calculate Bollinger Band parameters (mean and standard deviation)
    public fun bollinger_bands(prices: vector<u64>, period: u64): (FixedPoint, FixedPoint) {
        assert!(vector::length(&prices) >= period, E_INVALID_INPUT);
        assert!(period > 1, E_INVALID_INPUT);
        
        // Calculate simple moving average
        let sum = 0u128;
        let i = vector::length(&prices) - period;
        let end_index = vector::length(&prices);
        
        while (i < end_index) {
            sum = sum + (*vector::borrow(&prices, i) as u128);
            i = i + 1;
        };
        
        let mean = from_raw((sum * PRECISION) / (period as u128));
        
        // Calculate standard deviation
        let variance_sum = 0u128;
        i = vector::length(&prices) - period;
        
        while (i < end_index) {
            let price_fp = from_u64(*vector::borrow(&prices, i));
            let diff = if (price_fp.value >= mean.value) {
                price_fp.value - mean.value
            } else {
                mean.value - price_fp.value
            };
            variance_sum = variance_sum + (diff * diff) / PRECISION;
            i = i + 1;
        };
        
        let variance = from_raw((variance_sum * PRECISION) / (period as u128));
        let std_dev = sqrt(variance);
        
        (mean, std_dev)
    }

    /// Calculate percentage change
    public fun percentage_change(old_value: u64, new_value: u64): FixedPoint {
        assert!(old_value > 0, E_DIVISION_BY_ZERO);
        
        if (new_value >= old_value) {
            let diff = new_value - old_value;
            div(from_u64(diff), from_u64(old_value))
        } else {
            let diff = old_value - new_value;
            let result = div(from_u64(diff), from_u64(old_value));
            from_raw(0 - result.value) // Negative result
        }
    }

    /// Calculate APY from APR with compounding
    public fun apr_to_apy(apr: FixedPoint, compounding_periods: u64): FixedPoint {
        let one = from_u64(1);
        let apr_over_n = div(apr, from_u64(compounding_periods));
        let one_plus_rate = add(one, apr_over_n);
        let compound_factor = pow(one_plus_rate, compounding_periods);
        sub(compound_factor, one)
    }

    /// Calculate impermanent loss for AMM pools
    public fun impermanent_loss(price_ratio: FixedPoint): FixedPoint {
        // IL = 2 * sqrt(ratio) / (1 + ratio) - 1
        let two = from_u64(2);
        let one = from_u64(1);
        
        let sqrt_ratio = sqrt(price_ratio);
        let numerator = mul(two, sqrt_ratio);
        let denominator = add(one, price_ratio);
        let fraction = div(numerator, denominator);
        
        sub(fraction, one)
    }

    /// Safe multiplication with overflow check
    public fun safe_mul_u64(a: u64, b: u64): u64 {
        assert!(a == 0 || b <= MAX_U64 / a, E_OVERFLOW);
        a * b
    }

    /// Safe addition with overflow check
    public fun safe_add_u64(a: u64, b: u64): u64 {
        assert!(a <= MAX_U64 - b, E_OVERFLOW);
        a + b
    }

    /// Compare two fixed-point numbers
    public fun compare(a: FixedPoint, b: FixedPoint): u8 {
        if (a.value > b.value) 2      // Greater than
        else if (a.value < b.value) 0 // Less than
        else 1                        // Equal
    }

    /// Min of two fixed-point numbers
    public fun min(a: FixedPoint, b: FixedPoint): FixedPoint {
        if (a.value < b.value) a else b
    }

    /// Max of two fixed-point numbers
    public fun max(a: FixedPoint, b: FixedPoint): FixedPoint {
        if (a.value > b.value) a else b
    }

    /// Check if fixed-point number is zero
    public fun is_zero(fp: FixedPoint): bool {
        fp.value == 0
    }

    /// Get absolute value (for handling negative results in some calculations)
    public fun abs_diff(a: FixedPoint, b: FixedPoint): FixedPoint {
        if (a.value >= b.value) {
            FixedPoint { value: a.value - b.value }
        } else {
            FixedPoint { value: b.value - a.value }
        }
    }
}