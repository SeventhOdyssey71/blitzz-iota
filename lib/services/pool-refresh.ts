'use client';

import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';

export async function refreshPoolCache() {
  console.log('Refreshing pool cache...');
  
  const client = getIotaClientSafe();
  if (!client) {
    console.log('No client available for pool refresh');
    return;
  }
  
  // Get all tracked pools
  const trackedPools = PoolTracker.getPools();
  console.log('Tracked pools:', trackedPools);
  
  // Validate each pool still exists
  for (const pool of trackedPools) {
    try {
      const poolObject = await client.getObject({
        id: pool.poolId,
        options: {
          showContent: true,
          showType: true,
        },
      });
      
      if (poolObject.data) {
        console.log(`Pool ${pool.poolId} validated`);
      } else {
        console.log(`Pool ${pool.poolId} not found on chain`);
      }
    } catch (error) {
      console.error(`Error validating pool ${pool.poolId}:`, error);
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
  
  console.log('Looking for pool with types:', { typeA, typeB });
  
  const poolId = PoolTracker.findPool(typeA, typeB);
  console.log('Found pool ID:', poolId);
  
  return poolId;
}