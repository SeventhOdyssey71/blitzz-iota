'use client';

import { useState, useEffect } from 'react';
import { useIotaClient } from '@iota/dapp-kit';
import { PoolService, PoolInfo } from '@/lib/services/pool-service';
import { parseTokenAmount, formatBalance } from '@/lib/utils/format';

interface SwapCalculation {
  outputAmount: string;
  minimumReceived: string;
  priceImpact: number;
  route: string[];
  pool: PoolInfo | null;
  isLoading: boolean;
  error: string | null;
  spotPriceBefore?: number;
  spotPriceAfter?: number;
}

export function useSwapCalculation(
  inputToken: { type: string; symbol: string; decimals: number },
  outputToken: { type: string; symbol: string; decimals: number },
  inputAmount: string,
  slippage: number
) {
  const client = useIotaClient();
  const [calculation, setCalculation] = useState<SwapCalculation>({
    outputAmount: '0',
    minimumReceived: '0',
    priceImpact: 0,
    route: [],
    pool: null,
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    const calculateSwap = async () => {
      if (!inputAmount || parseFloat(inputAmount) <= 0) {
        setCalculation(prev => ({
          ...prev,
          outputAmount: '0',
          minimumReceived: '0',
          priceImpact: 0,
          error: null,
        }));
        return;
      }

      setCalculation(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Find the pool for this pair
        const pool = await PoolService.findPool(
          inputToken.type,
          outputToken.type,
          'testnet'
        );

        if (!pool) {
          // Don't throw error, just set state and return
          setCalculation(prev => ({
            ...prev,
            isLoading: false,
            error: `No liquidity pool found for ${inputToken.symbol} → ${outputToken.symbol}`,
            outputAmount: '0',
            minimumReceived: '0',
            priceImpact: 0,
          }));
          return;
        }

        // Check if pool has liquidity
        if (pool.reserveA === 0n || pool.reserveB === 0n) {
          throw new Error('Pool has no liquidity');
        }

        // Convert input amount to smallest unit
        const inputAmountBigInt = parseTokenAmount(inputAmount, inputToken.decimals);

        // Determine swap direction
        const isAToB = pool.coinTypeA === inputToken.type;

        // Calculate output amount using AMM formula
        const swapResult = PoolService.calculateSwapQuote(
          pool,
          inputAmountBigInt,
          isAToB,
          slippage
        );

        // Use the minimum received from swap quote (already includes slippage)
        const customMinimumReceived = swapResult.minimumReceived;

        setCalculation({
          outputAmount: swapResult.outputAmount.toString(),
          minimumReceived: customMinimumReceived.toString(),
          priceImpact: swapResult.priceImpact,
          route: [inputToken.symbol, outputToken.symbol],
          pool,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setCalculation(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to calculate swap',
          outputAmount: '0',
          minimumReceived: '0',
          priceImpact: 0,
        }));
      }
    };

    calculateSwap();
  }, [inputToken, outputToken, inputAmount, slippage, client]);

  return calculation;
}

// Helper to format the output for display
export function formatSwapOutput(amount: string, decimals: number): string {
  if (!amount || amount === '0') return '0';
  return formatBalance(amount, decimals);
}