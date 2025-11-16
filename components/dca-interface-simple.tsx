"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, TrendingUp } from "lucide-react"

export function DCAInterface() {
  return (
    <Card className="glass-dark border-white/10">
      <CardContent className="p-6">
        <div className="text-center py-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <Clock className="w-6 h-6 text-cyan-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Dollar-Cost Averaging</h3>
          <p className="text-white/60 mb-4 max-w-md mx-auto">
            Automatically execute recurring trades at set intervals to minimize the impact of volatility.
          </p>
          <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">
            <TrendingUp className="w-3 h-3 mr-1" />
            Coming Soon
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}