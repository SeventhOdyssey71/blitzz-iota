import { Transaction } from '@iota/iota-sdk/transactions';
import { IotaClient, IotaObjectRef } from '@iota/iota-sdk/client';
import { MEME_FACTORY_PACKAGE_ID, MEME_PLATFORM_ID } from '@/config/iota.config';

// Constants
export const CREATION_FEE = 2_000_000_000; // 2 IOTA in MIST
export const DECIMALS = 9;
export const BONDING_CURVE_TARGET = 4_000_000_000_000; // 4,000 IOTA in MIST
export const PLATFORM_FEE_PERCENT = 2;

// Re-export for backward compatibility
export const PLATFORM_ID = MEME_PLATFORM_ID;

export interface TokenInfo {
  id: string;
  symbol: string;
  name: string;
  description: string;
  imageUrl?: string;
  creator: string;
  createdAt: number;
  bondingCurveId: string;
  marketCap: string;
  price: string;
  change24h: number;
  volume24h: string;
  liquidity: string;
  progress: number;
  isGraduated: boolean;
  tokensSold: string;
  totalSupply: string;
}

export interface BondingCurveInfo {
  symbol: string;
  name: string;
  tokensSold: string;
  totalSupply: string;
  isGraduated: boolean;
  iotaReserve: string;
  progressPercent: number;
}

export class MemeTokenFactory {
  private client: IotaClient;
  private packageId: string;

  constructor(client: IotaClient, packageId?: string, network: 'mainnet' | 'testnet' | 'devnet' = 'testnet') {
    this.client = client;
    this.packageId = packageId || MEME_FACTORY_PACKAGE_ID[network];
  }

  // Create a new meme token
  async createToken(
    tx: Transaction,
    witness: any, // The witness object for the token type
    payment: IotaObjectRef,
    symbol: string,
    name: string,
    description: string,
    imageUrl: string,
    decimals: number = DECIMALS
  ) {
    return tx.moveCall({
      target: `${this.packageId}::meme_token_factory::create_token`,
      typeArguments: [witness.type],
      arguments: [
        witness,
        tx.object(PLATFORM_ID),
        tx.object(payment),
        tx.pure(Array.from(new TextEncoder().encode(symbol))),
        tx.pure(Array.from(new TextEncoder().encode(name))),
        tx.pure(Array.from(new TextEncoder().encode(description))),
        tx.pure(Array.from(new TextEncoder().encode(imageUrl))),
        tx.pure(decimals),
        tx.object('0x6'), // Clock object
      ],
    });
  }

  // Buy tokens from bonding curve
  async buyTokens(
    tx: Transaction,
    tokenType: string,
    bondingCurveId: string,
    payment: IotaObjectRef,
    minTokensOut: bigint = 0n
  ) {
    return tx.moveCall({
      target: `${this.packageId}::meme_token_factory::buy`,
      typeArguments: [tokenType],
      arguments: [
        tx.object(bondingCurveId),
        tx.object(PLATFORM_ID),
        tx.object(payment),
        tx.pure(minTokensOut.toString()),
        tx.object('0x6'), // Clock object
      ],
    });
  }

  // Sell tokens back to bonding curve
  async sellTokens(
    tx: Transaction,
    tokenType: string,
    bondingCurveId: string,
    tokens: IotaObjectRef,
    minIotaOut: bigint = 0n
  ) {
    return tx.moveCall({
      target: `${this.packageId}::meme_token_factory::sell`,
      typeArguments: [tokenType],
      arguments: [
        tx.object(bondingCurveId),
        tx.object(PLATFORM_ID),
        tx.object(tokens),
        tx.pure(minIotaOut.toString()),
        tx.object('0x6'), // Clock object
      ],
    });
  }

  // Get bonding curve info
  async getBondingCurveInfo(bondingCurveId: string): Promise<BondingCurveInfo | null> {
    try {
      const bondingCurve = await this.client.getObject({
        id: bondingCurveId,
        options: { showContent: true },
      });

      if (bondingCurve.data?.content?.dataType !== 'moveObject') {
        return null;
      }

      const fields = bondingCurve.data.content.fields as any;
      
      return {
        symbol: fields.symbol,
        name: fields.name,
        tokensSold: fields.tokens_sold,
        totalSupply: fields.total_supply,
        isGraduated: fields.is_graduated,
        iotaReserve: fields.reserve_iota,
        progressPercent: Math.min(100, Math.floor((BigInt(fields.reserve_iota) * 100n) / BigInt(BONDING_CURVE_TARGET))),
      };
    } catch (error) {
      console.error('Error fetching bonding curve info:', error);
      return null;
    }
  }

  // Get token price from bonding curve
  async getTokenPrice(tokenType: string, bondingCurveId: string): Promise<string> {
    try {
      const tx = new Transaction();
      
      const result = await this.client.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
      });

      // Parse the result to get the price
      // This is a simplified version - actual implementation depends on Move function
      return '0';
    } catch (error) {
      console.error('Error fetching token price:', error);
      return '0';
    }
  }

  // Calculate tokens out for a given IOTA amount
  calculateTokensOut(iotaAmount: bigint, iotaReserve: bigint, tokenReserve: bigint): bigint {
    if (iotaAmount === 0n || tokenReserve === 0n) return 0n;
    
    // Apply platform fee
    const feeAmount = (iotaAmount * BigInt(PLATFORM_FEE_PERCENT)) / 100n;
    const amountAfterFee = iotaAmount - feeAmount;
    
    // Constant product formula: xy = k
    // tokens_out = (iota_in * token_reserve) / (iota_reserve + iota_in)
    const numerator = amountAfterFee * tokenReserve;
    const denominator = iotaReserve + amountAfterFee;
    
    return numerator / denominator;
  }

  // Calculate IOTA out for a given token amount
  calculateIotaOut(tokenAmount: bigint, iotaReserve: bigint, tokenReserve: bigint): bigint {
    if (tokenAmount === 0n || iotaReserve === 0n) return 0n;
    
    // Constant product formula: xy = k
    // iota_out = (tokens_in * iota_reserve) / (token_reserve + tokens_in)
    const numerator = tokenAmount * iotaReserve;
    const denominator = tokenReserve + tokenAmount;
    const iotaOut = numerator / denominator;
    
    // Apply platform fee
    const feeAmount = (iotaOut * BigInt(PLATFORM_FEE_PERCENT)) / 100n;
    
    return iotaOut - feeAmount;
  }

  // Format token amount with decimals
  formatTokenAmount(amount: string | bigint, decimals: number = DECIMALS): string {
    const bigAmount = typeof amount === 'string' ? BigInt(amount) : amount;
    const divisor = BigInt(10 ** decimals);
    const wholePart = bigAmount / divisor;
    const fractionalPart = bigAmount % divisor;
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalStr.replace(/0+$/, '');
    
    return trimmedFractional ? `${wholePart}.${trimmedFractional}` : wholePart.toString();
  }

  // Parse token amount to smallest unit
  parseTokenAmount(amount: string, decimals: number = DECIMALS): bigint {
    const [whole, fractional = ''] = amount.split('.');
    const paddedFractional = fractional.padEnd(decimals, '0').slice(0, decimals);
    const combined = whole + paddedFractional;
    return BigInt(combined);
  }
}