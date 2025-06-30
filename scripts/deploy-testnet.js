const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying blitz contracts to IOTA testnet...\n');

// Build the Move package
console.log('📦 Building Move package...');
const moveDir = path.join(process.cwd(), 'move/blitz');

try {
  // First, let's check if iota CLI is installed
  try {
    execSync('iota --version', { stdio: 'pipe' });
    console.log('✅ IOTA CLI found');
  } catch (error) {
    console.error('❌ IOTA CLI not found. Please install it first:');
    console.error('   cargo install --locked --git https://github.com/iotaledger/iota.git --branch main iota');
    process.exit(1);
  }

  // Build the Move package
  const buildOutput = execSync('iota move build', { 
    cwd: moveDir,
    encoding: 'utf-8'
  });
  console.log('✅ Move package built successfully');
  console.log(buildOutput);

  // Publish the package
  console.log('\n📤 Publishing package to testnet...');
  console.log('⚠️  Make sure you have testnet IOTA tokens in your active address');
  console.log('🔗 Get testnet tokens from: https://faucet.testnet.iota.cafe\n');

  const publishOutput = execSync('iota client publish --gas-budget 100000000', {
    cwd: moveDir,
    encoding: 'utf-8'
  });

  console.log('✅ Package published successfully!');
  console.log(publishOutput);

  // Extract package ID from output
  const packageIdMatch = publishOutput.match(/Published Objects:[\s\S]*?PackageID: (0x[a-fA-F0-9]+)/);
  if (packageIdMatch) {
    const packageId = packageIdMatch[1];
    console.log(`\n📦 Package ID: ${packageId}`);

    // Update the config file
    const configPath = path.join(process.cwd(), 'config/iota.config.ts');
    let configContent = fs.readFileSync(configPath, 'utf-8');
    configContent = configContent.replace(
      /testnet: '0x0', \/\/ To be deployed/,
      `testnet: '${packageId}', // Deployed`
    );
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Updated config/iota.config.ts with package ID');

    // Save deployment info
    const deploymentInfo = {
      packageId,
      network: 'testnet',
      timestamp: new Date().toISOString(),
      modules: {
        dex: `${packageId}::dex`,
        limit_order: `${packageId}::limit_order`,
        dca: `${packageId}::dca`,
      }
    };

    fs.writeFileSync(
      path.join(process.cwd(), 'deployment-testnet.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );
    console.log('✅ Saved deployment info to deployment-testnet.json');
  }

} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  if (error.stdout) {
    console.error('Output:', error.stdout.toString());
  }
  if (error.stderr) {
    console.error('Error:', error.stderr.toString());
  }
  process.exit(1);
}