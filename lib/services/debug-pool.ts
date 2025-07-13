'use client';

import { SUPPORTED_COINS } from '@/config/iota.config';
import { PoolTracker } from './pool-tracker';
import { extractPoolFromTransaction } from './extract-pool-from-tx';

// Function to manually add IOTA/stIOTA pool
export function addIotaStIotaPool() {
  const poolId = '0xc719b6b1eecc8c343b7fb3c8c42e2f039e67a60b97e99a638e63c8e01c0c1cc6';
  
  PoolTracker.savePool({
    poolId,
    coinTypeA: SUPPORTED_COINS.IOTA.type,
    coinTypeB: SUPPORTED_COINS.stIOTA.type,
    network: 'testnet',
  });
  
  // Trigger refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pool-cache-refresh'));
  }
  
  console.log('IOTA/stIOTA pool added:', poolId);
  return poolId;
}

// Function to clear all pools and re-add critical ones
export function resetPools() {
  PoolTracker.clearPools();
  addIotaStIotaPool();
  console.log('Pools reset and critical pools re-added');
}

// Function to list all tracked pools
export function listPools() {
  const pools = PoolTracker.getPools();
  console.table(pools);
  return pools;
}

// Export to window for console access
if (typeof window !== 'undefined') {
  (window as any).poolDebug = {
    addIotaStIotaPool,
    resetPools,
    listPools,
    extractPoolFromTransaction,
    PoolTracker,
  };
  
  console.log('Pool debug tools available at window.poolDebug');
}