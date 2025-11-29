'use client';

import { getSafeIotaClient } from '@/lib/iota/safe-client';
import { IOTA_CONFIG, getPoolId, getTokenByType, MODULE_NAMES } from '@/config/iota.config';
import { log, measurePerformance } from '@/lib/logging';
import { poolCache, withCache } from '@/lib/cache';
import { NetworkError, PoolError, ErrorCode, createPoolNotFoundError } from '@/lib/errors';

export interface PoolInfo {
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
  reserveA: bigint;
  reserveB: bigint;
  lpSupply: bigint;
  feePercentage: number;
  totalVolumeA?: bigint;
  totalVolumeB?: bigint;
  feesA?: bigint;
  feesB?: bigint;
}

export interface SwapQuote {
  outputAmount: bigint;
  priceImpact: number;
  minimumReceived: bigint;
}

export class PoolService {
  private static instance: PoolService | null = null;
  private readonly client;
  private readonly packageId: string;

  private constructor() {
    this.client = getSafeIotaClient();
    this.packageId = IOTA_CONFIG.packages.core;
    
    if (!this.client) {
      throw new NetworkError('Failed to initialize IOTA client');
    }
    
    if (!this.packageId || this.packageId === '0x0') {
      throw new Error('Core package ID not configured. Please deploy contracts first.');
    }
  }

  static getInstance(): PoolService {
    if (!PoolService.instance) {
      PoolService.instance = new PoolService();
    }
    return PoolService.instance;
  }

