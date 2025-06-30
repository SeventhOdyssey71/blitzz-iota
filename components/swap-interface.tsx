'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ArrowUpDown, Settings, Info, Loader2 } from 'lucide-react';
import { useCurrentAccount } from '@iota/dapp-kit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTokenPrice } from '@/hooks/use-token-price';
import { useWalletBalance } from '@/hooks/use-wallet-balance';
import { calculateSwapOutput } from '@/lib/services/price-feed';
import { formatTokenAmount } from '@/lib/utils/format';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { toast } from 'sonner';
import { useSimpleSwap } from '@/hooks/use-simple-swap';
import { TokenSelector } from '@/components/token-selector';
import { CoinIcon } from '@/components/coin-icon';

interface Token {
  symbol: string;
  type: string;
  decimals: number;
  name: string;
  iconUrl?: string;
}

export function SwapInterface() {
  const currentAccount = useCurrentAccount();
  const isConnected = !!currentAccount;
  const [inputToken, setInputToken] = useState<Token>(SUPPORTED_COINS.IOTA);
  const [outputToken, setOutputToken] = useState<Token>(SUPPORTED_COINS.stIOTA);
  const [inputAmount, setInputAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [showTokenSelect, setShowTokenSelect] = useState<'input' | 'output' | null>(null);
  
  // Use the swap hook
  const { executeSwap, isSwapping } = useSimpleSwap();

  // Fetch token prices
  const { price: inputPrice } = useTokenPrice(inputToken.symbol);
  const { price: outputPrice } = useTokenPrice(outputToken.symbol);

  // Fetch wallet balances
  const { balance: inputBalance, formatted: inputBalanceFormatted } = useWalletBalance(inputToken.type);
  const { balance: outputBalance, formatted: outputBalanceFormatted } = useWalletBalance(outputToken.type);

  // Calculate swap output
  const swapCalculation = inputAmount && inputPrice && outputPrice
    ? calculateSwapOutput(
        parseFloat(inputAmount),
        inputPrice.price,
        outputPrice.price,
        slippage
      )
    : null;

  const handleSwap = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!swapCalculation) {
      toast.error('Unable to calculate swap output');
      return;
    }

    const result = await executeSwap({
      inputToken,
      outputToken,
      inputAmount,
      minOutputAmount: swapCalculation.minimumReceived.toString(),
      slippage,
    });

    if (result.success) {
      setInputAmount('');
    }
  };

  const handleFlipTokens = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount('');
  };

  const handleMaxInput = () => {
    if (inputBalanceFormatted) {
      setInputAmount(inputBalanceFormatted);
    }
  };

  return (
    <div className="space-y-4">
      {/* Aggregator Mode */}
      <div className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-2xl animate-fade-in">
        <div className="flex items-center gap-2">
          <span className="text-gray-300 text-sm font-medium">Aggregator Mode</span>
          <Switch className="switch-root" />
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400">
                <Settings className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-black border-white/10">
              <div className="space-y-4">
                <h4 className="font-semibold text-white">Transaction Settings</h4>
                <div>
                  <label className="text-sm text-gray-400">Slippage Tolerance (%)</label>
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      value={slippage}
                      onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white/5 border-white/10 text-white"
                      placeholder="0.5"
                      step="0.1"
                      min="0"
                      max="50"
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Badge variant="outline" className="text-xs border-white/20 text-gray-300">
            {slippage}% slippage
          </Badge>
        </div>
      </div>

      {/* You Pay */}
      <Card className="bg-black/40 border-white/10 rounded-2xl card-hover animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium tracking-wide uppercase">You Pay</span>
            {isConnected && (
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <span>Balance: {inputBalanceFormatted || '0'}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto p-0"
                  onClick={handleMaxInput}
                >
                  MAX
                </Button>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              value={inputAmount}
              onChange={(e) => setInputAmount(e.target.value)}
              className="bg-transparent border-none text-3xl font-bold text-white p-0 h-auto mono focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              type="number"
              min="0"
              step="any"
            />
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-white/10"
              onClick={() => setShowTokenSelect('input')}
            >
              <CoinIcon symbol={inputToken.symbol} coinType={inputToken.type} iconUrl={inputToken.iconUrl} size={24} />
              <span className="text-white font-medium">{inputToken.symbol}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
          {inputAmount && inputPrice && (
            <div className="text-xs text-gray-500 mt-1">
              ≈ ${formatTokenAmount(parseFloat(inputAmount) * inputPrice.price, 2)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Swap Arrow */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl bg-black/60 hover:bg-white/10 border border-white/10 transform hover:scale-105 transition-all"
          onClick={handleFlipTokens}
        >
          <ArrowUpDown className="w-4 h-4 text-gray-700" />
        </Button>
      </div>

      {/* You Receive */}
      <Card className="bg-black/40 border-white/10 rounded-2xl card-hover animate-fade-in">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium tracking-wide uppercase">You Receive</span>
            {isConnected && (
              <span className="text-gray-500 text-xs">
                Balance: {outputBalanceFormatted || '0'}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold text-white mono">
              {swapCalculation ? formatTokenAmount(swapCalculation.outputAmount, 6) : '0.0'}
            </div>
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-white/10"
              onClick={() => setShowTokenSelect('output')}
            >
              <CoinIcon symbol={outputToken.symbol} coinType={outputToken.type} iconUrl={outputToken.iconUrl} size={24} />
              <span className="text-white font-medium">{outputToken.symbol}</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </Button>
          </div>
          {swapCalculation && outputPrice && (
            <div className="text-xs text-gray-500 mt-1">
              ≈ ${formatTokenAmount(swapCalculation.outputAmount * outputPrice.price, 2)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Swap Details */}
      {swapCalculation && inputPrice && outputPrice && (
        <Card className="bg-black/40 border-white/10 rounded-2xl animate-fade-in">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Rate</span>
              <span className="text-white mono">
                1 {inputToken.symbol} = {formatTokenAmount(outputPrice.price / inputPrice.price, 6)} {outputToken.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Price Impact</span>
              <span className={swapCalculation.priceImpact > 3 ? "text-red-400" : "text-cyan-400"}>
                {swapCalculation.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Minimum Received</span>
              <span className="text-white mono">
                {formatTokenAmount(swapCalculation.minimumReceived, 6)} {outputToken.symbol}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Route</span>
              <span className="text-cyan-400">{swapCalculation.route.join(' → ')}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Swap Button */}
      {isConnected ? (
        <Button
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-4 rounded-xl font-semibold text-lg tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSwap}
          disabled={isSwapping || !inputAmount || parseFloat(inputAmount) <= 0}
        >
          {isSwapping ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Swapping...
            </>
          ) : (
            'Swap'
          )}
        </Button>
      ) : (
        <Button
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-4 rounded-xl font-semibold text-lg tracking-wide transition-all"
          onClick={() => document.querySelector<HTMLButtonElement>('[aria-label="Connect Wallet"]')?.click()}
        >
          Connect Wallet
        </Button>
      )}

      {/* Price Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-sm">Token Prices</span>
          <Info className="w-4 h-4 text-gray-500" />
        </div>

        <div className="space-y-2">
          {inputPrice && (
            <TokenPriceCard token={inputToken} price={inputPrice} />
          )}
          {outputPrice && (
            <TokenPriceCard token={outputToken} price={outputPrice} />
          )}
        </div>
      </div>

      {/* Token Selector */}
      <TokenSelector
        open={showTokenSelect === 'input'}
        onClose={() => setShowTokenSelect(null)}
        onSelect={setInputToken}
        selectedToken={inputToken}
      />
      <TokenSelector
        open={showTokenSelect === 'output'}
        onClose={() => setShowTokenSelect(null)}
        onSelect={setOutputToken}
        selectedToken={outputToken}
      />
    </div>
  );
}

function TokenPriceCard({ token, price }: { token: Token; price: any }) {
  return (
    <div className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-xl hover:bg-white/5 transition-all animate-slide-in">
      <div className="flex items-center gap-3">
        <CoinIcon symbol={token.symbol} coinType={token.type} iconUrl={token.iconUrl} size={24} />
        <div>
          <div className="text-white font-semibold">{token.symbol}</div>
          <div className="text-gray-400 text-xs">
            Vol: ${formatTokenAmount(price.volume24h, 0)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-white font-semibold mono">${price.price.toFixed(4)}</div>
        <div className={`text-xs font-medium ${price.change24h >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
          {price.change24h >= 0 ? '+' : ''}{price.change24h.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}