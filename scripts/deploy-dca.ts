import { TransactionBlock } from '@iota/iota-sdk/transactions';
import { IotaClient } from '@iota/iota-sdk/client';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@iota/iota-sdk/cryptography';
import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const NETWORK = process.env.NETWORK || 'testnet';
const RPC_URL = process.env.RPC_URL || 'https://api.testnet.iota.cafe';

async function deployDCAContracts() {
  console.log('🚀 Deploying DCA contracts to', NETWORK);
  
  // Initialize client
  const client = new IotaClient({ url: RPC_URL });
  
  // Get deployer keypair from environment
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('DEPLOYER_PRIVATE_KEY not found in environment');
  }
  
  let keypair: Ed25519Keypair;
  try {
    // Try to decode as Sui/Iota format private key
    const decoded = decodeSuiPrivateKey(privateKey);
    keypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
  } catch {
    // If that fails, try as raw hex
    const privateKeyBytes = Buffer.from(privateKey.replace('0x', ''), 'hex');
    keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
  }
  
  const address = keypair.getPublicKey().toSuiAddress();
  console.log('Deployer address:', address);
  
  // Check balance
  const balance = await client.getBalance({
    owner: address,
    coinType: '0x2::iota::IOTA'
  });
  console.log('Balance:', balance.totalBalance, 'IOTA');
  
  try {
    // Read existing deployment info to get package ID
    const deploymentPath = path.join(__dirname, `../deployments/limit-order-${NETWORK}.json`);
    let packageId: string;
    
    if (fs.existsSync(deploymentPath)) {
      const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
      packageId = deploymentInfo.packageId;
      console.log('Using existing package ID:', packageId);
    } else {
      throw new Error('Limit order deployment not found. Please deploy limit orders first.');
    }
    
    // Create DCA Registry
    console.log('\n📋 Creating DCA Registry...');
    
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${packageId}::dca::create_dca_registry`,
      arguments: []
    });
    
    const result = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      }
    });
    
    console.log('Transaction digest:', result.digest);
    
    const dcaRegistryId = result.objectChanges?.find(
      change => change.type === 'created' && 
        (change as any).objectType?.includes('DCARegistry')
    )?.objectId;
    
    if (!dcaRegistryId) {
      throw new Error('Failed to extract DCA Registry ID from transaction result');
    }
    
    console.log('✅ DCA Registry created:', dcaRegistryId);
    
    // Save DCA deployment info
    const dcaDeploymentInfo = {
      network: NETWORK,
      packageId,
      dcaRegistry: dcaRegistryId,
      deployedAt: new Date().toISOString(),
      deployer: address
    };
    
    const dcaDeploymentPath = path.join(__dirname, `../deployments/dca-${NETWORK}.json`);
    fs.writeFileSync(dcaDeploymentPath, JSON.stringify(dcaDeploymentInfo, null, 2));
    
    // Update the main deployment info
    const fullDeploymentInfo = {
      ...JSON.parse(fs.readFileSync(deploymentPath, 'utf-8')),
      dcaRegistry: dcaRegistryId,
      dcaDeployedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(deploymentPath, JSON.stringify(fullDeploymentInfo, null, 2));
    
    console.log('\n✅ DCA Deployment complete!');
    console.log('DCA deployment info saved to:', dcaDeploymentPath);
    console.log('Main deployment info updated');
    
    // Create example DCA strategies for testing
    console.log('\n🧪 Creating example DCA strategies...');
    
    const exampleStrategies = await createExampleStrategies(
      client,
      keypair,
      packageId,
      dcaRegistryId
    );
    
    if (exampleStrategies.length > 0) {
      console.log('✅ Created', exampleStrategies.length, 'example strategies');
    }
    
    return dcaDeploymentInfo;
    
  } catch (error) {
    console.error('❌ DCA Deployment failed:', error);
    throw error;
  }
}

async function createExampleStrategies(
  client: IotaClient,
  keypair: Ed25519Keypair,
  packageId: string,
  dcaRegistryId: string
): Promise<string[]> {
  const strategies: string[] = [];
  
  try {
    // Get existing pools from deployment
    const poolsPath = path.join(__dirname, `../deployments/pools-${NETWORK}.json`);
    if (!fs.existsSync(poolsPath)) {
      console.log('No pools found, skipping example strategies');
      return strategies;
    }
    
    const poolsInfo = JSON.parse(fs.readFileSync(poolsPath, 'utf-8'));
    
    // Create a DCA strategy for VUSD -> IOTA
    const vUsdIotaPool = poolsInfo.pools?.find((p: any) => 
      p.coinAType?.includes('vusd') && p.coinBType?.includes('iota')
    );
    
    if (vUsdIotaPool) {
      console.log('Creating example DCA strategy for VUSD -> IOTA...');
      
      const tx = new TransactionBlock();
      
      // Create a small amount of VUSD for testing (0.1 VUSD)
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(100000)]); // 0.1 VUSD (6 decimals)
      
      tx.moveCall({
        target: `${packageId}::dca::create_dca_strategy`,
        arguments: [
          tx.object(dcaRegistryId),
          tx.object(vUsdIotaPool.poolId),
          coin,
          tx.pure(3600000), // 1 hour interval
          tx.pure(10), // 10 orders
          tx.pure(0), // No min price
          tx.pure(0), // No max price
          tx.object('0x6'), // Clock
        ],
        typeArguments: [
          '0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081::vusd::VUSD',
          '0x2::iota::IOTA'
        ]
      });
      
      const result = await client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        }
      });
      
      const strategyId = result.objectChanges?.find(
        change => change.type === 'created' && 
          (change as any).objectType?.includes('DCAStrategy')
      )?.objectId;
      
      if (strategyId) {
        strategies.push(strategyId);
        console.log('✅ Created example DCA strategy:', strategyId);
      }
    }
    
  } catch (error) {
    console.error('Failed to create example strategies:', error);
  }
  
  return strategies;
}

// Run deployment
deployDCAContracts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });