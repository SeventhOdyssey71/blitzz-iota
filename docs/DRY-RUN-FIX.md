# Dry Run Error Fix

## Understanding the Issue

The "dry run" error occurs when trying to simulate a transaction before execution. This is a common issue with shared objects in Move/IOTA.

## The Solution

We've implemented the following fixes:

### 1. Removed Dry Run Completely
- Dry run is not necessary for most transactions
- Direct execution works fine with proper error handling
- Shared objects (like pools) don't work well with dry run

### 2. Improved Error Handling
- Better error messages for common issues
- Specific handling for gas errors
- Clear feedback to users

### 3. Pool Discovery Improvements
- Cache pool data to reduce lookups
- Track created pools in localStorage
- Known pools configuration for quick access

## How to Use

### Creating/Republishing Pools

```bash
# Set your private key
export PRIVATE_KEY="0x..."

# Republish the stIOTA/IOTA pool
npm run republish:stiota-pool

# Find existing pools
npm run find:pools
```

### In the Application

The application now:
1. Skips dry run for all transactions
2. Shows clear error messages
3. Automatically tracks new pools
4. Caches pool data for performance

## Common Errors and Solutions

### "No valid gas coins"
- Ensure you have enough IOTA (at least 0.2 IOTA for gas)
- The app now reserves gas automatically

### "Pool not found"
- Run `npm run republish:stiota-pool` to create the pool
- Check `created-pools.json` for pool IDs
- The app will auto-detect new pools

### "Insufficient balance"
- Check you have both tokens for the swap
- For IOTA swaps, extra is reserved for gas

## Technical Details

### Transaction Building
```typescript
// No more dry run
const result = await client.signAndExecuteTransaction({
  transaction: tx,
  signer: keypair,
  options: {
    showEffects: true,
    showObjectChanges: true,
    showEvents: true,
  },
});
```

### Pool Tracking
```typescript
// Pools are tracked in:
// 1. config/known-pools.ts (hardcoded)
// 2. localStorage (dynamic)
// 3. created-pools.json (for reference)
```

## Best Practices

1. **Always test on testnet first**
2. **Keep track of pool IDs**
3. **Monitor gas usage**
4. **Check balances before swaps**

## Troubleshooting

If you still see dry run errors:
1. Clear browser cache
2. Restart the dev server
3. Check network connection
4. Verify package deployment

The platform now works without dry run and provides a smoother experience!