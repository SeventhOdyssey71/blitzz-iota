'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { useAllBalances } from '@/hooks/use-wallet-balance';
import { formatBalance } from '@/lib/utils/format';
import { useTokenPrices } from '@/hooks/use-token-price';
import { CoinIcon } from '@/components/coin-icon';
// Removed unused imports
import { Skeleton } from '@/components/ui/skeleton';

interface Token {
  symbol: string;
  type: string;
  decimals: number;
  name: string;
  iconUrl?: string;
}

interface TokenSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (token: Token) => void;
  selectedToken?: Token;
}

export function TokenSelector({ open, onClose, onSelect, selectedToken }: TokenSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const { balances, isLoading: isLoadingBalances } = useAllBalances();
  
  // Get symbols for price fetching
  const tokenSymbols = tokens.map(t => t.symbol);
  const { prices } = useTokenPrices(tokenSymbols);

  // Fetch metadata for all coins when balances are loaded
  useEffect(() => {
    async function fetchTokenMetadata() {
      setIsLoadingMetadata(true);
      try {
        // Only use supported coins
        const supportedTokens = Object.values(SUPPORTED_COINS).map(coin => ({
          symbol: coin.symbol,
          type: coin.type,
          decimals: coin.decimals,
          name: coin.name,
          iconUrl: coin.iconUrl,
        }));
        
        setTokens(supportedTokens);
      } catch (error) {
        console.error('Failed to fetch token metadata:', error);
        setTokens([]);
      } finally {
        setIsLoadingMetadata(false);
      }
    }

    fetchTokenMetadata();
  }, []);

  // Get balance for a token
  const getTokenBalance = (tokenType: string) => {
    const balance = balances.find(b => b.coinType === tokenType);
    if (!balance) return '0';
    const token = tokens.find(t => t.type === tokenType);
    const decimals = token?.decimals || 9;
    return formatBalance(balance.totalBalance, decimals);
  };

  // Filter tokens based on search
  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Sort tokens by balance (highest first)
  const sortedTokens = [...filteredTokens].sort((a, b) => {
    const balanceA = parseFloat(getTokenBalance(a.type));
    const balanceB = parseFloat(getTokenBalance(b.type));
    return balanceB - balanceA;
  });

  // Get price for a token
  const getTokenPrice = (symbol: string) => {
    return prices[symbol]?.price || 0;
  };

  const handleSelect = (token: Token) => {
    onSelect(token);
    onClose();
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-black border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white font-bold text-xl">Select a token</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose a token to swap or view your balances
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by name or symbol"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500/50"
          />
        </div>

        <ScrollArea className="h-96 mt-4">
          <div className="space-y-1">
            {isLoadingBalances || isLoadingMetadata ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div>
                      <Skeleton className="w-16 h-4 mb-1" />
                      <Skeleton className="w-24 h-3" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="w-20 h-4 mb-1" />
                    <Skeleton className="w-16 h-3" />
                  </div>
                </div>
              ))
            ) : sortedTokens.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchQuery ? 'No tokens found' : 'No tokens available'}
              </div>
            ) : (
              sortedTokens.map((token) => {
              const balance = getTokenBalance(token.type);
              const price = getTokenPrice(token.symbol);
              const isSelected = selectedToken?.type === token.type;

              return (
                <button
                  key={token.type}
                  onClick={() => handleSelect(token)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-white/10 border border-cyan-500/50'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CoinIcon 
                      symbol={token.symbol} 
                      coinType={token.type}
                      iconUrl={token.iconUrl}
                      size={40} 
                    />
                    <div className="text-left">
                      <div className="font-semibold text-white">{token.symbol}</div>
                      <div className="text-sm text-gray-400">{token.name}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-white mono">{balance}</div>
                    {price > 0 && (
                      <div className="text-sm text-gray-400 mono">
                        ${(parseFloat(balance) * price).toFixed(2)}
                      </div>
                    )}
                  </div>
                </button>
              );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}