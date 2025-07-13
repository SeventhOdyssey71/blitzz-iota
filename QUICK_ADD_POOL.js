// Quick script to add IOTA/stIOTA pool
// Run this in browser console on your BLITZZ app

// Option 1: If you have the pool ID
function addPoolById(poolId) {
  const pools = JSON.parse(localStorage.getItem('blitz_created_pools') || '[]');
  const exists = pools.some(p => p.poolId === poolId);
  
  if (!exists) {
    pools.push({
      poolId: poolId,
      coinTypeA: '0x2::iota::IOTA',
      coinTypeB: '0x26a1b854be7b454f5e03d3e0b0891f576a0f72b15e2c6aadd17a86ea7fd3c3e6::staking::STIOTA',
      createdAt: Date.now(),
      network: 'testnet'
    });
    localStorage.setItem('blitz_created_pools', JSON.stringify(pools));
    window.dispatchEvent(new Event('pool-cache-refresh'));
    console.log('✅ Pool added successfully!');
    console.log('Pool ID:', poolId);
    console.log('You can now swap IOTA/stIOTA');
  } else {
    console.log('Pool already exists');
  }
}

// Option 2: Try to extract from transaction
async function addFromTx() {
  const txHash = 'DBJiftpbLE9JJ3e5N6rtLUHsMs3FZkbaYHJRaRdp5WR2';
  
  if (window.extractPoolFromTransaction) {
    console.log('Extracting pool from transaction...');
    const result = await window.extractPoolFromTransaction(txHash);
    console.log('Result:', result);
    
    if (result && result.success) {
      console.log('✅ Pool extracted and added!');
      console.log('Pool ID:', result.poolId);
    } else {
      console.log('Could not extract pool from transaction');
      console.log('You may need to add it manually with the pool ID');
    }
  } else {
    console.log('extractPoolFromTransaction not available');
    console.log('Please refresh the page and try again');
  }
}

// Instructions
console.log('=== IOTA/stIOTA Pool Setup ===');
console.log('');
console.log('Option 1: If you know the pool ID from the transaction');
console.log('Run: addPoolById("0x...")');
console.log('');
console.log('Option 2: Try automatic extraction');
console.log('Run: addFromTx()');
console.log('');
console.log('The transaction shows 2 IOTA + 2 stIOTA liquidity was added');
console.log('Once the pool is added, you can swap between IOTA and stIOTA');