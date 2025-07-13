// Known pool IDs for quick lookup
// These are pools that have been created and verified on-chain

import { SUPPORTED_COINS } from './iota.config';

export const KNOWN_POOLS = {
  testnet: {
    // IOTA/stIOTA pool created in transaction 5nhUkziGv6fMoPPqbxpG4xfnij1hwJMmtyn86sJeZMNB
    [`${SUPPORTED_COINS.IOTA.type}_${SUPPORTED_COINS.stIOTA.type}`]: '0xc719b6b1eecc8c343b7fb3c8c42e2f039e67a60b97e99a638e63c8e01c0c1cc6',
  },
  mainnet: {},
  devnet: {},
};