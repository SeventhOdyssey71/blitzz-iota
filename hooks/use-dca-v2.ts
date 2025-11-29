'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { DCAServiceV2, DCAStrategyV2, CreateDCAV2Params, DCAExecutionEvent } from '@/lib/services/dca-service-v2';
import { PoolService } from '@/lib/services/pool-service';
import { toast } from 'sonner';

interface UseDCAV2Result {
  strategies: DCAStrategyV2[];
  executableStrategies: DCAStrategyV2[];
  isLoading: boolean;
  error: string | null;
  
  // Strategy management
  createStrategy: (params: CreateDCAV2Params) => Promise<{ success: boolean; error?: string }>;
  executeOrder: (strategy: DCAStrategyV2) => Promise<{ success: boolean; error?: string }>;
  pauseStrategy: (strategy: DCAStrategyV2, reason: string) => Promise<{ success: boolean; error?: string }>;
  resumeStrategy: (strategy: DCAStrategyV2) => Promise<{ success: boolean; error?: string }>;
  cancelStrategy: (strategy: DCAStrategyV2) => Promise<{ success: boolean; error?: string }>;
  
  // Data queries
  getStrategyEvents: (strategyId: string) => Promise<DCAExecutionEvent[]>;
  refetch: () => void;
  
  // Automated execution
  executePendingOrders: () => Promise<{ executed: number; failed: number }>;
}

