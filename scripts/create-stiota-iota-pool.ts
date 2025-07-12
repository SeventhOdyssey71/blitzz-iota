import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { Transaction } from '@iota/iota-sdk/transactions';
import { Ed25519Keypair } from '@iota/iota-sdk/cryptography';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';

async function createStIotaIotaPool() {
  console.log('🚀 Creating stIOTA/IOTA liquidity pool...\n');
  
  const client = getIotaClientSafe();
  if (!client) {
    console.error('Failed to create IOTA client');
    return;
  }

  // Use environment variable for private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Please set PRIVATE_KEY environment variable');
    console.log('Example: PRIVATE_KEY=0x... npm run create-stiota-pool');
    return;
  }

  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const address = keypair.getPublicKey().toIotaAddress();
  
  console.log('📍 Creating pool from address:', address);
  
  const packageId = blitz_PACKAGE_ID.testnet;
  
  // Define pool parameters for stIOTA/IOTA
  const poolConfig = {
    coinA: SUPPORTED_COINS.stIOTA,
    coinB: SUPPORTED_COINS.IOTA,
    amountA: '1000000000000', // 1000 stIOTA (9 decimals)
    amountB: '1000000000000', // 1000 IOTA (9 decimals) - 1:1 ratio
  };

  try {
    console.log(`\n💧 Creating pool for ${poolConfig.coinA.symbol}/${poolConfig.coinB.symbol}`);
    console.log(`📊 Initial liquidity: ${poolConfig.amountA} ${poolConfig.coinA.symbol} + ${poolConfig.amountB} ${poolConfig.coinB.symbol}`);
    
    // Check balances first
    console.log('\n🔍 Checking balances...');
    
    const coinsA = await client.getCoins({
      owner: address,
      coinType: poolConfig.coinA.type,
    });
    
    const coinsB = await client.getCoins({
      owner: address,
      coinType: poolConfig.coinB.type,
    });
    
    if (!coinsA.data.length || !coinsB.data.length) {
      console.error(`❌ Insufficient balance for ${poolConfig.coinA.symbol} or ${poolConfig.coinB.symbol}`);
      console.error(`stIOTA balance: ${coinsA.data.length ? coinsA.data[0].balance : 0}`);
      console.error(`IOTA balance: ${coinsB.data.length ? coinsB.data[0].balance : 0}`);
      return;
    }
    
    // Calculate total balances
    const totalStIota = coinsA.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    const totalIota = coinsB.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    
    console.log(`✅ stIOTA balance: ${totalStIota.toString()}`);
    console.log(`✅ IOTA balance: ${totalIota.toString()}`);
    
    // Check if we have enough balance
    if (totalStIota < BigInt(poolConfig.amountA)) {
      console.error(`❌ Insufficient stIOTA balance. Need ${poolConfig.amountA}, have ${totalStIota.toString()}`);
      return;
    }
    
    if (totalIota < BigInt(poolConfig.amountB) + BigInt(100000000)) { // Extra for gas
      console.error(`❌ Insufficient IOTA balance. Need ${poolConfig.amountB} + gas, have ${totalIota.toString()}`);
      return;
    }
    
    // Create transaction
    console.log('\n📝 Building transaction...');
    const tx = new Transaction();
    
    // Prepare coin A (stIOTA)
    const coinARef = tx.object(coinsA.data[0].coinObjectId);
    const [coinA] = tx.splitCoins(coinARef, [tx.pure.u64(poolConfig.amountA)]);
    
    // Prepare coin B (IOTA)
    const coinBRef = tx.object(coinsB.data[0].coinObjectId);
    const [coinB] = tx.splitCoins(coinBRef, [tx.pure.u64(poolConfig.amountB)]);
    
    // Create pool
    tx.moveCall({
      target: `${packageId}::simple_dex::create_pool`,
      typeArguments: [poolConfig.coinA.type, poolConfig.coinB.type],
      arguments: [coinA, coinB],
    });
    
    tx.setSender(address);
    tx.setGasBudget(100000000); // 0.1 IOTA for gas
    
    // Sign and execute
    console.log('\n🔄 Executing transaction...');
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    console.log(`\n✅ Pool created successfully!`);
    console.log(`📝 Transaction digest: ${result.digest}`);
    
    // Find the created pool object
    const createdObjects = result.effects?.created || [];
    const poolObject = createdObjects.find(obj => 
      obj.owner && 'Shared' in obj.owner
    );
    
    if (poolObject) {
      console.log(`🏊 Pool ID: ${poolObject.reference.objectId}`);
      console.log(`\n🎉 stIOTA/IOTA pool is now live!`);
      console.log(`Users can now swap between stIOTA and IOTA at a 1:1 ratio`);
      
      // Save pool info to file for reference
      const poolInfo = {
        poolId: poolObject.reference.objectId,
        coinA: poolConfig.coinA.symbol,
        coinB: poolConfig.coinB.symbol,
        coinAType: poolConfig.coinA.type,
        coinBType: poolConfig.coinB.type,
        initialLiquidityA: poolConfig.amountA,
        initialLiquidityB: poolConfig.amountB,
        createdAt: new Date().toISOString(),
        transactionDigest: result.digest,
      };
      
      const fs = await import('fs');
      const path = await import('path');
      const poolsFile = path.join(process.cwd(), 'created-pools.json');
      
      let existingPools = [];
      if (fs.existsSync(poolsFile)) {
        existingPools = JSON.parse(fs.readFileSync(poolsFile, 'utf-8'));
      }
      
      existingPools.push(poolInfo);
      fs.writeFileSync(poolsFile, JSON.stringify(existingPools, null, 2));
      
      console.log(`\n📄 Pool info saved to created-pools.json`);
    }
    
  } catch (error) {
    console.error(`\n❌ Failed to create pool:`, error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
  }
}

// Run the script
createStIotaIotaPool().catch(console.error);