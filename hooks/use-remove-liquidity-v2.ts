'use client';

import { useState, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { toast } from 'sonner';
import { IOTA_CONFIG } from '@/config/iota.config';
import { PoolService } from '@/lib/services/pool-service';

interface RemoveLiquidityParams {
  lpTokenId: string;
  coinTypeA: string;
  coinTypeB: string;
  amount: string;
}

interface RemoveLiquidityResult {
  success: boolean;
  digest?: string;
  error?: string;
}

export function useRemoveLiquidityV2() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isRemoving, setIsRemoving] = useState(false);

  const removeLiquidity = useCallback(async (params: RemoveLiquidityParams): Promise<RemoveLiquidityResult> => {
    if (!currentAccount?.address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsRemoving(true);

    try {
      // Find the pool for this LP token pair
      const pool = await PoolService.findPool(
        params.coinTypeA,
        params.coinTypeB,
      );

      if (!pool?.poolId) {
        throw new Error('Pool not found for this LP token');
      }

      if (pool.reserveA === 0n || pool.reserveB === 0n) {
        throw new Error('Pool has no liquidity to remove');
      }

      // Build transaction
      const tx = new Transaction();
      const packageId = IOTA_CONFIG.packages.core;

      // Ensure coin types match pool order
      const typeArguments = [pool.coinTypeA, pool.coinTypeB];

      // Remove liquidity
      tx.moveCall({
        target: `${packageId}::simple_dex::remove_liquidity`,
        typeArguments,
        arguments: [
          tx.object(pool.poolId),
          tx.object(params.lpTokenId),
          tx.pure.u64(0n), // min_a (0 for now)
          tx.pure.u64(0n), // min_b (0 for now)
        ],
      });

      tx.setGasBudget(100000000); // 0.1 IOTA

      // Execute transaction
      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
              showBalanceChanges: true,
            },
          },
          {
            onSuccess: (result) => {
              const status = (result.effects as any)?.status?.status || (result.effects as any)?.status;
              if (status === 'failure' || status === 'failed') {
                const errorMsg = (result.effects as any)?.status?.error || 'Transaction failed';
                toast.error('Remove liquidity failed', { description: errorMsg });
                resolve({ success: false, error: errorMsg });
                return;
              }

              // Refresh pool cache
              setTimeout(() => {
                window.dispatchEvent(new Event('pool-cache-refresh'));
              }, 1000);

              toast.success('Liquidity removed successfully!', {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });

              resolve({
                success: true,
                digest: result.digest,
              });
            },
            onError: (error) => {
              const errorMessage = error?.message || 'Transaction failed';
              let description = errorMessage;

              if (errorMessage.includes('InsufficientGas')) {
                description = 'Insufficient gas. Need at least 0.1 IOTA for fees';
              } else if (errorMessage.includes('LP token not found')) {
                description = 'LP token not found or already used';
              }

              toast.error('Remove liquidity failed', { description });
              resolve({ success: false, error: errorMessage });
            },
          }
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Remove liquidity failed', { description: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsRemoving(false);
    }
  }, [currentAccount, signAndExecuteTransaction, client]);

  return {
    removeLiquidity,
    isRemoving,
  };
}