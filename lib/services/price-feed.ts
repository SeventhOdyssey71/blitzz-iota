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

// Token ID mapping for CoinGecko
const TOKEN_MAPPINGS: Record<string, string> = {
  'IOTA': 'iota',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'WETH': 'ethereum',
  'WBTC': 'bitcoin',
};

export async function getTokenPrice(symbol: string): Promise<TokenPrice | null> {
  // Define fallback prices
  const fallbackPrices: Record<string, TokenPrice> = {
    'IOTA': { symbol: 'IOTA', price: 0.2847, change24h: 2.34, volume24h: 15234567, marketCap: 897654321 },
    'USDC': { symbol: 'USDC', price: 0.9999, change24h: -0.01, volume24h: 1234567890, marketCap: 25678901234 },
    'USDT': { symbol: 'USDT', price: 1.0001, change24h: 0.02, volume24h: 9876543210, marketCap: 78901234567 },
    'WETH': { symbol: 'WETH', price: 2234.56, change24h: 1.23, volume24h: 234567890, marketCap: 234567890123 },
    'WBTC': { symbol: 'WBTC', price: 43567.89, change24h: -0.56, volume24h: 123456789, marketCap: 567890123456 },
  };

  try {
    // Check cache first
    const cached = priceCache[symbol];
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    const coinId = TOKEN_MAPPINGS[symbol];
    if (!coinId) {
      // Return mock data for unknown tokens
      return fallbackPrices[symbol] || {
        symbol,
        price: 1.0,
        change24h: 0,
        volume24h: 0,
        marketCap: 0,
      };
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
      // Don't throw, just continue to fallback
      return fallbackPrices[symbol] || {
        symbol,
        price: 1.0,
        change24h: 0,
        volume24h: 0,
        marketCap: 0,
      };
    }

    const data = await response.json();
    const priceData = data[coinId];

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
    
    // Return fallback price
    return fallbackPrices[symbol] || {
      symbol,
      price: 1.0,
      change24h: 0,
      volume24h: 0,
      marketCap: 0,
    };
  }
}

export async function getMultipleTokenPrices(symbols: string[]): Promise<Record<string, TokenPrice>> {
  // Filter out empty or invalid symbols
  const validSymbols = symbols.filter(s => s && s.trim().length > 0);
  
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
    route: ['Direct'], // In real scenario, this would show routing path
  };
}

// Get pool liquidity info
export async function getPoolInfo(tokenA: string, tokenB: string) {
  // In a real scenario, this would fetch from blockchain
  // For now, return mock data
  const mockPools: Record<string, any> = {
    'IOTA-USDC': {
      tvl: 1234567,
      volume24h: 234567,
      fee: 0.3,
      apr: 12.5,
      reserves: {
        tokenA: 2345678,
        tokenB: 654321,
      },
    },
    'IOTA-USDT': {
      tvl: 987654,
      volume24h: 123456,
      fee: 0.3,
      apr: 10.2,
      reserves: {
        tokenA: 1234567,
        tokenB: 345678,
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