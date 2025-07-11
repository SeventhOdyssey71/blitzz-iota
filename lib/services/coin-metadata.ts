'use client';

import { getIotaClientSafe } from '@/lib/iota/client-wrapper';

interface CoinMetadata {
  id: string;
  decimals: number;
  name: string;
  symbol: string;
  description: string;
  iconUrl?: string | null;
}

const METADATA_CACHE: Record<string, CoinMetadata> = {};

export async function getCoinMetadata(coinType: string): Promise<CoinMetadata | null> {
  // Check cache first
  if (METADATA_CACHE[coinType]) {
    return METADATA_CACHE[coinType];
  }

  // Check known coins
  if (KNOWN_COINS[coinType]) {
    METADATA_CACHE[coinType] = KNOWN_COINS[coinType];
    return KNOWN_COINS[coinType];
  }

  try {
    const client = getIotaClientSafe();
    if (!client) {
      return null;
    }
    const metadata = await client.getCoinMetadata({ coinType });

    if (metadata) {
      const coinMetadata: CoinMetadata = {
        id: metadata.id || coinType,
        decimals: metadata.decimals,
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        iconUrl: metadata.iconUrl,
      };

      // Cache the result
      METADATA_CACHE[coinType] = coinMetadata;
      return coinMetadata;
    }
  } catch (error) {
    console.error(`Failed to fetch metadata for ${coinType}:`, error);
    
    // Generate fallback metadata
    const parts = coinType.split('::');
    const symbol = parts[parts.length - 1];
    const fallbackMetadata: CoinMetadata = {
      id: coinType,
      decimals: 9,
      name: symbol,
      symbol: symbol,
      description: `${symbol} token`,
      iconUrl: null,
    };
    
    METADATA_CACHE[coinType] = fallbackMetadata;
    return fallbackMetadata;
  }

  return null;
}

export async function getMultipleCoinMetadata(coinTypes: string[]): Promise<Record<string, CoinMetadata>> {
  const results: Record<string, CoinMetadata> = {};

  await Promise.all(
    coinTypes.map(async (coinType) => {
      const metadata = await getCoinMetadata(coinType);
      if (metadata) {
        results[coinType] = metadata;
      }
    })
  );

  return results;
}

// Known IOTA mainnet coins with their metadata
export const KNOWN_COINS: Record<string, CoinMetadata> = {
  '0x2::iota::IOTA': {
    id: '0x2',
    decimals: 9,
    name: 'IOTA',
    symbol: 'IOTA',
    description: 'The native token of the IOTA network',
    iconUrl: 'https://cryptologos.cc/logos/iota-iota-logo.svg',
  },
  // stIOTA - Staked IOTA
  '0xd84fe8b6622ff910dc5e097c06de5ac31055c169453435d162ff999c8fb65202::simple_staking::StakedIOTA': {
    id: '0xd84fe8b6622ff910dc5e097c06de5ac31055c169453435d162ff999c8fb65202',
    decimals: 9,
    name: 'Staked IOTA',
    symbol: 'stIOTA',
    description: 'Staked IOTA token',
    iconUrl: 'https://cryptologos.cc/logos/iota-iota-logo.svg',
  },
  // vUSD - Native USD
  '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT': {
    id: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55',
    decimals: 6,
    name: 'Native USD',
    symbol: 'vUSD',
    description: 'Native USD',
    iconUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
  },
};