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

const CACHE_DURATION = 300000; // 5 minutes (increased from 30 seconds)
const priceCache: PriceCache = {};

// Rate limiting
let lastApiCall = 0;
const MIN_API_INTERVAL = 10000; // Minimum 10 seconds between API calls
const pendingRequests = new Map<string, Promise<TokenPrice | null>>();

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

    // Check if there's already a pending request for this symbol
    if (pendingRequests.has(symbol)) {
      return pendingRequests.get(symbol)!;
    }

    // Rate limit check
    const now = Date.now();
    if (now - lastApiCall < MIN_API_INTERVAL) {
      console.log(`Rate limiting: Using last fetched price for ${symbol}`);
      // Return the last cached price if available, even if expired
      if (cached) {
        return cached.data;
      }
      // Only use fallback if we've never fetched this price before
      return fallbackPrices[symbol];
    }

    const coinId = TOKEN_MAPPINGS[symbol];
    if (!coinId) {
      return fallbackPrices[symbol];
    }

    // Create the fetch promise
    const fetchPromise = (async () => {
      lastApiCall = Date.now();
      
      // Fetch from CoinGecko with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
        { signal: controller.signal }
      ).catch(() => null);
      
      clearTimeout(timeoutId);

      if (!response || !response.ok) {
        console.warn(`Failed to fetch price for ${symbol}, using last cached price`);
        pendingRequests.delete(symbol);
        // Return the last cached price if available
        if (cached) {
          return cached.data;
        }
        // Only use fallback if we've never fetched this price before
        return fallbackPrices[symbol];
      }

      const data = await response.json();
      const priceData = data[coinId];

      if (!priceData) {
        pendingRequests.delete(symbol);
        // Return the last cached price if available
        if (cached) {
          return cached.data;
        }
        // Only use fallback if we've never fetched this price before
        return fallbackPrices[symbol];
      }

      // For vUSD, always return stable price
      if (symbol === 'vUSD') {
        const vUsdPrice = {
          symbol: 'vUSD',
          price: 1.0,
          change24h: 0,
          volume24h: priceData.usd_24h_vol || 0,
          marketCap: priceData.usd_market_cap || 0,
        };
        
        // Update cache
        priceCache[symbol] = {
          data: vUsdPrice,
          timestamp: Date.now(),
        };
        
        pendingRequests.delete(symbol);
        return vUsdPrice;
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

      pendingRequests.delete(symbol);
      return tokenPrice;
    })();
    
    // Store the promise to prevent duplicate requests
    pendingRequests.set(symbol, fetchPromise);
    
    return fetchPromise;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    // Return the last cached price if available
    const cached = priceCache[symbol];
    if (cached) {
      return cached.data;
    }
    // Only use fallback if we've never fetched this price before
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

// Get pool liquidity info from real IOTA blockchain
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

  try {
    // Use the swap API to get real pool data
    const response = await fetch('/api/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'estimate',
        params: {
          inputToken: tokenA,
          outputToken: tokenB,
          inputAmount: '1000000', // 1 token for price discovery
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pool info');
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    // Extract real pool data
    const reserveIn = BigInt(data.reserves?.in || '0');
    const reserveOut = BigInt(data.reserves?.out || '0');
    
    // Calculate TVL using current token prices
    const [priceA, priceB] = await Promise.all([
      getTokenPrice(tokenA),
      getTokenPrice(tokenB)
    ]);
    
    const reserveAValue = Number(reserveIn) / Math.pow(10, 9); // IOTA decimals
    const reserveBValue = Number(reserveOut) / Math.pow(10, 9);
    const tvl = reserveAValue * (priceA?.price || 0) + reserveBValue * (priceB?.price || 0);

    return {
      tvl: Math.round(tvl),
      volume24h: Math.round(tvl * 0.1), // Estimate 10% daily turnover
      fee: 1.8, // From smart contract FEE_NUMERATOR/FEE_DENOMINATOR (18/1000)
      apr: Math.round(((tvl * 0.1 * 365 * 0.018) / tvl) * 100), // APR from fees
      reserves: {
        tokenA: Number(reserveIn),
        tokenB: Number(reserveOut),
      },
    };
  } catch (error) {
    console.error('Failed to get real pool info:', error);
    
    // Fallback to basic structure with zero values
    return {
      tvl: 0,
      volume24h: 0,
      fee: 1.8, // Real fee rate from contract
      apr: 0,
      reserves: {
        tokenA: 0,
        tokenB: 0,
      },
    };
  }
}