'use client'

import { useState, useEffect, useMemo } from 'react'
import { useCurrentAccount } from '@iota/dapp-kit'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Copy, ExternalLink, Wallet, Droplets, FileText, TrendingUp, BarChart3, Plus } from 'lucide-react'
import { useAllBalances } from '@/hooks/use-wallet-balance'
import { useTokenPrices } from '@/hooks/use-token-price'
import { formatBalance, formatTokenAmount, formatNumber } from '@/lib/utils/format'
import Image from 'next/image'
import { toast } from 'sonner'
import { getMultipleCoinMetadata } from '@/lib/services/coin-metadata'
import { CoinIcon } from '@/components/coin-icon'
import { useLPTokens } from '@/hooks/use-lp-tokens'
import { usePoolInfo } from '@/hooks/use-pool-info'
import { SUPPORTED_COINS } from '@/config/iota.config'
import Link from 'next/link'

interface EnrichedBalance {
  coinType: string
  balance: string
  totalBalance: string
  symbol: string
  name?: string
  decimals: number
  iconUrl?: string
  priceUsd?: number
  priceChange24h?: number
  usdValue?: number
}

export default function ProfilePage() {
  const account = useCurrentAccount()
  const { balances: rawBalances, isLoading: isLoadingBalances } = useAllBalances()
  const [enrichedBalances, setEnrichedBalances] = useState<EnrichedBalance[]>([])
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUnknownCoins, setShowUnknownCoins] = useState(true)
  const [hideLowAssets, setHideLowAssets] = useState(false)
  
  // Get symbols for price fetching - memoized to prevent unnecessary re-renders
  const symbols = useMemo(() => enrichedBalances.map(b => b.symbol), [enrichedBalances])
  const { prices, isLoading: isLoadingPrices } = useTokenPrices(symbols)
  
  // Fetch metadata and enrich balances
  useEffect(() => {
    async function enrichBalances() {
      if (!rawBalances || rawBalances.length === 0) {
        setEnrichedBalances([])
        return
      }
      
      setIsLoadingMetadata(true)
      try {
        const coinTypes = rawBalances.map(b => b.coinType)
        const metadata = await getMultipleCoinMetadata(coinTypes)
        
        const enriched = rawBalances.map(balance => {
          const meta = metadata[balance.coinType]
          return {
            ...balance,
            symbol: meta?.symbol || balance.coinType.split('::').pop() || 'UNKNOWN',
            name: meta?.name,
            decimals: meta?.decimals || 9,
            iconUrl: meta?.iconUrl,
            balance: formatBalance(balance.totalBalance, meta?.decimals || 9),
          }
        })
        
        setEnrichedBalances(enriched)
      } catch (error) {
        console.error('Failed to enrich balances:', error)
        // Fallback to basic info
        const fallback = rawBalances.map(balance => ({
          ...balance,
          symbol: balance.coinType.split('::').pop() || 'UNKNOWN',
          decimals: 9,
          balance: formatBalance(balance.totalBalance, 9),
        }))
        setEnrichedBalances(fallback)
      } finally {
        setIsLoadingMetadata(false)
      }
    }
    
    enrichBalances()
  }, [rawBalances])
  
  // Update balances with prices - memoized to prevent infinite re-renders
  const balancesWithPrices = useMemo(() => {
    return enrichedBalances.map(balance => {
      const price = prices[balance.symbol]
      const usdValue = price ? parseFloat(balance.balance) * price.price : undefined
      return {
        ...balance,
        priceUsd: price?.price,
        priceChange24h: price?.change24h,
        usdValue,
      }
    })
  }, [enrichedBalances, prices])
  
  const isLoading = isLoadingBalances || isLoadingMetadata || isLoadingPrices

  const copyAddress = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address)
      toast.success('Address copied to clipboard')
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Get LP tokens and pool info
  const { lpTokens, isLoading: isLoadingLP } = useLPTokens()
  const { poolInfo, isLoading: isLoadingPool } = usePoolInfo(
    SUPPORTED_COINS.IOTA.type,
    SUPPORTED_COINS.stIOTA.type
  )
  
  // Calculate liquidity value - memoized
  const liquidityValue = useMemo(() => {
    return lpTokens.length > 0 && poolInfo && poolInfo.lpSupply > 0
      ? lpTokens.reduce((total, token) => {
          const share = BigInt(token.amount) * BigInt(10000) / poolInfo.lpSupply
          const iotaAmount = (poolInfo.reserveA * share) / BigInt(10000)
          const stIotaAmount = (poolInfo.reserveB * share) / BigInt(10000)
          const valueInUsd = (Number(iotaAmount + stIotaAmount) / 1e9) * 0.28 // Assuming $0.28 per IOTA
          return total + valueInUsd
        }, 0)
      : 0
  }, [lpTokens, poolInfo])

  const portfolioStats = useMemo(() => ({
    walletHoldings: balancesWithPrices.reduce((sum, b) => sum + (b.usdValue || 0), 0),
    liquidity: liquidityValue,
    orders: 0,
    dca: 0
  }), [balancesWithPrices, liquidityValue])

  const filteredBalances = useMemo(() => {
    return balancesWithPrices.filter(balance => {
      const matchesSearch = balance.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           balance.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const isKnown = balance.priceUsd !== undefined
      const isLowValue = (balance.usdValue || 0) < 1

      if (!showUnknownCoins && !isKnown) return false
      if (hideLowAssets && isLowValue) return false
      return matchesSearch
    })
  }, [balancesWithPrices, searchTerm, showUnknownCoins, hideLowAssets])
  
  // Sort by USD value (highest first) - memoized
  const sortedBalances = useMemo(() => {
    return [...filteredBalances].sort((a, b) => {
      const valueA = a.usdValue || 0
      const valueB = b.usdValue || 0
      return valueB - valueA
    })
  }, [filteredBalances])
  
  // Count of unknown coins - memoized
  const unknownCoinsCount = useMemo(() => {
    return balancesWithPrices.filter(b => !b.priceUsd).length
  }, [balancesWithPrices])

  if (!account) {
    return (
      <div className="min-h-screen bg-black grid-pattern flex items-center justify-center">
        <div className="container mx-auto p-6 relative z-10">
          <Card className="p-8 text-center glass-dark border-white/10">
            <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-semibold mb-2 text-white">Connect Your Wallet</h2>
            <p className="text-gray-400">Please connect your wallet to view your profile</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black grid-pattern">
      <div className="container mx-auto p-6 max-w-7xl relative z-10">
      {/* Profile Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-cyan-500/25">
            {account.address.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-white">{formatAddress(account.address)}</h1>
              <Button variant="ghost" size="icon" onClick={copyAddress} className="text-gray-400 hover:text-cyan-400">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" asChild className="text-gray-400 hover:text-cyan-400">
                <a href={`https://explorer.iota.org/mainnet/address/${account.address}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <p className="text-gray-400">IOTA Mainnet</p>
          </div>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 glass-dark border-white/10 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/10 opacity-50"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/20 rounded-lg backdrop-blur-sm">
                  <Wallet className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm text-gray-400">Wallet Holdings</span>
              </div>
              <p className="text-2xl font-bold text-white mono">${formatNumber(portfolioStats.walletHoldings, 2)}</p>
            </div>
          </Card>

          <Card className="p-6 glass-dark border-white/10 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 opacity-50"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-cyan-500/20 rounded-lg backdrop-blur-sm">
                  <Droplets className="w-5 h-5 text-cyan-400" />
                </div>
                <span className="text-sm text-gray-400">Liquidity</span>
              </div>
              <p className="text-2xl font-bold text-white mono">${formatNumber(portfolioStats.liquidity, 2)}</p>
            </div>
          </Card>

          <Card className="p-6 glass-dark border-white/10 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/10 opacity-50"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg backdrop-blur-sm">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm text-gray-400">Orders</span>
              </div>
              <p className="text-2xl font-bold text-white mono">${formatNumber(portfolioStats.orders, 2)}</p>
            </div>
          </Card>

          <Card className="p-6 glass-dark border-white/10 relative overflow-hidden group hover:border-cyan-500/30 transition-all">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/10 opacity-50"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg backdrop-blur-sm">
                  <CoinIcon 
                    symbol="IOTA"
                    size={20}
                  />
                </div>
                <span className="text-sm text-gray-400">DCA</span>
              </div>
              <p className="text-2xl font-bold text-white mono">${formatNumber(portfolioStats.dca, 2)}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="wallet" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-black/40 border border-white/10">
          <TabsTrigger value="wallet" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Wallet Holdings
          </TabsTrigger>
          <TabsTrigger value="liquidity" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Liquidity Positions
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            Limit Orders
          </TabsTrigger>
          <TabsTrigger value="dca" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
            DCA Strategies
          </TabsTrigger>
        </TabsList>
        
        {/* Wallet Holdings Tab */}
        <TabsContent value="wallet">
          <Card className="p-6 glass-dark border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <h2 className="text-xl font-semibold text-white">Wallet Holdings</h2>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full md:w-64 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-cyan-500/50"
              />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  checked={showUnknownCoins}
                  onCheckedChange={setShowUnknownCoins}
                  id="show-unknown"
                />
                <label htmlFor="show-unknown" className="text-sm cursor-pointer text-gray-300">
                  Show Unknown Coins <span className="mono">({unknownCoinsCount})</span>
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={hideLowAssets}
                  onCheckedChange={setHideLowAssets}
                  id="hide-low"
                />
                <label htmlFor="hide-low" className="text-sm cursor-pointer text-gray-300">
                  Hide Low Assets
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Token Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                  Token <span className="bg-white/10 px-2 py-0.5 rounded-full text-xs ml-2 text-cyan-400 mono">{sortedBalances.length}</span>
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Balance</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Value</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    Loading balances...
                  </td>
                </tr>
              ) : sortedBalances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No tokens found
                  </td>
                </tr>
              ) : (
                sortedBalances.map((balance) => (
                  <tr key={balance.coinType} className="border-b border-white/5 hover:bg-white/5 transition-all">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <CoinIcon 
                          symbol={balance.symbol}
                          iconUrl={balance.iconUrl}
                          size={32}
                        />
                        <div>
                          <p className="font-medium text-white">{balance.symbol}</p>
                          <p className="text-xs text-gray-400">{balance.name || 'Unknown Token'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <p className="font-medium text-white mono">{balance.balance} {balance.symbol}</p>
                    </td>
                    <td className="text-right py-4 px-4">
                      {balance.priceUsd ? (
                        <div>
                          <p className="font-medium text-white mono">${formatNumber(balance.priceUsd, 4)}</p>
                          {balance.priceChange24h !== undefined && (
                            <p className={`text-xs mono ${balance.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {balance.priceChange24h >= 0 ? '+' : ''}{balance.priceChange24h.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">-</p>
                      )}
                    </td>
                    <td className="text-right py-4 px-4">
                      <p className="font-medium text-white mono">
                        {balance.usdValue ? `$${formatNumber(balance.usdValue, 2)}` : '-'}
                      </p>
                    </td>
                    <td className="text-center py-4 px-4">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50 hover:border-cyan-500 transition-all"
                        asChild
                      >
                        <a href={`/?from=${balance.symbol}`}>Swap</a>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </TabsContent>
        
        {/* Liquidity Positions Tab */}
        <TabsContent value="liquidity">
          <Card className="p-6 glass-dark border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Your Liquidity Positions</h2>
              <Button
                asChild
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
              >
                <Link href="/pools">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Liquidity
                </Link>
              </Button>
            </div>
            
            {isLoadingLP ? (
              <div className="text-center py-8 text-gray-400">
                Loading liquidity positions...
              </div>
            ) : lpTokens.length === 0 ? (
              <div className="text-center py-12">
                <Droplets className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400 mb-4">No liquidity positions found</p>
                <Button
                  asChild
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Link href="/pools">Add Your First Position</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {lpTokens.map((token) => {
                  const share = poolInfo && poolInfo.lpSupply > 0
                    ? (BigInt(token.amount) * BigInt(10000) / poolInfo.lpSupply)
                    : BigInt(0)
                  const iotaAmount = poolInfo
                    ? (poolInfo.reserveA * share) / BigInt(10000)
                    : BigInt(0)
                  const stIotaAmount = poolInfo
                    ? (poolInfo.reserveB * share) / BigInt(10000)
                    : BigInt(0)
                  const valueInUsd = (Number(iotaAmount + stIotaAmount) / 1e9) * 0.28
                  const poolShare = Number(share) / 100
                  
                  return (
                    <div key={token.id} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-cyan-500/30 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            <CoinIcon symbol="IOTA" size={32} />
                            <CoinIcon symbol="stIOTA" size={32} />
                          </div>
                          <div>
                            <h3 className="text-white font-medium">IOTA/stIOTA Pool</h3>
                            <p className="text-sm text-gray-400">Pool Share: <span className="text-cyan-400">{poolShare.toFixed(2)}%</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white mono">${valueInUsd.toFixed(2)}</p>
                          <p className="text-sm text-gray-400">Total Value</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-400">LP Tokens</p>
                          <p className="font-medium text-white mono">{formatBalance(token.amount, 9, 4)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">IOTA</p>
                          <p className="font-medium text-white mono">{formatBalance(iotaAmount.toString(), 9, 4)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">stIOTA</p>
                          <p className="font-medium text-white mono">{formatBalance(stIotaAmount.toString(), 9, 4)}</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="flex-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                        >
                          <Link href="/pools">Manage</Link>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Link href="/pools?tab=remove">Remove</Link>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </TabsContent>
        
        {/* Limit Orders Tab */}
        <TabsContent value="orders">
          <Card className="p-6 glass-dark border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Your Limit Orders</h2>
              <Button
                asChild
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
              >
                <Link href="/limit">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Order
                </Link>
              </Button>
            </div>
            
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400 mb-4">No active limit orders</p>
              <Button
                asChild
                variant="outline"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Link href="/limit">Create Your First Order</Link>
              </Button>
            </div>
          </Card>
        </TabsContent>
        
        {/* DCA Strategies Tab */}
        <TabsContent value="dca">
          <Card className="p-6 glass-dark border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-white">Your DCA Strategies</h2>
              <Button
                asChild
                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
              >
                <Link href="/dca">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Strategy
                </Link>
              </Button>
            </div>
            
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400 mb-4">No active DCA strategies</p>
              <Button
                asChild
                variant="outline"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Link href="/dca">Create Your First Strategy</Link>
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </div>
  )
}