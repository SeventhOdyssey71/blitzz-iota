"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ExternalLink, Copy, TrendingUp, Settings, Maximize, ArrowLeft, Activity, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useMemeTokenFactory } from "@/hooks/use-meme-token-factory"
import { useCurrentAccount } from "@iota/dapp-kit"
import { useWalletBalance } from "@/hooks/use-wallet-balance"
import { toast } from "sonner"
import { TokenInfo, BondingCurveInfo, BONDING_CURVE_TARGET } from "@/lib/contracts/meme-token-factory"
import { MEME_FACTORY_PACKAGE_ID } from "@/config/iota.config"
import { MemeTokenService } from "@/lib/services/meme-token-service"

// This would come from URL params or search
const MOCK_BONDING_CURVE_ID = process.env.NEXT_PUBLIC_SAMPLE_BONDING_CURVE_ID || ""

export default function CoinDetailPage({ params }: { params: { ticker: string } }) {
  const currentAccount = useCurrentAccount()
  const { 
    buyTokens, 
    sellTokens, 
    getBondingCurveInfo, 
    calculateTokensOut, 
    calculateIotaOut,
    formatTokenAmount,
    parseTokenAmount,
    isLoading 
  } = useMemeTokenFactory()
  
  const [buyAmount, setBuyAmount] = useState("")
  const [sellAmount, setSellAmount] = useState("")
  const [activeTab, setActiveTab] = useState("buy")
  const [bondingCurveInfo, setBondingCurveInfo] = useState<BondingCurveInfo | null>(null)
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [estimatedOutput, setEstimatedOutput] = useState("0")
  const [iotaPrice, setIotaPrice] = useState(0.2847) // Default price
  
  // Get user balances
  const { balance: iotaBalance } = useWalletBalance("0x2::iota::IOTA")
  const { balance: tokenBalance } = useWalletBalance(`${MEME_FACTORY_PACKAGE_ID.testnet}::${params.ticker}::${params.ticker.toUpperCase()}`)
  
  // Fetch token info
  useEffect(() => {
    const fetchInfo = async () => {
      const service = MemeTokenService.getInstance()
      const tokens = await service.getTokens()
      const token = tokens.find(t => t.symbol.toLowerCase() === params.ticker.toLowerCase())
      if (token) {
        setTokenInfo(token)
        if (token.bondingCurveId && !service.isInMockMode()) {
          const info = await getBondingCurveInfo(token.bondingCurveId)
          setBondingCurveInfo(info)
        }
      }
    }
    fetchInfo()
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchInfo, 10000)
    return () => clearInterval(interval)
  }, [getBondingCurveInfo])
  
  // Fetch IOTA price
  useEffect(() => {
    fetch('/api/prices?symbols=IOTA')
      .then(res => res.json())
      .then(data => {
        if (data.IOTA?.price) {
          setIotaPrice(data.IOTA.price)
        }
      })
  }, [])
  
  // Calculate estimated output when input changes
  useEffect(() => {
    if (!bondingCurveInfo) return
    
    if (activeTab === 'buy' && buyAmount) {
      try {
        const iotaAmount = parseTokenAmount(buyAmount)
        const tokensOut = calculateTokensOut(
          iotaAmount,
          BigInt(bondingCurveInfo.iotaReserve),
          BigInt(bondingCurveInfo.totalSupply) - BigInt(bondingCurveInfo.tokensSold)
        )
        setEstimatedOutput(formatTokenAmount(tokensOut))
      } catch {
        setEstimatedOutput("0")
      }
    } else if (activeTab === 'sell' && sellAmount) {
      try {
        const tokenAmount = parseTokenAmount(sellAmount)
        const iotaOut = calculateIotaOut(
          tokenAmount,
          BigInt(bondingCurveInfo.iotaReserve),
          BigInt(bondingCurveInfo.totalSupply) - BigInt(bondingCurveInfo.tokensSold)
        )
        setEstimatedOutput(formatTokenAmount(iotaOut))
      } catch {
        setEstimatedOutput("0")
      }
    } else {
      setEstimatedOutput("0")
    }
  }, [activeTab, buyAmount, sellAmount, bondingCurveInfo, calculateTokensOut, calculateIotaOut, formatTokenAmount, parseTokenAmount])
  
  const handleBuy = async () => {
    if (!currentAccount || !bondingCurveInfo) {
      toast.error("Please connect your wallet")
      return
    }
    
    if (!buyAmount || parseFloat(buyAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    
    const iotaAmount = parseTokenAmount(buyAmount)
    await buyTokens(
      `${blitz_PACKAGE_ID.testnet}::${params.ticker}::${params.ticker.toUpperCase()}`,
      MOCK_BONDING_CURVE_ID,
      iotaAmount,
      0n, // No slippage protection for now
      () => {
        setBuyAmount("")
        // Refresh data
        getBondingCurveInfo(MOCK_BONDING_CURVE_ID).then(setBondingCurveInfo)
      }
    )
  }
  
  const handleSell = async () => {
    if (!currentAccount || !bondingCurveInfo) {
      toast.error("Please connect your wallet")
      return
    }
    
    if (!sellAmount || parseFloat(sellAmount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }
    
    // This would need the actual token object ID from user's wallet
    toast.error("Selling functionality requires token object ID integration")
  }
  
  if (!bondingCurveInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }
  
  // Calculate derived values
  const availableTokens = BigInt(bondingCurveInfo.totalSupply) - BigInt(bondingCurveInfo.tokensSold)
  const marketCap = bondingCurveInfo ? 
    (parseFloat(formatTokenAmount(bondingCurveInfo.totalSupply)) * parseFloat(formatTokenAmount(bondingCurveInfo.iotaReserve)) / parseFloat(formatTokenAmount(availableTokens)) * iotaPrice) 
    : 0
  
  const price = bondingCurveInfo ?
    parseFloat(formatTokenAmount(bondingCurveInfo.iotaReserve)) / parseFloat(formatTokenAmount(availableTokens))
    : 0

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-6 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild className="text-gray-400 hover:text-white hover:bg-white/10">
            <Link href="/launchpad">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tokens
            </Link>
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Coin Info & Chart */}
          <div className="lg:col-span-2 space-y-8">
            {/* Coin Header */}
            <Card className="glass-dark border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <Image
                      src="/placeholder.svg"
                      alt={bondingCurveInfo.name}
                      width={80}
                      height={80}
                      className="rounded-2xl border border-border/50"
                    />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-black rounded-full"></div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h1 className="text-white font-bold text-4xl leading-none tracking-tighter">
                      {bondingCurveInfo.name} - {bondingCurveInfo.symbol}
                    </h1>
                    <p className="text-gray-400 font-mono text-lg mt-1">
                      {MOCK_BONDING_CURVE_ID ? `${MOCK_BONDING_CURVE_ID.slice(0, 6)}...${MOCK_BONDING_CURVE_ID.slice(-4)}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 p-3">
                      <ExternalLink className="w-5 h-5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 p-3">
                      <Copy className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-1">Status</p>
                    <p className="text-white font-semibold text-lg font-mono tabular-nums">
                      {bondingCurveInfo.isGraduated ? "Graduated" : "Active"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-1">Price USD</p>
                    <p className="text-white font-semibold text-lg font-mono tabular-nums">
                      ${(price * iotaPrice).toFixed(6)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-1">Price IOTA</p>
                    <p className="text-white font-semibold text-lg font-mono tabular-nums">
                      {price.toFixed(6)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm mb-1">Progress</p>
                    <p className="text-cyan-400 font-semibold text-lg font-mono tabular-nums">
                      {bondingCurveInfo.progressPercent}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-6 mb-8">
                  <div className="text-center p-4 bg-black/50 rounded-xl border border-white/10">
                    <p className="text-gray-400 text-sm mb-2">Market Cap</p>
                    <p className="text-white font-bold text-xl font-mono tabular-nums">
                      ${marketCap.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-black/50 rounded-xl border border-white/10">
                    <p className="text-gray-400 text-sm mb-2">Total Supply</p>
                    <p className="text-white font-bold text-xl font-mono tabular-nums">
                      {formatTokenAmount(bondingCurveInfo.totalSupply)}
                    </p>
                  </div>
                  <div className="text-center p-4 bg-black/50 rounded-xl border border-white/10">
                    <p className="text-gray-400 text-sm mb-2">IOTA Reserve</p>
                    <p className="text-white font-bold text-xl font-mono tabular-nums">
                      {formatTokenAmount(bondingCurveInfo.iotaReserve)}
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-black/50 rounded-xl border border-white/10">
                  <p className="text-white/80 leading-relaxed">
                    {tokenInfo.description || "A community-driven meme token on the IOTA network. Trade on the bonding curve until graduation to DEX."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Chart Section */}
            <Card className="glass-dark border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                {/* Chart Controls */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                      <span className="text-white font-medium">{bondingCurveInfo.symbol}/IOTA · Bonding Curve</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 p-2">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/10 p-2">
                      <Maximize className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Chart Area */}
                <div className="h-96 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 flex items-center justify-center mb-8">
                  <div className="text-center">
                    <Activity className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">Bonding Curve Chart</p>
                    <p className="text-gray-500 text-sm">Price increases as more tokens are purchased</p>
                  </div>
                </div>

                {/* Time Controls */}
                <div className="flex items-center justify-center gap-2">
                  {["1m", "5m", "15m", "1h", "4h", "1d", "1w"].map((period) => (
                    <Button
                      key={period}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-white/10 px-4 py-2"
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
            <Card className="glass-dark border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
                  <TabsList className="grid w-full grid-cols-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl p-1">
                    <TabsTrigger
                      value="buy"
                      className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black text-gray-400 rounded-lg font-medium"
                    >
                      Buy
                    </TabsTrigger>
                    <TabsTrigger
                      value="sell"
                      className="data-[state=active]:bg-red-500 data-[state=active]:text-white text-gray-400 rounded-lg font-medium"
                      disabled={bondingCurveInfo.isGraduated}
                    >
                      Sell
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400">Amount</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm font-mono tabular-nums">
                          Balance: {activeTab === "buy" ? formatTokenAmount(iotaBalance || "0") : formatTokenAmount(tokenBalance || "0")}
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        value={activeTab === "buy" ? buyAmount : sellAmount}
                        onChange={(e) =>
                          activeTab === "buy" ? setBuyAmount(e.target.value) : setSellAmount(e.target.value)
                        }
                        className="bg-black/50 backdrop-blur-sm border-white/10 text-white text-center text-2xl font-bold h-16 rounded-xl focus:border-cyan-500/50 font-mono tabular-nums"
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                          <span className="text-black text-xs font-bold">
                            {activeTab === "buy" ? "IOTA" : bondingCurveInfo.symbol}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 bg-white/10 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-400">You receive</span>
                      <span className="text-gray-400 text-sm">
                        {activeTab === "buy" ? "Est. tokens" : "Est. IOTA"}
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        value={estimatedOutput}
                        readOnly
                        className="bg-black/50 backdrop-blur-sm border-white/10 text-white text-center text-2xl font-bold h-16 rounded-xl font-mono tabular-nums"
                      />
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {activeTab === "buy" ? bondingCurveInfo.symbol : "IOTA"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={activeTab === "buy" ? handleBuy : handleSell}
                    disabled={isLoading || !currentAccount || bondingCurveInfo.isGraduated}
                    className={`w-full py-4 text-lg font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed ${
                      activeTab === "buy"
                        ? "bg-cyan-500 hover:bg-cyan-600 text-black"
                        : "bg-red-500 hover:bg-red-600 text-white"
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : !currentAccount ? (
                      "Connect Wallet"
                    ) : bondingCurveInfo.isGraduated ? (
                      "Token Graduated - Trade on DEX"
                    ) : (
                      activeTab === "buy" ? "Buy Token" : "Sell Token"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Bonding Curve Progress */}
            <Card className="glass-dark border border-white/10 rounded-2xl">
              <CardContent className="p-8">
                <h3 className="text-white font-semibold text-2xl mb-8 tracking-tight">Bonding Curve Progress</h3>

                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-cyan-400 font-bold text-lg font-mono tabular-nums">
                    {bondingCurveInfo.progressPercent}%
                  </span>
                </div>

                <Progress value={bondingCurveInfo.progressPercent} className="mb-8 h-3" />

                <div className="space-y-4 text-sm leading-relaxed">
                  <div className="p-4 bg-black/50 rounded-xl border border-white/10">
                    <p className="text-white/80">
                      <span className="text-cyan-400 font-semibold font-mono tabular-nums">
                        {formatTokenAmount(availableTokens.toString())}
                      </span>{" "}
                      <span className="text-white font-medium">{bondingCurveInfo.symbol}</span> tokens available for sale
                    </p>
                  </div>

                  <div className="p-4 bg-black/50 rounded-xl border border-white/10">
                    <p className="text-white/80">
                      <span className="text-cyan-400 font-semibold font-mono tabular-nums">
                        {formatTokenAmount(bondingCurveInfo.iotaReserve)}
                      </span>{" "}
                      <span className="text-white font-medium">IOTA</span> in bonding curve
                    </p>
                  </div>

                  <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                    <p className="text-white/80">
                      When market cap reaches{" "}
                      <span className="text-cyan-400 font-semibold font-mono tabular-nums">
                        {formatTokenAmount(BONDING_CURVE_TARGET.toString())} IOTA
                      </span>
                      , liquidity will be deposited to DEX and burned.
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