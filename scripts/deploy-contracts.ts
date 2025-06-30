// This script should only be run in Node.js environment
import { IotaClient, IotaKeypair, IotaTransaction } from '@iota/sdk';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const TESTNET_URL = 'https://api.testnet.iota.cafe';

interface DeploymentResult {
  packageId: string;
  dexModuleId: string;
  limitOrderModuleId: string;
  dcaModuleId: string;
  transactionDigest: string;
}

async function deployContracts(): Promise<DeploymentResult> {
  console.log('🚀 Starting contract deployment to IOTA testnet...\n');

  // Step 1: Build the Move package
  console.log('📦 Building Move package...');
  const moveDir = path.join(process.cwd(), 'move/Iota');
  
  try {
    execSync('iota move build', { 
      cwd: moveDir,
      stdio: 'inherit'
    });
    console.log('✅ Move package built successfully\n');
  } catch (error) {
    console.error('❌ Failed to build Move package:', error);
    process.exit(1);
  }

  // Step 2: Set up client and keypair
  const client = new IotaClient({ url: TESTNET_URL });
  
  // For demo purposes, we'll create a new keypair
  // In production, you'd load from environment variables
  const keypair = new IotaKeypair();
  const address = keypair.getPublicKey().toIotaAddress();
  
  console.log('📍 Deployer address:', address);
  console.log('⚠️  Please ensure this address has testnet IOTA tokens\n');

  // Step 3: Check balance
  try {
    const balance = await client.getBalance({
      owner: address,
      coinType: '0x2::iota::IOTA'
    });
    
    console.log('💰 Balance:', balance.totalBalance, 'IOTA');
    
    if (BigInt(balance.totalBalance) < BigInt(1000000000)) { // 1 IOTA
      console.error('❌ Insufficient balance. Need at least 1 IOTA for deployment');
      console.log('🔗 Get testnet tokens from: https://faucet.testnet.iota.cafe');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to check balance:', error);
    process.exit(1);
  }

  // Step 4: Deploy the package
  console.log('\n📤 Deploying package to testnet...');
  
  try {
    const compiledModules = getCompiledModules(moveDir);
    const tx = new IotaTransaction();
    
    // Publish the package
    const [upgradeCap] = tx.publish({
      modules: compiledModules,
      dependencies: [
        '0x1', // Iota standard library
        '0x2', // Iota framework
      ],
    });

    // Transfer upgrade capability to sender
    tx.transferObjects([upgradeCap], address);

    // Execute transaction
    const result = await client.signAndExecuteTransaction({
      transaction: tx,
      signer: keypair,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    console.log('✅ Package deployed successfully!');
    console.log('📝 Transaction digest:', result.digest);

    // Extract package ID from effects
    const packageId = extractPackageId(result);
    console.log('📦 Package ID:', packageId);

    // Step 5: Save deployment info
    const deploymentInfo: DeploymentResult = {
      packageId,
      dexModuleId: `${packageId}::dex`,
      limitOrderModuleId: `${packageId}::limit_order`,
      dcaModuleId: `${packageId}::dca`,
      transactionDigest: result.digest,
    };

    saveDeploymentInfo(deploymentInfo);

    console.log('\n🎉 Deployment completed successfully!');
    console.log('📄 Deployment info saved to deployment.json');

    return deploymentInfo;
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

function getCompiledModules(moveDir: string): string[] {
  const buildDir = path.join(moveDir, 'build/Iota/bytecode_modules');
  const modules: string[] = [];

  try {
    const files = fs.readdirSync(buildDir);
    for (const file of files) {
      if (file.endsWith('.mv')) {
        const modulePath = path.join(buildDir, file);
        const moduleBytes = fs.readFileSync(modulePath);
        modules.push(moduleBytes.toString('base64'));
      }
    }
  } catch (error) {
    console.error('❌ Failed to read compiled modules:', error);
    process.exit(1);
  }

  return modules;
}

function extractPackageId(result: any): string {
  // Extract package ID from transaction effects
  const created = result.effects?.created || [];
  const packageObject = created.find((obj: any) => obj.owner === 'Immutable');
  
  if (!packageObject) {
    throw new Error('Package ID not found in transaction effects');
  }

  return packageObject.reference.objectId;
}

function saveDeploymentInfo(info: DeploymentResult) {
  const deploymentPath = path.join(process.cwd(), 'deployment.json');
  
  // Load existing deployments
  let deployments: Record<string, DeploymentResult> = {};
  if (fs.existsSync(deploymentPath)) {
    deployments = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  }

  // Add new deployment
  deployments.testnet = info;

  // Save updated deployments
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(deployments, null, 2)
  );

  // Update config file
  updateConfigWithDeployment(info.packageId);
}

function updateConfigWithDeployment(packageId: string) {
  const configPath = path.join(process.cwd(), 'config/iota.config.ts');
  let configContent = fs.readFileSync(configPath, 'utf-8');

  // Update the Iota_PACKAGE_ID for testnet
  configContent = configContent.replace(
    /testnet: '0x0', \/\/ To be deployed/,
    `testnet: '${packageId}', // Deployed`
  );

  fs.writeFileSync(configPath, configContent);
  console.log('✅ Updated config/iota.config.ts with package ID');
}

// Run deployment
deployContracts().catch(console.error);