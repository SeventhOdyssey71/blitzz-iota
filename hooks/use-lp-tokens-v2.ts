'use client';

import { useCurrentAccount, useIotaClientQuery } from '@iota/dapp-kit';
import { SUPPORTED_COINS, blitz_PACKAGE_ID } from '@/config/iota.config';

interface LPToken {
  id: string;
  amount: string;
  poolType: string;
  coinTypeA: string;
  coinTypeB: string;
}

export function useLPTokensV2() {
  const currentAccount = useCurrentAccount();
  const packageId = blitz_PACKAGE_ID.testnet;

  // Get ALL objects owned by the user first
  const { data: allObjects, isLoading: isLoadingAll, error: errorAll } = useIotaClientQuery(
    'getOwnedObjects',
    {
      owner: currentAccount?.address || '',
      options: {
        showContent: true,
        showType: true,
      }
    },
    {
      enabled: !!currentAccount?.address,
    }
  );

  console.log('useLPTokensV2 - All objects:', allObjects);

  // Parse LP tokens from all objects
  const lpTokens: LPToken[] = [];
  
  if (allObjects?.data) {
    for (const obj of allObjects.data) {
      const type = obj.data?.type || '';
      
      // Check if this is an LP token from our package
      if (type.includes(`${packageId}::simple_dex::LPToken`)) {
        console.log('useLPTokensV2 - Found LP token:', obj);
        
        if (obj.data?.content?.dataType === 'moveObject') {
          const fields = obj.data.content.fields as any;
          
          // Extract coin types from the type string
          const typeMatch = type.match(/<(.+),\s*(.+)>/);
          if (typeMatch) {
            const coinTypeA = typeMatch[1].trim();
            const coinTypeB = typeMatch[2].trim();
            
            // Include all LP tokens, not just IOTA/stIOTA
            lpTokens.push({
              id: obj.data.objectId,
              amount: fields.amount || '0',
              poolType: type,
              coinTypeA,
              coinTypeB,
            });
          }
        }
      }
    }
  }

  console.log('useLPTokensV2 - Found LP tokens:', lpTokens);

  return {
    lpTokens,
    isLoading: isLoadingAll,
    error: errorAll,
  };
}