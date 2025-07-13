'use client';

import { useEffect, useState } from 'react';
import { useCurrentAccount, useIotaClient } from '@iota/dapp-kit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { CoinIcon } from '@/components/coin-icon';
import { formatTokenAmount } from '@/lib/utils/format';
import { getCoinMetadata } from '@/lib/services/coin-metadata';
import { getTokenPrice } from '@/lib/services/price-feed';
import { SUPPORTED_COINS } from '@/config/iota.config';

interface WalletToken {
  coinType: string;
  balance: bigint;
  coinObjectCount: number;
  metadata?: {
    decimals: number;
    name: string;
    symbol: string;
    iconUrl?: string | null;
  };
  price?: {
    price: number;
    change24h: number;
  };
  usdValue?: number;
}

export function WalletTokens() {
  const currentAccount = useCurrentAccount();
  const client = useIotaClient();
  const [tokens, setTokens] = useState<WalletToken[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (currentAccount) {
      fetchWalletTokens();
    } else {
      setTokens([]);
      setTotalValue(0);
    }
  }, [currentAccount]);

  const fetchWalletTokens = async () => {
    if (!currentAccount) return;

    setLoading(true);
    try {
      // Get all coin balances
      const balances = await client.getAllBalances({
        owner: currentAccount.address,
      });

      const tokenData: WalletToken[] = [];
      let total = 0;

      // Filter to only show supported coins
      const supportedTypes = Object.values(SUPPORTED_COINS).map(coin => coin.type);
      const filteredBalances = balances.filter(balance => supportedTypes.includes(balance.coinType));
      
      // Process each coin type
      for (const balance of filteredBalances) {
        const token: WalletToken = {
          coinType: balance.coinType,
          balance: BigInt(balance.totalBalance),
          coinObjectCount: balance.coinObjectCount,
        };

        // Get metadata
        const metadata = await getCoinMetadata(balance.coinType);
        if (metadata) {
          token.metadata = metadata;
        } else {
          // Try to match with known coins
          const knownCoin = Object.values(SUPPORTED_COINS).find(
            coin => coin.type === balance.coinType
          );
          if (knownCoin) {
            token.metadata = {
              decimals: knownCoin.decimals,
              name: knownCoin.name,
              symbol: knownCoin.symbol,
              iconUrl: knownCoin.iconUrl,
            };
          } else {
            // Parse coin type to get better default metadata
            const parts = balance.coinType.split('::');
            const symbol = parts[parts.length - 1];
            
            // Check for common patterns
            let name = symbol;
            let iconUrl = null;
            
            // Skip unknown tokens since we're filtering to supported coins only
            continue;
            
            token.metadata = {
              decimals: 9,
              name: name,
              symbol: symbol,
              iconUrl: iconUrl,
            };
          }
        }

        // Get price data
        if (token.metadata.symbol) {
          const priceData = await getTokenPrice(token.metadata.symbol);
          if (priceData) {
            token.price = priceData;
            
            // Calculate USD value
            const formattedBalance = Number(token.balance) / Math.pow(10, token.metadata.decimals);
            token.usdValue = formattedBalance * priceData.price;
            total += token.usdValue;
          }
        }

        tokenData.push(token);
      }

      // Sort by USD value (highest first)
      tokenData.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));

      setTokens(tokenData);
      setTotalValue(total);
    } catch (error) {
      console.error('Error fetching wallet tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!currentAccount) {
    return (
      <Card className="bg-black/40 border-white/10 rounded-2xl animate-fade-in">
        <CardHeader>
          <CardTitle className="text-white font-bold text-lg tracking-wide">WALLET</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">Connect your wallet to view your tokens</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-black/40 border-white/10 rounded-2xl animate-fade-in">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white font-bold text-lg tracking-wide">WALLET</CardTitle>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
        </div>
        <div className="mt-4">
          <p className="text-4xl font-bold text-white mono">${formatTokenAmount(totalValue, 2)}</p>
          <p className="text-gray-400 text-sm uppercase tracking-wider mt-1">Total Value</p>
        </div>
      </CardHeader>
      <CardContent>
        {loading && tokens.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : tokens.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No tokens found</p>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => (
              <TokenRow key={token.coinType} token={token} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TokenRow({ token }: { token: WalletToken }) {
  const formattedBalance = token.metadata
    ? formatTokenAmount(
        Number(token.balance) / Math.pow(10, token.metadata.decimals),
        2
      )
    : '0';

  return (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all animate-slide-in">
      <div className="flex items-center gap-3">
        <CoinIcon
          symbol={token.metadata?.symbol || 'UNKNOWN'}
          coinType={token.coinType}
          iconUrl={token.metadata?.iconUrl}
          size={40}
        />
        <div className="flex-1">
          <div className="font-semibold text-white">{token.metadata?.symbol || 'UNKNOWN'}</div>
          <div className="text-sm text-gray-400">{token.metadata?.name}</div>
        </div>
      </div>
      
      <div className="text-right ml-auto min-w-[120px]">
        <div className="font-semibold text-white mono">{formattedBalance}</div>
        {token.price && token.usdValue !== undefined && (
          <>
            <div className="text-sm text-gray-400 mono">
              ${formatTokenAmount(token.usdValue, 2)}
            </div>
            <div className="flex items-center justify-end gap-1 mt-1">
              {token.price.change24h >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span
                className={`text-xs mono ${
                  token.price.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {token.price.change24h >= 0 ? '+' : ''}
                {token.price.change24h.toFixed(2)}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}