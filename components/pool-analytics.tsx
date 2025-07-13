'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PoolInfo } from '@/lib/services/pool-discovery';
import { formatTokenAmount, formatBalance } from '@/lib/utils/format';
import { TrendingUp, Activity, DollarSign, Percent } from 'lucide-react';
import { usePriceFeeds } from '@/hooks/use-price-feeds';

interface PoolAnalyticsProps {
  pool: PoolInfo;
  tokenASymbol: string;
  tokenBSymbol: string;
  tokenADecimals: number;
  tokenBDecimals: number;
}

export function PoolAnalytics({
  pool,
  tokenASymbol,
  tokenBSymbol,
  tokenADecimals,
  tokenBDecimals,
}: PoolAnalyticsProps) {
  const [tvl, setTvl] = useState(0);
  const [volume24h, setVolume24h] = useState(0);
  const [fees24h, setFees24h] = useState(0);
  const [apr, setApr] = useState(0);
  
  const prices = usePriceFeeds();
  const tokenAPrice = prices[tokenASymbol]?.price || 0;
  const tokenBPrice = prices[tokenBSymbol]?.price || 0;

  useEffect(() => {
    if (pool && tokenAPrice && tokenBPrice) {
      // Calculate TVL
      const tvlA = Number(pool.reserveA) / Math.pow(10, tokenADecimals) * tokenAPrice;
      const tvlB = Number(pool.reserveB) / Math.pow(10, tokenBDecimals) * tokenBPrice;
      setTvl(tvlA + tvlB);

      // Calculate 24h volume (using total volume as approximation)
      const volumeA = Number(pool.totalVolumeA || 0n) / Math.pow(10, tokenADecimals) * tokenAPrice;
      const volumeB = Number(pool.totalVolumeB || 0n) / Math.pow(10, tokenBDecimals) * tokenBPrice;
      setVolume24h((volumeA + volumeB) * 0.1); // Approximate daily volume as 10% of total

      // Calculate fees
      const feesA = Number(pool.feesA || 0n) / Math.pow(10, tokenADecimals) * tokenAPrice;
      const feesB = Number(pool.feesB || 0n) / Math.pow(10, tokenBDecimals) * tokenBPrice;
      const totalFees = feesA + feesB;
      setFees24h(totalFees * 0.1); // Approximate daily fees

      // Calculate APR
      if (tvl > 0) {
        const annualizedFees = fees24h * 365;
        const calculatedApr = (annualizedFees / tvl) * 100;
        setApr(calculatedApr);
      }
    }
  }, [pool, tokenAPrice, tokenBPrice, tokenADecimals, tokenBDecimals, fees24h]);

  const formatUSD = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* TVL Card */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-400">TVL</CardTitle>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold text-white">{formatUSD(tvl)}</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{tokenASymbol}</span>
              <span className="text-gray-300">
                {formatBalance(pool.reserveA.toString(), tokenADecimals, 2)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">{tokenBSymbol}</span>
              <span className="text-gray-300">
                {formatBalance(pool.reserveB.toString(), tokenBDecimals, 2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume Card */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-400">24h Volume</CardTitle>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold text-white">{formatUSD(volume24h)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {pool.totalVolumeA && pool.totalVolumeB ? 'Estimated' : 'No trades yet'}
          </p>
        </CardContent>
      </Card>

      {/* Fees Card */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-400">24h Fees</CardTitle>
            <Percent className="w-4 h-4 text-cyan-400" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold text-white">{formatUSD(fees24h)}</p>
          <p className="text-xs text-gray-500 mt-1">
            {((pool.feePercentage || 30) / 100).toFixed(2)}% fee tier
          </p>
        </CardContent>
      </Card>

      {/* APR Card */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader className="p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-gray-400">APR</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold text-green-400">
            {apr > 0 ? `${apr.toFixed(2)}%` : '0.00%'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {apr > 0 ? 'From trading fees' : 'New pool'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}