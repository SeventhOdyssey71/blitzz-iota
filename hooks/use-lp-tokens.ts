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

export function useLPTokens() {
  const currentAccount = useCurrentAccount();
  const packageId = blitz_PACKAGE_ID.testnet;

  console.log('useLPTokens - Account:', currentAccount?.address);
  console.log('useLPTokens - Package ID:', packageId);
  console.log('useLPTokens - Looking for:', `${packageId}::simple_dex::LPToken`);

  // Get all objects owned by the user
  const { data: ownedObjects, isLoading, error } = useIotaClientQuery(
    'getOwnedObjects',
    {
      owner: currentAccount?.address || '',
      filter: {
        StructType: `${packageId}::simple_dex::LPToken`
      },
      options: {
        showContent: true,
        showType: true,
      }
    },
    {
      enabled: !!currentAccount?.address && packageId !== '0x0',
    }
  );

  // Parse LP tokens
  const lpTokens: LPToken[] = [];
  
  console.log('useLPTokens - Owned objects:', ownedObjects);
  console.log('useLPTokens - Error:', error);
  
  if (ownedObjects?.data) {
    console.log('useLPTokens - Found objects count:', ownedObjects.data.length);
    
    for (const obj of ownedObjects.data) {
      console.log('useLPTokens - Processing object:', obj);
      
      if (obj.data?.content?.dataType === 'moveObject') {
        const fields = obj.data.content.fields as any;
        const type = obj.data.type || '';
        
        console.log('useLPTokens - Object type:', type);
        console.log('useLPTokens - Object fields:', fields);
        
        // Extract coin types from the type string
        // Format: packageId::simple_dex::LPToken<CoinTypeA, CoinTypeB>
        const typeMatch = type.match(/<(.+),\s*(.+)>/);
        if (typeMatch) {
          const coinTypeA = typeMatch[1].trim();
          const coinTypeB = typeMatch[2].trim();
          
          console.log('useLPTokens - Coin types:', { coinTypeA, coinTypeB });
          
          // Only include IOTA/stIOTA LP tokens
          const isIotaStIotaPair = 
            (coinTypeA === SUPPORTED_COINS.IOTA.type && coinTypeB === SUPPORTED_COINS.stIOTA.type) ||
            (coinTypeA === SUPPORTED_COINS.stIOTA.type && coinTypeB === SUPPORTED_COINS.IOTA.type);
          
          console.log('useLPTokens - Is IOTA/stIOTA pair:', isIotaStIotaPair);
          
          if (isIotaStIotaPair) {
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

  return {
    lpTokens,
    isLoading,
    error,
  };
}