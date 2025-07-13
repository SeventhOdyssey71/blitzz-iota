'use client';

import { PoolTracker } from './pool-tracker';

// Known invalid pool IDs to remove
const INVALID_POOL_IDS = [
  '0xc719b6b1eecc8c343b7fb3c8c42e2f039e67a60b97e99a638e63c8e01c0c1cc6',
  // Add any other known invalid IDs here
];

export function cleanupInvalidPools() {
  // Remove known invalid pools
  INVALID_POOL_IDS.forEach(poolId => {
    PoolTracker.removePool(poolId);
  });
  
  // Get all tracked pools
  const pools = PoolTracker.getPools();
  let removedCount = 0;
  
  // Validate format of all pool IDs
  pools.forEach(pool => {
    if (!pool.poolId || !/^0x[a-fA-F0-9]{64}$/.test(pool.poolId)) {
      PoolTracker.removePool(pool.poolId);
      removedCount++;
    }
  });
  
  // Only log if pools were actually removed
  if (removedCount > 0 || INVALID_POOL_IDS.length > 0) {
    console.log(`Pool cleanup: Removed ${removedCount + INVALID_POOL_IDS.length} invalid pools.`);
  }
  
  // Trigger a refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pool-cache-refresh'));
  }
}

// Run cleanup on import
if (typeof window !== 'undefined') {
  // Run cleanup after a short delay to ensure everything is loaded
  setTimeout(() => {
    cleanupInvalidPools();
  }, 1000);
}

// Export for manual use
if (typeof window !== 'undefined') {
  (window as any).cleanupInvalidPools = cleanupInvalidPools;
}