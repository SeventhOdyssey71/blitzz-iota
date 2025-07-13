"use client"

import { useState, useEffect } from "react"
import { Settings, BarChart3, ChevronDown, ArrowUpDown, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SwapInterface as NewSwapInterface } from "@/components/swap-interface"
import { WalletTokens } from "@/components/wallet-tokens"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { refreshPoolCache } from "@/lib/services/pool-refresh"
import { addPoolFromTransaction } from "@/lib/services/add-pool-manual"
import { extractPoolFromTransaction } from "@/lib/services/extract-pool-from-tx"
import { ensureCriticalPools } from "@/lib/services/ensure-pools"

// Import debug tools in development
if (process.env.NODE_ENV === 'development') {
  import('@/lib/services/debug-pool');
}

// Import refresh tools
import('@/lib/services/refresh-and-track-pools');

export default function IotaApp() {
  const [activeTab, setActiveTab] = useState("swap")
  
  // Ensure critical pools are tracked on mount
  useEffect(() => {
    ensureCriticalPools();
  }, []);
  
  // Refresh pool cache when switching to swap tab
  useEffect(() => {
    if (activeTab === "swap") {
      refreshPoolCache();
    }
  }, [activeTab]);
  
  // Make functions available in console for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addPoolFromTransaction = addPoolFromTransaction;
      (window as any).extractPoolFromTransaction = extractPoolFromTransaction;
      (window as any).refreshPoolCache = refreshPoolCache;
    }
  }, []);

  return (
    <div>

      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-12 gap-6">
            {/* Trading Interface */}
            <div className="col-span-12 lg:col-span-8">
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
                  <Badge variant="outline" className="border-white text-white">
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

                <TabsContent value="swap" className="space-y-4 mt-0">
                  <NewSwapInterface />
                </TabsContent>

                <TabsContent value="limit" className="space-y-4 mt-0">
                  <LimitInterface />
                </TabsContent>

                <TabsContent value="dca" className="space-y-4 mt-0">
                  <DCAInterface />
                </TabsContent>
              </Tabs>
            </div>

            {/* Wallet Balance Section */}
            <div className="col-span-12 lg:col-span-4">
              <div className="lg:pl-4">
                <WalletTokens />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Limit Interface Component
function LimitInterface() {
  return (
    <div className="space-y-4">
      {/* Total/Per Order Toggle */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="outline" size="sm" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
          Total
        </Button>
        <Button variant="outline" size="sm" className="border-white/10 text-gray-400 bg-transparent hover:bg-white/5">
          Per Order
        </Button>
      </div>

      {/* You Pay */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">You Pay</span>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span>0.000002</span>
              <Badge variant="outline" className="border-white/10 text-gray-400 text-xs hover:bg-white/5">
                HALF
              </Badge>
              <Badge variant="outline" className="border-white/10 text-gray-400 text-xs hover:bg-white/5">
                MAX
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold text-white p-0 h-auto focus:outline-none"
            />
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">$</span>
              </div>
              <span className="text-white font-semibold">vUSD</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swap Arrow */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
        </Button>
      </div>

      {/* You Receive */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">You Receive</span>
            <span className="text-gray-400 text-sm">0.760776</span>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold text-white p-0 h-auto focus:outline-none"
            />
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">I</span>
              </div>
              <span className="text-white font-semibold">IOTA</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardContent className="p-4">
            <div className="text-gray-400 text-sm mb-2">Buy IOTA at rate</div>
            <div className="flex items-center gap-2">
              <Input value="0.2136" className="bg-transparent border-none text-white font-semibold p-0 h-auto focus:outline-none" />
              <span className="text-gray-400 text-sm">vUSD</span>
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
            <Select defaultValue="7days">
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

      {/* Enter Amount Button */}
      <Button className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 py-3 rounded-lg font-semibold border border-cyan-500/30">
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
        <Button variant="outline" size="sm" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
          Total
        </Button>
        <Button variant="outline" size="sm" className="border-white/10 text-gray-400 bg-transparent hover:bg-white/5">
          Per Order
        </Button>
      </div>

      {/* You Pay */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">You Pay</span>
            <div className="flex items-center gap-2 text-gray-400 text-xs">
              <span>0.000002</span>
              <Badge variant="outline" className="border-white/10 text-gray-400 text-xs hover:bg-white/5">
                HALF
              </Badge>
              <Badge variant="outline" className="border-white/10 text-gray-400 text-xs hover:bg-white/5">
                MAX
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold text-white p-0 h-auto focus:outline-none"
            />
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">$</span>
              </div>
              <span className="text-white font-semibold">vUSD</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Swap Arrow */}
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" className="rounded-full bg-white/5 hover:bg-white/10 border border-white/10">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
        </Button>
      </div>

      {/* You Receive */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-sm">You Receive</span>
            <span className="text-gray-400 text-sm">0.760776</span>
          </div>
          <div className="flex items-center justify-between">
            <Input
              placeholder="0.0"
              className="bg-transparent border-none text-2xl font-semibold text-white p-0 h-auto focus:outline-none"
            />
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">I</span>
              </div>
              <span className="text-white font-semibold">IOTA</span>
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
            <Select defaultValue="hour">
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
            <Input value="10" className="bg-transparent border-white/10 text-white" />
          </div>
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 text-sm">Price Range</span>
            <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
              Reset
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 text-xs mb-1">Min Price</div>
              <Input value="0.1926" className="bg-transparent border-white/10 text-white" />
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Max Price</div>
              <Input value="0.2346" className="bg-transparent border-white/10 text-white" />
            </div>
          </div>
          <div className="text-gray-400 text-xs mt-2">
            vUSD per IOTA
          </div>
        </CardContent>
      </Card>

      {/* Enter Amount Button */}
      <Button className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 py-3 rounded-lg font-semibold border border-cyan-500/30">
        Enter an amount
      </Button>
    </div>
  )
}