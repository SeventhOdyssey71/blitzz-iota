#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MOVE_DIR = path.join(__dirname, '../move/blitz');
const CONFIG_FILE = path.join(__dirname, '../config/iota.config.ts');

async function deployContracts() {
  console.log('🚀 Deploying blitz contracts to IOTA testnet...\n');

  try {
    // Check if Move directory exists
    if (!fs.existsSync(MOVE_DIR)) {
      console.error('❌ Move directory not found at:', MOVE_DIR);
      process.exit(1);
    }

    // Navigate to Move directory
    process.chdir(MOVE_DIR);

    // Build the Move package
    console.log('📦 Building Move package...');
    execSync('iota move build', { stdio: 'inherit' });

    // Deploy to testnet
    console.log('\n🌐 Deploying to testnet...');
    const deployOutput = execSync('iota client publish --gas-budget 100000000', {
      encoding: 'utf-8'
    });

    // Parse the deployment output to get package ID
    const packageIdMatch = deployOutput.match(/Published Objects:[\s\S]*?PackageID: (0x[a-f0-9]+)/i);
    
    if (packageIdMatch && packageIdMatch[1]) {
      const packageId = packageIdMatch[1];
      console.log(`\n✅ Successfully deployed! Package ID: ${packageId}`);

      // Update config file with the new package ID
      updateConfigFile(packageId);
      
      console.log('\n📝 Next steps:');
      console.log('1. The package ID has been updated in your config file');
      console.log('2. You can now create liquidity pools using the deployed contracts');
      console.log('3. Run the app with: npm run dev');
    } else {
      console.error('❌ Could not extract package ID from deployment output');
      console.log('Deployment output:', deployOutput);
    }

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    if (error.stdout) {
      console.log('Output:', error.stdout.toString());
    }
    if (error.stderr) {
      console.log('Error:', error.stderr.toString());
    }
    process.exit(1);
  }
}

function updateConfigFile(packageId) {
  try {
    let configContent = fs.readFileSync(CONFIG_FILE, 'utf-8');
    
    // Update testnet package ID
    configContent = configContent.replace(
      /testnet: '0x0', \/\/ To be deployed/,
      `testnet: '${packageId}', // Deployed`
    );
    
    fs.writeFileSync(CONFIG_FILE, configContent);
    console.log('✅ Updated config file with new package ID');
  } catch (error) {
    console.error('⚠️  Could not update config file:', error.message);
    console.log(`Please manually update blitz_PACKAGE_ID.testnet to: ${packageId}`);
  }
}

// Run deployment
deployContracts().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});