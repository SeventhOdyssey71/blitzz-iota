# Contract Republishing Guide

## Quick Method (Automated Script)

Run this single command:
```bash
./scripts/republish-and-update.sh
```

This script will:
1. Build the Move package
2. Run tests
3. Publish to testnet
4. Extract the new package ID
5. Update the frontend config automatically

## Manual Method (Step by Step)

### Step 1: Build and Test the Contract

```bash
cd move/arva
iota move build
iota move test
```

### Step 2: Publish to Testnet

```bash
iota client publish --gas-budget 100000000
```

You'll see output like:
```
╭─────────────────────────────────────────────────────────────────────╮
│ Object Changes                                                      │
├─────────────────────────────────────────────────────────────────────┤
│ Created Objects:                                                    │
│  ┌──                                                                │
│  │ ObjectID: 0x1234567890abcdef...                                  │
│  │ ObjectType: 0x2::package::Package                                │
│  └──                                                                │
╰─────────────────────────────────────────────────────────────────────╯
```

### Step 3: Update Frontend Config

Copy the Package ObjectID and run:
```bash
npx tsx scripts/update-package-id.ts 0x1234567890abcdef...
```

### Step 4: Clear Browser Data

Open your browser console and run:
```javascript
localStorage.clear(); 
location.reload();
```

### Step 5: Create New Pools

1. Go to the Pool page
2. Click "Create Pool" or use the pool interface
3. Create IOTA/stIOTA pool with your desired amounts

## What This Does

1. **New Package ID**: Deploys a fresh instance of the smart contract
2. **Clean State**: No existing pools or liquidity positions
3. **Updated Frontend**: Automatically points to the new contract
4. **Fresh Start**: Ready to create new pools and test

## Verification

After republishing:
1. Check `config/iota.config.ts` - should show new package ID
2. Pool page should show no existing pools
3. TVL should be $0.00
4. Ready to create fresh pools

## Troubleshooting

If the automated script fails:
- Ensure you have IOTA CLI installed
- Check that you're connected to testnet
- Make sure you have sufficient IOTA for gas
- Use the manual method if needed