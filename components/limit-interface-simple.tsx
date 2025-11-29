'use client';

import { useState } from 'react';
import { ArrowUpDown, Info, Loader2, TrendingUp, Calendar } from 'lucide-react';
import { useCurrentAccount } from '@iota/dapp-kit';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { useLimitOrder } from '@/hooks/use-limit-order';

interface Token {
  symbol: string;
  type: string;
  decimals: number;
  name: string;
  iconUrl?: string;
}

const EXPIRY_OPTIONS = [
  { value: '1', label: '1 Hour' },
  { value: '6', label: '6 Hours' },
  { value: '24', label: '1 Day' },
  { value: '168', label: '7 Days' },
  { value: '720', label: '30 Days' },
  { value: '4320', label: '6 Months' },
];

export function LimitInterface() {
  const currentAccount = useCurrentAccount();
  const isConnected = !!currentAccount;

  // Token selection
  const [inputToken, setInputToken] = useState<Token>(SUPPORTED_COINS.IOTA);
  const [outputToken, setOutputToken] = useState<Token>(SUPPORTED_COINS.stIOTA);

  // Limit order hook
  const { placeLimitOrder } = useLimitOrder(inputToken.type, outputToken.type);
  
  // Order parameters
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');
  const [expiry, setExpiry] = useState('168'); // Default 7 days
  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy');
  const [isMarketPrice, setIsMarketPrice] = useState(false);
  
  // Token selectors
  const [showTokenSelect, setShowTokenSelect] = useState<'input' | 'output' | null>(null);
  
  // Loading state
  const [isCreating, setIsCreating] = useState(false);

  // Fetch token prices and balances
  const { price: inputPrice } = useTokenPrice(inputToken.symbol);
  const { price: outputPrice } = useTokenPrice(outputToken.symbol);
  const { formatted: inputBalanceFormatted } = useWalletBalance(inputToken.type);
  const { formatted: outputBalanceFormatted } = useWalletBalance(outputToken.type);

  // Calculate values
  const amountNum = parseFloat(amount || '0');
  const priceNum = parseFloat(price || '0');
  const totalValue = amountNum * priceNum;

  // Get market price for default
  const marketPrice = inputPrice && outputPrice ? inputPrice.price / outputPrice.price : 0;

  const handleFlipTokens = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setOrderType(orderType === 'buy' ? 'sell' : 'buy');
  };

  const handleUseMarketPrice = () => {
    if (marketPrice > 0) {
      setPrice(marketPrice.toFixed(6));
      setIsMarketPrice(true);
    }
  };

  const handleMaxInput = () => {
    const balance = orderType === 'buy' ? outputBalanceFormatted : inputBalanceFormatted;
    if (balance) {
      if (orderType === 'buy' && priceNum > 0) {
        // For buy orders, use available quote token balance divided by price
        const maxAmount = parseFloat(balance) / priceNum;
        setAmount(maxAmount.toFixed(6));
      } else if (orderType === 'sell') {
        // For sell orders, use available base token balance
        setAmount(balance);
      }
    }
  };

  const handleCreateLimitOrder = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsCreating(true);
    try {
      const expiryHours = parseInt(expiry);
      const expireAt = Date.now() + (expiryHours * 60 * 60 * 1000);
      
      const params = {
        sourceTokenType: orderType === 'buy' ? outputToken.type : inputToken.type,
        targetTokenType: orderType === 'buy' ? inputToken.type : outputToken.type,
        amount: amount, // Service will handle decimal conversion
        price: price, // Service will handle price precision
        isBuy: orderType === 'buy',
        expireAt,
        orderBookId: 'auto', // Will be created automatically if needed
        sourceDecimals: orderType === 'buy' ? outputToken.decimals : inputToken.decimals,
        targetDecimals: orderType === 'buy' ? inputToken.decimals : outputToken.decimals,
      };

      console.log('🎯 Creating limit order:', orderType, `${amount} ${inputToken.symbol} at ${price} ${outputToken.symbol}`);
      const result = await placeLimitOrder(params);
      
      if (result.success) {
        console.log('✅ Limit order created successfully!');
        toast.success(`${orderType} order placed successfully!`);
        
        // Reset form on success
        setAmount('');
        setPrice('');
        setIsMarketPrice(false);
      } else {
        console.error('❌ Limit order creation failed:', result.error);
        toast.error(result.error || 'Failed to create limit order');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to create limit order';
      console.error('❌ Limit order error:', error instanceof Error ? error.message : String(error));
      toast.error(errorMsg);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* You Pay */}
      <Card className="bg-black/40 border-white/10 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm font-medium">You Pay</span>
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-auto p-0"
                  onClick={() => setAmount(parseFloat(inputBalanceFormatted || '0') / 2).toFixed(6)}
                >
                  HALF
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
          
          {amount && inputPrice && (
            <div className="text-xs text-gray-500 mt-1">
              ≈ ${formatTokenAmount(parseFloat(amount) * inputPrice.price, 2)}
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
              <span>Balance: {outputBalanceFormatted || '0'}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-white mono">
              {totalValue.toFixed(6)}
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
          
          {totalValue > 0 && outputPrice && (
            <div className="text-xs text-gray-500 mt-1">
              ≈ ${formatTokenAmount(totalValue * outputPrice.price, 2)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Configuration */}
      <div className="grid grid-cols-2 gap-4">
        {/* Buy/Sell at Rate */}
        <Card className="bg-black/40 border-white/10 rounded-2xl">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              {orderType === 'buy' ? 'Buy' : 'Sell'} {inputToken.symbol} at rate
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs border-white/20"
                onClick={handleUseMarketPrice}
              >
                Market
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={price}
                onChange={(e) => {setPrice(e.target.value); setIsMarketPrice(false);}}
                className="text-xl font-bold bg-transparent border-none p-0 h-auto text-white"
                placeholder="1.4913"
                type="number"
                min="0"
                step="any"
              />
              <span className="text-sm text-gray-400">{outputToken.symbol}</span>
            </div>
            {isMarketPrice && (
              <div className="text-xs text-cyan-400 mt-1">Market price</div>
            )}
          </CardContent>
        </Card>

        {/* Expires In */}
        <Card className="bg-black/40 border-white/10 rounded-2xl">
          <CardContent className="p-4">
            <div className="text-sm text-gray-400 mb-2 flex items-center gap-2">
              Expires in
              <Info className="w-3 h-3" />
            </div>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="bg-transparent border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black border-white/20">
                {EXPIRY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Order Type Toggle */}
      <Card className="bg-black/40 border-white/10 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <Button
              variant={orderType === 'buy' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setOrderType('buy')}
            >
              Buy {inputToken.symbol}
            </Button>
            <Button
              variant={orderType === 'sell' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-8"
              onClick={() => setOrderType('sell')}
            >
              Sell {inputToken.symbol}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Limit Order Button */}
      {isConnected ? (
        <Button
          className="w-full bg-orange-500 hover:bg-orange-400 text-black py-4 rounded-xl font-semibold text-lg"
          onClick={handleCreateLimitOrder}
          disabled={isCreating || !amount || !price || parseFloat(amount) <= 0 || parseFloat(price) <= 0}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Limit Order...
            </>
          ) : (
            `Place ${orderType} Order`
          )}
        </Button>
      ) : (
        <Button
          className="w-full bg-orange-500 hover:bg-orange-400 text-black py-4 rounded-xl font-semibold text-lg"
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