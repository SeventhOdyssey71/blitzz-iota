#!/usr/bin/env node

const { Transaction } = require('@iota/iota-sdk/transactions');
const { getFullnodeUrl, IotaClient } = require('@iota/iota-sdk/client');
const { Ed25519Keypair } = require('@iota/iota-sdk/keypairs/ed25519');
const { blitz_PACKAGE_ID, SUPPORTED_COINS } = require('../config/iota.config');

async function createPools() {
  console.log('🏊 Creating initial liquidity pools...\n');

  // Get keypair from environment or create new one
  const keypair = Ed25519Keypair.deriveKeypair(
    process.env.IOTA_MNEMONIC || Ed25519Keypair.generateMnemonic()
  );
  
  const client = new IotaClient({ url: getFullnodeUrl('testnet') });
  const address = keypair.getPublicKey().toIotaAddress();

  console.log('📍 Using address:', address);

  // Pool configurations
  const pools = [
    {
      name: 'IOTA/USDC',
      coinA: SUPPORTED_COINS.IOTA.type,
      coinB: SUPPORTED_COINS.USDC.type,
      amountA: '1000000000000', // 1000 IOTA
      amountB: '1000000000', // 1000 USDC
      decimalsA: 9,
      decimalsB: 6,
    },
    {
      name: 'IOTA/USDT',
      coinA: SUPPORTED_COINS.IOTA.type,
      coinB: SUPPORTED_COINS.USDT.type,
      amountA: '1000000000000', // 1000 IOTA
      amountB: '1000000000', // 1000 USDT
      decimalsA: 9,
      decimalsB: 6,
    },
    {
      name: 'USDC/USDT',
      coinA: SUPPORTED_COINS.USDC.type,
      coinB: SUPPORTED_COINS.USDT.type,
      amountA: '1000000000', // 1000 USDC
      amountB: '1000000000', // 1000 USDT
      decimalsA: 6,
      decimalsB: 6,
    },
  ];

  for (const pool of pools) {
    try {
      console.log(`\nCreating ${pool.name} pool...`);
      
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

      if (packageId === '0x0') {
        console.error('❌ Package not deployed yet. Run npm run deploy:contracts first');
        process.exit(1);
      }

      // Get coins
      const coinsA = await client.getCoins({
        owner: address,
        coinType: pool.coinA,
      });

      const coinsB = await client.getCoins({
        owner: address,
        coinType: pool.coinB,
      });

      if (!coinsA.data.length || !coinsB.data.length) {
        console.log(`⚠️  Insufficient balance for ${pool.name}. Skipping...`);
        continue;
      }

      // Prepare coins
      const coinA = tx.object(coinsA.data[0].coinObjectId);
      const coinB = tx.object(coinsB.data[0].coinObjectId);

      // Split exact amounts
      const [coinAToAdd] = tx.splitCoins(coinA, [tx.pure.u64(pool.amountA)]);
      const [coinBToAdd] = tx.splitCoins(coinB, [tx.pure.u64(pool.amountB)]);

      // Create pool
      tx.moveCall({
        target: `${packageId}::dex::create_pool`,
        typeArguments: [pool.coinA, pool.coinB],
        arguments: [
          coinAToAdd,
          coinBToAdd,
          tx.pure.u64(30), // 0.3% fee
        ],
      });

      // Execute transaction
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      console.log(`✅ ${pool.name} pool created! TX: ${result.digest}`);

      // Extract pool ID from events
      const createEvent = result.events?.find(
        e => e.type.includes('::dex::PoolCreated')
      );
      
      if (createEvent) {
        console.log(`   Pool ID: ${createEvent.parsedJson?.pool_id}`);
      }

    } catch (error) {
      console.error(`❌ Failed to create ${pool.name} pool:`, error.message);
    }
  }

  console.log('\n✨ Pool creation complete!');
}

// Run pool creation
createPools().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});