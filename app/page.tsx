"use client"

import { useState, useEffect } from "react"
import { Settings, BarChart3, ChevronDown, ArrowUpDown, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SwapInterface as NewSwapInterface } from "@/components/swap-interface"
import { LimitInterface } from "@/components/limit-interface"
import { DCAInterface } from "@/components/dca-interface"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { refreshPoolCache } from "@/lib/services/pool-refresh"
import { addPoolFromTransaction } from "@/lib/services/add-pool-manual"
import { extractPoolFromTransaction } from "@/lib/services/extract-pool-from-tx"
import { ensureCriticalPools } from "@/lib/services/ensure-pools"

// Import debug tools in development
// Commented out to reduce console noise
// if (process.env.NODE_ENV === 'development') {
//   import('@/lib/services/debug-pool');
// }

// Import refresh tools
import('@/lib/services/refresh-and-track-pools');
import('@/lib/services/verify-pool');
import('@/lib/services/cleanup-pools');

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
      
      // Auto-add recent liquidity pool
      const checkRecentPool = async () => {
        const txHash = 'DBJiftpbLE9JJ3e5N6rtLUHsMs3FZkbaYHJRaRdp5WR2';
        try {
          const result = await extractPoolFromTransaction(txHash);
          if (result && result.success && result.poolId) {
            console.log('Recent pool auto-added:', result.poolId);
          }
        } catch (error) {
          // Silently handle error
        }
      };
      
      // Check recent liquidity addition
      const checkRecentLiquidity = async () => {
        const liquidityTxHash = 'CLS5t6kzs2cxYuUx9r2faJU9o88beoeCoNSStrymWeEq';
        try {
          const { extractLiquidityFromTransaction } = await import('@/lib/services/extract-liquidity-from-tx');
          const result = await extractLiquidityFromTransaction(liquidityTxHash);
          if (result.success) {
            console.log('Recent liquidity addition detected:', result);
            refreshPoolCache();
          }
        } catch (error) {
          // Silently handle error
        }
      };
      
      // Run after a short delay
      setTimeout(checkRecentPool, 2000);
      setTimeout(checkRecentLiquidity, 3000);
    }
  }, []);

  return (
    <div className="w-full min-h-[calc(100vh-200px)] flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-[480px]">
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
    </div>
  )
}