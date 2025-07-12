'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { parseTokenAmount } from '@/lib/utils/format';
import { toast } from 'sonner';
import { PoolDiscovery } from '@/lib/services/pool-discovery';
import { Transaction } from '@iota/iota-sdk/transactions';
import { CoinStruct } from '@iota/iota-sdk/client';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';
import { AMMContract } from '@/lib/contracts/amm-contract';

interface SwapParams {
  inputToken: {
    type: string;
    decimals: number;
    symbol: string;
  };
  outputToken: {
    type: string;
    decimals: number;
    symbol: string;
  };
  inputAmount: string;
  minOutputAmount: string;
  slippage: number;
}

export function useSimpleSwap() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isSwapping, setIsSwapping] = useState(false);

  const executeSwap = async (params: SwapParams) => {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsSwapping(true);

      // Parse amounts
      const inputAmount = parseTokenAmount(params.inputAmount, params.inputToken.decimals);
      const minOutputAmount = parseTokenAmount(params.minOutputAmount, params.outputToken.decimals);
      
      // Find best route for swap
      const route = await PoolDiscovery.findBestRoute(
        params.inputToken.type,
        params.outputToken.type,
        inputAmount,
        'testnet'
      );

      if (!route || !route.pools[0]) {
        console.error('Failed to find route:', {
          inputToken: params.inputToken.type,
          outputToken: params.outputToken.type,
          inputAmount: inputAmount.toString()
        });
        throw new Error(`No liquidity pool found for ${params.inputToken.symbol} → ${params.outputToken.symbol}. Please add liquidity first.`);
      }

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

      // All swaps use the regular pool mechanism
      if (route.pools.length === 1) {
        // Direct swap via DEX
        const pool = route.pools[0];
        const isAToB = pool.coinTypeA === params.inputToken.type;
        
        console.log('Swap details:', {
          pool,
          isAToB,
          packageId,
          inputType: params.inputToken.type,
          outputType: params.outputToken.type,
        });
        
        // Get coins to swap
        const coins = await client.getCoins({
          owner: currentAccount.address,
          coinType: params.inputToken.type,
        });

        if (!coins.data || coins.data.length === 0) {
          throw new Error('Insufficient balance');
        }

        // Calculate total balance
        const totalBalance = coins.data.reduce((sum, coin) => {
          return sum + BigInt(coin.balance);
        }, BigInt(0));

        if (totalBalance < inputAmount) {
          throw new Error(`Insufficient ${params.inputToken.symbol} balance`);
        }

        let coinToSwap;
        
        // For IOTA swaps, we need special handling to ensure gas coins remain
        if (params.inputToken.type === SUPPORTED_COINS.IOTA.type) {
          const MIN_GAS_AMOUNT = BigInt(150000000); // 0.15 IOTA for gas
          
          if (totalBalance <= inputAmount + MIN_GAS_AMOUNT) {
            throw new Error(`Insufficient IOTA balance. Need to keep at least 0.15 IOTA for gas fees.`);
          }
          
          // Sort coins by balance (ascending) to use smaller coins first
          const sortedCoins = [...coins.data].sort((a, b) => {
            const balanceA = BigInt(a.balance);
            const balanceB = BigInt(b.balance);
            return balanceA < balanceB ? -1 : balanceA > balanceB ? 1 : 0;
          });
          
          // Find coins to use for swap amount
          let accumulatedAmount = BigInt(0);
          const coinsToUse = [];
          const gasCoins = [];
          
          for (const coin of sortedCoins) {
            const coinBalance = BigInt(coin.balance);
            if (accumulatedAmount < inputAmount) {
              coinsToUse.push(coin);
              accumulatedAmount += coinBalance;
            } else {
              gasCoins.push(coin);
            }
          }
          
          // If we have exactly the coins we need, use them directly
          if (coinsToUse.length === 1 && BigInt(coinsToUse[0].balance) === inputAmount) {
            coinToSwap = tx.object(coinsToUse[0].coinObjectId);
          } else {
            // Merge coins if needed and split exact amount
            const coinRefs = coinsToUse.map(coin => tx.object(coin.coinObjectId));
            if (coinRefs.length > 1) {
              const [primaryCoin, ...otherCoins] = coinRefs;
              tx.mergeCoins(primaryCoin, otherCoins);
              [coinToSwap] = tx.splitCoins(primaryCoin, [tx.pure.u64(inputAmount)]);
            } else {
              [coinToSwap] = tx.splitCoins(coinRefs[0], [tx.pure.u64(inputAmount)]);
            }
          }
        } else {
          // For non-IOTA tokens, use the standard approach
          const coinRefs = coins.data.map(coin => tx.object(coin.coinObjectId));
          
          // Merge coins if needed
          if (coinRefs.length > 1) {
            const [primaryCoin, ...otherCoins] = coinRefs;
            tx.mergeCoins(primaryCoin, otherCoins);
          }
          
          // Split exact amount if not using entire balance
          if (totalBalance === inputAmount) {
            coinToSwap = coinRefs[0];
          } else {
            [coinToSwap] = tx.splitCoins(coinRefs[0], [tx.pure.u64(inputAmount)]);
          }
        }

        // Execute swap using simplified DEX (1:1 exchange rate)
        if (isAToB) {
          tx.moveCall({
            target: `${packageId}::simple_dex::swap_a_to_b`,
            typeArguments: [pool.coinTypeA, pool.coinTypeB],
            arguments: [
              tx.object(pool.poolId),
              coinToSwap,
            ],
          });
        } else {
          tx.moveCall({
            target: `${packageId}::simple_dex::swap_b_to_a`,
            typeArguments: [pool.coinTypeA, pool.coinTypeB],
            arguments: [
              tx.object(pool.poolId),
              coinToSwap,
            ],
          });
        }
      } else {
        // Multi-hop swap
        throw new Error('Multi-hop swaps not yet implemented');
      }

      console.log('Transaction ready to sign:', {
        inputToken: params.inputToken.symbol,
        outputToken: params.outputToken.symbol,
        inputAmount: inputAmount.toString(),
        poolId: route.pools[0]?.poolId,
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
              console.log('Transaction successful:', result);
              toast.success('Swap executed successfully!', {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });
              resolve({
                success: true,
                digest: result.digest,
              });
            },
            onError: (error) => {
              console.error('Transaction failed:', error);
              
              const errorMessage = error?.message || error?.toString() || 'Unknown error';
              
              if (errorMessage.includes('InsufficientGas') || errorMessage.includes('no valid gas')) {
                toast.error('Insufficient gas', {
                  description: 'Please ensure you have enough IOTA for gas fees (at least 0.1 IOTA)',
                });
              } else if (errorMessage.includes('InsufficientBalance')) {
                toast.error('Insufficient balance', {
                  description: 'Please check your token balances',
                });
              } else if (errorMessage.includes('assert') && errorMessage.includes('1')) {
                toast.error('Insufficient pool reserves', {
                  description: 'The pool does not have enough liquidity for this swap',
                });
              } else if (errorMessage.includes('Pool not found')) {
                toast.error('Pool not found', {
                  description: 'Please add liquidity first to create the pool',
                });
              } else {
                toast.error('Transaction failed', {
                  description: errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage,
                });
              }
              
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      console.error('Swap error details:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        params: {
          inputToken: params.inputToken,
          outputToken: params.outputToken,
          inputAmount: params.inputAmount,
        }
      });
      toast.error('Swap failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setIsSwapping(false);
    }
  };

  const estimateSwap = async (params: {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    inputDecimals: number;
  }) => {
    try {
      const inputAmountBigInt = parseTokenAmount(params.inputAmount, params.inputDecimals);
      
      // Find best route
      const route = await PoolDiscovery.findBestRoute(
        params.inputToken,
        params.outputToken,
        inputAmountBigInt,
        'testnet'
      );

      if (!route) {
        return null;
      }
      
      return {
        outputAmount: route.outputAmount,
        priceImpact: route.priceImpact,
        route: route.path,
      };
    } catch (error) {
      console.error('Estimate swap error:', error);
      return null;
    }
  };

  return {
    executeSwap,
    estimateSwap,
    isSwapping,
  };
}