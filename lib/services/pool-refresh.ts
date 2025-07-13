'use client';

import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';

export async function refreshPoolCache() {
  const client = getIotaClientSafe();
  if (!client) {
    return;
  }
  
  // Get all tracked pools
  const trackedPools = PoolTracker.getPools();
  
  // Validate each pool still exists
  for (const pool of trackedPools) {
    try {
      // Validate pool ID format first
      if (!pool.poolId || !/^0x[a-fA-F0-9]{64}$/.test(pool.poolId)) {
        console.warn('Invalid pool ID format, removing:', pool.poolId);
        PoolTracker.removePool(pool.poolId);
        continue;
      }
      
      const poolObject = await client.getObject({
        id: pool.poolId,
        options: {
          showContent: true,
          showType: true,
        },
      });
      
      if (!poolObject.data) {
        // Pool not found, remove from tracker
        PoolTracker.removePool(pool.poolId);
      }
    } catch (error: any) {
      if (error?.message?.includes('Invalid') || error?.message?.includes('Object id')) {
        // Pool is invalid, remove from tracker
        PoolTracker.removePool(pool.poolId);
      } else {
        console.error(`Error validating pool ${pool.poolId}:`, error);
      }
    }
  }
  
  // Clear the discovery cache to force fresh lookups
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pool-cache-refresh'));
  }
}

export function getPoolForPair(tokenA: string, tokenB: string) {
  // Get the exact types
  const typeA = tokenA === 'IOTA' ? SUPPORTED_COINS.IOTA.type : 
                tokenA === 'stIOTA' ? SUPPORTED_COINS.stIOTA.type : 
                tokenA;
                
  const typeB = tokenB === 'IOTA' ? SUPPORTED_COINS.IOTA.type : 
                tokenB === 'stIOTA' ? SUPPORTED_COINS.stIOTA.type : 
                tokenB;
  
  const poolId = PoolTracker.findPool(typeA, typeB);
  return poolId;
}