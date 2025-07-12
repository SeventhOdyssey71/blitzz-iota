'use client';

import { useState } from 'react';
import { Plus, Info, Loader2, Minus } from 'lucide-react';
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
import { useRemoveLiquidity } from '@/hooks/use-remove-liquidity';
import { usePoolInfo } from '@/hooks/use-pool-info';
import { useLPTokens } from '@/hooks/use-lp-tokens';

export function PoolInterface() {
  const currentAccount = useCurrentAccount();
  const isConnected = !!currentAccount;
  
  const [iotaAmount, setIotaAmount] = useState('');
  const [stIotaAmount, setStIotaAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'add' | 'remove'>('add');
  const [selectedLPToken, setSelectedLPToken] = useState<string>('');
  const [removePercentage, setRemovePercentage] = useState('100');
  
  // Get wallet balances
  const { balance: iotaBalance, formatted: iotaFormatted } = useWalletBalance(SUPPORTED_COINS.IOTA.type);
  const { balance: stIotaBalance, formatted: stIotaFormatted } = useWalletBalance(SUPPORTED_COINS.stIOTA.type);
  
  // Get pool info
  const { poolInfo, isLoading: isLoadingPool } = usePoolInfo(
    SUPPORTED_COINS.IOTA.type,
    SUPPORTED_COINS.stIOTA.type
  );
  
  // Add/Remove liquidity hooks
  const { addLiquidity, isAdding } = useAddLiquidity();
  const { removeLiquidity, isRemoving } = useRemoveLiquidity();
  
  // Get LP tokens
  const { lpTokens, isLoading: isLoadingLP } = useLPTokens();
  
  // Refresh pool info after adding liquidity
  const refreshPoolInfo = () => {
    window.location.reload();
  };
  
  // Calculate pool share
  const calculatePoolShare = () => {
    if (!poolInfo || !iotaAmount || !stIotaAmount) return '0.00';
    
    const iotaAmountBig = BigInt(Math.floor(parseFloat(iotaAmount || '0') * 1e9));
    const stIotaAmountBig = BigInt(Math.floor(parseFloat(stIotaAmount || '0') * 1e9));
    
    if (poolInfo.lpSupply === BigInt(0)) {
      // First liquidity provider gets 100%
      return '100.00';
    }
    
    // Calculate share based on IOTA amount
    const totalValue = poolInfo.reserveA + iotaAmountBig;
    const share = (iotaAmountBig * BigInt(10000)) / totalValue;
    return (Number(share) / 100).toFixed(2);
  };
  
  // Calculate LP tokens
  const calculateLPTokens = () => {
    if (!poolInfo || !iotaAmount || !stIotaAmount) return '0';
    
    const iotaAmountBig = BigInt(Math.floor(parseFloat(iotaAmount || '0') * 1e9));
    
    if (poolInfo.lpSupply === BigInt(0)) {
      // First liquidity provider gets amount equal to their deposit
      return formatBalance(iotaAmountBig.toString(), 9, 4);
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
      });
      
      if (result.success) {
        setIotaAmount('');
        setStIotaAmount('');
        setTimeout(refreshPoolInfo, 2000);
      }
    } catch (error) {
      console.error('Add liquidity error:', error);
    }
  };
  
  const handleRemoveLiquidity = async () => {
    if (!selectedLPToken) {
      toast.error('Please select an LP token');
      return;
    }
    
    const lpToken = lpTokens.find(t => t.id === selectedLPToken);
    if (!lpToken) return;
    
    const lpAmount = (BigInt(lpToken.amount) * BigInt(removePercentage) / BigInt(100)).toString();
    
    const result = await removeLiquidity({
      tokenA: SUPPORTED_COINS.IOTA,
      tokenB: SUPPORTED_COINS.stIOTA,
      lpTokenId: selectedLPToken,
      lpAmount,
    });
    
    if (result.success) {
      setSelectedLPToken('');
      setRemovePercentage('100');
      // Refresh pool info and LP tokens
      setTimeout(refreshPoolInfo, 2000);
    }
  };
  
  const handleIotaChange = (value: string) => {
    setIotaAmount(value);
    
    // Auto-calculate proportional amount for stIOTA
    if (value && poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0) {
      const iotaAmountBig = BigInt(Math.floor(parseFloat(value || '0') * 1e9));
      const stIotaAmountBig = (iotaAmountBig * poolInfo.reserveB) / poolInfo.reserveA;
      setStIotaAmount(formatBalance(stIotaAmountBig.toString(), 9, 6));
    }
  };
  
  const handleStIotaChange = (value: string) => {
    setStIotaAmount(value);
    
    // Auto-calculate proportional amount for IOTA
    if (value && poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0) {
      const stIotaAmountBig = BigInt(Math.floor(parseFloat(value || '0') * 1e9));
      const iotaAmountBig = (stIotaAmountBig * poolInfo.reserveA) / poolInfo.reserveB;
      setIotaAmount(formatBalance(iotaAmountBig.toString(), 9, 6));
    }
  };
  
  const handleMaxIota = () => {
    if (iotaFormatted) {
      const balance = parseFloat(iotaFormatted);
      const gasReserve = 0.15; // Reserve for gas
      const maxAmount = Math.max(0, balance - gasReserve);
      if (maxAmount > 0) {
        handleIotaChange(maxAmount.toFixed(6));
      } else {
        toast.error('Insufficient IOTA balance (need gas reserves)');
      }
    }
  };
  
  const handleMaxStIota = () => {
    if (stIotaFormatted) {
      handleStIotaChange(stIotaFormatted);
    }
  };
  
  // Calculate total LP value in USD
  const totalLPValue = lpTokens.length > 0 && poolInfo && poolInfo.lpSupply > 0
    ? lpTokens.reduce((total, token) => {
        const share = BigInt(token.amount) * BigInt(10000) / poolInfo.lpSupply;
        const iotaAmount = (poolInfo.reserveA * share) / BigInt(10000);
        const stIotaAmount = (poolInfo.reserveB * share) / BigInt(10000);
        const valueInUsd = (Number(iotaAmount + stIotaAmount) / 1e9) * 0.28; // Assuming $0.28 per IOTA
        return total + valueInUsd;
      }, 0)
    : 0;
  
  return (
    <div className="space-y-6">
      {/* Your Position */}
      {isConnected && lpTokens.length > 0 && (
        <Card className="bg-black/60 backdrop-blur-sm border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Your Liquidity Positions</CardTitle>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {lpTokens.length} Position{lpTokens.length > 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lpTokens.map((token) => (
                <div key={token.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <CoinIcon symbol="IOTA" size={24} />
                      <CoinIcon symbol="stIOTA" size={24} />
                    </div>
                    <div>
                      <p className="text-white font-medium">IOTA/stIOTA</p>
                      <p className="text-sm text-gray-400">LP Tokens: <span className="font-mono">{formatBalance(token.amount, 9, 4)}</span></p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => {
                      setActiveTab('remove');
                      setSelectedLPToken(token.id);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Value</span>
                  <span className="text-white font-mono">${totalLPValue.toFixed(2)}</span>
                </div>
              </div>
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
                {isLoadingPool ? (
                  <span className="animate-pulse">Loading...</span>
                ) : poolInfo && (poolInfo.totalVolumeA || poolInfo.totalVolumeB) ? (
                  `$${((Number(poolInfo.totalVolumeA || 0) / 1e9 + Number(poolInfo.totalVolumeB || 0) / 1e9) * 0.28).toFixed(2)}`
                ) : (
                  '$0.00'
                )}
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
              <p className="text-2xl font-bold text-green-400 font-mono">12.5%</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Accumulated Fees</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CoinIcon symbol="IOTA" size={16} />
                  <span className="text-white font-mono">
                    {poolInfo && poolInfo.feesA ? formatBalance(poolInfo.feesA.toString(), 9, 4) : '0.0000'} IOTA
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CoinIcon symbol="stIOTA" size={16} />
                  <span className="text-white font-mono">
                    {poolInfo && poolInfo.feesB ? formatBalance(poolInfo.feesB.toString(), 9, 4) : '0.0000'} stIOTA
                  </span>
                </div>
              </div>
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
                  <span className="text-gray-400">Pool Share</span>
                  <span className="text-white font-mono">{calculatePoolShare()}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">LP Tokens</span>
                  <span className="text-white font-mono">{calculateLPTokens()}</span>
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
              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Connect your wallet to manage liquidity</p>
                </div>
              ) : isLoadingLP ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
                  <p className="text-gray-400">Loading your LP positions...</p>
                </div>
              ) : lpTokens.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">You don't have any LP tokens for this pool</p>
                  <p className="text-sm text-gray-500 mt-2">Add liquidity first to receive LP tokens</p>
                </div>
              ) : (
                <>
                  {/* LP Token Selection */}
                  <div className="space-y-2">
                    <label className="text-sm text-gray-400">Select LP Token</label>
                    <select
                      value={selectedLPToken}
                      onChange={(e) => setSelectedLPToken(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-lg p-3"
                    >
                      <option value="" className="bg-black">Select an LP token</option>
                      {lpTokens.map((token) => (
                        <option key={token.id} value={token.id} className="bg-black">
                          LP Token - {formatBalance(token.amount, 9, 4)} LP
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedLPToken && (
                    <>
                      {/* Remove Percentage */}
                      <div className="space-y-2">
                        <label className="text-sm text-gray-400">Remove Amount ({removePercentage}%)</label>
                        <div className="space-y-3">
                          <Input
                            type="range"
                            min="0"
                            max="100"
                            value={removePercentage}
                            onChange={(e) => setRemovePercentage(e.target.value)}
                            className="w-full"
                          />
                          <div className="flex justify-between text-sm gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRemovePercentage('25')}
                              className="flex-1 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                            >
                              25%
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRemovePercentage('50')}
                              className="flex-1 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                            >
                              50%
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRemovePercentage('75')}
                              className="flex-1 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                            >
                              75%
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRemovePercentage('100')}
                              className="flex-1 border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                            >
                              100%
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expected Output */}
                      <div className="bg-white/5 rounded-xl p-4 space-y-2">
                        <h4 className="text-sm text-gray-400 mb-3">You will receive</h4>
                        {(() => {
                          const lpToken = lpTokens.find(t => t.id === selectedLPToken);
                          if (!lpToken || !poolInfo || poolInfo.lpSupply === BigInt(0)) return null;
                          
                          const lpAmount = BigInt(lpToken.amount) * BigInt(removePercentage) / BigInt(100);
                          const totalLpSupply = poolInfo.lpSupply;
                          const expectedIota = (lpAmount * poolInfo.reserveA) / totalLpSupply;
                          const expectedStIota = (lpAmount * poolInfo.reserveB) / totalLpSupply;
                          
                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CoinIcon symbol="IOTA" size={20} />
                                  <span className="text-white">IOTA</span>
                                </div>
                                <span className="text-white font-mono">
                                  {formatBalance(expectedIota.toString(), 9, 4)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <CoinIcon symbol="stIOTA" size={20} />
                                  <span className="text-white">stIOTA</span>
                                </div>
                                <span className="text-white font-mono">
                                  {formatBalance(expectedStIota.toString(), 9, 4)}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </>
                  )}
                  
                  {/* Remove Button */}
                  <Button
                    className="w-full bg-red-500 hover:bg-red-400 text-white font-semibold py-6 text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleRemoveLiquidity}
                    disabled={!selectedLPToken || isRemoving || removePercentage === '0'}
                  >
                    {isRemoving ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Removing Liquidity...
                      </>
                    ) : (
                      'Remove Liquidity'
                    )}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}