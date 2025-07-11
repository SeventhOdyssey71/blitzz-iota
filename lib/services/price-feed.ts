interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

interface PriceCache {
  [key: string]: {
    data: TokenPrice;
    timestamp: number;
  };
}

const CACHE_DURATION = 30000; // 30 seconds
const priceCache: PriceCache = {};

// Blockberry API configuration
const BLOCKBERRY_API_BASE = 'https://api.blockberry.one/iota/v1';
const BLOCKBERRY_API_KEY = process.env.BLOCKBERRY_API_KEY || '';

// Token configuration for Blockberry
const TOKEN_INFO: Record<string, { type: string; decimals: number; iconUrl?: string }> = {
  'IOTA': {
    type: '0x2::iota::IOTA',
    decimals: 9,
    iconUrl: 'https://api.blockberry.one/iota/icon/0x2::iota::IOTA',
  },
  'stIOTA': {
    type: '0x3::staking_pool::StakedIota',
    decimals: 9,
    iconUrl: 'https://api.blockberry.one/iota/icon/0x3::staking_pool::StakedIota',
  },
  'vUSD': {
    type: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
    decimals: 6,
    iconUrl: 'https://api.blockberry.one/iota/icon/0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT',
  },
};

// Supported tokens only
const SUPPORTED_TOKENS = ['IOTA', 'stIOTA', 'vUSD'];

