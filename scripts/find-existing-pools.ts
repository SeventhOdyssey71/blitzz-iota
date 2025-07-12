import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';

async function findExistingPools() {
  console.log('🔍 Searching for existing pools...\n');
  
  const client = getIotaClientSafe();
  if (!client) {
    console.error('Failed to create IOTA client');
    return;
  }

  const packageId = blitz_PACKAGE_ID.testnet;
  console.log('Package ID:', packageId);
  
  try {
    // Search for Pool objects created by our package
    const pools = await client.getOwnedObjects({
      owner: packageId,
      filter: {
        StructType: `${packageId}::simple_dex::Pool`
      },
      options: {
        showContent: true,
        showType: true,
      }
    });

    console.log('Found pools:', pools);

    // Also try dynamic field query
    const dynamicFields = await client.getDynamicFields({
      parentId: packageId,
    });

    console.log('Dynamic fields:', dynamicFields);

    // Search for all objects of Pool type
    // Note: This is a more general search
    console.log('\n🔍 Searching for all Pool objects...');
    
    // Get recent transactions from the package
    const txs = await client.queryTransactionBlocks({
      filter: {
        InputObject: packageId
      },
      options: {
        showEffects: true,
        showObjectChanges: true,
      }
    });

    console.log('\nRecent transactions:', txs.data.length);

    // Look for created pools in transaction effects
    const createdPools = [];
    for (const tx of txs.data) {
      const created = tx.effects?.created || [];
      for (const obj of created) {
        if (obj.owner && 'Shared' in obj.owner) {
          console.log('\nFound shared object:', {
            objectId: obj.reference.objectId,
            digest: obj.reference.digest,
            version: obj.reference.version
          });
          
          // Get the object to check if it's a pool
          try {
            const poolObj = await client.getObject({
              id: obj.reference.objectId,
              options: {
                showContent: true,
                showType: true,
              }
            });
            
            if (poolObj.data?.type?.includes('Pool')) {
              console.log('✅ Confirmed as Pool:', poolObj.data);
              createdPools.push({
                poolId: obj.reference.objectId,
                type: poolObj.data.type,
                content: poolObj.data.content
              });
            }
          } catch (e) {
            console.log('Could not fetch object:', e);
          }
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log('Total pools found:', createdPools.length);
    
    // Save to file
    if (createdPools.length > 0) {
      const fs = await import('fs');
      const path = await import('path');
      
      const outputFile = path.join(process.cwd(), 'found-pools.json');
      fs.writeFileSync(outputFile, JSON.stringify(createdPools, null, 2));
      console.log(`\n💾 Pool information saved to: ${outputFile}`);
    }

  } catch (error) {
    console.error('Error searching for pools:', error);
  }
}

// Run the script
findExistingPools().catch(console.error);