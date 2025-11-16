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
  mainnet: '0x9bc9c878bb3cede9dcd86ef12d48c1fbe52732463d294ba40e4c02aa04a59cf7', // Production deployment
  testnet: '0x77b13360aed35d4ce94326e1dd52ec783f16b94c851a4c1b3ed98bb52ce31187', // Latest deployment - November 2024
  devnet: '0x77b13360aed35d4ce94326e1dd52ec783f16b94c851a4c1b3ed98bb52ce31187', // Latest development deployment
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
export const STAKING_POOL_ADDRESS = '0xca1239c9b8162ea0d9b0e46fa22705ce739ac74da63de1e17f94b1b8544cb3e1';
export const STIOTA_TYPE = '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT';

// Main configuration export
export const IOTA_CONFIG = {
  chain: DEFAULT_NETWORK,
  networks: IOTA_NETWORKS,
  contracts: {
    packageId: blitz_PACKAGE_ID[DEFAULT_NETWORK],
    memeFactoryPackageId: MEME_FACTORY_PACKAGE_ID[DEFAULT_NETWORK],
    pools: {
      // All pools reset - ready for fresh deployment
      'vUSD_IOTA': '0x0',
      'IOTA_vUSD': '0x0', 
      'stIOTA_IOTA': '0x0',
      'IOTA_stIOTA': '0x0',
    },
    limitOrderBook: {
      // All order books reset - ready for fresh deployment
      'vUSD_IOTA': '0x0',
      'IOTA_vUSD': '0x0',
      'stIOTA_IOTA': '0x0', 
      'IOTA_stIOTA': '0x0',
    },
    dcaRegistry: '0x0', // Reset - ready for fresh deployment
  },
  supportedCoins: SUPPORTED_COINS,
  poolCreationFee: POOL_CREATION_FEE,
  defaultSlippage: DEFAULT_SLIPPAGE,
  defaultDeadline: DEFAULT_DEADLINE,
  stakingPoolAddress: STAKING_POOL_ADDRESS,
  stIotaType: STIOTA_TYPE,
} as const;
