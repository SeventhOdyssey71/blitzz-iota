#!/bin/bash

# Deploy AMM Contracts Script

echo "🚀 Deploying AMM Contracts..."

# Navigate to Move directory
cd move/arva

# Build the Move package
echo "📦 Building Move package..."
iota move build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build successful!"

# Run tests
echo "🧪 Running tests..."
iota move test

if [ $? -ne 0 ]; then
    echo "⚠️  Tests failed, but continuing with deployment..."
fi

# Deploy to testnet
echo "🌐 Deploying to testnet..."
iota client publish --gas-budget 100000000

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
    echo "📝 Please update the package ID in your configuration files"
else
    echo "❌ Deployment failed!"
    exit 1
fi

echo "🎉 AMM deployment complete!"