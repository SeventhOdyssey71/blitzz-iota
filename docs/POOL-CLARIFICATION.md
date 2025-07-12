# Important: Bidirectional Pool Swaps

## Understanding AMM Pools

**Key Point**: A single liquidity pool supports swaps in BOTH directions!

When you create a pool for stIOTA/IOTA, it automatically enables:
- ✅ Swapping from stIOTA → IOTA
- ✅ Swapping from IOTA → stIOTA

## How It Works

The pool contains reserves of both tokens:
```
Pool: stIOTA/IOTA
├── Reserve A: 1000 stIOTA
└── Reserve B: 1000 IOTA
```

### When a user swaps stIOTA → IOTA:
1. User deposits stIOTA into the pool
2. Pool gives IOTA back to the user
3. Pool now has more stIOTA, less IOTA

### When a user swaps IOTA → stIOTA:
1. User deposits IOTA into the pool
2. Pool gives stIOTA back to the user
3. Pool now has more IOTA, less stIOTA

## No Need for Separate Pools

You do NOT need:
- ❌ One pool for stIOTA → IOTA
- ❌ Another pool for IOTA → stIOTA

Instead, you have:
- ✅ One pool that handles both directions

## Code Implementation

The smart contract already supports both directions:

```move
// Swap A to B (stIOTA to IOTA)
public entry fun swap_a_to_b<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    coin_a: Coin<CoinA>,
    ctx: &mut TxContext
)

// Swap B to A (IOTA to stIOTA)
public entry fun swap_b_to_a<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    coin_b: Coin<CoinB>,
    ctx: &mut TxContext
)
```

## In the UI

The swap interface automatically detects which function to call based on:
- Input token selection
- Output token selection

When users select:
- Input: stIOTA, Output: IOTA → Uses `swap_a_to_b`
- Input: IOTA, Output: stIOTA → Uses `swap_b_to_a`

## Summary

Your stIOTA/IOTA pool already supports bidirectional swaps! Users can:
1. Stake IOTA to get stIOTA
2. Unstake stIOTA to get IOTA back

All using the same liquidity pool at a 1:1 ratio.