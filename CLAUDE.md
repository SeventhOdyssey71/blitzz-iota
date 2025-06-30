# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Iota is a decentralized finance (DeFi) platform built on the IOTA blockchain using Move smart contracts. It provides swap, limit order, and dollar-cost averaging (DCA) functionality.

## Common Development Commands

```bash
# Install dependencies (IMPORTANT: use --legacy-peer-deps due to React 19)
npm install --legacy-peer-deps

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Start production server
npm start

# Deploy smart contracts
npm run deploy:contracts
```

## Project Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router (React 19)
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with Suprema font
- **UI Components**: Radix UI primitives + shadcn/ui (50+ components)
- **State Management**: React hooks and IOTA dApp Kit
- **Blockchain**: IOTA SDK with wallet integration
- **Data Fetching**: TanStack Query v5

### Smart Contracts (Move)
- **Location**: `/move/arva/sources/`
- **Package Name**: Iota (Move edition 2024.stable)
- **Modules**:
  - `dex.move`: AMM swap functionality and liquidity pools
  - `limit_order.move`: Limit order book implementation
  - `dca.move`: Dollar-cost averaging strategies

### Key Directories
- `/app`: Next.js app router pages and layouts
  - `/api/prices`: Price feed endpoints
  - `/api/swap`: Swap functionality endpoints
- `/components`: Reusable React components
  - `/ui`: shadcn/ui component library
  - Swap interface, token selector, wallet components
- `/lib`: Utility libraries
  - `/iota`: IOTA blockchain integration
  - `/contracts`: Smart contract interfaces
  - `/services`: Service layer implementations
- `/config`: Configuration files for IOTA networks
- `/hooks`: Custom React hooks for wallet and balance management
- `/move/arva`: Move smart contracts and tests
- `/public/icons` & `/public/tokens`: Asset files
- `/scripts`: Deployment scripts

## IOTA Integration

The project uses the IOTA dApp Kit for wallet connectivity and blockchain interactions:
- Wallet connection handled by `@iota/dapp-kit`
- Network configuration in `/config/iota.config.ts`
- Provider setup in `/lib/iota/providers.tsx`
- Multiple IOTA SDK packages: `@iota/iota-sdk`, `@iota/sdk`, `@iota/bcs`

## Environment Variables

Create a `.env` file with:
```
NEXT_PUBLIC_CHAIN="iota"
BLOCKBERRY_API_KEY="your-api-key"
```

## Testing Smart Contracts

```bash
# Navigate to Move project
cd move/arva

# Build Move packages
iota move build

# Run Move tests
iota move test
```

## Important Considerations

1. **React Version**: Uses React 19 - always use `--legacy-peer-deps` for npm installs
2. **Build Configuration**: Next.js config ignores TypeScript/ESLint errors during build
3. **Wallet Integration**: The app uses IOTA wallet standards for connection
4. **Network Support**: Configured for mainnet, testnet, and devnet
5. **Font Loading**: Suprema font is loaded via CDN in globals.css
6. **Component Library**: Extensive shadcn/ui component library in `/components/ui`
7. **Move Package**: Located at `/move/arva` (not `/move/Iota`)