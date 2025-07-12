'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { PoolTracker } from '@/lib/services/pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { toast } from 'sonner';

export function PoolTrackerHelper() {
  const [poolId, setPoolId] = useState('');
  const [showHelper, setShowHelper] = useState(false);

  const savePool = () => {
    if (!poolId || !poolId.startsWith('0x')) {
      toast.error('Please enter a valid pool ID');
      return;
    }

    PoolTracker.savePool({
      poolId,
      coinTypeA: SUPPORTED_COINS.IOTA.type,
      coinTypeB: SUPPORTED_COINS.stIOTA.type,
      network: 'testnet',
    });

    toast.success('Pool ID saved successfully!');
    setPoolId('');
    setShowHelper(false);
    
    // Reload the page to reflect changes
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const clearPools = () => {
    PoolTracker.clearPools();
    toast.success('Pool tracker cleared');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  if (!showHelper) {
    return (
      <Button
        onClick={() => setShowHelper(true)}
        size="sm"
        variant="outline"
        className="fixed bottom-4 right-4 z-50 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
      >
        Pool Helper
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 p-4 bg-black/90 border-white/10 w-96">
      <div className="space-y-3">
        <h3 className="text-white font-semibold">Pool Tracker Helper</h3>
        <p className="text-sm text-gray-400">
          If your liquidity positions aren't showing, enter the pool ID here:
        </p>
        <Input
          placeholder="0x..."
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          className="bg-white/5 border-white/10 text-white"
        />
        <div className="flex gap-2">
          <Button
            onClick={savePool}
            size="sm"
            className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/50"
          >
            Save Pool ID
          </Button>
          <Button
            onClick={clearPools}
            size="sm"
            variant="destructive"
            className="flex-1"
          >
            Clear All
          </Button>
          <Button
            onClick={() => setShowHelper(false)}
            size="sm"
            variant="ghost"
            className="text-gray-400"
          >
            Close
          </Button>
        </div>
        <div className="text-xs text-gray-500">
          Current pools: {PoolTracker.getPools().length}
        </div>
      </div>
    </Card>
  );
}