'use client';

// Pool tracker to store created pool IDs
// In production, this would be stored in a database or retrieved from chain events

interface PoolRecord {
  poolId: string;
  coinTypeA: string;
  coinTypeB: string;
  createdAt: number;
  network?: string;
}

const POOL_STORAGE_KEY = 'blitz_created_pools';

export class PoolTracker {
  static getPools(): PoolRecord[] {
    if (typeof window === 'undefined') return [];
    
    const stored = localStorage.getItem(POOL_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  static addPool(poolId: string, coinTypeA: string, coinTypeB: string, network?: string) {
    if (typeof window === 'undefined') return;
    
    const pools = this.getPools();
    const newPool: PoolRecord = {
      poolId,
      coinTypeA,
      coinTypeB,
      createdAt: Date.now(),
      network,
    };
    
    // Check if pool already exists
    const exists = pools.some(p => p.poolId === poolId);
    if (!exists) {
      pools.push(newPool);
      localStorage.setItem(POOL_STORAGE_KEY, JSON.stringify(pools));
      console.log('Pool saved to tracker:', newPool);
    }
  }

  static findPool(coinTypeA: string, coinTypeB: string): string | null {
    const pools = this.getPools();
    console.log('PoolTracker - Looking for pool:', { coinTypeA, coinTypeB });
    console.log('PoolTracker - Available pools:', pools);
    
    // Check both orders
    const pool = pools.find(p => 
      (p.coinTypeA === coinTypeA && p.coinTypeB === coinTypeB) ||
      (p.coinTypeA === coinTypeB && p.coinTypeB === coinTypeA)
    );
    
    console.log('PoolTracker - Found pool:', pool);
    return pool ? pool.poolId : null;
  }

  static clearPools() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(POOL_STORAGE_KEY);
  }
  
  static savePool(params: {
    poolId: string;
    coinTypeA: string;
    coinTypeB: string;
    network?: string;
  }) {
    this.addPool(params.poolId, params.coinTypeA, params.coinTypeB, params.network);
  }
}