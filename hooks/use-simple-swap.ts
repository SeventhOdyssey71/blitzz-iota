'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { parseTokenAmount } from '@/lib/utils/format';
import { toast } from 'sonner';
import { PoolDiscovery } from '@/lib/services/pool-discovery';
import { Transaction } from '@iota/iota-sdk/transactions';
import { CoinStruct } from '@iota/iota-sdk/client';
import { blitz_PACKAGE_ID, SUPPORTED_COINS, STAKING_POOL_ADDRESS } from '@/config/iota.config';
import { SwapContract } from '@/lib/contracts/swap-contract';

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

      if (!route) {
        console.error('Failed to find route:', {
          inputToken: params.inputToken.type,
          outputToken: params.outputToken.type,
          inputAmount: inputAmount.toString()
        });
        throw new Error(`No liquidity pool found for ${params.inputToken.symbol} → ${params.outputToken.symbol}`);
      }

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

      // Check if this is a staking pool swap (IOTA <-> stIOTA)
      const isStakingSwap = route.pools[0]?.poolId === STAKING_POOL_ADDRESS;
      
      if (isStakingSwap) {
        // Handle IOTA to stIOTA staking
        if (params.inputToken.type === SUPPORTED_COINS.IOTA.type) {
          // Get IOTA coins
          console.log('Fetching coins for:', {
            owner: currentAccount.address,
            coinType: params.inputToken.type
          });
          
          const coins = await client.getCoins({
            owner: currentAccount.address,
            coinType: params.inputToken.type,
          });

          if (!coins.data || coins.data.length === 0) {
            throw new Error('Insufficient IOTA balance');
          }

          console.log('Found coins:', coins.data.map(c => ({
            id: c.coinObjectId,
            balance: c.balance,
            type: c.coinType
          })));

          // Calculate total balance
          const totalBalance = coins.data.reduce((sum, coin) => {
            return sum + BigInt(coin.balance);
          }, BigInt(0));

          if (totalBalance < inputAmount) {
            throw new Error(`Insufficient balance. Have ${totalBalance}, need ${inputAmount}`);
          }

          // Use Transaction builder to handle coins properly
          let coinToUse;
          
          if (coins.data.length === 1 && BigInt(coins.data[0].balance) === inputAmount) {
            // If we have exactly one coin with the exact amount, use it directly
            coinToUse = tx.object(coins.data[0].coinObjectId);
          } else {
            // Otherwise, merge all coins and split the exact amount
            const coinRefs = coins.data.map(coin => tx.object(coin.coinObjectId));
            
            if (coinRefs.length > 1) {
              // Merge all coins into the first one
              const [primaryCoin, ...otherCoins] = coinRefs;
              tx.mergeCoins(primaryCoin, otherCoins);
            }
            
            // Split the exact amount we need
            const primaryCoinRef = coinRefs[0];
            [coinToUse] = tx.splitCoins(primaryCoinRef, [tx.pure.u64(inputAmount)]);
          }

          // Execute swap with the coin
          SwapContract.swapIotaToStIota(tx, coinToUse, inputAmount);
        } else {
          // stIOTA to IOTA swap
          throw new Error('stIOTA to IOTA swap not yet implemented. Please swap IOTA to stIOTA.');
        }
      } else if (route.pools.length === 1) {
        // Direct swap via DEX
        const pool = route.pools[0];
        const isAToB = pool.coinTypeA === params.inputToken.type;
        
        // Get coins to swap
        const coins = await client.getCoins({
          owner: currentAccount.address,
          coinType: params.inputToken.type,
        });

        if (!coins.data || coins.data.length === 0) {
          throw new Error('Insufficient balance');
        }

        // Merge coins if needed
        const coinObjectIds = coins.data.map(coin => coin.coinObjectId);
        const [primaryCoin, ...mergeCoins] = coinObjectIds;
        
        if (mergeCoins.length > 0) {
          tx.mergeCoins(tx.object(primaryCoin), mergeCoins.map(id => tx.object(id)));
        }

        // Split exact amount
        const [coinToSwap] = tx.splitCoins(tx.object(primaryCoin), [tx.pure.u64(inputAmount)]);

        // Execute swap
        const dexModule = process.env.NEXT_PUBLIC_DEX_MODULE || 'simple_dex';
        if (isAToB) {
          tx.moveCall({
            target: `${packageId}::${dexModule}::swap_a_to_b`,
            typeArguments: [pool.coinTypeA, pool.coinTypeB],
            arguments: [
              tx.object(pool.poolId),
              coinToSwap,
            ],
          });
        } else {
          tx.moveCall({
            target: `${packageId}::${dexModule}::swap_b_to_a`,
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

      // Build transaction block
      tx.setGasBudget(10000000); // 0.01 IOTA - reduced gas budget
      
      console.log('Transaction ready to sign:', {
        isStakingSwap,
        inputToken: params.inputToken.symbol,
        outputToken: params.outputToken.symbol,
        inputAmount: inputAmount.toString(),
      });

      // Set sender for transaction
      tx.setSender(currentAccount.address);
      
      // First, let's try to do a dry run to see if there are any issues
      try {
        console.log('Attempting dry run...');
        const dryRunResult = await client.dryRunTransactionBlock({
          transactionBlock: await tx.build({ client }),
        });
        console.log('Dry run result:', dryRunResult);
        
        if (dryRunResult.effects.status.status === 'failure') {
          console.error('Dry run failed with status:', dryRunResult.effects.status);
          throw new Error(`Transaction would fail: ${dryRunResult.effects.status.error}`);
        }
      } catch (dryRunError) {
        console.error('Dry run failed:', {
          error: dryRunError,
          message: dryRunError instanceof Error ? dryRunError.message : 'Unknown error',
          stack: dryRunError instanceof Error ? dryRunError.stack : undefined,
        });
        
        // Check if it's a specific error we can handle
        const errorMessage = dryRunError instanceof Error ? dryRunError.message : '';
        if (errorMessage.includes('InsufficientGas')) {
          throw new Error('Insufficient gas. Please ensure you have enough IOTA for gas fees.');
        } else if (errorMessage.includes('InvalidInput')) {
          throw new Error('Invalid transaction input. Please check your balance and try again.');
        }
        
        // For other errors, provide a generic message but don't block the transaction
        console.warn('Dry run failed but attempting transaction anyway...');
      }

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