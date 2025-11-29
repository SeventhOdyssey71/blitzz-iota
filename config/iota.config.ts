export const IOTA_NETWORKS = {
  mainnet: {
    name: 'IOTA Mainnet',
    rpcUrl: 'https://api.mainnet.iota.cafe',
    chainId: 'iota:mainnet',
    explorer: 'https://explorer.iota.cafe',
  },
  testnet: {
    name: 'IOTA Testnet',
    rpcUrl: 'https://api.testnet.iota.cafe',
    chainId: 'iota:testnet',
    explorer: 'https://explorer.testnet.iota.cafe',
  },
  devnet: {
    name: 'IOTA Devnet',
    rpcUrl: 'https://api.devnet.iota.cafe',
    chainId: 'iota:devnet',
    explorer: 'https://explorer.devnet.iota.cafe',
  },
} as const;

export const DEFAULT_NETWORK = 'testnet';

// Production-ready package IDs - Clean deployment for production testnet
export const BLITZZ_PACKAGE_ID = {
  mainnet: '0x0', // To be deployed to mainnet
  testnet: process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0', // Fresh deployment required
  devnet: process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0', // Development deployment
} as const;

// Registry and pool addresses - All fresh deployments
export const CONTRACT_ADDRESSES = {
  DEX_REGISTRY: process.env.NEXT_PUBLIC_DEX_POOL_REGISTRY || '0x0',
  DCA_REGISTRY: process.env.NEXT_PUBLIC_DCA_REGISTRY || '0x0',
  LIMIT_ORDER_REGISTRY: process.env.NEXT_PUBLIC_LIMIT_ORDER_REGISTRY || '0x0',
  POOLS: {
    IOTA_STIOTA: process.env.NEXT_PUBLIC_IOTA_STIOTA_POOL_ID || '0x0',
    IOTA_VUSD: process.env.NEXT_PUBLIC_IOTA_VUSD_POOL_ID || '0x0',
    STIOTA_VUSD: process.env.NEXT_PUBLIC_STIOTA_VUSD_POOL_ID || '0x0',
  },
  ORDER_BOOKS: {
    IOTA_STIOTA: process.env.NEXT_PUBLIC_IOTA_STIOTA_ORDER_BOOK || '0x0',
    IOTA_VUSD: process.env.NEXT_PUBLIC_IOTA_VUSD_ORDER_BOOK || '0x0',
    STIOTA_VUSD: process.env.NEXT_PUBLIC_STIOTA_VUSD_ORDER_BOOK || '0x0',
  },
} as const;

// Supported tokens with accurate mainnet types
export const SUPPORTED_COINS = {
  IOTA: {
    type: '0x2::iota::IOTA',
    decimals: 9,
    symbol: 'IOTA',
    name: 'IOTA',
    iconUrl: '/icons/iota.svg',
    coingeckoId: 'iota',
  },
  stIOTA: {
    type: '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT',
    decimals: 9,
    symbol: 'stIOTA',
    name: 'Staked IOTA',
    iconUrl: '/icons/stiota.svg',
    coingeckoId: 'iota', // Same price as IOTA
  },
  vUSD: {
    type: '0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081::vusd::VUSD',
    decimals: 6,
    symbol: 'vUSD',
    name: 'Virtual USD',
    iconUrl: '/icons/vusd.svg',
    coingeckoId: 'usd-coin', // Pegged to USD
  },
};

export const POOL_CREATION_FEE = 1000000; // 0.001 IOTA
export const DEFAULT_SLIPPAGE = 0.5; // 0.5%
export const DEFAULT_DEADLINE = 20; // 20 minutes

// Staking Pool Configuration
export const STAKING_POOL_ADDRESS = '0xca1239c9b8162ea0d9b0e46fa22705ce739ac74da63de1e17f94b1b8544cb3e1';
export const STIOTA_TYPE = '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT';

// Module names for contract interactions
export const MODULE_NAMES = {
  DEX: 'simple_dex',
  DCA: 'dca',
  LIMIT_ORDER: 'limit_order',
  STAKING: 'simple_staking',
} as const;

