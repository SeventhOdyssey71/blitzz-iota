'use client';

import { getSafeIotaClient } from '@/lib/iota/safe-client';
import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';

export async function extractPoolFromTransaction(txDigest: string) {
  const client = getSafeIotaClient();
  
  try {
    console.log('Fetching transaction:', txDigest);
    
    // Get transaction details
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      }
    });
    
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    console.log('Transaction details:', tx);
    
    // Look for created pool object
    let poolInfo = null;
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && 
            change.objectType && 
            (change.objectType.includes('::simple_dex::Pool') || 
             change.objectType.includes('::dex::Pool') ||
             change.objectType.includes('Pool<'))) {
          
          // Extract type arguments from the pool type
          // Format: packageId::simple_dex::Pool<CoinTypeA, CoinTypeB>
          const poolType = change.objectType;
          const typeArgsMatch = poolType.match(/<(.+), (.+)>/);
          
          if (typeArgsMatch) {
            const [, coinTypeA, coinTypeB] = typeArgsMatch;
            poolInfo = {
              poolId: change.objectId,
              coinTypeA: coinTypeA.trim(),
              coinTypeB: coinTypeB.trim(),
            };
            console.log('Found created pool with types:', poolInfo);
            break;
          }
        }
      }
    }
    
    if (!poolInfo && tx.events) {
      // Check events for pool creation
      for (const event of tx.events) {
        if (event.type.includes('PoolCreated')) {
          // Extract pool ID from event data
          const poolId = event.parsedJson?.pool_id || event.parsedJson?.id;
          if (poolId) {
            // Try to extract types from event
            poolInfo = {
              poolId,
              coinTypeA: SUPPORTED_COINS.IOTA.type,
              coinTypeB: SUPPORTED_COINS.stIOTA.type,
            };
            console.log('Found pool in events:', poolInfo);
            break;
          }
        }
      }
    }
    
    if (poolInfo) {
      // Add to tracker
      PoolTracker.addPool(
        poolInfo.poolId,
        poolInfo.coinTypeA,
        poolInfo.coinTypeB,
        'testnet'
      );
      
      // Also save it directly
      PoolTracker.savePool({
        poolId: poolInfo.poolId,
        coinTypeA: poolInfo.coinTypeA,
        coinTypeB: poolInfo.coinTypeB,
        network: 'testnet',
      });
      
      // Trigger pool cache refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pool-cache-refresh'));
      }
      
      console.log('Pool added to tracker:', poolInfo);
      return {
        success: true,
        poolId: poolInfo.poolId,
        coinTypeA: poolInfo.coinTypeA,
        coinTypeB: poolInfo.coinTypeB,
        message: `Successfully extracted and added pool ${poolInfo.poolId}`
      };
    }
    
    return {
      success: false,
      message: 'No pool found in transaction'
    };
    
  } catch (error) {
    console.error('Error extracting pool from transaction:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).extractPoolFromTransaction = extractPoolFromTransaction;
}