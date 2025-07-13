'use client';

import { useState } from 'react';
import { Search, ChevronUp, TrendingUp, BarChart2, Droplets, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { usePoolInfo } from '@/hooks/use-pool-info';
import { usePoolTVL } from '@/hooks/use-pool-tvl';
import { useTokenPrice } from '@/hooks/use-token-price';
import { formatNumber } from '@/lib/utils/format';
import { PoolInterface } from './pool-interface';
import { CoinIcon } from '@/components/coin-icon';

interface PoolData {
  rank: number;
  tokenA: string;
  tokenB: string;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  tvl: number;
  volume24h: number;
  volume30d: number;
  apr: number;
  fees24h: number;
}

export function PoolList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showLiquidityInterface, setShowLiquidityInterface] = useState(false);
  
  // Get pool info for all pairs
  const { poolInfo: iotaStIotaPool } = usePoolInfo(
    SUPPORTED_COINS.IOTA.type,
    SUPPORTED_COINS.stIOTA.type
  );
  
  const { poolInfo: iotaVusdPool } = usePoolInfo(
    SUPPORTED_COINS.IOTA.type,
    SUPPORTED_COINS.vUSD.type
  );
  
  const { poolInfo: stIotaVusdPool } = usePoolInfo(
    SUPPORTED_COINS.stIOTA.type,
    SUPPORTED_COINS.vUSD.type
  );
  
  // Get real-time TVL for pools
  const iotaStIotaTVL = usePoolTVL(iotaStIotaPool);
  const iotaVusdTVL = usePoolTVL(iotaVusdPool);
  const stIotaVusdTVL = usePoolTVL(stIotaVusdPool);
  
  // Get token prices
  const { price: iotaPriceData } = useTokenPrice('IOTA');
  const iotaPrice = iotaPriceData?.price || 0.28;
  
  // Calculate actual volume from pool data if available
  const calculateVolume = (pool: any) => {
    if (!pool || (!pool.totalVolumeA && !pool.totalVolumeB)) return 0;
    return (Number(pool.totalVolumeA || 0) / 1e9 + Number(pool.totalVolumeB || 0) / 1e9) * iotaPrice;
  };
  
  // Calculate actual fees collected
  const calculateFees = (pool: any) => {
    if (!pool || (!pool.feesA && !pool.feesB)) return 0;
    return (Number(pool.feesA || 0) / 1e9 + Number(pool.feesB || 0) / 1e9) * iotaPrice;
  };
  
  // Calculate APR based on fees and TVL
  const calculateAPR = (fees24h: number, tvl: number): number => {
    if (tvl === 0) return 0;
    const dailyReturn = fees24h / tvl;
    const annualReturn = dailyReturn * 365;
    return annualReturn * 100; // Convert to percentage
  };
  
  // Pool data with real-time values
  const pools: PoolData[] = [
    {
      rank: 1,
      tokenA: 'IOTA',
      tokenB: 'stIOTA',
      tokenASymbol: 'IOTA',
      tokenBSymbol: 'stIOTA',
      tvl: iotaStIotaTVL,
      volume24h: calculateVolume(iotaStIotaPool),
      volume30d: calculateVolume(iotaStIotaPool) * 30, // Estimate
      apr: calculateAPR(calculateFees(iotaStIotaPool), iotaStIotaTVL),
      fees24h: calculateFees(iotaStIotaPool)
    },
    {
      rank: 2,
      tokenA: 'stIOTA',
      tokenB: 'vUSD',
      tokenASymbol: 'stIOTA',
      tokenBSymbol: 'vUSD',
      tvl: stIotaVusdTVL,
      volume24h: calculateVolume(stIotaVusdPool),
      volume30d: calculateVolume(stIotaVusdPool) * 30,
      apr: calculateAPR(calculateFees(stIotaVusdPool), stIotaVusdTVL),
      fees24h: calculateFees(stIotaVusdPool)
    },
    {
      rank: 3,
      tokenA: 'IOTA',
      tokenB: 'vUSD',
      tokenASymbol: 'IOTA',
      tokenBSymbol: 'vUSD',
      tvl: iotaVusdTVL,
      volume24h: calculateVolume(iotaVusdPool),
      volume30d: calculateVolume(iotaVusdPool) * 30,
      apr: calculateAPR(calculateFees(iotaVusdPool), iotaVusdTVL),
      fees24h: calculateFees(iotaVusdPool)
    },
  ];

  const filteredPools = pools.filter(pool => 
    pool.tokenA.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pool.tokenB.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalTVL = pools.reduce((sum, pool) => sum + pool.tvl, 0);
  const totalVolume24h = pools.reduce((sum, pool) => sum + pool.volume24h, 0);
  const totalFees24h = pools.reduce((sum, pool) => sum + pool.fees24h, 0);

  if (showLiquidityInterface) {
    return (
      <div className="min-h-screen pt-16 pb-8 bg-gradient-to-b from-gray-900 via-black to-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            onClick={() => setShowLiquidityInterface(false)}
            className="mb-2 text-gray-400 hover:text-white"
          >
            ← Back to Pools
          </Button>
          <PoolInterface />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-5xl font-bold mb-4 gradient-text">Liquidity Pools</h1>
        <p className="text-xl text-gray-400">
          Provide liquidity to earn fees from every swap
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-black/40 border-white/10 card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total TVL</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white">${formatNumber(totalTVL, 2)}</div>
            <div className="text-sm text-green-400 mt-1">Real-time value</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10 card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">24h Volume</span>
              <BarChart2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">${formatNumber(totalVolume24h, 2)}</div>
            <div className="text-sm text-purple-400 mt-1">Trading activity</div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10 card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">24h Fees</span>
              <Droplets className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">${formatNumber(totalFees24h, 2)}</div>
            <div className="text-sm text-blue-400 mt-1">LP rewards</div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
          <Input
            placeholder="Search pools by token..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-black/40 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Button 
          className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
          onClick={() => setShowLiquidityInterface(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Liquidity
        </Button>
      </div>

      {/* Pools Table */}
      <div className="bg-black/40 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-white/10">
              <tr>
                <th className="p-4 text-left text-gray-400 font-medium">
                  <div className="flex items-center gap-1">
                    <span>#</span>
                  </div>
                </th>
                <th className="p-4 text-left text-gray-400 font-medium">Pool</th>
                <th className="p-4 text-right text-gray-400 font-medium">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className="w-3 h-3" />
                    TVL
                  </div>
                </th>
                <th className="p-4 text-right text-gray-400 font-medium">APR</th>
                <th className="p-4 text-right text-gray-400 font-medium">24h Volume</th>
                <th className="p-4 text-right text-gray-400 font-medium">24h Fees</th>
              </tr>
            </thead>
            <tbody>
              {filteredPools.map((pool) => (
                <tr 
                  key={`${pool.tokenA}-${pool.tokenB}`} 
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setShowLiquidityInterface(true)}
                >
                  <td className="p-4 text-gray-500">{pool.rank}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center -space-x-2">
                        <CoinIcon symbol={pool.tokenA} size={24} />
                        <CoinIcon symbol={pool.tokenB} size={24} />
                      </div>
                      <span className="text-white font-medium">
                        {pool.tokenA}/{pool.tokenB}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right text-white font-mono">
                    ${formatNumber(pool.tvl, 2)}
                  </td>
                  <td className="p-4 text-right">
                    <span className={pool.apr > 0 ? "text-green-400 font-mono" : "text-gray-400 font-mono"}>
                      {pool.apr.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-4 text-right text-white font-mono">
                    ${formatNumber(pool.volume24h, 2)}
                  </td>
                  <td className="p-4 text-right text-white font-mono">
                    ${formatNumber(pool.fees24h, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}