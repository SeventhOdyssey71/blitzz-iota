'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { useAllBalances } from '@/hooks/use-wallet-balance';
import { formatBalance } from '@/lib/utils/format';
import { useTokenPrices } from '@/hooks/use-token-price';
import { CoinIcon } from '@/components/coin-icon';
import { Input } from '@/components/ui/input';

interface Token {
  symbol: string;
  type: string;
  decimals: number;
  name: string;
  iconUrl?: string;
}

interface TokenDropdownProps {
  selectedToken: Token;
  onSelect: (token: Token) => void;
  excludeToken?: Token;
}

export function TokenDropdown({ selectedToken, onSelect, excludeToken }: TokenDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { balances } = useAllBalances();
  
  // Get all supported tokens
  const tokens = Object.values(SUPPORTED_COINS).filter(
    token => token.type !== excludeToken?.type
  );
  
  // Get symbols for price fetching
  const tokenSymbols = tokens.map(t => t.symbol);
  const { prices } = useTokenPrices(tokenSymbols);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get balance for a token
  const getTokenBalance = (tokenType: string) => {
    const balance = balances.find(b => b.coinType === tokenType);
    if (!balance) return '0';
    const token = tokens.find(t => t.type === tokenType);
    const decimals = token?.decimals || 9;
    return formatBalance(balance.totalBalance, decimals);
  };

  // Get price for a token
  const getTokenPrice = (symbol: string) => {
    return prices[symbol]?.price || 0;
  };

  // Filter tokens based on search
  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (token: Token) => {
    onSelect(token);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-700/50 hover:bg-gray-700 transition-colors min-w-[120px]"
      >
        <CoinIcon 
          symbol={selectedToken.symbol} 
          coinType={selectedToken.type} 
          iconUrl={selectedToken.iconUrl} 
          size={24} 
        />
        <span className="text-white font-medium">{selectedToken.symbol}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-[320px] bg-gray-900 border border-gray-800 rounded-xl shadow-xl z-50">
          {/* Search */}
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 h-9"
                autoFocus
              />
            </div>
          </div>

          {/* Token List */}
          <div className="max-h-[300px] overflow-y-auto">
            {filteredTokens.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                No tokens found
              </div>
            ) : (
              filteredTokens.map((token) => {
                const balance = getTokenBalance(token.type);
                const price = getTokenPrice(token.symbol);
                const isSelected = selectedToken.type === token.type;

                return (
                  <button
                    key={token.type}
                    onClick={() => handleSelect(token)}
                    className={`w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors ${
                      isSelected ? 'bg-gray-800/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CoinIcon 
                        symbol={token.symbol} 
                        coinType={token.type}
                        iconUrl={token.iconUrl}
                        size={32} 
                      />
                      <div className="text-left">
                        <div className="font-medium text-white">{token.symbol}</div>
                        <div className="text-xs text-gray-500">{token.name}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-white">{balance}</div>
                      {price > 0 && (
                        <div className="text-xs text-gray-500">
                          ${(parseFloat(balance) * price).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}