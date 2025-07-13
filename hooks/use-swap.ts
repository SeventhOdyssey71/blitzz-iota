import { useState } from 'react';
import { useWallet, useIotaClient, Transaction } from '@iota/dapp-kit';
import { DexContract } from '@/lib/contracts/dex';
import { parseTokenAmount } from '@/lib/utils/format';
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

export function useSwap() {
  const client = useIotaClient();
  const { signAndExecuteTransaction } = useWallet();
  const [isSwapping, setIsSwapping] = useState(false);

  const executeSwap = async (params: SwapParams) => {
    try {
      setIsSwapping(true);

      const dex = new DexContract(client);

      // Find the best pool for this pair
      const poolId = await dex.findBestPool(
        params.inputToken.type,
        params.outputToken.type
      );

      if (!poolId) {
        throw new Error('No liquidity pool found for this pair');
      }

      // Parse amounts
      const inputAmount = parseTokenAmount(params.inputAmount, params.inputToken.decimals);
      const minOutputAmount = parseTokenAmount(params.minOutputAmount, params.outputToken.decimals);

      // Create transaction
      const tx = new Transaction();

      // Split coins for exact amount
      const [coin] = tx.splitCoins(tx.gas, [inputAmount]);

      // Add swap call
      await dex.swap(
        poolId,
        params.inputToken.type,
        params.outputToken.type,
        coin,
        minOutputAmount,
        true // isAToB - would be determined by token order
      );

      // Execute transaction
      const result = await signAndExecuteTransaction({
        transaction: tx,
        options: {
          showEffects: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status === 'success') {
        // Extract swap event data
        const swapEvent = result.events?.find(e => 
          e.type.includes('SwapEvent')
        );

        toast.success('Swap executed successfully!', {
          description: `Transaction: ${result.digest}`,
        });

        return {
          success: true,
          digest: result.digest,
          event: swapEvent,
        };
      } else {
        throw new Error('Transaction failed');
      }
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
      const dex = new DexContract(client);
      
      // Find pool
      const poolId = await dex.findBestPool(params.inputToken, params.outputToken);
      if (!poolId) {
        return null;
      }

      // Get pool reserves
      const { reserveA, reserveB } = await dex.getPoolReserves(poolId);
      
      // Calculate output
      const inputAmount = parseTokenAmount(params.inputAmount, params.inputDecimals);
      const outputAmount = dex.calculateSwapOutput(
        inputAmount,
        reserveA,
        reserveB
      );

      return {
        outputAmount,
        priceImpact: calculatePriceImpact(inputAmount, outputAmount, reserveA, reserveB),
        route: [params.inputToken, params.outputToken],
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

function calculatePriceImpact(
  inputAmount: bigint,
  outputAmount: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  // Calculate price before swap
  const priceBefore = Number(reserveOut) / Number(reserveIn);
  
  // Calculate price after swap
  const newReserveIn = Number(reserveIn) + Number(inputAmount);
  const newReserveOut = Number(reserveOut) - Number(outputAmount);
  const priceAfter = newReserveOut / newReserveIn;
  
  // Calculate impact
  const impact = ((priceBefore - priceAfter) / priceBefore) * 100;
  return Math.abs(impact);
}