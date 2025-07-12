# Liquidity Pools

Provide liquidity to earn trading fees and support the IOTA DeFi ecosystem.

## What are Liquidity Pools?

Liquidity pools are smart contracts containing pairs of tokens that enable:
- Instant token swaps
- Price discovery
- Passive income for providers

## How Pools Work

### Constant Product Formula
```
x * y = k
```

The product of token reserves remains constant during swaps.

### Pool Shares
When you provide liquidity, you receive LP (Liquidity Provider) tokens representing your share of the pool.

## Providing Liquidity

### Step 1: Choose a Pool

Select from available pools:
- **IOTA/stIOTA** - Low impermanent loss
- **IOTA/vUSD** - Stable value exposure
- **stIOTA/vUSD** - Balanced risk/reward

### Step 2: Add Liquidity

1. Click "Add Liquidity"
2. Enter amount for first token
3. Second token amount auto-calculates
4. Review pool share percentage
5. Confirm transaction

### Step 3: Receive LP Tokens

LP tokens represent your share and can be:
- Held to earn fees
- Staked for additional rewards
- Burned to withdraw liquidity

## Earning Fees

### Fee Distribution
- **0.25%** of each swap goes to LPs
- Fees accumulate in the pool
- Compound automatically

### Calculating Returns
```
Daily Returns = (24h Volume × 0.25%) × Your Pool Share
APR = (Daily Returns × 365) / Your Liquidity Value
```

## Impermanent Loss

### What is IL?
Temporary loss compared to holding tokens separately, caused by price divergence.

### IL Calculator
| Price Change | IL Amount |
|--------------|-----------|
| 1.25x        | 0.6%      |
| 1.5x         | 2.0%      |
| 2x           | 5.7%      |
| 3x           | 13.4%     |
| 4x           | 20.0%     |

### Minimizing IL
1. **Correlated Pairs**: IOTA/stIOTA
2. **Stable Pairs**: vUSD pairs
3. **Balanced Exposure**: 50/50 allocation

## Removing Liquidity

### Process
1. Go to "Your Liquidity"
2. Select position to remove
3. Choose percentage (0-100%)
4. Confirm removal

### What You Receive
- Proportional share of both tokens
- Accumulated trading fees
- No withdrawal fees

## Pool Analytics

### Key Metrics
- **TVL**: Total Value Locked
- **24h Volume**: Daily trading volume
- **APR**: Annual Percentage Rate
- **Pool Share**: Your ownership percentage

### Performance Tracking
Monitor your positions:
- Current value
- Fees earned
- IL status
- Historical performance

## Advanced Strategies

### 1. Concentrated Liquidity
Focus liquidity in specific price ranges for higher capital efficiency.

### 2. LP Staking
Stake LP tokens for additional rewards:
- Protocol tokens
- Partner airdrops
- Governance rights

### 3. Yield Aggregation
Combine with other DeFi strategies:
- Lending protocols
- Yield farms
- Liquidity mining

## Risk Management

### Diversification
- Spread across multiple pools
- Mix stable and volatile pairs
- Regular rebalancing

### Monitoring Tools
- Price alerts
- IL warnings
- APR tracking
- Position analytics

## Smart Contract Security

### Audits
- Formal verification
- Third-party audits
- Bug bounty program

### Safety Features
- Timelock mechanisms
- Emergency pause
- Upgradability limits

## Tax Considerations

### Taxable Events
1. Adding liquidity (in some jurisdictions)
2. Removing liquidity
3. Claiming rewards

### Record Keeping
Track:
- Entry/exit prices
- Fee earnings
- Token quantities
- Transaction hashes

## Pool Creation

### Requirements
- Minimum liquidity: $1,000
- Equal value of both tokens
- Gas for deployment

### Process
1. Select "Create Pool"
2. Choose token pair
3. Set initial price
4. Add liquidity
5. Deploy contract

## API Reference

### Get Pool Info
```typescript
const pool = await getPool(tokenA, tokenB);
console.log({
  reserves: pool.reserves,
  tvl: pool.tvl,
  apr: pool.apr
});
```

### Add Liquidity
```typescript
const result = await addLiquidity({
  tokenA: "0x123...",
  tokenB: "0x456...",
  amountA: "1000000000",
  amountB: "2000000000",
  slippage: 0.5
});
```

## FAQs

### When to Provide Liquidity?
- High volume pairs
- Stable correlations
- Long-term holding

### How Often Are Fees Distributed?
- Continuously in real-time
- Compound automatically
- No claiming needed

### Can I Lose Money?
- Yes, through impermanent loss
- Fees usually offset small IL
- Consider time horizon

## Best Practices

1. **Start Small**: Test with small amounts
2. **Understand Risks**: Know about IL
3. **Monitor Regularly**: Track performance
4. **Rebalance**: Adjust positions as needed
5. **Take Profits**: Withdraw fees periodically

## Related Topics

- [Understanding AMMs](../technical/amm.md)
- [Yield Farming](./yield-farming.md)
- [Risk Management](../guides/risk-management.md)