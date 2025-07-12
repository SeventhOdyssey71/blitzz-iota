'use client';

import { useState } from 'react';
import { usePoolInfo } from '@/hooks/use-pool-info';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { formatNumber } from '@/lib/utils/format';
import { CoinIcon } from '@/components/coin-icon';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { PoolInterface } from '@/components/pool-interface';

interface PoolData {
  rank: number;
  tokenA: string;
  tokenB: string;
  tvl: number;
  volume24h: number;
  volume30d: number;
  apr: number;
  fees24h: number;
}

export default function PoolPage() {
  const [activeTab, setActiveTab] = useState<'pools' | 'tokens'>('pools');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLiquidityInterface, setShowLiquidityInterface] = useState(false);
  
  // Get pool info for IOTA/stIOTA
  const { poolInfo: iotaStIotaPool } = usePoolInfo(
    SUPPORTED_COINS.IOTA.type,
    SUPPORTED_COINS.stIOTA.type
  );
  
  // Calculate TVL for IOTA/stIOTA pool
  const iotaStIotaTVL = iotaStIotaPool && (iotaStIotaPool.reserveA > 0 || iotaStIotaPool.reserveB > 0)
    ? (Number(iotaStIotaPool.reserveA) / 1e9 + Number(iotaStIotaPool.reserveB) / 1e9) * 0.28
    : 0;
  
  // Mock data for pools - in production this would come from an API
  const pools: PoolData[] = [
    {
      rank: 1,
      tokenA: 'IOTA',
      tokenB: 'stIOTA',
      tvl: iotaStIotaTVL || 560.00,
      volume24h: 63454.51,
      volume30d: 63465.78,
      apr: 12.5,
      fees24h: 190.36
    },
    {
      rank: 2,
      tokenA: 'stIOTA',
      tokenB: 'VUSD',
      tvl: 2746177.54,
      volume24h: 240052.89,
      volume30d: 240099.98,
      apr: 0.02,
      fees24h: 720.16
    },
    {
      rank: 3,
      tokenA: 'IOTA',
      tokenB: 'VUSD',
      tvl: 101145.83,
      volume24h: 9849.25,
      volume30d: 9854.57,
      apr: 0.02,
      fees24h: 29.55
    }
  ];
  
  const filteredPools = pools.filter(pool => 
    pool.tokenA.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pool.tokenB.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (showLiquidityInterface) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={() => setShowLiquidityInterface(false)}
            variant="ghost"
            className="mb-4 text-gray-400 hover:text-white"
          >
            ← Back to Pools
          </Button>
          <PoolInterface />
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Liquidity Pools</h1>
              <p className="text-gray-400">Provide liquidity and earn fees from swaps</p>
            </div>
            <Button
              onClick={() => setShowLiquidityInterface(true)}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Liquidity
            </Button>
          </div>
          
          {/* Tabs and Search */}
          <div className="flex items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pools' | 'tokens')}>
              <TabsList className="bg-black/40 border border-white/10">
                <TabsTrigger 
                  value="pools" 
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                >
                  Pools
                </TabsTrigger>
                <TabsTrigger 
                  value="tokens" 
                  className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"
                >
                  Tokens
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search pools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
        </div>
        
        {/* Pools Table */}
        {activeTab === 'pools' && (
          <div className="bg-black/40 rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-sm font-medium text-gray-400">#</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-400">POOL</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" />
                        TVL
                      </div>
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">24H VOLUME</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">30D VOLUME</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">APR</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-400">24H FEES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPools.map((pool) => (
                    <tr 
                      key={pool.rank} 
                      className="border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer"
                      onClick={() => pool.rank === 1 && setShowLiquidityInterface(true)}
                    >
                      <td className="p-4 text-white">{pool.rank}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            <CoinIcon symbol={pool.tokenA} size={28} />
                            <CoinIcon symbol={pool.tokenB} size={28} />
                          </div>
                          <span className="text-white font-medium">
                            {pool.tokenA}-{pool.tokenB}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right text-white font-mono">
                        ${formatNumber(pool.tvl, 2)}
                      </td>
                      <td className="p-4 text-right text-white font-mono">
                        ${formatNumber(pool.volume24h, 2)}
                      </td>
                      <td className="p-4 text-right text-white font-mono">
                        ${formatNumber(pool.volume30d, 2)}
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-green-400 font-mono">{pool.apr.toFixed(2)}%</span>
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
        )}
        
        {/* Tokens Tab Content */}
        {activeTab === 'tokens' && (
          <div className="bg-black/40 rounded-xl border border-white/10 p-8">
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">Token analytics coming soon</p>
              <p className="text-sm text-gray-500">View token prices, volumes, and liquidity across all pools</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}