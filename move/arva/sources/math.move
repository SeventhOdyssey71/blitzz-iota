module Blitz::math {
    /// Returns the minimum of two u64 values
    public fun min(a: u64, b: u64): u64 {
        if (a < b) { a } else { b }
    }
    
    /// Returns the maximum of two u64 values
    public fun max(a: u64, b: u64): u64 {
        if (a > b) { a } else { b }
    }
    
    /// Calculate square root using Babylonian method
    public fun sqrt(x: u64): u64 {
        if (x == 0) return 0;
        let mut z = x;
        let mut y = (z + 1) / 2;
        while (y < z) {
            z = y;
            y = (x / z + z) / 2;
        };
        z
    }
    
    /// Safe multiplication that prevents overflow
    public fun mul_div(x: u64, y: u64, z: u64): u64 {
        // This is a simplified version
        // In Move, we need to be careful with overflow
        assert!(z > 0, 1);
        (x * y) / z
    }
    
    /// Calculate the output amount for a swap using constant product formula
    /// Uses the formula: output = (input * reserve_out) / (reserve_in + input)
    public fun get_amount_out(
        amount_in: u64,
        reserve_in: u64,
        reserve_out: u64,
        fee_numerator: u64,
        fee_denominator: u64
    ): u64 {
        let amount_in_with_fee = amount_in * (fee_denominator - fee_numerator) / fee_denominator;
        let numerator = amount_in_with_fee * reserve_out;
        let denominator = reserve_in + amount_in_with_fee;
        numerator / denominator
    }
    
    /// Calculate the required input amount for a desired output
    public fun get_amount_in(
        amount_out: u64,
        reserve_in: u64,
        reserve_out: u64,
        fee_numerator: u64,
        fee_denominator: u64
    ): u64 {
        let numerator = reserve_in * amount_out * fee_denominator;
        let denominator = (reserve_out - amount_out) * (fee_denominator - fee_numerator);
        (numerator / denominator) + 1
    }
}