import { Transaction } from '@iota/iota-sdk/transactions';
import { IOTA_CONFIG } from '@/config/iota.config';

export class TransactionBuilder {
  static createSwapTransaction(params: {
    poolId: string;
    coinTypeA: string;
    coinTypeB: string;
    amountIn: bigint;
    minAmountOut: bigint;
    isAToB: boolean;
  }) {
    const tx = new Transaction();
    const packageId = IOTA_CONFIG.packages.core;

    // For demo purposes, we'll create a simple transfer
    // In production, this would call the actual swap function
    if (params.isAToB) {
      // Split coins for the exact amount
      const [coinToSwap] = tx.splitCoins(tx.gas, [params.amountIn]);
      
      // In production, this would be:
      // tx.moveCall({
      //   target: `${packageId}::dex::swap_a_to_b`,
      //   typeArguments: [params.coinTypeA, params.coinTypeB],
      //   arguments: [
      //     tx.object(params.poolId),
      //     coinToSwap,
      //     tx.pure.u64(params.minAmountOut),
      //   ],
      // });

      // For demo, just transfer back to sender
      // Note: tx.sender is not available, we'll use a placeholder
      tx.transferObjects([coinToSwap], tx.pure.address('0x0'));
    }

    return tx;
  }

  static createAddLiquidityTransaction(params: {
    poolId: string;
    coinTypeA: string;
    coinTypeB: string;
    amountA: bigint;
    amountB: bigint;
  }) {
    const tx = new Transaction();
    const packageId = IOTA_CONFIG.packages.core;

    // Split coins for liquidity
    const [coinA] = tx.splitCoins(tx.gas, [params.amountA]);
    const [coinB] = tx.splitCoins(tx.gas, [params.amountB]);

    // In production:
    // tx.moveCall({
    //   target: `${packageId}::dex::add_liquidity`,
    //   typeArguments: [params.coinTypeA, params.coinTypeB],
    //   arguments: [
    //     tx.object(params.poolId),
    //     coinA,
    //     coinB,
    //   ],
    // });

    return tx;
  }

  static createPoolTransaction(params: {
    coinTypeA: string;
    coinTypeB: string;
    amountA: bigint;
    amountB: bigint;
    feePercentage: number;
  }) {
    const tx = new Transaction();
    const packageId = IOTA_CONFIG.packages.core;

    // Split coins for initial liquidity
    const [coinA] = tx.splitCoins(tx.gas, [params.amountA]);
    const [coinB] = tx.splitCoins(tx.gas, [params.amountB]);

    // In production:
    // tx.moveCall({
    //   target: `${packageId}::dex::create_pool`,
    //   typeArguments: [params.coinTypeA, params.coinTypeB],
    //   arguments: [
    //     coinA,
    //     coinB,
    //     tx.pure.u64(params.feePercentage),
    //   ],
    // });

    return tx;
  }
}