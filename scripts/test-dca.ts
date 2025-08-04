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

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: any;
}

async function testDCAFunctionality() {
  console.log('🧪 Testing DCA functionality on', NETWORK);
  
  const client = new IotaClient({ url: RPC_URL });
  const testResults: TestResult[] = [];
  
  // Get test keypair
  const privateKey = process.env.TEST_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('TEST_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY not found in environment');
  }
  
  let keypair: Ed25519Keypair;
  try {
    const decoded = decodeSuiPrivateKey(privateKey);
    keypair = Ed25519Keypair.fromSecretKey(decoded.secretKey);
  } catch {
    const privateKeyBytes = Buffer.from(privateKey.replace('0x', ''), 'hex');
    keypair = Ed25519Keypair.fromSecretKey(privateKeyBytes);
  }
  
  const address = keypair.getPublicKey().toSuiAddress();
  console.log('Test address:', address);
  
  // Load deployment info
  const deploymentPath = path.join(__dirname, `../deployments/dca-${NETWORK}.json`);
  const mainDeploymentPath = path.join(__dirname, `../deployments/limit-order-${NETWORK}.json`);
  
  if (!fs.existsSync(deploymentPath) || !fs.existsSync(mainDeploymentPath)) {
    throw new Error('Deployment info not found. Please deploy contracts first.');
  }
  
  const dcaDeployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  const mainDeployment = JSON.parse(fs.readFileSync(mainDeploymentPath, 'utf-8'));
  
  const { packageId, dcaRegistry } = dcaDeployment;
  
  console.log('Package ID:', packageId);
  console.log('DCA Registry:', dcaRegistry);
  
  // Get a test pool ID (we'll need to have pools deployed)
  const poolsPath = path.join(__dirname, `../deployments/pools-${NETWORK}.json`);
  let testPoolId = '0x0';
  
  if (fs.existsSync(poolsPath)) {
    const poolsInfo = JSON.parse(fs.readFileSync(poolsPath, 'utf-8'));
    const testPool = poolsInfo.pools?.find((p: any) => 
      p.coinAType?.includes('vusd') && p.coinBType?.includes('iota')
    );
    if (testPool) {
      testPoolId = testPool.poolId;
    }
  }
  
  let createdStrategyId: string | null = null;
  
  // Test 1: Create DCA Strategy
  console.log('\n📝 Test 1: Create DCA Strategy');
  try {
    if (testPoolId === '0x0') {
      throw new Error('No test pool available');
    }
    
    const tx = new TransactionBlock();
    
    // Create 100 vUSD for testing
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(100000000)]); // 100 vUSD (6 decimals)
    
    tx.moveCall({
      target: `${packageId}::dca::create_dca_strategy`,
      arguments: [
        tx.object(dcaRegistry),
        tx.object(testPoolId),
        coin,
        tx.pure(60000), // 1 minute interval for testing
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
        showEvents: true,
        showObjectChanges: true,
      }
    });
    
    const strategyCreatedEvent = result.events?.find(
      event => event.type.includes('DCACreatedEvent')
    );
    
    const strategyObject = result.objectChanges?.find(
      change => change.type === 'created' && 
        (change as any).objectType?.includes('DCAStrategy')
    );
    
    createdStrategyId = strategyObject?.objectId || null;
    
    testResults.push({
      testName: 'Create DCA Strategy',
      success: result.effects?.status.status === 'success' && !!strategyCreatedEvent,
      details: {
        digest: result.digest,
        strategyId: createdStrategyId,
        totalAmount: strategyCreatedEvent?.parsedJson?.total_amount,
        amountPerOrder: strategyCreatedEvent?.parsedJson?.amount_per_order,
        totalOrders: strategyCreatedEvent?.parsedJson?.total_orders,
      }
    });
    
    console.log('✅ DCA strategy created successfully');
    console.log('Strategy ID:', createdStrategyId);
    
  } catch (error: any) {
    testResults.push({
      testName: 'Create DCA Strategy',
      success: false,
      error: error.message
    });
    console.error('❌ Failed to create DCA strategy:', error.message);
  }
  
  // Test 2: Execute DCA Order
  console.log('\n⚡ Test 2: Execute DCA Order');
  try {
    if (!createdStrategyId) {
      throw new Error('No strategy created to execute');
    }
    
    // Wait a bit to ensure interval has passed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${packageId}::dca::execute_dca_order`,
      arguments: [
        tx.object(createdStrategyId),
        tx.object(testPoolId),
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
        showEvents: true,
      }
    });
    
    const executedEvent = result.events?.find(
      event => event.type.includes('DCAExecutedEvent')
    );
    
    testResults.push({
      testName: 'Execute DCA Order',
      success: result.effects?.status.status === 'success' && !!executedEvent,
      details: {
        digest: result.digest,
        orderNumber: executedEvent?.parsedJson?.order_number,
        amountIn: executedEvent?.parsedJson?.amount_in,
        amountOut: executedEvent?.parsedJson?.amount_out,
      }
    });
    
    console.log('✅ DCA order executed successfully');
    console.log('Order number:', executedEvent?.parsedJson?.order_number);
    
  } catch (error: any) {
    testResults.push({
      testName: 'Execute DCA Order',
      success: false,
      error: error.message
    });
    console.error('❌ Failed to execute DCA order:', error.message);
  }
  
  // Test 3: Query Strategy Info
  console.log('\n📊 Test 3: Query Strategy Info');
  try {
    if (!createdStrategyId) {
      throw new Error('No strategy created to query');
    }
    
    const strategy = await client.getObject({
      id: createdStrategyId,
      options: {
        showContent: true,
      }
    });
    
    if (strategy.data) {
      const content = (strategy.data as any).content;
      testResults.push({
        testName: 'Query Strategy Info',
        success: true,
        details: {
          executedOrders: content?.fields?.executed_orders,
          totalOrders: content?.fields?.total_orders,
          isActive: content?.fields?.is_active,
          amountPerOrder: content?.fields?.amount_per_order,
          intervalMs: content?.fields?.interval_ms,
        }
      });
      
      console.log('✅ Strategy queried successfully');
      console.log('Executed orders:', content?.fields?.executed_orders);
      console.log('Total orders:', content?.fields?.total_orders);
      console.log('Active:', content?.fields?.is_active);
    } else {
      throw new Error('Failed to fetch strategy data');
    }
    
  } catch (error: any) {
    testResults.push({
      testName: 'Query Strategy Info',
      success: false,
      error: error.message
    });
    console.error('❌ Failed to query strategy:', error.message);
  }
  
  // Test 4: Pause Strategy
  console.log('\n⏸️  Test 4: Pause Strategy');
  try {
    if (!createdStrategyId) {
      throw new Error('No strategy created to pause');
    }
    
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${packageId}::dca::pause_strategy`,
      arguments: [
        tx.object(createdStrategyId),
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
        showEvents: true,
      }
    });
    
    const pausedEvent = result.events?.find(
      event => event.type.includes('DCAPausedEvent')
    );
    
    testResults.push({
      testName: 'Pause Strategy',
      success: result.effects?.status.status === 'success' && !!pausedEvent,
      details: {
        digest: result.digest,
        executedOrders: pausedEvent?.parsedJson?.executed_orders,
      }
    });
    
    console.log('✅ Strategy paused successfully');
    
  } catch (error: any) {
    testResults.push({
      testName: 'Pause Strategy',
      success: false,
      error: error.message
    });
    console.error('❌ Failed to pause strategy:', error.message);
  }
  
  // Test 5: Resume Strategy
  console.log('\n▶️  Test 5: Resume Strategy');
  try {
    if (!createdStrategyId) {
      throw new Error('No strategy created to resume');
    }
    
    const tx = new TransactionBlock();
    
    tx.moveCall({
      target: `${packageId}::dca::resume_strategy`,
      arguments: [
        tx.object(createdStrategyId),
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
        showEvents: true,
      }
    });
    
    const resumedEvent = result.events?.find(
      event => event.type.includes('DCAResumedEvent')
    );
    
    testResults.push({
      testName: 'Resume Strategy',
      success: result.effects?.status.status === 'success' && !!resumedEvent,
      details: {
        digest: result.digest,
        remainingOrders: resumedEvent?.parsedJson?.remaining_orders,
      }
    });
    
    console.log('✅ Strategy resumed successfully');
    
  } catch (error: any) {
    testResults.push({
      testName: 'Resume Strategy',
      success: false,
      error: error.message
    });
    console.error('❌ Failed to resume strategy:', error.message);
  }
  
  // Generate test report
  console.log('\n📋 Test Summary:');
  console.log('================');
  
  const passed = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.success).length;
  
  testResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.testName}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details && !result.success) {
      console.log(`   Details:`, result.details);
    }
  });
  
  console.log('\nTotal:', testResults.length);
  console.log('Passed:', passed);
  console.log('Failed:', failed);
  
  // Save test results
  const resultsPath = path.join(__dirname, `../test-results/dca-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    network: NETWORK,
    results: testResults,
    summary: { total: testResults.length, passed, failed }
  }, null, 2));
  
  console.log('\nTest results saved to:', resultsPath);
  
  return failed === 0;
}

// Run tests
testDCAFunctionality()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });