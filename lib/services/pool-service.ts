'use client';

import { getSafeIotaClient } from '@/lib/iota/safe-client';
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

export interface SwapQuote {
  outputAmount: bigint;
  priceImpact: number;
  minimumReceived: bigint;
}

export class PoolService {
  private static pools: Map<string, PoolInfo> = new Map();
  private static lastUpdate = 0;
  private static readonly CACHE_DURATION = 5000; // 5 seconds

  static clearCache() {
    this.pools.clear();
    this.lastUpdate = 0;
  }

  static async findPool(
    coinTypeA: string,
    coinTypeB: string,
    network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'
  ): Promise<PoolInfo | null> {
    const client = getSafeIotaClient();
    const packageId = blitz_PACKAGE_ID[network];

    if (!client || packageId === '0x0') {
      return null;
    }

    // Check cache first
    const cacheKey = `${coinTypeA}-${coinTypeB}`;
    const reverseCacheKey = `${coinTypeB}-${coinTypeA}`;
    
    if (Date.now() - this.lastUpdate < this.CACHE_DURATION) {
      const cached = this.pools.get(cacheKey) || this.pools.get(reverseCacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Search for pools by querying recent transactions
      const txns = await client.queryTransactionBlocks({
        filter: {
          MoveFunction: {
            package: packageId,
            module: 'simple_dex',
            function: 'create_pool'
          }
        },
        order: 'descending',
        limit: 50,
        options: {
          showEffects: true,
          showObjectChanges: true
        }
      });

      for (const tx of txns.data || []) {
        if (tx.objectChanges) {
          const pools = tx.objectChanges.filter(change => 
            change.type === 'created' && 
            change.objectType?.includes('::simple_dex::Pool')
          );
          
          for (const poolChange of pools) {
            const poolId = poolChange.objectId;
            
            try {
              const poolObject = await client.getObject({
                id: poolId,
                options: {
                  showContent: true,
                  showType: true,
                },
              });

              if (poolObject?.data?.content?.dataType === 'moveObject') {
                const fields = poolObject.data.content.fields as any;
                const poolType = poolObject.data.type;
                
                // Extract coin types from the pool type
                const typeMatch = poolType?.match(/Pool<(.+), (.+)>/);
                if (typeMatch) {
                  const poolCoinTypeA = typeMatch[1].trim();
                  const poolCoinTypeB = typeMatch[2].trim();
                  
                  // Check if this matches our requested pair
                  const isMatch = (
                    (poolCoinTypeA === coinTypeA && poolCoinTypeB === coinTypeB) ||
                    (poolCoinTypeA === coinTypeB && poolCoinTypeB === coinTypeA)
                  );

                  if (isMatch) {
                    const poolInfo: PoolInfo = {
                      poolId,
                      coinTypeA: poolCoinTypeA,
                      coinTypeB: poolCoinTypeB,
                      reserveA: BigInt(fields.reserve_a?.fields?.value || fields.reserve_a || '0'),
                      reserveB: BigInt(fields.reserve_b?.fields?.value || fields.reserve_b || '0'),
                      lpSupply: BigInt(fields.lp_supply || 0),
                      feePercentage: 18, // 1.8% from contract
                    };

                    // Cache the pool
                    this.pools.set(`${poolCoinTypeA}-${poolCoinTypeB}`, poolInfo);
                    this.lastUpdate = Date.now();

                    return poolInfo;
                  }
                }
              }
            } catch (err) {
              continue;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error searching for pools:', error);
    }

    return null;
  }

  static calculateSwapQuote(
    pool: PoolInfo,
    inputAmount: bigint,
    isAToB: boolean,
    slippageTolerance: number = 0.5
  ): SwapQuote {
    const FEE_DENOMINATOR = BigInt(1000);
    const FEE_NUMERATOR = BigInt(pool.feePercentage);
    
    const reserveIn = isAToB ? pool.reserveA : pool.reserveB;
    const reserveOut = isAToB ? pool.reserveB : pool.reserveA;
    
    // Calculate fee
    const feeAmount = (inputAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
    const inputAfterFee = inputAmount - feeAmount;
    
    // Calculate output using constant product formula
    const outputAmount = (inputAfterFee * reserveOut) / (reserveIn + inputAfterFee);
    
    // Calculate price impact
    const spotPriceBefore = Number(reserveOut) / Number(reserveIn);
    const executionPrice = Number(outputAmount) / Number(inputAmount);
    const priceImpact = Math.abs((spotPriceBefore - executionPrice) / spotPriceBefore) * 100;
    
    // Calculate minimum received with slippage
    const slippageMultiplier = BigInt(Math.floor((100 - slippageTolerance) * 10));
    const minimumReceived = (outputAmount * slippageMultiplier) / BigInt(1000);
    
    return { outputAmount, priceImpact, minimumReceived };
  }

  static async getAllPools(network: 'mainnet' | 'testnet' | 'devnet' = 'testnet'): Promise<PoolInfo[]> {
    const coinTypes = Object.values(SUPPORTED_COINS).map(coin => coin.type);
    const pools: PoolInfo[] = [];
    
    // Check all possible pairs
    for (let i = 0; i < coinTypes.length; i++) {
      for (let j = i + 1; j < coinTypes.length; j++) {
        const pool = await this.findPool(coinTypes[i], coinTypes[j], network);
        if (pool) {
          pools.push(pool);
        }
      }
    }
    
    return pools;
  }
}