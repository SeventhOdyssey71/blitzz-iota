"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, Filter, ExternalLink, Copy, Plus, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIotaClient } from "@iota/dapp-kit"
import { 
  fetchLaunchpadTokens, 
  fetchFeaturedToken, 
  filterTokensByCategory, 
  searchTokens,
  LaunchpadToken 
} from "@/lib/contracts/fetch-launchpad-tokens"


export default function LaunchpadPage() {
  const client = useIotaClient()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("trust-me-bro")
  const [allTokens, setAllTokens] = useState<LaunchpadToken[]>([])
  const [featuredToken, setFeaturedToken] = useState<LaunchpadToken | null>(null)
  const [displayedTokens, setDisplayedTokens] = useState<LaunchpadToken[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Fetch tokens on mount
  useEffect(() => {
    const loadTokens = async () => {
      setIsLoading(true)
      try {
        const [tokens, featured] = await Promise.all([
          fetchLaunchpadTokens(client),
          fetchFeaturedToken(client)
        ])
        setAllTokens(tokens)
        setFeaturedToken(featured)
        setDisplayedTokens(filterTokensByCategory(tokens, activeFilter))
      } catch (error) {
        console.error('Error loading tokens:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadTokens()
    
    // Refresh every 30 seconds
    const interval = setInterval(loadTokens, 30000)
    return () => clearInterval(interval)
  }, [client, activeFilter])
  
  // Filter tokens when search or filter changes
  useEffect(() => {
    let filtered = filterTokensByCategory(allTokens, activeFilter)
    if (searchQuery) {
      filtered = searchTokens(filtered, searchQuery)
    }
    setDisplayedTokens(filtered)
  }, [allTokens, activeFilter, searchQuery])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-20 mb-32">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-7xl font-bold text-white leading-none tracking-tighter">
                Launch Your
                <br />
                <span className="text-cyan-400">Meme Coin</span>
              </h1>
              <p className="text-xl text-gray-400 leading-relaxed max-w-xl font-light">
                Create, trade, and discover the next generation of meme coins on IOTA's professional launchpad platform.
              </p>
            </div>
            <Link href="/launchpad/create">
              <Button
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-600 text-black px-8 py-4 text-lg rounded-xl font-medium transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Token
              </Button>
            </Link>
          </div>

          {/* Featured Coin Card */}
          {featuredToken ? (
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-500/20 rounded-3xl blur-3xl"></div>
              <Card className="relative glass-dark border border-white/10 rounded-3xl overflow-hidden">
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-cyan-500/90 backdrop-blur-sm text-black px-4 py-1 rounded-full border border-cyan-400/30">
                    Featured
                  </Badge>
                </div>

                <CardContent className="p-8 pt-16">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative">
                      <Image
                        src={featuredToken.image || "/placeholder.svg"}
                        alt={featuredToken.name}
                        width={80}
                        height={80}
                        className="rounded-2xl border border-border/50"
                      />
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-background rounded-full"></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-xl">{featuredToken.name}</h3>
                      <p className="text-gray-400 font-mono text-sm">{featuredToken.creator}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-gray-400 text-sm">Market Cap</span>
                        <span className="text-white font-semibold font-mono tabular-nums">{featuredToken.marketCap}</span>
                        <span className={`text-sm font-mono tabular-nums ${featuredToken.change.includes('-') ? 'text-red-400' : 'text-green-400'}`}>
                          {featuredToken.change.includes('-') ? '' : '+'}{featuredToken.change}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 p-2">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 p-2">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Link href={`/launchpad/coin/${featuredToken.ticker.toLowerCase()}`}>
                    <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-black rounded-xl py-3 font-medium transition-all duration-200">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-6 mb-16">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-white font-medium">Filters</span>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                placeholder="Search tokens, contracts, wallets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-black/50 backdrop-blur-sm border-white/10 text-white placeholder-gray-500 rounded-xl h-12 focus:border-cyan-500/50"
              />
            </div>
          </div>

          <Tabs value={activeFilter} onValueChange={setActiveFilter} className="flex-1">
            <TabsList className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl p-1">
              <TabsTrigger
                value="trust-me-bro"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 text-gray-400 rounded-lg"
              >
                Trust Me Bro
              </TabsTrigger>
              <TabsTrigger
                value="bonding-curve"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 text-gray-400 rounded-lg"
              >
                Bonding Curve
              </TabsTrigger>
              <TabsTrigger
                value="listed-dex"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 text-gray-400 rounded-lg"
              >
                Listed on DEX
              </TabsTrigger>
              <TabsTrigger
                value="nsfw"
                className="data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 text-gray-400 rounded-lg"
              >
                NSFW
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Coins Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
          </div>
        ) : displayedTokens.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No tokens found matching your criteria</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedTokens.map((coin) => (
            <Link key={coin.id} href={`/launchpad/coin/${coin.ticker.toLowerCase()}`}>
              <Card
                className={`glass-dark border hover:border-cyan-500/50 transition-all duration-300 hover:scale-[1.02] rounded-2xl ${
                  coin.hasGoldenBorder ? "border-cyan-500/50" : "border-white/10"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <Image
                        src={coin.image || "/placeholder.svg"}
                        alt={coin.name}
                        width={60}
                        height={60}
                        className="rounded-xl border border-border/50"
                      />
                      {coin.isTrustMeBro && (
                        <Badge className="absolute -top-2 -right-2 bg-cyan-500 text-black text-xs px-2 py-1 rounded-lg border border-cyan-400/30">
                          Trusted
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">
                        {coin.name} - {coin.ticker}
                      </h3>
                      <p className="text-gray-400 text-sm font-mono">{coin.creator}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-white/10 p-2"
                        onClick={(e) => e.preventDefault()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-white/10 p-2"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-gray-400">Market Cap</span>
                    <div className="text-right">
                      <div className="text-white font-semibold font-mono tabular-nums">{coin.marketCap}</div>
                      <div className={`text-sm font-mono tabular-nums ${coin.change.includes("-") ? "text-red-400" : "text-green-400"}`}>
                        {coin.change.includes("-") ? "" : "+"}
                        {coin.change}
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">{coin.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
          </div>
        )}
      </div>
    </div>
  )
}