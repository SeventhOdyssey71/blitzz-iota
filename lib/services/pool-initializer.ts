'use client';

import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS, blitz_PACKAGE_ID, DEFAULT_NETWORK } from '@/config/iota.config';

// Initialize known pools in the browser
export function initializeKnownPools() {
  if (typeof window === 'undefined') return;
  
  // Use the correct package ID from config
  const CURRENT_PACKAGE_ID = blitz_PACKAGE_ID[DEFAULT_NETWORK];
  const lastPackageId = localStorage.getItem('blitz_last_package_id');
  
  if (lastPackageId !== CURRENT_PACKAGE_ID) {
    console.log('Package ID change detected, clearing all stale pools...', {
      old: lastPackageId,
      new: CURRENT_PACKAGE_ID
    });
    // Clear ALL pools since we have a new/different package
    PoolTracker.clearPools();
    localStorage.removeItem('pool_cache');
    localStorage.removeItem('blitz_pool_cache');
    
    // Clear any other pool-related storage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('pool') || key.includes('Pool'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Set the new package ID
    localStorage.setItem('blitz_last_package_id', CURRENT_PACKAGE_ID);
    
    // Dispatch refresh event
    window.dispatchEvent(new Event('pool-cache-refresh'));
    console.log('All stale pools cleared for package:', CURRENT_PACKAGE_ID);
  }
  
  // Check if we have any IOTA/stIOTA pool
  const existingPool = PoolTracker.findPool(
    SUPPORTED_COINS.IOTA.type, 
    SUPPORTED_COINS.stIOTA.type
  );
  
  if (!existingPool) {
    console.log('No IOTA/stIOTA pool found. Please create a new pool.');
  }
}