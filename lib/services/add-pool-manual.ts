'use client';

import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';

// Function to manually add a pool from a transaction
export function addPoolFromTransaction(poolId: string, network: 'testnet' | 'mainnet' | 'devnet' = 'testnet') {
  console.log('Manually adding pool:', poolId);
  
  // Add to pool tracker
  PoolTracker.addPool(
    poolId,
    SUPPORTED_COINS.IOTA.type,
    SUPPORTED_COINS.stIOTA.type,
    network
  );
  
  // Clear cache to force refresh
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pool-cache-refresh'));
  }
  
  console.log('Pool added successfully. Current pools:', PoolTracker.getPools());
  
  return {
    success: true,
    poolId,
    message: `Pool ${poolId} added for IOTA/stIOTA on ${network}`
  };
}

// Export for easy console access
if (typeof window !== 'undefined') {
  (window as any).addPoolFromTransaction = addPoolFromTransaction;
}