export function useDCAV2(): UseDCAV2Result {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch user DCA strategies
  const {
    data: strategies = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dca-strategies-v2', currentAccount?.address],
    queryFn: async () => {
      if (!currentAccount?.address) return [];
      return DCAServiceV2.getUserStrategies(client, currentAccount.address);
    },
    enabled: !!currentAccount?.address,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Calculate executable strategies
  const executableStrategies = strategies.filter(strategy => 
    DCAServiceV2.isReadyForExecution(strategy)
  );

  // Auto-notification for executable strategies
  useEffect(() => {
    if (executableStrategies.length > 0) {
      console.log(`${executableStrategies.length} DCA strategies ready for execution`);
      
      // Optionally show notification
      if (executableStrategies.length === 1) {
        toast.info(`DCA strategy "${executableStrategies[0].name}" is ready for execution`);
      } else {
        toast.info(`${executableStrategies.length} DCA strategies are ready for execution`);
      }
    }
  }, [executableStrategies.length]);

  // Create strategy mutation
  const createStrategyMutation = useMutation({
    mutationFn: async (params: CreateDCAV2Params) => {
      if (!currentAccount) throw new Error('Wallet not connected');

      // Find pool
      const pool = await PoolService.findPool(params.sourceTokenType, params.targetTokenType);
      if (!pool) throw new Error('No pool found for this token pair');

      // Create transaction
      const tx = await DCAServiceV2.createDCAStrategy(client, {
        ...params,
        poolId: pool.poolId,
      });

      tx.setGasBudget(200000000); // 0.2 IOTA for strategy creation

      return new Promise<{ success: boolean; error?: string }>((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
            },
          },
          {
            onSuccess: (result) => {
              // Check transaction status
              const status = (result.effects as any)?.status?.status || (result.effects as any)?.status;
              
              if (status === 'failure' || status === 'failed') {
                const errorMsg = (result.effects as any)?.status?.error || 'Transaction failed on chain';
                console.error('❌ DCA transaction failed:', errorMsg);
                resolve({ success: false, error: errorMsg });
                return;
              }

              console.log('✅ DCA strategy created successfully');
              toast.success(`DCA strategy "${params.name}" created successfully!`);
              queryClient.invalidateQueries({ queryKey: ['dca-strategies-v2'] });
              resolve({ success: true });
            },
            onError: (error) => {
              console.error('❌ Transaction error:', error?.message);
              const errorMsg = error?.message || 'Failed to create DCA strategy';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    },
  });

  // Execute order mutation
  const executeOrderMutation = useMutation({
    mutationFn: async (strategy: DCAStrategyV2) => {
      if (!currentAccount) throw new Error('Wallet not connected');

      const pool = await PoolService.findPool(strategy.sourceTokenType, strategy.targetTokenType);
      if (!pool) throw new Error('Pool not found');

      const tx = await DCAServiceV2.executeDCAOrder(
        client,
        strategy.id,
        pool.poolId,
        strategy.sourceTokenType,
        strategy.targetTokenType
      );

      tx.setGasBudget(150000000); // 0.15 IOTA for execution

      return new Promise<boolean>((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
            },
          },
          {
            onSuccess: (result) => {
              toast.success(`DCA order executed for "${strategy.name}"`);
              queryClient.invalidateQueries({ queryKey: ['dca-strategies-v2'] });
              resolve(true);
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to execute DCA order';
              toast.error(errorMsg);
              resolve(false);
            },
          }
        );
      });
    },
  });

  // Strategy management functions
  const createStrategy = async (params: CreateDCAV2Params): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsExecuting(true);
      const result = await createStrategyMutation.mutateAsync(params);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create strategy';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  const executeOrder = async (strategy: DCAStrategyV2): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsExecuting(true);
      const success = await executeOrderMutation.mutateAsync(strategy);
      return { success };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute order';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  const pauseStrategy = async (strategy: DCAStrategyV2, reason: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentAccount) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsExecuting(true);

      const tx = await DCAServiceV2.pauseStrategy(
        client,
        strategy.id,
        reason,
        strategy.sourceTokenType,
        strategy.targetTokenType
      );

      tx.setGasBudget(50000000);

      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: { showEffects: true },
          },
          {
            onSuccess: () => {
              toast.success(`Strategy "${strategy.name}" paused`);
              queryClient.invalidateQueries({ queryKey: ['dca-strategies-v2'] });
              resolve({ success: true });
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to pause strategy';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to pause strategy';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  const resumeStrategy = async (strategy: DCAStrategyV2): Promise<{ success: boolean; error?: string }> => {
    if (!currentAccount) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsExecuting(true);

      const tx = await DCAServiceV2.resumeStrategy(
        client,
        strategy.id,
        strategy.sourceTokenType,
        strategy.targetTokenType
      );

      tx.setGasBudget(50000000);

      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: { showEffects: true },
          },
          {
            onSuccess: () => {
              toast.success(`Strategy "${strategy.name}" resumed`);
              queryClient.invalidateQueries({ queryKey: ['dca-strategies-v2'] });
              resolve({ success: true });
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to resume strategy';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to resume strategy';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  const cancelStrategy = async (strategy: DCAStrategyV2): Promise<{ success: boolean; error?: string }> => {
    if (!currentAccount) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsExecuting(true);

      const tx = await DCAServiceV2.cancelStrategy(
        client,
        strategy.id,
        strategy.sourceTokenType,
        strategy.targetTokenType
      );

      tx.setGasBudget(100000000);

      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: { showEffects: true },
          },
          {
            onSuccess: () => {
              toast.success(`Strategy "${strategy.name}" cancelled and funds returned`);
              queryClient.invalidateQueries({ queryKey: ['dca-strategies-v2'] });
              resolve({ success: true });
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to cancel strategy';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to cancel strategy';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  // Get strategy execution events
  const getStrategyEvents = async (strategyId: string): Promise<DCAExecutionEvent[]> => {
    try {
      return await DCAServiceV2.getStrategyEvents(client, strategyId);
    } catch (error) {
      console.error('Failed to fetch strategy events:', error);
      return [];
    }
  };

  // Execute all pending orders (batch execution)
  const executePendingOrders = async (): Promise<{ executed: number; failed: number }> => {
    let executed = 0;
    let failed = 0;

    for (const strategy of executableStrategies) {
      try {
        const result = await executeOrder(strategy);
        if (result.success) {
          executed++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    if (executed > 0) {
      toast.success(`Executed ${executed} DCA orders successfully`);
    }
    if (failed > 0) {
      toast.error(`Failed to execute ${failed} DCA orders`);
    }

    return { executed, failed };
  };

  return {
    strategies,
    executableStrategies,
    isLoading,
    error: error?.message || null,
    
    createStrategy,
    executeOrder,
    pauseStrategy,
    resumeStrategy,
    cancelStrategy,
    
    getStrategyEvents,
    refetch,
    executePendingOrders,
  };
}