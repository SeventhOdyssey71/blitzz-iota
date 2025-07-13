'use client';

import { SUPPORTED_COINS } from '@/config/iota.config';
import { PoolTracker } from './pool-tracker';

// Ensure critical pools are tracked
export function ensureCriticalPools() {
  // IOTA/stIOTA pool
  const iotaStIotaPoolId = '0xc719b6b1eecc8c343b7fb3c8c42e2f039e67a60b97e99a638e63c8e01c0c1cc6';
  
  PoolTracker.savePool({
    poolId: iotaStIotaPoolId,
    coinTypeA: SUPPORTED_COINS.IOTA.type,
    coinTypeB: SUPPORTED_COINS.stIOTA.type,
    network: 'testnet',
  });
  
  console.log('Ensured critical pools are tracked');
}