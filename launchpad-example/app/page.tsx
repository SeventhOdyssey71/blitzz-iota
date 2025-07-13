"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search, Filter, ExternalLink, Copy, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const featuredCoin = {
  name: "any account create",
  ticker: "AAC",
  creator: "0xc2af...AAC",
  marketCap: "$4,236.92",
  change: "0.08%",
  image: "/placeholder.svg?height=100&width=100",
  description: "Trust them, bro!",
  isFeatured: true,
}

const coins = [
  {
    id: 1,
    name: "mondeemonster",
    ticker: "MM",
    creator: "0x2145...MM",
    marketCap: "$4.27K",
    change: "0%",
    image: "/placeholder.svg?height=80&width=80",
    description:
      "Lost relic of the olden days. Once revered for his vast knowledge and pure heart but because of a betral has turned him to a demon",
    hasGoldenBorder: true,
  },
  {
    id: 2,
    name: "any account create",
    ticker: "AAC",
    creator: "0xc2af...AAC",
    marketCap: "$4.24K",
    change: "0.08%",
    image: "/placeholder.svg?height=80&width=80",
    description:
      "AAC coin is a cryptocurrency designed to reward individuals who take action and achieve real-world results.",
    isTrustMeBro: true,
  },
  {
    id: 3,
    name: "MacEveryThing",
    ticker: "Mac",
    creator: "0x349b...MAC",
    marketCap: "$3.80K",
    change: "2.11%",
    image: "/placeholder.svg?height=80&width=80",
    description: "We can say this MacBook, MacCheese, or else whatever you want",
  },
  {
    id: 4,
    name: "$YAN",
    ticker: "YAN",
    creator: "0xb2ff...YAN",
    marketCap: "$3.63K",
    change: "0%",
    image: "/placeholder.svg?height=80&width=80",
    description: "The cutest meme coin ever created",
  },
  {
    id: 5,
    name: "pikachu",
    ticker: "PKA",
    creator: "0x5189...3008",
    marketCap: "$3.67K",
    change: "0.03%",
    image: "/placeholder.svg?height=80&width=80",
    description: "Gotta catch 'em all!",
  },
  {
    id: 6,
    name: "cherecao",
    ticker: "Chc",
    creator: "0x6b9...ea90",
    marketCap: "$3.57K",
    change: "0.1%",
    image: "/placeholder.svg?height=80&width=80",
    description: "The green frog that conquered the internet",
  },
]

const notifications = [
  { user: "0x5dcf", action: "bought 0.3 SUI of", coin: "AAC" },
  { user: "0x6fea", action: "created MM on", date: "Jul 12" },
]

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("Creation Time")

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-white font-bold text-2xl tracking-tight"></h1>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              <div className="flex items-center gap-1 text-white/70 hover:text-white cursor-pointer">
                <span>Trade</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="flex items-center gap-1 text-white/70 hover:text-white cursor-pointer">
                <span>Earn</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <Link href="/" className="text-blue-400 font-medium">
                Launchpad
              </Link>
              <div className="flex items-center gap-1 text-white/70 hover:text-white cursor-pointer">
                <span>Bridge</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div className="flex items-center gap-1 text-white/70 hover:text-white cursor-pointer">
                <span>More</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </Button>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </Button>
              <div className="px-3 py-1 bg-white/5 rounded-lg text-white/80 text-sm font-mono">0xbcff...1246</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="grid lg:grid-cols-2 gap-20 mb-32">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-7xl font-bold text-white leading-none tracking-tighter">
                Launch Your
                <br />
                <span className="text-blue-500">Meme Coin</span>
              </h1>
              <p className="text-xl text-white/80 leading-relaxed max-w-xl font-light">
                Create, trade, and discover the next generation of meme coins on our professional launchpad platform.
              </p>
            </div>
            <Link href="/create">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-xl font-medium transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Token
              </Button>
            </Link>
          </div>

          {/* Featured Coin Card */}
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-3xl blur-3xl"></div>
            <Card className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600/90 backdrop-blur-sm text-white px-4 py-1 rounded-full border border-blue-400/30">
                  Featured
                </Badge>
              </div>

              <CardContent className="p-8 pt-16">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <Image
                      src={featuredCoin.image || "/placeholder.svg"}
                      alt={featuredCoin.name}
                      width={80}
                      height={80}
                      className="rounded-2xl border border-white/20"
                    />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-xl">{featuredCoin.name}</h3>
                    <p className="text-white/60 font-mono text-sm">{featuredCoin.creator}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-white/60 text-sm">Market Cap</span>
                      <span className="text-white font-semibold">{featuredCoin.marketCap}</span>
                      <span className="text-blue-400 text-sm">+{featuredCoin.change}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Link href={`/coin/${featuredCoin.ticker.toLowerCase()}`}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium transition-all duration-200">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-6 mb-16">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-white/60" />
            <span className="text-white font-medium">Filters</span>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                placeholder="Search tokens, contracts, wallets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 bg-white/5 backdrop-blur-sm border-white/10 text-white placeholder-white/40 rounded-xl h-12 focus:border-blue-500/50"
              />
            </div>
          </div>

          <Tabs defaultValue="trust-me-bro" className="flex-1">
            <TabsList className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1">
              <TabsTrigger
                value="trust-me-bro"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70 rounded-lg"
              >
                Trust Me Bro
              </TabsTrigger>
              <TabsTrigger
                value="bonding-curve"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70 rounded-lg"
              >
                Bonding Curve
              </TabsTrigger>
              <TabsTrigger
                value="listed-dex"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70 rounded-lg"
              >
                Listed on DEX
              </TabsTrigger>
              <TabsTrigger
                value="nsfw"
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70 rounded-lg"
              >
                NSFW
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Coins Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coins.map((coin) => (
            <Link key={coin.id} href={`/coin/${coin.ticker.toLowerCase()}`}>
              <Card
                className={`bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] rounded-2xl ${
                  coin.hasGoldenBorder ? "border-blue-500/50" : ""
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
                        className="rounded-xl border border-white/20"
                      />
                      {coin.isTrustMeBro && (
                        <Badge className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-lg border border-blue-400/30">
                          Trusted
                        </Badge>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">
                        {coin.name} - {coin.ticker}
                      </h3>
                      <p className="text-white/60 text-sm font-mono">{coin.creator}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/60 hover:text-white hover:bg-white/10 p-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-white/60 hover:text-white hover:bg-white/10 p-2"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-white/60">Market Cap</span>
                    <div className="text-right">
                      <div className="text-white font-semibold">{coin.marketCap}</div>
                      <div className={`text-sm ${coin.change.includes("-") ? "text-white/60" : "text-blue-400"}`}>
                        {coin.change.includes("-") ? "" : "+"}
                        {coin.change}
                      </div>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm line-clamp-3 leading-relaxed">{coin.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
