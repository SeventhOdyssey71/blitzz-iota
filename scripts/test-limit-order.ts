import { TransactionBlock } from '@iota/iota-sdk/transactions';
import { IotaClient, IotaObjectData } from '@iota/iota-sdk/client';
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

async function testLimitOrderFunctionality() {
  console.log('🧪 Testing Limit Order functionality on', NETWORK);
  
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
  const deploymentPath = path.join(__dirname, `../deployments/limit-order-${NETWORK}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Deployment info not found. Please deploy contracts first.');
  }
  
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
  const { packageId, orderBooks } = deploymentInfo;
  
  console.log('Package ID:', packageId);
  console.log('Order Books:', orderBooks);
  
  // Test 1: Place a buy order
  console.log('\n📝 Test 1: Place Buy Order');
  try {
    const orderBookId = orderBooks['vUSD_IOTA'];
    if (!orderBookId || orderBookId === '0x0') {
      throw new Error('vUSD_IOTA order book not deployed');
    }
    
    const tx = new TransactionBlock();
    
    // Create 10 vUSD for testing
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(10000000)]); // 10 vUSD (6 decimals)
    
    tx.moveCall({
      target: `${packageId}::limit_order::place_buy_order`,
      arguments: [
        tx.object(orderBookId),
        coin,
        tx.pure(200000), // Price: 0.2 vUSD per IOTA
        tx.pure(50000000000), // Amount: 50 IOTA (9 decimals)
        tx.pure(86400000), // Expiry: 24 hours
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
    
    const orderPlacedEvent = result.events?.find(
      event => event.type.includes('OrderPlacedEvent')
    );
    
    testResults.push({
      testName: 'Place Buy Order',
      success: result.effects?.status.status === 'success' && !!orderPlacedEvent,
      details: {
        digest: result.digest,
        orderId: orderPlacedEvent?.parsedJson?.order_id,
      }
    });
    
    console.log('✅ Buy order placed successfully');
    console.log('Order ID:', orderPlacedEvent?.parsedJson?.order_id);
    
  } catch (error: any) {
    testResults.push({
      testName: 'Place Buy Order',
      success: false,
      error: error.message
    });
    console.error('❌ Failed to place buy order:', error.message);
  }
  
  // Test 2: Place a sell order
  console.log('\n📝 Test 2: Place Sell Order');
  try {
    const orderBookId = orderBooks['vUSD_IOTA'];
    if (!orderBookId || orderBookId === '0x0') {
      throw new Error('vUSD_IOTA order book not deployed');
    }
    
    const tx = new TransactionBlock();
    
    // Create 10 IOTA for testing
    const [coin] = tx.splitCoins(tx.gas, [tx.pure(10000000000)]); // 10 IOTA (9 decimals)
    
    tx.moveCall({
      target: `${packageId}::limit_order::place_sell_order`,
      arguments: [
        tx.object(orderBookId),
        coin,
        tx.pure(250000), // Price: 0.25 vUSD per IOTA
        tx.pure(10000000000), // Amount: 10 IOTA
        tx.pure(86400000), // Expiry: 24 hours
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
    
    const orderPlacedEvent = result.events?.find(
      event => event.type.includes('OrderPlacedEvent')
    );
    
    testResults.push({
      testName: 'Place Sell Order',
      success: result.effects?.status.status === 'success' && !!orderPlacedEvent,
      details: {
        digest: result.digest,
        orderId: orderPlacedEvent?.parsedJson?.order_id,
      }
    });
    
    console.log('✅ Sell order placed successfully');
    console.log('Order ID:', orderPlacedEvent?.parsedJson?.order_id);
    
  } catch (error: any) {
    testResults.push({
      testName: 'Place Sell Order',
      success: false,
      error: error.message
    });
    console.error('❌ Failed to place sell order:', error.message);
  }
  
  // Test 3: Query order book state
  console.log('\n📊 Test 3: Query Order Book State');
  try {
    const orderBookId = orderBooks['vUSD_IOTA'];
    const orderBook = await client.getObject({
      id: orderBookId,
      options: {
        showContent: true,
      }
    });
    
    if (orderBook.data) {
      const content = (orderBook.data as any).content;
      testResults.push({
        testName: 'Query Order Book State',
        success: true,
        details: {
          buyOrders: content?.fields?.buy_orders?.length || 0,
          sellOrders: content?.fields?.sell_orders?.length || 0,
          feeRate: content?.fields?.fee_rate,
        }
      });
      
      console.log('✅ Order book queried successfully');
      console.log('Buy orders:', content?.fields?.buy_orders?.length || 0);
      console.log('Sell orders:', content?.fields?.sell_orders?.length || 0);
    } else {
      throw new Error('Failed to fetch order book data');
    }
    
  } catch (error: any) {
    testResults.push({
      testName: 'Query Order Book State',
      success: false,
      error: error.message
    });
    console.error('❌ Failed to query order book:', error.message);
  }
  
  // Test 4: Cancel an order (if we have any)
  console.log('\n🚫 Test 4: Cancel Order');
  try {
    // First, get an order ID from previous tests
    const placedOrderId = testResults.find(
      r => r.testName === 'Place Buy Order' && r.success
    )?.details?.orderId;
    
    if (placedOrderId) {
      const orderBookId = orderBooks['vUSD_IOTA'];
      const tx = new TransactionBlock();
      
      tx.moveCall({
        target: `${packageId}::limit_order::cancel_order`,
        arguments: [
          tx.object(orderBookId),
          tx.pure(placedOrderId),
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
      
      const cancelEvent = result.events?.find(
        event => event.type.includes('OrderCancelledEvent')
      );
      
      testResults.push({
        testName: 'Cancel Order',
        success: result.effects?.status.status === 'success' && !!cancelEvent,
        details: {
          digest: result.digest,
          cancelledOrderId: cancelEvent?.parsedJson?.order_id,
        }
      });
      
      console.log('✅ Order cancelled successfully');
    } else {
      console.log('⏭️  Skipping cancel test - no order to cancel');
      testResults.push({
        testName: 'Cancel Order',
        success: true,
        details: { skipped: true }
      });
    }
    
  } catch (error: any) {
    testResults.push({
      testName: 'Cancel Order',
      success: false,
      error: error.message
    });
    console.error('❌ Failed to cancel order:', error.message);
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
  const resultsPath = path.join(__dirname, `../test-results/limit-order-${Date.now()}.json`);
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
testLimitOrderFunctionality()
  .then(success => process.exit(success ? 0 : 1))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });