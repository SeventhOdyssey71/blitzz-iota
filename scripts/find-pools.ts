import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';

async function findPools() {
  const client = getIotaClientSafe();
  if (!client) {
    console.error('Failed to create IOTA client');
    return;
  }

  const packageId = blitz_PACKAGE_ID.testnet;
  console.log('Package ID:', packageId);
  
  try {
    // First, try to query for Pool objects directly
    console.log('\nSearching for Pool objects...');
    try {
      const pools = await client.getOwnedObjects({
        owner: '0x0000000000000000000000000000000000000000000000000000000000000006', // Shared object address
        filter: {
          StructType: `${packageId}::simple_dex::Pool`,
        },
      });
      
      if (pools.data.length > 0) {
        console.log(`Found ${pools.data.length} pools directly`);
        for (const pool of pools.data) {
          console.log('Pool:', pool);
        }
      }
    } catch (e) {
      console.log('Could not query shared objects directly');
    }

    // Query transaction events to find pool creation
    const events = await client.queryEvents({
      query: {
        MoveModule: {
          package: packageId,
          module: 'simple_dex',
        },
      },
      limit: 50,
      order: 'descending',
    });

    console.log(`Found ${events.data.length} events`);
    
    // Look for object creation events
    for (const event of events.data) {
      if (event.type.includes('simple_dex::Pool') || event.type.includes('Blitz::simple_dex')) {
        console.log('Pool creation event found:', event);
      }
    }

    // Also check for created objects in recent transactions
    console.log('\nSearching for transactions that used the package...');
    const txs = await client.queryTransactionBlocks({
      filter: {
        MoveFunction: {
          package: packageId,
          module: 'simple_dex',
          function: 'create_pool',
        },
      },
      limit: 50,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log(`\nFound ${txs.data.length} transactions`);
    
    for (const tx of txs.data) {
      console.log(`\nTransaction: ${tx.digest}`);
      if (tx.objectChanges) {
        for (const change of tx.objectChanges) {
          if (change.type === 'created') {
            console.log(`Created object: ${change.objectType}`);
          }
          if (change.type === 'created' && (change.objectType.includes('simple_dex::Pool') || change.objectType.includes('Blitz::simple_dex'))) {
            console.log('\nPool created:');
            console.log('- Object ID:', change.objectId);
            console.log('- Type:', change.objectType);
            console.log('- Owner:', change.owner);
            
            // Get pool details
            if ('Shared' in change.owner) {
              const pool = await client.getObject({
                id: change.objectId,
                options: {
                  showContent: true,
                  showType: true,
                },
              });
              
              console.log('\nPool details:', JSON.stringify(pool, null, 2));
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error finding pools:', error);
  }
}

findPools().catch(console.error);