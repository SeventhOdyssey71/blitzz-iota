'use client';

import { TransactionBlock } from '@iota/iota-sdk/transactions';
import { getIotaClient } from '@/lib/iota/client';
import { MemeTokenFactory, TokenInfo, CREATION_FEE, PLATFORM_ID } from '@/lib/contracts/meme-token-factory';
import { MEME_FACTORY_PACKAGE_ID } from '@/config/iota.config';

// Mock tokens for development/demo
const MOCK_TOKENS: TokenInfo[] = [
  {
    id: '0x1',
    symbol: 'DOGE',
    name: 'Doge Coin',
    description: 'The original meme coin',
    imageUrl: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
    creator: '0x123',
    createdAt: Date.now() - 86400000,
    bondingCurveId: '0x1bc',
    marketCap: '125000',
    price: '0.0025',
    change24h: 15.5,
    volume24h: '45000',
    liquidity: '2500',
    progress: 65,
    isGraduated: false,
    tokensSold: '50000000',
    totalSupply: '1000000000',
  },
  {
    id: '0x2',
    symbol: 'PEPE',
    name: 'Pepe Token',
    description: 'The rarest of pepes',
    imageUrl: 'https://assets.coingecko.com/coins/images/29850/standard/pepe-token.jpeg',
    creator: '0x456',
    createdAt: Date.now() - 172800000,
    bondingCurveId: '0x2bc',
    marketCap: '89000',
    price: '0.0018',
    change24h: -5.2,
    volume24h: '23000',
    liquidity: '1800',
    progress: 45,
    isGraduated: false,
    tokensSold: '35000000',
    totalSupply: '1000000000',
  },
  {
    id: '0x3',
    symbol: 'WOJAK',
    name: 'Wojak',
    description: 'Feels good man',
    imageUrl: 'https://i.seadn.io/gae/pU66vmO7-OV9xT0HljDjRgmqCVuK2Yj3dToKawWxF1nY-2g-k_NB9QUsT5Hhauwx-8Oz_sH9FiYAXVIesNLXTf3xqmuUZGCPp0Bk',
    creator: '0x789',
    createdAt: Date.now() - 3600000,
    bondingCurveId: '0x3bc',
    marketCap: '45000',
    price: '0.0009',
    change24h: 25.8,
    volume24h: '67000',
    liquidity: '900',
    progress: 22,
    isGraduated: false,
    tokensSold: '17000000',
    totalSupply: '1000000000',
  },
];

export class MemeTokenService {
  private static instance: MemeTokenService;
  private factory: MemeTokenFactory | null = null;
  private mockMode: boolean = true;

  private constructor() {
    this.initializeFactory();
  }

  static getInstance(): MemeTokenService {
    if (!MemeTokenService.instance) {
      MemeTokenService.instance = new MemeTokenService();
    }
    return MemeTokenService.instance;
  }

  private async initializeFactory() {
    try {
      const client = getIotaClient('testnet');
      this.factory = new MemeTokenFactory(client);
      
      // Check if platform is deployed
      if (!PLATFORM_ID || PLATFORM_ID === '' || MEME_FACTORY_PACKAGE_ID.testnet === '0x0') {
        console.log('Meme token factory not deployed, using mock mode');
        this.mockMode = true;
      } else {
        this.mockMode = false;
      }
    } catch (error) {
      console.error('Failed to initialize meme token factory:', error);
      this.mockMode = true;
    }
  }

  async getTokens(): Promise<TokenInfo[]> {
    if (this.mockMode) {
      return MOCK_TOKENS;
    }

    try {
      // In production, this would query the blockchain for all tokens
      // For now, return empty array if not in mock mode
      return [];
    } catch (error) {
      console.error('Error fetching tokens:', error);
      return MOCK_TOKENS;
    }
  }

  async getToken(tokenId: string): Promise<TokenInfo | null> {
    if (this.mockMode) {
      return MOCK_TOKENS.find(t => t.id === tokenId) || null;
    }

    try {
      // In production, fetch from blockchain
      return null;
    } catch (error) {
      console.error('Error fetching token:', error);
      return null;
    }
  }

