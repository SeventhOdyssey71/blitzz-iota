'use client';

import { getIotaClientSafe } from '@/lib/iota/client-wrapper';
import { blitz_PACKAGE_ID, SUPPORTED_COINS, STAKING_POOL_ADDRESS, STIOTA_TYPE } from '@/config/iota.config';
import { findMockPool, getAllMockPools } from './mock-pools';

export interface PoolInfo {
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
  reserveA: bigint;
  reserveB: bigint;
  lpSupply: bigint;
  feePercentage: number;
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
const CACHE_DURATION = 30000; // 30 seconds
let lastCacheUpdate = 0;

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
    console.log('Finding pool for pair:', { coinTypeA, coinTypeB });
    const client = getIotaClientSafe();
    
    // Return mock data if client is not available (SSR)
    if (!client) {
      const mockPool = findMockPool(coinTypeA, coinTypeB);
      return mockPool;
    }
    
    // Special handling for IOTA <-> stIOTA staking pool
    const iotaType = SUPPORTED_COINS.IOTA.type;
    const stIotaType = SUPPORTED_COINS.stIOTA.type;
    
    const isStakingPair = (coinTypeA === iotaType && coinTypeB === stIotaType) ||
        (coinTypeA === stIotaType && coinTypeB === iotaType);
    
    console.log('Is staking pair:', isStakingPair, {
      iotaType,
      stIotaType,
      coinTypeA,
      coinTypeB,
      match1: coinTypeA === iotaType && coinTypeB === stIotaType,
      match2: coinTypeA === stIotaType && coinTypeB === iotaType
    });
    
    if (isStakingPair) {
      // Return swap pool data for IOTA <-> stIOTA
      console.log('Returning IOTA/stIOTA swap pool data');
      return {
        poolId: STAKING_POOL_ADDRESS,
        coinTypeA: SUPPORTED_COINS.IOTA.type,
        coinTypeB: SUPPORTED_COINS.stIOTA.type,
        reserveA: BigInt(1000000000000), // Mock 1000 IOTA
        reserveB: BigInt(1000000000000), // Mock 1000 stIOTA
        lpSupply: BigInt(1000000000000),
        feePercentage: 10, // 0.1% fee
      };
    }
    
    const packageId = blitz_PACKAGE_ID[network];

