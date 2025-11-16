# 🚀 IOTA DeFi Platform - Advanced Move VM Implementation

A cutting-edge DeFi platform built on IOTA blockchain leveraging advanced Move VM patterns and capabilities. Features flash loans, DAO governance, price oracles, and high-precision mathematical operations.

## ✨ Core Features

### **DeFi Protocol**
- **🔄 Automated Market Maker (AMM)**: IOTA ↔ stIOTA trading with constant product formula
- **💧 Liquidity Provision**: Add/remove liquidity with LP tokens and fee earning
- **🏦 Liquid Staking**: Stake IOTA for stIOTA with no lock-up (14.64% APY)
- **📊 Real-time Analytics**: Live prices, TVL, volume, and market metrics

### **Advanced IOTA Move Features** 🆕
- **⚡ Flash Loans**: Uncollateralized loans with Hot Potato pattern enforcement
- **🏛️ DAO Governance**: Capability-based proposals, voting, and time-locked execution  
- **🔮 Price Oracles**: Multi-source aggregation with confidence scoring and TWAP
- **🧮 Advanced Math**: 18-decimal precision for accurate DeFi calculations

### **Performance & UX**
- **📱 Responsive Design**: Optimized for desktop and mobile
- **⚡ 50,000+ TPS**: IOTA's DAG + Move VM architecture
- **🔗 Dual VM Support**: Move L1 + EVM L2 compatibility
- **💸 Fee-less Operations**: Basic transactions with no fees

## 🛠️ Technology Stack

### **Frontend**
- **Next.js 15** with App Router and React 19
- **TypeScript** with strict mode
- **Tailwind CSS** with custom design system
- **Radix UI** + shadcn/ui components (50+)
- **TanStack Query** v5 for state management

### **Blockchain**
- **IOTA dApp Kit** for wallet integration
- **Move Smart Contracts** on IOTA testnet
- **Multi-language SDK**: Rust, TypeScript, WASM

### **Advanced Patterns**
- **Hot Potato Pattern**: Atomic transaction enforcement
- **Capability Pattern**: Unforgeable authorization tokens
- **Programmable Transaction Blocks (PTBs)**: Up to 1,024 operations
- **Fixed-Point Arithmetic**: 18-decimal precision calculations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (React 19 support)
- npm with `--legacy-peer-deps` flag

### Installation

```bash
# Clone repository
git clone <repository-url>
cd cetus-dfi-platform

# Install dependencies (IMPORTANT: use --legacy-peer-deps)
npm install --legacy-peer-deps

# Start development server
npm run dev

# Build for production  
npm run build

# Deploy Move contracts (optional)
npm run deploy:contracts
```

### Environment Setup

```env
# Required
NEXT_PUBLIC_CHAIN="iota"
BLOCKBERRY_API_KEY="your-api-key"

# Contract Addresses (Auto-configured)
NEXT_PUBLIC_PACKAGE_ID="0x77b13360aed35d4ce94326e1dd52ec783f16b94c851a4c1b3ed98bb52ce31187"
NEXT_PUBLIC_STAKING_POOL_ADDRESS="0xca1239c9b8162ea0d9b0e46fa22705ce739ac74da63de1e17f94b1b8544cb3e1"
```

## 🏗️ Project Architecture

### **Smart Contracts** (`/move/arva/sources/`)
```
├── dex.move              # Core AMM implementation
├── flash_loan.move       # Hot Potato pattern flash loans
├── governance.move       # Capability-based DAO
├── oracle.move          # Multi-source price feeds  
└── advanced_math.move   # High-precision calculations
```

### **Frontend Structure**
```
├── app/                 # Next.js App Router pages
├── components/          # React components (50+ UI components)
├── hooks/              # Custom hooks (advanced Move integrations)  
├── lib/                # Services and utilities
├── config/             # IOTA network configurations
└── public/             # Static assets and icons
```

### **Advanced Hooks** (`/hooks/`)
- **`use-flash-loan.ts`** - Atomic arbitrage and liquidation strategies
- **`use-governance.ts`** - DAO proposal management and voting
- **`use-oracle.ts`** - Price feed monitoring with analytics
- **`use-advanced-math.ts`** - High-precision DeFi calculations

## 🔥 Advanced Features

### **Flash Loans with Hot Potato Pattern**
```typescript
const { executeFlashLoan, createFlashLoanArbitrage } = useFlashLoan();

// Arbitrage between pools
await createFlashLoanArbitrage(
  poolA, poolB, tokenIn, tokenOut, flashLoanPool, borrowAmount
);
```

### **DAO Governance**
```typescript  
const { createProposal, vote, executeProposal } = useGovernance();

// Create treasury proposal
await createProposal({
  title: "Treasury Allocation",
  description: "Allocate 100 IOTA for development",
  actions: [{ actionType: 1, target: devAddress, amount: "100" }]
});
```

### **Price Oracle Integration**
```typescript
const { monitorPriceFeeds, calculatePriceChange } = useOracle();

// Monitor multiple feeds with confidence scoring
await monitorPriceFeeds([iotaFeed, stiotaFeed, vusdFeed]);
```

## 📊 Key Metrics & Performance

- **⚡ Transaction Speed**: 50,000+ TPS with sub-500ms finality
- **💰 Staking APY**: ~14.64% with liquid staking (no lock-up)
- **🔧 Gas Efficiency**: ~0.005 IOTA per transaction
- **📦 Bundle Size**: Optimized to <260kB first load
- **🏛️ Governance**: Time-locked proposals with delegation support

## 🔒 Security Features

### **Move Language Safety**
- **Resource Safety**: Automatic memory management
- **Type Safety**: Compile-time error prevention  
- **Formal Verification**: Mathematical correctness proofs

### **Economic Security**  
- **Flash Loan Fees**: Prevent abuse, generate revenue
- **Governance Delays**: Time to respond to malicious proposals
- **Oracle Aggregation**: Multi-source deviation protection

### **Access Controls**
- **Capability Pattern**: Unforgeable authorization  
- **Multi-signature**: Distributed control for critical ops
- **Time Locks**: Delayed execution for security

## 🛣️ Roadmap

### **Phase 2** (Q1 2025)
- Cross-chain bridge integration (EVM L2)
- Advanced oracle networks (Chainlink-style)
- MEV protection mechanisms
- Quadratic voting governance

### **Phase 3** (Q2 2025)  
- Lending/borrowing protocols
- Derivative products (options, futures)
- Real-world asset tokenization
- Institutional-grade security audits

## 📚 Documentation

- **[IOTA Move Features](./IOTA_MOVE_FEATURES.md)** - Advanced patterns and implementations
- **[Smart Contract Guide](./CLAUDE.md)** - Development and deployment guide
- **[API Documentation](./docs/)** - Component and hook references

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### **Development Guidelines**
- Use TypeScript strict mode
- Follow React 19 patterns  
- Test Move contracts thoroughly
- Maintain 18-decimal precision
- Document advanced patterns

## 📄 License

**MIT License** - Open source DeFi innovation

---

**Built with ❤️ on IOTA Move VM** | **Powered by DAG + Move Architecture** | **50,000+ TPS Performance**