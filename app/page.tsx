"use client"

import { useState } from "react"
import { Settings, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SwapInterface as NewSwapInterface } from "@/components/swap-interface"
import { WalletTokens } from "@/components/wallet-tokens"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function IotaApp() {
  const [activeTab, setActiveTab] = useState("swap")

  return (
    <div className="min-h-screen grid-pattern">

      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-8">
            {/* Trading Interface - Offset design */}
            <div className="col-span-12 lg:col-span-7 lg:col-start-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-black/50 border border-white/10 p-1 rounded-xl">
                  <TabsTrigger value="swap" className="data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 text-gray-400 font-medium transition-all rounded-lg">
                    Swap
                  </TabsTrigger>
                  <TabsTrigger value="limit" className="data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 text-gray-400 font-medium transition-all rounded-lg">
                    Limit
                  </TabsTrigger>
                  <TabsTrigger value="dca" className="data-[state=active]:bg-white/10 data-[state=active]:text-cyan-400 data-[state=active]:border data-[state=active]:border-cyan-500/30 text-gray-400 font-medium transition-all rounded-lg">
                    DCA
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-gray-300 text-gray-700">
                    Lite
                  </Badge>
                  <Button variant="ghost" size="sm" className="text-gray-500">
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-gray-500">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <TabsContent value="swap">
                <NewSwapInterface />
              </TabsContent>

              <TabsContent value="limit">
                <LimitInterface />
              </TabsContent>

              <TabsContent value="dca">
                <DCAInterface />
              </TabsContent>
            </Tabs>
            </div>

            {/* Wallet Tokens - Floating sidebar */}
            <div className="col-span-12 lg:col-span-3 lg:col-start-10 lg:-mt-20">
              <div className="sticky top-24">
                <WalletTokens />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


function LimitInterface() {
  return (
    <div className="space-y-4">
      {/* Total/Per Order Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" className="bg-blue-600 text-white border-blue-600">
          Total
        </Button>
        <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 bg-transparent">
          Per Order
        </Button>
      </div>

      {/* You Pay */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">You Pay</span>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <span>0.000002</span>
              <Badge variant="outline" className="border-gray-300 text-gray-500 text-xs">
                HALF
              </Badge>
              <Badge variant="outline" className="border-gray-300 text-gray-500 text-xs">
                MAX
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold text-black p-0 h-auto"
            />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">$</span>
              </div>
              <span className="text-black font-semibold">USDC</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swap Arrow */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-300">
          <ArrowUpDown className="w-4 h-4 text-gray-700" />
        </Button>
      </div>

      {/* You Receive */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">You Receive</span>
            <span className="text-gray-500 text-sm">0.760776</span>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold text-black p-0 h-auto"
            />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">I</span>
              </div>
              <span className="text-black font-semibold">IOTA</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="text-gray-500 text-sm mb-2">Buy IOTA at rate</div>
            <div className="flex items-center gap-2">
              <Input value="0.2136" className="bg-transparent border-none text-black font-semibold p-0 h-auto" />
              <span className="text-gray-500 text-sm">USDC</span>
            </div>
            <Badge variant="outline" className="border-gray-300 text-gray-500 text-xs mt-2">
              Market
            </Badge>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <span>Expires in</span>
              <Info className="w-3 h-3" />
            </div>
            <Select defaultValue="7days">
              <SelectTrigger className="bg-transparent border-none text-black p-0 h-auto">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="1day">1 Day</SelectItem>
                <SelectItem value="7days">7 Days</SelectItem>
                <SelectItem value="30days">30 Days</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Enter Amount Button */}
      <Button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold">
        Enter an amount
      </Button>
    </div>
  )
}

function DCAInterface() {
  return (
    <div className="space-y-4">
      {/* Total/Per Order Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" className="bg-blue-600 text-white border-blue-600">
          Total
        </Button>
        <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 bg-transparent">
          Per Order
        </Button>
      </div>

      {/* You Pay */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">You Pay</span>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <span>0.000002</span>
              <Badge variant="outline" className="border-gray-300 text-gray-500 text-xs">
                HALF
              </Badge>
              <Badge variant="outline" className="border-gray-300 text-gray-500 text-xs">
                MAX
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold text-black p-0 h-auto"
            />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">$</span>
              </div>
              <span className="text-black font-semibold">USDC</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swap Arrow */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-300">
          <ArrowUpDown className="w-4 h-4 text-gray-700" />
        </Button>
      </div>

      {/* You Receive */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">You Receive</span>
            <span className="text-gray-500 text-sm">0.760776</span>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold text-black p-0 h-auto"
            />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">I</span>
              </div>
              <span className="text-black font-semibold">IOTA</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DCA Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="text-gray-500 text-sm mb-2">Invest Every</div>
            <div className="flex items-center justify-between">
              <span className="text-black text-2xl font-semibold">1</span>
              <Select defaultValue="hour">
                <SelectTrigger className="w-20 bg-transparent border-none text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="hour">Hour</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
              <span>Over</span>
              <Info className="w-3 h-3" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-black text-2xl font-semibold">2</span>
              <span className="text-gray-500">Orders</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Set Price Range */}
      <Card className="bg-white border-gray-200">
        <CardContent className="p-4">
          <div className="mb-3">
            <h3 className="text-black font-semibold mb-1">Set Price Range</h3>
            <p className="text-gray-500 text-sm">
              DCA will only be executed if the price falls within the range of your pricing strategy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input placeholder="0.0" className="bg-gray-200/50 border-gray-300 text-black" />
              <div className="text-gray-500 text-xs mt-1">USDC per IOTA</div>
            </div>
            <div>
              <Input placeholder="0.0" className="bg-gray-200/50 border-gray-300 text-black" />
              <div className="text-gray-500 text-xs mt-1">USDC per IOTA</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enter Amount Button */}
      <Button className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold">
        Enter an amount
      </Button>
    </div>
  )
}
