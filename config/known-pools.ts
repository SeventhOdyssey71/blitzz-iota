// Known pool IDs for quick lookup
// These are pools that have been created and verified on-chain

import { SUPPORTED_COINS } from './iota.config';

export const KNOWN_POOLS = {
  testnet: {
    // Pools will be created dynamically and tracked in localStorage
    // After creating a pool, it will be automatically tracked by PoolTracker
  },
  mainnet: {},
  devnet: {},
};