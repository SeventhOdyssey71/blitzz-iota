import { NextRequest, NextResponse } from 'next/server';

// Mock pool data for demo
const MOCK_POOLS = {
  'IOTA-USDC': {
    id: '0x1234567890abcdef',
    reserveA: BigInt('1000000000000'), // 1000 IOTA
    reserveB: BigInt('284700000'), // 284.7 USDC
    fee: 30, // 0.3%
  },
  'IOTA-USDT': {
    id: '0xabcdef1234567890',
    reserveA: BigInt('800000000000'), // 800 IOTA
    reserveB: BigInt('227760000'), // 227.76 USDT
    fee: 30,
  },
  'USDC-USDT': {
    id: '0xfedcba0987654321',
    reserveA: BigInt('500000000'), // 500 USDC
    reserveB: BigInt('500050000'), // 500.05 USDT
    fee: 10, // 0.1% for stablecoins
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