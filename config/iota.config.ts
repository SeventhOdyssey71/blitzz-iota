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
  testnet: '0xd84fe8b6622ff910dc5e097c06de5ac31055c169453435d162ff999c8fb65202', // Deployed
  devnet: '0x0', // To be deployed
};

export const SUPPORTED_COINS = {
  IOTA: {
    type: '0x2::iota::IOTA',
    decimals: 9,
    symbol: 'IOTA',
    name: 'IOTA',
    iconUrl: 'https://api.blockberry.one/iota/icon/0x2::iota::IOTA',
  },
  stIOTA: {
    type: '0x3::staking_pool::StakedIota',
    decimals: 9,
    symbol: 'stIOTA',
    name: 'Staked IOTA',
    iconUrl: 'https://api.blockberry.one/iota/icon/0x3::staking_pool::StakedIota',
  },
  vUSD: {
    type: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
    decimals: 6,
    symbol: 'vUSD',
    name: 'Native USD',
    iconUrl: 'https://api.blockberry.one/iota/icon/0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
  },
};

export const POOL_CREATION_FEE = 1000000; // 0.001 IOTA
export const DEFAULT_SLIPPAGE = 0.5; // 0.5%
export const DEFAULT_DEADLINE = 20; // 20 minutes

// Staking Pool Configuration
export const STAKING_POOL_ADDRESS = '0x3';
export const STIOTA_TYPE = '0x3::staking_pool::StakedIota';
