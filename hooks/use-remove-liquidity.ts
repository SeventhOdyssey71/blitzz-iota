'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { toast } from 'sonner';
import { blitz_PACKAGE_ID } from '@/config/iota.config';
import { PoolDiscovery } from '@/lib/services/pool-discovery';

interface RemoveLiquidityParams {
  tokenA: {
    type: string;
    decimals: number;
    symbol: string;
  };
  tokenB: {
    type: string;
    decimals: number;
    symbol: string;
  };
  lpTokenId: string;
  lpAmount: string;
  minAmountA?: string;
  minAmountB?: string;
}

interface RemoveLiquidityResult {
  success: boolean;
  digest?: string;
  error?: string;
}

export function useRemoveLiquidity() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isRemoving, setIsRemoving] = useState(false);

  const removeLiquidity = async (params: RemoveLiquidityParams): Promise<RemoveLiquidityResult> => {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsRemoving(true);
      console.log('Removing liquidity:', params);

      // Find the pool
      const pool = await PoolDiscovery.findPoolsForPair(
        params.tokenA.type,
        params.tokenB.type,
        'testnet'
      );

      if (!pool) {
        throw new Error(`No pool found for ${params.tokenA.symbol}/${params.tokenB.symbol}`);
      }

      // Get LP token object
      const lpTokenObject = await client.getObject({
        id: params.lpTokenId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!lpTokenObject.data) {
        throw new Error('LP token not found');
      }

      // Calculate expected outputs based on pool reserves
      const lpAmount = BigInt(params.lpAmount);
      const totalLpSupply = pool.lpSupply;
      const reserveA = pool.reserveA;
      const reserveB = pool.reserveB;

      // Calculate proportional amounts
      const expectedAmountA = (lpAmount * reserveA) / totalLpSupply;
      const expectedAmountB = (lpAmount * reserveB) / totalLpSupply;

      console.log('Expected returns:', {
        amountA: expectedAmountA.toString(),
        amountB: expectedAmountB.toString(),
        lpAmount: lpAmount.toString(),
        totalLpSupply: totalLpSupply.toString(),
      });

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

      // Call remove_liquidity function
      tx.moveCall({
        target: `${packageId}::simple_dex::remove_liquidity`,
        typeArguments: [params.tokenA.type, params.tokenB.type],
        arguments: [
          tx.object(pool.poolId),
          tx.object(params.lpTokenId),
          tx.pure.u64(params.minAmountA || '0'),
          tx.pure.u64(params.minAmountB || '0'),
        ],
      });

      // Execute transaction
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
            },
            requestType: 'WaitForLocalExecution',
          },
          {
            onSuccess: (result) => {
              console.log('Liquidity removed successfully:', result);
              
              // Show success message with amounts
              const amountAFormatted = (Number(expectedAmountA) / Math.pow(10, params.tokenA.decimals)).toFixed(2);
              const amountBFormatted = (Number(expectedAmountB) / Math.pow(10, params.tokenB.decimals)).toFixed(2);
              
              toast.success('Liquidity removed successfully!', {
                description: `Received ${amountAFormatted} ${params.tokenA.symbol} and ${amountBFormatted} ${params.tokenB.symbol}`,
              });
              
              resolve({
                success: true,
                digest: result.digest,
              });
            },
            onError: (error) => {
              console.error('Failed to remove liquidity:', error);
              
              const errorMessage = error?.message || error?.toString() || 'Unknown error';
              
              if (errorMessage.includes('InsufficientGas')) {
                toast.error('Insufficient gas for transaction');
              } else if (errorMessage.includes('slippage')) {
                toast.error('Slippage tolerance exceeded');
              } else {
                toast.error('Failed to remove liquidity', {
                  description: errorMessage.slice(0, 100),
                });
              }
              
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      console.error('Remove liquidity error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to remove liquidity';
      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsRemoving(false);
    }
  };

  return { removeLiquidity, isRemoving };
}