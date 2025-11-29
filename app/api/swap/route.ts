import { NextRequest, NextResponse } from 'next/server';
import { IotaClient, getFullnodeUrl } from '@iota/iota-sdk/client';
import { SUPPORTED_COINS } from '@/config/iota.config';

// Initialize IOTA client for real chain interaction
const client = new IotaClient({ url: getFullnodeUrl('testnet') });

// Real pool registry for production use
interface PoolInfo {
  id: string;
  coinTypeA: string;
  coinTypeB: string;
  feeRate: number;
}

// Production pool registry - replace with actual deployed pools
const POOL_REGISTRY: PoolInfo[] = [
  {
    id: process.env.NEXT_PUBLIC_IOTA_STIOTA_POOL_ID || '',
    coinTypeA: SUPPORTED_COINS.IOTA.type,
    coinTypeB: SUPPORTED_COINS.stIOTA.type,
    feeRate: 18, // 1.8% as configured in simple_dex.move
  },
  // Add more pools as they are deployed
];

async function getPoolReserves(poolId: string, coinTypeA: string, coinTypeB: string) {
  try {
    const pool = await client.getObject({
      id: poolId,
      options: { showContent: true },
    });

    if (pool.data?.content?.dataType === 'moveObject') {
      const fields = pool.data.content.fields as any;
      return {
        reserveA: BigInt(fields.reserve_a?.fields?.value || '0'),
        reserveB: BigInt(fields.reserve_b?.fields?.value || '0'),
        lpSupply: BigInt(fields.lp_supply || '0'),
        feeData: fields.fee_data || '0',
        volumeData: fields.volume_data || '0',
      };
    }
    throw new Error('Invalid pool object');
  } catch (error) {
    console.error('Failed to fetch pool reserves:', error);
    throw error;
  }
}

function findPool(tokenA: string, tokenB: string): PoolInfo | null {
  return POOL_REGISTRY.find(pool => 
    (pool.coinTypeA === tokenA && pool.coinTypeB === tokenB) ||
    (pool.coinTypeA === tokenB && pool.coinTypeB === tokenA)
  ) || null;
}

function calculateSwapOutput(
  amountIn: bigint, 
  reserveIn: bigint, 
  reserveOut: bigint, 
  feeRate: number
): bigint {
  if (reserveIn === 0n || reserveOut === 0n) return 0n;
  
  const feeAmount = (amountIn * BigInt(feeRate)) / 1000n;
  const amountInAfterFee = amountIn - feeAmount;
  
  return (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, params } = body;

    switch (action) {
      case 'estimate': {
        const { inputToken, outputToken, inputAmount } = params;
        
        // Find real pool from registry
        const pool = findPool(inputToken, outputToken);
        if (!pool || !pool.id) {
          return NextResponse.json({ error: 'No pool found for this pair' }, { status: 404 });
        }

        // Get real reserves from blockchain
        const reserves = await getPoolReserves(pool.id, pool.coinTypeA, pool.coinTypeB);
        
        // Determine swap direction
        const isReverse = pool.coinTypeA !== inputToken;
        const reserveIn = isReverse ? reserves.reserveB : reserves.reserveA;
        const reserveOut = isReverse ? reserves.reserveA : reserves.reserveB;
        
        if (reserveIn === 0n || reserveOut === 0n) {
          return NextResponse.json({ error: 'Pool has no liquidity' }, { status: 400 });
        }

        const amountIn = BigInt(inputAmount);
        const outputAmount = calculateSwapOutput(amountIn, reserveIn, reserveOut, pool.feeRate);

        // Calculate price impact
        const priceImpact = Number(amountIn) / Number(reserveIn) * 100;

        return NextResponse.json({
          outputAmount: outputAmount.toString(),
          priceImpact: Math.min(priceImpact, 100), // Cap at 100%
          route: [inputToken, outputToken],
          poolId: pool.id,
          reserves: {
            in: reserveIn.toString(),
            out: reserveOut.toString(),
          },
        });
      }

      case 'execute': {
        // Return transaction building instructions instead of fake success
        const { inputToken, outputToken, inputAmount, minOutputAmount, poolId } = params;
        
        const pool = findPool(inputToken, outputToken);
        if (!pool || !pool.id) {
          return NextResponse.json({ error: 'No pool found' }, { status: 404 });
        }

        // Return transaction parameters for frontend to build and execute
        return NextResponse.json({
          success: true,
          transactionParams: {
            target: 'simple_dex::swap_a_to_b_internal',
            poolId: pool.id,
            coinTypeA: pool.coinTypeA,
            coinTypeB: pool.coinTypeB,
            inputAmount,
            minOutputAmount,
            isReverse: pool.coinTypeA !== inputToken,
          },
          message: 'Transaction parameters prepared',
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