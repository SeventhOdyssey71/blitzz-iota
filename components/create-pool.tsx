'use client';

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useIotaClient } from '@iota/dapp-kit';
import { Transaction } from '@iota/iota-sdk/transactions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, AlertCircle } from 'lucide-react';
import { SUPPORTED_COINS } from '@/config/iota.config';
import { toast } from 'sonner';
import { parseTokenAmount } from '@/lib/utils/format';
import { AMMContract } from '@/lib/contracts/amm-contract';
import { PoolTracker } from '@/lib/services/pool-tracker';

export function CreatePool() {
  const client = useIotaClient();
  const account = useCurrentAccount();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  const supportedTokens = Object.entries(SUPPORTED_COINS).map(([key, coin]) => ({
    key,
    ...coin,
  }));
  
  const handleCreatePool = async () => {
    if (!account) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!tokenA || !tokenB || !amountA || !amountB) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (tokenA === tokenB) {
      toast.error('Please select different tokens');
      return;
    }
    
    setIsCreating(true);
    
    try {
      const coinA = SUPPORTED_COINS[tokenA as keyof typeof SUPPORTED_COINS];
      const coinB = SUPPORTED_COINS[tokenB as keyof typeof SUPPORTED_COINS];
      
      const amountABigInt = parseTokenAmount(amountA, coinA.decimals);
      const amountBBigInt = parseTokenAmount(amountB, coinB.decimals);
      
      // Create transaction
      const tx = new Transaction();
      tx.setSender(account.address);
      
      // Get coins for token A
      const coinsA = await client.getCoins({
        owner: account.address,
        coinType: coinA.type,
      });
      
      if (!coinsA.data || coinsA.data.length === 0) {
        throw new Error(`Insufficient ${coinA.symbol} balance`);
      }
      
      // Get coins for token B
      const coinsB = await client.getCoins({
        owner: account.address,
        coinType: coinB.type,
      });
      
      if (!coinsB.data || coinsB.data.length === 0) {
        throw new Error(`Insufficient ${coinB.symbol} balance`);
      }
      
      // Prepare coin A
      let coinAToUse;
      if (coinA.type === SUPPORTED_COINS.IOTA.type) {
        // For IOTA, use tx.gas to avoid gas issues
        [coinAToUse] = tx.splitCoins(tx.gas, [amountABigInt]);
      } else {
        const coinARefs = coinsA.data.map(coin => tx.object(coin.coinObjectId));
        if (coinARefs.length > 1) {
          tx.mergeCoins(coinARefs[0], coinARefs.slice(1));
        }
        [coinAToUse] = tx.splitCoins(coinARefs[0], [amountABigInt]);
      }
      
      // Prepare coin B
      let coinBToUse;
      if (coinB.type === SUPPORTED_COINS.IOTA.type) {
        // For IOTA, use tx.gas to avoid gas issues
        [coinBToUse] = tx.splitCoins(tx.gas, [amountBBigInt]);
      } else {
        const coinBRefs = coinsB.data.map(coin => tx.object(coin.coinObjectId));
        if (coinBRefs.length > 1) {
          tx.mergeCoins(coinBRefs[0], coinBRefs.slice(1));
        }
        [coinBToUse] = tx.splitCoins(coinBRefs[0], [amountBBigInt]);
      }
      
      // Create pool
      AMMContract.createPool(
        tx,
        coinAToUse,
        coinBToUse,
        coinA.type,
        coinB.type
      );
      
      // Set gas budget
      tx.setGasBudget(100000000);
      
      // Execute transaction
      await new Promise((resolve, reject) => {
        signAndExecuteTransaction(
          {
            transaction: tx,
            options: {
              showEffects: true,
              showEvents: true,
            },
          },
          {
            onSuccess: (result) => {
              console.log('Pool created:', result);
              
              // Track the created pool
              if (result.objectChanges) {
                const createdPool = result.objectChanges.find(
                  change => change.type === 'created' && 
                  change.objectType.includes('::simple_dex::Pool')
                );
                
                if (createdPool) {
                  const coinA = SUPPORTED_COINS[tokenA as keyof typeof SUPPORTED_COINS];
                  const coinB = SUPPORTED_COINS[tokenB as keyof typeof SUPPORTED_COINS];
                  
                  console.log('Pool created with ID:', createdPool.objectId);
                  PoolTracker.addPool(createdPool.objectId, coinA.type, coinB.type, 'testnet');
                  
                  // Dispatch pool refresh event
                  window.dispatchEvent(new Event('pool-cache-refresh'));
                }
              }
              
              toast.success('Pool created successfully!', {
                description: `Transaction: ${result.digest.slice(0, 10)}...`,
              });
              // Reset form
              setAmountA('');
              setAmountB('');
              resolve(result);
            },
            onError: (error) => {
              console.error('Transaction failed:', error);
              reject(error);
            },
          }
        );
      });
    } catch (error) {
      console.error('Failed to create pool:', error);
      toast.error('Failed to create pool', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsCreating(false);
    }
  };
  
  const calculateInitialPrice = () => {
    if (!amountA || !amountB || parseFloat(amountA) === 0) return '0';
    return (parseFloat(amountB) / parseFloat(amountA)).toFixed(6);
  };
  
  return (
    <Card className="bg-black/40 border-white/10 max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
          <Plus className="w-6 h-6 text-cyan-400" />
          Create Liquidity Pool
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-cyan-500/10 border-cyan-500/20">
          <AlertCircle className="h-4 w-4 text-cyan-400" />
          <AlertDescription className="text-gray-300">
            Creating a pool requires an initial deposit of both tokens. You'll receive LP tokens representing your share of the pool.
          </AlertDescription>
        </Alert>
        
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tokenA" className="text-gray-300">Token A</Label>
            <Select value={tokenA} onValueChange={setTokenA}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {supportedTokens.map((token) => (
                  <SelectItem 
                    key={token.key} 
                    value={token.key}
                    className="text-white hover:bg-white/10"
                    disabled={token.key === tokenB}
                  >
                    {token.symbol} - {token.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amountA" className="text-gray-300">Amount A</Label>
            <Input
              id="amountA"
              type="number"
              placeholder="0.0"
              value={amountA}
              onChange={(e) => setAmountA(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tokenB" className="text-gray-300">Token B</Label>
            <Select value={tokenB} onValueChange={setTokenB}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10">
                {supportedTokens.map((token) => (
                  <SelectItem 
                    key={token.key} 
                    value={token.key}
                    className="text-white hover:bg-white/10"
                    disabled={token.key === tokenA}
                  >
                    {token.symbol} - {token.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="amountB" className="text-gray-300">Amount B</Label>
            <Input
              id="amountB"
              type="number"
              placeholder="0.0"
              value={amountB}
              onChange={(e) => setAmountB(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
        </div>
        
        {tokenA && tokenB && amountA && amountB && (
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <div className="text-sm text-gray-400 mb-2">Initial Price</div>
            <div className="text-lg font-semibold text-white">
              1 {SUPPORTED_COINS[tokenA as keyof typeof SUPPORTED_COINS]?.symbol} = {calculateInitialPrice()} {SUPPORTED_COINS[tokenB as keyof typeof SUPPORTED_COINS]?.symbol}
            </div>
          </div>
        )}
        
        <Button
          onClick={handleCreatePool}
          disabled={isCreating || !account || !tokenA || !tokenB || !amountA || !amountB}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-6 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          data-testid="create-pool-button"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating Pool...
            </>
          ) : (
            'Create Pool'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}