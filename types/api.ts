/**
 * Strict TypeScript API type definitions for production
 */

import { ErrorCode } from '@/lib/errors';

// Base API response interface
export interface ApiResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: ApiError;
  readonly timestamp: string;
}

export interface ApiError {
  readonly code: ErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

// Swap API types
export interface SwapEstimateRequest {
  readonly inputToken: string;
  readonly outputToken: string;
  readonly inputAmount: string;
  readonly slippage?: number;
  readonly deadline?: number;
}

export interface SwapEstimateResponse {
  readonly outputAmount: string;
  readonly priceImpact: number;
  readonly route: readonly string[];
  readonly poolId: string;
  readonly reserves: {
    readonly in: string;
    readonly out: string;
  };
  readonly fee: number;
  readonly minimumReceived: string;
}

export interface SwapExecuteRequest {
  readonly inputToken: string;
  readonly outputToken: string;
  readonly inputAmount: string;
  readonly minOutputAmount?: string;
}

export interface SwapExecuteResponse {
  readonly transactionParams: TransactionParams;
  readonly message: string;
}

export interface TransactionParams {
  readonly target: string;
  readonly poolId: string;
  readonly coinTypeA: string;
  readonly coinTypeB: string;
  readonly inputAmount: string;
  readonly minOutputAmount: string;
  readonly isReverse: boolean;
}

// Pool types
export interface PoolReserves {
  readonly reserveA: bigint;
  readonly reserveB: bigint;
  readonly lpSupply: bigint;
  readonly feeData: string;
  readonly volumeData: string;
}

export interface PoolInfo {
  readonly id: string;
  readonly coinTypeA: string;
  readonly coinTypeB: string;
  readonly feeRate: number;
}

export interface PoolLiquidityInfo {
  readonly tvl: number;
  readonly volume24h: number;
  readonly fee: number;
  readonly apr: number;
  readonly reserves: {
    readonly tokenA: number;
    readonly tokenB: number;
  };
}

// Token types
export interface TokenInfo {
  readonly symbol: string;
  readonly name: string;
  readonly type: string;
  readonly decimals: number;
  readonly iconUrl?: string;
}

export interface TokenPrice {
  readonly symbol: string;
  readonly price: number;
  readonly change24h: number;
  readonly volume24h: number;
  readonly marketCap: number;
}

// DCA types
export interface CreateDCARequest {
  readonly sourceTokenType: string;
  readonly targetTokenType: string;
  readonly totalAmount: string;
  readonly amountPerOrder: string;
  readonly intervalMs: number;
  readonly totalOrders: number;
  readonly minPrice?: string;
  readonly maxPrice?: string;
  readonly maxSlippageBps: number;
  readonly name: string;
  readonly poolId: string;
  readonly sourceDecimals?: number;
  readonly targetDecimals?: number;
}

export interface DCAStrategy {
  readonly id: string;
  readonly owner: string;
  readonly poolId: string;
  readonly sourceTokenType: string;
  readonly targetTokenType: string;
  readonly amountPerOrder: string;
  readonly intervalMs: number;
  readonly totalOrders: number;
  readonly executedOrders: number;
  readonly createdAt: number;
  readonly lastExecutionTime: number;
  readonly nextExecutionTime: number;
  readonly minPrice?: string;
  readonly maxPrice?: string;
  readonly maxSlippageBps: number;
  readonly isActive: boolean;
  readonly isPaused: boolean;
  readonly emergencyPause: boolean;
  readonly name: string;
  readonly sourceBalance: string;
  readonly receivedBalance: string;
  readonly totalInvested: string;
  readonly totalReceived: string;
  readonly totalFeesPaid: string;
  readonly averagePrice: string;
}

// Limit Order types
export interface CreateLimitOrderRequest {
  readonly orderType: 'buy' | 'sell';
  readonly baseToken: string;
  readonly quoteToken: string;
  readonly amount: string;
  readonly price: string;
  readonly expiry?: number;
}

export interface LimitOrder {
  readonly id: string;
  readonly owner: string;
  readonly orderType: 'buy' | 'sell';
  readonly baseToken: string;
  readonly quoteToken: string;
  readonly amount: string;
  readonly price: string;
  readonly filledAmount: string;
  readonly status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'expired';
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly lastUpdated: number;
}

// Network types
export type Network = 'mainnet' | 'testnet' | 'devnet';

export interface NetworkConfig {
  readonly name: string;
  readonly rpcUrl: string;
  readonly explorerUrl: string;
  readonly chainId: string;
}

// Pagination types
export interface PaginationRequest {
  readonly page?: number;
  readonly limit?: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly pagination: {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
    readonly hasNext: boolean;
    readonly hasPrev: boolean;
  };
}

// Wallet types
export interface WalletInfo {
  readonly address: string;
  readonly network: Network;
  readonly isConnected: boolean;
}

export interface Balance {
  readonly tokenType: string;
  readonly balance: string;
  readonly symbol: string;
  readonly decimals: number;
}

// Transaction types
export interface TransactionRequest {
  readonly target: string;
  readonly arguments: readonly unknown[];
  readonly typeArguments?: readonly string[];
}

export interface TransactionResult {
  readonly digest: string;
  readonly status: 'success' | 'failure';
  readonly gasUsed?: string;
  readonly error?: string;
  readonly events?: readonly TransactionEvent[];
}

export interface TransactionEvent {
  readonly type: string;
  readonly data: Record<string, unknown>;
  readonly timestamp: number;
}

// Chart/Analytics types
export interface PricePoint {
  readonly timestamp: number;
  readonly price: number;
  readonly volume?: number;
}

export interface TimeSeriesData {
  readonly symbol: string;
  readonly timeframe: '1h' | '4h' | '1d' | '7d' | '30d';
  readonly data: readonly PricePoint[];
}

// Configuration types
export interface AppConfig {
  readonly network: Network;
  readonly rpcUrl: string;
  readonly packageId: string;
  readonly supportedTokens: readonly TokenInfo[];
  readonly defaultSlippage: number;
  readonly maxSlippage: number;
  readonly defaultDeadline: number;
  readonly featureFlags: FeatureFlags;
}

export interface FeatureFlags {
  readonly enableDCA: boolean;
  readonly enableLimitOrders: boolean;
  readonly enableAdvancedCharts: boolean;
  readonly enableNotifications: boolean;
  readonly maintenanceMode: boolean;
}

// Utility types
export type Awaited<T> = T extends Promise<infer U> ? U : T;
export type NonEmptyArray<T> = [T, ...T[]];
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Type guards
export const isApiResponse = <T>(obj: unknown): obj is ApiResponse<T> => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'success' in obj &&
    typeof (obj as any).success === 'boolean' &&
    'timestamp' in obj &&
    typeof (obj as any).timestamp === 'string'
  );
};

export const isApiError = (obj: unknown): obj is ApiError => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    typeof (obj as any).code === 'number' &&
    typeof (obj as any).message === 'string'
  );
};

export const isTokenInfo = (obj: unknown): obj is TokenInfo => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'symbol' in obj &&
    'name' in obj &&
    'type' in obj &&
    'decimals' in obj &&
    typeof (obj as any).symbol === 'string' &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).type === 'string' &&
    typeof (obj as any).decimals === 'number'
  );
};

// Branded types for type safety
export type Address = string & { readonly __brand: 'Address' };
export type ObjectId = string & { readonly __brand: 'ObjectId' };
export type TokenAmount = string & { readonly __brand: 'TokenAmount' };
export type Percentage = number & { readonly __brand: 'Percentage' };

// Factory functions for branded types
export const createAddress = (value: string): Address => value as Address;
export const createObjectId = (value: string): ObjectId => value as ObjectId;
export const createTokenAmount = (value: string): TokenAmount => value as TokenAmount;
export const createPercentage = (value: number): Percentage => value as Percentage;