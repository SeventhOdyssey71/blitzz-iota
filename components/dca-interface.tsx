"use client"

import { useState, useEffect } from "react"
import { ArrowUpDown, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrentAccount, useSignAndExecuteTransaction } from "@iota/dapp-kit"
import { useWalletBalance } from "@/hooks/use-wallet-balance"
import { TokenSelector } from "@/components/token-selector"
import { toast } from "sonner"
import { Transaction } from "@iota/iota-sdk/transactions"
import { IOTA_CONFIG } from "@/config/iota.config"
import { formatBalance } from "@/lib/utils/format"

interface Token {
  symbol: string
  name: string
  icon: string
  balance?: string
  type?: string
  decimals: number
}

export function DCAInterface() {
  const [amountMode, setAmountMode] = useState<"total" | "perOrder">("total")
  const [totalAmount, setTotalAmount] = useState("")
  const [perOrderAmount, setPerOrderAmount] = useState("")
  const [interval, setInterval] = useState("day")
  const [numberOfOrders, setNumberOfOrders] = useState("10")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [fromToken, setFromToken] = useState<Token>({
    symbol: "vUSD",
    name: "vUSD",
    icon: "$",
    decimals: 6
  })
  const [toToken, setToToken] = useState<Token>({
    symbol: "IOTA",
    name: "IOTA",
    icon: "I",
    decimals: 9
  })
  const [isFromTokenSelectOpen, setIsFromTokenSelectOpen] = useState(false)
  const [isToTokenSelectOpen, setIsToTokenSelectOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const account = useCurrentAccount()
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction()
  const { balance: fromBalance } = useWalletBalance(fromToken.type)
  const { balance: toBalance } = useWalletBalance(toToken.type)

  // Calculate per order or total amount based on mode
  useEffect(() => {
    if (amountMode === "total" && totalAmount && numberOfOrders) {
      const perOrder = (parseFloat(totalAmount) / parseInt(numberOfOrders)).toFixed(6)
      setPerOrderAmount(perOrder)
    } else if (amountMode === "perOrder" && perOrderAmount && numberOfOrders) {
      const total = (parseFloat(perOrderAmount) * parseInt(numberOfOrders)).toFixed(6)
      setTotalAmount(total)
    }
  }, [totalAmount, perOrderAmount, numberOfOrders, amountMode])

  const handleSwapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
  }

  const handleMaxClick = () => {
    if (fromBalance) {
      const maxAmount = formatBalance(fromBalance, fromToken.decimals)
      if (amountMode === "total") {
        setTotalAmount(maxAmount)
      } else {
        const perOrder = (parseFloat(maxAmount) / parseInt(numberOfOrders)).toFixed(6)
        setPerOrderAmount(perOrder)
      }
    }
  }

  const handleHalfClick = () => {
    if (fromBalance) {
      const halfAmount = (parseFloat(formatBalance(fromBalance, fromToken.decimals)) / 2).toFixed(6)
      if (amountMode === "total") {
        setTotalAmount(halfAmount)
      } else {
        const perOrder = (parseFloat(halfAmount) / parseInt(numberOfOrders)).toFixed(6)
        setPerOrderAmount(perOrder)
      }
    }
  }

  const getIntervalMs = () => {
    switch (interval) {
      case "hour": return 60 * 60 * 1000 // 1 hour in ms
      case "day": return 24 * 60 * 60 * 1000 // 1 day in ms
      case "week": return 7 * 24 * 60 * 60 * 1000 // 1 week in ms
      default: return 24 * 60 * 60 * 1000
    }
  }

  const handleResetPriceRange = () => {
    // Set default price range based on current market price
    // This should ideally fetch the current market price
    setMinPrice("0.1926")
    setMaxPrice("0.2346")
  }

  const handleCreateStrategy = async () => {
    if (!account || !totalAmount || !numberOfOrders) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const tx = new Transaction()
      
      // Get the DCA registry ID and pool ID
      const dcaRegistryId = IOTA_CONFIG.contracts.dcaRegistry
      const poolId = IOTA_CONFIG.contracts.pools[`${fromToken.symbol}_${toToken.symbol}`]
      
      if (!dcaRegistryId || !poolId) {
        throw new Error(`Required contracts not found for ${fromToken.symbol}/${toToken.symbol} pair`)
      }

      const totalAmountIn = Math.floor(parseFloat(totalAmount) * Math.pow(10, fromToken.decimals))
      const minAmountOut = minPrice ? Math.floor(parseFloat(minPrice) * Math.pow(10, toToken.decimals)) : 0
      const maxAmountOut = maxPrice ? Math.floor(parseFloat(maxPrice) * Math.pow(10, toToken.decimals)) : 0
      
      // Create the coin to use for DCA
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(totalAmountIn)])
      
      tx.moveCall({
        target: `${IOTA_CONFIG.contracts.packageId}::dca::create_dca_strategy`,
        arguments: [
          tx.object(dcaRegistryId),
          tx.object(poolId),
          coin,
          tx.pure(getIntervalMs()),
          tx.pure(parseInt(numberOfOrders)),
          tx.pure(minAmountOut),
          tx.pure(maxAmountOut),
          tx.object("0x6"), // Clock object
        ],
        typeArguments: [fromToken.type!, toToken.type!]
      })

      const result = await signAndExecuteTransaction({
        transaction: tx,
        chain: IOTA_CONFIG.chain,
      })

      if (result.effects?.status.status === "success") {
        toast.success("DCA strategy created successfully!")
        setTotalAmount("")
        setPerOrderAmount("")
        setNumberOfOrders("10")
        setMinPrice("")
        setMaxPrice("")
      } else {
        throw new Error("Transaction failed")
      }
    } catch (error: any) {
      console.error("Error creating DCA strategy:", error)
      toast.error(error.message || "Failed to create DCA strategy")
    } finally {
      setLoading(false)
    }
  }

  const displayAmount = amountMode === "total" ? totalAmount : perOrderAmount
  const isFormValid = displayAmount && parseFloat(displayAmount) > 0 && numberOfOrders && parseInt(numberOfOrders) > 0

  return (
    <div className="space-y-4">
      {/* Total/Per Order Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          className={amountMode === "total" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "border-white/10 text-gray-400 bg-transparent hover:bg-white/5"}
          onClick={() => setAmountMode("total")}
        >
          Total
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className={amountMode === "perOrder" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "border-white/10 text-gray-400 bg-transparent hover:bg-white/5"}
          onClick={() => setAmountMode("perOrder")}
        >
          Per Order
        </Button>
      </div>

      {/* You Pay */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">
              {amountMode === "total" ? "Total Amount" : "Amount Per Order"}
            </span>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span>{fromBalance ? formatBalance(fromBalance, fromToken.decimals) : "0"}</span>
              <Badge 
                variant="outline" 
                className="border-white/10 text-gray-400 text-xs hover:bg-white/5 cursor-pointer"
                onClick={handleHalfClick}
              >
                HALF
              </Badge>
              <Badge 
                variant="outline" 
                className="border-white/10 text-gray-400 text-xs hover:bg-white/5 cursor-pointer"
                onClick={handleMaxClick}
              >
                MAX
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              value={displayAmount}
              onChange={(e) => {
                if (amountMode === "total") {
                  setTotalAmount(e.target.value)
                } else {
                  setPerOrderAmount(e.target.value)
                }
              }}
              className="bg-transparent border-none text-2xl font-semibold text-white p-0 h-auto focus:outline-none"
              type="number"
            />
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80"
              onClick={() => setIsFromTokenSelectOpen(true)}
            >
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{fromToken.icon}</span>
              </div>
              <span className="text-white font-semibold">{fromToken.symbol}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swap Arrow */}
      <div className="flex justify-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
          onClick={handleSwapTokens}
        >
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
        </Button>
      </div>

      {/* You Receive */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">You Receive (Per Order)</span>
            <span className="text-gray-400 text-sm">{toBalance ? formatBalance(toBalance, toToken.decimals) : "0"}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-gray-400 text-sm">
              ~{perOrderAmount && minPrice ? (parseFloat(perOrderAmount) / parseFloat(minPrice)).toFixed(6) : "0"} - {perOrderAmount && maxPrice ? (parseFloat(perOrderAmount) / parseFloat(maxPrice)).toFixed(6) : "0"}
            </div>
            <div 
              className="flex items-center gap-2 cursor-pointer hover:opacity-80"
              onClick={() => setIsToTokenSelectOpen(true)}
            >
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">{toToken.icon}</span>
              </div>
              <span className="text-white font-semibold">{toToken.symbol}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DCA Parameters */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="text-gray-400 text-sm mb-2">Invest every</div>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="bg-transparent border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10">
                <SelectItem value="hour" className="text-white hover:bg-white/10">Hour</SelectItem>
                <SelectItem value="day" className="text-white hover:bg-white/10">Day</SelectItem>
                <SelectItem value="week" className="text-white hover:bg-white/10">Week</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-2">No. of orders</div>
            <Input 
              value={numberOfOrders} 
              onChange={(e) => setNumberOfOrders(e.target.value)}
              className="bg-transparent border-white/10 text-white" 
              type="number"
              min="1"
              max="365"
            />
          </div>

          {totalAmount && numberOfOrders && (
            <div className="text-gray-400 text-xs">
              Total duration: {parseInt(numberOfOrders)} {interval}s
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Price Range (Optional)</span>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-cyan-400 hover:text-cyan-300"
              onClick={handleResetPriceRange}
            >
              Reset
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 text-xs mb-1">Min Price</div>
              <Input 
                value={minPrice} 
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="No minimum"
                className="bg-transparent border-white/10 text-white" 
                type="number"
              />
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Max Price</div>
              <Input 
                value={maxPrice} 
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="No maximum"
                className="bg-transparent border-white/10 text-white" 
                type="number"
              />
            </div>
          </div>
          <div className="text-gray-400 text-xs mt-2">
            {fromToken.symbol} per {toToken.symbol}
          </div>
        </CardContent>
      </Card>

      {/* Create Strategy Button */}
      <Button 
        className={`w-full py-3 rounded-lg font-semibold transition-all ${
          isFormValid 
            ? "bg-cyan-500 hover:bg-cyan-600 text-white" 
            : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
        }`}
        onClick={handleCreateStrategy}
        disabled={!isFormValid || loading || !account}
      >
        {loading ? "Creating Strategy..." : !account ? "Connect Wallet" : !isFormValid ? "Enter an amount" : "Create DCA Strategy"}
      </Button>

      {/* Token Select Modals */}
      <TokenSelector
        isOpen={isFromTokenSelectOpen}
        onClose={() => setIsFromTokenSelectOpen(false)}
        onSelect={(token) => {
          setFromToken(token)
          setIsFromTokenSelectOpen(false)
        }}
        selectedToken={fromToken}
      />

      <TokenSelector
        isOpen={isToTokenSelectOpen}
        onClose={() => setIsToTokenSelectOpen(false)}
        onSelect={(token) => {
          setToToken(token)
          setIsToTokenSelectOpen(false)
        }}
        selectedToken={toToken}
      />
    </div>
  )
}