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
  testnet: '0x62b8cf324feb458dba7f9c8efba4bf6984eb737db51cc1b4aeade60763f6cc15', // Deployed with swap fees (0.3%)
  devnet: '0x0', // To be deployed
} as const;

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
export const STAKING_POOL_ADDRESS = '0x84e639a0c59228c7351117caff34f4dc2a32a2cae620e2fd142165b431d9b064';
export const STIOTA_TYPE = '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT';
