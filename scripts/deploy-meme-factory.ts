#!/usr/bin/env node

import { TransactionBlock } from '@iota/iota-sdk/transactions';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { getFullnodeUrl, IotaClient } from '@iota/iota-sdk/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const NETWORK = 'testnet';

async function deployMemeTokenFactory() {
  try {
    // Initialize client
    const client = new IotaClient({ url: getFullnodeUrl(NETWORK) });
    
    // Get keypair from environment or generate new one
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('DEPLOYER_PRIVATE_KEY not found in environment variables');
    }
    
    const keypair = Ed25519Keypair.fromSecretKey(privateKey);
    const address = keypair.getPublicKey().toIotaAddress();
    
    console.log('Deployer address:', address);
    
    // Check balance
    const balance = await client.getBalance({
      owner: address,
      coinType: '0x2::iota::IOTA',
    });
    
    console.log('IOTA Balance:', Number(balance.totalBalance) / 1e9, 'IOTA');
    
    if (Number(balance.totalBalance) < 1e9) {
      throw new Error('Insufficient balance. Need at least 1 IOTA for deployment');
    }
    
    // Get the compiled bytecode
    const packagePath = path.join(__dirname, '..', 'move', 'arva');
    const buildPath = path.join(packagePath, 'build', 'Blitz');
    
    if (!fs.existsSync(buildPath)) {
      throw new Error('Package not built. Run "npm run build:contracts" first');
    }
    
    // Read compiled modules
    const modules = [];
    const bytecodeDir = path.join(buildPath, 'bytecode_modules');
    
    if (fs.existsSync(bytecodeDir)) {
      const files = fs.readdirSync(bytecodeDir);
      for (const file of files) {
        if (file.endsWith('.mv')) {
          const bytecode = fs.readFileSync(path.join(bytecodeDir, file));
          modules.push(Array.from(bytecode));
        }
      }
    }
    
    console.log(`Found ${modules.length} modules to deploy`);
    
    // Create transaction for deployment
    const tx = new TransactionBlock();
    
    // Publish the package
    const [upgradeCap] = tx.publish({
      modules,
      dependencies: [
        '0x1', // iota_std
        '0x2', // iota framework
      ],
    });
    
    // Transfer upgrade capability to deployer
    tx.transferObjects([upgradeCap], address);
    
    // Execute transaction
    console.log('Publishing package...');
    const result = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    console.log('Transaction digest:', result.digest);
    
    // Extract package ID
    const packageId = result.objectChanges?.find(
      (change) => change.type === 'published'
    )?.packageId;
    
    if (!packageId) {
      throw new Error('Failed to extract package ID from transaction');
    }
    
    console.log('Package deployed successfully!');
    console.log('Package ID:', packageId);
    
    // Now initialize the platform
    console.log('\nInitializing meme token factory platform...');
    
    const initTx = new TransactionBlock();
    
    // Call init function which creates the platform
    initTx.moveCall({
      target: `${packageId}::meme_token_factory::init_for_testing`,
      arguments: [],
    });
    
    const initResult = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: initTx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });
    
    console.log('Init transaction digest:', initResult.digest);
    
    // Extract platform ID
    const platformId = initResult.objectChanges?.find(
      (change) => change.type === 'created' && 
                   change.objectType?.includes('::meme_token_factory::Platform')
    )?.objectId;
    
    if (!platformId) {
      console.warn('Could not extract platform ID. You may need to check the transaction manually.');
    } else {
      console.log('Platform ID:', platformId);
    }
    
    // Save deployment info
    const deploymentInfo = {
      network: NETWORK,
      packageId,
      platformId: platformId || 'CHECK_TRANSACTION',
      deployedAt: new Date().toISOString(),
      deployer: address,
      transactionDigest: result.digest,
      initTransactionDigest: initResult.digest,
    };
    
    const deploymentPath = path.join(__dirname, '..', 'deployments', `meme-factory-${NETWORK}.json`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\nDeployment info saved to:', deploymentPath);
    console.log('\nNext steps:');
    console.log('1. Add to .env.local:');
    console.log(`   NEXT_PUBLIC_MEME_PACKAGE_ID=${packageId}`);
    console.log(`   NEXT_PUBLIC_MEME_PLATFORM_ID=${platformId || 'CHECK_TRANSACTION'}`);
    console.log('2. Update config/iota.config.ts with the package ID');
    console.log('3. Verify the platform was created correctly on explorer');
    
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run deployment
deployMemeTokenFactory();