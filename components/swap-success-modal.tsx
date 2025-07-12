'use client';

import { useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
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
      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-black/90 border border-cyan-500/30 rounded-2xl p-8 max-w-md w-full mx-4 animate-slide-up shadow-[0_0_50px_rgba(0,212,255,0.3)]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full animate-pulse" />
            <CheckCircle2 className="w-20 h-20 text-green-400 relative animate-check" />
          </div>
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          Swap Successful!
        </h2>
        
        {/* Swap Details */}
        <div className="space-y-4">
          <div className="bg-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">You Paid</span>
              <span className="text-white font-medium font-mono">
                {inputAmount} {inputToken.symbol}
              </span>
            </div>
            
            <div className="flex justify-center">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">You Received</span>
              <span className="text-green-400 font-medium font-mono">
                {outputAmount} {outputToken.symbol}
              </span>
            </div>
          </div>
          
          {/* Transaction Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Execution Time</span>
            <span className="text-white font-mono">{executionTime.toFixed(1)}s</span>
          </div>
          
          {txHash && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Transaction</span>
              <a 
                href={`https://explorer.iota.org/testnet/txblock/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:text-cyan-300 transition-colors font-mono"
              >
                {txHash.slice(0, 8)}...{txHash.slice(-6)}
              </a>
            </div>
          )}
        </div>
        
        {/* Action Button */}
        <button
          onClick={onClose}
          className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
        >
          Close
        </button>
      </div>
    </div>
  );
}