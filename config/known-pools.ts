// Known pool IDs for quick lookup
// These are pools that have been created and verified on-chain

import { SUPPORTED_COINS } from './iota.config';

export const KNOWN_POOLS = {
  testnet: {
    // IOTA/stIOTA pool
    [`${SUPPORTED_COINS.IOTA.type}_${SUPPORTED_COINS.stIOTA.type}`]: '0xa1c07395edbb91388e551127528b6879d08c8aef115ef6a8d9374348af2d7020',
    // Reverse key for same pool
    [`${SUPPORTED_COINS.stIOTA.type}_${SUPPORTED_COINS.IOTA.type}`]: '0xa1c07395edbb91388e551127528b6879d08c8aef115ef6a8d9374348af2d7020',
  },
  mainnet: {},
  devnet: {},
};