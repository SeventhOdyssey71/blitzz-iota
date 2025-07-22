#!/usr/bin/env node
/**
 * Main script to reset liquidity pools
 * Clears all pool data and optionally creates a new IOTA/stIOTA pool
 */

import { IotaClient } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { Ed25519Keypair } from '@iota/iota-sdk/cryptography';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Configuration
const TESTNET_URL = 'https://api.testnet.iota.cafe';
const PACKAGE_ID = '0x620f8a39ec678170db2b2ed8cee5cc6a3d5b4802acd8a8905919c2e7bd5d52bb';

// Coin types
const IOTA_TYPE = '0x2::iota::IOTA';
const STIOTA_TYPE = '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT';

interface ResetOptions {
  createNewPool?: boolean;
  clearCache?: boolean;
}

class PoolResetter {
  private client: IotaClient;
  
  constructor() {
    this.client = new IotaClient({ url: TESTNET_URL });
  }

  async clearAllPoolData() {
    console.log('🧹 Clearing all pool data...');
    
    // Clear localStorage file
    const storageFile = path.join(__dirname, '../.localStorage.json');
    if (fs.existsSync(storageFile)) {
      fs.writeFileSync(storageFile, JSON.stringify({
        blitz_created_pools: [],
        pool_cache: {},
        blitz_pool_cache: {}
      }, null, 2));
      console.log('✅ Cleared localStorage file');
    }
    
    // Clear any pool-related cache files
    const cacheDir = path.join(__dirname, '../.cache');
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      files.forEach(file => {
        if (file.includes('pool')) {
          fs.unlinkSync(path.join(cacheDir, file));
          console.log(`✅ Removed cache file: ${file}`);
        }
      });
    }
    
    console.log('✅ All pool data cleared\n');
  }

  async createIOTAtoSTIOTAPool() {
    console.log('🏊 Creating IOTA/stIOTA pool...\n');
    
    try {
      // Get active address
      const address = execSync('iota client active-address').toString().trim();
      console.log('Using address:', address);
      
      const tx = new Transaction();
      
      // Create pool with initial liquidity
      tx.moveCall({
        target: `${PACKAGE_ID}::simple_dex::create_pool`,
        typeArguments: [IOTA_TYPE, STIOTA_TYPE],
        arguments: [
          tx.object('0x2'), // clock
          tx.pure.u64('5000000000'), // 5 IOTA
          tx.object('0x2'), // clock for stIOTA
          tx.pure.u64('5000000000'), // 5 stIOTA
        ],
      });
      
      // Build and execute transaction
      const result = await this.client.signAndExecuteTransaction({
        transaction: tx,
        signer: Ed25519Keypair.deriveKeypair(process.env.MNEMONIC || ''),
      });
      
      console.log('✅ Pool created successfully!');
      console.log('Transaction digest:', result.digest);
      
      // Save pool info
      const poolInfo = {
        id: result.digest,
        coinA: IOTA_TYPE,
        coinB: STIOTA_TYPE,
        name: 'IOTA/stIOTA',
        timestamp: Date.now(),
        packageId: PACKAGE_ID
      };
      
      const storageFile = path.join(__dirname, '../.localStorage.json');
      const storage = JSON.parse(fs.readFileSync(storageFile, 'utf-8'));
      storage.blitz_created_pools.push(poolInfo);
      fs.writeFileSync(storageFile, JSON.stringify(storage, null, 2));
      
      return result.digest;
    } catch (error) {
      console.error('❌ Failed to create pool:', error);
      
      // Fallback: output manual command
      console.log('\n📝 To create the pool manually, run:');
      console.log('----------------------------------------');
      console.log(`iota client call \\
  --package ${PACKAGE_ID} \\
  --module simple_dex \\
  --function create_pool \\
  --type-args ${IOTA_TYPE} ${STIOTA_TYPE} \\
  --args 0x2 5000000000 0x2 5000000000 \\
  --gas-budget 100000000`);
      console.log('----------------------------------------\n');
      
      return null;
    }
  }

  async reset(options: ResetOptions = {}) {
    console.log('=== IOTA Pool Reset Script ===\n');
    
    const { createNewPool = true, clearCache = true } = options;
    
    try {
      // Step 1: Clear all pool data
      if (clearCache) {
        await this.clearAllPoolData();
      }
      
      // Step 2: Create new pool if requested
      if (createNewPool) {
        await this.createIOTAtoSTIOTAPool();
      }
      
      console.log('\n✨ Reset complete!');
      console.log('📝 Next steps:');
      console.log('1. Restart your development server');
      console.log('2. Clear your browser cache/localStorage');
      console.log('3. The new pool should appear automatically');
      
    } catch (error) {
      console.error('❌ Error during reset:', error);
      process.exit(1);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const resetter = new PoolResetter();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: npm run reset-pools [options]

Options:
  --no-create     Don't create a new IOTA/stIOTA pool after clearing
  --no-clear      Don't clear existing pool data
  -h, --help      Show this help message

Examples:
  npm run reset-pools              # Clear all pools and create new IOTA/stIOTA pool
  npm run reset-pools --no-create  # Only clear pools, don't create new one
`);
    return;
  }
  
  const options: ResetOptions = {
    createNewPool: !args.includes('--no-create'),
    clearCache: !args.includes('--no-clear')
  };
  
  await resetter.reset(options);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { PoolResetter };