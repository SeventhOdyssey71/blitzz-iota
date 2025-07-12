# Introduction

Welcome to the IOTA DeFi Platform documentation. This comprehensive guide will help you understand, use, and build on our decentralized exchange.

## What is IOTA DeFi Platform?

IOTA DeFi Platform is a next-generation decentralized exchange (DEX) built on the IOTA blockchain. We provide:

- **Instant token swaps** with minimal fees
- **Liquidity pools** for passive income
- **Advanced trading** features like limit orders and DCA
- **Cross-chain bridges** for asset interoperability
- **Secure smart contracts** built with Move

## Why IOTA?

### Speed & Scalability
- Near-instant transaction finality
- High throughput for DeFi operations
- Parallel transaction processing

### Low Costs
- Minimal transaction fees
- Cost-effective for all trade sizes
- No MEV exploitation

### Security
- Move language safety guarantees
- Formal verification capabilities
- Battle-tested consensus mechanism

## Core Features

### 🔄 Swaps
Trade tokens instantly with our efficient AMM:
- Best price routing
- MEV protection
- Low slippage

### 💧 Liquidity Pools
Earn fees by providing liquidity:
- Competitive APRs
- Auto-compounding
- Flexible positions

### 📊 Limit Orders
Set your price and wait:
- No gas until execution
- Partial fills supported
- Advanced order types

### 💰 DCA (Dollar Cost Averaging)
Automate your investment strategy:
- Customizable intervals
- Multiple strategies
- Gas-efficient execution

## Getting Started

1. **[Connect Wallet](./getting-started.md#connect-your-wallet)** - Link your IOTA wallet
2. **[Make a Swap](./features/swaps.md)** - Trade your first tokens
3. **[Provide Liquidity](./features/pools.md)** - Earn trading fees
4. **[Explore Features](./features/limit-orders.md)** - Try advanced trading

## Architecture Overview

Our platform consists of three main layers:

### Frontend Layer
- Next.js 15 with React 19
- TypeScript for type safety
- Tailwind CSS for styling
- IOTA dApp Kit integration

### Smart Contract Layer
- Move language contracts
- Modular architecture
- Upgradeable design
- Comprehensive testing

### Infrastructure Layer
- IOTA blockchain
- Price oracles
- Analytics engine
- Monitoring systems

## Security First

Security is our top priority:

- ✅ **Audited Contracts** - Multiple security audits
- ✅ **Bug Bounty** - Ongoing security program
- ✅ **Formal Verification** - Mathematical proofs
- ✅ **Time-locks** - Protection mechanisms

## Join Our Community

Connect with other users and developers:

- 💬 [Discord](https://discord.gg/iota-defi) - Chat with the community
- 🐦 [Twitter](https://twitter.com/iota_defi) - Latest updates
- 📧 [Newsletter](https://iota-defi.com/newsletter) - Weekly insights
- 🐛 [GitHub](https://github.com/iota-defi) - Contribute code

## Quick Stats

- **Total Value Locked**: $10M+
- **24h Volume**: $1M+
- **Unique Users**: 10,000+
- **Supported Tokens**: 20+

## Start Building

Developers can integrate with our platform:

```typescript
import { IotaDeFi } from '@iota-defi/sdk';

const defi = new IotaDeFi({
  network: 'mainnet',
  provider: window.ethereum
});

// Get swap quote
const quote = await defi.getSwapQuote({
  from: 'IOTA',
  to: 'vUSD',
  amount: '100'
});
```

## Need Help?

- 📖 Read our [FAQs](./guides/troubleshooting.md)
- 🎓 Watch [video tutorials](https://youtube.com/iota-defi)
- 💬 Ask in [Discord](https://discord.gg/iota-defi)
- 📧 Email [support@iota-defi.com](mailto:support@iota-defi.com)

---

Ready to dive in? Start with our [Getting Started Guide](./getting-started.md) →