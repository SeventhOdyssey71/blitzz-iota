# IOTA DeFi Platform Documentation

Welcome to the official documentation for the IOTA DeFi Platform - your gateway to decentralized trading on the IOTA blockchain.

## Overview

The IOTA DeFi Platform is a comprehensive decentralized exchange (DEX) built on the IOTA blockchain, offering advanced trading features with a focus on security, efficiency, and user experience.

### Key Features

- **Instant Swaps** - Trade tokens instantly with minimal fees
- **Liquidity Pools** - Provide liquidity and earn rewards
- **Limit Orders** - Set your price and trade automatically
- **DCA Trading** - Dollar-cost average your investments
- **Advanced AMM** - Optimized automated market maker

## Quick Links

- [Getting Started](./getting-started.md)
- [Swaps Guide](./features/swaps.md)
- [Liquidity Pools](./features/pools.md)
- [Smart Contracts](./technical/smart-contracts.md)
- [API Reference](./api/reference.md)

## Platform Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (Next.js)             │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
│  │   Swap    │  │   Pools   │  │ Limit/DCA   │ │
│  └───────────┘  └───────────┘  └─────────────┘ │
└─────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────┐
│              IOTA SDK & dApp Kit                │
└─────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────┐
│           Smart Contracts (Move)                │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
│  │    DEX    │  │Limit Order│  │     DCA     │ │
│  └───────────┘  └───────────┘  └─────────────┘ │
└─────────────────────────────────────────────────┘
                         │
┌─────────────────────────────────────────────────┐
│              IOTA Blockchain                    │
└─────────────────────────────────────────────────┘
```

## Supported Networks

- **Mainnet** - Production environment
- **Testnet** - Testing environment with test tokens
- **Devnet** - Development environment

## Community & Support

- [Discord](https://discord.gg/iota)
- [Twitter](https://twitter.com/iota)
- [GitHub](https://github.com/iota)

---

*Built with ❤️ on IOTA*