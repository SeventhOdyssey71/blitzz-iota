import { NextRequest, NextResponse } from 'next/server';

// Mock pool data for demo
const MOCK_POOLS = {
  'IOTA-stIOTA': {
    id: '0xbb039632ab28afa6b123a537acd03c1988e665170c75e06ee81bf996d1426021',
    reserveA: BigInt('10000000000000'), // 10,000 IOTA
    reserveB: BigInt('9900000000000'), // 9,900 stIOTA (1.01 exchange rate)
    fee: 10, // 0.1%
  },
  'IOTA-vUSD': {
    id: '0x1234567890abcdef',
    reserveA: BigInt('5000000000000'), // 5,000 IOTA
    reserveB: BigInt('1500000000'), // 1,500 vUSD (assuming $0.30 per IOTA)
    fee: 30, // 0.3%
  },
  'stIOTA-vUSD': {
    id: '0xabcdef1234567890',
    reserveA: BigInt('3000000000000'), // 3,000 stIOTA
    reserveB: BigInt('900000000'), // 900 vUSD
    fee: 30, // 0.3%
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'estimate': {
        const { inputToken, outputToken, inputAmount } = params;
        
        // Find pool
        const poolKey = `${inputToken}-${outputToken}`;
        const reverseKey = `${outputToken}-${inputToken}`;
        const pool = MOCK_POOLS[poolKey as keyof typeof MOCK_POOLS] || 
                    MOCK_POOLS[reverseKey as keyof typeof MOCK_POOLS];

        if (!pool) {
          return NextResponse.json({ error: 'No pool found' }, { status: 404 });
        }

        // Calculate output using constant product formula
        const isReverse = !MOCK_POOLS[poolKey as keyof typeof MOCK_POOLS];
        const reserveIn = isReverse ? pool.reserveB : pool.reserveA;
        const reserveOut = isReverse ? pool.reserveA : pool.reserveB;
        
        const amountIn = BigInt(inputAmount);
        const amountInWithFee = amountIn * (BigInt(10000) - BigInt(pool.fee)) / BigInt(10000);
        const outputAmount = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);

        // Calculate price impact
        const priceImpact = Number(amountIn) / Number(reserveIn) * 100;

        return NextResponse.json({
          outputAmount: outputAmount.toString(),
          priceImpact,
          route: [inputToken, outputToken],
          poolId: pool.id,
        });
      }

      case 'execute': {
        // In production, this would build and return a transaction
        // For demo, return success
        return NextResponse.json({
          success: true,
          transactionId: `0x${Math.random().toString(16).slice(2)}`,
          message: 'Swap simulation successful',
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Swap API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}