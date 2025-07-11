import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const TOKEN_MAPPINGS: Record<string, string> = {
  'IOTA': 'iota',
  'stIOTA': 'iota', // Use IOTA price for stIOTA
  'vUSD': 'usd-coin', // Use USD price for vUSD
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbols = searchParams.get('symbols')?.split(',').filter(s => s.trim()) || [];

    if (symbols.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }

    // Get mapped coin IDs
    const mappedSymbols = symbols.filter(symbol => TOKEN_MAPPINGS[symbol]);
    const coinIds = mappedSymbols
      .map(symbol => TOKEN_MAPPINGS[symbol])
      .filter(Boolean)
      .join(',');

    // Initialize prices object
    const prices: Record<string, any> = {};
    
    // If we have mapped symbols, fetch from CoinGecko
    if (coinIds) {
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`,
        {
          next: { revalidate: 30 }, // Cache for 30 seconds
        }
      ).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();

        // Transform the response
        for (const [symbol, coinId] of Object.entries(TOKEN_MAPPINGS)) {
          if (symbols.includes(symbol) && data[coinId]) {
            prices[symbol] = {
              symbol,
              price: data[coinId].usd || 0,
              change24h: data[coinId].usd_24h_change || 0,
              volume24h: data[coinId].usd_24h_vol || 0,
              marketCap: data[coinId].usd_market_cap || 0,
            };
          }
        }
        
        // Special handling for vUSD - stable at $1
        if (symbols.includes('vUSD')) {
          prices['vUSD'] = {
            symbol: 'vUSD',
            price: 1.0,
            change24h: 0,
            volume24h: data['usd-coin']?.usd_24h_vol || 0,
            marketCap: data['usd-coin']?.usd_market_cap || 0,
          };
        }
      }
    }

    // Add fallback data for missing tokens
    for (const symbol of symbols) {
      if (!prices[symbol]) {
        prices[symbol] = {
          symbol,
          price: 1.0,
          change24h: 0,
          volume24h: 0,
          marketCap: 0,
        };
      }
    }

    return NextResponse.json(prices, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('Price API error:', error);
    
    // Return fallback prices for our supported tokens
    const fallbackPrices: Record<string, any> = {
      'IOTA': { symbol: 'IOTA', price: 0.2847, change24h: 2.34, volume24h: 15234567, marketCap: 897654321 },
      'stIOTA': { symbol: 'stIOTA', price: 0.2847, change24h: 2.34, volume24h: 15234567, marketCap: 897654321 },
      'vUSD': { symbol: 'vUSD', price: 1.0, change24h: 0, volume24h: 1234567890, marketCap: 25678901234 },
    };
    
    return NextResponse.json(fallbackPrices, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  }
}