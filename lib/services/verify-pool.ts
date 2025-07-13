'use client';

import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';

export async function verifyAndUpdatePool(poolId: string) {
  const client = getIotaClientSafe();
  if (!client) {
    console.error('IOTA client not available');
    return false;
  }
  
  try {
    console.log('Verifying pool:', poolId);
    
    // Try to get the pool object
    const poolObject = await client.getObject({
      id: poolId,
      options: {
        showContent: true,
        showType: true,
      },
    });
    
    if (poolObject.data) {
      console.log('Pool exists:', poolObject.data);
      return true;
    } else {
      console.error('Pool does not exist:', poolId);
      return false;
    }
  } catch (error) {
    console.error('Error verifying pool:', error);
    return false;
  }
}

export async function findCorrectPool(coinTypeA: string, coinTypeB: string) {
  const client = getIotaClientSafe();
  if (!client) {
    console.error('IOTA client not available');
    return null;
  }
  
  try {
    console.log('Searching for correct pool...', { coinTypeA, coinTypeB });
    
    // Clear old pool data
    const trackedPools = PoolTracker.getPools();
    const oldPool = trackedPools.find(p => 
      (p.coinTypeA === coinTypeA && p.coinTypeB === coinTypeB) ||
      (p.coinTypeA === coinTypeB && p.coinTypeB === coinTypeA)
    );
    
    if (oldPool) {
      // Verify if old pool still exists
      const exists = await verifyAndUpdatePool(oldPool.poolId);
      if (!exists) {
        console.log('Old pool no longer exists, removing from tracker');
        PoolTracker.removePool(oldPool.poolId);
      }
    }
    
    // Search for pools by querying owned objects
    // This is a workaround - in production you'd have an indexer
    console.log('Searching for pools in recent transactions...');
    
    return null;
  } catch (error) {
    console.error('Error finding correct pool:', error);
    return null;
  }
}

// Clear stale IOTA/stIOTA pool
export function clearStalePool() {
  const stalePoolId = '0xc719b6b1eecc8c343b7fb3c8c42e2f039e67a60b97e99a638e63c8e01c0c1cc6';
  PoolTracker.removePool(stalePoolId);
  console.log('Cleared stale pool:', stalePoolId);
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).verifyAndUpdatePool = verifyAndUpdatePool;
  (window as any).findCorrectPool = findCorrectPool;
  (window as any).clearStalePool = clearStalePool;
}