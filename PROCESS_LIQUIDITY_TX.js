// Browser console script to process liquidity addition transaction
// Run this in your browser console on the BLITZZ app

(async function() {
  console.log('🔍 Processing liquidity addition transaction...');
  
  const txDigest = 'CLS5t6kzs2cxYuUx9r2faJU9o88beoeCoNSStrymWeEq';
  
  try {
    // Method 1: Use the new liquidity extraction function
    if (window.extractLiquidityFromTransaction) {
      console.log('Using extractLiquidityFromTransaction...');
      const result = await window.extractLiquidityFromTransaction(txDigest);
      
      if (result.success) {
        console.log('✅ Liquidity addition processed successfully!');
        console.log('Pool ID:', result.poolId);
        console.log('LP Token ID:', result.lpTokenId);
        if (result.poolInfo) {
          console.log('New reserves:', {
            reserveA: result.poolInfo.newReserveA,
            reserveB: result.poolInfo.newReserveB
          });
        }
        
        // Refresh the UI
        if (window.refreshPoolCache) {
          await window.refreshPoolCache();
          console.log('🔄 Pool cache refreshed!');
        }
        
        console.log('\n✨ The liquidity should now be visible in the pool interface!');
        return;
      } else {
        console.log('⚠️ Could not extract liquidity info:', result.message);
      }
    }
    
    // Method 2: Try the existing extractAndTrackPoolFromTx function
    if (window.extractAndTrackPoolFromTx) {
      console.log('\nTrying extractAndTrackPoolFromTx...');
      const result = await window.extractAndTrackPoolFromTx(txDigest);
      console.log('Result:', result);
      
      if (result && result.poolId) {
        console.log('✅ Pool tracked successfully!');
        await window.refreshPoolCache();
        return;
      }
    }
    
    // Method 3: Manual refresh
    console.log('\n💡 Performing manual pool refresh...');
    if (window.refreshPoolCache) {
      await window.refreshPoolCache();
      console.log('✅ Pool cache refreshed manually');
    }
    
    // Force UI update
    window.location.reload();
    
  } catch (error) {
    console.error('❌ Error processing transaction:', error);
    console.log('\n💡 Try refreshing the page manually');
  }
})();

// Additional helper to check pool state
console.log('\n📝 To check current pool state, run:');
console.log('JSON.parse(localStorage.getItem("blitz_created_pools"))');
console.log('\n📝 To manually refresh pools, run:');
console.log('await window.refreshPoolCache()');