# DeFi Pools, Liquidity & Swaps on IOTA Rebased: A Comprehensive Guide

## Table of Contents
1. [Introduction](#introduction)
2. [IOTA Rebased & Move Programming](#iota-rebased--move-programming)
3. [Understanding Automated Market Makers (AMM)](#understanding-automated-market-makers-amm)
4. [How Liquidity Pools Work](#how-liquidity-pools-work)
5. [The Constant Product Formula](#the-constant-product-formula)
6. [Implementing Pools in Move](#implementing-pools-in-move)
7. [Adding & Removing Liquidity](#adding--removing-liquidity)
8. [Swap Mechanics](#swap-mechanics)
9. [Price Discovery & Slippage](#price-discovery--slippage)
10. [Fees & Incentives](#fees--incentives)
11. [Security Considerations](#security-considerations)
12. [Reference Implementation](#reference-implementation)

## Introduction

This guide explains how decentralized exchanges (DEXs) work on IOTA Rebased using the Move programming language. We'll explore the mechanics of automated market makers (AMMs), liquidity pools, and token swaps, using Pools Finance (app.pools.finance) as a reference implementation.

## IOTA Rebased & Move Programming

### What is IOTA Rebased?

IOTA Rebased is a major protocol upgrade scheduled for May 5, 2025, that transforms IOTA into a high-performance Layer-1 blockchain with:

- **MoveVM Integration**: Smart contracts written in Move language
- **High Throughput**: 50,000+ transactions per second
- **Sub-second Finality**: Transaction finality under 500ms
- **Minimal Fees**: Adaptive fee-burning mechanism
- **Delegated PoS**: Decentralized validator network

### Why Move for DeFi?

Move is a resource-oriented programming language designed specifically for blockchain assets:

```move
// In Move, assets are "resources" - they cannot be copied or deleted
struct Coin<phantom CoinType> has store {
    value: u64,
}
```

Key advantages:
- **Resource Safety**: Assets cannot be accidentally duplicated or lost
- **Type Safety**: Strong typing prevents common programming errors
- **Formal Verification**: Mathematical proofs of correctness
- **Native Asset Handling**: First-class support for digital assets

## Understanding Automated Market Makers (AMM)

### Traditional Order Books vs AMMs

Traditional exchanges match buyers and sellers through order books. AMMs replace this with:
- **Liquidity Pools**: Smart contracts holding reserves of token pairs
- **Mathematical Formulas**: Algorithms that determine exchange rates
- **Permissionless Trading**: Anyone can trade without counterparties

### Benefits of AMMs

1. **Always Available**: Liquidity is always present in the pool
2. **Decentralized**: No central authority controls trading
3. **Transparent**: All trades and reserves are on-chain
4. **Composable**: Can integrate with other DeFi protocols

## How Liquidity Pools Work

A liquidity pool is a smart contract containing reserves of two tokens that traders can swap between.

### Pool Structure in Move

```move
struct Pool<phantom CoinX, phantom CoinY> has key {
    reserve_x: Coin<CoinX>,    // Reserve of token X
    reserve_y: Coin<CoinY>,    // Reserve of token Y
    lp_supply: u64,            // Total LP token supply
    fee_percentage: u64,       // Trading fee (e.g., 30 = 0.3%)
}
```

### Liquidity Provider (LP) Tokens

When users add liquidity, they receive LP tokens representing their share of the pool:

```move
struct LPCoin<phantom CoinX, phantom CoinY> has store {
    // Represents ownership share in the pool
}
```

## The Constant Product Formula

The core of most AMMs is the constant product formula: **x × y = k**

Where:
- `x` = reserve of token X
- `y` = reserve of token Y  
- `k` = constant product (remains constant during swaps)

### Visual Example

```
Initial State: 1000 IOTA × 1000 stIOTA = 1,000,000 (k)

After swapping 100 IOTA for stIOTA:
New State: 1100 IOTA × 909.09 stIOTA ≈ 1,000,000 (k)

User receives: 1000 - 909.09 = 90.91 stIOTA
```

## Implementing Pools in Move

### Creating a Pool

```move
public fun create_pool<X, Y>(
    creator: &signer,
    initial_x: Coin<X>,
    initial_y: Coin<Y>,
    fee: u64
) {
    // Ensure pool doesn't already exist
    assert!(!pool_exists<X, Y>(), E_POOL_EXISTS);
    
    // Calculate initial LP tokens (geometric mean)
    let lp_amount = math::sqrt(coin::value(&initial_x) * coin::value(&initial_y));
    
    // Create the pool resource
    move_to(creator, Pool<X, Y> {
        reserve_x: initial_x,
        reserve_y: initial_y,
        lp_supply: lp_amount,
        fee_percentage: fee,
    });
    
    // Mint LP tokens to creator
    mint_lp_tokens<X, Y>(creator, lp_amount);
}
```

### Pool State Management

```move
// Get current reserves
public fun get_reserves<X, Y>(): (u64, u64) acquires Pool {
    let pool = borrow_global<Pool<X, Y>>(@pool_address);
    (
        coin::value(&pool.reserve_x),
        coin::value(&pool.reserve_y)
    )
}

// Calculate pool's constant k
public fun get_k_value<X, Y>(): u128 acquires Pool {
    let (x, y) = get_reserves<X, Y>();
    (x as u128) * (y as u128)
}
```

## Adding & Removing Liquidity

### Adding Liquidity

When adding liquidity, users must deposit both tokens in the current pool ratio:

```move
public fun add_liquidity<X, Y>(
    provider: &signer,
    coin_x: Coin<X>,
    coin_y: Coin<Y>,
    min_lp_amount: u64
): Coin<LPCoin<X, Y>> acquires Pool {
    let pool = borrow_global_mut<Pool<X, Y>>(@pool_address);
    
    let x_reserve = coin::value(&pool.reserve_x);
    let y_reserve = coin::value(&pool.reserve_y);
    let x_amount = coin::value(&coin_x);
    let y_amount = coin::value(&coin_y);
    
    // Check if amounts are in correct ratio
    assert!(x_amount * y_reserve == y_amount * x_reserve, E_INCORRECT_RATIO);
    
    // Calculate LP tokens to mint
    let lp_amount = if (pool.lp_supply == 0) {
        math::sqrt(x_amount * y_amount)
    } else {
        min(
            x_amount * pool.lp_supply / x_reserve,
            y_amount * pool.lp_supply / y_reserve
        )
    };
    
    assert!(lp_amount >= min_lp_amount, E_SLIPPAGE);
    
    // Add to reserves
    coin::merge(&mut pool.reserve_x, coin_x);
    coin::merge(&mut pool.reserve_y, coin_y);
    
    // Update LP supply
    pool.lp_supply = pool.lp_supply + lp_amount;
    
    // Mint LP tokens
    mint_lp_tokens<X, Y>(provider, lp_amount)
}
```

### Removing Liquidity

```move
public fun remove_liquidity<X, Y>(
    provider: &signer,
    lp_coins: Coin<LPCoin<X, Y>>,
    min_x: u64,
    min_y: u64
): (Coin<X>, Coin<Y>) acquires Pool {
    let pool = borrow_global_mut<Pool<X, Y>>(@pool_address);
    let lp_amount = coin::value(&lp_coins);
    
    // Calculate proportional share
    let x_amount = lp_amount * coin::value(&pool.reserve_x) / pool.lp_supply;
    let y_amount = lp_amount * coin::value(&pool.reserve_y) / pool.lp_supply;
    
    assert!(x_amount >= min_x && y_amount >= min_y, E_SLIPPAGE);
    
    // Burn LP tokens
    burn_lp_tokens(lp_coins);
    pool.lp_supply = pool.lp_supply - lp_amount;
    
    // Extract tokens from reserves
    let coin_x = coin::extract(&mut pool.reserve_x, x_amount);
    let coin_y = coin::extract(&mut pool.reserve_y, y_amount);
    
    (coin_x, coin_y)
}
```

## Swap Mechanics

### The Swap Function

The core swap logic maintains the constant product while accounting for fees:

```move
public fun swap_x_to_y<X, Y>(
    trader: &signer,
    coin_in: Coin<X>,
    min_out: u64
): Coin<Y> acquires Pool {
    let pool = borrow_global_mut<Pool<X, Y>>(@pool_address);
    
    let x_reserve = coin::value(&pool.reserve_x);
    let y_reserve = coin::value(&pool.reserve_y);
    let x_in = coin::value(&coin_in);
    
    // Apply fee (e.g., 0.3% = 30/10000)
    let x_in_with_fee = x_in * (10000 - pool.fee_percentage);
    
    // Calculate output using constant product formula
    // y_out = (x_in * y_reserve) / (x_reserve + x_in)
    // With fee: y_out = (x_in_with_fee * y_reserve) / (x_reserve * 10000 + x_in_with_fee)
    let numerator = (x_in_with_fee as u128) * (y_reserve as u128);
    let denominator = (x_reserve as u128) * 10000 + (x_in_with_fee as u128);
    let y_out = (numerator / denominator as u64);
    
    assert!(y_out >= min_out, E_SLIPPAGE);
    
    // Update reserves
    coin::merge(&mut pool.reserve_x, coin_in);
    let coin_out = coin::extract(&mut pool.reserve_y, y_out);
    
    // Emit swap event
    event::emit(SwapEvent {
        pool: @pool_address,
        trader: signer::address_of(trader),
        amount_in: x_in,
        amount_out: y_out,
    });
    
    coin_out
}
```

### Multi-hop Swaps

For tokens without direct pools, swaps can route through intermediate tokens:

```move
// Swap A -> B -> C
public fun multi_hop_swap<A, B, C>(
    trader: &signer,
    coin_a: Coin<A>,
    min_c_out: u64
): Coin<C> {
    // First swap A -> B
    let coin_b = swap_x_to_y<A, B>(trader, coin_a, 0);
    
    // Then swap B -> C
    swap_x_to_y<B, C>(trader, coin_b, min_c_out)
}
```

## Price Discovery & Slippage

### Price Calculation

The spot price is determined by the ratio of reserves:

```move
public fun get_spot_price<X, Y>(): u64 acquires Pool {
    let (x_reserve, y_reserve) = get_reserves<X, Y>();
    // Price of X in terms of Y
    (y_reserve * PRICE_SCALE) / x_reserve
}
```

### Price Impact & Slippage

Larger trades have greater price impact:

```move
public fun calculate_price_impact<X, Y>(amount_in: u64): u64 acquires Pool {
    let (x_reserve, y_reserve) = get_reserves<X, Y>();
    
    // Spot price before trade
    let price_before = (y_reserve * SCALE) / x_reserve;
    
    // Calculate output amount
    let y_out = calculate_swap_output(amount_in, x_reserve, y_reserve);
    
    // Effective price for this trade
    let effective_price = (y_out * SCALE) / amount_in;
    
    // Price impact percentage
    ((price_before - effective_price) * 100) / price_before
}
```

### Slippage Protection

Always use minimum output amounts to protect against MEV and price movements:

```move
let min_output = desired_output * 995 / 1000; // 0.5% slippage tolerance
let received = swap_x_to_y(coin_in, min_output);
```

## Fees & Incentives

### Trading Fees

Fees incentivize liquidity provision:

```move
struct FeeStructure {
    lp_fee: u64,        // e.g., 25 = 0.25% to LPs
    protocol_fee: u64,  // e.g., 5 = 0.05% to protocol
}
```

### Fee Distribution

```move
public fun distribute_fees<X, Y>(
    x_fees: u64,
    y_fees: u64
) acquires Pool, FeeCollector {
    let pool = borrow_global_mut<Pool<X, Y>>(@pool_address);
    let fee_collector = borrow_global_mut<FeeCollector>(@fee_address);
    
    // LP fees added to reserves (auto-compounding)
    let lp_x_fee = (x_fees * FEE_CONFIG.lp_fee) / 10000;
    let lp_y_fee = (y_fees * FEE_CONFIG.lp_fee) / 10000;
    
    pool.reserve_x.value += lp_x_fee;
    pool.reserve_y.value += lp_y_fee;
    
    // Protocol fees collected separately
    let protocol_x_fee = x_fees - lp_x_fee;
    let protocol_y_fee = y_fees - lp_y_fee;
    
    collect_protocol_fees(protocol_x_fee, protocol_y_fee);
}
```

## Security Considerations

### 1. Reentrancy Protection

Move's type system prevents reentrancy by default, but additional checks are prudent:

```move
struct PoolLock has key {
    locked: bool,
}

public fun swap_with_lock<X, Y>(...) acquires Pool, PoolLock {
    let lock = borrow_global_mut<PoolLock>(@pool_address);
    assert!(!lock.locked, E_REENTRANCY);
    lock.locked = true;
    
    // Perform swap
    let result = swap_internal<X, Y>(...);
    
    lock.locked = false;
    result
}
```

### 2. Overflow Protection

Use safe math operations:

```move
public fun safe_mul(a: u64, b: u64): u64 {
    assert!(a == 0 || b <= MAX_U64 / a, E_OVERFLOW);
    a * b
}
```

### 3. K Invariant Check

Always verify the constant product after operations:

```move
// After swap
let k_after = (coin::value(&pool.reserve_x) as u128) * 
              (coin::value(&pool.reserve_y) as u128);
assert!(k_after >= k_before, E_K_INVARIANT_VIOLATED);
```

### 4. Access Control

Implement proper permissions:

```move
struct PoolAdmin has key {
    admin: address,
}

public fun update_fee<X, Y>(
    admin: &signer,
    new_fee: u64
) acquires Pool, PoolAdmin {
    let admin_config = borrow_global<PoolAdmin>(@pool_address);
    assert!(signer::address_of(admin) == admin_config.admin, E_NOT_ADMIN);
    
    let pool = borrow_global_mut<Pool<X, Y>>(@pool_address);
    pool.fee_percentage = new_fee;
}
```

## Reference Implementation

### Complete Pool Module Structure

```move
module defi::amm {
    use std::signer;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::event;
    use aptos_std::math64;
    
    // Error codes
    const E_POOL_EXISTS: u64 = 1;
    const E_POOL_NOT_EXISTS: u64 = 2;
    const E_INSUFFICIENT_LIQUIDITY: u64 = 3;
    const E_SLIPPAGE: u64 = 4;
    const E_INCORRECT_RATIO: u64 = 5;
    const E_ZERO_AMOUNT: u64 = 6;
    
    // Constants
    const FEE_SCALE: u64 = 10000;
    const MIN_LIQUIDITY: u64 = 1000;
    
    // Pool structure
    struct Pool<phantom X, phantom Y> has key {
        reserve_x: Coin<X>,
        reserve_y: Coin<Y>,
        lp_supply: u64,
        fee_percentage: u64,
    }
    
    // LP token
    struct LPCoin<phantom X, phantom Y> {}
    
    // Events
    struct SwapEvent has drop, store {
        pool: address,
        trader: address,
        coin_in_type: string,
        coin_out_type: string,
        amount_in: u64,
        amount_out: u64,
    }
    
    struct LiquidityEvent has drop, store {
        pool: address,
        provider: address,
        amount_x: u64,
        amount_y: u64,
        lp_amount: u64,
        is_add: bool,
    }
    
    // Core functions implementation...
}
```

### Testing Your Implementation

```move
#[test_only]
module defi::amm_tests {
    use defi::amm;
    use aptos_framework::coin;
    
    #[test]
    fun test_constant_product() {
        // Create test account
        let account = account::create_account_for_test(@0x1);
        
        // Initialize coins
        coin::register<TestCoinA>(&account);
        coin::register<TestCoinB>(&account);
        
        // Create pool with 1000:1000
        let coin_a = coin::mint<TestCoinA>(1000);
        let coin_b = coin::mint<TestCoinB>(1000);
        amm::create_pool<TestCoinA, TestCoinB>(&account, coin_a, coin_b, 30);
        
        // Test swap
        let swap_in = coin::mint<TestCoinA>(100);
        let k_before = 1000 * 1000;
        
        let swap_out = amm::swap_x_to_y<TestCoinA, TestCoinB>(
            &account, 
            swap_in, 
            0
        );
        
        // Verify constant product maintained
        let (x_after, y_after) = amm::get_reserves<TestCoinA, TestCoinB>();
        let k_after = x_after * y_after;
        
        // K should increase slightly due to fees
        assert!(k_after >= k_before, 0);
    }
}
```

## Conclusion

Building DeFi pools on IOTA Rebased with Move combines the security guarantees of resource-oriented programming with the performance benefits of IOTA's infrastructure. The constant product AMM model provides a simple yet effective mechanism for decentralized trading.

Key takeaways:
- Move's resource system prevents common DeFi vulnerabilities
- The x × y = k formula ensures liquidity at all price levels
- Proper fee structures incentivize liquidity provision
- Security considerations are critical for production deployments

As IOTA Rebased launches in May 2025, developers can leverage these patterns to build secure, efficient, and scalable DeFi applications on the platform.

## Additional Resources

- [IOTA Rebased Documentation](https://wiki.iota.org)
- [Move Language Book](https://move-language.github.io/move/)
- [Pools Finance](https://app.pools.finance)
- [IOTA Developer Hub](https://developer.iota.org)

---

*This guide serves as a comprehensive introduction to implementing AMM-based DEXs on IOTA Rebased. Always conduct thorough testing and audits before deploying to mainnet.*