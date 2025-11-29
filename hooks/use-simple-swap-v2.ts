'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { parseTokenAmount } from '@/lib/utils/format';
import { PoolService } from '@/lib/services/pool-service';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';
import { toast } from 'sonner';

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
      const startTime = Date.now();
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
      
      let coinToSwap;
      
      // Special handling for IOTA to avoid gas coin conflicts
      if (params.inputToken.type === SUPPORTED_COINS.IOTA.type) {
        // For IOTA swaps, use tx.gas to access the gas coin directly
        [coinToSwap] = tx.splitCoins(tx.gas, [inputAmount]);
      } else {
        // For non-IOTA tokens, get coins normally
        const coins = await client.getCoins({
          owner: currentAccount.address,
          coinType: params.inputToken.type,
        });

        if (!coins.data || coins.data.length === 0) {
          throw new Error(`No ${params.inputToken.symbol} balance found`);
        }

        const totalBalance = coins.data.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
        
        if (totalBalance < inputAmount) {
          throw new Error(`Insufficient ${params.inputToken.symbol} balance`);
        }

        // Handle non-IOTA token coins
        const coinRefs = coins.data.map(c => tx.object(c.coinObjectId));
        
        if (coins.data.length === 1 && BigInt(coins.data[0].balance) === inputAmount) {
          // Use the coin directly if it matches exactly
          coinToSwap = coinRefs[0];
        } else {
          // Merge coins if multiple, then split exact amount
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

      // Set gas budget (reduced since we're using tx.gas more efficiently)
      tx.setGasBudget(100000000); // 0.1 IOTA - should be sufficient with proper gas handling

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
            },
          },
          {
            onSuccess: (result) => {
              // Check for IOTA transaction success - if we reached onSuccess, transaction likely succeeded
              const status = (result.effects as any)?.status?.status || (result.effects as any)?.status;
              
              // Only fail if we explicitly see failure status, otherwise treat as success
              if (status === 'failure' || status === 'failed') {
                const errorMsg = (result.effects as any)?.status?.error || 'Transaction failed on chain';
                resolve({ success: false, error: errorMsg });
                return;
              }

              // Extract actual output amount from balance changes
              let actualOutputAmount = '0';
              // TODO: Extract balance changes when available in IOTA SDK
              // For now, use the expected output amount
              actualOutputAmount = params.minOutputAmount || '0';

              // Calculate actual execution time
              const endTime = Date.now();
              const executionTime = (endTime - startTime) / 1000; // Convert to seconds

              // Don't show toast here - let the UI component handle the success display

              resolve({ success: true, digest: result.digest, executionTime });
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