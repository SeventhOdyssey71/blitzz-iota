'use client';

import { useState } from 'react';
import { ArrowUpDown, Settings, Loader2 } from 'lucide-react';
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
import { useTokenPrice } from '@/hooks/use-token-price';
import { useWalletBalance } from '@/hooks/use-wallet-balance';
import { useSwapCalculation, formatSwapOutput } from '@/hooks/use-swap-calculation';
import { formatTokenAmount } from '@/lib/utils/format';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { toast } from 'sonner';
import { useSimpleSwapV2 } from '@/hooks/use-simple-swap-v2';
import { TokenDropdown } from '@/components/token-dropdown';
import { SwapSuccessModal } from '@/components/swap-success-modal';
import { SwapTransactionPanel } from '@/components/swap-transaction-panel';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTransactionPanel, setShowTransactionPanel] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string>('');
  const [swapResult, setSwapResult] = useState<{
    inputAmount: string;
    outputAmount: string;
    txHash: string;
    executionTime: number;
  } | null>(null);
  
  // Use the swap hook
  const { executeSwap, isSwapping } = useSimpleSwapV2();
  

  // Fetch token prices
  const { price: inputPrice } = useTokenPrice(inputToken.symbol);
  const { price: outputPrice } = useTokenPrice(outputToken.symbol);

  // Fetch wallet balances with refresh capability
  const { formatted: inputBalanceFormatted, refetch: refetchInputBalance } = useWalletBalance(inputToken.type);
  const { formatted: outputBalanceFormatted, refetch: refetchOutputBalance } = useWalletBalance(outputToken.type);

  // Calculate swap output using actual pool reserves
  const swapCalculation = useSwapCalculation(
    inputToken,
    outputToken,
    inputAmount,
    slippage
  );

  const handleSwap = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (swapCalculation.error) {
      toast.error(swapCalculation.error);
      return;
    }

    if (!swapCalculation.outputAmount || swapCalculation.outputAmount === '0') {
      toast.error('Unable to calculate swap output');
      return;
    }


    const result: any = await executeSwap({
      inputToken,
      outputToken,
      inputAmount,
      minOutputAmount: swapCalculation.minimumReceived.toString(),
      slippage,
    });

    if (result.success && result.digest) {
      // Store the transaction hash
      setCurrentTxHash(result.digest);
      
      // Show the transaction panel
      setShowTransactionPanel(true);
      
      // Clear input
      setInputAmount('');
      
      // Refresh balances after a short delay to ensure blockchain state is updated
      setTimeout(() => {
        refetchInputBalance();
        refetchOutputBalance();
      }, 2000);
      
      // Also do an immediate refresh
      refetchInputBalance();
      refetchOutputBalance();
    }
  };

  const handleFlipTokens = () => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount('');
  };

  const handleMaxInput = () => {
    if (inputBalanceFormatted) {
      // For IOTA, reserve some for gas
      if (inputToken.type === SUPPORTED_COINS.IOTA.type) {
        const balance = parseFloat(inputBalanceFormatted);
        const gasReserve = 0.2; // Reserve 0.2 IOTA for gas (increased for safety)
        const maxAmount = Math.max(0, balance - gasReserve);
        if (maxAmount <= 0) {
          toast.error('Insufficient IOTA balance for swap (need gas fees)');
          return;
        }
        setInputAmount(maxAmount.toFixed(2));
      } else {
        setInputAmount(inputBalanceFormatted);
      }
    }
  };

  return (
    <div className="space-y-3 max-w-[480px] mx-auto">
      {/* Main Swap Card */}
      <Card className="bg-black border-gray-800 rounded-2xl shadow-2xl">
        <CardContent className="p-6">
          {/* You Pay Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">You pay</span>
                {isConnected && inputBalanceFormatted && (
                  <button
                    onClick={handleMaxInput}
                    className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
                  >
                    Balance: {inputBalanceFormatted}
                  </button>
                )}
              </div>
              
              <div className="bg-black rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between gap-4">
                  <Input
                    placeholder="0"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    className="bg-transparent border-none text-2xl font-semibold text-white p-0 h-auto focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-none placeholder:text-gray-600 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    type="number"
                    min="0"
                    step="any"
                  />
                  
                  <TokenDropdown
                    selectedToken={inputToken}
                    onSelect={setInputToken}
                    excludeToken={outputToken}
                  />
                </div>
                
                {inputAmount && inputPrice && (
                  <div className="text-sm text-gray-500 mt-2">
                    ≈ ${formatTokenAmount(parseFloat(inputAmount) * inputPrice.price, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* Swap Direction Button */}
            <div className="flex justify-center -my-2 relative z-10">
              <button
                onClick={handleFlipTokens}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-all hover:rotate-180 duration-300"
              >
                <ArrowUpDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* You Receive Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-sm">You receive</span>
                {isConnected && outputBalanceFormatted && (
                  <span className="text-gray-500 text-sm">
                    Balance: {outputBalanceFormatted}
                  </span>
                )}
              </div>
              
              <div className="bg-black rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-2xl font-semibold text-white">
                    {swapCalculation.isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    ) : (
                      formatSwapOutput(swapCalculation.outputAmount, outputToken.decimals) || '0'
                    )}
                  </div>
                  
                  <TokenDropdown
                    selectedToken={outputToken}
                    onSelect={setOutputToken}
                    excludeToken={inputToken}
                  />
                </div>
                
                {swapCalculation.outputAmount && swapCalculation.outputAmount !== '0' && outputPrice && (
                  <div className="text-sm text-gray-500 mt-2">
                    ≈ ${formatTokenAmount(parseFloat(formatSwapOutput(swapCalculation.outputAmount, outputToken.decimals)) * outputPrice.price, 2)}
                  </div>
                )}
              </div>
            </div>

            {/* Enter Amount Message or Swap Details */}
            {(!inputAmount || parseFloat(inputAmount) <= 0) ? (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm">Enter an amount</p>
              </div>
            ) : swapCalculation.outputAmount && swapCalculation.outputAmount !== '0' && !swapCalculation.error && (
              <div className="space-y-2 pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Rate</span>
                  <span className="text-gray-300">
                    1 {inputToken.symbol} = {inputAmount && parseFloat(inputAmount) > 0 
                      ? formatTokenAmount(parseFloat(formatSwapOutput(swapCalculation.outputAmount, outputToken.decimals)) / parseFloat(inputAmount), 4)
                      : '0'} {outputToken.symbol}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Price Impact</span>
                  <span className={`font-medium ${
                    swapCalculation.priceImpact > 5 ? "text-red-400" : 
                    swapCalculation.priceImpact > 3 ? "text-yellow-400" : 
                    "text-green-400"
                  }`}>
                    {swapCalculation.priceImpact.toFixed(2)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Min. received</span>
                  <span className="text-gray-300">
                    {formatSwapOutput(swapCalculation.minimumReceived, outputToken.decimals)} {outputToken.symbol}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Fee</span>
                  <span className="text-gray-300">
                    {((swapCalculation.pool?.feePercentage || 30) / 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}

            {/* Swap Button */}
            {isConnected ? (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-700"
                onClick={handleSwap}
                disabled={isSwapping || !inputAmount || parseFloat(inputAmount) <= 0 || !!swapCalculation.error}
              >
                {isSwapping ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Swapping...
                  </>
                ) : swapCalculation.error ? (
                  'Insufficient liquidity'
                ) : !inputAmount || parseFloat(inputAmount) <= 0 ? (
                  'Enter an amount'
                ) : (
                  'Swap'
                )}
              </Button>
            ) : (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-xl font-semibold text-lg transition-all"
                onClick={() => {
                  // Find and click the wallet connect button
                  const walletButton = document.querySelector('button[data-wallet-button]') || 
                                     document.querySelector('button:has(.wallet-icon)') ||
                                     document.querySelector('button[aria-label*="wallet" i]');
                  if (walletButton instanceof HTMLElement) {
                    walletButton.click();
                  } else {
                    toast.error('Please use the wallet button in the header to connect.');
                  }
                }}
              >
                Connect Wallet
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-200">
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-black border-gray-800">
            <div className="space-y-4">
              <h4 className="font-semibold text-white">Transaction Settings</h4>
              <div>
                <label className="text-sm text-gray-400">Slippage Tolerance (%)</label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
                    className="w-full bg-gray-800 border-gray-700 text-white"
                    placeholder="0.5"
                    step="0.1"
                    min="0"
                    max="50"
                  />
                  <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                    {slippage}%
                  </Badge>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      
      {/* Success Modal */}
      {swapResult && (
        <SwapSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSwapResult(null);
          }}
          inputAmount={swapResult.inputAmount}
          outputAmount={swapResult.outputAmount}
          inputToken={inputToken}
          outputToken={outputToken}
          txHash={swapResult.txHash}
          executionTime={swapResult.executionTime}
        />
      )}
      
      {/* Transaction Details Panel */}
      <SwapTransactionPanel
        txHash={currentTxHash}
        isOpen={showTransactionPanel}
        onClose={() => setShowTransactionPanel(false)}
        expectedInputAmount={inputAmount}
        expectedOutputAmount={swapCalculation?.outputAmount}
        inputTokenSymbol={inputToken.symbol}
        outputTokenSymbol={outputToken.symbol}
      />
    </div>
  );
}