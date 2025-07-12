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
    // Query transaction events to find pool creation
    const events = await client.queryEvents({
      query: {
        Sender: '0xaf826c13d7f820a0865efdfcd8c7441b0c883ba06a562b653fd37d10a86702e3',
      },
      limit: 50,
      order: 'descending',
    });

    console.log(`Found ${events.data.length} events`);
    
    // Look for object creation events
    for (const event of events.data) {
      if (event.type.includes('::simple_dex::Pool')) {
        console.log('Pool creation event found:', event);
      }
    }

    // Also check for created objects in recent transactions
    const txs = await client.queryTransactionBlocks({
      filter: {
        FromAddress: '0xaf826c13d7f820a0865efdfcd8c7441b0c883ba06a562b653fd37d10a86702e3',
      },
      limit: 10,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log(`\nFound ${txs.data.length} transactions`);
    
    for (const tx of txs.data) {
      if (tx.objectChanges) {
        for (const change of tx.objectChanges) {
          if (change.type === 'created' && change.objectType.includes('::simple_dex::Pool')) {
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