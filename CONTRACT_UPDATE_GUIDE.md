# Contract Update Guide - Fix Swap Token Transfers

## Issue
Swap transactions are succeeding but not showing token transfers (input/output) in the transaction.

## Root Causes
1. The swap formula in the Move contract was using an overflow-prevention pattern that could cause calculation errors
2. No pool exists for the token pair being swapped
3. Pool has insufficient liquidity

## Fix Applied

### 1. Updated Move Contract Formula
Changed from complex overflow prevention to direct AMM formula:
```move
// OLD (could cause issues)
let amount_out = if (reserve_b > reserve_a + amount_in_after_fee) {
    amount_in_after_fee * (reserve_b / (reserve_a + amount_in_after_fee))
} else {
    (amount_in_after_fee / (reserve_a + amount_in_after_fee)) * reserve_b
};

// NEW (correct AMM formula)
let amount_out = (amount_in_after_fee * reserve_b) / (reserve_a + amount_in_after_fee);
```

### 2. Steps to Deploy Fixed Contract

```bash
# 1. Navigate to Move directory
cd move/arva

# 2. Build the updated contract
iota move build

# 3. Publish to testnet
iota client publish --gas-budget 100000000

# 4. Update frontend with new package ID
npx tsx scripts/update-package-id.ts <NEW_PACKAGE_ID>

# 5. Clear browser data
# In browser console: localStorage.clear(); location.reload();
```

### 3. Create New Pool with Liquidity

After deploying the fixed contract:
1. Go to Pool page
2. Create IOTA/stIOTA pool with sufficient liquidity (e.g., 100 IOTA + 100 stIOTA)
3. Verify pool creation in console logs

### 4. Test Swap

1. Try a small swap (e.g., 1 IOTA to stIOTA)
2. Check browser console for:
   - "Balance changes" should show both input decrease and output increase
   - "Input token change" should show negative amount
   - "Actual output amount" should show positive amount

### 5. Verify on Explorer

Check the transaction on IOTA Explorer:
- Status should be "Success"
- Balance Changes section should show:
  - Negative amount for input token
  - Positive amount for output token
  - Small negative amount for gas

## Debugging Checklist

If swaps still don't show token transfers:
1. ✓ Verify pool exists: Check console for "Pool discovery result"
2. ✓ Check pool liquidity: Ensure reserves > 0
3. ✓ Verify package ID matches in config/iota.config.ts
4. ✓ Check transaction status in console logs
5. ✓ Look for "WARNING: No balance changes detected" in console

## Expected Console Output

Successful swap should show:
```
Swap - Pool discovery result: {poolId: "0x...", reserveA: "100000000000", reserveB: "100000000000"}
Balance changes: [
  {owner: "0x...", coinType: "0x2::iota::IOTA", amount: "-1000000000"},
  {owner: "0x...", coinType: "0x...::cert::CERT", amount: "980000000"}
]
Input token change: -1000000000 IOTA
Actual output amount: 0.98 stIOTA
```