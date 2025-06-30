import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { parseTokenAmount } from '@/lib/utils/format';
import { toast } from 'sonner';
import { TransactionBuilder } from '@/lib/iota/transaction-builder';
import { PoolDiscovery } from '@/lib/services/pool-discovery';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID } from '@/config/iota.config';

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
        throw new Error('No liquidity pool found for this token pair');
      }

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

      if (route.pools.length === 1) {
        // Direct swap
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
        if (isAToB) {
          tx.moveCall({
            target: `${packageId}::dex::swap_a_to_b`,
            typeArguments: [pool.coinTypeA, pool.coinTypeB],
            arguments: [
              tx.object(pool.poolId),
              coinToSwap,
              tx.pure.u64(minOutputAmount),
            ],
          });
        } else {
          tx.moveCall({
            target: `${packageId}::dex::swap_b_to_a`,
            typeArguments: [pool.coinTypeA, pool.coinTypeB],
            arguments: [
              tx.object(pool.poolId),
              coinToSwap,
              tx.pure.u64(minOutputAmount),
            ],
          });
        }
      } else {
        // Multi-hop swap
        throw new Error('Multi-hop swaps not yet implemented');
      }

      // Execute transaction
      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
            },
          },
          {
            onSuccess: (result) => {
              toast.success('Swap executed successfully!', {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });
              resolve({
                success: true,
                digest: result.digest,
              });
            },
            onError: (error) => {
              throw error;
            },
          }
        );
      });
    } catch (error) {
      console.error('Swap error:', error);
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