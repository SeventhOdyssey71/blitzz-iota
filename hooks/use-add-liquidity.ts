'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { parseTokenAmount, formatBalance } from '@/lib/utils/format';
import { toast } from 'sonner';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';
import { PoolDiscovery } from '@/lib/services/pool-discovery';
import { PoolTracker } from '@/lib/services/pool-tracker';
import { mapLPTokenToPool } from '@/lib/services/lp-pool-mapper';

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
      
      console.log('Pool discovery result:', {
        found: !!pool,
        poolId: pool?.poolId,
        coinTypeA: pool?.coinTypeA,
        coinTypeB: pool?.coinTypeB,
        inputTypeA: params.tokenA.type,
        inputTypeB: params.tokenB.type,
        typesMatch: pool ? (pool.coinTypeA === params.tokenA.type && pool.coinTypeB === params.tokenB.type) : 'N/A',
      });

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

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
      
      console.log('Coins fetched:', {
        tokenA: params.tokenA.symbol,
        coinsA: coinsA.data.map(c => ({ id: c.coinObjectId, balance: c.balance })),
        tokenB: params.tokenB.symbol,
        coinsB: coinsB.data.map(c => ({ id: c.coinObjectId, balance: c.balance })),
      });

      if (!coinsA.data || coinsA.data.length === 0) {
        throw new Error(`Insufficient ${params.tokenA.symbol} balance`);
      }

      if (!coinsB.data || coinsB.data.length === 0) {
        throw new Error(`Insufficient ${params.tokenB.symbol} balance`);
      }

      // Calculate total balances
      const totalBalanceA = coinsA.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      const totalBalanceB = coinsB.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));

      // Validate balances
      if (totalBalanceA < amountA) {
        throw new Error(`Insufficient ${params.tokenA.symbol} balance`);
      }

      if (totalBalanceB < amountB) {
        throw new Error(`Insufficient ${params.tokenB.symbol} balance`);
      }

      // For IOTA, ensure we have enough for gas
      if (params.tokenA.type === SUPPORTED_COINS.IOTA.type) {
        const MIN_GAS_AMOUNT = BigInt(200000000); // 0.2 IOTA for gas
        if (totalBalanceA < amountA + MIN_GAS_AMOUNT) {
          throw new Error(`Insufficient IOTA balance. Need at least ${formatBalance((amountA + MIN_GAS_AMOUNT).toString(), 9, 4)} IOTA (including gas)`);
        }
      }

      // Prepare coins using the transaction's gas coin
      let coinA, coinB;

      // For token A
      if (params.tokenA.type === SUPPORTED_COINS.IOTA.type) {
        // Special handling for IOTA to preserve gas
        // Use tx.gas to access the gas coin, then split from it
        [coinA] = tx.splitCoins(tx.gas, [amountA]);
      } else {
        // For non-IOTA tokens, always split to ensure consistent type
        const coinRefsA = coinsA.data.map(coin => tx.object(coin.coinObjectId));
        if (coinRefsA.length > 1) {
          tx.mergeCoins(coinRefsA[0], coinRefsA.slice(1));
        }
        [coinA] = tx.splitCoins(coinRefsA[0], [amountA]);
      }

      // For token B
      if (params.tokenB.type === SUPPORTED_COINS.IOTA.type) {
        // This should rarely happen, but handle it
        [coinB] = tx.splitCoins(tx.gas, [amountB]);
      } else {
        // For non-IOTA tokens, always split to ensure consistent type
        const coinRefsB = coinsB.data.map(coin => tx.object(coin.coinObjectId));
        if (coinRefsB.length > 1) {
          tx.mergeCoins(coinRefsB[0], coinRefsB.slice(1));
        }
        [coinB] = tx.splitCoins(coinRefsB[0], [amountB]);
      }

      // Add the appropriate move call
      if (pool) {
        // Add liquidity to existing pool
        // Use the pool's actual coin types to ensure proper ordering
        const typeArguments = [pool.coinTypeA, pool.coinTypeB];
        
        // Reorder coins if needed to match pool's type order
        let orderedCoinA = coinA;
        let orderedCoinB = coinB;
        
        if (pool.coinTypeA !== params.tokenA.type) {
          // Need to swap the coins to match pool's type order
          orderedCoinA = coinB;
          orderedCoinB = coinA;
        }
        
        tx.moveCall({
          target: `${packageId}::simple_dex::add_liquidity`,
          typeArguments: typeArguments,
          arguments: [
            tx.object(pool.poolId),
            orderedCoinA,
            orderedCoinB,
            tx.pure.u64(0n), // min LP amount (0 for now)
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

      // Set gas budget
      tx.setGasBudget(100000000); // 0.1 IOTA
      
      console.log('Add liquidity transaction ready:', {
        tokenA: params.tokenA.symbol,
        tokenB: params.tokenB.symbol,
        tokenAType: params.tokenA.type,
        tokenBType: params.tokenB.type,
        amountA: amountA.toString(),
        amountB: amountB.toString(),
        poolExists: !!pool,
        packageId,
        typeArguments: pool ? [pool.coinTypeA, pool.coinTypeB] : [params.tokenA.type, params.tokenB.type],
        coinA,
        coinB,
        orderedCoinA: pool ? (pool.coinTypeA !== params.tokenA.type ? 'coinB' : 'coinA') : 'N/A',
        orderedCoinB: pool ? (pool.coinTypeA !== params.tokenA.type ? 'coinA' : 'coinB') : 'N/A',
      });

      // Log transaction details before execution
      console.log('Transaction built, checking details:');
      console.log('Gas budget set:', tx.blockData.gasConfig);
      
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
              showBalanceChanges: true,
              showRawInput: true,
            },
            requestType: 'WaitForLocalExecution',
          },
          {
            onSuccess: (result) => {
              console.log('Liquidity added successfully:', result);
              
              // Check transaction effects
              if (result.effects?.status?.status) {
                console.log('Transaction status:', result.effects.status.status);
                if (result.effects.status.status !== 'success') {
                  console.error('Transaction failed with status:', result.effects.status);
                }
              }
              
              // Log balance changes
              if (result.balanceChanges) {
                console.log('Balance changes:', result.balanceChanges);
              }
              
              // Log effects status
              if (result.effects) {
                console.log('Transaction effects:', {
                  status: result.effects.status,
                  gasUsed: result.effects.gasUsed,
                  created: result.effects.created?.length || 0,
                  mutated: result.effects.mutated?.length || 0,
                });
              }
              
              // Track pool and LP token mappings
              let poolId = pool?.poolId;
              
              // If this was a pool creation, track the pool ID
              if (!pool && result.objectChanges) {
                const createdPool = result.objectChanges.find(
                  change => change.type === 'created' && 
                  change.objectType.includes('::simple_dex::Pool')
                );
                
                if (createdPool) {
                  poolId = createdPool.objectId;
                  console.log('Pool created with ID:', poolId);
                  PoolTracker.addPool(poolId, params.tokenA.type, params.tokenB.type);
                }
              }
              
              // Map LP tokens to pool
              if (poolId && result.objectChanges) {
                const createdLPTokens = result.objectChanges.filter(
                  change => change.type === 'created' && 
                  change.objectType.includes('::simple_dex::LPToken')
                );
                
                createdLPTokens.forEach(lpToken => {
                  console.log('Mapping LP token to pool:', lpToken.objectId, poolId);
                  mapLPTokenToPool(lpToken.objectId, poolId);
                });
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
                  description: 'Please ensure you have enough IOTA for gas fees (at least 0.2 IOTA)',
                });
              } else if (errorMessage.includes('InsufficientBalance')) {
                toast.error('Insufficient balance', {
                  description: 'Please check your token balances',
                });
              } else if (errorMessage.includes('dry run')) {
                toast.error('Transaction simulation failed', {
                  description: 'Please check your balances and try again',
                });
              } else {
                toast.error('Transaction failed', {
                  description: errorMessage.slice(0, 200),
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