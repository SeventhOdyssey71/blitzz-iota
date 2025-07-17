'use client';

import { getSafeIotaClient } from '@/lib/iota/safe-client';
import { blitz_PACKAGE_ID, SUPPORTED_COINS, STAKING_POOL_ADDRESS, STIOTA_TYPE } from '@/config/iota.config';
import { findMockPool, getAllMockPools } from './mock-pools';
import { PoolTracker } from './pool-tracker';
import { KNOWN_POOLS } from '@/config/known-pools';

export interface PoolInfo {
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
  reserveA: bigint;
  reserveB: bigint;
  lpSupply: bigint;
  feePercentage: number;
  feesA?: bigint;
  feesB?: bigint;
  totalVolumeA?: bigint;
  totalVolumeB?: bigint;
}

export interface SwapRoute {
  pools: PoolInfo[];
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  path: string[];
}

// Cache for pool data
const POOL_CACHE: Map<string, PoolInfo> = new Map();
const CACHE_DURATION = 10000; // 10 seconds for faster updates
let lastCacheUpdate = 0;

// Clear cache on pool refresh event
if (typeof window !== 'undefined') {
  window.addEventListener('pool-cache-refresh', () => {
    console.log('Clearing pool discovery cache');
    POOL_CACHE.clear();
    lastCacheUpdate = 0;
  });
}

// Clean up cache periodically to prevent memory leaks
const MAX_CACHE_SIZE = 100;
function cleanupCache() {
  if (POOL_CACHE.size > MAX_CACHE_SIZE) {
    // Clear the cache if it gets too large
    POOL_CACHE.clear();
    lastCacheUpdate = 0;
  }
}

