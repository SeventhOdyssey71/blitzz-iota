'use client';

import { IotaClient } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID } from '@/config/iota.config';

export interface LimitOrder {
  id: string;
  owner: string;
  isBuy: boolean;
  price: string;
  amount: string;
  filledAmount: string;
  expireAt: number;
  createdAt: number;
  sourceTokenType: string;
  targetTokenType: string;
}

export interface CreateLimitOrderParams {
  sourceTokenType: string;
  targetTokenType: string;
  amount: string;
  price: string;
  isBuy: boolean;
  expireAt: number;
  orderBookId: string;
  sourceDecimals?: number;
  targetDecimals?: number;
}

export interface LimitOrderEvent {
  orderId: string;
  owner: string;
  isBuy: boolean;
  price: string;
  amount: string;
  filledAmount: string;
  timestamp: number;
}

export class LimitOrderService {
  private static readonly MODULE_NAME = 'limit_order';
  private static readonly PRICE_PRECISION = 1000000; // 6 decimal places
  
  // Utility functions for decimal handling
  private static parseTokenAmount(amount: string, decimals: number): string {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount');
    }
    return Math.floor(amountNum * Math.pow(10, decimals)).toString();
  }
  
  private static parsePrice(price: string): string {
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      throw new Error('Invalid price');
    }
    return Math.floor(priceNum * this.PRICE_PRECISION).toString();
  }
  
  private static validateOrderParams(params: CreateLimitOrderParams): void {
    if (!params.sourceTokenType || !params.targetTokenType) {
      throw new Error('Token types are required');
    }
    if (params.sourceTokenType === params.targetTokenType) {
      throw new Error('Source and target tokens must be different');
    }
    const amount = parseFloat(params.amount);
    const price = parseFloat(params.price);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    if (isNaN(price) || price <= 0) {
      throw new Error('Price must be a positive number');
    }
    const duration = params.expireAt - Date.now();
    if (duration < 60000 || duration > 7776000000) { // 1 minute to 90 days
      throw new Error('Expiry duration must be between 1 minute and 90 days');
    }
  }

  // ==================== ORDER BOOK MANAGEMENT ====================

  static async createOrderBook(
    client: IotaClient,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::create_order_book`,
      arguments: [
        tx.pure.u64(30), // 0.3% fee rate (30 basis points)
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    tx.setGasBudget(100000000); // 0.1 IOTA

    return tx;
  }

  // ==================== ORDER MANAGEMENT ====================

  static async placeLimitOrder(
    client: IotaClient,
    params: CreateLimitOrderParams
  ): Promise<Transaction> {
    // Validate parameters first
    this.validateOrderParams(params);
    
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    // Get token decimals (default to 9 for IOTA, 6 for others)
    const sourceDecimals = params.sourceDecimals ?? (params.sourceTokenType === '0x2::iota::IOTA' ? 9 : 6);
    const targetDecimals = params.targetDecimals ?? (params.targetTokenType === '0x2::iota::IOTA' ? 9 : 6);

    // Parse amounts with proper decimals
    const parsedAmount = this.parseTokenAmount(params.amount, sourceDecimals);
    const parsedPrice = this.parsePrice(params.price);

    console.log('🎯 Limit Order Debug:', {
      packageId,
      module: this.MODULE_NAME,
      orderBookId: params.orderBookId,
      sourceTokenType: params.sourceTokenType,
      targetTokenType: params.targetTokenType,
      rawAmount: params.amount,
      parsedAmount,
      rawPrice: params.price,
      parsedPrice,
      sourceDecimals,
      targetDecimals,
      isBuy: params.isBuy,
      expireAt: params.expireAt
    });

    // Calculate required coin amount for buy orders
    let requiredCoinAmount: string;
    if (params.isBuy) {
      // For buy orders, calculate how much target token is needed
      const priceNum = parseFloat(params.price);
      const amountNum = parseFloat(params.amount);
      const requiredTargetAmount = priceNum * amountNum;
      requiredCoinAmount = this.parseTokenAmount(requiredTargetAmount.toString(), targetDecimals);
    } else {
      // For sell orders, use the source amount directly
      requiredCoinAmount = parsedAmount;
    }

    // Prepare source coin with proper amount
    const sourceCoin = params.isBuy 
      ? (params.targetTokenType === '0x2::iota::IOTA' 
          ? tx.splitCoins(tx.gas, [requiredCoinAmount])
          : tx.gas) // TODO: Handle other target tokens
      : (params.sourceTokenType === '0x2::iota::IOTA'
          ? tx.splitCoins(tx.gas, [requiredCoinAmount])
          : tx.gas); // TODO: Handle other source tokens

    let orderBookId = params.orderBookId;

    // Create order book automatically if needed
    if (orderBookId === 'auto' || orderBookId === '0x0') {
      console.log('🏗️ Creating order book automatically for', params.sourceTokenType, '<->', params.targetTokenType);
      
      const orderBookCall = tx.moveCall({
        target: `${packageId}::${this.MODULE_NAME}::create_order_book`,
        arguments: [
          tx.pure.u64(30), // 0.3% fee rate (30 basis points)
        ],
        typeArguments: [params.sourceTokenType, params.targetTokenType],
      });

      // Use the created order book
      orderBookId = orderBookCall;
    }

    // Use correct function based on order type and match Move contract signature
    const expireDuration = Math.max(params.expireAt - Date.now(), 60000); // Minimum 1 minute
    
    if (params.isBuy) {
      tx.moveCall({
        target: `${packageId}::${this.MODULE_NAME}::place_buy_order`,
        arguments: [
          typeof orderBookId === 'string' ? tx.object(orderBookId) : orderBookId, // order_book
          sourceCoin, // coin_b (paying with target token)
          tx.pure.u64(parsedPrice), // price (with 6 decimal precision)
          tx.pure.u64(parsedAmount), // amount (with proper decimals)
          tx.pure.u64(expireDuration), // expire_duration (validated)
          tx.object('0x6'), // clock
        ],
        typeArguments: [params.sourceTokenType, params.targetTokenType], // CoinA = what you want, CoinB = what you pay
      });
    } else {
      tx.moveCall({
        target: `${packageId}::${this.MODULE_NAME}::place_sell_order`,
        arguments: [
          typeof orderBookId === 'string' ? tx.object(orderBookId) : orderBookId, // order_book
          sourceCoin, // coin_a (selling source token)
          tx.pure.u64(parsedPrice), // price (with 6 decimal precision)
          tx.pure.u64(parsedAmount), // amount (with proper decimals)
          tx.pure.u64(expireDuration), // expire_duration (validated)
          tx.object('0x6'), // clock
        ],
        typeArguments: [params.sourceTokenType, params.targetTokenType], // CoinA = what you sell, CoinB = what you get
      });
    }

    tx.setGasBudget(200000000); // 0.2 IOTA for order book creation + order placement

    return tx;
  }

  static async cancelLimitOrder(
    client: IotaClient,
    orderBookId: string,
    orderId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::cancel_order`,
      arguments: [
        tx.object(orderBookId), // order_book
        tx.pure.id(orderId), // order_id (ID type, not address)
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    tx.setGasBudget(100000000);

    return tx;
  }

  static async fillLimitOrder(
    client: IotaClient,
    orderBookId: string,
    orderId: string,
    fillAmount: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    // This would be called by market makers/arbitrageurs
    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::fill_order`,
      arguments: [
        tx.object(orderBookId), // order_book
        tx.pure.address(orderId), // order_id
        tx.pure.u64(parseInt(fillAmount)), // fill_amount
        tx.object('0x6'), // clock
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    return tx;
  }

  // ==================== QUERY FUNCTIONS ====================

  static async getOrderBook(
    client: IotaClient,
    orderBookId: string
  ): Promise<any | null> {
    try {
      const response = await client.getObject({
        id: orderBookId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!response.data || !response.data.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const content = response.data.content.fields as any;
      
      return {
        id: orderBookId,
        buyOrders: content.buy_orders || [],
        sellOrders: content.sell_orders || [],
        feeRate: parseInt(content.fee_rate),
        collectedFeesA: content.collected_fees_a?.fields?.value || '0',
        collectedFeesB: content.collected_fees_b?.fields?.value || '0',
        admin: content.admin,
      };
    } catch (error) {
      console.error('Failed to fetch order book:', error);
      return null;
    }
  }

  static async getUserOrders(
    client: IotaClient,
    userAddress: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<LimitOrder[]> {
    try {
      // Query for limit orders owned by the user
      const response = await client.getOwnedObjects({
        owner: userAddress,
        filter: {
          MoveModule: {
            package: blitz_PACKAGE_ID.testnet,
            module: this.MODULE_NAME,
          },
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      const orders: LimitOrder[] = [];

      for (const obj of response.data) {
        if (obj.data?.content?.dataType === 'moveObject' && obj.data.type?.includes('LimitOrder')) {
          const content = obj.data.content.fields as any;
          
          orders.push({
            id: obj.data.objectId,
            owner: content.owner,
            isBuy: content.is_buy,
            price: content.price,
            amount: content.amount,
            filledAmount: content.filled_amount || '0',
            expireAt: parseInt(content.expire_at),
            createdAt: parseInt(content.created_at),
            sourceTokenType,
            targetTokenType,
          });
        }
      }

      return orders.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error('Failed to fetch user orders:', error);
      return [];
    }
  }

  // ==================== UTILITY FUNCTIONS ====================

  static formatPrice(price: string, decimals: number = 6): string {
    const priceNum = parseInt(price);
    return (priceNum / Math.pow(10, decimals)).toString();
  }

  static parsePrice(price: string, decimals: number = 6): string {
    const priceNum = parseFloat(price);
    return Math.floor(priceNum * Math.pow(10, decimals)).toString();
  }

  static calculateOrderValue(amount: string, price: string): string {
    const amountNum = parseInt(amount);
    const priceNum = parseInt(price);
    return (amountNum * priceNum).toString();
  }

  static isOrderExpired(expireAt: number): boolean {
    return Date.now() > expireAt;
  }

  static getOrderTypeText(isBuy: boolean): string {
    return isBuy ? 'Buy' : 'Sell';
  }

  static getOrderStatusText(order: LimitOrder): string {
    if (this.isOrderExpired(order.expireAt)) return 'Expired';
    if (parseInt(order.filledAmount) >= parseInt(order.amount)) return 'Filled';
    if (parseInt(order.filledAmount) > 0) return 'Partially Filled';
    return 'Open';
  }
}