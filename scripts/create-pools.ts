import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { Transaction } from '@iota/iota-sdk/transactions';
import { Ed25519Keypair } from '@iota/iota-sdk/cryptography';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';

async function createPools() {
  const client = getIotaClientSafe();
  if (!client) {
    console.error('Failed to create IOTA client');
    return;
  }

  // Use environment variable or prompt for private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Please set PRIVATE_KEY environment variable');
    return;
  }

  const keypair = Ed25519Keypair.fromSecretKey(privateKey);
  const address = keypair.getPublicKey().toIotaAddress();
  
  console.log('Creating pools from address:', address);
  
  const packageId = blitz_PACKAGE_ID.testnet;
  
  // Define pool pairs and initial liquidity
  const poolPairs = [
    {
      coinA: SUPPORTED_COINS.IOTA,
      coinB: SUPPORTED_COINS.vUSD,
      amountA: '1000000000000', // 1000 IOTA
      amountB: '280000000000', // 280 vUSD (0.28 rate)
    },
    {
      coinA: SUPPORTED_COINS.stIOTA,
      coinB: SUPPORTED_COINS.vUSD,
      amountA: '1000000000000', // 1000 stIOTA
      amountB: '280000000000', // 280 vUSD (0.28 rate)
    },
  ];

  for (const pair of poolPairs) {
    try {
      console.log(`\nCreating pool for ${pair.coinA.symbol}/${pair.coinB.symbol}`);
      
      // Create transaction
      const tx = new Transaction();
      
      // Get coins for pool creation
      const coinsA = await client.getCoins({
        owner: address,
        coinType: pair.coinA.type,
      });
      
      const coinsB = await client.getCoins({
        owner: address,
        coinType: pair.coinB.type,
      });
      
      if (!coinsA.data.length || !coinsB.data.length) {
        console.error(`Insufficient balance for ${pair.coinA.symbol} or ${pair.coinB.symbol}`);
        continue;
      }
      
      // Prepare coin A
      const coinARef = tx.object(coinsA.data[0].coinObjectId);
      const [coinA] = tx.splitCoins(coinARef, [tx.pure.u64(pair.amountA)]);
      
      // Prepare coin B
      const coinBRef = tx.object(coinsB.data[0].coinObjectId);
      const [coinB] = tx.splitCoins(coinBRef, [tx.pure.u64(pair.amountB)]);
      
      // Create pool
      tx.moveCall({
        target: `${packageId}::simple_dex::create_pool`,
        typeArguments: [pair.coinA.type, pair.coinB.type],
        arguments: [coinA, coinB],
      });
      
      tx.setSender(address);
      tx.setGasBudget(100000000);
      
      // Sign and execute
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      
      console.log(`Pool created! Transaction: ${result.digest}`);
      
      // Find the created pool object
      const createdObjects = result.effects?.created || [];
      const poolObject = createdObjects.find(obj => 
        obj.owner && 'Shared' in obj.owner
      );
      
      if (poolObject) {
        console.log(`Pool ID: ${poolObject.reference.objectId}`);
      }
      
    } catch (error) {
      console.error(`Failed to create pool for ${pair.coinA.symbol}/${pair.coinB.symbol}:`, error);
    }
  }
}

// Run the script
createPools().catch(console.error);