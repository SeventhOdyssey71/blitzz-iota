#!/bin/bash

export PATH="$HOME/.local/bin:$PATH"

# Configure testnet environment
echo "0" | iota client new-env --alias testnet --rpc https://api.testnet.iota.cafe

# Switch to testnet
iota client switch --env testnet

# Generate a new address if needed
echo "0" | iota client new-address ed25519

echo "IOTA CLI configured for testnet!"
echo ""
echo "To view your address:"
echo "iota client active-address"
echo ""
echo "To get test tokens:"
echo "Visit https://faucet.testnet.iota.org and enter your address"