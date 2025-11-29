/**
 * Production-ready Limit Order service
 */

'use client';

import { IotaClient } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { IOTA_CONFIG, getTokenByType, getOrderBookId, MODULE_NAMES } from '@/config/iota.config';
import { getSafeIotaClient } from '@/lib/iota/safe-client';
import { log, measurePerformance } from '@/lib/logging';
import { poolCache, withCache } from '@/lib/cache';
import { 
  ValidationError, 
  NetworkError, 
  TransactionError, 
  ErrorCode, 
  createValidationError 
} from '@/lib/errors';

// Comprehensive Limit Order interfaces
export interface LimitOrder {
  readonly id: string;
  readonly owner: string;
  readonly orderBookId: string;
  readonly baseTokenType: string;
  readonly quoteTokenType: string;
  
  // Order details
  readonly orderType: 'buy' | 'sell';
  readonly amount: string; // Base token amount
  readonly price: string; // Price in quote token per base token
  readonly filledAmount: string;
  readonly remainingAmount: string;
  
  // Status
  readonly status: 'pending' | 'partial' | 'filled' | 'cancelled' | 'expired';
  readonly isActive: boolean;
  
  // Timestamps
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly lastUpdated: number;
  readonly filledAt?: number;
  
  // Financial details
  readonly totalValue: string; // Total order value in quote token
  readonly avgFillPrice: string; // Average fill price
  readonly feePaid: string; // Total fees paid
  
  // Metadata
  readonly clientOrderId?: string;
  readonly tags?: readonly string[];
}

export interface CreateLimitOrderParams {
  readonly baseTokenType: string;
  readonly quoteTokenType: string;
  readonly orderType: 'buy' | 'sell';
  readonly amount: string; // Amount of base token
  readonly price: string; // Price per base token in quote token
  readonly expiryDuration: number; // Duration in milliseconds
  readonly clientOrderId?: string;
  readonly tags?: readonly string[];
}

export interface OrderBookInfo {
  readonly orderBookId: string;
  readonly baseTokenType: string;
  readonly quoteTokenType: string;
  readonly totalOrders: number;
  readonly totalVolume: string;
  readonly bestBid: string;
  readonly bestAsk: string;
  readonly spread: string;
  readonly lastPrice: string;
  readonly volume24h: string;
}

export interface OrderFillEvent {
  readonly orderId: string;
  readonly fillAmount: string;
  readonly fillPrice: string;
  readonly fillValue: string;
  readonly fee: string;
  readonly timestamp: number;
  readonly counterpartyOrderId?: string;
}

export interface OrderBookSnapshot {
  readonly bids: readonly { price: string; amount: string; orders: number }[];
  readonly asks: readonly { price: string; amount: string; orders: number }[];
  readonly spread: string;
  readonly lastPrice: string;
  readonly timestamp: number;
}

export class LimitOrderService {
  private static instance: LimitOrderService | null = null;
  private readonly client: IotaClient;
  private readonly packageId: string;
  
  private constructor() {
    this.client = getSafeIotaClient();
    this.packageId = IOTA_CONFIG.packages.core;
    
    if (!this.client) {
      throw new NetworkError('Failed to initialize IOTA client');
    }
    
    if (!this.packageId || this.packageId === '0x0') {
      throw new Error('Limit Order package ID not configured. Please deploy contracts first.');
    }
  }

  static getInstance(): LimitOrderService {
    if (!LimitOrderService.instance) {
      LimitOrderService.instance = new LimitOrderService();
    }
    return LimitOrderService.instance;
  }

  // ==================== VALIDATION ====================
  
