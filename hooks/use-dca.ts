'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { DCAService, DCAStrategy, CreateDCAParams } from '@/lib/services/dca-service';
import { PoolService } from '@/lib/services/pool-service';
import { parseTokenAmount } from '@/lib/utils/format';
import { toast } from 'sonner';

interface UseDCAResult {
  strategies: DCAStrategy[];
  isLoading: boolean;
  error: string | null;
  createStrategy: (params: CreateDCAParams) => Promise<{ success: boolean; error?: string; strategyId?: string }>;
  executeOrder: (strategyId: string, sourceTokenType: string, targetTokenType: string) => Promise<{ success: boolean; error?: string }>;
  pauseStrategy: (strategyId: string, sourceTokenType: string, targetTokenType: string) => Promise<{ success: boolean; error?: string }>;
  resumeStrategy: (strategyId: string, sourceTokenType: string, targetTokenType: string) => Promise<{ success: boolean; error?: string }>;
  cancelStrategy: (strategyId: string, sourceTokenType: string, targetTokenType: string) => Promise<{ success: boolean; error?: string }>;
  refetch: () => void;
}

export function useDCA(): UseDCAResult {
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
    queryKey: ['dca-strategies', currentAccount?.address],
    queryFn: async () => {
      if (!currentAccount?.address) return [];
      return DCAService.getUserDCAStrategies(client, currentAccount.address);
    },
    enabled: !!currentAccount?.address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Auto-check for executable strategies
  useEffect(() => {
    if (!strategies.length) return;

    const checkExecutable = async () => {
      const executableIds = await DCAService.checkExecutableStrategies(client, strategies);
      if (executableIds.length > 0) {
        // Notify user about executable strategies
        console.log('Executable DCA strategies:', executableIds);
      }
    };

    checkExecutable();
    const interval = setInterval(checkExecutable, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [strategies, client]);

  const createStrategy = async (params: CreateDCAParams): Promise<{ success: boolean; error?: string; strategyId?: string }> => {
    if (!currentAccount) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsExecuting(true);

      // Find the pool for the token pair
      const pool = await PoolService.findPool(params.sourceTokenType, params.targetTokenType);
      if (!pool) {
        return { success: false, error: 'No pool found for this token pair' };
      }

      // Create the transaction
      const tx = await DCAService.createDCAStrategy(client, {
        ...params,
        poolId: pool.id,
      });

      // Set gas budget
      tx.setGasBudget(100000000); // 0.1 IOTA

      return new Promise((resolve) => {
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
              // Extract strategy ID from events or created objects
              let strategyId = '';
              if (result.effects?.created) {
                const created = result.effects.created.find(obj => 
                  obj.reference.objectId !== result.effects?.gasObject?.reference?.objectId
                );
                if (created) {
                  strategyId = created.reference.objectId;
                }
              }

              toast.success('DCA strategy created successfully!');
              queryClient.invalidateQueries({ queryKey: ['dca-strategies'] });
              resolve({ success: true, strategyId });
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to create DCA strategy';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create DCA strategy';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  const executeOrder = async (
    strategyId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentAccount) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsExecuting(true);

      // Find the pool
      const pool = await PoolService.findPool(sourceTokenType, targetTokenType);
      if (!pool) {
        return { success: false, error: 'No pool found for this token pair' };
      }

      const tx = await DCAService.executeDCAOrder(
        client,
        strategyId,
        pool.id,
        sourceTokenType,
        targetTokenType
      );

      tx.setGasBudget(100000000);

      return new Promise((resolve) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
            },
          },
          {
            onSuccess: () => {
              toast.success('DCA order executed successfully!');
              queryClient.invalidateQueries({ queryKey: ['dca-strategies'] });
              resolve({ success: true });
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to execute DCA order';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to execute DCA order';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  const pauseStrategy = async (
    strategyId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentAccount) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsExecuting(true);

      const tx = await DCAService.pauseDCAStrategy(
        client,
        strategyId,
        sourceTokenType,
        targetTokenType
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
              toast.success('DCA strategy paused successfully!');
              queryClient.invalidateQueries({ queryKey: ['dca-strategies'] });
              resolve({ success: true });
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to pause DCA strategy';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to pause DCA strategy';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  const resumeStrategy = async (
    strategyId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentAccount) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsExecuting(true);

      const tx = await DCAService.resumeDCAStrategy(
        client,
        strategyId,
        sourceTokenType,
        targetTokenType
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
              toast.success('DCA strategy resumed successfully!');
              queryClient.invalidateQueries({ queryKey: ['dca-strategies'] });
              resolve({ success: true });
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to resume DCA strategy';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to resume DCA strategy';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  const cancelStrategy = async (
    strategyId: string,
    sourceTokenType: string,
    targetTokenType: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentAccount) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      setIsExecuting(true);

      const tx = await DCAService.cancelDCAStrategy(
        client,
        strategyId,
        sourceTokenType,
        targetTokenType
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
              toast.success('DCA strategy cancelled successfully!');
              queryClient.invalidateQueries({ queryKey: ['dca-strategies'] });
              resolve({ success: true });
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to cancel DCA strategy';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to cancel DCA strategy';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    strategies,
    isLoading,
    error: error?.message || null,
    createStrategy,
    executeOrder,
    pauseStrategy,
    resumeStrategy,
    cancelStrategy,
    refetch,
  };
}