'use client';

import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';

export async function extractPoolFromTransaction(txDigest: string) {
  const client = getIotaClientSafe();
  if (!client) {
    throw new Error('IOTA client not available');
  }
  
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
    
    console.log('Transaction details:', tx);
    
    // Look for created pool object
    let poolId = null;
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        if (change.type === 'created' && 
            change.objectType && 
            change.objectType.includes('::simple_dex::Pool')) {
          poolId = change.objectId;
          console.log('Found created pool:', poolId);
          break;
        }
      }
    }
    
    if (!poolId && tx.events) {
      // Check events for pool creation
      for (const event of tx.events) {
        if (event.type.includes('PoolCreated')) {
          // Extract pool ID from event data
          poolId = event.parsedJson?.pool_id || event.parsedJson?.id;
          console.log('Found pool in events:', poolId);
          break;
        }
      }
    }
    
    if (poolId) {
      // Add to tracker
      PoolTracker.addPool(
        poolId,
        SUPPORTED_COINS.IOTA.type,
        SUPPORTED_COINS.stIOTA.type,
        'testnet'
      );
      
      console.log('Pool added to tracker:', poolId);
      return {
        success: true,
        poolId,
        message: `Successfully extracted and added pool ${poolId}`
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