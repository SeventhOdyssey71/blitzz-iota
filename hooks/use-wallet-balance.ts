import { useCurrentAccount, useIotaClientQuery } from '@iota/dapp-kit';
import { formatBalance } from '@/lib/utils/format';
import { SUPPORTED_COINS } from '@/config/iota.config';

export function useWalletBalance(coinType?: string) {
  const currentAccount = useCurrentAccount();
  
  const { data: balance, isLoading, error } = useIotaClientQuery(
    'getBalance',
    {
      owner: currentAccount?.address || '',
      coinType,
    },
    {
      enabled: !!currentAccount?.address,
    }
  );

  return {
    balance: balance?.totalBalance || '0',
    isLoading,
    error,
    formatted: balance ? formatBalance(balance.totalBalance, balance.coinMetadata?.decimals || 9) : '0',
  };
}

export function useAllBalances() {
  const currentAccount = useCurrentAccount();
  
  const { data: balances, isLoading, error } = useIotaClientQuery(
    'getAllBalances',
    {
      owner: currentAccount?.address || '',
    },
    {
      enabled: !!currentAccount?.address,
    }
  );

  return {
    balances: balances || [],
    isLoading,
    error,
  };
}