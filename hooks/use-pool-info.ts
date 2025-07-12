'use client';

import { useEffect, useState } from 'react';
import { PoolDiscovery, PoolInfo } from '@/lib/services/pool-discovery';

export function usePoolInfo(coinTypeA: string, coinTypeB: string) {
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchPoolInfo = async () => {
      try {
        setIsLoading(true);
        const pool = await PoolDiscovery.findPoolsForPair(coinTypeA, coinTypeB, 'testnet');
        
        if (mounted) {
          setPoolInfo(pool);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch pool info'));
          setPoolInfo(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPoolInfo();
    
    // Refresh pool info every 30 seconds
    const interval = setInterval(fetchPoolInfo, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [coinTypeA, coinTypeB]);

  return {
    poolInfo,
    isLoading,
    error,
  };
}