    // Use mock pools if package is not deployed
    if (packageId === '0x0') {
      const mockPool = findMockPool(coinTypeA, coinTypeB);
      if (mockPool) {
        cleanupCache();
        POOL_CACHE.set(`${mockPool.coinTypeA}-${mockPool.coinTypeB}`, mockPool);
        lastCacheUpdate = Date.now();
      }
      return mockPool;
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
      // Query for Pool objects created by our package
      const pools = await client.getOwnedObjects({
        owner: packageId,
        filter: {
          StructType: `${packageId}::dex::Pool<${coinTypeA}, ${coinTypeB}>`,
        },
        options: {
          showContent: true,
        },
      });

      if (pools.data.length > 0) {
        const poolObject = pools.data[0];
        if (poolObject.data?.content?.dataType === 'moveObject') {
          const fields = poolObject.data.content.fields as any;
          
          const poolInfo: PoolInfo = {
            poolId: poolObject.data.objectId,
            coinTypeA,
            coinTypeB,
            reserveA: BigInt(fields.reserve_a || 0),
            reserveB: BigInt(fields.reserve_b || 0),
            lpSupply: BigInt(fields.lp_supply || 0),
            feePercentage: Number(fields.fee_percentage || 30), // 0.3% default
          };

          // Update cache
          POOL_CACHE.set(cacheKey, poolInfo);
          lastCacheUpdate = Date.now();

          return poolInfo;
        }
      }

      // Try reverse order
      const reversePools = await client.getOwnedObjects({
        owner: packageId,
        filter: {
          StructType: `${packageId}::dex::Pool<${coinTypeB}, ${coinTypeA}>`,
        },
        options: {
          showContent: true,
        },
      });

      if (reversePools.data.length > 0) {
        const poolObject = reversePools.data[0];
        if (poolObject.data?.content?.dataType === 'moveObject') {
          const fields = poolObject.data.content.fields as any;
          
          const poolInfo: PoolInfo = {
            poolId: poolObject.data.objectId,
            coinTypeA: coinTypeB,
            coinTypeB: coinTypeA,
            reserveA: BigInt(fields.reserve_b || 0),
            reserveB: BigInt(fields.reserve_a || 0),
            lpSupply: BigInt(fields.lp_supply || 0),
            feePercentage: Number(fields.fee_percentage || 30),
          };

          // Update cache
          POOL_CACHE.set(reverseCacheKey, poolInfo);
          lastCacheUpdate = Date.now();

          return {
            ...poolInfo,
            coinTypeA,
            coinTypeB,
            reserveA: poolInfo.reserveB,
            reserveB: poolInfo.reserveA,
          };
        }
      }
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

    // Use mock pools if package is not deployed or client not available
    if (packageId === '0x0' || !client) {
      return getAllMockPools();
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
  ): { outputAmount: bigint; priceImpact: number } {
    const feeMultiplier = BigInt(10000 - pool.feePercentage);
    const feeDivisor = BigInt(10000);

    let outputAmount: bigint;
    let priceImpact: number;

    // Special handling for staking pool
    if (pool.poolId === STAKING_POOL_ADDRESS) {
      // For staking pool, use simple exchange rate
      const amountAfterFee = (inputAmount * feeMultiplier) / feeDivisor;
      
      if (isAToB) {
        // IOTA -> stIOTA (staking)
        outputAmount = pool.reserveA > 0 ? (amountAfterFee * pool.reserveB) / pool.reserveA : amountAfterFee;
      } else {
        // stIOTA -> IOTA (unstaking)
        outputAmount = pool.reserveB > 0 ? (amountAfterFee * pool.reserveA) / pool.reserveB : amountAfterFee;
      }
      
      // No price impact for staking
      priceImpact = 0;
      
      return { outputAmount, priceImpact };
    }

    if (isAToB) {
      // Swap A to B
      const inputWithFee = inputAmount * feeMultiplier;
      const numerator = inputWithFee * pool.reserveB;
      const denominator = pool.reserveA * feeDivisor + inputWithFee;
      outputAmount = numerator / denominator;

      // Calculate price impact
      const oldPrice = Number(pool.reserveB) / Number(pool.reserveA);
      const newReserveA = pool.reserveA + inputAmount;
      const newReserveB = pool.reserveB - outputAmount;
      const newPrice = Number(newReserveB) / Number(newReserveA);
      priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    } else {
      // Swap B to A
      const inputWithFee = inputAmount * feeMultiplier;
      const numerator = inputWithFee * pool.reserveA;
      const denominator = pool.reserveB * feeDivisor + inputWithFee;
      outputAmount = numerator / denominator;

      // Calculate price impact
      const oldPrice = Number(pool.reserveA) / Number(pool.reserveB);
      const newReserveB = pool.reserveB + inputAmount;
      const newReserveA = pool.reserveA - outputAmount;
      const newPrice = Number(newReserveA) / Number(newReserveB);
      priceImpact = Math.abs((newPrice - oldPrice) / oldPrice) * 100;
    }

    return { outputAmount, priceImpact };
  }

  static async findBestRoute(
    inputToken: string,
    outputToken: string,
    inputAmount: bigint,
    network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'
  ): Promise<SwapRoute | null> {
    console.log('Finding best route:', { inputToken, outputToken, inputAmount: inputAmount.toString() });
    
    // Direct route
    const directPool = await this.findPoolsForPair(inputToken, outputToken, network);
    
    if (directPool) {
      console.log('Direct pool found:', directPool);
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
    } else {
      console.log('No direct pool found');
    }

    // Multi-hop routes (through IOTA as intermediary)
    const iotaType = SUPPORTED_COINS.IOTA.type;
    if (inputToken !== iotaType && outputToken !== iotaType) {
      const pool1 = await this.findPoolsForPair(inputToken, iotaType, network);
      const pool2 = await this.findPoolsForPair(iotaType, outputToken, network);

      if (pool1 && pool2) {
        // Calculate first swap
        const isAToB1 = pool1.coinTypeA === inputToken;
        const { outputAmount: iotaAmount, priceImpact: impact1 } = this.calculateOutputAmount(
          pool1,
          inputAmount,
          isAToB1
        );

        // Calculate second swap
        const isAToB2 = pool2.coinTypeA === iotaType;
        const { outputAmount: finalAmount, priceImpact: impact2 } = this.calculateOutputAmount(
          pool2,
          iotaAmount,
          isAToB2
        );

        return {
          pools: [pool1, pool2],
          inputAmount,
          outputAmount: finalAmount,
          priceImpact: impact1 + impact2, // Simplified calculation
          path: [inputToken, iotaType, outputToken],
        };
      }
    }

    return null;
  }
}