"use client"

import { useState, useEffect } from "react"
import { Settings, BarChart3, ChevronDown, ArrowUpDown, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SwapInterface as NewSwapInterface } from "@/components/swap-interface"
import { LimitInterface } from "@/components/limit-interface-simple"
import { DCAInterface } from "@/components/dca-interface"
import { DCAStrategies } from "@/components/dca-strategies"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { PoolService } from "@/lib/services/pool-service"

export default function IotaApp() {
  const [activeTab, setActiveTab] = useState("swap")
  
  // Clear pool cache when switching to swap tab for fresh data
  useEffect(() => {
    if (activeTab === "swap") {
      PoolService.clearCache();
    }
  }, [activeTab]);

  return (
    <div className="w-full min-h-[calc(100vh-120px)] flex items-start justify-center px-6 pt-16 pb-8">
      <div className="w-full max-w-[480px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex items-center justify-between mb-6">
                <TabsList className="bg-gray-900/80 border border-gray-700 p-1 rounded-xl">
                  <TabsTrigger value="swap" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-gray-400 font-medium transition-all rounded-lg">
                    Swap
                  </TabsTrigger>
                  <TabsTrigger value="limit" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-gray-400 font-medium transition-all rounded-lg">
                    Limit
                  </TabsTrigger>
                  <TabsTrigger value="dca" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white text-gray-400 font-medium transition-all rounded-lg">
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
                  <DCAStrategies />
                </TabsContent>
              </Tabs>
      </div>
    </div>
  )
}