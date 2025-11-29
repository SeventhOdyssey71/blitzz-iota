'use client';

import { IotaClient } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { blitz_PACKAGE_ID, SUPPORTED_COINS } from '@/config/iota.config';

export interface DCAStrategy {
  id: string;
  owner: string;
  poolId: string;
  sourceTokenType: string;
  targetTokenType: string;
  amountPerOrder: string;
  intervalMs: number;
  totalOrders: number;
  executedOrders: number;
  lastExecutionTime: number;
  minAmountOut: string;
  maxAmountOut: string;
  createdAt: number;
  isActive: boolean;
  sourceBalance: string;
  receivedBalance: string;
}

export interface CreateDCAParams {
  sourceTokenType: string;
  targetTokenType: string;
  totalAmount: string;
  intervalMs: number;
  totalOrders: number;
  minAmountOut?: string;
  maxAmountOut?: string;
  poolId: string;
}

export interface DCAExecutionResult {
  strategyId: string;
  orderNumber: number;
  amountIn: string;
  amountOut: string;
  timestamp: number;
}

export class DCAService {
  private static readonly REGISTRY_OBJECT_ID = 'DCA_REGISTRY_ID'; // To be set after deployment

  static async createDCAStrategy(
    client: IotaClient,
    params: CreateDCAParams
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    // Create the DCA strategy transaction
    tx.moveCall({
      target: `${packageId}::dca::create_dca_strategy`,
      arguments: [
        tx.object(this.REGISTRY_OBJECT_ID),
        tx.object(params.poolId),
        tx.gas, // Use gas coin for IOTA
        tx.pure.u64(params.intervalMs),
        tx.pure.u64(params.totalOrders),
        tx.pure.u64(params.minAmountOut || '0'),
        tx.pure.u64(params.maxAmountOut || '0'),
        tx.object('0x6'), // Clock object
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
      target: `${packageId}::dca::execute_dca_order`,
      arguments: [
        tx.object(strategyId),
        tx.object(poolId),
        tx.object('0x6'), // Clock object
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    return tx;
  }

  static async pauseDCAStrategy(
    client: IotaClient,
    strategyId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::dca::pause_strategy`,
      arguments: [tx.object(strategyId)],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    return tx;
  }

  static async resumeDCAStrategy(
    client: IotaClient,
    strategyId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::dca::resume_strategy`,
      arguments: [
        tx.object(strategyId),
        tx.object('0x6'), // Clock object
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    return tx;
  }

  static async cancelDCAStrategy(
    client: IotaClient,
    strategyId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<Transaction> {
    const tx = new Transaction();
    const packageId = blitz_PACKAGE_ID.testnet;

    tx.moveCall({
      target: `${packageId}::dca::cancel_dca_strategy`,
      arguments: [
        tx.object(this.REGISTRY_OBJECT_ID),
        tx.object(strategyId),
      ],
      typeArguments: [sourceTokenType, targetTokenType],
    });

    return tx;
  }

  static async getDCAStrategy(
    client: IotaClient,
    strategyId: string
  ): Promise<DCAStrategy | null> {
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
      
      return {
        id: strategyId,
        owner: content.owner,
        poolId: content.pool_id,
        sourceTokenType: '', // Extract from type parameters
        targetTokenType: '', // Extract from type parameters
        amountPerOrder: content.amount_per_order,
        intervalMs: parseInt(content.interval_ms),
        totalOrders: parseInt(content.total_orders),
        executedOrders: parseInt(content.executed_orders),
        lastExecutionTime: parseInt(content.last_execution_time),
        minAmountOut: content.min_amount_out,
        maxAmountOut: content.max_amount_out,
        createdAt: parseInt(content.created_at),
        isActive: content.is_active,
        sourceBalance: content.source_balance?.value || '0',
        receivedBalance: content.received_balance?.value || '0',
      };
    } catch (error) {
      console.error('Failed to fetch DCA strategy:', error);
      return null;
    }
  }

  static async getUserDCAStrategies(
    client: IotaClient,
    userAddress: string
  ): Promise<DCAStrategy[]> {
    try {
      // Query for DCAStrategy objects owned by the user
      const response = await client.getOwnedObjects({
        owner: userAddress,
        filter: {
          MoveModule: {
            package: blitz_PACKAGE_ID.testnet,
            module: 'dca',
          },
        },
        options: {
          showContent: true,
          showType: true,
        },
      });

      const strategies: DCAStrategy[] = [];

      for (const obj of response.data) {
        if (obj.data?.content?.dataType === 'moveObject') {
          const content = obj.data.content.fields as any;
          
          strategies.push({
            id: obj.data.objectId,
            owner: content.owner,
            poolId: content.pool_id,
            sourceTokenType: '', // Extract from type
            targetTokenType: '', // Extract from type
            amountPerOrder: content.amount_per_order,
            intervalMs: parseInt(content.interval_ms),
            totalOrders: parseInt(content.total_orders),
            executedOrders: parseInt(content.executed_orders),
            lastExecutionTime: parseInt(content.last_execution_time),
            minAmountOut: content.min_amount_out,
            maxAmountOut: content.max_amount_out,
            createdAt: parseInt(content.created_at),
            isActive: content.is_active,
            sourceBalance: content.source_balance?.value || '0',
            receivedBalance: content.received_balance?.value || '0',
          });
        }
      }

      return strategies;
    } catch (error) {
      console.error('Failed to fetch user DCA strategies:', error);
      return [];
    }
  }

  static async checkExecutableStrategies(
    client: IotaClient,
    strategies: DCAStrategy[]
  ): Promise<string[]> {
    const currentTime = Date.now();
    const executableIds: string[] = [];

    for (const strategy of strategies) {
      if (
        strategy.isActive &&
        strategy.executedOrders < strategy.totalOrders &&
        currentTime >= strategy.lastExecutionTime + strategy.intervalMs
      ) {
        executableIds.push(strategy.id);
      }
    }

    return executableIds;
  }

  static formatInterval(intervalMs: number): string {
    const seconds = Math.floor(intervalMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  static getNextExecutionTime(strategy: DCAStrategy): Date {
    return new Date(strategy.lastExecutionTime + strategy.intervalMs);
  }

  static getProgress(strategy: DCAStrategy): number {
    return strategy.totalOrders > 0 
      ? (strategy.executedOrders / strategy.totalOrders) * 100 
      : 0;
  }

  static calculateTotalInvestment(strategy: DCAStrategy): string {
    const amountPerOrder = BigInt(strategy.amountPerOrder);
    const totalAmount = amountPerOrder * BigInt(strategy.totalOrders);
    return totalAmount.toString();
  }
}