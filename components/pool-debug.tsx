'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PoolService } from '@/lib/services/pool-service';
import { SUPPORTED_COINS } from '@/config/iota.config';

export function PoolDebug() {
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testPoolDiscovery = async () => {
    setIsLoading(true);
    setResult('Testing pool discovery...\n');
    
    try {
      // Test finding IOTA/stIOTA pool
      const pool = await PoolService.findPool(
        SUPPORTED_COINS.IOTA.type,
        SUPPORTED_COINS.stIOTA.type,
        'testnet'
      );

      let output = `Pool discovery test for IOTA/stIOTA:\n`;
      output += `IOTA type: ${SUPPORTED_COINS.IOTA.type}\n`;
      output += `stIOTA type: ${SUPPORTED_COINS.stIOTA.type}\n\n`;

      if (pool) {
        output += `✅ Pool found!\n`;
        output += `Pool ID: ${pool.poolId}\n`;
        output += `Coin A: ${pool.coinTypeA}\n`;
        output += `Coin B: ${pool.coinTypeB}\n`;
        output += `Reserve A: ${pool.reserveA.toString()}\n`;
        output += `Reserve B: ${pool.reserveB.toString()}\n`;
        output += `LP Supply: ${pool.lpSupply.toString()}\n`;
      } else {
        output += `❌ No pool found\n`;
        output += `This means no pool has been created yet for this pair.\n`;
        output += `Please create a pool using the Pool interface first.\n`;
      }

      setResult(output);
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCache = () => {
    PoolService.clearCache();
    setResult('Pool cache cleared. Try testing pool discovery again.');
  };

  // Temporarily show in all environments for debugging
  // if (process.env.NODE_ENV !== 'development') {
  //   return null;
  // }

  return (
    <div className="p-4 bg-gray-800 rounded-lg m-4">
      <h3 className="text-white font-bold mb-4">Pool Debug Tool</h3>
      <div className="flex gap-2 mb-4">
        <Button onClick={testPoolDiscovery} disabled={isLoading}>
          {isLoading ? 'Testing...' : 'Test Pool Discovery'}
        </Button>
        <Button onClick={clearCache} variant="outline">
          Clear Cache
        </Button>
      </div>
      {result && (
        <pre className="bg-black text-green-400 p-3 rounded text-xs overflow-auto max-h-96">
          {result}
        </pre>
      )}
    </div>
  );
}