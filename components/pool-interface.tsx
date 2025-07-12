'use client';

import { useState } from 'react';
import { Plus, Info, Loader2 } from 'lucide-react';
import { useCurrentAccount } from '@iota/dapp-kit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWalletBalance } from '@/hooks/use-wallet-balance';
import { formatBalance, formatTokenAmount } from '@/lib/utils/format';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { toast } from 'sonner';
import { CoinIcon } from '@/components/coin-icon';
import { useAddLiquidity } from '@/hooks/use-add-liquidity';
import { usePoolInfo } from '@/hooks/use-pool-info';

export function PoolInterface() {
  const currentAccount = useCurrentAccount();
  const isConnected = !!currentAccount;
  
  const [iotaAmount, setIotaAmount] = useState('');
  const [stIotaAmount, setStIotaAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  
  // Get wallet balances
  const { balance: iotaBalance, formatted: iotaFormatted } = useWalletBalance(SUPPORTED_COINS.IOTA.type);
  const { balance: stIotaBalance, formatted: stIotaFormatted } = useWalletBalance(SUPPORTED_COINS.stIOTA.type);
  
  // Get pool info
  const { poolInfo, isLoading: isLoadingPool } = usePoolInfo(
    SUPPORTED_COINS.IOTA.type,
    SUPPORTED_COINS.stIOTA.type
  );
  
  // Add liquidity hook
  const { addLiquidity, isAdding } = useAddLiquidity();
  
  // Refresh pool info after adding liquidity
  const refreshPoolInfo = () => {
    window.location.reload();
  };
  
  // Calculate pool share
  const calculatePoolShare = () => {
    if (!poolInfo || !iotaAmount || !stIotaAmount) return '0.00';
    
    const iotaAmountBig = BigInt(Math.floor(parseFloat(iotaAmount || '0') * 1e9));
    const stIotaAmountBig = BigInt(Math.floor(parseFloat(stIotaAmount || '0') * 1e9));
    
    // If no existing pool, user gets 100%
    if (!poolInfo || !poolInfo.lpSupply || poolInfo.lpSupply === BigInt(0)) {
      return '100.00';
    }
    
    // Calculate based on the smaller amount to maintain ratio
    const lpFromA = poolInfo.reserveA > 0 ? (iotaAmountBig * poolInfo.lpSupply) / poolInfo.reserveA : BigInt(0);
    const lpFromB = poolInfo.reserveB > 0 ? (stIotaAmountBig * poolInfo.lpSupply) / poolInfo.reserveB : BigInt(0);
    const lpToMint = lpFromA < lpFromB ? lpFromA : lpFromB;
    
    if (lpToMint === BigInt(0)) return '0.00';
    
    const totalLpAfter = poolInfo.lpSupply + lpToMint;
    const sharePercent = (lpToMint * BigInt(10000)) / totalLpAfter;
    
    return (Number(sharePercent) / 100).toFixed(2);
  };
  
  const handleAddLiquidity = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!iotaAmount || !stIotaAmount) {
      toast.error('Please enter amounts for both tokens');
      return;
    }
    
    const iotaAmountNum = parseFloat(iotaAmount);
    const stIotaAmountNum = parseFloat(stIotaAmount);
    
    if (iotaAmountNum <= 0 || stIotaAmountNum <= 0) {
      toast.error('Please enter valid amounts');
      return;
    }
    
    // Check balances
    if (iotaAmountNum > parseFloat(iotaFormatted)) {
      toast.error('Insufficient IOTA balance');
      return;
    }
    
    if (stIotaAmountNum > parseFloat(stIotaFormatted)) {
      toast.error('Insufficient stIOTA balance');
      return;
    }
    
    const result = await addLiquidity({
      tokenA: SUPPORTED_COINS.IOTA,
      tokenB: SUPPORTED_COINS.stIOTA,
      amountA: iotaAmount,
      amountB: stIotaAmount,
    });
    
    if (result.success) {
      setIotaAmount('');
      setStIotaAmount('');
      toast.success('Liquidity added successfully!');
      // Refresh to show updated pool info
      setTimeout(() => {
        refreshPoolInfo();
      }, 2000);
    }
  };
  
  const handleMaxIota = () => {
    if (iotaFormatted) {
      // Reserve 0.15 IOTA for gas
      const balance = parseFloat(iotaFormatted);
      const gasReserve = 0.15;
      const maxAmount = Math.max(0, balance - gasReserve);
      handleIotaChange(maxAmount.toFixed(2));
    }
  };
  
  const handleMaxStIota = () => {
    if (stIotaFormatted) {
      setStIotaAmount(stIotaFormatted);
    }
  };
  
  // Auto-calculate proportional amounts
  const handleIotaChange = (value: string) => {
    setIotaAmount(value);
    
    // If pool exists with reserves, calculate proportional stIOTA amount
    if (poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0 && value) {
      const iotaAmountBig = BigInt(Math.floor(parseFloat(value) * 1e9));
      const stIotaRequired = (iotaAmountBig * poolInfo.reserveB) / poolInfo.reserveA;
      const stIotaFormatted = formatBalance(stIotaRequired.toString(), 9, 2);
      setStIotaAmount(stIotaFormatted);
    } else if (!poolInfo && value) {
      // For new pool, maintain 1:1 ratio
      setStIotaAmount(value);
    }
  };
  
  const handleStIotaChange = (value: string) => {
    setStIotaAmount(value);
    
    // If pool exists with reserves, calculate proportional IOTA amount
    if (poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0 && value) {
      const stIotaAmountBig = BigInt(Math.floor(parseFloat(value) * 1e9));
      const iotaRequired = (stIotaAmountBig * poolInfo.reserveA) / poolInfo.reserveB;
      const iotaFormatted = formatBalance(iotaRequired.toString(), 9, 2);
      setIotaAmount(iotaFormatted);
    } else if (!poolInfo && value) {
      // For new pool, maintain 1:1 ratio
      setIotaAmount(value);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Pool Stats */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">IOTA / stIOTA Pool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Total Value Locked</p>
              <p className="text-2xl font-bold text-white">
                {isLoadingPool ? (
                  <span className="animate-pulse">Loading...</span>
                ) : poolInfo && (poolInfo.reserveA > 0 || poolInfo.reserveB > 0) ? (
                  `$${((Number(poolInfo.reserveA) / 1e9 + Number(poolInfo.reserveB) / 1e9) * 0.28).toFixed(2)}`
                ) : (
                  '$0.00'
                )}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">24h Volume</p>
              <p className="text-2xl font-bold text-white">
                {poolInfo && poolInfo.reserveA > 0 ? '$0.00' : '-'}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Pool Reserves</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CoinIcon symbol="IOTA" size={16} />
                  <span className="text-white">
                    {isLoadingPool ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : poolInfo && poolInfo.reserveA > 0 ? (
                      `${formatBalance(poolInfo.reserveA.toString(), 9, 2)} IOTA`
                    ) : (
                      '0.00 IOTA'
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CoinIcon symbol="stIOTA" size={16} />
                  <span className="text-white">
                    {isLoadingPool ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : poolInfo && poolInfo.reserveB > 0 ? (
                      `${formatBalance(poolInfo.reserveB.toString(), 9, 2)} stIOTA`
                    ) : (
                      '0.00 stIOTA'
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">APR</p>
              <p className="text-2xl font-bold text-green-400">
                {poolInfo && poolInfo.reserveA > 0 ? '12.5%' : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Add/Remove Liquidity */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'add' | 'remove')}>
            <TabsList className="grid w-full grid-cols-2 bg-white/5">
              <TabsTrigger value="add" className="data-[state=active]:bg-cyan-500/20">
                Add Liquidity
              </TabsTrigger>
              <TabsTrigger value="remove" className="data-[state=active]:bg-cyan-500/20">
                Remove Liquidity
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="add" className="space-y-4 mt-6">
              {/* IOTA Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">IOTA Amount</label>
                  {isConnected && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <span>Balance: {iotaFormatted || '0'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto p-0"
                        onClick={handleMaxIota}
                      >
                        MAX
                      </Button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Input
                    placeholder="0.0"
                    value={iotaAmount}
                    onChange={(e) => handleIotaChange(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pr-20"
                    type="number"
                    min="0"
                    step="any"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <CoinIcon symbol="IOTA" size={20} />
                    <span className="text-white font-medium">IOTA</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center">
                <Plus className="w-5 h-5 text-gray-400" />
              </div>
              
              {/* stIOTA Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">stIOTA Amount</label>
                  {isConnected && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <span>Balance: {stIotaFormatted || '0'}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto p-0"
                        onClick={handleMaxStIota}
                      >
                        MAX
                      </Button>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <Input
                    placeholder="0.0"
                    value={stIotaAmount}
                    onChange={(e) => handleStIotaChange(e.target.value)}
                    className="bg-white/5 border-white/10 text-white pr-24"
                    type="number"
                    min="0"
                    step="any"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <CoinIcon symbol="stIOTA" size={20} />
                    <span className="text-white font-medium">stIOTA</span>
                  </div>
                </div>
              </div>
              
              {/* Pool Share Info */}
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                {!poolInfo && iotaAmount && stIotaAmount && (
                  <div className="flex items-center gap-2 text-sm text-cyan-400 mb-2">
                    <Info className="w-4 h-4" />
                    <span>You will be the first liquidity provider!</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Your Pool Share</span>
                  <span className="text-white font-medium">{calculatePoolShare()}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Exchange Rate</span>
                  <span className="text-white">1 IOTA = 1 stIOTA</span>
                </div>
              </div>
              
              {/* Add Button */}
              <Button
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-6 text-lg"
                onClick={handleAddLiquidity}
                disabled={!isConnected || isAdding || !iotaAmount || !stIotaAmount}
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Adding Liquidity...
                  </>
                ) : (
                  'Add Liquidity'
                )}
              </Button>
              
              {!isConnected && (
                <p className="text-center text-sm text-gray-400">
                  Connect your wallet to add liquidity
                </p>
              )}
            </TabsContent>
            
            <TabsContent value="remove" className="space-y-4 mt-6">
              <div className="text-center py-8 text-gray-400">
                <Info className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Remove liquidity feature coming soon</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}