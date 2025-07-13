import { extractPoolFromTransaction } from '@/lib/services/extract-pool-from-tx';
import { PoolTracker } from '@/lib/services/pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { getIotaClientSafe } from '@/lib/iota/client-wrapper';

async function analyzeLiquidityTransaction() {
  const txDigest = 'DBJiftpbLE9JJ3e5N6rtLUHsMs3FZkbaYHJRaRdp5WR2';
  
  console.log('=== Analyzing Liquidity Transaction ===');
  console.log('Transaction hash:', txDigest);
  console.log('Network: testnet');
  console.log('');
  
  try {
    // First, let's check current tracked pools
    console.log('=== Current Tracked Pools ===');
    const existingPools = PoolTracker.getPools();
    console.log('Total pools tracked:', existingPools.length);
    
    // Check if we already have a pool for IOTA-stIOTA
    const iotaStIotaPool = PoolTracker.findPool(
      SUPPORTED_COINS.IOTA.type,
      SUPPORTED_COINS.stIOTA.type
    );
    
    if (iotaStIotaPool) {
      console.log('Found existing IOTA-stIOTA pool:', iotaStIotaPool);
    } else {
      console.log('No existing IOTA-stIOTA pool found');
    }
    
    console.log('');
    console.log('=== Extracting Pool from Transaction ===');
    
    // Extract pool from transaction
    const result = await extractPoolFromTransaction(txDigest);
    
    if (result.success) {
      console.log('✅ Successfully extracted pool!');
      console.log('Pool ID:', result.poolId);
      console.log('Coin Type A:', result.coinTypeA);
      console.log('Coin Type B:', result.coinTypeB);
      
      // Verify the pool details
      console.log('');
      console.log('=== Verifying Pool Details ===');
      
      // Get the IOTA client to fetch pool state
      const client = getIotaClientSafe();
      if (client && result.poolId) {
        try {
          const poolObject = await client.getObject({
            id: result.poolId,
            options: {
              showContent: true,
              showType: true,
            }
          });
          
          if (poolObject.data && poolObject.data.content && poolObject.data.content.type === 'moveObject') {
            const fields = poolObject.data.content.fields as any;
            console.log('Pool reserves:');
            console.log('- Reserve A:', fields.reserve_a, '(', fields.reserve_a / 1e9, 'tokens)');
            console.log('- Reserve B:', fields.reserve_b, '(', fields.reserve_b / 1e9, 'tokens)');
            console.log('- LP Supply:', fields.lp_supply);
            
            // Check if it matches the expected 2 IOTA and 2 stIOTA
            const reserveA = parseInt(fields.reserve_a) / 1e9;
            const reserveB = parseInt(fields.reserve_b) / 1e9;
            
            console.log('');
            if (Math.abs(reserveA - 2) < 0.001 && Math.abs(reserveB - 2) < 0.001) {
              console.log('✅ Pool reserves match expected values (2 IOTA and 2 stIOTA)');
            } else {
              console.log('⚠️  Pool reserves do not match expected values');
              console.log('   Expected: 2 IOTA and 2 stIOTA');
              console.log('   Actual:', reserveA, 'and', reserveB);
            }
          }
        } catch (error) {
          console.error('Error fetching pool object:', error);
        }
      }
      
      // Check if pool is now tracked
      console.log('');
      console.log('=== Pool Tracking Status ===');
      const updatedPools = PoolTracker.getPools();
      const isTracked = updatedPools.some(p => p.poolId === result.poolId);
      
      if (isTracked) {
        console.log('✅ Pool is now tracked in localStorage');
        const trackedPool = updatedPools.find(p => p.poolId === result.poolId);
        console.log('Tracked pool details:', trackedPool);
      } else {
        console.log('❌ Pool is not tracked (this should not happen)');
      }
      
    } else {
      console.log('❌ Failed to extract pool:', result.message);
    }
    
  } catch (error) {
    console.error('Error analyzing transaction:', error);
  }
}

// Run the analysis
analyzeLiquidityTransaction().catch(console.error);