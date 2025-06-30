'use client'

import { useState, useEffect } from 'react'
import { useCurrentAccount } from '@iota/dapp-kit'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Search, Copy, ExternalLink, Wallet, Droplets, FileText } from 'lucide-react'
import { useAllBalances } from '@/hooks/use-wallet-balance'
import { useTokenPrices } from '@/hooks/use-token-price'
import { formatBalance, formatTokenAmount, formatNumber } from '@/lib/utils/format'
import Image from 'next/image'
import { toast } from 'sonner'
import { getMultipleCoinMetadata } from '@/lib/services/coin-metadata'
import { CoinIcon } from '@/components/coin-icon'

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
  
  // Get symbols for price fetching
  const symbols = enrichedBalances.map(b => b.symbol)
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
          const meta = metadata.find(m => m.id === balance.coinType)
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
  
  // Update balances with prices
  const balancesWithPrices = enrichedBalances.map(balance => {
    const price = prices[balance.symbol]
    const usdValue = price ? parseFloat(balance.balance) * price.price : undefined
    return {
      ...balance,
      priceUsd: price?.price,
      priceChange24h: price?.change24h,
      usdValue,
    }
  })
  
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

  const portfolioStats = {
    walletHoldings: balancesWithPrices.reduce((sum, b) => sum + (b.usdValue || 0), 0),
    liquidity: 0,
    orders: 0,
    xCETUS: 0
  }

  const filteredBalances = balancesWithPrices.filter(balance => {
    const matchesSearch = balance.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         balance.name?.toLowerCase().includes(searchTerm.toLowerCase())
    const isKnown = balance.priceUsd !== undefined
    const isLowValue = (balance.usdValue || 0) < 1

    if (!showUnknownCoins && !isKnown) return false
    if (hideLowAssets && isLowValue) return false
    return matchesSearch
  })
  
  // Sort by USD value (highest first)
  const sortedBalances = filteredBalances.sort((a, b) => {
    const valueA = a.usdValue || 0
    const valueB = b.usdValue || 0
    return valueB - valueA
  })

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
                <span className="text-sm text-gray-400">xBLITZ</span>
              </div>
              <p className="text-2xl font-bold text-white mono">${formatNumber(portfolioStats.xCETUS, 2)}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Wallet Holdings Section */}
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
                  Show Unknown Coins <span className="mono">({balancesWithPrices.filter(b => !b.priceUsd).length || 0})</span>
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
                          <p className="font-medium text-white mono">${formatNumber(balance.priceUsd, 6)}</p>
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
    </div>
    </div>
  )
}