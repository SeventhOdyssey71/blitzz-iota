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

// CoinGecko API for real prices
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Token ID mapping for CoinGecko - ONLY 3 SUPPORTED TOKENS
const TOKEN_MAPPINGS: Record<string, string> = {
  'IOTA': 'iota',
  'stIOTA': 'iota', // Use IOTA price for stIOTA
  'vUSD': 'usd-coin', // vUSD is pegged to USD
};

// Supported tokens only
const SUPPORTED_TOKENS = ['IOTA', 'stIOTA', 'vUSD'];

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

    const coinId = TOKEN_MAPPINGS[symbol];
    if (!coinId) {
      return fallbackPrices[symbol];
    }

    // Fetch from CoinGecko with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
      { signal: controller.signal }
    ).catch(() => null);
    
    clearTimeout(timeoutId);

    if (!response || !response.ok) {
      console.warn(`Failed to fetch price for ${symbol}, using fallback`);
      return fallbackPrices[symbol];
    }

    const data = await response.json();
    const priceData = data[coinId];

    if (!priceData) {
      return fallbackPrices[symbol];
    }

    // For vUSD, always return stable price
    if (symbol === 'vUSD') {
      return {
        symbol: 'vUSD',
        price: 1.0,
        change24h: 0,
        volume24h: priceData.usd_24h_vol || 0,
        marketCap: priceData.usd_market_cap || 0,
      };
    }

    const tokenPrice: TokenPrice = {
      symbol,
      price: priceData.usd || 0,
      change24h: priceData.usd_24h_change || 0,
      volume24h: priceData.usd_24h_vol || 0,
      marketCap: priceData.usd_market_cap || 0,
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