#!/usr/bin/env node

// Script to add the pool from the liquidity transaction
// Run with: npx tsx scripts/add-liquidity-pool-tx.ts

import { getIotaClient } from '../lib/iota/client';
import { SUPPORTED_COINS } from '../config/iota.config';

async function addPoolFromLiquidityTx() {
  const txDigest = 'DBJiftpbLE9JJ3e5N6rtLUHsMs3FZkbaYHJRaRdp5WR2';
  console.log('Fetching transaction:', txDigest);
  
  try {
    const client = getIotaClient('testnet');
    const tx = await client.waitForTransaction({
      digest: txDigest,
      options: {
        showObjectChanges: true,
        showEffects: true,
      },
    });
    
    console.log('\nTransaction Effects:');
    console.log('- Status:', tx.effects?.status.status);
    console.log('- Created objects:', tx.objectChanges?.filter(change => change.type === 'created').length);
    
    // Look for the pool in created objects
    const createdObjects = tx.objectChanges?.filter(change => change.type === 'created') || [];
    
    for (const obj of createdObjects) {
      if (obj.type === 'created' && obj.objectType?.includes('::dex::Pool<')) {
        console.log('\nFound Pool Object:');
        console.log('- Object ID:', obj.objectId);
        console.log('- Type:', obj.objectType);
        
        // Extract coin types from the pool type
        const typeMatch = obj.objectType.match(/Pool<(.+?),\s*(.+?)>/);
        if (typeMatch) {
          const coinTypeA = typeMatch[1];
          const coinTypeB = typeMatch[2];
          
          console.log('\nExtracted coin types:');
          console.log('- Coin A:', coinTypeA);
          console.log('- Coin B:', coinTypeB);
          
          // Check if this is IOTA/stIOTA pool
          const isIotaStIotaPool = 
            (coinTypeA === SUPPORTED_COINS.IOTA.type && coinTypeB === SUPPORTED_COINS.stIOTA.type) ||
            (coinTypeA === SUPPORTED_COINS.stIOTA.type && coinTypeB === SUPPORTED_COINS.IOTA.type);
          
          if (isIotaStIotaPool) {
            console.log('\n✅ This is the IOTA/stIOTA pool!');
            console.log('Pool ID to add:', obj.objectId);
            
            // Fetch the pool details
            const poolObject = await client.getObject({
              id: obj.objectId,
              options: {
                showContent: true,
              },
            });
            
            if (poolObject.data?.content?.dataType === 'moveObject') {
              const fields = poolObject.data.content.fields as any;
              console.log('\nPool reserves:');
              console.log('- Reserve A:', fields.reserve_a?.fields?.value || fields.reserve_a);
              console.log('- Reserve B:', fields.reserve_b?.fields?.value || fields.reserve_b);
              console.log('- LP Supply:', fields.lp_supply);
            }
            
            console.log('\n📝 To add this pool, run the following in your browser console:');
            console.log(`
// Add pool to tracker
const { PoolTracker } = await import('/lib/services/pool-tracker');
PoolTracker.addPool(
  '${obj.objectId}',
  '${coinTypeA}',
  '${coinTypeB}',
  'testnet'
);

// Refresh pool cache
window.dispatchEvent(new Event('pool-cache-refresh'));
console.log('Pool added and cache refreshed!');
            `);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

addPoolFromLiquidityTx();