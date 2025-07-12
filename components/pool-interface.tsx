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
    
    // If pool is empty, user gets 100%
    if (poolInfo.reserveA === 0n && poolInfo.reserveB === 0n) {
      return '100.00';
    }
    
    // Calculate share based on IOTA input (simplified for 1:1 ratio)
    const newTotal = poolInfo.reserveA + iotaAmountBig;
    const share = (Number(iotaAmountBig) / Number(newTotal)) * 100;
    
    return share.toFixed(2);
  };
  
  // Calculate LP tokens
  const calculateLPTokens = () => {
    if (!iotaAmount || !stIotaAmount || !poolInfo) return '0.00';
    
    const iotaAmountBig = BigInt(Math.floor(parseFloat(iotaAmount || '0') * 1e9));
    const stIotaAmountBig = BigInt(Math.floor(parseFloat(stIotaAmount || '0') * 1e9));
    
    // For new pool, LP tokens = sqrt(amount1 * amount2)
    if (poolInfo.lpSupply === 0n) {
      // Simplified: return the smaller amount
      const lpAmount = iotaAmountBig < stIotaAmountBig ? iotaAmountBig : stIotaAmountBig;
      return formatBalance(lpAmount.toString(), 9, 4);
    }
    
    // For existing pool, calculate proportionally
    const lpAmount = (iotaAmountBig * poolInfo.lpSupply) / poolInfo.reserveA;
    return formatBalance(lpAmount.toString(), 9, 4);
  };
  
  const handleAddLiquidity = async () => {
    if (!iotaAmount || !stIotaAmount) {
      toast.error('Please enter both amounts');
      return;
    }
    
    if (!currentAccount) {
      toast.error('Please connect your wallet');
      return;
    }
    
    try {
      const result = await addLiquidity({
        tokenA: {
          type: SUPPORTED_COINS.IOTA.type,
          symbol: 'IOTA',
          decimals: 9,
        },
        tokenB: {
          type: SUPPORTED_COINS.stIOTA.type,
          symbol: 'stIOTA',
          decimals: 9,
        },
        amountA: iotaAmount,
        amountB: stIotaAmount,
        slippage: 1, // 1% slippage
      });
      
      if (result.success) {
        toast.success('Liquidity added successfully!');
        setIotaAmount('');
        setStIotaAmount('');
        // Refresh pool info after a short delay
        setTimeout(refreshPoolInfo, 2000);
      }
    } catch (error) {
      console.error('Add liquidity error:', error);
    }
  };
  
  const handleMaxIota = () => {
    // Reserve 0.5 IOTA for gas
    const balance = parseFloat(iotaFormatted || '0');
    const maxAmount = Math.max(0, balance - 0.5);
    handleIotaChange(maxAmount.toString());
  };
  
  const handleMaxStIota = () => {
    setStIotaAmount(stIotaFormatted || '0');
  };
  
  const handleIotaChange = (value: string) => {
    setIotaAmount(value);
    
    // For existing pool, calculate required stIOTA amount
    if (poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0) {
      const iotaAmountBig = BigInt(Math.floor(parseFloat(value || '0') * 1e9));
      const requiredStIota = (iotaAmountBig * poolInfo.reserveB) / poolInfo.reserveA;
      setStIotaAmount(formatBalance(requiredStIota.toString(), 9, 6));
    } else {
      // For new pool, maintain 1:1 ratio
      setStIotaAmount(value);
    }
  };
  
  const handleStIotaChange = (value: string) => {
    setStIotaAmount(value);
    
    // For existing pool, calculate required IOTA amount
    if (poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0) {
      const stIotaAmountBig = BigInt(Math.floor(parseFloat(value || '0') * 1e9));
      const requiredIota = (stIotaAmountBig * poolInfo.reserveA) / poolInfo.reserveB;
      setIotaAmount(formatBalance(requiredIota.toString(), 9, 6));
    } else {
      // For new pool, maintain 1:1 ratio
      setIotaAmount(value);
    }
  };
  
  // Check if user has liquidity
  const hasLiquidity = poolInfo && poolInfo.lpSupply > 0;
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Your Position */}
      {hasLiquidity && (
        <Card className="bg-black/60 backdrop-blur-sm border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Your Liquidity Position</CardTitle>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Active Pool
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-400">Your Pool Share</p>
                <p className="text-xl font-bold text-cyan-400 font-mono">
                  {poolInfo.lpSupply > 0 ? '100%' : '0%'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">IOTA Deposited</p>
                <p className="text-xl font-bold text-white font-mono">
                  {formatBalance(poolInfo.reserveA.toString(), 9, 2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">stIOTA Deposited</p>
                <p className="text-xl font-bold text-white font-mono">
                  {formatBalance(poolInfo.reserveB.toString(), 9, 2)}
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                This pool is being used for IOTA/stIOTA swaps
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Pool Stats */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-white">IOTA / stIOTA Pool</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Total Value Locked</p>
              <p className="text-2xl font-bold text-white font-mono">
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
              <p className="text-2xl font-bold text-white font-mono">
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
                      <><span className="font-mono">{formatBalance(poolInfo.reserveA.toString(), 9, 2)}</span> IOTA</>
                    ) : (
                      <span className="font-mono">0.00 IOTA</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CoinIcon symbol="stIOTA" size={16} />
                  <span className="text-white">
                    {isLoadingPool ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : poolInfo && poolInfo.reserveB > 0 ? (
                      <><span className="font-mono">{formatBalance(poolInfo.reserveB.toString(), 9, 2)}</span> stIOTA</>
                    ) : (
                      <span className="font-mono">0.00 stIOTA</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">APR</p>
              <p className="text-2xl font-bold text-green-400 font-mono">
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
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <span>Balance: <span className="font-mono">{iotaFormatted || '0'}</span></span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto p-0 text-cyan-400 hover:text-cyan-300"
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
                    className="bg-white/5 border-white/10 text-white pr-20 font-mono"
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
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <span>Balance: <span className="font-mono">{stIotaFormatted || '0'}</span></span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto p-0 text-cyan-400 hover:text-cyan-300"
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
                    className="bg-white/5 border-white/10 text-white pr-20 font-mono"
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
                  <span className="text-white font-medium font-mono">{calculatePoolShare()}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Exchange Rate</span>
                  <span className="text-white font-mono">1 IOTA = 1 stIOTA</span>
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