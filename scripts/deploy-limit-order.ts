import { TransactionBlock } from '@iota/iota-sdk/transactions';
import { IotaClient } from '@iota/iota-sdk/client';
import { Ed25519Keypair } from '@iota/iota-sdk/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@iota/iota-sdk/cryptography';
import * as dotenv from 'dotenv';
import path from 'path';
import { execSync } from 'child_process';
import fs from 'fs';

dotenv.config();

const NETWORK = process.env.NETWORK || 'testnet';
const RPC_URL = process.env.RPC_URL || 'https://api.testnet.iota.cafe';

async function deployLimitOrderContracts() {
  console.log('🚀 Deploying Limit Order contracts to', NETWORK);
  
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
    // Build the Move package
    const packagePath = path.join(__dirname, '../move/arva');
    console.log('Building Move package at:', packagePath);
    
    execSync('iota move build', {
      cwd: packagePath,
      stdio: 'inherit'
    });
    
    // Read the compiled modules
    const buildPath = path.join(packagePath, 'build/Blitz');
    const compiledModulesPath = path.join(buildPath, 'bytecode_modules');
    
    if (!fs.existsSync(compiledModulesPath)) {
      throw new Error('Compiled modules not found. Make sure the package builds successfully.');
    }
    
    const moduleFiles = fs.readdirSync(compiledModulesPath)
      .filter(file => file.endsWith('.mv'));
    
    const modules = moduleFiles.map(file => {
      const modulePath = path.join(compiledModulesPath, file);
      return fs.readFileSync(modulePath).toString('base64');
    });
    
    console.log('Found modules:', moduleFiles);
    
    // Create transaction to publish package
    const tx = new TransactionBlock();
    
    const [upgradeCap] = tx.publish({
      modules,
      dependencies: [
        '0x1', // Move stdlib
        '0x2', // Iota framework
      ]
    });
    
    // Transfer upgrade capability to deployer
    tx.transferObjects([upgradeCap], tx.pure(address));
    
    // Execute transaction
    const result = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      }
    });
    
    console.log('Transaction digest:', result.digest);
    
    // Extract package ID from the result
    const packageId = result.objectChanges?.find(
      change => change.type === 'published'
    )?.packageId;
    
    if (!packageId) {
      throw new Error('Failed to extract package ID from transaction result');
    }
    
    console.log('✅ Package deployed successfully!');
    console.log('Package ID:', packageId);
    
    // Now create order books for different pairs
    console.log('\n📚 Creating order books...');
    
    const pairs = [
      { coinA: 'VUSD', coinB: 'IOTA', feeRate: 30 }, // 0.3% fee
      { coinA: 'IOTA', coinB: 'STIOTA', feeRate: 30 },
    ];
    
    const orderBooks: Record<string, string> = {};
    
    for (const pair of pairs) {
      const tx = new TransactionBlock();
      
      // Get coin types
      const coinAType = getCoinType(pair.coinA);
      const coinBType = getCoinType(pair.coinB);
      
      tx.moveCall({
        target: `${packageId}::limit_order::create_order_book`,
        arguments: [
          tx.pure(pair.feeRate)
        ],
        typeArguments: [coinAType, coinBType]
      });
      
      const result = await client.signAndExecuteTransactionBlock({
        signer: keypair,
        transactionBlock: tx,
        options: {
          showEffects: true,
          showObjectChanges: true,
        }
      });
      
      const orderBookId = result.objectChanges?.find(
        change => change.type === 'created'
      )?.objectId;
      
      if (orderBookId) {
        const key = `${pair.coinA}_${pair.coinB}`;
        orderBooks[key] = orderBookId;
        console.log(`✅ Created order book for ${key}:`, orderBookId);
      }
    }
    
    // Save deployment info
    const deploymentInfo = {
      network: NETWORK,
      packageId,
      orderBooks,
      deployedAt: new Date().toISOString(),
      deployer: address
    };
    
    const deploymentPath = path.join(__dirname, `../deployments/limit-order-${NETWORK}.json`);
    fs.mkdirSync(path.dirname(deploymentPath), { recursive: true });
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log('\n✅ Deployment complete!');
    console.log('Deployment info saved to:', deploymentPath);
    
    return deploymentInfo;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

function getCoinType(symbol: string): string {
  const coinTypes: Record<string, string> = {
    'IOTA': '0x2::iota::IOTA',
    'VUSD': '0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081::vusd::VUSD',
    'STIOTA': '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT',
  };
  
  return coinTypes[symbol] || symbol;
}

// Run deployment
deployLimitOrderContracts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });