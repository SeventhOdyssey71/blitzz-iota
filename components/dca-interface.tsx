'use client';

import { useState } from 'react';
import { ArrowUpDown, Info, Loader2, Settings, Clock, TrendingUp } from 'lucide-react';
import { useCurrentAccount } from '@iota/dapp-kit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTokenPrice } from '@/hooks/use-token-price';
import { useWalletBalance } from '@/hooks/use-wallet-balance';
import { formatTokenAmount } from '@/lib/utils/format';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { toast } from 'sonner';
import { TokenSelector } from '@/components/token-selector';
import { CoinIcon } from '@/components/coin-icon';
import { useDCAV2 } from '@/hooks/use-dca-v2';
import { useSwapCalculation } from '@/hooks/use-swap-calculation';

interface Token {
  symbol: string;
  type: string;
  decimals: number;
  name: string;
  iconUrl?: string;
}

export function DCAInterface() {
  const currentAccount = useCurrentAccount();
  const isConnected = !!currentAccount;

  // Token selection
  const [inputToken, setInputToken] = useState<Token>(SUPPORTED_COINS.IOTA);
  const [outputToken, setOutputToken] = useState<Token>(SUPPORTED_COINS.stIOTA);

  // DCA hook for real transaction handling
  const { createStrategy } = useDCAV2();
  
  // DCA parameters
  const [totalAmount, setTotalAmount] = useState('');
  const [amountMode, setAmountMode] = useState<'total' | 'per_order'>('total');
  const [frequency, setFrequency] = useState('1');
  const [interval, setInterval] = useState('hour');
  const [orderCount, setOrderCount] = useState('2');
  
  // Price range settings
  const [usePriceRange, setUsePriceRange] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  
  // Token selectors
  const [showTokenSelect, setShowTokenSelect] = useState<'input' | 'output' | null>(null);
  
  // Loading state
  const [isCreating, setIsCreating] = useState(false);

  // Fetch token prices and balances
  const { price: inputPrice } = useTokenPrice(inputToken.symbol);
  const { price: outputPrice } = useTokenPrice(outputToken.symbol);
  const { formatted: inputBalanceFormatted } = useWalletBalance(inputToken.type);

  // Calculate derived values
  const totalAmountNum = parseFloat(totalAmount || '0');
  const orderCountNum = parseInt(orderCount || '1');
  const amountPerOrder = amountMode === 'total' ? totalAmountNum / orderCountNum : totalAmountNum;

  // Real swap calculation for output estimation
  const swapCalculation = useSwapCalculation({
    inputAmount: amountPerOrder > 0 ? amountPerOrder.toString() : '0',
    inputToken,
    outputToken,
  });
  const totalAmountCalc = amountMode === 'per_order' ? totalAmountNum * orderCountNum : totalAmountNum;

  const getIntervalMs = () => {
    const freq = parseInt(frequency || '1');
    switch (interval) {
      case 'minute': return freq * 60 * 1000;
      case 'hour': return freq * 60 * 60 * 1000;
      case 'day': return freq * 24 * 60 * 60 * 1000;
      case 'week': return freq * 7 * 24 * 60 * 60 * 1000;
      default: return freq * 60 * 60 * 1000;
    }
  };

  const getTotalDuration = () => {
    const totalMs = getIntervalMs() * orderCountNum;
    const days = Math.floor(totalMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((totalMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${Math.floor(totalMs / (60 * 1000))}m`;
    }
  };

  const handleFlipTokens = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
  };

  const handleMaxInput = () => {
    if (inputBalanceFormatted) {
      // Reserve gas for IOTA
      if (inputToken.type === SUPPORTED_COINS.IOTA.type) {
        const balance = parseFloat(inputBalanceFormatted);
        const gasReserve = 0.5; // Reserve 0.5 IOTA for gas
        const maxAmount = Math.max(0, balance - gasReserve);
        if (maxAmount <= 0) {
          toast.error('Insufficient IOTA balance for DCA (need gas fees)');
          return;
        }
        setTotalAmount(maxAmount.toFixed(2));
      } else {
        setTotalAmount(inputBalanceFormatted);
      }
    }
  };

  const handleCreateDCA = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!orderCount || parseInt(orderCount) <= 0) {
      toast.error('Please enter valid order count');
      return;
    }

    if (!frequency || parseInt(frequency) <= 0) {
      toast.error('Please enter valid frequency');
      return;
    }

    setIsCreating(true);
    try {
      const strategyName = `${inputToken.symbol}→${outputToken.symbol} DCA`;
      const intervalMsValue = getIntervalMs();
      const orderCountValue = parseInt(orderCount);
      
      // Calculate amount per order in smallest units
      const amountPerOrderValue = amountMode === 'total' 
        ? Math.floor((parseFloat(totalAmount) * Math.pow(10, inputToken.decimals)) / orderCountValue)
        : Math.floor(parseFloat(totalAmount) * Math.pow(10, inputToken.decimals));

      // Validate minimum amounts
      if (amountPerOrderValue < 1000) { // Minimum 0.000001 tokens
        toast.error('Amount per order too small. Increase total amount or reduce order count.');
        return;
      }

      const params = {
        sourceTokenType: inputToken.type,
        targetTokenType: outputToken.type,
        totalAmount: Math.floor(parseFloat(totalAmount) * Math.pow(10, inputToken.decimals)).toString(),
        amountPerOrder: amountPerOrderValue.toString(),
        intervalMs: intervalMsValue,
        totalOrders: orderCountValue,
        minPrice: usePriceRange && minPrice ? Math.floor(parseFloat(minPrice) * 1e9).toString() : undefined,
        maxPrice: usePriceRange && maxPrice ? Math.floor(parseFloat(maxPrice) * 1e9).toString() : undefined,
        maxSlippageBps: 500, // 5% max slippage
        name: strategyName,
        poolId: '', // Will be filled by service
      };

      console.log('Creating DCA strategy with params:', params);

      // Create the actual DCA strategy using Move contract
      const result = await createStrategy(params);
      
      if (result.success) {
        toast.success(`DCA strategy "${strategyName}" created successfully!`);
        
        // Reset form on success
        setTotalAmount('');
        setOrderCount('2');
        setFrequency('1');
        setMinPrice('');
        setMaxPrice('');
        setUsePriceRange(false);
      } else {
        toast.error(result.error || 'Failed to create DCA strategy');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create DCA strategy';
      console.error('DCA creation error:', error);
      toast.error(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-2xl">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-cyan-400" />
          <span className="text-gray-300 text-sm font-medium">Dollar Cost Averaging</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-white/20 text-gray-300">
            Auto-Invest
          </Badge>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400">
                <Settings className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-black border-white/10">
              <div className="space-y-4">
                <h4 className="font-semibold text-white">DCA Settings</h4>
                <div>
                  <label className="text-sm text-gray-400 flex items-center gap-2">
                    Enable Price Range
                    <Info className="w-3 h-3" />
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={usePriceRange}
                      onChange={(e) => setUsePriceRange(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-xs text-gray-500">
                      Only execute when price is in range
                    </span>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Amount Input */}
      <Card className="bg-black/40 border-white/10 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-medium">You Pay</span>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                <Button
                  variant={amountMode === 'total' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setAmountMode('total')}
                >
                  Total
                </Button>
                <Button
                  variant={amountMode === 'per_order' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setAmountMode('per_order')}
                >
                  Per Order
                </Button>
              </div>
            </div>
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
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="bg-transparent border-none text-3xl font-bold text-white p-0 h-auto mono focus:outline-none focus:ring-0"
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
              <ArrowUpDown className="w-4 h-4 text-gray-500 rotate-90" />
            </Button>
          </div>
          
          {totalAmount && inputPrice && (
            <div className="text-xs text-gray-500 mt-1">
              ≈ ${formatTokenAmount(parseFloat(totalAmount) * inputPrice.price, 2)}
            </div>
          )}
          
          {amountMode === 'total' && orderCountNum > 0 && (
            <div className="text-sm text-cyan-300 font-medium mt-2">
              {formatTokenAmount(amountPerOrder, 2)} {inputToken.symbol} per order
            </div>
          )}
          
          {amountMode === 'per_order' && orderCountNum > 0 && (
            <div className="text-sm text-cyan-300 font-medium mt-2">
              Total: {formatTokenAmount(totalAmountCalc, 2)} {inputToken.symbol}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Arrow */}
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl bg-black/60 hover:bg-white/10 border border-white/10"
          onClick={handleFlipTokens}
        >
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
        </Button>
      </div>

      {/* You Receive */}
      <Card className="bg-black/40 border-white/10 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium">You Receive</span>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <TrendingUp className="w-3 h-3" />
              <span>Estimated</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-white mono">
              {swapCalculation.outputAmount && parseFloat(swapCalculation.outputAmount) > 0 
                ? parseFloat(swapCalculation.outputAmount).toFixed(2)
                : '0.00'
              }
            </div>
            <Button
              variant="ghost"
              className="flex items-center gap-2 hover:bg-white/10"
              onClick={() => setShowTokenSelect('output')}
            >
              <CoinIcon symbol={outputToken.symbol} coinType={outputToken.type} iconUrl={outputToken.iconUrl} size={24} />
              <span className="text-white font-medium">{outputToken.symbol}</span>
              <ArrowUpDown className="w-4 h-4 text-gray-500 rotate-90" />
            </Button>
          </div>
          
          {swapCalculation.outputAmount && outputPrice && parseFloat(swapCalculation.outputAmount) > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              ≈ ${formatTokenAmount(parseFloat(swapCalculation.outputAmount) * outputPrice.price, 2)} per order
            </div>
          )}
        </CardContent>
      </Card>

      {/* DCA Settings */}
      <div className="grid grid-cols-2 gap-4">
        {/* Frequency */}
        <Card className="bg-black/40 border-white/10 rounded-2xl">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-2">Invest Every</div>
            <div className="flex items-center gap-2">
              <Input
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="text-2xl font-bold bg-transparent border-none p-0 h-auto text-white"
                type="number"
                min="1"
                max="1000"
              />
              <Select value={interval} onValueChange={setInterval}>
                <SelectTrigger className="w-24 bg-transparent border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  <SelectItem value="minute">Min</SelectItem>
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Order Count */}
        <Card className="bg-black/40 border-white/10 rounded-2xl">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              Over
              <Info className="w-3 h-3" />
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={orderCount}
                onChange={(e) => setOrderCount(e.target.value)}
                className="text-2xl font-bold bg-transparent border-none p-0 h-auto text-white"
                type="number"
                min="1"
                max="365"
              />
              <span className="text-sm text-gray-400">Orders</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Duration: {getTotalDuration()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price Range (conditional) */}
      {usePriceRange && (
        <Card className="bg-black/40 border-white/10 rounded-2xl">
          <CardContent className="p-4">
            <div className="text-sm text-white mb-2">Set Price Range</div>
            <div className="text-xs text-gray-400 mb-4">
              DCA will only be executed if the price falls within the range of your pricing strategy.
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="0.0"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="text-lg bg-white/5 border-white/20 text-white"
                  type="number"
                  min="0"
                  step="any"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {inputToken.symbol} per {outputToken.symbol}
                </div>
              </div>
              
              <div>
                <Input
                  placeholder="0.0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="text-lg bg-white/5 border-white/20 text-white"
                  type="number"
                  min="0"
                  step="any"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {inputToken.symbol} per {outputToken.symbol}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create DCA Button */}
      {isConnected ? (
        <Button
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-4 rounded-xl font-semibold text-lg"
          onClick={handleCreateDCA}
          disabled={isCreating || !totalAmount || parseFloat(totalAmount) <= 0}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating DCA Strategy...
            </>
          ) : (
            'Create DCA Strategy'
          )}
        </Button>
      ) : (
        <Button
          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-4 rounded-xl font-semibold text-lg"
          onClick={() => toast.error('Please connect your wallet')}
        >
          Connect Wallet
        </Button>
      )}

      {/* Token Selectors */}
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