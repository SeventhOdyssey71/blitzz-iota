'use client';

import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';

export function debugPoolState() {
  console.log('=== Pool Debug Info ===');
  
  // Get all stored pools
  const pools = PoolTracker.getPools();
  console.log('Stored pools:', pools);
  
  // Check for IOTA/stIOTA pool specifically
  const iotaType = SUPPORTED_COINS.IOTA.type;
  const stIotaType = SUPPORTED_COINS.stIOTA.type;
  
  console.log('Looking for pool with types:', {
    iotaType,
    stIotaType
  });
  
  const foundPool = PoolTracker.findPool(iotaType, stIotaType);
  console.log('Found pool ID:', foundPool);
  
  // Check both directions
  const poolMatch1 = pools.find(p => p.coinTypeA === iotaType && p.coinTypeB === stIotaType);
  const poolMatch2 = pools.find(p => p.coinTypeA === stIotaType && p.coinTypeB === iotaType);
  
  console.log('Direct match (IOTA->stIOTA):', poolMatch1);
  console.log('Reverse match (stIOTA->IOTA):', poolMatch2);
  
  return {
    pools,
    iotaType,
    stIotaType,
    foundPool,
    poolMatch1,
    poolMatch2
  };
}

// Function to manually add a pool for testing
export function addTestPool(poolId: string) {
  console.log('Adding test pool:', poolId);
  PoolTracker.addPool(
    poolId,
    SUPPORTED_COINS.IOTA.type,
    SUPPORTED_COINS.stIOTA.type,
    'testnet'
  );
  console.log('Pool added. Current pools:', PoolTracker.getPools());
}