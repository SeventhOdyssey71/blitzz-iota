#!/bin/bash

export PATH="$HOME/.local/bin:$PATH"

echo "🚀 Deploying Staking Pool contract to IOTA testnet..."

# Navigate to Move directory
cd move/arva

# Deploy the contract
echo "Publishing contract..."
OUTPUT=$(iota client publish --gas-budget 100000000 2>&1)

if echo "$OUTPUT" | grep -q "error"; then
    echo "❌ Deployment failed:"
    echo "$OUTPUT"
    exit 1
fi

# Extract package ID from output
PACKAGE_ID=$(echo "$OUTPUT" | grep -oE "Published Objects:.*PackageID: (0x[a-f0-9]+)" | sed -E 's/.*PackageID: (0x[a-f0-9]+)/\1/')

if [ -z "$PACKAGE_ID" ]; then
    echo "❌ Could not extract package ID"
    echo "Full output:"
    echo "$OUTPUT"
    exit 1
fi

echo "✅ Deployment successful!"
echo "📦 Package ID: $PACKAGE_ID"

# Update configuration
CONFIG_FILE="../../config/iota.config.ts"
if [ -f "$CONFIG_FILE" ]; then
    # Update the Blitz package ID
    sed -i.bak "s/testnet: '0x0', \/\/ To be deployed/testnet: '$PACKAGE_ID', \/\/ Deployed/" "$CONFIG_FILE"
    echo "✅ Updated configuration file"
fi

echo ""
echo "🎉 Staking pool contract deployed successfully!"
echo "Package ID: $PACKAGE_ID"