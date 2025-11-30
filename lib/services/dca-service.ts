/**
 * Production-ready DCA (Dollar Cost Averaging) service
 */

'use client';

import { IotaClient } from '@iota/iota-sdk/client';
import { Transaction } from '@iota/iota-sdk/transactions';
import { IOTA_CONFIG, getTokenByType, MODULE_NAMES } from '@/config/iota.config';
import { getSafeIotaClient } from '@/lib/iota/safe-client';
import { log, measurePerformance } from '@/lib/logging';
import { dcaCache, withCache } from '@/lib/cache';
import { 
  ValidationError, 
  NetworkError, 
  TransactionError, 
  ErrorCode, 
  createValidationError 
} from '@/lib/errors';

// DCA Strategy interface with comprehensive type safety
export interface DCAStrategy {
  readonly id: string;
  readonly owner: string;
  readonly sourceTokenType: string;
  readonly targetTokenType: string;
  readonly poolId: string;
  
  // Strategy parameters
  readonly totalAmount: string;
  readonly amountPerOrder: string;
  readonly intervalMs: number;
  readonly totalOrders: number;
  readonly executedOrders: number;
  
  // Price protection
  readonly minPrice?: string;
  readonly maxPrice?: string;
  readonly maxSlippageBps: number;
  
  // Timestamps
  readonly createdAt: number;
  readonly lastExecutionTime: number;
  readonly nextExecutionTime: number;
  readonly expiresAt?: number;
  
  // Status
  readonly isActive: boolean;
  readonly isPaused: boolean;
  readonly emergencyStop: boolean;
  
  // Balances
  readonly sourceBalance: string;
  readonly receivedBalance: string;
  readonly totalInvested: string;
  readonly totalReceived: string;
  readonly averagePrice: string;
  
  // Metadata
  readonly name: string;
  readonly description?: string;
  readonly tags?: readonly string[];
}

export interface CreateDCAParams {
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
  readonly description?: string;
  readonly expiryDuration?: number; // Optional expiry in milliseconds
}

export interface DCAExecutionResult {
  readonly success: boolean;
  readonly transactionDigest?: string;
  readonly amountIn: string;
  readonly amountOut: string;
  readonly executionPrice: string;
  readonly gasCost: string;
  readonly timestamp: number;
}

export interface DCARegistryInfo {
  readonly registryId: string;
  readonly totalStrategies: number;
  readonly totalValueLocked: string;
  readonly isPaused: boolean;
  readonly feeRate: number;
  readonly version: string;
}

export class DCAService {
  private static instance: DCAService | null = null;
  private readonly client: IotaClient;
  private readonly packageId: string;
  private readonly registryId: string;

  private constructor() {
    this.client = getSafeIotaClient();
    this.packageId = IOTA_CONFIG.packages.core;
    this.registryId = IOTA_CONFIG.contracts.registries.dca;
    
    if (!this.client) {
      throw new NetworkError('Failed to initialize IOTA client');
    }
    
    if (!this.packageId || this.packageId === '0x0') {
      throw new Error('DCA package ID not configured. Please deploy contracts first.');
    }
    
    if (!this.registryId || this.registryId === '0x0') {
      log.warn('DCA registry not configured. Registry-based features will be unavailable.');
    }
  }

  static getInstance(): DCAService {
    if (!DCAService.instance) {
      DCAService.instance = new DCAService();
    }
    return DCAService.instance;
  }

  // ==================== VALIDATION ====================
  
