import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { PoolDiscovery } from '@/lib/services/pool-discovery';
import { KNOWN_POOLS } from '@/config/known-pools';

async function testPoolSwap() {
  const client = getIotaClientSafe();
  if (!client) {
    console.error('Failed to create IOTA client');
    return;
  }

  console.log('Testing pool swap functionality...\n');

  // Check the known pool
  const poolId = KNOWN_POOLS.testnet[`${SUPPORTED_COINS.IOTA.type}_${SUPPORTED_COINS.stIOTA.type}`];
  console.log('Known pool ID:', poolId);

  try {
    // Get pool details
    const poolObject = await client.getObject({
      id: poolId,
      options: {
        showContent: true,
        showType: true,
      },
    });

    if (poolObject.data?.content?.dataType === 'moveObject') {
      const fields = poolObject.data.content.fields as any;
      console.log('\nPool Details:');
      console.log('- Pool ID:', poolObject.data.objectId);
      console.log('- Reserve A (IOTA):', fields.reserve_a?.fields?.value || fields.reserve_a || '0');
      console.log('- Reserve B (stIOTA):', fields.reserve_b?.fields?.value || fields.reserve_b || '0');
      console.log('- LP Supply:', fields.lp_supply || '0');
    }

    // Test finding pool for swap
    const pool = await PoolDiscovery.findPoolsForPair(
      SUPPORTED_COINS.IOTA.type,
      SUPPORTED_COINS.stIOTA.type,
      'testnet'
    );

    console.log('\nPool discovery result:');
    if (pool) {
      console.log('- Found pool:', pool.poolId);
      console.log('- Reserve A:', pool.reserveA.toString());
      console.log('- Reserve B:', pool.reserveB.toString());
      console.log('- LP Supply:', pool.lpSupply.toString());
      console.log('- Fee:', pool.feePercentage / 100 + '%');
    } else {
      console.log('- No pool found');
    }

    // Test swap route
    const inputAmount = BigInt(1e9); // 1 IOTA
    const route = await PoolDiscovery.findBestRoute(
      SUPPORTED_COINS.IOTA.type,
      SUPPORTED_COINS.stIOTA.type,
      inputAmount,
      'testnet'
    );

    console.log('\nSwap route test:');
    if (route) {
      console.log('- Input amount:', inputAmount.toString(), 'MIST (1 IOTA)');
      console.log('- Output amount:', route.outputAmount.toString(), 'MIST');
      console.log('- Route uses pool:', route.pools[0]?.poolId);
      console.log('- Price impact:', route.priceImpact + '%');
    } else {
      console.log('- No route found');
    }

  } catch (error) {
    console.error('Error testing pool:', error);
  }
}

// Run the test
testPoolSwap().catch(console.error);