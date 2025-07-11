// Mock pool data for development
import { SUPPORTED_COINS, STAKING_POOL_ADDRESS, STIOTA_TYPE } from '@/config/iota.config';
import { PoolInfo } from './pool-discovery';

// Mock pools for testing
export const MOCK_POOLS: PoolInfo[] = [
  // IOTA <-> stIOTA staking pool
  {
    poolId: STAKING_POOL_ADDRESS,
    coinTypeA: SUPPORTED_COINS.IOTA.type,
    coinTypeB: SUPPORTED_COINS.stIOTA.type,
    reserveA: BigInt(10000000000000), // 10,000 IOTA
    reserveB: BigInt(9900000000000),  // 9,900 stIOTA (1.01 exchange rate)
    lpSupply: BigInt(10000000000000),
    feePercentage: 10, // 0.1%
  },
  // IOTA <-> vUSD pool
  {
    poolId: '0x' + 'b'.repeat(64),
    coinTypeA: SUPPORTED_COINS.IOTA.type,
    coinTypeB: SUPPORTED_COINS.vUSD.type,
    reserveA: BigInt(5000000000000),  // 5,000 IOTA
    reserveB: BigInt(1500000000),     // 1,500 vUSD (assuming $0.30 per IOTA)
    lpSupply: BigInt(5000000000000),
    feePercentage: 30, // 0.3%
  },
  // stIOTA <-> vUSD pool
  {
    poolId: '0x' + 'c'.repeat(64),
    coinTypeA: SUPPORTED_COINS.stIOTA.type,
    coinTypeB: SUPPORTED_COINS.vUSD.type,
    reserveA: BigInt(3000000000000),  // 3,000 stIOTA
    reserveB: BigInt(900000000),      // 900 vUSD (assuming $0.30 per stIOTA)
    lpSupply: BigInt(3000000000000),
    feePercentage: 30, // 0.3%
  },
];

export function findMockPool(coinTypeA: string, coinTypeB: string): PoolInfo | null {
  // Check both directions
  const pool = MOCK_POOLS.find(p => 
    (p.coinTypeA === coinTypeA && p.coinTypeB === coinTypeB) ||
    (p.coinTypeA === coinTypeB && p.coinTypeB === coinTypeA)
  );
  
  if (!pool) return null;
  
  // Return pool with correct order
  if (pool.coinTypeA === coinTypeA) {
    return pool;
  } else {
    // Swap the order
    return {
      ...pool,
      coinTypeA: coinTypeB,
      coinTypeB: coinTypeA,
      reserveA: pool.reserveB,
      reserveB: pool.reserveA,
    };
  }
}

export function getAllMockPools(): PoolInfo[] {
  return MOCK_POOLS;
}