  async createToken(params: {
    symbol: string;
    name: string;
    description: string;
    imageUrl: string;
    payment: any; // Coin object
  }): Promise<{ success: boolean; tokenId?: string; error?: string }> {
    if (this.mockMode) {
      // Simulate token creation
      const newToken: TokenInfo = {
        id: `0x${Date.now().toString(16)}`,
        symbol: params.symbol,
        name: params.name,
        description: params.description,
        imageUrl: params.imageUrl,
        creator: '0xmock',
        createdAt: Date.now(),
        bondingCurveId: `0xbc${Date.now().toString(16)}`,
        marketCap: '0',
        price: '0.001',
        change24h: 0,
        volume24h: '0',
        liquidity: '0',
        progress: 0,
        isGraduated: false,
        tokensSold: '0',
        totalSupply: '1000000000',
      };
      
      MOCK_TOKENS.unshift(newToken);
      
      return {
        success: true,
        tokenId: newToken.id,
      };
    }

    if (!this.factory) {
      return {
        success: false,
        error: 'Factory not initialized',
      };
    }

    try {
      // Real implementation would call the contract
      return {
        success: false,
        error: 'Contract not deployed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async buyTokens(params: {
    tokenId: string;
    bondingCurveId: string;
    iotaAmount: string;
    minTokensOut?: string;
  }): Promise<{ success: boolean; tokensReceived?: string; error?: string }> {
    if (this.mockMode) {
      // Simulate buying tokens
      const token = MOCK_TOKENS.find(t => t.id === params.tokenId);
      if (!token) {
        return {
          success: false,
          error: 'Token not found',
        };
      }

      // Simple calculation for demo
      const iotaAmountNum = parseFloat(params.iotaAmount);
      const priceNum = parseFloat(token.price);
      const tokensReceived = (iotaAmountNum / priceNum).toFixed(0);

      // Update mock data
      token.volume24h = (parseFloat(token.volume24h) + iotaAmountNum).toString();
      token.liquidity = (parseFloat(token.liquidity) + iotaAmountNum).toString();
      token.progress = Math.min(100, token.progress + (iotaAmountNum / 40));

      return {
        success: true,
        tokensReceived,
      };
    }

    if (!this.factory) {
      return {
        success: false,
        error: 'Factory not initialized',
      };
    }

    try {
      // Real implementation would call the contract
      return {
        success: false,
        error: 'Contract not deployed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sellTokens(params: {
    tokenId: string;
    bondingCurveId: string;
    tokenAmount: string;
    minIotaOut?: string;
  }): Promise<{ success: boolean; iotaReceived?: string; error?: string }> {
    if (this.mockMode) {
      // Simulate selling tokens
      const token = MOCK_TOKENS.find(t => t.id === params.tokenId);
      if (!token) {
        return {
          success: false,
          error: 'Token not found',
        };
      }

      // Simple calculation for demo
      const tokenAmountNum = parseFloat(params.tokenAmount);
      const priceNum = parseFloat(token.price);
      const iotaReceived = (tokenAmountNum * priceNum * 0.98).toFixed(9); // 2% fee

      // Update mock data
      token.volume24h = (parseFloat(token.volume24h) + parseFloat(iotaReceived)).toString();
      token.liquidity = (parseFloat(token.liquidity) - parseFloat(iotaReceived)).toString();
      token.progress = Math.max(0, token.progress - (parseFloat(iotaReceived) / 40));

      return {
        success: true,
        iotaReceived,
      };
    }

    if (!this.factory) {
      return {
        success: false,
        error: 'Factory not initialized',
      };
    }

    try {
      // Real implementation would call the contract
      return {
        success: false,
        error: 'Contract not deployed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  calculateTokenPrice(params: {
    iotaReserve: string;
    tokensSold: string;
    totalSupply: string;
  }): string {
    // Simple bonding curve calculation
    const reserve = parseFloat(params.iotaReserve);
    const sold = parseFloat(params.tokensSold);
    const supply = parseFloat(params.totalSupply);
    
    if (sold === 0) {
      return '0.001'; // Starting price
    }
    
    // Price increases as more tokens are sold
    const progress = sold / supply;
    const basePrice = 0.001;
    const maxPrice = 0.01;
    
    const price = basePrice + (maxPrice - basePrice) * progress * progress;
    return price.toFixed(6);
  }

  isInMockMode(): boolean {
    return this.mockMode;
  }
}