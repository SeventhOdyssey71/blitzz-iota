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

export const blitz_PACKAGE_ID = {
  mainnet: '0x0', // To be deployed
  testnet: '0x620f8a39ec678170db2b2ed8cee5cc6a3d5b4802acd8a8905919c2e7bd5d52bb', // Updated with improved liquidity and error handling
  devnet: '0x0', // To be deployed
} as const;

export const MEME_FACTORY_PACKAGE_ID = {
  mainnet: '0x0', // To be deployed
  testnet: process.env.NEXT_PUBLIC_MEME_PACKAGE_ID || '0x0', // To be deployed
  devnet: '0x0', // To be deployed
} as const;

export const MEME_PLATFORM_ID = process.env.NEXT_PUBLIC_MEME_PLATFORM_ID || '';

export const SUPPORTED_COINS = {
  IOTA: {
    type: '0x2::iota::IOTA',
    decimals: 9,
    symbol: 'IOTA',
    name: 'IOTA',
    iconUrl: 'https://app.pools.finance/assets/coins/iota.svg',
  },
  stIOTA: {
    type: '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT',
    decimals: 9,
    symbol: 'stIOTA',
    name: 'Staked IOTA',
    iconUrl: 'https://app.pools.finance/assets/coins/stiota.svg',
  },
  vUSD: {
    type: '0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081::vusd::VUSD',
    decimals: 6,
    symbol: 'vUSD',
    name: 'Native USD',
    iconUrl: 'https://app.pools.finance/assets/coins/vusd.svg',
  },
};

export const POOL_CREATION_FEE = 1000000; // 0.001 IOTA
export const DEFAULT_SLIPPAGE = 0.5; // 0.5%
export const DEFAULT_DEADLINE = 20; // 20 minutes

// Staking Pool Configuration
export const STAKING_POOL_ADDRESS = '0x174ff721e0c0e85814cbe5d4f908c9312071c78972238dac7a97e018e0ae6951';
export const STIOTA_TYPE = '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT';