// Production-ready main configuration
export const IOTA_CONFIG = {
  network: DEFAULT_NETWORK,
  networks: IOTA_NETWORKS,
  packages: {
    core: BLITZZ_PACKAGE_ID[DEFAULT_NETWORK],
  },
  contracts: {
    registries: {
      dex: CONTRACT_ADDRESSES.DEX_REGISTRY,
      dca: CONTRACT_ADDRESSES.DCA_REGISTRY,
      limitOrder: CONTRACT_ADDRESSES.LIMIT_ORDER_REGISTRY,
    },
    pools: CONTRACT_ADDRESSES.POOLS,
    orderBooks: CONTRACT_ADDRESSES.ORDER_BOOKS,
  },
  modules: MODULE_NAMES,
  tokens: SUPPORTED_COINS,
  fees: {
    poolCreation: POOL_CREATION_FEE,
    swap: 18, // 1.8% as defined in Move contract
    dcaExecution: 50, // 0.5%
    limitOrderFill: 30, // 0.3%
  },
  defaults: {
    slippage: DEFAULT_SLIPPAGE,
    deadline: DEFAULT_DEADLINE,
  },
  staking: {
    poolAddress: STAKING_POOL_ADDRESS,
    stIotaType: STIOTA_TYPE,
  },
  limits: {
    maxPoolsPerUser: 100,
    maxDCAStrategiesPerUser: 50,
    maxLimitOrdersPerUser: 100,
    minPoolLiquidity: BigInt('1000000000'), // 1 IOTA minimum
    maxTransactionAmount: BigInt('1000000000000000000'), // 1B tokens max
  },
} as const;

// Export type for TypeScript inference
export type IotaConfig = typeof IOTA_CONFIG;

// Validation function for configuration
export const validateConfig = (): boolean => {
  const requiredAddresses = [
    IOTA_CONFIG.packages.core,
  ];
  
  return requiredAddresses.every(addr => addr !== '0x0' && addr.length === 66);
};

// Helper functions for getting specific configurations
export const getTokenByType = (type: string) => {
  return Object.values(SUPPORTED_COINS).find(coin => coin.type === type);
};

export const getTokenBySymbol = (symbol: string) => {
  return SUPPORTED_COINS[symbol as keyof typeof SUPPORTED_COINS];
};

export const getPoolId = (tokenA: string, tokenB: string): string => {
  const pools = CONTRACT_ADDRESSES.POOLS;
  
  if ((tokenA === 'IOTA' && tokenB === 'stIOTA') || (tokenA === 'stIOTA' && tokenB === 'IOTA')) {
    return pools.IOTA_STIOTA;
  }
  if ((tokenA === 'IOTA' && tokenB === 'vUSD') || (tokenA === 'vUSD' && tokenB === 'IOTA')) {
    return pools.IOTA_VUSD;
  }
  if ((tokenA === 'stIOTA' && tokenB === 'vUSD') || (tokenA === 'vUSD' && tokenB === 'stIOTA')) {
    return pools.STIOTA_VUSD;
  }
  
  return '0x0';
};

export const getOrderBookId = (tokenA: string, tokenB: string): string => {
  const orderBooks = CONTRACT_ADDRESSES.ORDER_BOOKS;
  
  if ((tokenA === 'IOTA' && tokenB === 'stIOTA') || (tokenA === 'stIOTA' && tokenB === 'IOTA')) {
    return orderBooks.IOTA_STIOTA;
  }
  if ((tokenA === 'IOTA' && tokenB === 'vUSD') || (tokenA === 'vUSD' && tokenB === 'IOTA')) {
    return orderBooks.IOTA_VUSD;
  }
  if ((tokenA === 'stIOTA' && tokenB === 'vUSD') || (tokenA === 'vUSD' && tokenB === 'stIOTA')) {
    return orderBooks.STIOTA_VUSD;
  }
  
  return '0x0';
};
