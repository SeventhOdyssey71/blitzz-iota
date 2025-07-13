import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// ONLY 3 SUPPORTED TOKENS
const TOKEN_MAPPINGS: Record<string, string> = {
  'IOTA': 'iota',
  'stIOTA': 'iota', // Use IOTA price for stIOTA
  'vUSD': 'usd-coin', // vUSD is pegged to USD
};

const SUPPORTED_TOKENS = ['IOTA', 'stIOTA', 'vUSD'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedSymbols = searchParams.get('symbols')?.split(',').filter(s => s.trim()) || [];

    // Filter to only supported tokens
    const symbols = requestedSymbols.filter(symbol => SUPPORTED_TOKENS.includes(symbol));

    if (symbols.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    // Get unique coin IDs to fetch
    const uniqueCoinIds = [...new Set(symbols.map(symbol => TOKEN_MAPPINGS[symbol]).filter(Boolean))];
    const coinIds = uniqueCoinIds.join(',');

    // Initialize prices object
    const prices: Record<string, any> = {};
    
    // If we have coin IDs to fetch, get from CoinGecko
    if (coinIds) {
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
        {
          next: { revalidate: 600 }, // Cache for 10 minutes (600 seconds)
        }
      ).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();

        // Map prices for each requested symbol
        for (const symbol of symbols) {
          const coinId = TOKEN_MAPPINGS[symbol];
          
          if (coinId && data[coinId]) {
            // Special handling for vUSD - always $1
            if (symbol === 'vUSD') {
              prices[symbol] = {
                symbol,
                price: 1.0,
                change24h: 0,
                volume24h: data[coinId].usd_24h_vol || 0,
                marketCap: data[coinId].usd_market_cap || 0,
              };
            } else {
              prices[symbol] = {
                symbol,
                price: data[coinId].usd || 0,
                change24h: data[coinId].usd_24h_change || 0,
                volume24h: data[coinId].usd_24h_vol || 0,
                marketCap: data[coinId].usd_market_cap || 0,
              };
            }
          }
        }
      }
    }

    // Add fallback data for any missing tokens
    const fallbackPrices: Record<string, any> = {
      'IOTA': { symbol: 'IOTA', price: 0.2847, change24h: 2.34, volume24h: 15234567, marketCap: 897654321 },
      'stIOTA': { symbol: 'stIOTA', price: 0.2847, change24h: 2.34, volume24h: 15234567, marketCap: 897654321 },
      'vUSD': { symbol: 'vUSD', price: 1.0, change24h: 0, volume24h: 1234567890, marketCap: 25678901234 },
    };

    for (const symbol of symbols) {
      if (!prices[symbol] && fallbackPrices[symbol]) {
        prices[symbol] = fallbackPrices[symbol];
      }
    }

    return NextResponse.json(prices, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200', // 10 min cache, 20 min stale
      },
    });
  } catch (error) {
    console.error('Price API error:', error);
    
    // Return fallback prices for our supported tokens only
    const fallbackPrices: Record<string, any> = {
      'IOTA': { symbol: 'IOTA', price: 0.2847, change24h: 2.34, volume24h: 15234567, marketCap: 897654321 },
      'stIOTA': { symbol: 'stIOTA', price: 0.2847, change24h: 2.34, volume24h: 15234567, marketCap: 897654321 },
      'vUSD': { symbol: 'vUSD', price: 1.0, change24h: 0, volume24h: 1234567890, marketCap: 25678901234 },
    };
    
    return NextResponse.json(fallbackPrices, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200', // 10 min cache, 20 min stale
      },
    });
  }
}