"use client"

import { useState, useEffect } from "react"
import { ArrowUpDown, Info, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrentAccount, useSignAndExecuteTransaction } from "@iota/dapp-kit"
import { useWalletBalance } from "@/hooks/use-wallet-balance"
import { TokenSelect } from "@/components/token-select"
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

export function LimitInterface() {
  const [amountMode, setAmountMode] = useState<"total" | "perOrder">("total")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [price, setPrice] = useState("")
  const [expiry, setExpiry] = useState("7days")
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

  // Calculate the other amount based on price
  useEffect(() => {
    if (fromAmount && price) {
      const calculatedTo = (parseFloat(fromAmount) / parseFloat(price)).toFixed(6)
      setToAmount(calculatedTo)
    }
  }, [fromAmount, price])

  useEffect(() => {
    if (toAmount && price) {
      const calculatedFrom = (parseFloat(toAmount) * parseFloat(price)).toFixed(6)
      setFromAmount(calculatedFrom)
    }
  }, [toAmount, price])

  const handleSwapTokens = () => {
    const temp = fromToken
    setFromToken(toToken)
    setToToken(temp)
    setFromAmount(toAmount)
    setToAmount(fromAmount)
  }

  const handleMaxClick = () => {
    if (fromBalance) {
      const maxAmount = formatBalance(fromBalance, fromToken.decimals)
      setFromAmount(maxAmount)
    }
  }

  const handleHalfClick = () => {
    if (fromBalance) {
      const halfAmount = (parseFloat(formatBalance(fromBalance, fromToken.decimals)) / 2).toFixed(6)
      setFromAmount(halfAmount)
    }
  }

  const getExpiryDuration = () => {
    switch (expiry) {
      case "1day": return 24 * 60 * 60 * 1000 // 1 day in ms
      case "7days": return 7 * 24 * 60 * 60 * 1000 // 7 days in ms
      case "30days": return 30 * 24 * 60 * 60 * 1000 // 30 days in ms
      default: return 7 * 24 * 60 * 60 * 1000
    }
  }

  const handlePlaceOrder = async () => {
    if (!account || !fromAmount || !price) {
      toast.error("Please fill in all required fields")
      return
    }

    setLoading(true)
    try {
      const tx = new Transaction()
      
      // Get the order book ID (this should be stored in config or fetched)
      const orderBookId = IOTA_CONFIG.contracts.limitOrderBook[`${fromToken.symbol}_${toToken.symbol}`]
      
      if (!orderBookId) {
        throw new Error(`No order book found for ${fromToken.symbol}/${toToken.symbol} pair`)
      }

      const amountIn = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromToken.decimals))
      const limitPrice = Math.floor(parseFloat(price) * 1000000) // Price with 6 decimal precision
      
      // Create the coin to use for the order
      const [coin] = tx.splitCoins(tx.gas, [tx.pure(amountIn)])
      
      // Determine if this is a buy or sell order
      const isBuyOrder = toToken.symbol === "IOTA" // Buying IOTA with vUSD
      
      if (isBuyOrder) {
        tx.moveCall({
          target: `${IOTA_CONFIG.contracts.packageId}::limit_order::place_buy_order`,
          arguments: [
            tx.object(orderBookId),
            coin,
            tx.pure(limitPrice),
            tx.pure(amountIn),
            tx.pure(getExpiryDuration()),
            tx.object("0x6"), // Clock object
          ],
          typeArguments: [fromToken.type!, toToken.type!]
        })
      } else {
        tx.moveCall({
          target: `${IOTA_CONFIG.contracts.packageId}::limit_order::place_sell_order`,
          arguments: [
            tx.object(orderBookId),
            coin,
            tx.pure(limitPrice),
            tx.pure(amountIn),
            tx.pure(getExpiryDuration()),
            tx.object("0x6"), // Clock object
          ],
          typeArguments: [fromToken.type!, toToken.type!]
        })
      }

      const result = await signAndExecuteTransaction({
        transaction: tx,
        chain: IOTA_CONFIG.chain,
      })

      if (result.effects?.status.status === "success") {
        toast.success("Limit order placed successfully!")
        setFromAmount("")
        setToAmount("")
        setPrice("")
      } else {
        throw new Error("Transaction failed")
      }
    } catch (error: any) {
      console.error("Error placing limit order:", error)
      toast.error(error.message || "Failed to place limit order")
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = fromAmount && parseFloat(fromAmount) > 0 && price && parseFloat(price) > 0

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
            <span className="text-gray-400 text-sm">You Pay</span>
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
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
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
            <span className="text-gray-400 text-sm">You Receive</span>
            <span className="text-gray-400 text-sm">{toBalance ? formatBalance(toBalance, toToken.decimals) : "0"}</span>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              value={toAmount}
              onChange={(e) => setToAmount(e.target.value)}
              className="bg-transparent border-none text-2xl font-semibold text-white p-0 h-auto focus:outline-none"
              type="number"
            />
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

      {/* Trading Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-4">
            <div className="text-gray-400 text-sm mb-2">Buy {toToken.symbol} at rate</div>
            <div className="flex items-center gap-2">
              <Input 
                value={price} 
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.0"
                className="bg-transparent border-none text-white font-semibold p-0 h-auto focus:outline-none" 
                type="number"
              />
              <span className="text-gray-400 text-sm">{fromToken.symbol}</span>
            </div>
            <Badge variant="outline" className="border-white/10 text-gray-400 text-xs mt-2 hover:bg-white/5">
              Market
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
              <span>Expires in</span>
              <Info className="w-3 h-3" />
            </div>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="bg-transparent border-none text-white p-0 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10">
                <SelectItem value="1day" className="text-white hover:bg-white/10">1 Day</SelectItem>
                <SelectItem value="7days" className="text-white hover:bg-white/10">7 Days</SelectItem>
                <SelectItem value="30days" className="text-white hover:bg-white/10">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Place Order Button */}
      <Button 
        className={`w-full py-3 rounded-lg font-semibold transition-all ${
          isFormValid 
            ? "bg-cyan-500 hover:bg-cyan-600 text-white" 
            : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
        }`}
        onClick={handlePlaceOrder}
        disabled={!isFormValid || loading || !account}
      >
        {loading ? "Placing Order..." : !account ? "Connect Wallet" : !isFormValid ? "Enter an amount" : "Place Limit Order"}
      </Button>

      {/* Token Select Modals */}
      <TokenSelect
        isOpen={isFromTokenSelectOpen}
        onClose={() => setIsFromTokenSelectOpen(false)}
        onSelect={(token) => {
          setFromToken(token)
          setIsFromTokenSelectOpen(false)
        }}
        selectedToken={fromToken}
      />

      <TokenSelect
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