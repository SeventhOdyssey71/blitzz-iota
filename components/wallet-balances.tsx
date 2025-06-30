'use client';

import { useAllBalances } from '@/hooks/use-wallet-balance';
import { useCurrentAccount } from '@iota/dapp-kit';
import { formatBalance } from '@/lib/utils/format';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';
import { CoinIcon } from '@/components/coin-icon';
import { useTokenPrices } from '@/hooks/use-token-price';
import { useEffect, useState } from 'react';

interface CoinBalance {
  coinType: string;
  totalBalance: string;
  coinObjectCount: number;
}

const getCoinInfo = (coinType: string) => {
  // Check if it's IOTA
  if (coinType === '0x2::iota::IOTA') {
    return {
      symbol: 'IOTA',
      name: 'IOTA',
      decimals: 9,
      iconUrl: '/icons/iota.svg',
    };
  }
  
  // Check supported coins
  const supportedCoin = Object.values(SUPPORTED_COINS).find(
    coin => coin.type === coinType
  );
  
  if (supportedCoin) {
    return supportedCoin;
  }
  
  // Extract coin name from type
  const parts = coinType.split('::');
  const coinName = parts[parts.length - 1];
  
  return {
    symbol: coinName,
    name: coinName,
    decimals: 9,
    iconUrl: null,
  };
};

export function WalletBalances() {
  const currentAccount = useCurrentAccount();
  const isConnected = !!currentAccount;
  const { balances, isLoading } = useAllBalances();
  const [tokenSymbols, setTokenSymbols] = useState<string[]>([]);
  const { prices } = useTokenPrices(tokenSymbols);

  useEffect(() => {
    if (balances.length > 0) {
      const symbols = balances.map((balance: CoinBalance) => {
        const coinInfo = getCoinInfo(balance.coinType);
        return coinInfo.symbol;
      });
      setTokenSymbols(symbols);
    }
  }, [balances]);

  if (!isConnected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">Wallet Balances</span>
          <Info className="w-4 h-4 text-gray-500" />
        </div>
        <div className="text-center py-8 text-gray-500">
          Connect wallet to view balances
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">Wallet Balances</span>
          <Info className="w-4 h-4 text-gray-500" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }


  const formatCoinType = (type: string) => {
    if (type.length > 16) {
      return `${type.slice(0, 8)}...${type.slice(-6)}`;
    }
    return type;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-sm">Wallet Balances</span>
        <Info className="w-4 h-4 text-gray-500" />
      </div>

      {balances.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tokens found in wallet
        </div>
      ) : (
        <div className="space-y-2">
          {balances.map((balance: CoinBalance) => {
            const coinInfo = getCoinInfo(balance.coinType);
            const formattedBalance = formatBalance(
              balance.totalBalance,
              coinInfo.decimals
            );

            return (
              <div
                key={balance.coinType}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <CoinIcon symbol={coinInfo.symbol} size={24} />
                  <div>
                    <div className="text-black font-semibold">{coinInfo.symbol}</div>
                    <div className="text-gray-500 text-xs">
                      {formatCoinType(balance.coinType)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-black font-semibold">{formattedBalance}</div>
                  <div className="text-gray-500 text-xs">
                    {prices[coinInfo.symbol] ? 
                      `$${(parseFloat(formattedBalance) * prices[coinInfo.symbol].price).toFixed(2)}` : 
                      `${balance.coinObjectCount} ${balance.coinObjectCount === 1 ? 'object' : 'objects'}`
                    }
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}