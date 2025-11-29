'use client';

import { IotaClient } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';

export interface DCAStrategyV2 {
  id: string;
  owner: string;
  poolId: string;
  sourceTokenType: string;
  targetTokenType: string;
  
  // Core parameters
  amountPerOrder: string;
  intervalMs: number;
  totalOrders: number;
  executedOrders: number;
  
  // Timing
  createdAt: number;
  lastExecutionTime: number;
  nextExecutionTime: number;
  
  // Price protection
  minPrice?: string;
  maxPrice?: string;
  maxSlippageBps: number;
  
  // Status
  isActive: boolean;
  isPaused: boolean;
  emergencyPause: boolean;
  name: string;
  
  // Balances
  sourceBalance: string;
  receivedBalance: string;
  
  // Performance metrics
  totalInvested: string;
  totalReceived: string;
  totalFeesPaid: string;
  averagePrice: string;
}

export interface CreateDCAV2Params {
  sourceTokenType: string;
  targetTokenType: string;
  totalAmount: string;
  amountPerOrder: string;
  intervalMs: number;
  totalOrders: number;
  minPrice?: string;
  maxPrice?: string;
  maxSlippageBps: number;
  name: string;
  poolId: string;
  sourceDecimals?: number;
  targetDecimals?: number;
}

export interface DCAExecutionEvent {
  strategyId: string;
  orderNumber: number;
  amountIn: string;
  amountOut: string;
  price: string;
  keeperFee: string;
  platformFee: string;
  timestamp: number;
  keeper: string;
}

export interface DCARegistryInfo {
  totalStrategies: number;
  totalVolume: string;
  isPaused: boolean;
}

export class DCAServiceV2 {
  private static readonly REGISTRY_OBJECT_ID = process.env.NEXT_PUBLIC_DCA_REGISTRY_ID || ''; // Must be set to actual registry object ID
  private static readonly MODULE_NAME = 'dca'; // Use deployed dca module
  
