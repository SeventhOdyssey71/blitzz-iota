/**
 * Production-ready caching system
 */

import { log } from '@/lib/logging';

export interface CacheEntry<T = any> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
  readonly hits: number;
}

export interface CacheStats {
  readonly size: number;
  readonly maxSize: number;
  readonly hitRate: number;
  readonly totalHits: number;
  readonly totalMisses: number;
  readonly totalSets: number;
  readonly totalDeletes: number;
  readonly oldestEntry?: number;
  readonly newestEntry?: number;
}

export interface CacheOptions {
  readonly defaultTTL?: number;
  readonly maxSize?: number;
  readonly enableStats?: boolean;
  readonly onEvict?: (key: string, value: any) => void;
}

// LRU Cache implementation with TTL support
class LRUCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    evictions: 0,
  };
  
  private accessCounter = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private options: CacheOptions = {}) {
    const {
      defaultTTL = 300000, // 5 minutes
      maxSize = 1000,
      enableStats = true,
    } = options;

    this.options = {
      defaultTTL,
      maxSize,
      enableStats,
      ...options,
    };

    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const entryTTL = ttl ?? this.options.defaultTTL!;
    
    // Check if we need to evict entries
    if (this.cache.size >= this.options.maxSize! && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      ttl: entryTTL,
      hits: 0,
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    
    if (this.options.enableStats) {
      this.stats.sets++;
    }

    log.debug('Cache set', { key, ttl: entryTTL, cacheSize: this.cache.size });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.options.enableStats) {
        this.stats.misses++;
      }
      log.debug('Cache miss', { key });
      return undefined;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      if (this.options.enableStats) {
        this.stats.misses++;
      }
      log.debug('Cache expired', { key, age: now - entry.timestamp, ttl: entry.ttl });
      return undefined;
    }

    // Update access order and hit count
    this.accessOrder.set(key, ++this.accessCounter);
    entry.hits++;
    
    if (this.options.enableStats) {
      this.stats.hits++;
    }

    log.debug('Cache hit', { key, hits: entry.hits, age: now - entry.timestamp });
    return entry.data;
  }

  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    this.accessOrder.delete(key);
    
    if (existed && this.options.enableStats) {
      this.stats.deletes++;
    }

    return existed;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCounter = 0;
  }

  private evictLRU(): void {
    let oldestKey: string | undefined;
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      this.delete(oldestKey);
      
      if (this.options.onEvict && entry) {
        this.options.onEvict(oldestKey, entry.data);
      }
      
      if (this.options.enableStats) {
        this.stats.evictions++;
      }

      log.debug('Cache LRU eviction', { key: oldestKey, accessTime: oldestAccess });
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));

    if (keysToDelete.length > 0) {
      log.debug('Cache cleanup', { expiredKeys: keysToDelete.length, remainingKeys: this.cache.size });
    }
  }

  getStats(): CacheStats {
    const now = Date.now();
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    for (const entry of this.cache.values()) {
      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      size: this.cache.size,
      maxSize: this.options.maxSize!,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      totalSets: this.stats.sets,
      totalDeletes: this.stats.deletes,
      oldestEntry,
      newestEntry,
    };
  }

  // Get keys sorted by access time (most recent first)
  getKeysByAccess(): string[] {
    const entries = Array.from(this.accessOrder.entries());
    entries.sort((a, b) => b[1] - a[1]); // Sort by access counter descending
    return entries.map(([key]) => key);
  }

  // Get entries sorted by hit count (most popular first)
  getKeysByPopularity(): string[] {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => b[1].hits - a[1].hits);
    return entries.map(([key]) => key);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Cache manager for different cache types
export class CacheManager {
  private static instance: CacheManager | null = null;
  private caches = new Map<string, LRUCache>();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  createCache<T = any>(name: string, options?: CacheOptions): LRUCache<T> {
    if (this.caches.has(name)) {
      throw new Error(`Cache '${name}' already exists`);
    }

    const cache = new LRUCache<T>(options);
    this.caches.set(name, cache);
    
    log.info('Cache created', { name, options });
    return cache;
  }

  getCache<T = any>(name: string): LRUCache<T> | undefined {
    return this.caches.get(name) as LRUCache<T> | undefined;
  }

  destroyCache(name: string): boolean {
    const cache = this.caches.get(name);
    if (cache) {
      cache.destroy();
      this.caches.delete(name);
      log.info('Cache destroyed', { name });
      return true;
    }
    return false;
  }

  getAllStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }

    return stats;
  }

  cleanup(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
}

// Pre-configured caches for common use cases
const cacheManager = CacheManager.getInstance();

// Price data cache - frequent updates, short TTL
export const priceCache = cacheManager.createCache('prices', {
  defaultTTL: 30000, // 30 seconds
  maxSize: 100,
  enableStats: true,
});

// Pool data cache - moderate updates, medium TTL  
export const poolCache = cacheManager.createCache('pools', {
  defaultTTL: 300000, // 5 minutes
  maxSize: 200,
  enableStats: true,
});

// Transaction data cache - infrequent updates, long TTL
export const transactionCache = cacheManager.createCache('transactions', {
  defaultTTL: 3600000, // 1 hour
  maxSize: 1000,
  enableStats: true,
});

// Analytics cache - expensive queries, very long TTL
export const analyticsCache = cacheManager.createCache('analytics', {
  defaultTTL: 7200000, // 2 hours
  maxSize: 50,
  enableStats: true,
});

// DCA cache - strategy and execution data
export const dcaCache = cacheManager.createCache('dca', {
  defaultTTL: 600000, // 10 minutes
  maxSize: 300,
  enableStats: true,
});

// Cache key generators
export const cacheKeys = {
  tokenPrice: (symbol: string) => `price:${symbol}`,
  poolInfo: (tokenA: string, tokenB: string) => `pool:${tokenA}:${tokenB}`,
  poolReserves: (poolId: string) => `reserves:${poolId}`,
  swapQuote: (inputToken: string, outputToken: string, amount: string) => 
    `quote:${inputToken}:${outputToken}:${amount}`,
  userBalance: (address: string, tokenType: string) => `balance:${address}:${tokenType}`,
  analytics: (type: string, timeframe: string) => `analytics:${type}:${timeframe}`,
};

// Utility functions for common caching patterns
export const withCache = async <T>(
  cache: LRUCache<T>,
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  // Try to get from cache first
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Fetch fresh data
  try {
    const data = await fetcher();
    cache.set(key, data, ttl);
    return data;
  } catch (error) {
    log.error('Cache fetcher failed', { key }, error instanceof Error ? error : undefined);
    throw error;
  }
};

export const invalidateCache = (cache: LRUCache, pattern: string): number => {
  let count = 0;
  const keys = cache.getKeysByAccess();
  
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.delete(key);
      count++;
    }
  }

  log.debug('Cache invalidation', { pattern, invalidatedKeys: count });
  return count;
};

export { cacheManager, LRUCache };