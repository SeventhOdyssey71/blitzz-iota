// Browser console script to analyze the liquidity transaction
// Run this in the browser console while on the Cetus DeFi platform

async function analyzeLiquidityTx() {
  const txDigest = 'DBJiftpbLE9JJ3e5N6rtLUHsMs3FZkbaYHJRaRdp5WR2';
  
  console.log('=== Analyzing Liquidity Transaction ===');
  console.log('Transaction hash:', txDigest);
  console.log('Network: testnet');
  console.log('Transaction URL: https://explorer.iota.org/txblock/' + txDigest + '?network=testnet');
  console.log('');
  
  // Check if extractPoolFromTransaction is available
  if (typeof window.extractPoolFromTransaction !== 'function') {
    console.error('extractPoolFromTransaction not available. Make sure you are on a page that loads the pool extraction functions.');
    return;
  }
  
  try {
    // Extract pool from transaction
    console.log('Extracting pool from transaction...');
    const result = await window.extractPoolFromTransaction(txDigest);
    
    if (result.success) {
      console.log('✅ Successfully extracted pool!');
      console.log('Pool ID:', result.poolId);
      console.log('Coin Type A:', result.coinTypeA);
      console.log('Coin Type B:', result.coinTypeB);
      console.log('');
      
      // Check localStorage for tracked pools
      const pools = JSON.parse(localStorage.getItem('blitz_created_pools') || '[]');
      const isTracked = pools.some(p => p.poolId === result.poolId);
      
      console.log('=== Pool Tracking Status ===');
      console.log('Total pools in localStorage:', pools.length);
      console.log('This pool is tracked:', isTracked ? 'YES' : 'NO');
      
      if (isTracked) {
        const pool = pools.find(p => p.poolId === result.poolId);
        console.log('Pool details:', pool);
      }
      
      // Try to fetch pool details
      console.log('');
      console.log('=== Fetching Pool Details ===');
      console.log('You can check the pool details at:');
      console.log('https://explorer.iota.org/object/' + result.poolId + '?network=testnet');
      
    } else {
      console.error('Failed to extract pool:', result.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the analysis
analyzeLiquidityTx();