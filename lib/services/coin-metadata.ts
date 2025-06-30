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
    iconUrl: 'https://avatars.githubusercontent.com/u/20126597?s=280&v=4',
  },
  // Add staked IOTA
  '0x3::staking_pool::StakedIota': {
    id: '0x3',
    decimals: 9,
    name: 'Staked IOTA',
    symbol: 'stIOTA',
    description: 'Staked IOTA token',
    iconUrl: '/tokens/stiota.png', // Staked IOTA icon - keep local as no CDN available
  },
  '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN': {
    id: '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf',
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    description: 'USD Coin on IOTA',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
  },
  '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN': {
    id: '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
    description: 'Tether USD on IOTA',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
  },
  '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN': {
    id: '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5',
    decimals: 8,
    name: 'Wrapped Ether',
    symbol: 'WETH',
    description: 'Wrapped Ether on IOTA',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
  },
  '0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN': {
    id: '0x027792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881',
    decimals: 8,
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
    description: 'Wrapped Bitcoin on IOTA',
    iconUrl: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
  },
  // Additional common tokens
  '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55::cert::CERT': {
    id: '0x549e8b69270defbfafd4f94e17ec44cdbdd99820b33bda2278dea3b9a32d3f55',
    decimals: 6,
    name: 'Virtue USD',
    symbol: 'vUSD',
    description: 'Virtue USD stablecoin',
    iconUrl: '/tokens/vusd.png', // Keep local as no CDN available
  },
};