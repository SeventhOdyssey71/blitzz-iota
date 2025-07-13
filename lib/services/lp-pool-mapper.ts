'use client';

// Map LP tokens to their pool IDs
// This helps when pool discovery fails

const LP_TOKEN_POOL_MAP = new Map<string, string>();

export function mapLPTokenToPool(lpTokenId: string, poolId: string) {
  LP_TOKEN_POOL_MAP.set(lpTokenId, poolId);
  console.log(`Mapped LP token ${lpTokenId} to pool ${poolId}`);
  saveLPTokenMappings(); // Auto-save
}

export function getPoolForLPToken(lpTokenId: string): string | undefined {
  return LP_TOKEN_POOL_MAP.get(lpTokenId);
}

export function getAllLPTokenMappings() {
  const mappings: Record<string, string> = {};
  LP_TOKEN_POOL_MAP.forEach((poolId, lpTokenId) => {
    mappings[lpTokenId] = poolId;
  });
  return mappings;
}

// Store in localStorage for persistence
export function saveLPTokenMappings() {
  if (typeof window === 'undefined') return;
  
  const mappings = getAllLPTokenMappings();
  localStorage.setItem('lp_token_pool_mappings', JSON.stringify(mappings));
}

export function loadLPTokenMappings() {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem('lp_token_pool_mappings');
    if (stored) {
      const mappings = JSON.parse(stored);
      Object.entries(mappings).forEach(([lpTokenId, poolId]) => {
        LP_TOKEN_POOL_MAP.set(lpTokenId, poolId as string);
      });
      console.log('Loaded LP token mappings:', mappings);
    }
  } catch (error) {
    console.error('Error loading LP token mappings:', error);
  }
}

// Auto-load on module import
loadLPTokenMappings();