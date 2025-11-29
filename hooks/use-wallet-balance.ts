'use client';

import { useCurrentAccount, useIotaClientQuery } from '@iota/dapp-kit';
import { formatBalance } from '@/lib/utils/format';
import { SUPPORTED_COINS } from '@/config/iota.config';

interface UseWalletBalanceResult {
  balance: string;
  isLoading: boolean;
  error: Error | null;
  formatted: string;
  refetch: () => void;
}

interface UseAllBalancesResult {
  balances: Array<{
    coinType: string;
    coinObjectCount: number;
    totalBalance: string;
    lockedBalance?: {
      epochId?: number;
      number?: string;
    };
  }>;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useWalletBalance(coinType?: string): UseWalletBalanceResult {
  const currentAccount = useCurrentAccount();
  
  const { data: balance, isLoading, error, refetch } = useIotaClientQuery(
    'getBalance',
    {
      owner: currentAccount?.address || '',
      coinType: coinType || SUPPORTED_COINS.IOTA.type,
    },
    {
      enabled: !!currentAccount?.address,
      staleTime: 10000, // 10 seconds
      gcTime: 60000, // 1 minute
      retry: 3,
    }
  );

  return {
    balance: balance?.totalBalance || '0',
    isLoading,
    error: error as Error | null,
    formatted: balance 
      ? formatBalance(balance.totalBalance, 9) // Default to 9 decimals for IOTA 
      : '0',
    refetch,
  };
}

export function useAllBalances(): UseAllBalancesResult {
  const currentAccount = useCurrentAccount();
  
  const { data: balances, isLoading, error, refetch } = useIotaClientQuery(
    'getAllBalances',
    {
      owner: currentAccount?.address || '',
    },
    {
      enabled: !!currentAccount?.address,
      staleTime: 15000, // 15 seconds
      gcTime: 60000, // 1 minute
      retry: 3,
    }
  );

  return {
    balances: balances || [],
    isLoading,
    error: error as Error | null,
    refetch,
  };
}