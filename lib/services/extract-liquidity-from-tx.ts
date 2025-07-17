'use client';

import { getSafeIotaClient } from '@/lib/iota/safe-client';
import { refreshPoolCache } from './pool-refresh';

interface LiquidityAdditionResult {
  success: boolean;
  poolId?: string;
  lpTokenId?: string;
  message: string;
  poolInfo?: {
    coinTypeA: string;
    coinTypeB: string;
    newReserveA?: string;
    newReserveB?: string;
  };
}

export async function extractLiquidityFromTransaction(txDigest: string): Promise<LiquidityAdditionResult> {
  const client = getSafeIotaClient();
  
  try {
    console.log('Fetching liquidity addition transaction:', txDigest);
    
    // Get transaction details
    const tx = await client.getTransactionBlock({
      digest: txDigest,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showEvents: true,
        showInput: true,
      }
    });
    
    if (!tx) {
      return {
        success: false,
        message: 'Transaction not found'
      };
    }
    
    // Look for mutated pool objects (liquidity additions modify existing pools)
    let poolInfo = null;
    let lpTokenId = null;
    
    if (tx.objectChanges) {
      for (const change of tx.objectChanges) {
        // Check for mutated pool
        if (change.type === 'mutated' && 
            change.objectType && 
            (change.objectType.includes('::simple_dex::Pool') || 
             change.objectType.includes('::dex::Pool'))) {
          
          // Extract pool ID and type information
          const poolType = change.objectType;
          const typeArgsMatch = poolType.match(/<(.+), (.+)>/);
          
          if (typeArgsMatch) {
            const [, coinTypeA, coinTypeB] = typeArgsMatch;
            poolInfo = {
              poolId: change.objectId,
              coinTypeA: coinTypeA.trim(),
              coinTypeB: coinTypeB.trim(),
            };
            console.log('Found mutated pool:', poolInfo);
          }
        }
        
        // Check for created LP tokens
        if (change.type === 'created' && 
            change.objectType && 
            (change.objectType.includes('::simple_dex::LPToken') || 
             change.objectType.includes('::dex::LPToken'))) {
          lpTokenId = change.objectId;
          console.log('Found created LP token:', lpTokenId);
        }
      }
    }
    
    if (poolInfo) {
      // Fetch the updated pool state
      try {
        const poolObject = await client.getObject({
          id: poolInfo.poolId,
          options: {
            showContent: true,
            showType: true,
          }
        });
        
        if (poolObject.data?.content?.dataType === 'moveObject') {
          const fields = poolObject.data.content.fields as any;
          
          // Extract new reserve values
          const newReserveA = fields.reserve_a?.fields?.value || fields.reserve_a || '0';
          const newReserveB = fields.reserve_b?.fields?.value || fields.reserve_b || '0';
          
          poolInfo.poolInfo = {
            coinTypeA: poolInfo.coinTypeA,
            coinTypeB: poolInfo.coinTypeB,
            newReserveA,
            newReserveB,
          };
          
          console.log('Updated pool reserves:', {
            reserveA: newReserveA,
            reserveB: newReserveB,
            lpSupply: fields.lp_supply
          });
        }
      } catch (error) {
        console.error('Error fetching updated pool state:', error);
      }
      
      // Trigger pool cache refresh
      console.log('Refreshing pool cache after liquidity addition...');
      await refreshPoolCache();
      
      // Also dispatch event for UI updates
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('liquidity-added', {
          detail: {
            poolId: poolInfo.poolId,
            txDigest,
            lpTokenId,
          }
        }));
      }
      
      return {
        success: true,
        poolId: poolInfo.poolId,
        lpTokenId,
        message: `Successfully detected liquidity addition to pool ${poolInfo.poolId}`,
        poolInfo: poolInfo.poolInfo
      };
    }
    
    return {
      success: false,
      message: 'No liquidity addition found in transaction. This might be a different type of transaction.'
    };
    
  } catch (error) {
    console.error('Error extracting liquidity from transaction:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).extractLiquidityFromTransaction = extractLiquidityFromTransaction;
}