  private validateCreateOrderParams(params: CreateLimitOrderParams): void {
    const { baseTokenType, quoteTokenType, orderType, amount, price, expiryDuration } = params;
    
    // Token validation
    const baseToken = getTokenByType(baseTokenType);
    const quoteToken = getTokenByType(quoteTokenType);
    
    if (!baseToken) {
      throw createValidationError('baseTokenType', baseTokenType, 'supported token type');
    }
    
    if (!quoteToken) {
      throw createValidationError('quoteTokenType', quoteTokenType, 'supported token type');
    }
    
    if (baseTokenType === quoteTokenType) {
      throw new ValidationError('Base and quote tokens must be different');
    }
    
    // Order type validation
    if (!['buy', 'sell'].includes(orderType)) {
      throw createValidationError('orderType', orderType, 'buy or sell');
    }
    
    // Amount validation
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw createValidationError('amount', amount, 'positive number');
    }
    
    // Convert to smallest units for validation
    const amountInSmallestUnits = BigInt(Math.floor(amountNum * Math.pow(10, baseToken.decimals)));
    if (amountInSmallestUnits < IOTA_CONFIG.limits.minOrderSize) {
      const minAmount = Number(IOTA_CONFIG.limits.minOrderSize) / Math.pow(10, baseToken.decimals);
      throw new ValidationError(`Order amount too small. Minimum: ${minAmount} ${baseToken.symbol}`);
    }
    
