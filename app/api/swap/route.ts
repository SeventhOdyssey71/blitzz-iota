import { NextRequest, NextResponse } from 'next/server';
import { IotaClient, getFullnodeUrl } from '@iota/iota-sdk/client';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { 
  AppError, 
  ErrorCode, 
  ValidationError, 
  NetworkError, 
  PoolError,
  TransactionError,
  parseError,
  createPoolNotFoundError
} from '@/lib/errors';
import { validateSwapRequest, validators } from '@/lib/validation';

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

// Standardized API response format
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: any;
  };
  timestamp: string;
}

function createSuccessResponse<T>(data: T): NextResponse {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response);
}

function createErrorResponse(error: AppError): NextResponse {
  const response: ApiResponse = {
    success: false,
    error: {
      code: error.code,
      message: error.message,
      details: error.context,
    },
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(response, { status: error.statusCode });
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      throw new ValidationError('Invalid JSON in request body');
    }

    const { action, params } = body;
    
    if (!action || typeof action !== 'string') {
      throw new ValidationError('Action is required and must be a string');
    }

    if (!params || typeof params !== 'object') {
      throw new ValidationError('Params is required and must be an object');
    }

    switch (action) {
      case 'estimate': {
        // Validate swap parameters
        const validation = validateSwapRequest(params);
        if (!validation.isValid) {
          throw validation.errors[0]; // Return first validation error
        }

        const { inputToken, outputToken, inputAmount } = validation.data!;
        
        // Find real pool from registry
        const pool = findPool(inputToken, outputToken);
        if (!pool || !pool.id) {
          throw createPoolNotFoundError(inputToken, outputToken);
        }

        // Get real reserves from blockchain with timeout
        let reserves;
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 10000)
          );
          
          reserves = await Promise.race([
            getPoolReserves(pool.id, pool.coinTypeA, pool.coinTypeB),
            timeoutPromise
          ]);
        } catch (error) {
          if (error instanceof Error && error.message === 'Request timeout') {
            throw new NetworkError('Request timeout while fetching pool reserves');
          }
          throw new NetworkError('Failed to fetch pool reserves from blockchain');
        }
        
        // Determine swap direction
        const isReverse = pool.coinTypeA !== inputToken;
        const reserveIn = isReverse ? reserves.reserveB : reserves.reserveA;
        const reserveOut = isReverse ? reserves.reserveA : reserves.reserveB;
        
        if (reserveIn === 0n || reserveOut === 0n) {
          throw new PoolError(
            ErrorCode.INSUFFICIENT_LIQUIDITY,
            'Pool has no liquidity',
            { poolId: pool.id, reserveIn: reserveIn.toString(), reserveOut: reserveOut.toString() }
          );
        }

        // Validate input amount doesn't exceed reserves
        const amountIn = BigInt(inputAmount);
        if (amountIn <= 0n) {
          throw new ValidationError('Input amount must be greater than zero');
        }

        // Calculate maximum possible input (90% of reserve to prevent extreme price impact)
        const maxInput = (reserveIn * 90n) / 100n;
        if (amountIn > maxInput) {
          throw new ValidationError(
            'Input amount too large, would cause excessive price impact',
            { inputAmount, maxAllowed: maxInput.toString() }
          );
        }

        const outputAmount = calculateSwapOutput(amountIn, reserveIn, reserveOut, pool.feeRate);

        // Calculate price impact
        const priceImpact = Number(amountIn) / Number(reserveIn) * 100;

        // Warn if price impact is high
        if (priceImpact > 5) {
          throw new ValidationError(
            `Price impact too high: ${priceImpact.toFixed(2)}%. Maximum allowed: 5%`,
            { priceImpact, maxAllowed: 5 }
          );
        }

        return createSuccessResponse({
          outputAmount: outputAmount.toString(),
          priceImpact: Math.min(priceImpact, 100),
          route: [inputToken, outputToken],
          poolId: pool.id,
          reserves: {
            in: reserveIn.toString(),
            out: reserveOut.toString(),
          },
          fee: pool.feeRate,
          minimumReceived: (outputAmount * 995n / 1000n).toString(), // 0.5% slippage tolerance
        });
      }

      case 'execute': {
        // Validate execute parameters
        const executeValidation = validators.swap.validate({
          inputToken: params.inputToken,
          outputToken: params.outputToken,
          inputAmount: params.inputAmount,
        });
        
        if (!executeValidation.isValid) {
          throw executeValidation.errors[0];
        }

        const { inputToken, outputToken, inputAmount } = executeValidation.data!;
        const { minOutputAmount } = params;
        
        // Validate minOutputAmount if provided
        if (minOutputAmount && (!minOutputAmount || BigInt(minOutputAmount) <= 0n)) {
          throw new ValidationError('Minimum output amount must be greater than zero');
        }
        
        const pool = findPool(inputToken, outputToken);
        if (!pool || !pool.id) {
          throw createPoolNotFoundError(inputToken, outputToken);
        }

        // Verify pool is still valid by checking reserves
        try {
          const reserves = await getPoolReserves(pool.id, pool.coinTypeA, pool.coinTypeB);
          if (reserves.reserveA === 0n || reserves.reserveB === 0n) {
            throw new PoolError(
              ErrorCode.INSUFFICIENT_LIQUIDITY,
              'Pool has no liquidity for execution'
            );
          }
        } catch (error) {
          throw new NetworkError('Failed to verify pool state before execution');
        }

        // Return transaction parameters for frontend to build and execute
        return createSuccessResponse({
          transactionParams: {
            target: `simple_dex::swap_${pool.coinTypeA === inputToken ? 'a_to_b' : 'b_to_a'}_internal`,
            poolId: pool.id,
            coinTypeA: pool.coinTypeA,
            coinTypeB: pool.coinTypeB,
            inputAmount,
            minOutputAmount: minOutputAmount || '0',
            isReverse: pool.coinTypeA !== inputToken,
          },
          message: 'Transaction parameters prepared successfully',
        });
      }

      default:
        throw new ValidationError(`Unsupported action: ${action}`);
    }
  } catch (error) {
    // Handle errors with standardized error response
    const appError = parseError(error);
    
    // Log error for monitoring (in production, send to logging service)
    console.error('[SWAP_API_ERROR]', {
      error: appError.toJSON(),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
    return createErrorResponse(appError);
  }
}