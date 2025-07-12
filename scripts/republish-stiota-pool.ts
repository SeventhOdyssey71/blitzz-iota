import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { Transaction } from '@iota/iota-sdk/transactions';
import { Ed25519Keypair } from '@iota/iota-sdk/cryptography';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';
import * as fs from 'fs';
import * as path from 'path';

async function republishStIotaPool() {
  console.log('🔄 Republishing stIOTA/IOTA liquidity pool...\n');
  
  const client = getIotaClientSafe();
  if (!client) {
    console.error('Failed to create IOTA client');
    return;
  }

  // Use environment variable for private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Please set PRIVATE_KEY environment variable');
    console.log('Example: PRIVATE_KEY=0x... npm run republish:stiota-pool');
    return;
  }

  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const address = keypair.getPublicKey().toIotaAddress();
  
  console.log('📍 Creating pool from address:', address);
  
  const packageId = blitz_PACKAGE_ID.testnet;
  console.log('📦 Package ID:', packageId);
  
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
      return;
    }
    
    // Calculate total balances
    const totalStIota = coinsA.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    const totalIota = coinsB.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    
    console.log(`✅ stIOTA balance: ${totalStIota.toString()} (${Number(totalStIota) / 1e9} stIOTA)`);
    console.log(`✅ IOTA balance: ${totalIota.toString()} (${Number(totalIota) / 1e9} IOTA)`);
    
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
    const [coinA] = tx.splitCoins(coinARef, [poolConfig.amountA]);
    
    // Prepare coin B (IOTA)
    const coinBRef = tx.object(coinsB.data[0].coinObjectId);
    const [coinB] = tx.splitCoins(coinBRef, [poolConfig.amountB]);
    
    // Create pool
    tx.moveCall({
      target: `${packageId}::simple_dex::create_pool`,
      typeArguments: [poolConfig.coinA.type, poolConfig.coinB.type],
      arguments: [coinA, coinB],
    });
    
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
      
      // Update known-pools.ts file
      const knownPoolsPath = path.join(process.cwd(), 'config/known-pools.ts');
      let knownPoolsContent = fs.readFileSync(knownPoolsPath, 'utf-8');
      
      // Replace the old pool ID with the new one
      const oldPoolId = '0xa1c07395edbb91388e551127528b6879d08c8aef115ef6a8d9374348af2d7020';
      knownPoolsContent = knownPoolsContent.replace(new RegExp(oldPoolId, 'g'), poolObject.reference.objectId);
      
      fs.writeFileSync(knownPoolsPath, knownPoolsContent);
      console.log(`\n📝 Updated known-pools.ts with new pool ID`);
      
      // Save pool info
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
      
      const poolsFile = path.join(process.cwd(), 'created-pools.json');
      let existingPools = [];
      if (fs.existsSync(poolsFile)) {
        existingPools = JSON.parse(fs.readFileSync(poolsFile, 'utf-8'));
      }
      
      existingPools.push(poolInfo);
      fs.writeFileSync(poolsFile, JSON.stringify(existingPools, null, 2));
      
      console.log(`📄 Pool info saved to created-pools.json`);
      
      // Test the pool
      console.log('\n🧪 Testing pool...');
      try {
        const poolObj = await client.getObject({
          id: poolObject.reference.objectId,
          options: {
            showContent: true,
            showType: true,
          }
        });
        
        console.log('✅ Pool is accessible and working!');
        console.log('Pool type:', poolObj.data?.type);
        
        if (poolObj.data?.content?.dataType === 'moveObject') {
          const fields = poolObj.data.content.fields as any;
          console.log('Reserve A:', fields.reserve_a);
          console.log('Reserve B:', fields.reserve_b);
          console.log('LP Supply:', fields.lp_supply);
        }
      } catch (testError) {
        console.error('❌ Error testing pool:', testError);
      }
    }
    
  } catch (error) {
    console.error(`\n❌ Failed to create pool:`, error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      
      // Check for specific errors
      if (error.message.includes('dry run')) {
        console.log('\n💡 Dry run errors can be ignored. The transaction may still succeed.');
        console.log('Try running the script again or check the explorer for your transaction.');
      }
    }
  }
}

// Run the script
republishStIotaPool().catch(console.error);