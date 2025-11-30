'use client';

import { useState, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { toast } from 'sonner';
import { parseTokenAmount, formatBalance } from '@/lib/utils/format';
import { IOTA_CONFIG, SUPPORTED_COINS } from '@/config/iota.config';
import { PoolService } from '@/lib/services/pool-service';

interface AddLiquidityParams {
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
  amountA: string;
  amountB: string;
}

interface AddLiquidityResult {
  success: boolean;
  digest?: string;
  error?: string;
  poolId?: string;
}

export function useAddLiquidity() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isLoading, setIsLoading] = useState(false);

  const addLiquidity = useCallback(async (params: AddLiquidityParams): Promise<AddLiquidityResult> => {
    if (!currentAccount?.address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);

    try {
      // Parse amounts to BigInt
      const amountA = parseTokenAmount(params.amountA, params.tokenA.decimals);
      const amountB = parseTokenAmount(params.amountB, params.tokenB.decimals);
      
      // Find existing pool
      const pool = await PoolService.findPool(
        params.tokenA.type,
        params.tokenB.type,
      );

      // Get coins for both tokens
      const [coinsA, coinsB] = await Promise.all([
        client.getCoins({
          owner: currentAccount.address,
          coinType: params.tokenA.type,
        }),
        client.getCoins({
          owner: currentAccount.address,
          coinType: params.tokenB.type,
        })
      ]);

      // Validate balances
      if (!coinsA.data?.length) {
        throw new Error(`No ${params.tokenA.symbol} balance found`);
      }
      if (!coinsB.data?.length) {
        throw new Error(`No ${params.tokenB.symbol} balance found`);
      }

      const totalBalanceA = coinsA.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      const totalBalanceB = coinsB.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);

      if (totalBalanceA < amountA) {
        throw new Error(`Insufficient ${params.tokenA.symbol} balance`);
      }
      if (totalBalanceB < amountB) {
        throw new Error(`Insufficient ${params.tokenB.symbol} balance`);
      }

      // For IOTA, ensure sufficient gas
      const MIN_GAS_AMOUNT = 200000000n; // 0.2 IOTA
      if (params.tokenA.type === SUPPORTED_COINS.IOTA.type && totalBalanceA < amountA + MIN_GAS_AMOUNT) {
        throw new Error(`Need at least ${formatBalance((amountA + MIN_GAS_AMOUNT).toString(), 9, 4)} IOTA (including gas)`);
      }
      if (params.tokenB.type === SUPPORTED_COINS.IOTA.type && totalBalanceB < amountB + MIN_GAS_AMOUNT) {
        throw new Error(`Need at least ${formatBalance((amountB + MIN_GAS_AMOUNT).toString(), 9, 4)} IOTA (including gas)`);
      }

      // Build transaction
      const tx = new Transaction();
      const packageId = IOTA_CONFIG.packages.core;

      // Prepare coins
      let coinA, coinB;

      // Handle token A
      if (params.tokenA.type === SUPPORTED_COINS.IOTA.type) {
        [coinA] = tx.splitCoins(tx.gas, [amountA]);
      } else {
        const coinRefsA = coinsA.data.map(coin => tx.object(coin.coinObjectId));
        if (coinRefsA.length > 1) {
          tx.mergeCoins(coinRefsA[0], coinRefsA.slice(1));
        }
        [coinA] = tx.splitCoins(coinRefsA[0], [amountA]);
      }

      // Handle token B
      if (params.tokenB.type === SUPPORTED_COINS.IOTA.type) {
        [coinB] = tx.splitCoins(tx.gas, [amountB]);
      } else {
        const coinRefsB = coinsB.data.map(coin => tx.object(coin.coinObjectId));
        if (coinRefsB.length > 1) {
          tx.mergeCoins(coinRefsB[0], coinRefsB.slice(1));
        }
        [coinB] = tx.splitCoins(coinRefsB[0], [amountB]);
      }

      // Add move call
      if (pool) {
        // Add liquidity to existing pool
        const typeArguments = [pool.coinTypeA, pool.coinTypeB];
        let orderedCoinA = coinA;
        let orderedCoinB = coinB;
        
        // Reorder coins to match pool's type order
        if (pool.coinTypeA !== params.tokenA.type) {
          orderedCoinA = coinB;
          orderedCoinB = coinA;
        }
        
        tx.moveCall({
          target: `${packageId}::simple_dex::add_liquidity`,
          typeArguments,
          arguments: [
            tx.object(pool.poolId),
            orderedCoinA,
            orderedCoinB,
            tx.pure.u64(0n), // min LP amount
          ],
        });
      } else {
        // Create new pool
        tx.moveCall({
          target: `${packageId}::simple_dex::create_pool`,
          typeArguments: [params.tokenA.type, params.tokenB.type],
          arguments: [coinA, coinB],
        });
      }

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
                toast.error('Add liquidity failed', { description: errorMsg });
                resolve({ success: false, error: errorMsg });
                return;
              }

              // Clear pool cache to refresh with new pool
              let poolId = pool?.poolId;
              if (!pool && (result as any).objectChanges) {
                const createdPool = (result as any).objectChanges.find(
                  (change: any) => change.type === 'created' && 
                  change.objectType?.includes('::simple_dex::Pool')
                );
                
                if (createdPool && createdPool.objectId) {
                  poolId = createdPool.objectId;
                }
              }

              // Clear pool cache to refresh with new data
              PoolService.clearCache();

              toast.success('Liquidity added successfully!', {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });

              resolve({
                success: true,
                digest: result.digest,
                poolId,
              });
            },
            onError: (error) => {
              const errorMessage = error?.message || 'Transaction failed';
              let description = errorMessage;

              if (errorMessage.includes('InsufficientGas')) {
                description = 'Insufficient gas. Need at least 0.2 IOTA for fees';
              } else if (errorMessage.includes('InsufficientBalance')) {
                description = 'Insufficient token balance';
              }

              toast.error('Add liquidity failed', { description });
              resolve({ success: false, error: errorMessage });
            },
          }
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Add liquidity failed', { description: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecuteTransaction, client]);

  return {
    addLiquidity,
    isLoading,
  };
}