  private validateCreateParams(params: CreateDCAParams): void {
    const { sourceTokenType, targetTokenType, totalAmount, amountPerOrder, intervalMs, totalOrders, maxSlippageBps } = params;
    
    // Token validation
    const sourceToken = getTokenByType(sourceTokenType);
    const targetToken = getTokenByType(targetTokenType);
    
    if (!sourceToken) {
      throw createValidationError('sourceTokenType', sourceTokenType, 'supported token type');
    }
    
    if (!targetToken) {
      throw createValidationError('targetTokenType', targetTokenType, 'supported token type');
    }
    
    if (sourceTokenType === targetTokenType) {
      throw new ValidationError('Source and target tokens must be different');
    }
    
    // Amount validation
    const totalAmountNum = parseFloat(totalAmount);
    const amountPerOrderNum = parseFloat(amountPerOrder);
    
    if (isNaN(totalAmountNum) || totalAmountNum <= 0) {
      throw createValidationError('totalAmount', totalAmount, 'positive number');
    }
    
    if (isNaN(amountPerOrderNum) || amountPerOrderNum <= 0) {
      throw createValidationError('amountPerOrder', amountPerOrder, 'positive number');
    }
    
    if (amountPerOrderNum > totalAmountNum) {
      throw new ValidationError('Amount per order cannot exceed total amount');
    }
    
    // Calculate expected orders
    const expectedOrders = Math.floor(totalAmountNum / amountPerOrderNum);
    if (Math.abs(expectedOrders - totalOrders) > 1) {
      throw new ValidationError(
        `Total orders (${totalOrders}) doesn't match calculated orders (${expectedOrders}) from amounts`
      );
    }
    
    // Interval validation
    if (intervalMs < IOTA_CONFIG.limits.minDCAInterval || intervalMs > IOTA_CONFIG.limits.maxDCAInterval) {
      throw new ValidationError(
        `Interval must be between ${IOTA_CONFIG.limits.minDCAInterval}ms and ${IOTA_CONFIG.limits.maxDCAInterval}ms`
      );
    }
    
    // Orders validation
    if (totalOrders < 1 || totalOrders > IOTA_CONFIG.limits.maxDCAOrders) {
      throw new ValidationError(`Total orders must be between 1 and ${IOTA_CONFIG.limits.maxDCAOrders}`);
    }
    
    // Slippage validation
    if (maxSlippageBps < 1 || maxSlippageBps > 5000) { // 0.01% to 50%
      throw new ValidationError('Max slippage must be between 1 and 5000 basis points');
    }
    
    // Name validation
    if (!params.name || params.name.trim().length === 0) {
      throw new ValidationError('Strategy name is required');
    }
    
    if (params.name.length > 100) {
      throw new ValidationError('Strategy name must be 100 characters or less');
    }
  }

  private parseTokenAmount(amount: string, decimals: number): string {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new ValidationError(`Invalid amount: ${amount}`);
    }
    
