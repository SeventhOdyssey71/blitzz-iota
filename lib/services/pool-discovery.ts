import { getIotaClient } from '@/lib/iota/client';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';

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

export class PoolDiscovery {
  static async findPoolsForPair(
    coinTypeA: string,
    coinTypeB: string,
    network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'
  ): Promise<PoolInfo | null> {
    const client = getIotaClient();
    const packageId = blitz_PACKAGE_ID[network];

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
    const client = getIotaClient();
    const packageId = blitz_PACKAGE_ID[network];
    const pools: PoolInfo[] = [];

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
    // Direct route
    const directPool = await this.findPoolsForPair(inputToken, outputToken, network);
    
    if (directPool) {
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