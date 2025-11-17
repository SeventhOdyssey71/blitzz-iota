# Blitzz - DeFi Platform on IOTA

A decentralized finance platform built on IOTA's Move VM, providing automated market making, liquidity pools, and token swapping capabilities.

## Overview

Blitzz is a comprehensive DeFi platform that brings advanced trading and liquidity provision features to the IOTA ecosystem. Built with modern web technologies and Move smart contracts, it offers a seamless and secure trading experience.

## Features

### Core Functionality
- **Automated Market Maker (AMM)**: Constant product formula (x*y=k) based trading
- **Token Swaps**: Direct and multi-hop token swapping with optimized routing
- **Liquidity Pools**: Add and remove liquidity with proportional LP token distribution
- **Price Impact Calculation**: Real-time slippage and price impact warnings
- **Dynamic Fees**: Configurable fee structures (0.3% - 1.8%)

### Technical Features
- Move VM smart contracts for secure on-chain operations
- Real-time pool discovery and caching
- Optimized gas handling for IOTA transactions
- Comprehensive error handling and user feedback
- Responsive UI with dark mode support

## Technology Stack

- **Frontend**: Next.js 15, TypeScript, React 19
- **Styling**: Tailwind CSS, Radix UI components
- **Blockchain**: IOTA SDK, Move smart contracts
- **State Management**: TanStack Query
- **Form Handling**: React Hook Form with Zod validation

## Project Structure

```
/
├── app/              # Next.js app router pages
├── components/       # React components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and services
│   ├── contracts/   # Smart contract interactions
│   ├── services/    # Business logic and API services
│   └── utils/       # Helper functions
├── move/            # Move smart contracts
└── public/          # Static assets
```

## Smart Contracts

The platform uses Move smart contracts deployed on IOTA testnet:
- `simple_dex`: Core AMM and swap functionality
- Pool management and liquidity provision
- Governance and oracle modules

## Getting Started

### Prerequisites

- Node.js 18+ 
- PNPM package manager
- IOTA wallet for testnet

### Installation

```bash
# Clone the repository
git clone https://github.com/SeventhOdyssey71/blitzz-iota.git

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_IOTA_NETWORK=testnet
NEXT_PUBLIC_PACKAGE_ID=your_package_id
```

## Usage

1. Connect your IOTA wallet
2. Select tokens to swap
3. Enter amount and review price impact
4. Confirm transaction in wallet
5. Monitor transaction status

## Pool Management

Users can:
- Add liquidity to existing pools or create new ones
- Remove liquidity and claim fees
- Monitor pool analytics and APR

## Development

```bash
# Run tests
pnpm test

# Build for production
pnpm build

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## Deployment

The platform is deployed on Vercel with automatic deployments from the main branch.

## Security

- All smart contracts are written in Move for resource safety
- Comprehensive input validation and error handling
- Slippage protection on all swaps
- No admin keys or upgradeable contracts

## Contributing

Contributions are welcome. Please open an issue first to discuss proposed changes.

## License

MIT License

## Contact

For questions or support, please open an issue on GitHub.