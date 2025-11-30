'use client';

import { Transaction } from '@iota/iota-sdk/transactions';
import { IotaClient } from '@iota/iota-sdk/client';
import { IOTA_CONFIG } from '@/config/iota.config';

export interface PoolInfo {
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
  reserveA: string;
  reserveB: string;
  lpSupply: string;
  feeNumerator: number;
  feeDenominator: number;
}

export class AMMContract {
  static async createPool(
    tx: Transaction,
    coinA: any,
    coinB: any,
    coinTypeA: string,
    coinTypeB: string
  ) {
    const packageId = IOTA_CONFIG.packages.core;
    
    // Create pool through factory
    tx.moveCall({
      target: `${packageId}::simple_dex::create_pool`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: [
        coinA,
        coinB,
      ],
    });
  }

  static async addLiquidity(
    tx: Transaction,
    poolId: string,
    coinA: any,
    coinB: any,
    minLpAmount: bigint,
    coinTypeA: string,
    coinTypeB: string
  ) {
    const packageId = IOTA_CONFIG.packages.core;
    
    tx.moveCall({
      target: `${packageId}::simple_dex::add_liquidity`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: [
        tx.object(poolId),
        coinA,
        coinB,
        tx.pure.u64(minLpAmount),
      ],
    });
  }

  static async swapAToB(
    tx: Transaction,
    poolId: string,
    coinA: any,
    minAmountOut: bigint,
    coinTypeA: string,
    coinTypeB: string
  ) {
    const packageId = IOTA_CONFIG.packages.core;
    
    tx.moveCall({
      target: `${packageId}::simple_dex::swap_a_to_b`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: [
        tx.object(poolId),
        coinA,
        tx.pure.u64(minAmountOut),
      ],
    });
  }

  static async swapBToA(
    tx: Transaction,
    poolId: string,
    coinB: any,
    minAmountOut: bigint,
    coinTypeA: string,
    coinTypeB: string
  ) {
    const packageId = IOTA_CONFIG.packages.core;
    
    tx.moveCall({
      target: `${packageId}::simple_dex::swap_b_to_a`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: [
        tx.object(poolId),
        coinB,
        tx.pure.u64(minAmountOut),
      ],
    });
  }

  static async removeLiquidity(
    tx: Transaction,
    poolId: string,
    lpCoin: any,
    minAmountA: bigint,
    minAmountB: bigint,
    coinTypeA: string,
    coinTypeB: string
  ) {
    const packageId = IOTA_CONFIG.packages.core;
    
    tx.moveCall({
      target: `${packageId}::simple_dex::remove_liquidity`,
      typeArguments: [coinTypeA, coinTypeB],
      arguments: [
        tx.object(poolId),
        lpCoin,
        tx.pure.u64(minAmountA),
        tx.pure.u64(minAmountB),
      ],
    });
  }

  static async getPoolInfo(
    client: IotaClient,
    poolId: string
  ): Promise<PoolInfo | null> {
    try {
      const pool = await client.getObject({
        id: poolId,
        options: {
          showContent: true,
        },
      });

      if (!pool.data || !pool.data.content || pool.data.content.dataType !== 'moveObject') {
        return null;
      }

      const fields = pool.data.content.fields as any;
      
      return {
        poolId,
        coinTypeA: fields.coin_a_type || '',
        coinTypeB: fields.coin_b_type || '',
        reserveA: fields.reserve_a || '0',
        reserveB: fields.reserve_b || '0',
        lpSupply: fields.lp_supply || '0',
        feeNumerator: fields.fee_numerator || 30,
        feeDenominator: fields.fee_denominator || 10000,
      };
    } catch (error) {
      console.error('Failed to get pool info:', error);
      return null;
    }
  }

  static calculateOutputAmount(
    inputAmount: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeNumerator: number = 30,
    feeDenominator: number = 10000
  ): bigint {
    const amountInWithFee = inputAmount * BigInt(feeDenominator - feeNumerator) / BigInt(feeDenominator);
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn + amountInWithFee;
    return numerator / denominator;
  }

  static calculateInputAmount(
    outputAmount: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeNumerator: number = 30,
    feeDenominator: number = 10000
  ): bigint {
    const numerator = reserveIn * outputAmount * BigInt(feeDenominator);
    const denominator = (reserveOut - outputAmount) * BigInt(feeDenominator - feeNumerator);
    return (numerator / denominator) + BigInt(1);
  }

  static calculatePriceImpact(
    inputAmount: bigint,
    outputAmount: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): number {
    const exactQuote = (inputAmount * reserveOut) / reserveIn;
    const slippage = Number(exactQuote - outputAmount) / Number(exactQuote);
    return slippage * 100;
  }

  static calculateLPTokensToMint(
    amountA: bigint,
    amountB: bigint,
    reserveA: bigint,
    reserveB: bigint,
    totalSupply: bigint
  ): bigint {
    if (totalSupply === BigInt(0)) {
      // For first liquidity provider
      return sqrt(amountA * amountB) - BigInt(1000); // Minimum liquidity
    }

    // For subsequent liquidity providers
    const lpFromA = (amountA * totalSupply) / reserveA;
    const lpFromB = (amountB * totalSupply) / reserveB;
    
    return lpFromA < lpFromB ? lpFromA : lpFromB;
  }
}

// Helper function for square root calculation
function sqrt(value: bigint): bigint {
  if (value < BigInt(0)) {
    throw new Error('Square root of negative numbers is not supported');
  }

  if (value < BigInt(2)) {
    return value;
  }

  function newtonIteration(n: bigint, x0: bigint): bigint {
    const x1 = (n / x0 + x0) / BigInt(2);
    if (x0 === x1 || x0 === x1 - BigInt(1)) {
      return x0;
    }
    return newtonIteration(n, x1);
  }

  return newtonIteration(value, BigInt(1));
}