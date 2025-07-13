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
import { useRemoveLiquidityV2 } from '@/hooks/use-remove-liquidity-v2';
import { usePoolInfo } from '@/hooks/use-pool-info';
import { useLPTokens } from '@/hooks/use-lp-tokens';
import { useLPTokensV2 } from '@/hooks/use-lp-tokens-v2';
import { refreshPoolCache } from '@/lib/services/pool-refresh';
import { useTokenPrices } from '@/hooks/use-token-price';

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
  const { removeLiquidity, isRemoving } = useRemoveLiquidityV2();
  
  // Get LP tokens - using V2 for debugging
  const { lpTokens: lpTokensV1, isLoading: isLoadingLPV1 } = useLPTokens();
  const { lpTokens: lpTokensV2, isLoading: isLoadingLPV2 } = useLPTokensV2();
  
  
  // Use V2 for now to see all tokens
  const lpTokens = lpTokensV2;
  const isLoadingLP = isLoadingLPV2;
  
  // Get token prices
  const { prices: tokenPrices } = useTokenPrices(['IOTA', 'stIOTA']);
  const iotaPrice = tokenPrices?.IOTA?.price || 0.28;
  const stIotaPrice = tokenPrices?.stIOTA?.price || iotaPrice; // stIOTA typically tracks IOTA price
  
  // Refresh pool info after adding liquidity
  const refreshPoolInfo = () => {
    // Clear pool cache
    localStorage.removeItem('blitz_created_pools');
    localStorage.removeItem('pool_cache');
    window.dispatchEvent(new Event('pool-cache-refresh'));
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
    const stIotaAmountBig = BigInt(Math.floor(parseFloat(stIotaAmount || '0') * 1e9));
    
    if (poolInfo.lpSupply === BigInt(0)) {
      // First liquidity provider - use geometric mean: sqrt(amount_a * amount_b)
      const product = iotaAmountBig * stIotaAmountBig;
      // Simple sqrt approximation for bigint
      const sqrt = (n: bigint) => {
        if (n === 0n) return 0n;
        let x = n;
        let y = (x + 1n) / 2n;
        while (y < x) {
          x = y;
          y = (x + n / x) / 2n;
        }
        return x;
      };
      return formatBalance(sqrt(product).toString(), 9, 4);
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
        
        // Extract liquidity info from transaction if available
        if (result.digest) {
          const { extractLiquidityFromTransaction } = await import('@/lib/services/extract-liquidity-from-tx');
          extractLiquidityFromTransaction(result.digest).then((liquidityResult) => {
            if (liquidityResult.success) {
              console.log('Liquidity addition tracked:', liquidityResult);
            }
          });
        }
        
        // Refresh pool cache to ensure swap can find the pool
        setTimeout(() => {
          refreshPoolCache();
          refreshPoolInfo();
        }, 2000);
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
    
    // The contract burns the entire LP token, so we use the full amount
    const lpAmount = lpToken.amount;
    
    const result = await removeLiquidity({
      tokenA: SUPPORTED_COINS.IOTA,
      tokenB: SUPPORTED_COINS.stIOTA,
      lpTokenId: selectedLPToken,
      lpAmount,
      poolId: poolInfo?.poolId, // Pass pool ID if available
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
    if (value) {
      if (poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0) {
        // Existing pool - maintain ratio
        const iotaAmountBig = BigInt(Math.floor(parseFloat(value || '0') * 1e9));
        const stIotaAmountBig = (iotaAmountBig * poolInfo.reserveB) / poolInfo.reserveA;
        setStIotaAmount(formatBalance(stIotaAmountBig.toString(), 9, 6));
      } else {
        // New pool - 1:1 ratio for IOTA/stIOTA
        setStIotaAmount(value);
      }
    }
  };
  
  const handleStIotaChange = (value: string) => {
    setStIotaAmount(value);
    
    // Auto-calculate proportional amount for IOTA
    if (value) {
      if (poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0) {
        // Existing pool - maintain ratio
        const stIotaAmountBig = BigInt(Math.floor(parseFloat(value || '0') * 1e9));
        const iotaAmountBig = (stIotaAmountBig * poolInfo.reserveA) / poolInfo.reserveB;
        setIotaAmount(formatBalance(iotaAmountBig.toString(), 9, 6));
      } else {
        // New pool - 1:1 ratio for IOTA/stIOTA
        setIotaAmount(value);
      }
    }
  };
  
  const handleMaxIota = () => {
    if (iotaFormatted) {
      const balance = parseFloat(iotaFormatted);
      const gasReserve = 0.2; // Reserve 0.2 IOTA for gas to be safe
      const maxAmount = Math.max(0, balance - gasReserve);
      if (maxAmount > 0) {
        handleIotaChange(maxAmount.toFixed(6));
      } else {
        toast.error('Insufficient IOTA balance (need at least 0.2 IOTA for gas reserves)');
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
        const valueInUsd = (Number(iotaAmount) / 1e9 * iotaPrice) + (Number(stIotaAmount) / 1e9 * stIotaPrice);
        return total + valueInUsd;
      }, 0)
    : 0;
  
  return (
    <div className="space-y-4">
      {/* Pool Stats */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-xl font-bold text-white">IOTA / stIOTA Pool</CardTitle>
          {!poolInfo && !isLoadingPool && (
            <p className="text-sm text-yellow-400 mt-1">No pool exists yet. Be the first to create one!</p>
          )}
        </CardHeader>
        <CardContent className="py-2 px-4">
          {/* Pool Ratio and Spot Price */}
          {poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0 && (
            <div className="mb-4 p-3 bg-black/20 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pool Ratio</p>
                  <p className="text-sm text-white font-medium">
                    1 IOTA = {formatBalance((poolInfo.reserveB * BigInt(1e9) / poolInfo.reserveA).toString(), 9, 6)} stIOTA
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Trading Fee</p>
                  <p className="text-sm text-white font-medium">
                    {((poolInfo.feePercentage || 30) / 100).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <p className="text-sm text-gray-400">Total Value Locked</p>
              <p className="text-2xl font-bold text-white font-mono">
                {isLoadingPool ? (
                  <span className="animate-pulse">Loading...</span>
                ) : poolInfo && (poolInfo.reserveA > 0 || poolInfo.reserveB > 0) ? (
                  `$${((Number(poolInfo.reserveA) / 1e9 * iotaPrice) + (Number(poolInfo.reserveB) / 1e9 * stIotaPrice)).toFixed(2)}`
                ) : (
                  '$0.00'
                )}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-gray-400">24h Volume</p>
              <p className="text-2xl font-bold text-white font-mono">
                {isLoadingPool ? (
                  <span className="animate-pulse">Loading...</span>
                ) : poolInfo && (poolInfo.totalVolumeA || poolInfo.totalVolumeB) ? (
                  `$${((Number(poolInfo.totalVolumeA || 0) / 1e9 * iotaPrice) + (Number(poolInfo.totalVolumeB || 0) / 1e9 * stIotaPrice)).toFixed(2)}`
                ) : (
                  '$0.00'
                )}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-gray-400">Pool Reserves</p>
              <div className="space-y-0.5">
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
            <div className="space-y-0.5">
              <p className="text-sm text-gray-400">APR</p>
              <p className="text-2xl font-bold text-green-400 font-mono">
                {(() => {
                  if (!poolInfo || poolInfo.reserveA === BigInt(0) || poolInfo.reserveB === BigInt(0)) return '0.00%';
                  
                  // Calculate TVL in USD
                  const tvlUSD = (Number(poolInfo.reserveA) / 1e9 * iotaPrice) + (Number(poolInfo.reserveB) / 1e9 * stIotaPrice);
                  
                  if (tvlUSD === 0) return '0.00%';
                  
                  // Calculate total fees collected in USD
                  const totalFeesUSD = (Number(poolInfo.feesA || 0) / 1e9 * iotaPrice) + (Number(poolInfo.feesB || 0) / 1e9 * stIotaPrice);
                  
                  // If pool has been active and has fees, calculate APR based on actual performance
                  if (totalFeesUSD > 0) {
                    // Assume pool has been active for at least 1 day to extrapolate
                    // This is a simple estimation - in production you'd track pool creation time
                    const estimatedDaysActive = Math.max(1, totalFeesUSD / (tvlUSD * 0.0001)); // Rough estimate
                    const dailyReturn = totalFeesUSD / (tvlUSD * estimatedDaysActive);
                    const annualReturn = dailyReturn * 365;
                    const apr = annualReturn * 100;
                    
                    // Cap APR at reasonable levels
                    return apr > 0 && apr < 1000 ? `${apr.toFixed(2)}%` : '0.00%';
                  }
                  
                  // No fees collected yet
                  return '0.00%';
                })()}
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-gray-400">Fee Rate</p>
              <p className="text-2xl font-bold text-cyan-400 font-mono">1.80%</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-sm text-gray-400">Accumulated Fees</p>
              <div className="space-y-0.5">
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
                <div className="pt-1 text-xs text-gray-400">
                  Total: ${poolInfo && (poolInfo.feesA || poolInfo.feesB) ? 
                    ((Number(poolInfo.feesA || 0) / 1e9 * iotaPrice) + (Number(poolInfo.feesB || 0) / 1e9 * stIotaPrice)).toFixed(2) : 
                    '0.00'
                  } USD
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
              {/* Pool Status */}
              {!poolInfo && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-4">
                  <p className="text-yellow-400 text-sm">
                    No IOTA/stIOTA pool exists yet. You'll be creating the first pool with 0.3% swap fee.
                  </p>
                </div>
              )}
              
              {/* Pool Ratio Info */}
              {poolInfo && poolInfo.reserveA > 0 && poolInfo.reserveB > 0 && (
                <div className="bg-black/20 border border-white/10 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Current Pool Ratio</span>
                    <span className="text-white font-medium">
                      1 IOTA : {formatBalance((poolInfo.reserveB * BigInt(1e9) / poolInfo.reserveA).toString(), 9, 6)} stIOTA
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    You must add liquidity in this ratio
                  </div>
                </div>
              )}
              
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
                    {poolInfo ? 'Adding Liquidity...' : 'Creating Pool...'}
                  </>
                ) : (
                  poolInfo ? 'Add Liquidity' : 'Create Pool'
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
                      {/* Expected Output */}
                      <div className="bg-white/5 rounded-xl p-4 space-y-2">
                        <h4 className="text-sm text-gray-400 mb-3">You will receive (entire LP token will be removed)</h4>
                        {(() => {
                          const lpToken = lpTokens.find(t => t.id === selectedLPToken);
                          if (!lpToken || !poolInfo || poolInfo.lpSupply === BigInt(0)) return null;
                          
                          const lpAmount = BigInt(lpToken.amount);
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
                    disabled={!selectedLPToken || isRemoving}
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