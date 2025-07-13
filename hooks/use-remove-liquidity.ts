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
      console.log('Looking for pool with types:', {
        tokenA: params.tokenA.type,
        tokenB: params.tokenB.type
      });
      
      let pool = await PoolDiscovery.findPoolsForPair(
        params.tokenA.type,
        params.tokenB.type,
        'testnet'
      );

      console.log('Pool discovery result:', pool);

      if (!pool) {
        // Try reverse order
        console.log('Trying reverse order...');
        pool = await PoolDiscovery.findPoolsForPair(
          params.tokenB.type,
          params.tokenA.type,
          'testnet'
        );
        
        if (pool) {
          console.log('Found pool in reverse order:', pool);
        } else {
          throw new Error(`No pool found for ${params.tokenA.symbol}/${params.tokenB.symbol}. Please make sure the pool exists.`);
        }
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
      
      console.log('LP Token object:', {
        id: lpTokenObject.data.objectId,
        type: lpTokenObject.data.type,
        content: lpTokenObject.data.content,
      });
      
      // Extract type parameters from LP token to ensure exact match
      const lpTokenType = lpTokenObject.data.type || '';
      const typeMatch = lpTokenType.match(/<(.+),\s*(.+)>/);
      if (!typeMatch) {
        throw new Error('Invalid LP token type format');
      }
      
      const lpCoinTypeA = typeMatch[1].trim();
      const lpCoinTypeB = typeMatch[2].trim();

      // Calculate expected outputs based on pool reserves
      const lpAmount = BigInt(params.lpAmount);
      const totalLpSupply = pool.lpSupply;
      const reserveA = pool.reserveA;
      const reserveB = pool.reserveB;

      // Overflow is now handled in the smart contract

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
      
      // Set gas budget to avoid dry run issues
      tx.setGasBudget(100000000); // 0.1 IOTA

      // Use the exact type parameters from the LP token
      // This ensures perfect type matching with the Move function
      const typeArgs: [string, string] = [lpCoinTypeA, lpCoinTypeB];
      
      console.log('Remove liquidity call:', {
        target: `${packageId}::simple_dex::remove_liquidity`,
        typeArgs,
        poolId: pool.poolId,
        lpTokenId: params.lpTokenId,
      });
      
      // The remove_liquidity function expects the LP token object to be passed directly,
      // not just its ID. We need to pass it as an owned object.
      tx.moveCall({
        target: `${packageId}::simple_dex::remove_liquidity`,
        typeArguments: typeArgs,
        arguments: [
          tx.object(pool.poolId),
          tx.object(params.lpTokenId), // This will be consumed by the function
          tx.pure.u64(params.minAmountA || '0'),
          tx.pure.u64(params.minAmountB || '0'),
        ],
      });

      // Execute transaction without dry run
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
              showRawEffects: true,
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
              } else if (errorMessage.includes('Dry run failed')) {
                toast.error('Transaction failed', {
                  description: 'Please try again. If the issue persists, check your LP token balance.',
                });
              } else {
                toast.error('Failed to remove liquidity', {
                  description: errorMessage.slice(0, 100),
                });
              }
              
              resolve({ success: false, error: errorMessage });
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