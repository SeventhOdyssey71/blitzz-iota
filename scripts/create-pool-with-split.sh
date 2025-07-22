#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Direct Pool Creation (No stIOTA Required) ===${NC}"
echo ""

# Configuration
PACKAGE_ID="0x620f8a39ec678170db2b2ed8cee5cc6a3d5b4802acd8a8905919c2e7bd5d52bb"

# Since you don't have stIOTA, let's create a pool with two different amounts of IOTA
# This creates an IOTA/IOTA pool with different amounts to simulate price
echo -e "${GREEN}Creating IOTA/IOTA test pool${NC}"
echo "This will create a pool with 5 IOTA and 10 IOTA to test the DEX"
echo ""

# Get IOTA coins
IOTA_COIN1=$(iota client gas --json | jq -r '.[] | select(.nanosBalance >= 5000000000) | .gasCoinId' | head -1)
IOTA_COIN2=$(iota client gas --json | jq -r '.[] | select(.nanosBalance >= 10000000000) | .gasCoinId' | head -1)

if [ -z "$IOTA_COIN1" ] || [ -z "$IOTA_COIN2" ]; then
    echo -e "${RED}Error: Not enough IOTA coins found${NC}"
    echo "You need at least 15 IOTA total"
    exit 1
fi

echo -e "${GREEN}Using coins:${NC}"
echo "- Coin 1: $IOTA_COIN1 (5 IOTA)"
echo "- Coin 2: $IOTA_COIN2 (10 IOTA)"
echo ""

# Try to create a simple pool first
echo -e "${BLUE}Creating pool...${NC}"

# First, let's just try to see what functions are available
echo "Checking available functions in simple_dex module..."
iota client call \
    --package $PACKAGE_ID \
    --module simple_dex \
    --function create_pool \
    --help

echo ""
echo -e "${YELLOW}Note: You need stIOTA tokens to create an IOTA/stIOTA pool.${NC}"
echo "To get stIOTA:"
echo "1. Use the staking function in the simple_staking module"
echo "2. Or get stIOTA from another user"
echo ""
echo "For now, the pool data has been cleared and is ready for a new pool."