"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Copy, TrendingUp, Settings, Maximize, ArrowLeft, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

const coinData = {
  name: "mondeemonster",
  ticker: "MM",
  creator: "0x2145...MM",
  createdBy: "0x6fee...efc5",
  marketCap: "$4.27K",
  change: "0%",
  image: "/placeholder.svg?height=100&width=100",
  description:
    "Lost relic of the olden days. Once revered for his vast knowledge and pure heart but because of a betral has turned him to a demon",
  age: "11 hours ago",
  priceUSD: "$0.04222",
  priceSUI: "0.01250",
  volume24h: "US$0.68",
  liquidity: "US$9,007.21",
  bondingCurveProgress: 0.0,
  availableTokens: "799,999,287.2",
  bondingCurveTokens: "0.000891",
}

export default function CoinDetailPage() {
  const [buyAmount, setBuyAmount] = useState("0.00")
  const [sellAmount, setSellAmount] = useState("0")
  const [activeTab, setActiveTab] = useState("buy")

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="text-white font-bold text-2xl tracking-tight">BLITZZ</h1>
            </Link>

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

      <main className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="text-white/60 hover:text-white hover:bg-white/10">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tokens
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Coin Info & Chart */}
          <div className="lg:col-span-2 space-y-8">
            {/* Coin Header */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <Image
                      src={coinData.image || "/placeholder.svg"}
                      alt={coinData.name}
                      width={80}
                      height={80}
                      className="rounded-2xl border border-white/20"
                    />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h1 className="text-white font-bold text-4xl leading-none tracking-tighter">
                      {coinData.name} - {coinData.ticker}
                    </h1>
                    <p className="text-white/60 font-mono text-lg mt-1">{coinData.creator}</p>
                  </div>
                  <div className="flex gap-3">
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 p-3">
                      <ExternalLink className="w-5 h-5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 p-3">
                      <Copy className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <p className="text-white/60 text-sm mb-1">Age</p>
                    <p className="text-white font-semibold text-lg">{coinData.age}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/60 text-sm mb-1">Price USD</p>
                    <p className="text-white font-semibold text-lg">{coinData.priceUSD}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-white/60 text-sm mb-1">Price SUI</p>
                    <p className="text-white font-semibold text-lg">{coinData.priceSUI}</p>
                  </div>
                  <div></div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/60 text-sm mb-2">Market Cap</p>
                    <p className="text-white font-bold text-xl">{coinData.marketCap}</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/60 text-sm mb-2">24h Volume</p>
                    <p className="text-white font-bold text-xl">{coinData.volume24h}</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/60 text-sm mb-2">Liquidity</p>
                    <p className="text-white font-bold text-xl">{coinData.liquidity}</p>
                  </div>
                </div>

                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-white/80 leading-relaxed">{coinData.description}</p>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-white/60">Created by</span>
                    <span className="text-blue-400 font-mono">{coinData.createdBy}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white/60">Market Cap</span>
                    <span className="text-white font-semibold">{coinData.marketCap}</span>
                    <span className="text-white/60">({coinData.change})</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Chart Section */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                {/* Chart Controls */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-white font-medium">MM/SUI · 1 · Launchpad</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 p-2">
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="h-96 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center mb-8">
                  <div className="text-center">
                    <Activity className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 text-lg">Trading Chart</p>
                    <p className="text-white/40 text-sm">Real-time price data will be displayed here</p>
                  </div>
                </div>

                {/* Time Controls */}
                <div className="flex items-center justify-center gap-2">
                  {["1m", "5m", "15m", "1h", "4h", "1d", "1w"].map((period) => (
                    <Button
                      key={period}
                      size="sm"
                      variant="ghost"
                      className="text-white/60 hover:text-white hover:bg-white/10 px-4 py-2"
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trading */}
          <div className="space-y-8">
            {/* Trading Card */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
                  <TabsList className="grid w-full grid-cols-2 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1">
                    <TabsTrigger
                      value="buy"
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70 rounded-lg font-medium"
                    >
                      Buy
                    </TabsTrigger>
                    <TabsTrigger
                      value="sell"
                      className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-white/70 rounded-lg font-medium"
                    >
                      Sell
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/60">Amount</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm">Balance: 0.4238</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        value={activeTab === "buy" ? buyAmount : sellAmount}
                        onChange={(e) =>
                          activeTab === "buy" ? setBuyAmount(e.target.value) : setSellAmount(e.target.value)
                        }
                        className="bg-white/5 backdrop-blur-sm border-white/10 text-white text-center text-2xl font-bold h-16 rounded-xl focus:border-blue-500/50"
                        placeholder="0.00"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">SUI</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 bg-white/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-white/60" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white/60">You receive</span>
                      <span className="text-white/60 text-sm">Balance: 0</span>
                    </div>
                    <div className="relative">
                      <Input
                        value="0"
                        readOnly
                        className="bg-white/5 backdrop-blur-sm border-white/10 text-white text-center text-2xl font-bold h-16 rounded-xl"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">MM</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    className={`w-full py-4 text-lg font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] ${
                      activeTab === "buy"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                    }`}
                  >
                    {activeTab === "buy" ? "Buy Token" : "Sell Token"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bonding Curve Progress */}
            <Card className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                <h3 className="text-white font-semibold text-2xl mb-8 tracking-tight">Bonding Curve Progress</h3>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/60">Progress</span>
                  <span className="text-blue-400 font-bold text-lg">{coinData.bondingCurveProgress}%</span>
                </div>

                <Progress value={coinData.bondingCurveProgress} className="mb-8 h-3" />

                <div className="space-y-4 text-sm leading-relaxed">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/80">
                      <span className="text-blue-400 font-semibold">{coinData.availableTokens}</span>{" "}
                      <span className="text-white font-medium">$MM</span> tokens available for sale
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-white/80">
                      <span className="text-blue-400 font-semibold">{coinData.bondingCurveTokens}</span>{" "}
                      <span className="text-white font-medium">$SUI</span> in bonding curve
                    </p>
                  </div>

                  <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/20">
                    <p className="text-white/80">
                      When market cap reaches <span className="text-blue-400 font-semibold">4,000 $SUI</span>, liquidity
                      will be deposited to DEX and burned.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
