'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID } from '@/config/iota.config';
import { PoolDiscovery } from '@/lib/services/pool-discovery';
import { PoolTracker } from '@/lib/services/pool-tracker';
import { toast } from 'sonner';
import { getPoolForLPToken, mapLPTokenToPool } from '@/lib/services/lp-pool-mapper';

interface RemoveLiquidityParams {
  tokenA: {
    type: string;
    symbol: string;
    decimals: number;
  };
  tokenB: {
    type: string;
    symbol: string;
    decimals: number;
  };
  lpTokenId: string;
  lpAmount: string;
  poolId?: string; // Optional pool ID if known
}

export function useRemoveLiquidityV2() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isRemoving, setIsRemoving] = useState(false);

  const removeLiquidity = async (params: RemoveLiquidityParams) => {
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsRemoving(true);

      // Get LP token object to extract pool information
      const lpTokenObject = await client.getObject({
        id: params.lpTokenId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!lpTokenObject.data) {
        throw new Error('LP token not found');
      }

      console.log('LP Token details:', lpTokenObject.data);

      // Extract coin types and amount from LP token
      const lpTokenType = lpTokenObject.data.type || '';
      const typeMatch = lpTokenType.match(/<(.+),\s*(.+)>/);
      
      let coinTypeA = params.tokenA.type;
      let coinTypeB = params.tokenB.type;
      
      if (typeMatch) {
        coinTypeA = typeMatch[1].trim();
        coinTypeB = typeMatch[2].trim();
        console.log('Extracted types from LP token:', { coinTypeA, coinTypeB });
      }
      
      // Get LP token amount
      let lpAmount = '0';
      if (lpTokenObject.data?.content?.dataType === 'moveObject') {
        const fields = lpTokenObject.data.content.fields as any;
        lpAmount = fields.amount || '0';
        console.log('LP token amount:', lpAmount);
      }

      // Try multiple methods to find the pool
      let pool = null;
      let poolId = params.poolId;

      // Method 1: Check LP token mapping
      if (!poolId) {
        poolId = getPoolForLPToken(params.lpTokenId);
        if (poolId) {
          console.log('Found pool from LP token mapping:', poolId);
        }
      }

      // Method 2: Use provided pool ID
      if (!poolId) {
        // Method 2: Try pool discovery
        pool = await PoolDiscovery.findPoolsForPair(coinTypeA, coinTypeB, 'testnet');
        
        if (!pool) {
          // Method 3: Try reverse order
          pool = await PoolDiscovery.findPoolsForPair(coinTypeB, coinTypeA, 'testnet');
        }
        
        if (!pool) {
          // Method 4: Check tracked pools
          poolId = PoolTracker.findPool(coinTypeA, coinTypeB);
          
          if (!poolId) {
            // Method 5: Get all tracked pools and find matching one
            const allPools = PoolTracker.getPools();
            const matchingPool = allPools.find(p => 
              (p.coinTypeA === coinTypeA && p.coinTypeB === coinTypeB) ||
              (p.coinTypeA === coinTypeB && p.coinTypeB === coinTypeA)
            );
            
            if (matchingPool) {
              poolId = matchingPool.poolId;
              console.log('Found pool in tracker:', poolId);
            }
          }
        } else {
          poolId = pool.poolId;
        }
      }

      if (!poolId) {
        // Last resort: prompt user for pool ID
        const userPoolId = prompt(
          `Could not automatically find the pool. Please enter the pool ID for ${params.tokenA.symbol}/${params.tokenB.symbol}:`
        );
        
        if (userPoolId) {
          poolId = userPoolId;
          // Save for future use
          PoolTracker.addPool(poolId, coinTypeA, coinTypeB, 'testnet');
          // Also map the LP token to this pool
          mapLPTokenToPool(params.lpTokenId, poolId);
        } else {
          throw new Error('Pool ID required to remove liquidity');
        }
      }

      console.log('Using pool ID:', poolId);
      
      // Fetch pool details to verify state
      try {
        const poolObject = await client.getObject({
          id: poolId,
          options: {
            showContent: true,
            showType: true,
          },
        });
        
        if (poolObject.data?.content?.dataType === 'moveObject') {
          const fields = poolObject.data.content.fields as any;
          console.log('Pool state:', {
            reserveA: fields.reserve_a,
            reserveB: fields.reserve_b,
            lpSupply: fields.lp_supply,
          });
          
          // Extract actual pool types from the pool object type
          const poolType = poolObject.data.type || '';
          const poolTypeMatch = poolType.match(/<(.+),\s*(.+)>/);
          if (poolTypeMatch) {
            // Use the actual pool types to ensure correct ordering
            coinTypeA = poolTypeMatch[1].trim();
            coinTypeB = poolTypeMatch[2].trim();
            console.log('Using pool types:', { coinTypeA, coinTypeB });
          }
          
          // Verify pool has liquidity
          const lpSupply = BigInt(fields.lp_supply || 0);
          if (lpSupply === 0n) {
            throw new Error('Pool has no LP supply');
          }
        }
      } catch (error) {
        console.error('Error fetching pool state:', error);
      }

      // Create transaction
      const tx = new Transaction();
      const packageId = blitz_PACKAGE_ID.testnet;

      // Ensure type arguments match the pool's type order
      // The LP token type should match the pool type exactly
      console.log('Transaction details:', {
        target: `${packageId}::simple_dex::remove_liquidity`,
        typeArguments: [coinTypeA, coinTypeB],
        poolId,
        lpTokenId: params.lpTokenId,
      });
      
      // Create the remove liquidity call
      // Note: LP token is passed by value (not reference) to be consumed
      tx.moveCall({
        target: `${packageId}::simple_dex::remove_liquidity`,
        typeArguments: [coinTypeA, coinTypeB],
        arguments: [
          tx.object(poolId),
          tx.object(params.lpTokenId), // This will be consumed
          tx.pure.u64(0n), // min amount A (0 for now)
          tx.pure.u64(0n), // min amount B (0 for now)
        ],
      });

      console.log('Remove liquidity transaction ready');

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
              console.log('Liquidity removed successfully:', result);
              
              toast.success('Liquidity removed successfully!', {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });
              
              resolve({
                success: true,
                digest: result.digest,
              });
            },
            onError: (error) => {
              console.error('Failed to remove liquidity:', error);
              
              const errorMessage = error?.message || error?.toString() || 'Unknown error';
              
              toast.error('Failed to remove liquidity', {
                description: errorMessage.slice(0, 200),
              });
              
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      console.error('Remove liquidity error:', error);
      toast.error('Failed to remove liquidity', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      setIsRemoving(false);
    }
  };

  return {
    removeLiquidity,
    isRemoving,
  };
}