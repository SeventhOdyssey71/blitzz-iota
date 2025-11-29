import { NextRequest, NextResponse } from 'next/server';
import { IOTA_CONFIG, getTokenByType, MODULE_NAMES } from '@/config/iota.config';
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
import { withTradingSecurity } from '@/lib/middleware/security';
import { PoolService } from '@/lib/services/pool-service';
import { log, measurePerformance } from '@/lib/logging';

// Production-ready pool service instance
const poolService = PoolService.getInstance();

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

const handleSwapRequest = async (request: NextRequest) => {
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
        const timer = measurePerformance('SwapAPI.estimate');
        
        try {
          // Validate swap parameters
          const validation = validateSwapRequest(params);
          if (!validation.isValid) {
            throw validation.errors[0];
          }

          const { inputToken, outputToken, inputAmount, slippage } = validation.data!;
          
          // Get token information
          const inputTokenInfo = getTokenByType(inputToken);
          const outputTokenInfo = getTokenByType(outputToken);
          
          if (!inputTokenInfo || !outputTokenInfo) {
            throw createPoolNotFoundError(inputToken, outputToken);
          }

          log.debug('Processing swap estimate', { 
            inputToken: inputTokenInfo.symbol,
            outputToken: outputTokenInfo.symbol,
            inputAmount 
          });

          // Find pool using production-ready service
          const pool = await poolService.findPool(inputToken, outputToken);
          if (!pool) {
            throw createPoolNotFoundError(inputToken, outputToken);
          }

          // Convert input amount
          const amountIn = BigInt(inputAmount);
          if (amountIn <= 0n) {
            throw new ValidationError('Input amount must be greater than zero');
          }

          // Determine swap direction
          const isAToB = pool.coinTypeA === inputToken;
          
          // Calculate swap quote using production service
          const quote = poolService.calculateSwapQuote(
            pool,
            amountIn,
            isAToB,
            slippage || IOTA_CONFIG.defaults.slippage
          );

          log.business('Swap estimate calculated', {
            inputToken: inputTokenInfo.symbol,
            outputToken: outputTokenInfo.symbol,
            inputAmount: amountIn.toString(),
            outputAmount: quote.outputAmount.toString(),
            priceImpact: quote.priceImpact,
          });

          return createSuccessResponse({
            outputAmount: quote.outputAmount.toString(),
            priceImpact: quote.priceImpact,
            minimumReceived: quote.minimumReceived.toString(),
            route: [inputToken, outputToken],
            poolId: pool.poolId,
            reserves: {
              in: (isAToB ? pool.reserveA : pool.reserveB).toString(),
              out: (isAToB ? pool.reserveB : pool.reserveA).toString(),
            },
            fee: pool.feePercentage,
            slippageTolerance: slippage || IOTA_CONFIG.defaults.slippage,
          });
          
        } finally {
          timer.end();
        }
      }

      case 'execute': {
        const timer = measurePerformance('SwapAPI.execute');
        
        try {
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
          
          // Get token information
          const inputTokenInfo = getTokenByType(inputToken);
          const outputTokenInfo = getTokenByType(outputToken);
          
          if (!inputTokenInfo || !outputTokenInfo) {
            throw createPoolNotFoundError(inputToken, outputToken);
          }
          
          // Validate minOutputAmount if provided
          if (minOutputAmount && BigInt(minOutputAmount) <= 0n) {
            throw new ValidationError('Minimum output amount must be greater than zero');
          }
          
          // Find pool
          const pool = await poolService.findPool(inputToken, outputToken);
          if (!pool) {
            throw createPoolNotFoundError(inputToken, outputToken);
          }

          // Verify pool has liquidity
          if (pool.reserveA <= 0n || pool.reserveB <= 0n) {
            throw new PoolError(
              ErrorCode.INSUFFICIENT_LIQUIDITY,
              'Pool has no liquidity for execution'
            );
          }

          // Determine swap direction and function
          const isAToB = pool.coinTypeA === inputToken;
          const swapFunction = isAToB ? 'swap_a_to_b' : 'swap_b_to_a';

          log.business('Swap execution prepared', {
            inputToken: inputTokenInfo.symbol,
            outputToken: outputTokenInfo.symbol,
            inputAmount,
            poolId: pool.poolId,
            swapFunction,
          });

          // Return transaction parameters for frontend to build and execute
          return createSuccessResponse({
            transactionParams: {
              target: `${IOTA_CONFIG.packages.core}::${MODULE_NAMES.DEX}::${swapFunction}`,
              poolId: pool.poolId,
              coinTypeA: pool.coinTypeA,
              coinTypeB: pool.coinTypeB,
              inputAmount,
              minOutputAmount: minOutputAmount || '0',
              isReverse: !isAToB,
              moduleCall: {
                packageId: IOTA_CONFIG.packages.core,
                module: MODULE_NAMES.DEX,
                function: swapFunction,
                typeArguments: [pool.coinTypeA, pool.coinTypeB],
              },
            },
            message: 'Transaction parameters prepared successfully',
            estimatedGas: '10000000', // Estimated gas for swap
          });
          
        } finally {
          timer.end();
        }
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
};

// Apply security middleware to the handler
export const POST = withTradingSecurity(handleSwapRequest);