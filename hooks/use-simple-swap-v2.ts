'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { parseTokenAmount } from '@/lib/utils/format';
import { toast } from 'sonner';
import { PoolDiscovery } from '@/lib/services/pool-discovery';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';

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

export function useSimpleSwapV2() {
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
      
      // Find pool for swap
      const pool = await PoolDiscovery.findPoolsForPair(
        params.inputToken.type,
        params.outputToken.type,
        'testnet'
      );

      if (!pool) {
        throw new Error(`No liquidity pool found for ${params.inputToken.symbol} → ${params.outputToken.symbol}`);
      }

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;
      const isAToB = pool.coinTypeA === params.inputToken.type;

      // Get all coins of the input type
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: params.inputToken.type,
      });

      if (!coins.data || coins.data.length === 0) {
        throw new Error(`No ${params.inputToken.symbol} balance found`);
      }

      // Calculate total balance
      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));

      if (totalBalance < inputAmount) {
        throw new Error(`Insufficient ${params.inputToken.symbol} balance`);
      }

      // Special handling for IOTA to avoid gas issues
      if (params.inputToken.type === SUPPORTED_COINS.IOTA.type) {
        // Ensure we have enough for swap + gas
        const gasBuffer = BigInt(200000000); // 0.2 IOTA for gas
        if (totalBalance < inputAmount + gasBuffer) {
          throw new Error('Insufficient IOTA balance. Need extra for gas fees.');
        }

        // Use coins efficiently
        const sortedCoins = [...coins.data].sort((a, b) => 
          BigInt(b.balance) > BigInt(a.balance) ? 1 : -1
        );

        // Find the best coin(s) to use
        let coinToUse = null;
        let needsSplit = true;

        // Check if we have a coin with exact amount
        for (const coin of sortedCoins) {
          if (BigInt(coin.balance) === inputAmount) {
            coinToUse = tx.object(coin.coinObjectId);
            needsSplit = false;
            break;
          }
        }

        // If no exact match, use the smallest coin that's big enough
        if (!coinToUse) {
          for (const coin of sortedCoins) {
            if (BigInt(coin.balance) >= inputAmount + gasBuffer) {
              const coinRef = tx.object(coin.coinObjectId);
              [coinToUse] = tx.splitCoins(coinRef, [inputAmount]);
              break;
            }
          }
        }

        // If still no coin, merge and split
        if (!coinToUse) {
          const coinRefs = coins.data.map(c => tx.object(c.coinObjectId));
          if (coinRefs.length > 1) {
            tx.mergeCoins(coinRefs[0], coinRefs.slice(1));
          }
          [coinToUse] = tx.splitCoins(coinRefs[0], [inputAmount]);
        }

        // Execute the swap
        if (isAToB) {
          tx.moveCall({
            target: `${packageId}::simple_dex::swap_a_to_b`,
            typeArguments: [pool.coinTypeA, pool.coinTypeB],
            arguments: [tx.object(pool.poolId), coinToUse],
          });
        } else {
          tx.moveCall({
            target: `${packageId}::simple_dex::swap_b_to_a`,
            typeArguments: [pool.coinTypeA, pool.coinTypeB],
            arguments: [tx.object(pool.poolId), coinToUse],
          });
        }
      } else {
        // For non-IOTA tokens, simpler handling
        const coinRefs = coins.data.map(c => tx.object(c.coinObjectId));
        
        let coinToSwap;
        if (coins.data.length === 1 && BigInt(coins.data[0].balance) === inputAmount) {
          coinToSwap = coinRefs[0];
        } else {
          if (coinRefs.length > 1) {
            tx.mergeCoins(coinRefs[0], coinRefs.slice(1));
          }
          [coinToSwap] = tx.splitCoins(coinRefs[0], [inputAmount]);
        }

        // Execute the swap
        if (isAToB) {
          tx.moveCall({
            target: `${packageId}::simple_dex::swap_a_to_b`,
            typeArguments: [pool.coinTypeA, pool.coinTypeB],
            arguments: [tx.object(pool.poolId), coinToSwap],
          });
        } else {
          tx.moveCall({
            target: `${packageId}::simple_dex::swap_b_to_a`,
            typeArguments: [pool.coinTypeA, pool.coinTypeB],
            arguments: [tx.object(pool.poolId), coinToSwap],
          });
        }
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
            requestType: 'WaitForLocalExecution',
          },
          {
            onSuccess: (result) => {
              console.log('Swap successful:', result);
              toast.success('Swap executed successfully!');
              resolve({ success: true, digest: result.digest, error: null });
            },
            onError: (error) => {
              console.error('Swap failed:', error);
              const errorMsg = error?.message || 'Transaction failed';
              
              if (errorMsg.includes('gas')) {
                toast.error('Gas issue: Try a smaller amount or add more IOTA to your wallet');
              } else if (errorMsg.includes('assert')) {
                toast.error('Pool reserves insufficient for this swap');
              } else {
                toast.error(errorMsg.slice(0, 100));
              }
              
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      console.error('Swap error:', error);
      toast.error(error instanceof Error ? error.message : 'Swap failed');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setIsSwapping(false);
    }
  };

  return { executeSwap, isSwapping };
}