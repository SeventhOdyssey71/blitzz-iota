'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PoolDiscovery, PoolInfo } from '@/lib/services/pool-discovery';

interface UsePoolInfoResult {
  poolInfo: PoolInfo | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePoolInfo(coinTypeA: string, coinTypeB: string): UsePoolInfoResult {
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create cache key for this pool pair
  const cacheKey = useMemo(() => {
    if (!coinTypeA || !coinTypeB) return null;
    const sortedTypes = [coinTypeA, coinTypeB].sort();
    return `pool_${sortedTypes[0]}_${sortedTypes[1]}`;
  }, [coinTypeA, coinTypeB]);

  const fetchPoolInfo = useCallback(async () => {
    if (!coinTypeA || !coinTypeB || !cacheKey) {
      setPoolInfo(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const pool = await PoolDiscovery.findPoolsForPair(coinTypeA, coinTypeB, 'testnet');
      setPoolInfo(pool);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch pool info'));
      setPoolInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [coinTypeA, coinTypeB, cacheKey, refreshKey]);

  const refetch = useCallback(() => {
    setIsLoading(true);
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const runFetch = async () => {
      if (mounted) {
        setIsLoading(true);
        await fetchPoolInfo();
      }
    };

    runFetch();
    
    // Set up refresh interval (30 seconds for better performance)
    const interval = setInterval(() => {
      if (mounted) {
        fetchPoolInfo();
      }
    }, 30000);
    
    // Listen for pool cache refresh events
    const handlePoolRefresh = () => {
      if (mounted) {
        fetchPoolInfo();
      }
    };
    
    window.addEventListener('pool-cache-refresh', handlePoolRefresh);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('pool-cache-refresh', handlePoolRefresh);
    };
  }, [fetchPoolInfo]);

  return {
    poolInfo,
    isLoading,
    error,
    refetch,
  };
}