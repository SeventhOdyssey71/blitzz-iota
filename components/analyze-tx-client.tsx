'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { extractPoolFromTransaction } from '@/lib/services/extract-pool-from-tx';
import { PoolTracker } from '@/lib/services/pool-tracker';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { getSafeIotaClient } from '@/lib/iota/safe-client';

export function AnalyzeTransactionClient() {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  const txDigest = 'DBJiftpbLE9JJ3e5N6rtLUHsMs3FZkbaYHJRaRdp5WR2';
  
  const analyzeLiquidityTransaction = async () => {
    setAnalyzing(true);
    const log: string[] = [];
    
    try {
      log.push('=== Analyzing Liquidity Transaction ===');
      log.push(`Transaction hash: ${txDigest}`);
      log.push('Network: testnet');
      log.push('');
      
      // Check current tracked pools
      log.push('=== Current Tracked Pools ===');
      const existingPools = PoolTracker.getPools();
      log.push(`Total pools tracked: ${existingPools.length}`);
      
      // Check if we already have a pool for IOTA-stIOTA
      const iotaStIotaPool = PoolTracker.findPool(
        SUPPORTED_COINS.IOTA.type,
        SUPPORTED_COINS.stIOTA.type
      );
      
      if (iotaStIotaPool) {
        log.push(`Found existing IOTA-stIOTA pool: ${iotaStIotaPool}`);
      } else {
        log.push('No existing IOTA-stIOTA pool found');
      }
      
      log.push('');
      log.push('=== Extracting Pool from Transaction ===');
      
      // Extract pool from transaction
      const result = await extractPoolFromTransaction(txDigest);
      
      if (result.success) {
        log.push('✅ Successfully extracted pool!');
        log.push(`Pool ID: ${result.poolId}`);
        log.push(`Coin Type A: ${result.coinTypeA}`);
        log.push(`Coin Type B: ${result.coinTypeB}`);
        
        // Verify the pool details
        log.push('');
        log.push('=== Verifying Pool Details ===');
        
        // Get the IOTA client to fetch pool state
        const client = getSafeIotaClient();
        if (client && result.poolId) {
          try {
            const poolObject = await client.getObject({
              id: result.poolId,
              options: {
                showContent: true,
                showType: true,
              }
            });
            
            if (poolObject.data && poolObject.data.content && 'type' in poolObject.data.content && poolObject.data.content.type === 'moveObject') {
              const fields = (poolObject.data.content as any).fields;
              log.push('Pool reserves:');
              log.push(`- Reserve A: ${fields.reserve_a} (${fields.reserve_a / 1e9} tokens)`);
              log.push(`- Reserve B: ${fields.reserve_b} (${fields.reserve_b / 1e9} tokens)`);
              log.push(`- LP Supply: ${fields.lp_supply}`);
              
              // Check if it matches the expected 2 IOTA and 2 stIOTA
              const reserveA = parseInt(fields.reserve_a) / 1e9;
              const reserveB = parseInt(fields.reserve_b) / 1e9;
              
              log.push('');
              if (Math.abs(reserveA - 2) < 0.001 && Math.abs(reserveB - 2) < 0.001) {
                log.push('✅ Pool reserves match expected values (2 IOTA and 2 stIOTA)');
              } else {
                log.push('⚠️  Pool reserves do not match expected values');
                log.push(`   Expected: 2 IOTA and 2 stIOTA`);
                log.push(`   Actual: ${reserveA} and ${reserveB}`);
              }
            }
          } catch (error) {
            log.push(`Error fetching pool object: ${error}`);
          }
        }
        
        // Check if pool is now tracked
        log.push('');
        log.push('=== Pool Tracking Status ===');
        const updatedPools = PoolTracker.getPools();
        const isTracked = updatedPools.some(p => p.poolId === result.poolId);
        
        if (isTracked) {
          log.push('✅ Pool is now tracked in localStorage');
          const trackedPool = updatedPools.find(p => p.poolId === result.poolId);
          log.push(`Tracked pool details: ${JSON.stringify(trackedPool, null, 2)}`);
        } else {
          log.push('❌ Pool is not tracked (this should not happen)');
        }
        
        setResults({
          success: true,
          log,
          poolId: result.poolId,
          coinTypeA: result.coinTypeA,
          coinTypeB: result.coinTypeB,
        });
        
      } else {
        log.push(`❌ Failed to extract pool: ${result.message}`);
        setResults({
          success: false,
          log,
          error: result.message,
        });
      }
      
    } catch (error) {
      log.push(`Error analyzing transaction: ${error}`);
      setResults({
        success: false,
        log,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setAnalyzing(false);
    }
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Analyze Liquidity Transaction</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Transaction: {txDigest}</p>
            <p>Network: IOTA Testnet</p>
            <p>Expected: 2 IOTA + 2 stIOTA liquidity</p>
          </div>
          
          <Button 
            onClick={analyzeLiquidityTransaction}
            disabled={analyzing}
          >
            {analyzing ? 'Analyzing...' : 'Analyze Transaction'}
          </Button>
          
          {results && (
            <div className="mt-4 p-4 bg-black/5 dark:bg-white/5 rounded-lg">
              <pre className="text-xs whitespace-pre-wrap">
                {results.log.join('\n')}
              </pre>
              
              {results.success && results.poolId && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Pool successfully extracted and tracked!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pool ID: {results.poolId}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}