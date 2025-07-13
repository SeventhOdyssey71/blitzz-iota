'use client';

import { PoolTracker } from './pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';

// Initialize known pools in the browser
export function initializeKnownPools() {
  if (typeof window === 'undefined') return;
  
  // Clear old pools from previous contract deployments
  const pools = PoolTracker.getPools();
  const oldPoolIds = [
    // Previous deployments
    '0x392d2ce006b93d057026999fb6d08c6910449ea0b3998d1b54d57a0b8b5f100f',
    '0x8c48e9e7347f8385bf400e269948b6d4d5460e84792cd18a512ddf998474f7d1',
    '0x481854a6bbb4026817640e3ccb50879b3d2a132ed0f1e547f8babe47143e0eb6',
    '0xbdf257ff7fb35bbb2b6ff24de08d26cc50833b3ea1f0b86e4d5051b5424ed767'
  ];
  
  // Filter out old pools
  const validPools = pools.filter(p => !oldPoolIds.includes(p.poolId));
  
  if (validPools.length < pools.length) {
    // Clear and re-save only valid pools
    PoolTracker.clearPools();
    validPools.forEach(pool => {
      PoolTracker.savePool(pool);
    });
    console.log('Cleared old pools from previous contract');
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