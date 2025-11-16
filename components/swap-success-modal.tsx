'use client';

import { useEffect } from 'react';
import { Check, X, ExternalLink, Copy, AlertTriangle } from 'lucide-react';

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
  isSuccess?: boolean;
  errorMessage?: string;
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
  isSuccess = true,
  errorMessage,
}: SwapSuccessModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Auto close after 6 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const copyTxHash = () => {
    if (txHash) {
      navigator.clipboard.writeText(txHash);
    }
  };

  const openExplorer = () => {
    if (txHash) {
      window.open(`https://explorer.iota.cafe/txblock/${txHash}`, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-gray-800/95 backdrop-blur-lg border border-gray-700 rounded-2xl p-6 shadow-2xl max-w-sm w-full">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
            isSuccess ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {isSuccess ? (
              <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
            ) : (
              <X className="w-4 h-4 text-white" strokeWidth={2.5} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium text-lg leading-tight">
              {isSuccess ? 'Swap' : 'Failed swap'} {inputAmount} {inputToken.symbol} to minimum {outputAmount} {outputToken.symbol}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transaction Details */}
        <div className="flex items-center gap-3 text-sm">
          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
            isSuccess ? 'bg-green-500' : 'bg-red-500'
          }`}>
            {isSuccess ? (
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            ) : (
              <X className="w-3 h-3 text-white" strokeWidth={3} />
            )}
          </div>
          
          <span className="text-gray-300">
            {isSuccess ? (
              txHash ? (
                <>
                  {txHash.slice(0, 8)}...{txHash.slice(-6)} (Completed in ~{executionTime.toFixed(1)}s)
                </>
              ) : (
                `Completed in ~${executionTime.toFixed(1)}s`
              )
            ) : (
              errorMessage || `Transaction failed (attempted in ~${executionTime.toFixed(1)}s)`
            )}
          </span>
          
          {txHash && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={copyTxHash}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="Copy transaction hash"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={openExplorer}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title="View on explorer"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}