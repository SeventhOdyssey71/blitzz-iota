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
  },
  USDC: {
    type: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  USDT: {
    type: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
  },
  WETH: {
    type: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
    decimals: 8,
    symbol: 'WETH',
    name: 'Wrapped Ether',
  },
  WBTC: {
    type: '0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN',
    decimals: 8,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
  },
  stIOTA: {
    type: '0xd84fe8b6622ff910dc5e097c06de5ac31055c169453435d162ff999c8fb65202::simple_staking::StakedIOTA',
    decimals: 9,
    symbol: 'stIOTA',
    name: 'Staked IOTA',
  },
};

export const POOL_CREATION_FEE = 1000000; // 0.001 IOTA
export const DEFAULT_SLIPPAGE = 0.5; // 0.5%
export const DEFAULT_DEADLINE = 20; // 20 minutes

// Staking Pool Configuration
export const STAKING_POOL_ADDRESS = '0xbb039632ab28afa6b123a537acd03c1988e665170c75e06ee81bf996d1426021';
export const STIOTA_TYPE = '0xd84fe8b6622ff910dc5e097c06de5ac31055c169453435d162ff999c8fb65202::simple_staking::StakedIOTA';
