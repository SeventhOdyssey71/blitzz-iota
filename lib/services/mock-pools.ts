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
  // IOTA <-> USDC pool
  {
    poolId: '0x' + 'b'.repeat(64),
    coinTypeA: SUPPORTED_COINS.IOTA.type,
    coinTypeB: SUPPORTED_COINS.USDC.type,
    reserveA: BigInt(5000000000000),  // 5,000 IOTA
    reserveB: BigInt(15000000000),    // 15,000 USDC (assuming $3 per IOTA)
    lpSupply: BigInt(5000000000000),
    feePercentage: 30, // 0.3%
  },
  // IOTA <-> USDT pool
  {
    poolId: '0x' + 'c'.repeat(64),
    coinTypeA: SUPPORTED_COINS.IOTA.type,
    coinTypeB: SUPPORTED_COINS.USDT.type,
    reserveA: BigInt(3000000000000),  // 3,000 IOTA
    reserveB: BigInt(9000000000),     // 9,000 USDT
    lpSupply: BigInt(3000000000000),
    feePercentage: 30, // 0.3%
  },
  // USDC <-> USDT pool
  {
    poolId: '0x' + 'd'.repeat(64),
    coinTypeA: SUPPORTED_COINS.USDC.type,
    coinTypeB: SUPPORTED_COINS.USDT.type,
    reserveA: BigInt(50000000000),    // 50,000 USDC
    reserveB: BigInt(50000000000),    // 50,000 USDT
    lpSupply: BigInt(50000000000),
    feePercentage: 10, // 0.1% for stable pairs
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