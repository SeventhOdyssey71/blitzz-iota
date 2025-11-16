'use client';

import { getSafeIotaClient } from '@/lib/iota/safe-client';
import { PoolTracker } from './pool-tracker';
import { blitz_PACKAGE_ID } from '@/config/iota.config';

export async function refreshAndTrackAllPools() {
  const client = getSafeIotaClient();
  if (!client) {
    console.error('IOTA client not available');
    return;
  }

  try {
    console.log('Refreshing all pools...');
    
    // Get all tracked pools
    const trackedPools = PoolTracker.getPools();
    console.log(`Found ${trackedPools.length} tracked pools`);
    
    // Refresh each pool's data
    for (const pool of trackedPools) {
      try {
        const poolObject = await client.getObject({
          id: pool.poolId,
          options: {
            showContent: true,
            showType: true,
          },
        });
        
        if (poolObject.data?.content?.dataType === 'moveObject') {
          const fields = poolObject.data.content.fields as any;
          console.log(`Pool ${pool.poolId} refreshed:`, {
            reserveA: fields.reserve_a?.fields?.value || fields.reserve_a || '0',
            reserveB: fields.reserve_b?.fields?.value || fields.reserve_b || '0',
            lpSupply: fields.lp_supply || '0',
          });
        }
      } catch (error) {
        console.error(`Error refreshing pool ${pool.poolId}:`, error);
      }
    }
    
    // Trigger cache refresh
    window.dispatchEvent(new Event('pool-cache-refresh'));
    console.log('Pool cache refresh triggered');
    
  } catch (error) {
    console.error('Error refreshing pools:', error);
  }
}

export async function extractAndTrackPoolFromTx(txHash: string) {
  const client = getSafeIotaClient();
  if (!client) {
    console.error('IOTA client not available');
    return null;
  }
  
  try {
    console.log('Fetching transaction:', txHash);
    
    const tx = await client.getTransactionBlock({
      digest: txHash,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
        showBalanceChanges: true,
        showInput: true,
      }
    });
    
    console.log('Transaction details:', tx);
    
    // Look for pool interactions
    let poolId = null;
    let coinTypeA = null;
    let coinTypeB = null;
    
    // Check object changes for pool mutations
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        // Check for mutated pool objects (add_liquidity modifies existing pools)
        if (change.type === 'mutated' && 
            change.objectType && 
            change.objectType.includes('::simple_dex::Pool')) {
          
          poolId = change.objectId;
          
          // Extract type arguments from the pool type
          const poolType = change.objectType;
          const typeArgsMatch = poolType.match(/<(.+), (.+)>/);
          
          if (typeArgsMatch) {
            [, coinTypeA, coinTypeB] = typeArgsMatch;
            coinTypeA = coinTypeA.trim();
            coinTypeB = coinTypeB.trim();
            
            console.log('Found liquidity addition to pool:', {
              poolId,
              coinTypeA,
              coinTypeB,
            });
            
            // Track the pool
            PoolTracker.savePool({
              poolId,
              coinTypeA,
              coinTypeB,
              network: 'testnet',
            });
            
            break;
          }
        }
        
        // Also check for created pools
        if (change.type === 'created' && 
            change.objectType && 
            change.objectType.includes('::simple_dex::Pool')) {
          
          poolId = change.objectId;
          const poolType = change.objectType;
          const typeArgsMatch = poolType.match(/<(.+), (.+)>/);
          
          if (typeArgsMatch) {
            [, coinTypeA, coinTypeB] = typeArgsMatch;
            coinTypeA = coinTypeA.trim();
            coinTypeB = coinTypeB.trim();
            
            console.log('Found new pool creation:', {
              poolId,
              coinTypeA,
              coinTypeB,
            });
            
            // Track the pool
            PoolTracker.savePool({
              poolId,
              coinTypeA,
              coinTypeB,
              network: 'testnet',
            });
            
            break;
          }
        }
      }
    }
    
    // Check events for pool-related activities
    if (!poolId && tx.events) {
      for (const event of tx.events) {
        if (event.type.includes('LiquidityAdded') || event.type.includes('PoolCreated')) {
          console.log('Found pool event:', event);
          // Extract pool ID from event if available
          if (event.parsedJson?.pool_id) {
            poolId = event.parsedJson.pool_id;
          }
        }
      }
    }
    
    if (poolId) {
      // Refresh all pools including the new one
      await refreshAndTrackAllPools();
      
      return {
        success: true,
        poolId,
        coinTypeA,
        coinTypeB,
        message: `Pool ${poolId} tracked and refreshed`
      };
    }
    
    return {
      success: false,
      message: 'No pool interactions found in transaction'
    };
    
  } catch (error) {
    console.error('Error extracting pool from transaction:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).refreshAndTrackAllPools = refreshAndTrackAllPools;
  (window as any).extractAndTrackPoolFromTx = extractAndTrackPoolFromTx;
}