'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { addPoolFromTransactionDigest, addPoolManually } from '@/lib/services/add-pool-from-tx';
import { PoolTracker } from '@/lib/services/pool-tracker';
import { Loader2, Plus, Trash2 } from 'lucide-react';

export function PoolManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [txDigest, setTxDigest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pools, setPools] = useState<any[]>([]);
  
  useEffect(() => {
    // Load pools on mount
    refreshPools();
    
    // Listen for pool updates
    const handlePoolUpdate = () => refreshPools();
    window.addEventListener('pool-cache-refresh', handlePoolUpdate);
    
    return () => {
      window.removeEventListener('pool-cache-refresh', handlePoolUpdate);
    };
  }, []);
  
  const refreshPools = () => {
    setPools(PoolTracker.getPools());
  };
  
  const handleAddFromTx = async () => {
    if (!txDigest) {
      toast.error('Please enter a transaction digest');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await addPoolFromTransactionDigest(txDigest);
      toast.success(result.message);
      setTxDigest('');
      setIsOpen(false);
      refreshPools();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add pool from transaction');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRemovePool = (poolId: string) => {
    const currentPools = PoolTracker.getPools();
    const filteredPools = currentPools.filter(p => p.poolId !== poolId);
    
    // Clear and re-add remaining pools
    PoolTracker.clearPools();
    filteredPools.forEach(pool => {
      PoolTracker.addPool(pool.poolId, pool.coinTypeA, pool.coinTypeB, pool.network);
    });
    
    toast.success('Pool removed');
    refreshPools();
    
    // Trigger cache refresh
    window.dispatchEvent(new Event('pool-cache-refresh'));
  };
  
  // Quick action for the specific pool from the user
  const handleAddUserPool = () => {
    const poolId = '0x5a8dd3730b5bd7db6c7e527ab4ab5177ac60b5de88b3a00c696b08bb7c3fa3f4';
    const coinTypeA = '0x2::iota::IOTA';
    const coinTypeB = '0x2be5c8f4de38b40f7a05ccde8559e7ab2c3fb27a96b5de8a70071c1a6518ec51::stiota::StIOTA';
    
    addPoolManually(poolId, coinTypeA, coinTypeB, 'testnet');
    toast.success('Pool added successfully!');
    refreshPools();
  };
  
  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <Button
          onClick={handleAddUserPool}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Add Your Pool
        </Button>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="icon"
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Pool manager modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <CardTitle>Pool Manager</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add from transaction */}
              <div className="space-y-2">
                <h3 className="font-semibold">Add Pool from Transaction</h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Transaction digest (e.g., 5nhUkziGv6fMo...)"
                    value={txDigest}
                    onChange={(e) => setTxDigest(e.target.value)}
                  />
                  <Button
                    onClick={handleAddFromTx}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
              </div>
              
              {/* Current pools */}
              <div className="space-y-2">
                <h3 className="font-semibold">Current Pools ({pools.length})</h3>
                <div className="space-y-2">
                  {pools.map((pool) => (
                    <div key={pool.poolId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-mono">{pool.poolId}</p>
                        <p className="text-xs text-gray-600">
                          {pool.coinTypeA.split('::').pop()} / {pool.coinTypeB.split('::').pop()}
                        </p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemovePool(pool.poolId)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {pools.length === 0 && (
                    <p className="text-gray-500 text-center py-4">No pools tracked</p>
                  )}
                </div>
              </div>
              
              <Button
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}