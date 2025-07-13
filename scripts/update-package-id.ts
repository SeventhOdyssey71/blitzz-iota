/**
 * Script to update package ID after republishing
 * Usage: npx tsx scripts/update-package-id.ts <NEW_PACKAGE_ID>
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CONFIG_PATH = join(__dirname, '../config/iota.config.ts');

function updatePackageId(newPackageId: string) {
  if (!newPackageId || !newPackageId.startsWith('0x')) {
    console.error('Error: Please provide a valid package ID starting with 0x');
    process.exit(1);
  }
  
  console.log('=== Updating Package ID ===\n');
  console.log('New Package ID:', newPackageId);
  
  try {
    // Read the config file
    let configContent = readFileSync(CONFIG_PATH, 'utf-8');
    
    // Find and replace the testnet package ID
    const packageIdRegex = /testnet: '0x[a-fA-F0-9]+'/;
    const oldMatch = configContent.match(packageIdRegex);
    
    if (oldMatch) {
      console.log('Old Package ID:', oldMatch[0]);
      configContent = configContent.replace(
        packageIdRegex,
        `testnet: '${newPackageId}'`
      );
      
      // Write the updated config
      writeFileSync(CONFIG_PATH, configContent);
      console.log('\n✅ Config updated successfully!');
      
      // Clear localStorage reminder
      console.log('\n📝 Next steps:');
      console.log('1. Clear browser localStorage to remove old pools:');
      console.log('   localStorage.clear(); location.reload();');
      console.log('\n2. Create new pools with the updated contract');
      console.log('\n3. The frontend will automatically use the new package ID');
    } else {
      console.error('Error: Could not find testnet package ID in config');
    }
  } catch (error) {
    console.error('Error updating config:', error);
    process.exit(1);
  }
}

// Get package ID from command line
const newPackageId = process.argv[2];
updatePackageId(newPackageId);