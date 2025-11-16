/**
 * Test script for swap functionality
 * Run this in browser console after creating a pool
 */

// Test swap functionality after pool creation
window.testSwapFunctionality = async function() {
  console.log('🧪 Testing Swap Functionality...\n');
  
  try {
    // Enable debug mode
    window.debugPools = true;
    
    const { PoolDiscovery } = await import('/lib/services/pool-discovery.js');
    const { SUPPORTED_COINS } = await import('/config/iota.config.js');
    
    // Test pool discovery
    console.log('1. Testing pool discovery...');
    const pool = await PoolDiscovery.findPoolsForPair(
      SUPPORTED_COINS.IOTA.type,
      SUPPORTED_COINS.stIOTA.type,
      'testnet'
    );
    
    console.log('Pool found:', !!pool);
    if (pool) {
      console.log('✅ Pool exists:', {
        poolId: pool.poolId,
        reserveA: pool.reserveA.toString(),
        reserveB: pool.reserveB.toString(),
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB
      });
      
      // Test swap calculation
      console.log('\n2. Testing swap calculations...');
      const inputAmount = BigInt('1000000000'); // 1 IOTA
      const isAToB = pool.coinTypeA === SUPPORTED_COINS.IOTA.type;
      
      const result = PoolDiscovery.calculateOutputAmount(pool, inputAmount, isAToB);
      console.log('✅ Swap calculation works:', {
        inputAmount: inputAmount.toString(),
        outputAmount: result.outputAmount.toString(),
        priceImpact: result.priceImpact,
        minimumReceived: result.minimumReceived.toString()
      });
      
      return true;
    } else {
      console.log('❌ No pool found - create a pool first');
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
};

// Instructions for testing
console.log('📋 To test swap functionality:');
console.log('1. Create a pool first using the Pools tab');
console.log('2. Run: await testSwapFunctionality()');
console.log('3. If pools exist, test swaps on the Swap tab');