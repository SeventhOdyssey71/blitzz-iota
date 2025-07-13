// Browser console script to add the recent IOTA/stIOTA pool
// Run this in your browser console while on the BLITZZ app

(async function() {
  console.log('🔍 Analyzing liquidity transaction...');
  
  const txDigest = 'DBJiftpbLE9JJ3e5N6rtLUHsMs3FZkbaYHJRaRdp5WR2';
  
  try {
    // Use the extractPoolFromTransaction function if available
    if (window.extractPoolFromTransaction) {
      console.log('Using extractPoolFromTransaction...');
      const poolId = await window.extractPoolFromTransaction(txDigest);
      
      if (poolId) {
        console.log('✅ Pool extracted and added:', poolId);
        window.dispatchEvent(new Event('pool-cache-refresh'));
        console.log('🔄 Pool cache refreshed!');
        console.log('Try swapping IOTA/stIOTA now.');
        return;
      }
    }
    
    // Manual approach - fetch transaction details
    console.log('Fetching transaction from blockchain...');
    const response = await fetch(`https://fullnode.testnet.iota.org:443`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'iota_getTransactionBlock',
        params: [txDigest, {
          showInput: true,
          showRawInput: false,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        }],
      }),
    });
    
    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    const tx = result.result;
    console.log('Transaction status:', tx.effects?.status?.status);
    
    // Look for created pool objects
    const createdObjects = tx.objectChanges?.filter(change => change.type === 'created') || [];
    console.log('Created objects:', createdObjects.length);
    
    let poolFound = false;
    for (const obj of createdObjects) {
      console.log('Checking object:', obj.objectType);
      
      if (obj.objectType?.includes('::dex::Pool<') || obj.objectType?.includes('::simple_dex::Pool<')) {
        console.log('Found pool object:', obj.objectId);
        
        // Extract coin types
        const typeMatch = obj.objectType.match(/Pool<(.+?),\s*(.+?)>/);
        if (typeMatch) {
          const coinTypeA = typeMatch[1].trim();
          const coinTypeB = typeMatch[2].trim();
          
          console.log('Coin types:', { coinTypeA, coinTypeB });
          
          // Check if it's IOTA/stIOTA
          const IOTA_TYPE = '0x2::iota::IOTA';
          const STIOTA_TYPE = '0x26a1b854be7b454f5e03d3e0b0891f576a0f72b15e2c6aadd17a86ea7fd3c3e6::staking::STIOTA';
          
          const isIotaStIota = 
            (coinTypeA === IOTA_TYPE && coinTypeB === STIOTA_TYPE) ||
            (coinTypeA === STIOTA_TYPE && coinTypeB === IOTA_TYPE);
          
          if (isIotaStIota) {
            console.log('✅ Found IOTA/stIOTA pool!');
            
            // Add to tracker
            const pools = JSON.parse(localStorage.getItem('blitz_created_pools') || '[]');
            const exists = pools.some(p => p.poolId === obj.objectId);
            
            if (!exists) {
              pools.push({
                poolId: obj.objectId,
                coinTypeA,
                coinTypeB,
                createdAt: Date.now(),
                network: 'testnet',
              });
              localStorage.setItem('blitz_created_pools', JSON.stringify(pools));
              console.log('📝 Pool added to tracker');
            } else {
              console.log('Pool already tracked');
            }
            
            // Refresh
            window.dispatchEvent(new Event('pool-cache-refresh'));
            console.log('🔄 Pool cache refreshed!');
            
            poolFound = true;
            console.log('\n✨ Pool ID:', obj.objectId);
            console.log('You can now swap IOTA/stIOTA!');
            break;
          }
        }
      }
    }
    
    if (!poolFound) {
      console.log('⚠️ Could not find IOTA/stIOTA pool in transaction');
      console.log('Transaction might be for a different pool');
    }
    
  } catch (error) {
    console.error('Error:', error);
    console.log('\n💡 Alternative: Manually add the pool by running:');
    console.log(`
// If you know the pool ID, add it directly:
const pools = JSON.parse(localStorage.getItem('blitz_created_pools') || '[]');
pools.push({
  poolId: 'YOUR_POOL_ID_HERE',
  coinTypeA: '0x2::iota::IOTA',
  coinTypeB: '0x26a1b854be7b454f5e03d3e0b0891f576a0f72b15e2c6aadd17a86ea7fd3c3e6::staking::STIOTA',
  createdAt: Date.now(),
  network: 'testnet'
});
localStorage.setItem('blitz_created_pools', JSON.stringify(pools));
window.dispatchEvent(new Event('pool-cache-refresh'));
    `);
  }
})();