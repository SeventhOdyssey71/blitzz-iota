"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Target, BarChart3 } from "lucide-react"

export function LimitInterface() {
  return (
    <Card className="glass-dark border-white/10">
      <CardContent className="p-6">
        <div className="text-center py-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Target className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Limit Orders</h3>
          <p className="text-white/60 mb-4 max-w-md mx-auto">
            Set your desired price and let the order execute automatically when the market reaches your target.
          </p>
          <Badge variant="outline" className="border-orange-500/30 text-orange-400">
            <BarChart3 className="w-3 h-3 mr-1" />
            Coming Soon
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}