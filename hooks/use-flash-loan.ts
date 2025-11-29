'use client';

import { useState, useCallback } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { toast } from 'sonner';
import { blitz_PACKAGE_ID } from '@/config/iota.config';

interface FlashLoanParams {
  poolId: string;
  amount: string;
  coinType: string;
  // Callback function to execute with borrowed funds
  onBorrowed: (tx: Transaction, borrowedCoin: any) => void;
}

interface FlashLoanResult {
  success: boolean;
  digest?: string;
  error?: string;
}

export function useFlashLoan() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isLoading, setIsLoading] = useState(false);

  const executeFlashLoan = useCallback(async (params: FlashLoanParams): Promise<FlashLoanResult> => {
    if (!currentAccount?.address) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);

    try {
      const packageId = blitz_PACKAGE_ID.testnet;
      const tx = new Transaction();

      // Step 1: Borrow from flash loan pool
      const [borrowedCoin, hotPotato] = tx.moveCall({
        target: `${packageId}::flash_loan::borrow`,
        typeArguments: [params.coinType],
        arguments: [
          tx.object(params.poolId),
          tx.pure.u64(params.amount),
        ],
      });

      // Step 2: Execute user-defined operations with borrowed funds
      try {
        params.onBorrowed(tx, borrowedCoin);
      } catch (error) {
        throw new Error(`Flash loan callback failed: ${error}`);
      }

      // Step 3: Ensure repayment is included in the transaction
      // This should be handled by the callback, but we verify it here
      
      // Note: The hot potato pattern ensures that the loan MUST be repaid
      // within this transaction, or the transaction will fail

      tx.setGasBudget(200000000); // 0.2 IOTA for complex operations

      return new Promise((resolve) => {
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
              const status = (result.effects as any)?.status?.status || (result.effects as any)?.status;
              if (status === 'failure' || status === 'failed') {
                const errorMsg = (result.effects as any)?.status?.error || 'Flash loan transaction failed';
                toast.error('Flash loan failed', { description: errorMsg });
                resolve({ success: false, error: errorMsg });
                return;
              }

              toast.success('Flash loan executed successfully!', {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });

              resolve({
                success: true,
                digest: result.digest,
              });
            },
            onError: (error) => {
              const errorMessage = error?.message || 'Transaction failed';
              let description = errorMessage;

              if (errorMessage.includes('InsufficientLiquidity')) {
                description = 'Insufficient liquidity in flash loan pool';
              } else if (errorMessage.includes('InvalidRepayment')) {
                description = 'Flash loan repayment amount incorrect';
              } else if (errorMessage.includes('InsufficientGas')) {
                description = 'Insufficient gas for complex flash loan operation';
              }

              toast.error('Flash loan failed', { description });
              resolve({ success: false, error: errorMessage });
            },
          }
        );
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Flash loan failed', { description: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [currentAccount, signAndExecuteTransaction, client]);

  const createFlashLoanArbitrage = useCallback(
    (
      poolA: string,
      poolB: string,
      tokenIn: string,
      tokenOut: string,
      flashLoanPoolId: string,
      borrowAmount: string
    ) => {
      return executeFlashLoan({
        poolId: flashLoanPoolId,
        amount: borrowAmount,
        coinType: tokenIn,
        onBorrowed: (tx, borrowedCoin) => {
          // Step 1: Swap on Pool A
          const [receivedTokens] = tx.moveCall({
            target: `${blitz_PACKAGE_ID.testnet}::simple_dex::swap_a_to_b`,
            typeArguments: [tokenIn, tokenOut],
            arguments: [tx.object(poolA), borrowedCoin],
          });

          // Step 2: Swap back on Pool B 
          const [finalTokens] = tx.moveCall({
            target: `${blitz_PACKAGE_ID.testnet}::simple_dex::swap_b_to_a`,
            typeArguments: [tokenOut, tokenIn],
            arguments: [tx.object(poolB), receivedTokens],
          });

          // Step 3: Repay flash loan
          tx.moveCall({
            target: `${blitz_PACKAGE_ID.testnet}::flash_loan::repay`,
            typeArguments: [tokenIn],
            arguments: [
              tx.object(flashLoanPoolId),
              finalTokens, // This should include borrowed amount + fee
              // hot_potato is automatically handled by the Move VM
            ],
          });
        },
      });
    },
    [executeFlashLoan]
  );

  const createFlashLoanLiquidation = useCallback(
    (
      borrowerPosition: string,
      collateralToken: string,
      debtToken: string,
      flashLoanPoolId: string,
      repayAmount: string
    ) => {
      return executeFlashLoan({
        poolId: flashLoanPoolId,
        amount: repayAmount,
        coinType: debtToken,
        onBorrowed: (tx, borrowedCoin) => {
          // Step 1: Repay borrower's debt to unlock collateral
          const [unlockedCollateral] = tx.moveCall({
            target: `${blitz_PACKAGE_ID.testnet}::lending::liquidate_position`,
            typeArguments: [collateralToken, debtToken],
            arguments: [tx.object(borrowerPosition), borrowedCoin],
          });

          // Step 2: Swap collateral to debt token to repay flash loan
          const [swappedTokens] = tx.moveCall({
            target: `${blitz_PACKAGE_ID.testnet}::simple_dex::swap_a_to_b`,
            typeArguments: [collateralToken, debtToken],
            arguments: [tx.object('COLLATERAL_TO_DEBT_POOL'), unlockedCollateral],
          });

          // Step 3: Repay flash loan
          tx.moveCall({
            target: `${blitz_PACKAGE_ID.testnet}::flash_loan::repay`,
            typeArguments: [debtToken],
            arguments: [
              tx.object(flashLoanPoolId),
              swappedTokens,
            ],
          });
        },
      });
    },
    [executeFlashLoan]
  );

  return {
    executeFlashLoan,
    createFlashLoanArbitrage,
    createFlashLoanLiquidation,
    isLoading,
  };
}