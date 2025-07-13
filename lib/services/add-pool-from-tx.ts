'use client';

import { PoolTracker } from './pool-tracker';
import { getIotaClientSafe } from '@/lib/iota/client-wrapper';

interface PoolCreatedEvent {
  pool_id: string;
  coin_type_a: string;
  coin_type_b: string;
  creator: string;
}

// Function to extract pool information from a transaction and add it to tracker
export async function addPoolFromTransactionDigest(
  txDigest: string, 
  network: 'testnet' | 'mainnet' | 'devnet' = 'testnet'
) {
  console.log('Fetching transaction:', txDigest);
  
  const client = getIotaClientSafe();
  if (!client) {
    throw new Error('IOTA client not available');
  }
  
  try {
    // Fetch transaction details
    const txResponse = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEvents: true,
        showObjectChanges: true,
        showEffects: true,
      }
    });
    
    console.log('Transaction response:', txResponse);
    
    // Look for pool created events
    const poolCreatedEvent = txResponse.events?.find(event => 
      event.type.includes('PoolCreated') || 
      event.type.includes('pool_created') ||
      event.type.includes('simple_dex::PoolCreated')
    );
    
    if (poolCreatedEvent && poolCreatedEvent.parsedJson) {
      const eventData = poolCreatedEvent.parsedJson as PoolCreatedEvent;
      console.log('Pool created event found:', eventData);
      
      // Add to pool tracker
      PoolTracker.addPool(
        eventData.pool_id,
        eventData.coin_type_a,
        eventData.coin_type_b,
        network
      );
      
      // Clear cache to force refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pool-cache-refresh'));
      }
      
      return {
        success: true,
        poolId: eventData.pool_id,
        coinTypeA: eventData.coin_type_a,
        coinTypeB: eventData.coin_type_b,
        message: `Pool ${eventData.pool_id} added successfully`
      };
    }
    
    // If no event found, look for created objects that might be pools
    const createdObjects = txResponse.objectChanges?.filter(change => 
      change.type === 'created' && 
      (change.objectType?.includes('Pool') || change.objectType?.includes('LiquidityPool'))
    );
    
    if (createdObjects && createdObjects.length > 0) {
      console.log('Created objects that might be pools:', createdObjects);
      
      // Extract pool ID from the first created pool object
      const poolObject = createdObjects[0];
      const poolId = poolObject.objectId;
      
      // Try to fetch the pool object to get coin types
      const poolData = await client.getObject({
        id: poolId,
        options: {
          showContent: true,
          showType: true,
        }
      });
      
      if (poolData.data?.content?.dataType === 'moveObject') {
        const type = poolData.data.type || '';
        // Extract coin types from the type string
        // Example: "0x123::simple_dex::LiquidityPool<0x2::iota::IOTA, 0x456::stiota::StIOTA>"
        const typeMatch = type.match(/<(.+),\s*(.+)>/);
        if (typeMatch) {
          const coinTypeA = typeMatch[1].trim();
          const coinTypeB = typeMatch[2].trim();
          
          console.log('Extracted coin types:', { coinTypeA, coinTypeB });
          
          // Add to pool tracker
          PoolTracker.addPool(poolId, coinTypeA, coinTypeB, network);
          
          // Clear cache to force refresh
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('pool-cache-refresh'));
          }
          
          return {
            success: true,
            poolId,
            coinTypeA,
            coinTypeB,
            message: `Pool ${poolId} added successfully`
          };
        }
      }
    }
    
    throw new Error('No pool creation found in transaction');
  } catch (error) {
    console.error('Error processing transaction:', error);
    throw error;
  }
}

// Function to manually add a pool with known details
export function addPoolManually(
  poolId: string,
  coinTypeA: string,
  coinTypeB: string,
  network: 'testnet' | 'mainnet' | 'devnet' = 'testnet'
) {
  console.log('Manually adding pool:', { poolId, coinTypeA, coinTypeB, network });
  
  // Add to pool tracker
  PoolTracker.addPool(poolId, coinTypeA, coinTypeB, network);
  
  // Clear cache to force refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pool-cache-refresh'));
  }
  
  console.log('Pool added successfully. Current pools:', PoolTracker.getPools());
  
  return {
    success: true,
    poolId,
    message: `Pool ${poolId} added for ${coinTypeA} / ${coinTypeB} on ${network}`
  };
}

// Export for easy console access
if (typeof window !== 'undefined') {
  (window as any).addPoolFromTransactionDigest = addPoolFromTransactionDigest;
  (window as any).addPoolManually = addPoolManually;
  (window as any).PoolTracker = PoolTracker;
}