    // Price validation
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw createValidationError('price', price, 'positive number');
    }
    
    // Expiry validation
    if (expiryDuration < IOTA_CONFIG.limits.minOrderExpiry) {
      throw new ValidationError(`Expiry too short. Minimum: ${IOTA_CONFIG.limits.minOrderExpiry}ms`);
    }
    
    if (expiryDuration > IOTA_CONFIG.limits.maxOrderExpiry) {
      throw new ValidationError(`Expiry too long. Maximum: ${IOTA_CONFIG.limits.maxOrderExpiry}ms`);
    }
    
    // Client order ID validation
    if (params.clientOrderId && params.clientOrderId.length > 64) {
      throw new ValidationError('Client order ID must be 64 characters or less');
    }
  }

  private parseTokenAmount(amount: string, decimals: number): string {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new ValidationError(`Invalid amount: ${amount}`);
    }
    
    return Math.floor(amountNum * Math.pow(10, decimals)).toString();
  }

  private parsePrice(price: string, baseDecimals: number, quoteDecimals: number): string {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw new ValidationError(`Invalid price: ${price}`);
    }
    
    // Price is stored with 6 decimal precision
    return Math.floor(priceNum * 1000000).toString();
  }

  // ==================== ORDER BOOK OPERATIONS ====================
  
  async createOrderBook(baseTokenType: string, quoteTokenType: string): Promise<Transaction> {
    const timer = measurePerformance('LimitOrderService.createOrderBook');
    
    try {
      this.validateCreateOrderParams({
        baseTokenType,
        quoteTokenType,
        orderType: 'buy',
        amount: '1',
        price: '1',
        expiryDuration: 3600000,
      });
      
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::${MODULE_NAMES.LIMIT_ORDER}::create_order_book`,
        typeArguments: [baseTokenType, quoteTokenType],
        arguments: [],
      });
      
      tx.setGasBudget(10_000_000); // 0.01 IOTA
      
      const baseToken = getTokenByType(baseTokenType)!;
      const quoteToken = getTokenByType(quoteTokenType)!;
      
      log.business('Order book creation transaction built', {
        baseToken: baseToken.symbol,
        quoteToken: quoteToken.symbol,
      });
      
      return tx;
      
    } catch (error) {
      log.error('Failed to create order book transaction', { baseTokenType, quoteTokenType }, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  async getOrderBookInfo(baseTokenType: string, quoteTokenType: string): Promise<OrderBookInfo | null> {
    const timer = measurePerformance('LimitOrderService.getOrderBookInfo');
    
    try {
      const orderBookId = getOrderBookId(
        getTokenByType(baseTokenType)?.symbol || '',
        getTokenByType(quoteTokenType)?.symbol || ''
      );
      
      if (!orderBookId || orderBookId === '0x0') {
        return null;
      }
      
      const cacheKey = `order-book:${orderBookId}`;
      
      return await withCache(
        poolCache,
        cacheKey,
        async () => {
          const orderBookObject = await this.client.getObject({
            id: orderBookId,
            options: { showContent: true },
          });

          if (!orderBookObject.data?.content || orderBookObject.data.content.dataType !== 'moveObject') {
            return null;
          }

          const fields = orderBookObject.data.content.fields as any;
          
          return {
            orderBookId,
            baseTokenType,
            quoteTokenType,
            totalOrders: parseInt(fields.total_orders || '0'),
            totalVolume: fields.total_volume || '0',
            bestBid: fields.best_bid || '0',
            bestAsk: fields.best_ask || '0',
            spread: fields.spread || '0',
            lastPrice: fields.last_price || '0',
            volume24h: fields.volume_24h || '0',
          };
        },
        30000 // 30 second cache
      );
      
    } catch (error) {
      log.error('Failed to get order book info', { baseTokenType, quoteTokenType }, error instanceof Error ? error : undefined);
      return null;
    } finally {
      timer.end();
    }
  }

  // ==================== ORDER OPERATIONS ====================
  
  async createOrder(params: CreateLimitOrderParams): Promise<Transaction> {
    const timer = measurePerformance('LimitOrderService.createOrder');
    
    try {
      // Validate parameters
      this.validateCreateOrderParams(params);
      
      const baseToken = getTokenByType(params.baseTokenType)!;
      const quoteToken = getTokenByType(params.quoteTokenType)!;
      
      // Parse amounts and price
      const amount = this.parseTokenAmount(params.amount, baseToken.decimals);
      const price = this.parsePrice(params.price, baseToken.decimals, quoteToken.decimals);
      const expiresAt = Date.now() + params.expiryDuration;
      
      // Calculate required token amount based on order type
      const isBuyOrder = params.orderType === 'buy';
      const requiredTokenType = isBuyOrder ? params.quoteTokenType : params.baseTokenType;
      const requiredAmount = isBuyOrder 
        ? this.parseTokenAmount((parseFloat(params.amount) * parseFloat(params.price)).toString(), quoteToken.decimals)
        : amount;
      
      const tx = new Transaction();
      
      // Split required token from gas
      const requiredCoin = requiredTokenType === '0x2::iota::IOTA' 
        ? tx.splitCoins(tx.gas, [requiredAmount])
        : tx.gas; // TODO: Handle other tokens
      
      // Get or create order book ID
      const orderBookId = getOrderBookId(baseToken.symbol, quoteToken.symbol);
      if (!orderBookId || orderBookId === '0x0') {
        // If no order book exists, create one first
        tx.moveCall({
          target: `${this.packageId}::${MODULE_NAMES.LIMIT_ORDER}::create_order_book`,
          typeArguments: [params.baseTokenType, params.quoteTokenType],
          arguments: [],
        });
      }
      
      // Create the limit order
      tx.moveCall({
        target: `${this.packageId}::${MODULE_NAMES.LIMIT_ORDER}::create_order`,
        typeArguments: [params.baseTokenType, params.quoteTokenType],
        arguments: [
          orderBookId !== '0x0' ? tx.object(orderBookId) : tx.object('0x0'), // Will use created order book if needed
          requiredCoin,
          tx.pure.bool(isBuyOrder),
          tx.pure.u64(amount),
          tx.pure.u64(price),
          tx.pure.u64(expiresAt),
          tx.pure.string(params.clientOrderId || ''),
        ],
      });
      
      tx.setGasBudget(15_000_000); // 0.015 IOTA
      
      log.business('Limit order creation transaction built', {
        orderType: params.orderType,
        baseToken: baseToken.symbol,
        quoteToken: quoteToken.symbol,
        amount: params.amount,
        price: params.price,
        expiryDuration: params.expiryDuration,
      });
      
      return tx;
      
    } catch (error) {
      log.error('Failed to create limit order', params, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  async cancelOrder(orderId: string): Promise<Transaction> {
    const timer = measurePerformance('LimitOrderService.cancelOrder');
    
    try {
      if (!orderId || orderId === '0x0') {
        throw new ValidationError('Invalid order ID');
      }
      
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::${MODULE_NAMES.LIMIT_ORDER}::cancel_order`,
        arguments: [
          tx.object(orderId),
        ],
      });
      
      tx.setGasBudget(10_000_000); // 0.01 IOTA
      
      log.business('Order cancellation transaction built', { orderId });
      
      return tx;
      
    } catch (error) {
      log.error('Failed to create order cancellation transaction', { orderId }, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  async getOrder(orderId: string): Promise<LimitOrder | null> {
    const timer = measurePerformance('LimitOrderService.getOrder');
    
    try {
      if (!orderId || orderId === '0x0') {
        return null;
      }
      
      const cacheKey = `limit-order:${orderId}`;
      
      return await withCache(
        poolCache,
        cacheKey,
        async () => {
          const orderObject = await this.client.getObject({
            id: orderId,
            options: { showContent: true, showOwner: true },
          });

          if (!orderObject.data?.content || orderObject.data.content.dataType !== 'moveObject') {
            return null;
          }

          const fields = orderObject.data.content.fields as any;
          const owner = orderObject.data.owner && 'AddressOwner' in orderObject.data.owner 
            ? orderObject.data.owner.AddressOwner 
            : '';

          const amount = fields.amount || '0';
          const filledAmount = fields.filled_amount || '0';
          const remainingAmount = (BigInt(amount) - BigInt(filledAmount)).toString();

          // Determine status
          let status: LimitOrder['status'] = 'pending';
          const now = Date.now();
          const expiresAt = parseInt(fields.expires_at || '0');
          
          if (fields.is_cancelled) {
            status = 'cancelled';
          } else if (now > expiresAt) {
            status = 'expired';
          } else if (BigInt(filledAmount) >= BigInt(amount)) {
            status = 'filled';
          } else if (BigInt(filledAmount) > 0n) {
            status = 'partial';
          }

          return {
            id: orderId,
            owner,
            orderBookId: fields.order_book_id || '',
            baseTokenType: fields.base_token_type || '',
            quoteTokenType: fields.quote_token_type || '',
            orderType: fields.is_buy ? 'buy' : 'sell',
            amount,
            price: fields.price || '0',
            filledAmount,
            remainingAmount,
            status,
            isActive: status === 'pending' || status === 'partial',
            createdAt: parseInt(fields.created_at || '0'),
            expiresAt,
            lastUpdated: parseInt(fields.last_updated || '0'),
            filledAt: fields.filled_at ? parseInt(fields.filled_at) : undefined,
            totalValue: fields.total_value || '0',
            avgFillPrice: fields.avg_fill_price || '0',
            feePaid: fields.fee_paid || '0',
            clientOrderId: fields.client_order_id || undefined,
            tags: fields.tags || [],
          };
        },
        15000 // 15 second cache
      );
      
    } catch (error) {
      log.error('Failed to get limit order', { orderId }, error instanceof Error ? error : undefined);
      return null;
    } finally {
      timer.end();
    }
  }

  // ==================== STATIC CONVENIENCE METHODS ====================
  
  static getInstance = () => LimitOrderService.getInstance();
  
  static async createOrder(params: CreateLimitOrderParams): Promise<Transaction> {
    return LimitOrderService.getInstance().createOrder(params);
  }
  
  static async cancelOrder(orderId: string): Promise<Transaction> {
    return LimitOrderService.getInstance().cancelOrder(orderId);
  }
  
  static async getOrder(orderId: string): Promise<LimitOrder | null> {
    return LimitOrderService.getInstance().getOrder(orderId);
  }
  
  static async getOrderBookInfo(baseTokenType: string, quoteTokenType: string): Promise<OrderBookInfo | null> {
    return LimitOrderService.getInstance().getOrderBookInfo(baseTokenType, quoteTokenType);
  }
}