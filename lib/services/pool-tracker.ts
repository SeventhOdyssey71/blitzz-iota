'use client';

// Pool tracker to store created pool IDs
// In production, this would be stored in a database or retrieved from chain events

interface PoolRecord {
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
  createdAt: number;
}

const POOL_STORAGE_KEY = 'blitz_created_pools';

export class PoolTracker {
  static getPools(): PoolRecord[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(POOL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static addPool(poolId: string, coinTypeA: string, coinTypeB: string) {
    if (typeof window === 'undefined') return;
    
    const pools = this.getPools();
    const newPool: PoolRecord = {
      poolId,
      coinTypeA,
      coinTypeB,
      createdAt: Date.now(),
    };
    
    // Check if pool already exists
    const exists = pools.some(p => p.poolId === poolId);
    if (!exists) {
      pools.push(newPool);
      localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(pools));
    }
  }

  static findPool(coinTypeA: string, coinTypeB: string): string | null {
    const pools = this.getPools();
    
    // Check both orders
    const pool = pools.find(p => 
      (p.coinTypeA === coinTypeA && p.coinTypeB === coinTypeB) ||
      (p.coinTypeA === coinTypeB && p.coinTypeB === coinTypeA)
    );
    
    return pool ? pool.poolId : null;
  }

  static clearPools() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(POOL_STORAGE_KEY);
  }
}