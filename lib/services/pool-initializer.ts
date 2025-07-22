'use client';

import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';

// Initialize known pools in the browser
export function initializeKnownPools() {
  if (typeof window === 'undefined') return;
  
  // Check if we need to clear pools for new package
  const CURRENT_PACKAGE_ID = '0x620f8a39ec678170db2b2ed8cee5cc6a3d5b4802acd8a8905919c2e7bd5d52bb';
  const lastPackageId = localStorage.getItem('blitz_last_package_id');
  
  if (lastPackageId !== CURRENT_PACKAGE_ID) {
    console.log('New package detected, clearing all pools...');
    // Clear ALL pools since we have a new package
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
    console.log('All pools cleared for new package deployment');
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