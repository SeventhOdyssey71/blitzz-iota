'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { parseTokenAmount } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';
import { PoolDiscovery } from '@/lib/services/pool-discovery';
import { PoolTracker } from '@/lib/services/pool-tracker';

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

export function useAddLiquidity() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isAdding, setIsAdding] = useState(false);

  const addLiquidity = async (params: AddLiquidityParams) => {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsAdding(true);

      // Parse amounts
      const amountA = parseTokenAmount(params.amountA, params.tokenA.decimals);
      const amountB = parseTokenAmount(params.amountB, params.tokenB.decimals);
      
      // Check if pool exists
      const pool = await PoolDiscovery.findPoolsForPair(
        params.tokenA.type,
        params.tokenB.type,
        'testnet'
      );

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

      // Get coins for token A
      const coinsA = await client.getCoins({
        owner: currentAccount.address,
        coinType: params.tokenA.type,
      });

      if (!coinsA.data || coinsA.data.length === 0) {
        throw new Error(`Insufficient ${params.tokenA.symbol} balance`);
      }

      // Get coins for token B
      const coinsB = await client.getCoins({
        owner: currentAccount.address,
        coinType: params.tokenB.type,
      });

      if (!coinsB.data || coinsB.data.length === 0) {
        throw new Error(`Insufficient ${params.tokenB.symbol} balance`);
      }

      // Calculate total balances
      const totalBalanceA = coinsA.data.reduce((sum, coin) => {
        return sum + BigInt(coin.balance);
      }, BigInt(0));

      const totalBalanceB = coinsB.data.reduce((sum, coin) => {
        return sum + BigInt(coin.balance);
      }, BigInt(0));

      if (totalBalanceA < amountA) {
        throw new Error(`Insufficient ${params.tokenA.symbol} balance`);
      }

      if (totalBalanceB < amountB) {
        throw new Error(`Insufficient ${params.tokenB.symbol} balance`);
      }

      // Prepare coin A
      let coinA;
      
      // For IOTA, ensure we keep some for gas
      if (params.tokenA.type === SUPPORTED_COINS.IOTA.type) {
        const MIN_GAS_AMOUNT = BigInt(150000000); // 0.15 IOTA for gas (increased for safety)
        if (totalBalanceA <= amountA + MIN_GAS_AMOUNT) {
          throw new Error(`Insufficient IOTA balance. Need to keep at least 0.15 IOTA for gas fees.`);
        }
        
        // Sort coins by balance to use larger coins first
        const sortedCoinsA = [...coinsA.data].sort((a, b) => 
          Number(BigInt(b.balance) - BigInt(a.balance))
        );
        
        // Use the largest coin
        const coinRef = tx.object(sortedCoinsA[0].coinObjectId);
        [coinA] = tx.splitCoins(coinRef, [tx.pure.u64(amountA)]);
      } else {
        const coinRefsA = coinsA.data.map(coin => tx.object(coin.coinObjectId));
        
        // Merge coins if needed
        if (coinRefsA.length > 1) {
          const [primaryCoin, ...otherCoins] = coinRefsA;
          tx.mergeCoins(primaryCoin, otherCoins);
        }
        
        // Split exact amount
        [coinA] = tx.splitCoins(coinRefsA[0], [tx.pure.u64(amountA)]);
      }

      // Prepare coin B
      let coinB;
      const coinRefsB = coinsB.data.map(coin => tx.object(coin.coinObjectId));
      
      if (coinRefsB.length > 1) {
        const [primaryCoin, ...otherCoins] = coinRefsB;
        tx.mergeCoins(primaryCoin, otherCoins);
      }
      
      // Split exact amount
      [coinB] = tx.splitCoins(coinRefsB[0], [tx.pure.u64(amountB)]);

      if (pool) {
        // Add liquidity to existing pool
        tx.moveCall({
          target: `${packageId}::simple_dex::add_liquidity`,
          typeArguments: [params.tokenA.type, params.tokenB.type],
          arguments: [
            tx.object(pool.poolId),
            coinA,
            coinB,
            tx.pure.u64(0), // min LP amount (0 for now)
          ],
        });
      } else {
        // Create new pool
        tx.moveCall({
          target: `${packageId}::simple_dex::create_pool`,
          typeArguments: [params.tokenA.type, params.tokenB.type],
          arguments: [
            coinA,
            coinB,
          ],
        });
      }

      console.log('Add liquidity transaction ready:', {
        tokenA: params.tokenA.symbol,
        tokenB: params.tokenB.symbol,
        amountA: amountA.toString(),
        amountB: amountB.toString(),
        poolExists: !!pool,
        packageId,
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
              showInput: true,
            },
            requestType: 'WaitForLocalExecution',
          },
          {
            onSuccess: (result) => {
              console.log('Liquidity added successfully:', result);
              
              // If this was a pool creation, track the pool ID
              if (!pool && result.objectChanges) {
                const createdPool = result.objectChanges.find(
                  change => change.type === 'created' && 
                  change.objectType.includes('::simple_dex::Pool')
                );
                
                if (createdPool) {
                  console.log('Pool created with ID:', createdPool.objectId);
                  PoolTracker.addPool(createdPool.objectId, params.tokenA.type, params.tokenB.type);
                }
              }
              
              toast.success('Liquidity added successfully!', {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });
              resolve({
                success: true,
                digest: result.digest,
              });
            },
            onError: (error) => {
              console.error('Failed to add liquidity:', error);
              
              // Check for specific error types
              const errorMessage = error?.message || error?.toString() || 'Unknown error';
              
              if (errorMessage.includes('InsufficientGas') || errorMessage.includes('no valid gas')) {
                toast.error('Insufficient gas', {
                  description: 'Please ensure you have enough IOTA for gas fees (at least 0.15 IOTA)',
                });
              } else if (errorMessage.includes('InsufficientBalance')) {
                toast.error('Insufficient balance', {
                  description: 'Please check your token balances',
                });
              } else {
                toast.error('Transaction failed', {
                  description: errorMessage,
                });
              }
              
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      console.error('Add liquidity error:', error);
      toast.error('Failed to add liquidity', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setIsAdding(false);
    }
  };

  return {
    addLiquidity,
    isAdding,
  };
}