import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { getFullnodeUrl, IotaClient } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { SUPPORTED_COINS, blitz_PACKAGE_ID } from '../config/iota.config';
import { PoolTracker } from '../lib/services/pool-tracker';

// Configuration
const NETWORK = 'testnet';
const packageId = blitz_PACKAGE_ID[NETWORK];

// Pool configuration
const poolConfig = {
  coinA: SUPPORTED_COINS.IOTA,
  coinB: SUPPORTED_COINS.stIOTA,
  amountA: '1000000000000', // 1000 IOTA
  amountB: '1000000000000', // 1000 stIOTA - 1:1 ratio
};

async function createPool() {
  try {
    // Get keypair from environment or use a test keypair
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.error('Please set PRIVATE_KEY environment variable');
      process.exit(1);
    }

    const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
    const address = keypair.getPublicKey().toIotaAddress();
    
    console.log('Creating pool with address:', address);
    console.log('Package ID:', packageId);
    console.log('Network:', NETWORK);

    // Create client
    const client = new IotaClient({ url: getFullnodeUrl(NETWORK) });
    
    // Check balances
    console.log('\nChecking balances...');
    
    // Get IOTA balance
    const iotaCoins = await client.getCoins({
      owner: address,
      coinType: poolConfig.coinA.type,
    });
    
    const iotaBalance = iotaCoins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    console.log(`IOTA balance: ${iotaBalance.toString()} (${Number(iotaBalance) / 1e9} IOTA)`);
    
    // Get stIOTA balance
    const stIotaCoins = await client.getCoins({
      owner: address,
      coinType: poolConfig.coinB.type,
    });
    
    const stIotaBalance = stIotaCoins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    console.log(`stIOTA balance: ${stIotaBalance.toString()} (${Number(stIotaBalance) / 1e9} stIOTA)`);
    
    // Check if we have enough balance
    const requiredIota = BigInt(poolConfig.amountA) + BigInt(200000000); // Add gas buffer
    const requiredStIota = BigInt(poolConfig.amountB);
    
    if (iotaBalance < requiredIota) {
      console.error(`Insufficient IOTA balance. Required: ${requiredIota}, Available: ${iotaBalance}`);
      process.exit(1);
    }
    
    if (stIotaBalance < requiredStIota) {
      console.error(`Insufficient stIOTA balance. Required: ${requiredStIota}, Available: ${stIotaBalance}`);
      process.exit(1);
    }
    
    console.log('\nCreating transaction...');
    
    // Create transaction
    const tx = new Transaction();
    
    // Split coins for exact amounts
    const [coinA] = tx.splitCoins(tx.object(iotaCoins.data[0].coinObjectId), [poolConfig.amountA]);
    const [coinB] = tx.splitCoins(tx.object(stIotaCoins.data[0].coinObjectId), [poolConfig.amountB]);
    
    // Create pool
    tx.moveCall({
      target: `${packageId}::simple_dex::create_pool`,
      typeArguments: [poolConfig.coinA.type, poolConfig.coinB.type],
      arguments: [coinA, coinB],
    });
    
    // Set gas budget
    tx.setGasBudget(100000000);
    
    console.log('Executing transaction...');
    
    // Execute transaction
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
      },
    });
    
    console.log('\nTransaction result:', result.digest);
    
    // Extract pool ID from created objects
    let poolId = null;
    if (result.objectChanges) {
      for (const change of result.objectChanges) {
        if (change.type === 'created' && change.owner === 'Shared') {
          console.log('\nCreated shared object:', change.objectId);
          poolId = change.objectId;
          break;
        }
      }
    }
    
    if (poolId) {
      console.log('\n✅ Pool created successfully!');
      console.log('Pool ID:', poolId);
      
      // Save to pool tracker
      await PoolTracker.savePool({
        poolId,
        coinTypeA: poolConfig.coinA.type,
        coinTypeB: poolConfig.coinB.type,
        network: NETWORK,
      });
      
      console.log('\nPool information saved to tracker.');
      console.log('\nNext steps:');
      console.log('1. Update KNOWN_POOLS in config/known-pools.ts with this pool ID');
      console.log('2. The pool is now ready for swaps with 0.3% fees!');
    } else {
      console.error('Failed to extract pool ID from transaction result');
    }
    
  } catch (error) {
    console.error('Error creating pool:', error);
    process.exit(1);
  }
}

// Run the script
createPool().then(() => {
  console.log('\nDone!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});