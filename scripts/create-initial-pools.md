# Create Initial Pools

This document explains how to create the initial pools needed for swap functionality.

## Problem Identified

The swap functionality is failing because no pools exist on-chain yet. The smart contracts are deployed correctly, but no liquidity pools have been created.

## Solution

1. **Automatic Pool Creation**: The `useAddLiquidity` hook automatically creates pools when none exist
2. **Manual Pool Creation**: Users can create pools through the pool interface
3. **Test Pool Creation**: We need at least one pool to enable swaps

## Required Actions

1. Open the application at http://localhost:3002
2. Connect a wallet with testnet IOTA and stIOTA
3. Navigate to the Pools tab
4. Add liquidity to create the first IOTA/stIOTA pool
5. This will enable swap functionality

## Debugging Commands

To debug in browser console:
```javascript
// Enable debug mode
window.debugPools = true;

// Check for existing pools
await PoolService.findPool(
  '0x2::iota::IOTA',
  '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT',
  'testnet'
);

// Clear pool cache
window.dispatchEvent(new Event('pool-cache-refresh'));
```

## Root Cause Analysis

1. ✅ Smart contracts are deployed correctly
2. ✅ Package exists and has all necessary functions
3. ❌ No pools have been created yet (0 events, 0 transactions)
4. ✅ Pool creation logic exists in useAddLiquidity hook
5. ✅ Cache clearing mechanisms are working

The fix is simply to create the first pool, which will enable all subsequent swaps.