  async findPool(coinTypeA: string, coinTypeB: string): Promise<PoolInfo | null> {
    const timer = measurePerformance('PoolService.findPool');
    
    try {
      // Get token information
      const tokenA = getTokenByType(coinTypeA);
      const tokenB = getTokenByType(coinTypeB);
      
      if (!tokenA || !tokenB) {
        throw createPoolNotFoundError(coinTypeA, coinTypeB);
      }

      // Get pool ID from configuration
      const poolId = getPoolId(tokenA.symbol, tokenB.symbol);
      
      if (!poolId || poolId === '0x0') {
        log.warn('Pool not found in configuration', { 
          tokenA: tokenA.symbol, 
          tokenB: tokenB.symbol 
        });
        return null;
      }

      // Use cache for pool info
      const cacheKey = `pool:${poolId}`;
      return await withCache(
        poolCache,
        cacheKey,
        () => this.fetchPoolInfo(poolId, coinTypeA, coinTypeB),
        30000 // 30 second TTL for pool data
      );

    } catch (error) {
      log.error('Failed to find pool', { coinTypeA, coinTypeB }, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  private async fetchPoolInfo(poolId: string, coinTypeA: string, coinTypeB: string): Promise<PoolInfo> {
    try {
      const poolObject = await this.client!.getObject({
        id: poolId,
        options: { showContent: true },
      });

      if (!poolObject.data?.content || poolObject.data.content.dataType !== 'moveObject') {
        throw new PoolError(ErrorCode.POOL_NOT_FOUND, `Pool object not found: ${poolId}`);
      }

      const fields = poolObject.data.content.fields as any;
      
      // Validate pool structure
      if (!fields.reserve_a || !fields.reserve_b || !fields.lp_supply) {
        throw new PoolError(ErrorCode.INVALID_CONTRACT_STATE, 'Invalid pool structure');
      }

      const reserveA = BigInt(fields.reserve_a?.fields?.value || fields.reserve_a || '0');
      const reserveB = BigInt(fields.reserve_b?.fields?.value || fields.reserve_b || '0');
      const lpSupply = BigInt(fields.lp_supply || '0');

      // Extract fee and volume data from packed fields
      const feeData = fields.fee_data || '0';
      const volumeData = fields.volume_data || '0';

      const poolInfo: PoolInfo = {
        poolId,
        coinTypeA,
        coinTypeB,
        reserveA,
        reserveB,
        lpSupply,
        feePercentage: IOTA_CONFIG.fees.swap, // 1.8%
        totalVolumeA: this.unpackHighU64(BigInt(volumeData)),
        totalVolumeB: this.unpackLowU64(BigInt(volumeData)),
        feesA: this.unpackHighU64(BigInt(feeData)),
        feesB: this.unpackLowU64(BigInt(feeData)),
      };

      log.debug('Pool info fetched', { 
        poolId, 
        reserveA: reserveA.toString(), 
        reserveB: reserveB.toString(),
        lpSupply: lpSupply.toString()
      });

      return poolInfo;
      
    } catch (error) {
      if (error instanceof PoolError) {
        throw error;
      }
      
      log.error('Failed to fetch pool info', { poolId }, error instanceof Error ? error : undefined);
      throw new NetworkError(`Failed to fetch pool info: ${poolId}`);
    }
  }

  // Utility methods for packed data
  private unpackHighU64(packed: bigint): bigint {
    return packed >> 64n;
  }

  private unpackLowU64(packed: bigint): bigint {
    return packed & 0xFFFFFFFFFFFFFFFFn;
  }

  calculateSwapQuote(
    pool: PoolInfo,
    inputAmount: bigint,
    isAToB: boolean,
    slippageTolerance: number = 0.5
  ): SwapQuote {
    if (inputAmount <= 0n) {
      throw new Error('Input amount must be greater than zero');
    }

    const FEE_DENOMINATOR = BigInt(1000);
    const FEE_NUMERATOR = BigInt(pool.feePercentage);
    
    const reserveIn = isAToB ? pool.reserveA : pool.reserveB;
    const reserveOut = isAToB ? pool.reserveB : pool.reserveA;
    
    // Validate reserves
    if (reserveIn <= 0n || reserveOut <= 0n) {
      throw new PoolError(ErrorCode.INSUFFICIENT_LIQUIDITY, 'Pool has no liquidity');
    }

    // Prevent excessive price impact
    const maxInputPercent = reserveIn / 10n; // Max 10% of reserve
    if (inputAmount > maxInputPercent) {
      throw new Error('Input amount too large, would cause excessive price impact');
    }

    // Calculate fee
    const feeAmount = (inputAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
    const inputAfterFee = inputAmount - feeAmount;
    
    // Calculate output using constant product formula
    const outputAmount = (inputAfterFee * reserveOut) / (reserveIn + inputAfterFee);
    
    if (outputAmount <= 0n) {
      throw new PoolError(ErrorCode.INSUFFICIENT_LIQUIDITY, 'Insufficient output amount');
    }

    // Calculate price impact
    const priceImpact = Number(inputAmount) / Number(reserveIn) * 100;
    
    // Validate price impact
    if (priceImpact > 5) {
      throw new Error(`Price impact too high: ${priceImpact.toFixed(2)}%`);
    }

    // Calculate minimum received with slippage
    const slippageMultiplier = BigInt(Math.floor((100 - slippageTolerance) * 100));
    const minimumReceived = (outputAmount * slippageMultiplier) / BigInt(10000);
    
    return { outputAmount, priceImpact, minimumReceived };
  }

  async getAllPools(): Promise<PoolInfo[]> {
    const timer = measurePerformance('PoolService.getAllPools');
    
    try {
      const pools: PoolInfo[] = [];
      const tokens = Object.values(IOTA_CONFIG.tokens);
      
      // Check all configured pool pairs
      for (let i = 0; i < tokens.length; i++) {
        for (let j = i + 1; j < tokens.length; j++) {
          try {
            const pool = await this.findPool(tokens[i].type, tokens[j].type);
            if (pool) {
              pools.push(pool);
            }
          } catch (error) {
            // Continue with other pools if one fails
            log.warn('Failed to fetch pool', { 
              tokenA: tokens[i].symbol, 
              tokenB: tokens[j].symbol 
            });
          }
        }
      }
      
      log.info('Fetched all pools', { count: pools.length });
      return pools;
      
    } catch (error) {
      log.error('Failed to fetch all pools', {}, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  async createPool(
    coinTypeA: string,
    coinTypeB: string,
    amountA: bigint,
    amountB: bigint
  ) {
    // This would be implemented when pool creation is needed
    // For now, pools are pre-configured
    throw new Error('Pool creation not implemented. Use pre-configured pools.');
  }

  // Static convenience methods
  static getInstance = () => PoolService.getInstance();
  
  static async findPool(coinTypeA: string, coinTypeB: string): Promise<PoolInfo | null> {
    return PoolService.getInstance().findPool(coinTypeA, coinTypeB);
  }
  
  static calculateSwapQuote(
    pool: PoolInfo,
    inputAmount: bigint,
    isAToB: boolean,
    slippageTolerance?: number
  ): SwapQuote {
    return PoolService.getInstance().calculateSwapQuote(pool, inputAmount, isAToB, slippageTolerance);
  }
  
  static async getAllPools(): Promise<PoolInfo[]> {
    return PoolService.getInstance().getAllPools();
  }
}