  // Utility functions for decimal handling  
  private static parseTokenAmount(amount: string, decimals: number): string {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error('Invalid amount');
    }
    return Math.floor(amountNum * Math.pow(10, decimals)).toString();
  }
  
  private static validateDCAParams(params: CreateDCAV2Params): void {
    if (!params.sourceTokenType || !params.targetTokenType) {
      throw new Error('Token types are required');
    }
    if (params.sourceTokenType === params.targetTokenType) {
      throw new Error('Source and target tokens must be different');
    }
    if (params.intervalMs < 300000 || params.intervalMs > 2592000000) { // 5 min to 30 days
      throw new Error('Interval must be between 5 minutes and 30 days');
    }
    if (params.totalOrders < 1 || params.totalOrders > 365) {
      throw new Error('Total orders must be between 1 and 365');
    }
    const totalAmount = parseFloat(params.totalAmount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new Error('Total amount must be a positive number');
    }
  }

  // ==================== REGISTRY MANAGEMENT ====================

  static async createDCARegistry(
    client: IotaClient
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    console.log('🏗️ Creating DCA Registry with details:', {
      packageId,
      module: this.MODULE_NAME,
      target: `${packageId}::${this.MODULE_NAME}::create_dca_registry`
    });

    // Create the DCA registry first
    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::create_dca_registry`,
      arguments: [], // No arguments needed
    });

    tx.setGasBudget(100000000); // 0.1 IOTA for registry creation

    console.log('🏗️ Creating DCA Registry with package:', packageId);
    return tx;
  }

  // ==================== STRATEGY MANAGEMENT ====================

  static async createDCAStrategy(
    client: IotaClient,
    params: CreateDCAV2Params
  ): Promise<Transaction> {
    // Validate parameters first
    this.validateDCAParams(params);
    
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    // Get token decimals (default to 9 for IOTA, 6 for others)
    const sourceDecimals = params.sourceDecimals ?? (params.sourceTokenType === '0x2::iota::IOTA' ? 9 : 6);
    
    // Parse amount with proper decimals
    const parsedTotalAmount = this.parseTokenAmount(params.totalAmount, sourceDecimals);
    const parsedMinAmountOut = params.minPrice ? this.parseTokenAmount(params.minPrice, 6) : '0';
    const parsedMaxAmountOut = params.maxPrice ? this.parseTokenAmount(params.maxPrice, 6) : '0';

    // Debug logging
    console.log('🔧 DCA Transaction Debug:', {
      packageId,
      module: this.MODULE_NAME,
      poolId: params.poolId,
      sourceTokenType: params.sourceTokenType,
      targetTokenType: params.targetTokenType,
      rawTotalAmount: params.totalAmount,
      parsedTotalAmount,
      sourceDecimals,
      intervalMs: params.intervalMs,
      totalOrders: params.totalOrders,
      parsedMinAmountOut,
      parsedMaxAmountOut
    });

    // For DCA, we need to split coins from gas budget for the total amount
    const sourceCoin = params.sourceTokenType === '0x2::iota::IOTA' 
      ? tx.splitCoins(tx.gas, [parsedTotalAmount])
      : tx.gas; // TODO: Handle other source tokens

    // Use simplified approach (no registry) to avoid complexity
    console.log('🎯 Using simplified DCA strategy creation (no registry)');
    
    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::create_dca_strategy_simple`,
      arguments: [
        tx.object(params.poolId), // pool
        sourceCoin, // source_coin with proper amount
        tx.pure.u64(params.intervalMs), // interval_ms
        tx.pure.u64(params.totalOrders), // total_orders  
        tx.pure.u64(parsedMinAmountOut), // min_amount_out
        tx.pure.u64(parsedMaxAmountOut), // max_amount_out
        tx.object('0x6'), // clock
      ],
      typeArguments: [params.sourceTokenType, params.targetTokenType],
    });

    tx.setGasBudget(200000000); // 0.2 IOTA

    return tx;
  }

  // Keep the old version for backward compatibility if needed
  static async createDCAStrategyWithRegistry(
    client: IotaClient,
    params: CreateDCAV2Params
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    // Check if we have a valid registry
    if (!this.REGISTRY_OBJECT_ID) {
      throw new Error(`DCA Registry not configured. Please set NEXT_PUBLIC_DCA_REGISTRY_ID environment variable with a deployed registry object ID, or deploy a new registry using createDCARegistry() first.`);
    }

    // For DCA, we need to split coins from gas budget for the total amount
    const sourceCoin = params.sourceTokenType === '0x2::iota::IOTA' 
      ? tx.splitCoins(tx.gas, [parseInt(params.totalAmount)])
      : tx.gas; // For now, only support IOTA

    // Create the DCA strategy - match actual contract function signature
    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::create_dca_strategy`,
      arguments: [
        tx.object(this.REGISTRY_OBJECT_ID), // registry - must be a shared object, not package
        tx.object(params.poolId), // pool
        sourceCoin, // source_coin with the specified amount
        tx.pure.u64(params.intervalMs), // interval_ms
        tx.pure.u64(params.totalOrders), // total_orders
        tx.pure.u64(0), // min_amount_out (minimum output amount)
        tx.pure.u64(0), // max_amount_out (maximum output amount, 0 = no limit)
        tx.object('0x6'), // clock
      ],
      typeArguments: [params.sourceTokenType, params.targetTokenType],
    });

    return tx;
  }

  static async executeDCAOrder(
    client: IotaClient,
    strategyId: string,
    poolId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::execute_dca_order`,
      arguments: [
        tx.object(this.REGISTRY_OBJECT_ID), // registry
        tx.object(strategyId), // strategy
        tx.object(poolId), // pool
        tx.object('0x6'), // clock
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    return tx;
  }

  static async pauseStrategy(
    client: IotaClient,
    strategyId: string,
    reason: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::pause_strategy`,
      arguments: [
        tx.object(strategyId),
        tx.pure.vector('u8', Array.from(new TextEncoder().encode(reason))),
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    return tx;
  }

  static async resumeStrategy(
    client: IotaClient,
    strategyId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::resume_strategy`,
      arguments: [
        tx.object(strategyId),
        tx.object('0x6'), // clock
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    return tx;
  }

  static async cancelStrategy(
    client: IotaClient,
    strategyId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::cancel_strategy`,
      arguments: [
        tx.object(this.REGISTRY_OBJECT_ID), // registry
        tx.object(strategyId), // strategy
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    return tx;
  }

  // ==================== QUERY FUNCTIONS ====================

  static async getDCAStrategy(
    client: IotaClient,
    strategyId: string
  ): Promise<DCAStrategyV2 | null> {
    try {
      const response = await client.getObject({
        id: strategyId,
        options: {
          showContent: true,
          showType: true,
        },
      });

      if (!response.data || !response.data.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const content = response.data.content.fields as any;
      const typeParams = this.extractTypeParameters(response.data.type || '');
      
      return {
        id: strategyId,
        owner: content.owner,
        poolId: content.pool_id,
        sourceTokenType: typeParams[0] || '',
        targetTokenType: typeParams[1] || '',
        
        // Core parameters
        amountPerOrder: content.amount_per_order,
        intervalMs: parseInt(content.interval_ms),
        totalOrders: parseInt(content.total_orders),
        executedOrders: parseInt(content.executed_orders),
        
        // Timing
        createdAt: parseInt(content.created_at),
        lastExecutionTime: parseInt(content.last_execution_time),
        nextExecutionTime: parseInt(content.next_execution_time),
        
        // Price protection
        minPrice: content.min_price?.fields?.vec?.[0],
        maxPrice: content.max_price?.fields?.vec?.[0],
        maxSlippageBps: parseInt(content.max_slippage_bps),
        
        // Status
        isActive: content.is_active,
        isPaused: content.is_paused,
        emergencyPause: content.emergency_pause,
        name: content.name,
        
        // Balances
        sourceBalance: content.source_balance?.fields?.value || '0',
        receivedBalance: content.received_balance?.fields?.value || '0',
        
        // Performance metrics
        totalInvested: content.total_invested,
        totalReceived: content.total_received,
        totalFeesPaid: content.total_fees_paid,
        averagePrice: content.average_price,
      };
    } catch (error) {
      console.error('Failed to fetch DCA strategy:', error);
      return null;
    }
  }

  static async getUserStrategies(
    client: IotaClient,
    userAddress: string
  ): Promise<DCAStrategyV2[]> {
    try {
      // Query for DCAStrategy objects owned/accessible by user
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

      const strategies: DCAStrategyV2[] = [];

      for (const obj of response.data) {
        if (obj.data?.content?.dataType === 'moveObject' && obj.data.type?.includes('DCAStrategy')) {
          const strategy = await this.getDCAStrategy(client, obj.data.objectId);
          if (strategy) {
            strategies.push(strategy);
          }
        }
      }

      // Also query shared objects (strategies are shared for automation)
      // Note: In production, you'd use an indexer service for this
      
      return strategies;
    } catch (error) {
      console.error('Failed to fetch user DCA strategies:', error);
      return [];
    }
  }

  static async getExecutableStrategies(
    client: IotaClient,
    strategies: DCAStrategyV2[]
  ): Promise<DCAStrategyV2[]> {
    const currentTime = Date.now();
    const executable: DCAStrategyV2[] = [];

    for (const strategy of strategies) {
      if (
        strategy.isActive &&
        !strategy.isPaused &&
        !strategy.emergencyPause &&
        strategy.executedOrders < strategy.totalOrders &&
        currentTime >= strategy.nextExecutionTime &&
        parseInt(strategy.sourceBalance) > 0
      ) {
        executable.push(strategy);
      }
    }

    return executable;
  }

  static async getRegistryInfo(client: IotaClient): Promise<DCARegistryInfo | null> {
    try {
      const response = await client.getObject({
        id: this.REGISTRY_OBJECT_ID,
        options: {
          showContent: true,
        },
      });

      if (!response.data || !response.data.content || response.data.content.dataType !== 'moveObject') {
        return null;
      }

      const content = response.data.content.fields as any;
      
      return {
        totalStrategies: parseInt(content.total_strategies),
        totalVolume: content.total_volume,
        isPaused: content.paused,
      };
    } catch (error) {
      console.error('Failed to fetch registry info:', error);
      return null;
    }
  }

  // ==================== EVENT PARSING ====================

  static async getStrategyEvents(
    client: IotaClient,
    strategyId: string
  ): Promise<DCAExecutionEvent[]> {
    try {
      // Query events for this strategy
      const events = await client.queryEvents({
        query: {
          MoveEventType: `${blitz_PACKAGE_ID.testnet}::${this.MODULE_NAME}::DCAOrderExecuted`
        },
        limit: 100,
      });

      const executionEvents: DCAExecutionEvent[] = [];

      for (const event of events.data) {
        if (event.parsedJson) {
          const data = event.parsedJson as any;
          if (data.strategy_id === strategyId) {
            executionEvents.push({
              strategyId: data.strategy_id,
              orderNumber: parseInt(data.order_number),
              amountIn: data.amount_in,
              amountOut: data.amount_out,
              price: data.price,
              keeperFee: data.keeper_fee,
              platformFee: data.platform_fee,
              timestamp: parseInt(data.timestamp),
              keeper: data.keeper,
            });
          }
        }
      }

      return executionEvents.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to fetch strategy events:', error);
      return [];
    }
  }

  // ==================== UTILITY FUNCTIONS ====================

  static formatInterval(intervalMs: number): string {
    const seconds = Math.floor(intervalMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  static getProgress(strategy: DCAStrategyV2): number {
    return strategy.totalOrders > 0 
      ? (strategy.executedOrders / strategy.totalOrders) * 100 
      : 0;
  }

  static getEstimatedCompletion(strategy: DCAStrategyV2): Date {
    const remainingOrders = strategy.totalOrders - strategy.executedOrders;
    const estimatedMs = remainingOrders * strategy.intervalMs;
    return new Date(Date.now() + estimatedMs);
  }

  static calculateROI(strategy: DCAStrategyV2): number {
    const invested = parseFloat(strategy.totalInvested);
    const received = parseFloat(strategy.totalReceived);
    
    if (invested === 0) return 0;
    
    return ((received - invested) / invested) * 100;
  }

  static isReadyForExecution(strategy: DCAStrategyV2): boolean {
    const currentTime = Date.now();
    return (
      strategy.isActive &&
      !strategy.isPaused &&
      !strategy.emergencyPause &&
      strategy.executedOrders < strategy.totalOrders &&
      currentTime >= strategy.nextExecutionTime &&
      parseInt(strategy.sourceBalance) > 0
    );
  }

  private static extractTypeParameters(type: string): [string, string] {
    // Extract type parameters from something like "0x123::dca_v2::DCAStrategy<0x456::coin::COIN, 0x789::coin::COIN>"
    const match = type.match(/<([^,]+),\s*([^>]+)>/);
    if (match) {
      return [match[1].trim(), match[2].trim()];
    }
    return ['', ''];
  }

  // ==================== ADMIN FUNCTIONS ====================

  static async emergencyPause(
    client: IotaClient,
    adminCapId: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::emergency_pause`,
      arguments: [
        tx.object(adminCapId),
        tx.object(this.REGISTRY_OBJECT_ID),
      ],
    });

    return tx;
  }

  static async emergencyResume(
    client: IotaClient,
    adminCapId: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::emergency_resume`,
      arguments: [
        tx.object(adminCapId),
        tx.object(this.REGISTRY_OBJECT_ID),
      ],
    });

    return tx;
  }

  static async addKeeper(
    client: IotaClient,
    adminCapId: string,
    keeperAddress: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::${this.MODULE_NAME}::add_keeper`,
      arguments: [
        tx.object(adminCapId),
        tx.object(this.REGISTRY_OBJECT_ID),
        tx.pure.address(keeperAddress),
      ],
    });

    return tx;
  }
}