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

interface SwapResult {
  success: boolean;
  digest?: string;
  error?: string | null;
  executionTime?: number | null;
  effects?: any;
  events?: any;
}

export function useSimpleSwapV2() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isSwapping, setIsSwapping] = useState(false);

  const executeSwap = async (params: SwapParams): Promise<SwapResult> => {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsSwapping(true);

      // Parse amounts
      const inputAmount = parseTokenAmount(params.inputAmount, params.inputToken.decimals);
      
      console.log('Swap - Looking for pool:', {
        inputToken: params.inputToken.symbol,
        inputType: params.inputToken.type,
        outputToken: params.outputToken.symbol,
        outputType: params.outputToken.type
      });
      
      // Find pool for swap
      const pool = await PoolDiscovery.findPoolsForPair(
        params.inputToken.type,
        params.outputToken.type,
        'testnet'
      );

      console.log('Swap - Pool discovery result:', pool);

      if (!pool) {
        // Try to get more info about why pool wasn't found
        const { PoolTracker } = await import('@/lib/services/pool-tracker');
        const trackedPools = PoolTracker.getPools();
        console.log('Swap - Tracked pools:', trackedPools);
        
        throw new Error(`No liquidity pool found for ${params.inputToken.symbol} → ${params.outputToken.symbol}. Total tracked pools: ${trackedPools.length}`);
      }
      
      // Validate pool object
      if (!pool.poolId) {
        throw new Error('Invalid pool: missing poolId');
      }
      
      console.log('Using pool:', {
        poolId: pool.poolId,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        reserveA: pool.reserveA.toString(),
        reserveB: pool.reserveB.toString(),
      });
      
      // Validate pool has liquidity
      if (pool.reserveA === BigInt(0) || pool.reserveB === BigInt(0)) {
        throw new Error('Pool has no liquidity. Please add liquidity first.');
      }
      
      // Validate input amount
      if (inputAmount === BigInt(0)) {
        throw new Error('Input amount cannot be zero');
      }
      
      // Determine swap direction
      const isAToB = pool.coinTypeA === params.inputToken.type;
      
      // Validate that the input token matches one of the pool's tokens
      if (pool.coinTypeA !== params.inputToken.type && pool.coinTypeB !== params.inputToken.type) {
        throw new Error(`Input token ${params.inputToken.symbol} doesn't match pool tokens`);
      }
      
      // Validate that the output token matches the other pool token
      const expectedOutputType = isAToB ? pool.coinTypeB : pool.coinTypeA;
      if (expectedOutputType !== params.outputToken.type) {
        throw new Error(`Output token ${params.outputToken.symbol} doesn't match expected pool token`);
      }
      
      // Calculate expected output to validate
      const FEE_NUMERATOR = BigInt(18); // 1.8% fee
      const FEE_DENOMINATOR = BigInt(1000);
      const feeAmount = (inputAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
      const amountInAfterFee = inputAmount - feeAmount;
      
      const reserveIn = isAToB ? pool.reserveA : pool.reserveB;
      const reserveOut = isAToB ? pool.reserveB : pool.reserveA;
      
      // Use the same formula as the Move contract
      const expectedOutput = (amountInAfterFee * reserveOut) / (reserveIn + amountInAfterFee);
      
      console.log('Swap calculation:', {
        inputAmount: inputAmount.toString(),
        feeAmount: feeAmount.toString(),
        amountInAfterFee: amountInAfterFee.toString(),
        reserveIn: reserveIn.toString(),
        reserveOut: reserveOut.toString(),
        expectedOutput: expectedOutput.toString(),
        isAToB,
        inputToken: params.inputToken.symbol,
        outputToken: params.outputToken.symbol,
      });
      
      if (expectedOutput === BigInt(0)) {
        throw new Error('Swap amount too small. The output would be zero after fees.');
      }
      
      // Check for u64 overflow in Move calculation
      const U64_MAX = BigInt(2) ** BigInt(64) - BigInt(1);
      const numerator = amountInAfterFee * reserveOut;
      if (numerator > U64_MAX) {
        // Calculate max safe amount
        const maxSafeAmount = U64_MAX / reserveOut;
        const maxSafeInput = maxSafeAmount * FEE_DENOMINATOR / (FEE_DENOMINATOR - FEE_NUMERATOR);
        const maxSafeInputFormatted = (Number(maxSafeInput) / 1e9).toFixed(6);
        throw new Error(`Swap amount too large. Maximum safe amount is approximately ${maxSafeInputFormatted} ${params.inputToken.symbol} due to calculation limits.`);
      }
      
      // Additional validation for very large swaps
      if (expectedOutput > reserveOut) {
        throw new Error('Swap amount too large. Not enough liquidity in the pool.');
      }
      
      // Check for minimum output (dust protection)
      const MIN_OUTPUT = BigInt(1000); // 0.000001 token
      if (expectedOutput < MIN_OUTPUT) {
        throw new Error('Output amount too small. Try swapping a larger amount.');
      }

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

      console.log('Creating transaction with package ID:', packageId);

      // Get all coins of the input type
      const coins = await client.getCoins({
        owner: currentAccount.address,
        coinType: params.inputToken.type,
      });

      console.log('Swap - Coins fetched:', {
        inputToken: params.inputToken.symbol,
        coinType: params.inputToken.type,
        coins: coins.data?.map(c => ({ id: c.coinObjectId, balance: c.balance })) || [],
      });
      
      // Additional debug for stIOTA
      if (params.inputToken.symbol === 'stIOTA') {
        console.log('stIOTA swap debug:', {
          expectedType: params.inputToken.type,
          supportedType: SUPPORTED_COINS.stIOTA.type,
          match: params.inputToken.type === SUPPORTED_COINS.stIOTA.type,
        });
        
        // Try fetching with exact type
        const certCoins = await client.getCoins({
          owner: currentAccount.address,
          coinType: '0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT',
        });
        console.log('CERT coins found:', certCoins.data?.length || 0);
      }

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
        // When swapping IOTA, use tx.gas to access the gas coin
        // This avoids "no valid gas coins" errors
        const [coinToUse] = tx.splitCoins(tx.gas, [inputAmount]);

        // Execute the swap
        console.log('Executing IOTA swap:', {
          isAToB,
          typeArguments: [pool.coinTypeA, pool.coinTypeB],
          poolId: pool.poolId,
          inputType: params.inputToken.type,
          outputType: params.outputToken.type,
          inputAmount: inputAmount.toString(),
          coinToUse,
          packageId,
          target: `${packageId}::simple_dex::swap_${isAToB ? 'a_to_b' : 'b_to_a'}`,
        });
        
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
        
        console.log('Non-IOTA token handling:', {
          coinCount: coins.data.length,
          totalBalance: totalBalance.toString(),
          inputAmount: inputAmount.toString(),
          needsSplit: totalBalance !== inputAmount,
        });
        
        let coinToSwap;
        if (coins.data.length === 1 && BigInt(coins.data[0].balance) === inputAmount) {
          // Use the coin directly if it matches exactly
          coinToSwap = coinRefs[0];
          console.log('Using coin directly (exact match)');
        } else {
          // Merge all coins first if multiple
          if (coinRefs.length > 1) {
            console.log('Merging multiple coins');
            tx.mergeCoins(coinRefs[0], coinRefs.slice(1));
          }
          // Split the exact amount needed
          console.log('Splitting coin for exact amount');
          [coinToSwap] = tx.splitCoins(coinRefs[0], [inputAmount]);
        }

        // Execute the swap
        console.log('Executing non-IOTA swap:', {
          isAToB,
          typeArguments: [pool.coinTypeA, pool.coinTypeB],
          poolId: pool.poolId,
          inputType: params.inputToken.type,
          outputType: params.outputToken.type,
          inputAmount: inputAmount.toString(),
          coinToSwap,
          packageId,
          target: `${packageId}::simple_dex::swap_${isAToB ? 'a_to_b' : 'b_to_a'}`,
        });
        
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
      
      // Set gas budget after all coin operations
      tx.setGasBudget(100000000); // 0.1 IOTA

      // Log the transaction before execution
      console.log('Transaction ready for execution:', {
        packageId,
        isAToB,
        poolId: pool.poolId,
        inputAmount: inputAmount.toString(),
        expectedOutput: expectedOutput.toString(),
        gasBudget: '100000000',
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
              showBalanceChanges: true,
              showInput: true,
            },
            requestType: 'WaitForLocalExecution',
          },
          {
            onSuccess: (result) => {
              console.log('Swap successful:', result);
              
              // Log transaction input for debugging
              if (result.rawTransaction) {
                console.log('Raw transaction:', result.rawTransaction);
              }
              
              // Check transaction effects
              if (result.effects?.status?.status) {
                console.log('Transaction status:', result.effects.status.status);
                if (result.effects.status.status !== 'success') {
                  console.error('Transaction failed with status:', result.effects.status);
                  if (result.effects.status.error) {
                    console.error('Transaction error:', result.effects.status.error);
                  }
                  // Transaction failed on chain
                  const errorMsg = result.effects.status.error || 'Transaction failed on chain';
                  toast.error(errorMsg);
                  reject(new Error(errorMsg));
                  return;
                }
              } else {
                console.warn('No transaction status found in effects');
              }
              
              // Extract actual swap amounts from object changes
              let actualOutputAmount = null;
              if (result.objectChanges) {
                console.log('Object changes:', result.objectChanges);
                
                // Look for created coin objects (output tokens)
                const createdCoins = result.objectChanges.filter(change => 
                  change.type === 'created' && 
                  change.objectType.includes('0x2::coin::Coin') &&
                  change.objectType.includes(params.outputToken.type)
                );
                
                if (createdCoins.length > 0 && createdCoins[0].owner) {
                  // Get the balance of the created coin
                  const createdCoin = createdCoins[0];
                  console.log('Created output coin:', createdCoin);
                  
                  // Try to extract balance from the object
                  if (result.effects?.created) {
                    const createdObject = result.effects.created.find(obj => 
                      obj.reference.objectId === createdCoin.objectId
                    );
                    if (createdObject) {
                      console.log('Created object details:', createdObject);
                    }
                  }
                }
                
                // Also check balance changes
                if (result.balanceChanges) {
                  console.log('Balance changes:', result.balanceChanges);
                  
                  // Look for input token decrease
                  const inputChange = result.balanceChanges.find(change =>
                    change.coinType === params.inputToken.type &&
                    change.owner === currentAccount?.address
                  );
                  if (inputChange) {
                    console.log('Input token change:', inputChange.amount, params.inputToken.symbol);
                  }
                  
                  // Look for output token increase
                  const outputChange = result.balanceChanges.find(change =>
                    change.coinType === params.outputToken.type &&
                    change.owner === currentAccount?.address
                  );
                  if (outputChange) {
                    actualOutputAmount = Math.abs(Number(outputChange.amount)) / Math.pow(10, params.outputToken.decimals);
                    console.log('Actual output amount:', actualOutputAmount);
                  }
                  
                  // If no balance changes, something is wrong
                  if (!inputChange && !outputChange) {
                    console.error('WARNING: No balance changes detected in swap transaction!');
                    console.error('This usually means the swap function was not executed properly.');
                  }
                }
              }
              
              // Log events for debugging
              if (result.events && result.events.length > 0) {
                console.log('Transaction events:', result.events);
                result.events.forEach((event: any) => {
                  console.log('Event:', {
                    type: event.type,
                    parsedJson: event.parsedJson,
                  });
                });
              } else {
                console.warn('No events emitted from transaction');
              }
              
              // Check if any Move calls were executed
              if (result.effects?.executed) {
                console.log('Executed Move calls:', result.effects.executed);
              }
              
              // Show success toast with actual swap details
              const outputAmountDisplay = actualOutputAmount 
                ? actualOutputAmount.toFixed(4) 
                : 'Check wallet';
              
              toast.success(`Swapped ${params.inputAmount} ${params.inputToken.symbol} for ${outputAmountDisplay} ${params.outputToken.symbol}`, {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });
              
              // Extract actual blockchain execution time if available
              let executionTime = null;
              if (result.effects) {
                // Check if we have timestamp information in effects
                const effects = result.effects as any;
                
                // IOTA provides gasUsed which can give us an idea of execution complexity
                // and timestampMs for when the transaction was executed
                if (effects.timestampMs) {
                  // If we have creation time, calculate from request to execution
                  const requestTime = Date.now();
                  executionTime = requestTime - parseInt(effects.timestampMs);
                } else if (effects.gasUsed) {
                  // Estimate based on gas used (rough approximation)
                  // Higher gas usage typically means more complex execution
                  const gasUsed = parseInt(effects.gasUsed.computationCost || '0');
                  // Convert gas to approximate seconds (very rough estimate)
                  executionTime = Math.max(0.5, Math.min(gasUsed / 1000000, 5)) * 1000;
                }
              }
              
              resolve({ 
                success: true, 
                digest: result.digest, 
                error: null,
                executionTime,
                effects: result.effects,
                events: result.events,
                actualOutputAmount
              });
            },
            onError: (error) => {
              console.error('Swap failed:', error);
              const errorMsg = error?.message || 'Transaction failed';
              
              // Log more details about the error
              console.error('Swap error details:', {
                error,
                inputToken: params.inputToken,
                outputToken: params.outputToken,
                inputAmount: params.inputAmount,
                poolId: pool.poolId,
              });
              
              if (errorMsg.includes('gas')) {
                toast.error('Gas issue: Try a smaller amount or add more IOTA to your wallet');
              } else if (errorMsg.includes('assert')) {
                toast.error('Pool reserves insufficient for this swap');
              } else if (errorMsg.includes('InsufficientCoinBalance')) {
                toast.error('Insufficient balance for swap');
              } else if (errorMsg.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
                toast.error('Output amount too small. Try swapping a larger amount.');
              } else if (errorMsg.includes('INSUFFICIENT_RESERVES')) {
                toast.error('Pool has insufficient reserves for this swap');
              } else {
                toast.error(`Swap failed: ${errorMsg.slice(0, 100)}`);
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