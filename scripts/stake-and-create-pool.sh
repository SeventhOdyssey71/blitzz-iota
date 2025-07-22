#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== IOTA Stake & Pool Creation Script ===${NC}"
echo ""

# Configuration
PACKAGE_ID="0x620f8a39ec678170db2b2ed8cee5cc6a3d5b4802acd8a8905919c2e7bd5d52bb"
IOTA_TYPE="0x2::iota::IOTA"
STIOTA_TYPE="0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT"
STAKING_MODULE="simple_staking"

# Get current address
CURRENT_ADDRESS=$(iota client active-address)
echo -e "${GREEN}Using address:${NC} $CURRENT_ADDRESS"
echo ""

# Step 1: Stake IOTA to get stIOTA
echo -e "${BLUE}Step 1: Staking IOTA to get stIOTA${NC}"
echo "This will stake 5 IOTA to receive stIOTA tokens"
echo ""

# Get an IOTA coin
IOTA_COIN=$(iota client gas --json | jq -r '.[] | select(.nanosBalance >= 5000000000) | .gasCoinId' | head -1)

if [ -z "$IOTA_COIN" ]; then
    echo -e "${RED}Error: No IOTA coin with at least 5 IOTA found${NC}"
    exit 1
fi

echo -e "${GREEN}Found IOTA coin:${NC} $IOTA_COIN"
echo ""

# Create stake transaction
echo -e "${YELLOW}Staking 5 IOTA...${NC}"
STAKE_RESULT=$(iota client call \
    --package $PACKAGE_ID \
    --module $STAKING_MODULE \
    --function stake \
    --args $IOTA_COIN 5000000000 \
    --gas-budget 100000000 2>&1)

echo "$STAKE_RESULT"

# Extract the created stIOTA object from the result
STIOTA_OBJECT=$(echo "$STAKE_RESULT" | grep -A5 "Created Objects" | grep -A1 "$STIOTA_TYPE" | grep "Object ID" | awk '{print $4}')

if [ -z "$STIOTA_OBJECT" ]; then
    echo -e "${RED}Failed to extract stIOTA object ID from transaction${NC}"
    echo "Please check the transaction output above"
    exit 1
fi

echo ""
echo -e "${GREEN}Successfully staked! stIOTA object:${NC} $STIOTA_OBJECT"
echo ""

# Step 2: Create the pool
echo -e "${BLUE}Step 2: Creating IOTA/stIOTA liquidity pool${NC}"
echo ""

# Get another IOTA coin for the pool
IOTA_FOR_POOL=$(iota client gas --json | jq -r '.[] | select(.nanosBalance >= 5000000000) | .gasCoinId' | grep -v "$IOTA_COIN" | head -1)

if [ -z "$IOTA_FOR_POOL" ]; then
    echo -e "${RED}Error: No additional IOTA coin found for pool creation${NC}"
    exit 1
fi

echo -e "${GREEN}Creating pool with:${NC}"
echo "- IOTA coin: $IOTA_FOR_POOL"
echo "- stIOTA coin: $STIOTA_OBJECT"
echo ""

# Create the pool
echo -e "${YELLOW}Creating pool...${NC}"
iota client call \
    --package $PACKAGE_ID \
    --module simple_dex \
    --function create_pool \
    --type-args $IOTA_TYPE $STIOTA_TYPE \
    --args $IOTA_FOR_POOL $STIOTA_OBJECT \
    --gas-budget 100000000

echo ""
echo -e "${GREEN}✨ Complete! The pool should now appear in the UI.${NC}"
echo "Clear your browser cache and refresh the page to see the new pool."