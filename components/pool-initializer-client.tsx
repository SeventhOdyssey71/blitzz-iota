'use client';

import { useEffect } from 'react';
import { initializeKnownPools } from '@/lib/services/pool-initializer';
import '@/lib/services/add-pool-from-tx'; // Import to make functions available globally

export function PoolInitializerClient() {
  useEffect(() => {
    initializeKnownPools();
    
    // Auto-add the user's pool if not already present
    import('@/lib/services/pool-tracker').then(({ PoolTracker }) => {
      const existingPool = PoolTracker.findPool(
        '0x2::iota::IOTA',
        '0x2be5c8f4de38b40f7a05ccde8559e7ab2c3fb27a96b5de8a70071c1a6518ec51::stiota::StIOTA'
      );
      
      if (!existingPool) {
        console.log('Auto-adding user pool from transaction');
        PoolTracker.addPool(
          '0x5a8dd3730b5bd7db6c7e527ab4ab5177ac60b5de88b3a00c696b08bb7c3fa3f4',
          '0x2::iota::IOTA',
          '0x2be5c8f4de38b40f7a05ccde8559e7ab2c3fb27a96b5de8a70071c1a6518ec51::stiota::StIOTA',
          'testnet'
        );
      }
    });
  }, []);
  
  return null;
}