export class PoolDiscovery {
  static async findPoolsForPair(
    coinTypeA: string,
    coinTypeB: string,
    network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'
  ): Promise<PoolInfo | null> {
    // Only log in debug mode
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).debugPools) {
      console.log('Finding pool for pair:', { coinTypeA, coinTypeB });
    }
    const client = getSafeIotaClient();
    
    // Clear any stale pool data on first load
    if (typeof window !== 'undefined' && !window.poolsCleared) {
      console.log('Clearing stale pool data...');
      POOL_CACHE.clear();
      lastCacheUpdate = 0;
      window.poolsCleared = true;
    }
    
    // Special handling for IOTA <-> stIOTA staking pool
    const iotaType = SUPPORTED_COINS.IOTA.type;
    const stIotaType = SUPPORTED_COINS.stIOTA.type;
    
    const isStakingPair = (coinTypeA === iotaType && coinTypeB === stIotaType) ||
        (coinTypeA === stIotaType && coinTypeB === iotaType);
    
    // Only log in debug mode
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).debugPools) {
      console.log('Is staking pair:', isStakingPair, {
        iotaType,
        stIotaType,
        coinTypeA,
        coinTypeB,
        match1: coinTypeA === iotaType && coinTypeB === stIotaType,
        match2: coinTypeA === stIotaType && coinTypeB === iotaType
      });
    }
    
    if (isStakingPair) {
      // For IOTA <-> stIOTA, use regular pool instead of staking
      // Continue to regular pool lookup below
    }
    
    const packageId = blitz_PACKAGE_ID[network];

    // Don't use mock pools - return null if package is not deployed
    if (packageId === '0x0') {
      return null;
    }

    // Check cache first
    const cacheKey = `${coinTypeA}-${coinTypeB}`;
    const reverseCacheKey = `${coinTypeB}-${coinTypeA}`;
    
    if (Date.now() - lastCacheUpdate < CACHE_DURATION) {
      if (POOL_CACHE.has(cacheKey)) {
        return POOL_CACHE.get(cacheKey)!;
      }
      if (POOL_CACHE.has(reverseCacheKey)) {
        const pool = POOL_CACHE.get(reverseCacheKey)!;
        // Return reversed pool
        return {
          ...pool,
          coinTypeA: pool.coinTypeB,
          coinTypeB: pool.coinTypeA,
          reserveA: pool.reserveB,
          reserveB: pool.reserveA,
        };
      }
    }

    try {
      // Only log in debug mode
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).debugPools) {
        console.log('Searching for pool:', { coinTypeA, coinTypeB, packageId });
      }
      
      // First check known pools
      const poolKey = `${coinTypeA}_${coinTypeB}`;
      const reverseKey = `${coinTypeB}_${coinTypeA}`;
      const knownPoolId = KNOWN_POOLS[network]?.[poolKey] || KNOWN_POOLS[network]?.[reverseKey];
      
      // Only log in debug mode
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).debugPools) {
        console.log('Checking known pools:', {
          poolKey,
          reverseKey,
          knownPoolId,
          knownPools: KNOWN_POOLS[network]
        });
      }
      
      // Then check tracked pools (from localStorage)
      let poolId = knownPoolId || PoolTracker.findPool(coinTypeA, coinTypeB);
      
      // Get all tracked pools for debugging
      const allTrackedPools = PoolTracker.getPools();
      
      // Only log in debug mode
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).debugPools) {
        console.log('Pool discovery - found poolId:', poolId, {
          coinTypeA,
          coinTypeB,
          knownPoolId,
          trackedPoolId: PoolTracker.findPool(coinTypeA, coinTypeB),
          allTrackedPools: allTrackedPools.map(p => ({
            poolId: p.poolId,
            coinTypeA: p.coinTypeA,
            coinTypeB: p.coinTypeB,
          })),
          totalTrackedPools: allTrackedPools.length,
        });
      }
      
      // No hardcoded pools - they need to be created with the new contract
      // Only return pools that actually exist on-chain
      
      if (poolId) {
        try {
          // Validate pool ID format first
          if (!poolId || !/^0x[a-fA-F0-9]{64}$/.test(poolId)) {
            // Remove invalid pool from tracker silently
            PoolTracker.removePool(poolId);
            return null;
          }
          
          const poolObject = await client.getObject({
            id: poolId,
            options: {
              showContent: true,
              showType: true,
            },
          });
          
          if (poolObject && poolObject.data?.content?.dataType === 'moveObject') {
            const fields = poolObject.data.content.fields as any;
            
            // Parse the balance fields correctly
            const reserveA = fields.reserve_a?.fields?.value || fields.reserve_a || '0';
            const reserveB = fields.reserve_b?.fields?.value || fields.reserve_b || '0';
            
            const poolInfo: PoolInfo = {
              poolId: poolObject.data.objectId,
              coinTypeA,
              coinTypeB,
              reserveA: BigInt(reserveA),
              reserveB: BigInt(reserveB),
              lpSupply: BigInt(fields.lp_supply || 0),
              feePercentage: 30, // 0.3% fee (3/1000)
              feesA: BigInt(fields.fees_a || 0),
              feesB: BigInt(fields.fees_b || 0),
              totalVolumeA: BigInt(fields.total_volume_a || 0),
              totalVolumeB: BigInt(fields.total_volume_b || 0),
            };
            
            // Only log in debug mode
            if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).debugPools) {
              console.log('Found pool:', poolInfo);
            }
            
            // Update cache
            POOL_CACHE.set(cacheKey, poolInfo);
            lastCacheUpdate = Date.now();
            
            return poolInfo;
          }
        } catch (err: any) {
          // Check if it's an invalid object ID error
          if (err?.message?.includes('Invalid') || err?.message?.includes('Object id')) {
            // Pool no longer exists, remove from tracker silently
            PoolTracker.removePool(poolId);
          } else {
            console.error('Error fetching pool object:', err);
          }
        }
      }
      
      // Return null to trigger pool creation
      return null;
    } catch (error) {
      console.error('Error finding pools:', error);
    }

    return null;
  }

  static async findAllPools(
    network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'
  ): Promise<PoolInfo[]> {
    const client = getIotaClientSafe();
    const packageId = blitz_PACKAGE_ID[network];
    const pools: PoolInfo[] = [];

    // Return empty array if package is not deployed or client not available
    if (packageId === '0x0' || !client) {
      return [];
    }

    try {
      // Get all supported coin types
      const coinTypes = Object.values(SUPPORTED_COINS).map(coin => coin.type);
      
      // Check all possible pairs
      for (let i = 0; i < coinTypes.length; i++) {
        for (let j = i + 1; j < coinTypes.length; j++) {
          const pool = await this.findPoolsForPair(coinTypes[i], coinTypes[j], network);
          if (pool) {
            pools.push(pool);
          }
        }
      }
    } catch (error) {
      console.error('Error finding all pools:', error);
    }

    return pools;
  }

  static calculateOutputAmount(
    pool: PoolInfo,
    inputAmount: bigint,
    isAToB: boolean
  ): { outputAmount: bigint; priceImpact: number; minimumReceived: bigint; spotPriceBefore: number; spotPriceAfter: number } {
    // AMM constant product formula with fees
    // Using the fee structure from the smart contract (0.3% = 30/10000)
    const FEE_SCALE = BigInt(10000);
    const FEE_PERCENTAGE = BigInt(pool.feePercentage || 30); // 0.3% default
    
    // Special handling for staking pool (1:1 rate)
    if (pool.poolId === STAKING_POOL_ADDRESS) {
      const outputAmount = inputAmount; // 1:1 exchange rate
      return { 
        outputAmount, 
        priceImpact: 0,
        minimumReceived: outputAmount,
        spotPriceBefore: 1,
        spotPriceAfter: 1
      };
    }
    
    // Get reserves based on direction
    const reserveIn = isAToB ? pool.reserveA : pool.reserveB;
    const reserveOut = isAToB ? pool.reserveB : pool.reserveA;
    
    // Calculate spot price before swap
    const spotPriceBefore = Number(reserveOut) / Number(reserveIn);
    
    // Apply fee to input amount
    const inputAmountWithFee = inputAmount * (FEE_SCALE - FEE_PERCENTAGE);
    
    // Calculate output using constant product formula with fee
    // outputAmount = (inputAmountWithFee * reserveOut) / (reserveIn * FEE_SCALE + inputAmountWithFee)
    const numerator = inputAmountWithFee * reserveOut;
    const denominator = reserveIn * FEE_SCALE + inputAmountWithFee;
    const outputAmount = numerator / denominator;
    
    // Calculate new reserves after swap
    const newReserveIn = reserveIn + inputAmount;
    const newReserveOut = reserveOut - outputAmount;
    
    // Calculate spot price after swap
    const spotPriceAfter = Number(newReserveOut) / Number(newReserveIn);
    
    // Calculate execution price for this trade
    const executionPrice = Number(outputAmount) / Number(inputAmount);
    
    // Calculate price impact
    const priceImpact = Math.abs((spotPriceBefore - executionPrice) / spotPriceBefore) * 100;
    
    // Calculate minimum received with 0.5% slippage tolerance
    const slippageTolerance = BigInt(995); // 99.5%
    const minimumReceived = (outputAmount * slippageTolerance) / BigInt(1000);
    
    return { outputAmount, priceImpact, minimumReceived, spotPriceBefore, spotPriceAfter };
  }

  static getSpotPrice(
    pool: PoolInfo,
    isAToB: boolean
  ): number {
    if (pool.reserveA === 0n || pool.reserveB === 0n) {
      return 0;
    }
    
    if (isAToB) {
      // Price of A in terms of B
      return Number(pool.reserveB) / Number(pool.reserveA);
    } else {
      // Price of B in terms of A
      return Number(pool.reserveA) / Number(pool.reserveB);
    }
  }

  static getPoolSharePercentage(
    lpTokenAmount: bigint,
    totalLpSupply: bigint
  ): number {
    if (totalLpSupply === 0n) {
      return 0;
    }
    return (Number(lpTokenAmount) / Number(totalLpSupply)) * 100;
  }

  static calculateLiquidityValue(
    pool: PoolInfo,
    lpTokenAmount: bigint
  ): { tokenAAmount: bigint; tokenBAmount: bigint } {
    if (pool.lpSupply === 0n) {
      return { tokenAAmount: 0n, tokenBAmount: 0n };
    }
    
    const sharePercentage = lpTokenAmount * BigInt(10000) / pool.lpSupply;
    const tokenAAmount = (pool.reserveA * sharePercentage) / BigInt(10000);
    const tokenBAmount = (pool.reserveB * sharePercentage) / BigInt(10000);
    
    return { tokenAAmount, tokenBAmount };
  }

  static async findBestRoute(
    inputToken: string,
    outputToken: string,
    inputAmount: bigint,
    network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'
  ): Promise<SwapRoute | null> {
    // Only log in debug mode
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).debugPools) {
      console.log('Finding best route:', { inputToken, outputToken, inputAmount: inputAmount.toString() });
    }
    
    // Direct route
    const directPool = await this.findPoolsForPair(inputToken, outputToken, network);
    
    if (directPool) {
      // Only log in debug mode
      if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (window as any).debugPools) {
        console.log('Direct pool found:', directPool);
      }
      const isAToB = directPool.coinTypeA === inputToken;
      const { outputAmount, priceImpact } = this.calculateOutputAmount(
        directPool,
        inputAmount,
        isAToB
      );

      return {
        pools: [directPool],
        inputAmount,
        outputAmount,
        priceImpact,
        path: [inputToken, outputToken],
      };
    }

    // Multi-hop routes (through IOTA as intermediary)
    const iotaType = SUPPORTED_COINS.IOTA.type;
    if (inputToken !== iotaType && outputToken !== iotaType) {
      const pool1 = await this.findPoolsForPair(inputToken, iotaType, network);
      const pool2 = await this.findPoolsForPair(iotaType, outputToken, network);

      if (pool1 && pool2) {
        // Calculate first swap
        const isAToB1 = pool1.coinTypeA === inputToken;
        const result1 = this.calculateOutputAmount(
          pool1,
          inputAmount,
          isAToB1
        );

        // Calculate second swap
        const isAToB2 = pool2.coinTypeA === iotaType;
        const result2 = this.calculateOutputAmount(
          pool2,
          result1.outputAmount,
          isAToB2
        );

        // Combined price impact (multiplicative, not additive)
        const combinedPriceImpact = result1.priceImpact + result2.priceImpact + 
          (result1.priceImpact * result2.priceImpact) / 100;

        return {
          pools: [pool1, pool2],
          inputAmount,
          outputAmount: result2.outputAmount,
          priceImpact: combinedPriceImpact,
          path: [inputToken, iotaType, outputToken],
        };
      }
    }

    return null;
  }
}