async function fetchBlockberryPrice(coinType: string): Promise<any> {
  try {
    const response = await fetch(
      `${BLOCKBERRY_API_BASE}/coins/${encodeURIComponent(coinType)}`,
      {
        headers: {
          'X-API-KEY': BLOCKBERRY_API_KEY,
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.warn(`Blockberry API returned ${response.status} for ${coinType}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch Blockberry data for ${coinType}:`, error);
    return null;
  }
}

export async function getTokenPrice(symbol: string): Promise<TokenPrice | null> {
  // Only support our 3 tokens
  if (!SUPPORTED_TOKENS.includes(symbol)) {
    console.warn(`Unsupported token: ${symbol}`);
    return null;
  }

  // Define fallback prices for our supported tokens
  const fallbackPrices: Record<string, TokenPrice> = {
    'IOTA': { symbol: 'IOTA', price: 0.2847, change24h: 2.34, volume24h: 15234567, marketCap: 897654321 },
    'stIOTA': { symbol: 'stIOTA', price: 0.2847, change24h: 2.34, volume24h: 15234567, marketCap: 897654321 },
    'vUSD': { symbol: 'vUSD', price: 1.0, change24h: 0, volume24h: 1234567890, marketCap: 25678901234 },
  };

  try {
    // Check cache first
    const cached = priceCache[symbol];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const tokenInfo = TOKEN_INFO[symbol];
    if (!tokenInfo) {
      return fallbackPrices[symbol];
    }

    // For vUSD, always return stable price
    if (symbol === 'vUSD') {
      const tokenPrice: TokenPrice = {
        symbol: 'vUSD',
        price: 1.0,
        change24h: 0,
        volume24h: 0,
        marketCap: 0,
      };

      // Try to get market data from Blockberry
      const blockberryData = await fetchBlockberryPrice(tokenInfo.type);
      if (blockberryData && blockberryData.market_data) {
        tokenPrice.volume24h = blockberryData.market_data.volume_24h || 0;
        tokenPrice.marketCap = blockberryData.market_data.market_cap || 0;
      }

      priceCache[symbol] = {
        data: tokenPrice,
        timestamp: Date.now(),
      };

      return tokenPrice;
    }

    // Fetch from Blockberry API
    const blockberryData = await fetchBlockberryPrice(tokenInfo.type);
    
    if (!blockberryData || !blockberryData.market_data) {
      console.warn(`No market data from Blockberry for ${symbol}, using fallback`);
      return fallbackPrices[symbol];
    }

    const marketData = blockberryData.market_data;
    
    // For stIOTA, use IOTA price with exchange rate if available
    let price = marketData.current_price || 0;
    if (symbol === 'stIOTA' && !price) {
      // If no direct price, use IOTA price
      const iotaData = await fetchBlockberryPrice(TOKEN_INFO['IOTA'].type);
      if (iotaData && iotaData.market_data) {
        price = iotaData.market_data.current_price || fallbackPrices['IOTA'].price;
      }
    }

    const tokenPrice: TokenPrice = {
      symbol,
      price: price || fallbackPrices[symbol].price,
      change24h: marketData.price_change_percentage_24h || 0,
      volume24h: marketData.volume_24h || 0,
      marketCap: marketData.market_cap || 0,
    };

    // Update cache
    priceCache[symbol] = {
      data: tokenPrice,
      timestamp: Date.now(),
    };

    return tokenPrice;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return fallbackPrices[symbol];
  }
}

export async function getMultipleTokenPrices(symbols: string[]): Promise<Record<string, TokenPrice>> {
  // Filter to only supported tokens
  const validSymbols = symbols.filter(s => SUPPORTED_TOKENS.includes(s));
  
  if (validSymbols.length === 0) {
    return {};
  }

  try {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      console.warn('Running on server, using fallback prices');
      throw new Error('Server-side rendering');
    }

    // Use our API route for batch fetching
    const response = await fetch(`/api/prices?symbols=${validSymbols.join(',')}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn('API response not ok, falling back to individual fetching');
      throw new Error('Failed to fetch prices');
    }
    
    const prices = await response.json();
    return prices;
  } catch (error) {
    console.error('Failed to fetch multiple prices:', error);
    
    // Fallback to individual fetching
    const prices: Record<string, TokenPrice> = {};
    
    // Use Promise.allSettled to handle individual failures gracefully
    const results = await Promise.allSettled(
      validSymbols.map(async (symbol) => {
        const price = await getTokenPrice(symbol);
        return { symbol, price };
      })
    );
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.price) {
        prices[result.value.symbol] = result.value.price;
      }
    });
    
    return prices;
  }
}

// Get token icon URL from Blockberry
export function getTokenIconUrl(symbol: string): string {
  const tokenInfo = TOKEN_INFO[symbol];
  return tokenInfo?.iconUrl || '';
}

// Calculate swap output amount
export function calculateSwapOutput(
  inputAmount: number,
  inputPrice: number,
  outputPrice: number,
  slippage: number = 0.5
): {
  outputAmount: number;
  priceImpact: number;
  minimumReceived: number;
  route: string[];
} {
  // Simple direct swap calculation
  const inputValue = inputAmount * inputPrice;
  const outputAmount = inputValue / outputPrice;
  
  // Apply a small fee (0.3%)
  const feeAmount = outputAmount * 0.003;
  const outputAfterFee = outputAmount - feeAmount;
  
  // Calculate minimum received with slippage
  const minimumReceived = outputAfterFee * (1 - slippage / 100);
  
  // Mock price impact (would be calculated based on liquidity in real scenario)
  const priceImpact = Math.min((inputValue / 100000) * 0.1, 5); // Max 5% impact
  
  return {
    outputAmount: outputAfterFee,
    priceImpact,
    minimumReceived,
    route: ['Direct'],
  };
}

// Get pool liquidity info - ONLY SUPPORTED PAIRS
export async function getPoolInfo(tokenA: string, tokenB: string) {
  // Only support our token pairs
  if (!SUPPORTED_TOKENS.includes(tokenA) || !SUPPORTED_TOKENS.includes(tokenB)) {
    return {
      tvl: 0,
      volume24h: 0,
      fee: 0.3,
      apr: 0,
      reserves: {
        tokenA: 0,
        tokenB: 0,
      },
    };
  }

  // Mock data for supported pairs
  const mockPools: Record<string, any> = {
    'IOTA-stIOTA': {
      tvl: 5000000,
      volume24h: 500000,
      fee: 0.1,
      apr: 8.5,
      reserves: {
        tokenA: 10000000,
        tokenB: 9900000,
      },
    },
    'IOTA-vUSD': {
      tvl: 3000000,
      volume24h: 300000,
      fee: 0.3,
      apr: 12.5,
      reserves: {
        tokenA: 5000000,
        tokenB: 1500000,
      },
    },
    'stIOTA-vUSD': {
      tvl: 2000000,
      volume24h: 200000,
      fee: 0.3,
      apr: 10.2,
      reserves: {
        tokenA: 3000000,
        tokenB: 900000,
      },
    },
  };

  const poolKey = `${tokenA}-${tokenB}`;
  const reverseKey = `${tokenB}-${tokenA}`;
  
  return mockPools[poolKey] || mockPools[reverseKey] || {
    tvl: 0,
    volume24h: 0,
    fee: 0.3,
    apr: 0,
    reserves: {
      tokenA: 0,
      tokenB: 0,
    },
  };
}