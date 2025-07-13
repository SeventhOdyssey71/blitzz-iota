'use client';

import { extractPoolFromTransaction } from '@/lib/services/extract-pool-from-tx';
import { PoolTracker } from '@/lib/services/pool-tracker';
import { getIotaClient } from '@/lib/iota/client';
import { SUPPORTED_COINS } from '@/config/iota.config';

async function addRecentLiquidityPool() {
  const txHash = 'DBJiftpbLE9JJ3e5N6rtLUHsMs3FZkbaYHJRaRdp5WR2';
  console.log('Adding pool from transaction:', txHash);
  
  try {
    // Extract pool from transaction
    const poolId = await extractPoolFromTransaction(txHash);
    
    if (poolId) {
      console.log('Pool extracted successfully:', poolId);
      
      // Verify the pool details
      const client = getIotaClient('testnet');
      const poolObject = await client.getObject({
        id: poolId,
        options: {
          showContent: true,
          showType: true,
        },
      });
      
      if (poolObject.data?.content?.dataType === 'moveObject') {
        const fields = poolObject.data.content.fields as any;
        const reserveA = fields.reserve_a?.fields?.value || fields.reserve_a || '0';
        const reserveB = fields.reserve_b?.fields?.value || fields.reserve_b || '0';
        
        console.log('Pool details:');
        console.log('- Pool ID:', poolId);
        console.log('- Reserve A:', reserveA);
        console.log('- Reserve B:', reserveB);
        console.log('- LP Supply:', fields.lp_supply);
        
        // Check if it's already tracked
        const existingPool = PoolTracker.findPool(
          SUPPORTED_COINS.IOTA.type,
          SUPPORTED_COINS.stIOTA.type
        );
        
        if (existingPool === poolId) {
          console.log('Pool is already tracked!');
        } else {
          console.log('Pool has been added to tracker.');
        }
        
        // Trigger refresh
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('pool-cache-refresh'));
          console.log('Pool cache refreshed.');
        }
      }
    } else {
      console.error('Failed to extract pool from transaction');
    }
  } catch (error) {
    console.error('Error adding pool:', error);
  }
}

// Run the function
addRecentLiquidityPool();