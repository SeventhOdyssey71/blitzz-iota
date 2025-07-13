'use client';

import { useEffect, useState } from 'react';
import { PoolInfo, PoolDiscovery } from '@/lib/services/pool-discovery';
import { formatTokenAmount } from '@/lib/utils/format';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PoolSpotPriceProps {
  pool: PoolInfo;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenADecimals: number;
  tokenBDecimals: number;
}

export function PoolSpotPrice({ 
  pool, 
  tokenASymbol, 
  tokenBSymbol,
  tokenADecimals,
  tokenBDecimals 
}: PoolSpotPriceProps) {
  const [priceAToB, setPriceAToB] = useState<number>(0);
  const [priceBToA, setPriceBToA] = useState<number>(0);
  const [lastPriceAToB, setLastPriceAToB] = useState<number>(0);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | 'neutral'>('neutral');

  useEffect(() => {
    if (pool.reserveA > 0n && pool.reserveB > 0n) {
      // Calculate spot prices
      const spotPriceAToB = PoolDiscovery.getSpotPrice(pool, true);
      const spotPriceBToA = PoolDiscovery.getSpotPrice(pool, false);
      
      // Update price direction
      if (lastPriceAToB !== 0) {
        if (spotPriceAToB > lastPriceAToB) {
          setPriceDirection('up');
        } else if (spotPriceAToB < lastPriceAToB) {
          setPriceDirection('down');
        } else {
          setPriceDirection('neutral');
        }
      }
      
      setPriceAToB(spotPriceAToB);
      setPriceBToA(spotPriceBToA);
      setLastPriceAToB(spotPriceAToB);
    }
  }, [pool, lastPriceAToB]);

  const PriceIcon = priceDirection === 'up' ? TrendingUp : 
                    priceDirection === 'down' ? TrendingDown : 
                    Minus;

  const priceColor = priceDirection === 'up' ? 'text-green-400' : 
                     priceDirection === 'down' ? 'text-red-400' : 
                     'text-gray-400';

  return (
    <div className="flex flex-col space-y-2 p-3 bg-black/20 rounded-lg">
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">Spot Price</span>
        <PriceIcon className={`w-4 h-4 ${priceColor}`} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex flex-col">
          <span className="text-gray-500 text-xs">1 {tokenASymbol} =</span>
          <span className="text-white font-medium">
            {formatTokenAmount(priceAToB, 6)} {tokenBSymbol}
          </span>
        </div>
        
        <div className="flex flex-col">
          <span className="text-gray-500 text-xs">1 {tokenBSymbol} =</span>
          <span className="text-white font-medium">
            {formatTokenAmount(priceBToA, 6)} {tokenASymbol}
          </span>
        </div>
      </div>
      
      {/* Pool Constant K */}
      <div className="mt-2 pt-2 border-t border-white/5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Pool Constant (k)</span>
          <span className="text-gray-400 font-mono">
            {(Number(pool.reserveA) * Number(pool.reserveB) / 1e18).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}