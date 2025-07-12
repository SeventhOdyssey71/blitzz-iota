# Swaps

The IOTA DeFi Platform offers instant token swaps with competitive rates and minimal slippage.

## How Swaps Work

Our platform uses an Automated Market Maker (AMM) model with constant product formula:

```
x * y = k
```

Where:
- `x` = Reserve of token A
- `y` = Reserve of token B
- `k` = Constant product

## Supported Tokens

### Core Tokens
- **IOTA** - Native blockchain token
- **stIOTA** - Staked IOTA token
- **vUSD** - USD-pegged stablecoin

## Making a Swap

### 1. Select Tokens

Choose your input and output tokens from the dropdown menus.

### 2. Enter Amount

Enter the amount you want to swap. The interface will show:
- **Output Amount**: Amount you'll receive
- **Price Impact**: How your trade affects the price
- **Minimum Received**: Guaranteed minimum after slippage

### 3. Configure Settings

Click the settings icon to adjust:
- **Slippage Tolerance**: Maximum price change (default: 0.5%)
- **Transaction Deadline**: Time limit for execution

### 4. Execute Swap

1. Review all details
2. Click "Swap"
3. Confirm in your wallet
4. Wait for confirmation

## Understanding Price Impact

Price impact depends on:
- **Trade Size**: Larger trades have higher impact
- **Pool Liquidity**: More liquidity = less impact
- **Token Pair**: Some pairs have deeper liquidity

### Price Impact Levels
- **< 0.1%**: Negligible impact ✅
- **0.1% - 1%**: Low impact ✅
- **1% - 3%**: Medium impact ⚠️
- **> 3%**: High impact ⚠️

## Slippage Protection

Slippage occurs when the price changes between submission and execution.

### Setting Slippage
- **0.1%**: Only for stable pairs
- **0.5%**: Default for most swaps
- **1-3%**: For volatile tokens
- **> 3%**: High volatility or low liquidity

## Gas Optimization

### Tips to Save Gas
1. **Batch Transactions**: Combine multiple operations
2. **Optimal Timing**: Trade during low network activity
3. **Direct Routes**: Avoid multi-hop swaps when possible

## Advanced Features

### Multi-Route Swaps
The platform automatically finds the best route through multiple pools:
```
IOTA → stIOTA → vUSD
```

### MEV Protection
Built-in protection against:
- Front-running
- Sandwich attacks
- Price manipulation

## Swap Fees

### Fee Structure
- **Protocol Fee**: 0.3% per swap
- **LP Share**: 0.25% to liquidity providers
- **Treasury**: 0.05% to protocol treasury

### Fee Calculation
```
Output = Input * (1 - 0.003) * Exchange Rate
```

## API Integration

### Get Quote
```typescript
const quote = await getSwapQuote({
  inputToken: "0x123...",
  outputToken: "0x456...",
  inputAmount: "1000000000", // 1 IOTA
  slippage: 0.5
});
```

### Execute Swap
```typescript
const result = await executeSwap({
  inputToken,
  outputToken,
  inputAmount,
  minOutputAmount: quote.minimumReceived,
  deadline: Date.now() + 300000 // 5 minutes
});
```

## Common Issues

### "Insufficient Liquidity"
- Try smaller amount
- Check pool reserves
- Use different token pair

### "Price Impact Too High"
- Reduce trade size
- Wait for more liquidity
- Use limit orders instead

### "Transaction Failed"
- Check gas balance
- Verify token approvals
- Increase slippage tolerance

## Best Practices

1. **Always Review**: Check price impact and minimum received
2. **Use Limit Orders**: For large trades or specific prices
3. **Monitor Gas**: Keep enough IOTA for transaction fees
4. **Verify Addresses**: Ensure you're swapping correct tokens

## Related Features

- [Liquidity Pools](./pools.md) - Provide liquidity and earn fees
- [Limit Orders](./limit-orders.md) - Trade at specific prices
- [DCA](./dca.md) - Automate regular purchases