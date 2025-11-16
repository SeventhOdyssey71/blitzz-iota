'use client';

import { useEffect } from 'react';
import { initializeKnownPools } from '@/lib/services/pool-initializer';
import '@/lib/services/add-pool-from-tx'; // Import to make functions available globally

export function PoolInitializerClient() {
  useEffect(() => {
    initializeKnownPools();
    
    // Clear any stale pool data on initialization
    import('@/lib/services/pool-tracker').then(({ PoolTracker }) => {
      // Clear any invalid pools that may be causing cached funds issues
      console.log('Pool initializer: Clearing stale pool tracker data');
      PoolTracker.clearPools();
    });
    
    // Clear pool discovery cache to force fresh lookup
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('pool-cache-refresh'));
    }
  }, []);
  
  return null;
}