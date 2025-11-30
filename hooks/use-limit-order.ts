'use client';

import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { 
  LimitOrderService, 
  LimitOrder, 
  CreateLimitOrderParams,
  LimitOrderEvent 
} from '@/lib/services/limit-order-service';
import { toast } from 'sonner';

interface UseLimitOrderResult {
  orders: LimitOrder[];
  isLoading: boolean;
  error: string | null;
  
  // Order management
  placeLimitOrder: (params: CreateLimitOrderParams) => Promise<{ success: boolean; error?: string }>;
  cancelOrder: (orderId: string, orderBookId: string, sourceTokenType: string, targetTokenType: string) => Promise<{ success: boolean; error?: string }>;
  
  // Data queries
  refetch: () => void;
}

export function useLimitOrder(
  sourceTokenType?: string,
  targetTokenType?: string
): UseLimitOrderResult {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch user limit orders
  const {
    data: orders = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['limit-orders', currentAccount?.address, sourceTokenType, targetTokenType],
    queryFn: async () => {
      if (!currentAccount?.address || !sourceTokenType || !targetTokenType) return [];
      return LimitOrderService.getUserOrders(client, currentAccount.address, sourceTokenType, targetTokenType);
    },
    enabled: !!currentAccount?.address && !!sourceTokenType && !!targetTokenType,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });

  // Place limit order mutation
  const placeLimitOrderMutation = useMutation({
    mutationFn: async (params: CreateLimitOrderParams) => {
      if (!currentAccount) throw new Error('Wallet not connected');

      const tx = await LimitOrderService.placeLimitOrder(client, params);

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
              const status = (result.effects as any)?.status?.status || (result.effects as any)?.status;
              
              if (status === 'failure' || status === 'failed') {
                const errorMsg = (result.effects as any)?.status?.error || 'Transaction failed on chain';
                console.error('❌ Limit order placement failed:', errorMsg);
                resolve({ success: false, error: errorMsg });
                return;
              }

              console.log('✅ Limit order placed successfully');
              const orderType = params.isBuy ? 'buy' : 'sell';
              toast.success(`${orderType} order placed successfully!`);
              queryClient.invalidateQueries({ queryKey: ['limit-orders'] });
              resolve({ success: true });
            },
            onError: (error) => {
              console.error('❌ Limit order error:', error?.message);
              const errorMsg = error?.message || 'Failed to place limit order';
              toast.error(errorMsg);
              resolve({ success: false, error: errorMsg });
            },
          }
        );
      });
    },
  });

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, orderBookId, sourceTokenType, targetTokenType }: {
      orderId: string;
      orderBookId: string;
      sourceTokenType: string;
      targetTokenType: string;
    }) => {
      if (!currentAccount) throw new Error('Wallet not connected');

      const tx = await LimitOrderService.cancelLimitOrder(
        client,
        orderBookId,
        orderId,
        sourceTokenType,
        targetTokenType
      );

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
              toast.success('Order cancelled successfully');
              queryClient.invalidateQueries({ queryKey: ['limit-orders'] });
              resolve(true);
            },
            onError: (error) => {
              const errorMsg = error?.message || 'Failed to cancel order';
              toast.error(errorMsg);
              resolve(false);
            },
          }
        );
      });
    },
  });

  // Order management functions
  const placeLimitOrder = async (params: CreateLimitOrderParams): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsExecuting(true);
      const result = await placeLimitOrderMutation.mutateAsync(params);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to place limit order';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  const cancelOrder = async (
    orderId: string, 
    orderBookId: string, 
    sourceTokenType: string, 
    targetTokenType: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsExecuting(true);
      const success = await cancelOrderMutation.mutateAsync({
        orderId,
        orderBookId,
        sourceTokenType,
        targetTokenType,
      });
      return { success };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to cancel order';
      return { success: false, error: errorMsg };
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    orders,
    isLoading,
    error: error?.message || null,
    
    placeLimitOrder,
    cancelOrder,
    
    refetch,
  };
}