    return Math.floor(amountNum * Math.pow(10, decimals)).toString();
  }

  // ==================== REGISTRY OPERATIONS ====================
  
  async createRegistry(): Promise<Transaction> {
    const timer = measurePerformance('DCAService.createRegistry');
    
    try {
      if (!this.packageId || this.packageId === '0x0') {
        throw new Error('Package not deployed. Cannot create registry.');
      }
      
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::${MODULE_NAMES.DCA}::create_dca_registry`,
        arguments: [],
      });
      
      tx.setGasBudget(10_000_000); // 0.01 IOTA
      
      log.business('DCA registry creation transaction built', { packageId: this.packageId });
      
      return tx;
      
    } catch (error) {
      log.error('Failed to create DCA registry transaction', {}, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  async getRegistryInfo(): Promise<DCARegistryInfo | null> {
    if (!this.registryId || this.registryId === '0x0') {
      return null;
    }
    
    const timer = measurePerformance('DCAService.getRegistryInfo');
    
    try {
      const cacheKey = `dca-registry:${this.registryId}`;
      
      return await withCache(
        dcaCache,
        cacheKey,
        async () => {
          const registryObject = await this.client.getObject({
            id: this.registryId,
            options: { showContent: true },
          });

          if (!registryObject.data?.content || registryObject.data.content.dataType !== 'moveObject') {
            throw new Error('DCA registry not found or invalid');
          }

          const fields = registryObject.data.content.fields as any;
          
          return {
            registryId: this.registryId,
            totalStrategies: parseInt(fields.strategy_count || '0'),
            totalValueLocked: fields.total_value_locked || '0',
            isPaused: fields.is_paused || false,
            feeRate: parseInt(fields.fee_rate || '50'), // 0.5% default
            version: fields.version || '1.0.0',
          };
        },
        60000 // 1 minute cache
      );
      
    } catch (error) {
      log.error('Failed to get DCA registry info', { registryId: this.registryId }, error instanceof Error ? error : undefined);
      return null;
    } finally {
      timer.end();
    }
  }

  // ==================== STRATEGY OPERATIONS ====================
  
  async createStrategy(params: CreateDCAParams): Promise<Transaction> {
    const timer = measurePerformance('DCAService.createStrategy');
    
    try {
      // Validate parameters
      this.validateCreateParams(params);
      
      const sourceToken = getTokenByType(params.sourceTokenType)!;
      const targetToken = getTokenByType(params.targetTokenType)!;
      
      // Parse amounts with correct decimals
      const totalAmount = this.parseTokenAmount(params.totalAmount, sourceToken.decimals);
      const amountPerOrder = this.parseTokenAmount(params.amountPerOrder, sourceToken.decimals);
      const minPrice = params.minPrice ? this.parseTokenAmount(params.minPrice, 6) : '0';
      const maxPrice = params.maxPrice ? this.parseTokenAmount(params.maxPrice, 6) : '0';
      
      const tx = new Transaction();
      
      // Split source token from gas for strategy funding
      const sourceCoin = params.sourceTokenType === '0x2::iota::IOTA' 
        ? tx.splitCoins(tx.gas, [totalAmount])
        : tx.gas; // TODO: Handle other tokens when available
      
      if (this.registryId && this.registryId !== '0x0') {
        // Use registry-based approach
        tx.moveCall({
          target: `${this.packageId}::${MODULE_NAMES.DCA}::create_strategy`,
          typeArguments: [params.sourceTokenType, params.targetTokenType],
          arguments: [
            tx.object(this.registryId),
            sourceCoin,
            tx.pure.string(params.name),
            tx.pure.u64(params.intervalMs),
            tx.pure.u64(params.totalOrders),
            tx.pure.u64(amountPerOrder),
            tx.pure.u64(minPrice),
            tx.pure.u64(maxPrice),
            tx.pure.u64(params.maxSlippageBps),
            tx.pure.u64(params.expiryDuration || 0),
          ],
        });
      } else {
        // Use simplified approach without registry
        tx.moveCall({
          target: `${this.packageId}::${MODULE_NAMES.DCA}::create_strategy_simple`,
          typeArguments: [params.sourceTokenType, params.targetTokenType],
          arguments: [
            sourceCoin,
            tx.pure.string(params.name),
            tx.pure.u64(params.intervalMs),
            tx.pure.u64(params.totalOrders),
            tx.pure.u64(amountPerOrder),
            tx.pure.u64(minPrice),
            tx.pure.u64(maxPrice),
            tx.pure.u64(params.maxSlippageBps),
          ],
        });
      }
      
      tx.setGasBudget(20_000_000); // 0.02 IOTA
      
      log.business('DCA strategy creation transaction built', {
        name: params.name,
        sourceToken: sourceToken.symbol,
        targetToken: targetToken.symbol,
        totalAmount: params.totalAmount,
        intervalMs: params.intervalMs,
        totalOrders: params.totalOrders,
      });
      
      return tx;
      
    } catch (error) {
      log.error('Failed to create DCA strategy', params, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  async executeStrategy(strategyId: string): Promise<Transaction> {
    const timer = measurePerformance('DCAService.executeStrategy');
    
    try {
      if (!strategyId || strategyId === '0x0') {
        throw new ValidationError('Invalid strategy ID');
      }
      
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::${MODULE_NAMES.DCA}::execute_strategy`,
        arguments: [
          tx.object(strategyId),
        ],
      });
      
      tx.setGasBudget(15_000_000); // 0.015 IOTA
      
      log.business('DCA strategy execution transaction built', { strategyId });
      
      return tx;
      
    } catch (error) {
      log.error('Failed to create DCA execution transaction', { strategyId }, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  async pauseStrategy(strategyId: string): Promise<Transaction> {
    const timer = measurePerformance('DCAService.pauseStrategy');
    
    try {
      if (!strategyId || strategyId === '0x0') {
        throw new ValidationError('Invalid strategy ID');
      }
      
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::${MODULE_NAMES.DCA}::pause_strategy`,
        arguments: [
          tx.object(strategyId),
        ],
      });
      
      tx.setGasBudget(5_000_000); // 0.005 IOTA
      
      log.business('DCA strategy pause transaction built', { strategyId });
      
      return tx;
      
    } catch (error) {
      log.error('Failed to create DCA pause transaction', { strategyId }, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  async cancelStrategy(strategyId: string): Promise<Transaction> {
    const timer = measurePerformance('DCAService.cancelStrategy');
    
    try {
      if (!strategyId || strategyId === '0x0') {
        throw new ValidationError('Invalid strategy ID');
      }
      
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${this.packageId}::${MODULE_NAMES.DCA}::cancel_strategy`,
        arguments: [
          tx.object(strategyId),
        ],
      });
      
      tx.setGasBudget(10_000_000); // 0.01 IOTA
      
      log.business('DCA strategy cancellation transaction built', { strategyId });
      
      return tx;
      
    } catch (error) {
      log.error('Failed to create DCA cancellation transaction', { strategyId }, error instanceof Error ? error : undefined);
      throw error;
    } finally {
      timer.end();
    }
  }

  async getStrategy(strategyId: string): Promise<DCAStrategy | null> {
    const timer = measurePerformance('DCAService.getStrategy');
    
    try {
      if (!strategyId || strategyId === '0x0') {
        return null;
      }
      
      const cacheKey = `dca-strategy:${strategyId}`;
      
      return await withCache(
        dcaCache,
        cacheKey,
        async () => {
          const strategyObject = await this.client.getObject({
            id: strategyId,
            options: { showContent: true, showOwner: true },
          });

          if (!strategyObject.data?.content || strategyObject.data.content.dataType !== 'moveObject') {
            return null;
          }

          const fields = strategyObject.data.content.fields as any;
          const owner = strategyObject.data.owner && 'AddressOwner' in strategyObject.data.owner 
            ? strategyObject.data.owner.AddressOwner 
            : '';

          return {
            id: strategyId,
            owner,
            sourceTokenType: fields.source_token_type || '',
            targetTokenType: fields.target_token_type || '',
            poolId: fields.pool_id || '',
            totalAmount: fields.total_amount || '0',
            amountPerOrder: fields.amount_per_order || '0',
            intervalMs: parseInt(fields.interval_ms || '0'),
            totalOrders: parseInt(fields.total_orders || '0'),
            executedOrders: parseInt(fields.executed_orders || '0'),
            minPrice: fields.min_price || undefined,
            maxPrice: fields.max_price || undefined,
            maxSlippageBps: parseInt(fields.max_slippage_bps || '500'),
            createdAt: parseInt(fields.created_at || '0'),
            lastExecutionTime: parseInt(fields.last_execution_time || '0'),
            nextExecutionTime: parseInt(fields.next_execution_time || '0'),
            expiresAt: fields.expires_at ? parseInt(fields.expires_at) : undefined,
            isActive: fields.is_active || false,
            isPaused: fields.is_paused || false,
            emergencyStop: fields.emergency_stop || false,
            sourceBalance: fields.source_balance || '0',
            receivedBalance: fields.received_balance || '0',
            totalInvested: fields.total_invested || '0',
            totalReceived: fields.total_received || '0',
            averagePrice: fields.average_price || '0',
            name: fields.name || 'Unnamed Strategy',
            description: fields.description || undefined,
            tags: fields.tags || [],
          };
        },
        30000 // 30 second cache
      );
      
    } catch (error) {
      log.error('Failed to get DCA strategy', { strategyId }, error instanceof Error ? error : undefined);
      return null;
    } finally {
      timer.end();
    }
  }

  // ==================== STATIC CONVENIENCE METHODS ====================
  
  static getInstance = () => DCAService.getInstance();
  
  static async createStrategy(params: CreateDCAParams): Promise<Transaction> {
    return DCAService.getInstance().createStrategy(params);
  }
  
  static async executeStrategy(strategyId: string): Promise<Transaction> {
    return DCAService.getInstance().executeStrategy(strategyId);
  }
  
  static async getStrategy(strategyId: string): Promise<DCAStrategy | null> {
    return DCAService.getInstance().getStrategy(strategyId);
  }
  
  static async pauseStrategy(strategyId: string): Promise<Transaction> {
    return DCAService.getInstance().pauseStrategy(strategyId);
  }
  
  static async cancelStrategy(strategyId: string): Promise<Transaction> {
    return DCAService.getInstance().cancelStrategy(strategyId);
  }
}