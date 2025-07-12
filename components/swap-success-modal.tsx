'use client';

import { useEffect } from 'react';
import { Check, X, ExternalLink, ArrowDown } from 'lucide-react';
import { formatTokenAmount } from '@/lib/utils/format';

interface SwapSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputAmount: string;
  outputAmount: string;
  inputToken: {
    symbol: string;
    decimals: number;
  };
  outputToken: {
    symbol: string;
    decimals: number;
  };
  txHash?: string;
  executionTime?: number;
}

export function SwapSuccessModal({
  isOpen,
  onClose,
  inputAmount,
  outputAmount,
  inputToken,
  outputToken,
  txHash,
  executionTime = 2.5,
}: SwapSuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Auto close after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Simple backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />
      
      {/* Simple Modal */}
      <div className="relative max-w-sm w-full animate-slide-up">
        {/* Modal content */}
        <div className="relative bg-black border border-white/20 rounded-2xl p-6 shadow-xl">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
          </div>
          
          {/* Title */}
          <h2 className="text-xl font-medium text-center text-white mb-6">
            Transaction Successful
          </h2>
          
          {/* Swap Details */}
          <div className="space-y-4 mb-6">
            {/* From */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white/60 text-sm">From</span>
              <div className="text-right">
                <div className="text-white font-mono">
                  {inputAmount} {inputToken.symbol}
                </div>
              </div>
            </div>
            
            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowDown className="w-4 h-4 text-white/40" />
            </div>
            
            {/* To */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-white/60 text-sm">To</span>
              <div className="text-right">
                <div className="text-white font-mono">
                  {outputAmount} {outputToken.symbol}
                </div>
              </div>
            </div>
          </div>
          
          {/* Transaction Info */}
          <div className="space-y-2 mb-6 text-sm">
            <div className="flex items-center justify-between text-white/60">
              <span>Time</span>
              <span className="font-mono">{executionTime.toFixed(2)}s</span>
            </div>
            
            {txHash && (
              <div className="flex items-center justify-between">
                <span className="text-white/60">Transaction</span>
                <a 
                  href={`https://explorer.iota.org/testnet/txblock/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition-colors font-mono text-xs flex items-center gap-1"
                >
                  {txHash.slice(0, 6)}...{txHash.slice(-4)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}