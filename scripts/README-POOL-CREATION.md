# Pool Creation Guide

This guide explains how to create liquidity pools for the IOTA DeFi Platform.

## Prerequisites

1. **IOTA Testnet Wallet** with sufficient balance:
   - IOTA tokens for gas fees
   - Both tokens you want to create a pool for
   
2. **Private Key** from your wallet (keep this secure!)

3. **Node.js** and dependencies installed

## Creating the stIOTA/IOTA Pool

### Step 1: Get Test Tokens

First, ensure you have both stIOTA and IOTA tokens:

1. Get IOTA from the testnet faucet: https://faucet.testnet.iota.cafe
2. Get stIOTA by staking some of your IOTA tokens

### Step 2: Set Your Private Key

Export your private key as an environment variable:

```bash
export PRIVATE_KEY="0x...your-private-key-here..."
```

⚠️ **Security Warning**: Never share your private key or commit it to git!

### Step 3: Run the Pool Creation Script

Run the script to create the stIOTA/IOTA pool:

```bash
npm run create:stiota-pool
```

This will:
1. Check your balances
2. Create a pool with 1000 stIOTA and 1000 IOTA (1:1 ratio)
3. Deploy the pool to the blockchain
4. Save the pool ID for reference

### Expected Output

```
🚀 Creating stIOTA/IOTA liquidity pool...

📍 Creating pool from address: 0x...

💧 Creating pool for stIOTA/IOTA
📊 Initial liquidity: 1000000000000 stIOTA + 1000000000000 IOTA

🔍 Checking balances...
✅ stIOTA balance: 5000000000000
✅ IOTA balance: 10000000000000

📝 Building transaction...

🔄 Executing transaction...

✅ Pool created successfully!
📝 Transaction digest: ABCDEF123456...
🏊 Pool ID: 0x1234567890abcdef...

🎉 stIOTA/IOTA pool is now live!
Users can now swap between stIOTA and IOTA at a 1:1 ratio

📄 Pool info saved to created-pools.json
```

## Creating Other Pools

To create pools for other token pairs, modify the `poolConfig` in the script:

```typescript
const poolConfig = {
  coinA: SUPPORTED_COINS.IOTA,
  coinB: SUPPORTED_COINS.vUSD,
  amountA: '1000000000000', // Amount of first token
  amountB: '280000000000',  // Amount of second token
};
```

## Verifying Pool Creation

After creating a pool:

1. Check `created-pools.json` for the pool ID
2. The pool will automatically appear in the UI
3. Users can immediately start swapping tokens

## Pool Management

### Adding Liquidity

Once a pool is created, users can add more liquidity through the UI:
1. Go to the "Pools" section
2. Select "Add Liquidity"
3. Choose the pool and amounts
4. Confirm the transaction

### Removing Liquidity

LP token holders can remove their liquidity:
1. Go to "Your Liquidity"
2. Select the position
3. Choose amount to remove
4. Confirm the transaction

## Troubleshooting

### "Insufficient balance" Error
- Ensure you have enough of both tokens
- Remember to account for gas fees (keep extra IOTA)

### "Transaction failed" Error
- Check that the package is deployed
- Verify the correct network (testnet/mainnet)
- Ensure no duplicate pools exist

### Pool Not Appearing in UI
- Wait a few seconds for indexing
- Refresh the page
- Check that pool discovery is working

## Technical Details

The pool creation uses the `simple_dex::create_pool` function from our Move smart contracts:

```move
public entry fun create_pool<CoinA, CoinB>(
    coin_a: Coin<CoinA>,
    coin_b: Coin<CoinB>,
    ctx: &mut TxContext
)
```

This creates:
1. A shared `Pool` object containing reserves
2. LP tokens representing the liquidity provider's share

## Security Considerations

1. **Initial Price**: The ratio of tokens determines the initial price
2. **Minimum Liquidity**: Consider adding substantial initial liquidity to prevent manipulation
3. **LP Tokens**: Keep your LP tokens safe - they represent your pool share

## Next Steps

After creating the pool:
1. Test swapping in both directions
2. Monitor pool performance
3. Consider adding more liquidity
4. Share the pool with the community

For questions or issues, please open an issue on GitHub or ask in Discord.