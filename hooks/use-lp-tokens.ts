'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useIotaClientQuery } from '@iota/dapp-kit';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';

interface LPToken {
  id: string;
  amount: string;
  poolType: string;
  coinTypeA: string;
  coinTypeB: string;
  symbolA: string;
  symbolB: string;
}

interface UseLPTokensResult {
  lpTokens: LPToken[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const getCoinSymbol = (type: string): string => {
  if (type === SUPPORTED_COINS.IOTA.type) return 'IOTA';
  if (type === SUPPORTED_COINS.stIOTA.type) return 'stIOTA';
  if (type === SUPPORTED_COINS.vUSD.type) return 'vUSD';
  
  // Extract symbol from type string for other coins
  const match = type.match(/::([^:]+)::([^:]+)$/);
  return match ? match[2] : 'UNKNOWN';
};

export function useLPTokens(): UseLPTokensResult {
  const currentAccount = useCurrentAccount();
  const packageId = blitz_PACKAGE_ID.testnet;
  const [refreshKey, setRefreshKey] = useState(0);

  const { 
    data: ownedObjects, 
    isLoading, 
    error,
    refetch: queryRefetch 
  } = useIotaClientQuery(
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
      staleTime: 30000, // 30 seconds
      gcTime: 300000, // 5 minutes
      refetchInterval: 60000, // 1 minute
    }
  );

  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    queryRefetch();
  }, [queryRefetch]);

  // Listen for pool cache refresh events
  useEffect(() => {
    const handlePoolRefresh = () => {
      refetch();
    };
    
    window.addEventListener('pool-cache-refresh', handlePoolRefresh);
    return () => window.removeEventListener('pool-cache-refresh', handlePoolRefresh);
  }, [refetch]);

  // Parse LP tokens from owned objects
  const lpTokens: LPToken[] = [];
  
  if (ownedObjects?.data) {
    for (const obj of ownedObjects.data) {
      if (obj.data?.content?.dataType === 'moveObject') {
        const fields = obj.data.content.fields as any;
        const type = obj.data.type || '';
        
        // Extract coin types from LP token type
        // Format: packageId::simple_dex::LPToken<CoinTypeA, CoinTypeB>
        const typeMatch = type.match(/<([^,]+),\s*([^>]+)>/);
        if (typeMatch) {
          const coinTypeA = typeMatch[1].trim();
          const coinTypeB = typeMatch[2].trim();
          const symbolA = getCoinSymbol(coinTypeA);
          const symbolB = getCoinSymbol(coinTypeB);
          
          lpTokens.push({
            id: obj.data.objectId,
            amount: fields.amount?.toString() || '0',
            poolType: type,
            coinTypeA,
            coinTypeB,
            symbolA,
            symbolB,
          });
        }
      }
    }
  }

  // Sort LP tokens by amount (descending)
  lpTokens.sort((a, b) => {
    const amountA = BigInt(a.amount || '0');
    const amountB = BigInt(b.amount || '0');
    return amountA > amountB ? -1 : amountA < amountB ? 1 : 0;
  });

  return {
    lpTokens,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}