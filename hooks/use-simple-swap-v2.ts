'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { parseTokenAmount } from '@/lib/utils/format';
import { PoolService } from '@/lib/services/pool-service';
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
      const inputAmount = parseTokenAmount(params.inputAmount, params.inputToken.decimals);
      
      // Find pool for swap
      const pool = await PoolService.findPool(
        params.inputToken.type,
        params.outputToken.type,
        'testnet'
      );

      if (!pool) {
        throw new Error(`No liquidity pool found for ${params.inputToken.symbol} → ${params.outputToken.symbol}. Please create a pool first.`);
      }

      if (!pool.poolId || pool.reserveA === BigInt(0) || pool.reserveB === BigInt(0)) {
        throw new Error('Pool has no liquidity. Reserves: A=' + pool.reserveA.toString() + ', B=' + pool.reserveB.toString());
      }

      // Determine swap direction
      const isAToB = pool.coinTypeA === params.inputToken.type;

      if (!isAToB && pool.coinTypeB !== params.inputToken.type) {
        throw new Error(`Input token ${params.inputToken.symbol} doesn't match pool tokens`);
      }

      // Validate pool has sufficient liquidity for the swap
      const outputReserve = isAToB ? pool.reserveB : pool.reserveA;
      if (outputReserve < inputAmount / 10n) { // Conservative check: output reserve should be at least 10x input
        throw new Error('Insufficient pool liquidity for this swap amount');
      }

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

      // Get coins of input type
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: params.inputToken.type,
      });

      if (!coins.data || coins.data.length === 0) {
        throw new Error(`No ${params.inputToken.symbol} balance found`);
      }

      const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
      
      // Basic balance check - let the wallet handle gas payment
      if (totalBalance < inputAmount) {
        throw new Error(`Insufficient ${params.inputToken.symbol} balance`);
      }

      // Handle coin preparation for swap
      let coinToSwap;
      
      if (params.inputToken.type === SUPPORTED_COINS.IOTA.type) {
        // For IOTA swaps, we need to ensure gas coins remain available
        // Check if we have enough for both swap and gas (conservative estimate)
        const gasReserve = 100000000n; // 0.1 IOTA reserve for gas
        
        if (totalBalance < inputAmount + gasReserve) {
          throw new Error('Insufficient IOTA balance. Need to keep some IOTA for gas fees.');
        }
        
        // Find coins that we can use while preserving gas
        const usableCoins = coins.data.filter(coin => {
          const remainingBalance = totalBalance - BigInt(coin.balance);
          return remainingBalance >= gasReserve; // Ensure gas reserve remains if we use this coin
        });
        
        if (usableCoins.length === 0) {
          // If no single coin can be used safely, try splitting from largest coin
          const largestCoin = coins.data.reduce((max, coin) => 
            BigInt(coin.balance) > BigInt(max.balance) ? coin : max
          );
          
          if (BigInt(largestCoin.balance) > inputAmount + gasReserve) {
            [coinToSwap] = tx.splitCoins(tx.object(largestCoin.coinObjectId), [inputAmount]);
          } else {
            throw new Error('Cannot swap this amount - insufficient IOTA for gas fees.');
          }
        } else {
          // Use the usable coins for swap
          const coinRefs = usableCoins.map(c => tx.object(c.coinObjectId));
          
          if (usableCoins.length === 1 && BigInt(usableCoins[0].balance) === inputAmount) {
            coinToSwap = coinRefs[0];
          } else {
            if (coinRefs.length > 1) {
              tx.mergeCoins(coinRefs[0], coinRefs.slice(1));
            }
            [coinToSwap] = tx.splitCoins(coinRefs[0], [inputAmount]);
          }
        }
      } else {
        // For non-IOTA tokens, use standard logic
        const coinRefs = coins.data.map(c => tx.object(c.coinObjectId));
        
        if (coins.data.length === 1 && BigInt(coins.data[0].balance) === inputAmount) {
          coinToSwap = coinRefs[0];
        } else {
          if (coinRefs.length > 1) {
            tx.mergeCoins(coinRefs[0], coinRefs.slice(1));
          }
          [coinToSwap] = tx.splitCoins(coinRefs[0], [inputAmount]);
        }
      }

      // Execute the swap
      const typeArgs = [pool.coinTypeA, pool.coinTypeB];
      const target = `${packageId}::simple_dex::swap_${isAToB ? 'a_to_b' : 'b_to_a'}`;
      
      tx.moveCall({
        target,
        typeArguments: typeArgs,
        arguments: [tx.object(pool.poolId), coinToSwap],
      });

      // Set appropriate gas budget - conservative amount to ensure availability
      tx.setGasBudget(50000000); // 0.05 IOTA

      // Execute transaction with proper options
      return new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
              showBalanceChanges: true,
              showInput: true,
            },
          },
          {
            onSuccess: (result) => {
              if (result.effects?.status !== 'success') {
                const errorMsg = (result.effects as any)?.status?.error || 'Transaction failed on chain';
                resolve({ success: false, error: errorMsg });
                return;
              }

              resolve({ success: true, digest: result.digest });
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Transaction failed';
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMsg };
    } finally {
      setIsSwapping(false);
    }
  };

  return { executeSwap, isSwapping };
}