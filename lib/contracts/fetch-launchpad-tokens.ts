import { IotaClient } from '@iota/iota-sdk/client';
import { MemeTokenFactory, TokenInfo, PLATFORM_ID } from './meme-token-factory';

export interface LaunchpadToken {
  id: string;
  name: string;
  ticker: string;
  creator: string;
  marketCap: string;
  change: string;
  image: string;
  description: string;
  bondingCurveId: string;
  progress: number;
  isGraduated: boolean;
  isFeatured?: boolean;
  hasGoldenBorder?: boolean;
  isTrustMeBro?: boolean;
}

// Fetch all tokens from the platform
export async function fetchLaunchpadTokens(client: IotaClient): Promise<LaunchpadToken[]> {
  try {
    // If PLATFORM_ID is not set, return mock tokens
    if (!PLATFORM_ID || PLATFORM_ID === '') {
      console.log('Platform ID not set, returning mock tokens');
      return getMockTokens();
    }
    
    const factory = new MemeTokenFactory(client);
    
    // Get platform object to find all bonding curves
    const platform = await client.getObject({
      id: PLATFORM_ID,
      options: { showContent: true },
    });
    
    if (!platform.data?.content?.dataType === 'moveObject') {
      return getMockTokens();
    }
    
    // In a real implementation, we would:
    // 1. Query events for TokenCreated
    // 2. Get all bonding curve IDs
    // 3. Fetch each bonding curve's data
    // 4. Calculate market caps and prices
    
    // For now, return mock data
    return getMockTokens();
  } catch (error) {
    console.error('Error fetching launchpad tokens:', error);
    return getMockTokens();
  }
}

// Mock data for development
function getMockTokens(): LaunchpadToken[] {
  return [
    {
      id: '1',
      name: 'IOTA Inu',
      ticker: 'IOTAINU',
      creator: '0xc2af...AAC',
      marketCap: '$24,236.92',
      change: '12.08%',
      image: '/placeholder.svg?height=100&width=100',
      description: 'The first meme coin on IOTA!',
      bondingCurveId: '0x1234...5678',
      progress: 15.5,
      isGraduated: false,
      isFeatured: true,
    },
    {
      id: '2',
      name: 'Shimmer Cat',
      ticker: 'SHIMCAT',
      creator: '0x2145...MM',
      marketCap: '$14.27K',
      change: '5.2%',
      image: '/placeholder.svg?height=80&width=80',
      description: 'The purrfect companion for your IOTA journey. Shimmer Cat brings luck to all holders!',
      bondingCurveId: '0x2345...6789',
      progress: 8.3,
      isGraduated: false,
      hasGoldenBorder: true,
    },
    {
      id: '3',
      name: 'Assembly Ape',
      ticker: 'ASMAPE',
      creator: '0xc2af...AAC',
      marketCap: '$8.24K',
      change: '2.08%',
      image: '/placeholder.svg?height=80&width=80',
      description: 'Strong together! Assembly Ape unites the IOTA community with diamond hands.',
      bondingCurveId: '0x3456...789a',
      progress: 5.1,
      isGraduated: false,
      isTrustMeBro: true,
    },
    {
      id: '4',
      name: 'TangleDoge',
      ticker: 'TDOGE',
      creator: '0x349b...MAC',
      marketCap: '$6.80K',
      change: '-1.11%',
      image: '/placeholder.svg?height=80&width=80',
      description: 'Much tangle, very IOTA! The goodest boy on the network.',
      bondingCurveId: '0x4567...89ab',
      progress: 4.2,
      isGraduated: false,
    },
    {
      id: '5',
      name: 'IOTA Moon',
      ticker: 'MOON',
      creator: '0xb2ff...YAN',
      marketCap: '$5.63K',
      change: '0%',
      image: '/placeholder.svg?height=80&width=80',
      description: 'To the moon! The only direction is up with IOTA Moon.',
      bondingCurveId: '0x5678...9abc',
      progress: 3.5,
      isGraduated: false,
    },
    {
      id: '6',
      name: 'Feeless Frog',
      ticker: 'FROG',
      creator: '0x5189...3008',
      marketCap: '$4.67K',
      change: '0.03%',
      image: '/placeholder.svg?height=80&width=80',
      description: 'Zero fees, infinite hops! The greenest meme on IOTA.',
      bondingCurveId: '0x6789...abcd',
      progress: 2.9,
      isGraduated: false,
    },
  ];
}

// Fetch featured token
export async function fetchFeaturedToken(client: IotaClient): Promise<LaunchpadToken | null> {
  const tokens = await fetchLaunchpadTokens(client);
  return tokens.find(t => t.isFeatured) || tokens[0] || null;
}

// Filter tokens by category
export function filterTokensByCategory(tokens: LaunchpadToken[], category: string): LaunchpadToken[] {
  switch (category) {
    case 'trust-me-bro':
      return tokens.filter(t => t.isTrustMeBro);
    case 'bonding-curve':
      return tokens.filter(t => !t.isGraduated);
    case 'listed-dex':
      return tokens.filter(t => t.isGraduated);
    case 'nsfw':
      // Would need a flag for this
      return [];
    default:
      return tokens;
  }
}

// Search tokens
export function searchTokens(tokens: LaunchpadToken[], query: string): LaunchpadToken[] {
  const lowerQuery = query.toLowerCase();
  return tokens.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.ticker.toLowerCase().includes(lowerQuery) ||
    t.creator.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery)
  );
}