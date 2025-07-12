'use client';

import { useEffect } from 'react';
import { CheckCircle2, X, ExternalLink, Clock, ArrowDown, Zap } from 'lucide-react';
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
      // Auto close after 10 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Multi-layer backdrop for depth */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0 backdrop-blur-xl" />
        <div 
          className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-transparent to-blue-900/20 animate-fade-in"
          onClick={onClose}
        />
      </div>
      
      {/* Premium Glassmorphism Modal */}
      <div className="relative max-w-[480px] w-full animate-slide-up">
        {/* Animated glow ring */}
        <div className="absolute -inset-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-[32px] opacity-20 blur-lg animate-pulse" />
        <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-[32px] opacity-40" />
        
        {/* Modal content with premium glassmorphism */}
        <div className="relative bg-black/50 backdrop-blur-3xl rounded-[32px] shadow-2xl overflow-hidden">
          {/* Top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          {/* Content wrapper */}
          <div className="relative p-10">
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
            
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300 hover:rotate-90 transform"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Success Icon with premium effects */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                {/* Animated rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 border border-green-400/20 rounded-full animate-ping" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 border border-green-400/30 rounded-full animate-ping animation-delay-200" />
                </div>
                
                {/* Icon container */}
                <div className="relative bg-gradient-to-br from-green-400/10 to-green-500/10 backdrop-blur-xl rounded-full p-8 border border-green-400/20 shadow-[0_0_50px_rgba(34,197,94,0.2)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent rounded-full" />
                  <CheckCircle2 className="w-16 h-16 text-green-400 relative z-10 animate-check filter drop-shadow-[0_0_20px_rgba(34,197,94,0.5)]" />
                </div>
              </div>
            </div>
            
            {/* Title section */}
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extralight text-white mb-2 tracking-wide">
                Swap Executed
              </h2>
              <p className="text-gray-400 text-sm font-light">
                Transaction confirmed on IOTA blockchain
              </p>
            </div>
            
            {/* Swap Details - Premium Card */}
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/0 rounded-2xl" />
              <div className="relative bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                {/* From section */}
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-medium">You Paid</p>
                      <p className="text-3xl font-extralight text-white font-mono">
                        {inputAmount}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-px h-8 bg-white/10" />
                      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm px-5 py-2.5 rounded-xl border border-white/10">
                        <span className="text-white font-light text-lg">{inputToken.symbol}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Animated arrow separator */}
                <div className="relative h-16 flex items-center justify-center bg-gradient-to-r from-transparent via-white/[0.02] to-transparent">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-xl rounded-full" />
                      <div className="relative bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm p-3 rounded-full border border-white/10">
                        <ArrowDown className="w-5 h-5 text-cyan-400" />
                      </div>
                    </div>
                  </div>
                  {/* Animated lines */}
                  <div className="absolute left-0 top-1/2 w-full h-px">
                    <div className="h-full bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent animate-pulse" />
                  </div>
                </div>
                
                {/* To section */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1 font-medium">You Received</p>
                      <p className="text-3xl font-extralight text-green-400 font-mono">
                        {outputAmount}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-px h-8 bg-white/10" />
                      <div className="bg-gradient-to-br from-green-400/10 to-green-500/5 backdrop-blur-sm px-5 py-2.5 rounded-xl border border-green-400/20">
                        <span className="text-green-400 font-light text-lg">{outputToken.symbol}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Transaction Details - Premium Style */}
            <div className="space-y-3 mb-8">
              {/* Execution Time */}
              <div className="group relative overflow-hidden rounded-xl bg-white/[0.02] backdrop-blur-sm border border-white/10 p-4 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/20">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <Zap className="w-4 h-4 text-cyan-400" />
                    </div>
                    <span className="text-sm text-gray-400 font-light">Execution Speed</span>
                  </div>
                  <span className="text-white font-mono font-light">{executionTime.toFixed(3)}s</span>
                </div>
              </div>
              
              {/* Transaction Hash */}
              {txHash && (
                <a 
                  href={`https://explorer.iota.org/testnet/txblock/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-xl bg-white/[0.02] backdrop-blur-sm border border-white/10 p-4 transition-all duration-300 hover:bg-white/[0.04] hover:border-cyan-500/30 cursor-pointer block"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                        <ExternalLink className="w-4 h-4 text-cyan-400" />
                      </div>
                      <span className="text-sm text-gray-400 font-light">Transaction Hash</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-mono text-sm font-light">
                        {txHash.slice(0, 10)}...{txHash.slice(-8)}
                      </span>
                      <ExternalLink className="w-3 h-3 text-cyan-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </a>
              )}
            </div>
            
            {/* Premium Action Button */}
            <button
              onClick={onClose}
              className="w-full relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl opacity-70 group-hover:opacity-100 blur transition-all duration-300" />
              <div className="relative bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-4 transition-all duration-300 group-hover:border-white/20 group-hover:bg-black/30">
                <span className="text-white font-light text-lg tracking-wide">Continue Trading</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}