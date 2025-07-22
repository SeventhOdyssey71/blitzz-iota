#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== IOTA Pool Creation Script ===${NC}"
echo ""

# Configuration
PACKAGE_ID="0x620f8a39ec678170db2b2ed8cee5cc6a3d5b4802acd8a8905919c2e7bd5d52bb"
IOTA_TYPE="0x2::iota::IOTA"
STIOTA_TYPE="0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT"

# Get current address
CURRENT_ADDRESS=$(iota client active-address)
echo -e "${GREEN}Using address:${NC} $CURRENT_ADDRESS"
echo ""

# Get IOTA coins
echo -e "${BLUE}Fetching your IOTA coins...${NC}"
IOTA_COINS=$(iota client gas --json | jq -r '.[] | select(.gasCoinType == "0x2::iota::IOTA") | .gasCoinId' | head -5)

# Get stIOTA coins
echo -e "${BLUE}Fetching your stIOTA coins...${NC}"
STIOTA_COINS=$(iota client objects --json | jq -r '.[] | select(.type | contains("cert::CERT")) | .objectId' | head -5)

# Display available coins
echo -e "${GREEN}Available IOTA coins:${NC}"
echo "$IOTA_COINS" | head -3
echo ""

echo -e "${GREEN}Available stIOTA coins:${NC}"
echo "$STIOTA_COINS" | head -3
echo ""

# Default amounts
IOTA_AMOUNT="5000000000"  # 5 IOTA
STIOTA_AMOUNT="5000000000"  # 5 stIOTA

echo -e "${BLUE}Pool Configuration:${NC}"
echo "- IOTA amount: 5 IOTA (5000000000 MIST)"
echo "- stIOTA amount: 5 stIOTA (5000000000 units)"
echo ""

# Get the first coin of each type
IOTA_COIN=$(echo "$IOTA_COINS" | head -1)
STIOTA_COIN=$(echo "$STIOTA_COINS" | head -1)

if [ -z "$IOTA_COIN" ]; then
    echo -e "${RED}Error: No IOTA coins found${NC}"
    exit 1
fi

if [ -z "$STIOTA_COIN" ]; then
    echo -e "${RED}Error: No stIOTA coins found${NC}"
    echo "You need to stake some IOTA first to get stIOTA"
    exit 1
fi

echo -e "${GREEN}Creating pool with:${NC}"
echo "- IOTA coin: $IOTA_COIN"
echo "- stIOTA coin: $STIOTA_COIN"
echo ""

# Create the pool
echo -e "${BLUE}Executing transaction...${NC}"
iota client call \
    --package $PACKAGE_ID \
    --module simple_dex \
    --function create_pool \
    --type-args $IOTA_TYPE $STIOTA_TYPE \
    --args $IOTA_COIN $STIOTA_COIN \
    --gas-budget 100000000

echo ""
echo -e "${GREEN}Pool creation complete!${NC}"
echo "The pool should now appear in the UI after refreshing."