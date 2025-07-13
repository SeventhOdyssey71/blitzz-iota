# Pool Creation Guide

## Issue Resolution

The transaction issue (only deducting gas fees) was caused by **no pools existing** for the new smart contract package. Transactions were failing because they couldn't find pools to interact with.

## How to Create IOTA/stIOTA Pool

### Option 1: Using the Web Interface (Recommended)

1. **Navigate to the Pool page** in your browser
2. **Click "Create Pool"** button
3. **Fill in the form:**
   - Token A: Select **IOTA**
   - Token B: Select **stIOTA**
   - Amount A: Enter **100** (or your desired amount)
   - Amount B: Enter **100** (should match Amount A for 1:1 initial ratio)
4. **Click "Create Pool"** at the bottom
5. **Approve the transaction** in your wallet

### Option 2: Using Command Line Script

1. Set your private key as environment variable:
   ```bash
   export IOTA_PRIVATE_KEY="your-private-key-here"
   ```

2. Run the pool creation script:
   ```bash
   npx tsx scripts/create-iota-stiota-pool.ts
   ```

### Option 3: Using Browser Console

1. Open the DeFi platform in your browser
2. Connect your wallet
3. Open browser console (F12)
4. Paste and run:
   ```javascript
   // Load the script
   const script = await fetch('/scripts/browser-create-pool.js').then(r => r.text());
   eval(script);
   
   // Follow the instructions printed in console
   ```

## After Pool Creation

Once the pool is created:
1. The pool ID will be automatically tracked in localStorage
2. Swaps and liquidity operations will start working
3. You'll see the pool in the "Liquidity Pools" section

## Technical Details

- **Package ID**: `0x48771ce38050f6481651240079e5aa58bf5f2f58d76cf294db976d2ac445018d`
- **Module**: `simple_dex`
- **Fee**: 1.8% (18/1000)
- **Initial Liquidity**: Recommended 100 IOTA + 100 stIOTA

## Troubleshooting

If pool creation fails:
1. Ensure you have sufficient balance (need 100+ IOTA and 100+ stIOTA)
2. Check that your wallet is connected to IOTA testnet
3. Verify the package ID matches the one in `config/iota.config.ts`
4. Try using a smaller amount if you get overflow errors

## What Was Fixed

1. **Enhanced debugging** in swap and liquidity hooks to identify the issue
2. **Fixed IOTA coin handling** in CreatePool component to use `tx.gas`
3. **Added pool tracking** to automatically save created pools
4. **Created helper scripts** for easy pool creation