'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  X, 
  Clock, 
  TrendingUp, 
  DollarSign,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDCAV2 } from '@/hooks/use-dca-v2';
import { DCAServiceV2, DCAStrategyV2 } from '@/lib/services/dca-service-v2';
import { formatTokenAmount } from '@/lib/utils/format';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { CoinIcon } from '@/components/coin-icon';

interface DCAStrategyCardProps {
  strategy: DCAStrategyV2;
  onExecute: (strategy: DCAStrategyV2) => void;
  onPause: (strategy: DCAStrategyV2, reason: string) => void;
  onResume: (strategy: DCAStrategyV2) => void;
  onCancel: (strategy: DCAStrategyV2) => void;
}

function DCAStrategyCard({ 
  strategy, 
  onExecute, 
  onPause, 
  onResume, 
  onCancel 
}: DCAStrategyCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Get token info (simplified - in real implementation, extract from strategy type)
  const sourceToken = Object.values(SUPPORTED_COINS)[0]; // IOTA
  const targetToken = Object.values(SUPPORTED_COINS)[1]; // stIOTA
  
  const progress = DCAServiceV2.getProgress(strategy);
  const nextExecution = new Date(strategy.nextExecutionTime);
  const isExecutable = DCAServiceV2.isReadyForExecution(strategy);

  const handleAction = async (
    action: 'execute' | 'pause' | 'resume' | 'cancel'
  ) => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'execute':
          await onExecute(strategy);
          break;
        case 'pause':
          await onPause(strategy, 'User requested pause');
          break;
        case 'resume':
          await onResume(strategy);
          break;
        case 'cancel':
          await onCancel(strategy);
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-black/40 border-white/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <CoinIcon symbol={sourceToken.symbol} coinType={sourceToken.type} size={20} />
              <span className="text-white font-medium">{sourceToken.symbol}</span>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex items-center gap-1">
              <CoinIcon symbol={targetToken.symbol} coinType={targetToken.type} size={20} />
              <span className="text-white font-medium">{targetToken.symbol}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={strategy.isActive ? 'default' : 'secondary'}
              className={strategy.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}
            >
              {strategy.isActive ? 'Active' : 'Paused'}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black border-white/10" align="end">
                {isExecutable && (
                  <DropdownMenuItem 
                    onClick={() => handleAction('execute')}
                    className="text-green-400 focus:text-green-400"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Execute Now
                  </DropdownMenuItem>
                )}
                {strategy.isActive ? (
                  <DropdownMenuItem 
                    onClick={() => handleAction('pause')}
                    className="text-yellow-400 focus:text-yellow-400"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    onClick={() => handleAction('resume')}
                    className="text-green-400 focus:text-green-400"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={() => handleAction('cancel')}
                  className="text-red-400 focus:text-red-400"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progress</span>
            <span className="text-white">
              {strategy.executedOrders} / {strategy.totalOrders} orders
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-400 mb-1">Amount per Order</div>
            <div className="text-white font-medium">
              {formatTokenAmount(strategy.amountPerOrder, sourceToken.decimals)} {sourceToken.symbol}
            </div>
          </div>
          
          <div>
            <div className="text-gray-400 mb-1">Interval</div>
            <div className="text-white font-medium">
              {DCAServiceV2.formatInterval(strategy.intervalMs)}
            </div>
          </div>
          
          <div>
            <div className="text-gray-400 mb-1">Remaining Balance</div>
            <div className="text-white font-medium">
              {formatTokenAmount(strategy.sourceBalance, sourceToken.decimals)} {sourceToken.symbol}
            </div>
          </div>
          
          <div>
            <div className="text-gray-400 mb-1">Received</div>
            <div className="text-white font-medium">
              {formatTokenAmount(strategy.receivedBalance, targetToken.decimals)} {targetToken.symbol}
            </div>
          </div>
        </div>

        {/* Next Execution */}
        {strategy.isActive && strategy.executedOrders < strategy.totalOrders && (
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-400">Next execution:</span>
            </div>
            <div className="text-sm text-white">
              {isExecutable ? (
                <Badge className="bg-green-500/20 text-green-400">Ready</Badge>
              ) : (
                nextExecution.toLocaleDateString() + ' ' + nextExecution.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })
              )}
            </div>
          </div>
        )}

        {/* Quick Action */}
        {isExecutable && (
          <Button 
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black"
            onClick={() => handleAction('execute')}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Execute Order Now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function DCAStrategies() {
  const { 
    strategies, 
    isLoading, 
    executeOrder, 
    pauseStrategy, 
    resumeStrategy, 
    cancelStrategy,
    refetch
  } = useDCAV2();

  if (isLoading) {
    return (
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!strategies.length) {
    return (
      <Card className="bg-black/40 border-white/10">
        <CardContent className="p-6 text-center">
          <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No DCA Strategies</h3>
          <p className="text-gray-400 text-sm">
            Create your first dollar-cost averaging strategy to start automated investing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Your DCA Strategies</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={refetch}
          className="text-gray-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {strategies.map((strategy) => (
          <DCAStrategyCard
            key={strategy.id}
            strategy={strategy}
            onExecute={executeOrder}
            onPause={pauseStrategy}
            onResume={resumeStrategy}
            onCancel={cancelStrategy}
          />
        ))}
      </div>
    </div>
  );
}