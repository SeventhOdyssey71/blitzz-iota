'use client';

import { useState, useEffect } from 'react';
import { useIotaClient } from '@iota/dapp-kit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Copy,
  Loader2,
  Info,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatBalance } from '@/lib/utils/format';
import { SUPPORTED_COINS } from '@/config/iota.config';

interface SwapEvent {
  type: string;
  pool_id: string;
  amount_in: string;
  amount_out: string;
  coin_type_in?: string;
  coin_type_out?: string;
  sender?: string;
}

interface TransactionDetails {
  digest: string;
  status: 'success' | 'failure' | 'pending';
  timestampMs?: string;
  checkpoint?: string;
  gasUsed?: {
    computationCost: string;
    storageCost: string;
    storageRebate: string;
    totalCost: string;
  };
  sender: string;
  events: any[];
  balanceChanges?: any[];
  objectChanges?: any[];
  error?: string;
}

interface SwapDetails {
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  executionPrice: number;
  priceImpact: number;
  poolId: string;
  timestamp: Date;
}

interface SwapTransactionPanelProps {
  txHash: string;
  isOpen: boolean;
  onClose: () => void;
  expectedInputAmount?: string;
  expectedOutputAmount?: string;
  inputTokenSymbol?: string;
  outputTokenSymbol?: string;
}

export function SwapTransactionPanel({
  txHash,
  isOpen,
  onClose,
  expectedInputAmount,
  expectedOutputAmount,
  inputTokenSymbol,
  outputTokenSymbol,
}: SwapTransactionPanelProps) {
  const client = useIotaClient();
  const [isLoading, setIsLoading] = useState(true);
  const [txDetails, setTxDetails] = useState<TransactionDetails | null>(null);
  const [swapDetails, setSwapDetails] = useState<SwapDetails | null>(null);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (isOpen && txHash) {
      fetchTransactionDetails();
    }
  }, [isOpen, txHash]);

  const fetchTransactionDetails = async () => {
    setIsLoading(true);
    try {
      const tx = await client.getTransactionBlock({
        digest: txHash,
        options: {
          showInput: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
        },
      });

      console.log('Transaction details:', tx);

      // Parse transaction status
      const status = tx.effects?.status?.status || 'pending';
      const error = tx.effects?.status?.error;

      const details: TransactionDetails = {
        digest: tx.digest,
        status: status as any,
        timestampMs: tx.timestampMs,
        checkpoint: tx.checkpoint,
        sender: tx.transaction?.data?.sender || '',
        events: tx.events || [],
        balanceChanges: tx.balanceChanges || [],
        objectChanges: tx.objectChanges || [],
        error,
        gasUsed: tx.effects?.gasUsed ? {
          computationCost: tx.effects.gasUsed.computationCost,
          storageCost: tx.effects.gasUsed.storageCost,
          storageRebate: tx.effects.gasUsed.storageRebate,
          totalCost: (
            BigInt(tx.effects.gasUsed.computationCost) +
            BigInt(tx.effects.gasUsed.storageCost) -
            BigInt(tx.effects.gasUsed.storageRebate)
          ).toString(),
        } : undefined,
      };

      setTxDetails(details);

      // Parse swap details from events
      if (status === 'success') {
        const swapEvent = tx.events?.find(event => 
          event.type.includes('SwapEvent') || 
          event.type.includes('swap_event') ||
          event.type.includes('Swapped')
        );

        if (swapEvent && swapEvent.parsedJson) {
          const eventData = swapEvent.parsedJson as SwapEvent;
          const swap = parseSwapDetails(eventData, tx);
          setSwapDetails(swap);
        } else {
          // Fallback: try to parse from balance changes
          const swap = parseSwapFromBalanceChanges(tx);
          setSwapDetails(swap);
        }
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast.error('Failed to fetch transaction details');
    } finally {
      setIsLoading(false);
    }
  };

  const parseSwapDetails = (event: SwapEvent, tx: any): SwapDetails => {
    const inputAmount = event.amount_in;
    const outputAmount = event.amount_out;
    
    // Calculate execution price
    const executionPrice = parseFloat(outputAmount) / parseFloat(inputAmount);
    
    // Calculate price impact (simplified - would need market price for accurate calculation)
    const priceImpact = 0; // Placeholder

    return {
      inputToken: getCoinSymbol(event.coin_type_in || ''),
      outputToken: getCoinSymbol(event.coin_type_out || ''),
      inputAmount,
      outputAmount,
      executionPrice,
      priceImpact,
      poolId: event.pool_id,
      timestamp: new Date(parseInt(tx.timestampMs || '0')),
    };
  };

  const parseSwapFromBalanceChanges = (tx: any): SwapDetails | null => {
    const balanceChanges = tx.balanceChanges || [];
    
    // Find negative balance change (input)
    const inputChange = balanceChanges.find((change: any) => 
      change.owner?.AddressOwner === tx.transaction?.data?.sender && 
      BigInt(change.amount) < 0n
    );
    
    // Find positive balance change (output)
    const outputChange = balanceChanges.find((change: any) => 
      change.owner?.AddressOwner === tx.transaction?.data?.sender && 
      BigInt(change.amount) > 0n &&
      change.coinType !== inputChange?.coinType
    );

    if (!inputChange || !outputChange) return null;

    const inputAmount = Math.abs(parseInt(inputChange.amount)).toString();
    const outputAmount = outputChange.amount;

    return {
      inputToken: getCoinSymbol(inputChange.coinType),
      outputToken: getCoinSymbol(outputChange.coinType),
      inputAmount,
      outputAmount,
      executionPrice: parseFloat(outputAmount) / parseFloat(inputAmount),
      priceImpact: 0,
      poolId: '',
      timestamp: new Date(parseInt(tx.timestampMs || '0')),
    };
  };

  const getCoinSymbol = (coinType: string): string => {
    for (const [symbol, config] of Object.entries(SUPPORTED_COINS)) {
      if (coinType.includes(config.type)) {
        return symbol;
      }
    }
    return coinType.split('::').pop() || 'Unknown';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const formatGasAmount = (amount: string) => {
    return formatBalance(amount, 9) + ' IOTA';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-black/90 border-white/10">
        <CardHeader className="border-b border-white/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-white">
              Swap Transaction Details
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
          ) : txDetails ? (
            <>
              {/* Status Banner */}
              <div className={`p-4 ${
                txDetails.status === 'success' 
                  ? 'bg-green-500/10 border-b border-green-500/20' 
                  : txDetails.status === 'failure'
                  ? 'bg-red-500/10 border-b border-red-500/20'
                  : 'bg-yellow-500/10 border-b border-yellow-500/20'
              }`}>
                <div className="flex items-center gap-3">
                  {txDetails.status === 'success' ? (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  ) : txDetails.status === 'failure' ? (
                    <XCircle className="w-6 h-6 text-red-500" />
                  ) : (
                    <Clock className="w-6 h-6 text-yellow-500" />
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">
                      Transaction {txDetails.status === 'success' ? 'Successful' : txDetails.status === 'failure' ? 'Failed' : 'Pending'}
                    </h3>
                    {txDetails.error && (
                      <p className="text-red-400 text-sm mt-1">{txDetails.error}</p>
                    )}
                  </div>
                  <Badge variant={txDetails.status === 'success' ? 'default' : txDetails.status === 'failure' ? 'destructive' : 'secondary'}>
                    {txDetails.status.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full bg-black/50 border-b border-white/10 rounded-none">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="technical" className="flex-1">Technical</TabsTrigger>
                  <TabsTrigger value="events" className="flex-1">Events</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="p-6 space-y-6">
                  {/* Transaction Hash */}
                  <div>
                    <label className="text-gray-400 text-sm">Transaction Hash</label>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-white font-mono text-sm bg-white/5 px-3 py-2 rounded-lg flex-1 overflow-hidden text-ellipsis">
                        {txHash}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(txHash)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        className="text-gray-400 hover:text-white"
                      >
                        <a
                          href={`https://explorer.iota.org/testnet/txblock/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {/* Swap Details */}
                  {swapDetails && (
                    <div className="space-y-4">
                      <h4 className="text-white font-semibold">Swap Summary</h4>
                      
                      {/* Token Flow */}
                      <div className="bg-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 text-center">
                            <p className="text-gray-400 text-sm mb-1">You Paid</p>
                            <p className="text-white font-bold text-xl font-mono">
                              {formatBalance(swapDetails.inputAmount, 9)}
                            </p>
                            <p className="text-cyan-400 font-medium">{swapDetails.inputToken}</p>
                          </div>
                          
                          <ArrowRight className="w-6 h-6 text-gray-400" />
                          
                          <div className="flex-1 text-center">
                            <p className="text-gray-400 text-sm mb-1">You Received</p>
                            <p className="text-white font-bold text-xl font-mono">
                              {formatBalance(swapDetails.outputAmount, 9)}
                            </p>
                            <p className="text-cyan-400 font-medium">{swapDetails.outputToken}</p>
                          </div>
                        </div>
                      </div>

                      {/* Execution Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-gray-400 text-sm">Execution Price</p>
                          <p className="text-white font-mono">
                            1 {swapDetails.inputToken} = {swapDetails.executionPrice.toFixed(6)} {swapDetails.outputToken}
                          </p>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-3">
                          <p className="text-gray-400 text-sm">Timestamp</p>
                          <p className="text-white font-mono">
                            {swapDetails.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Expected vs Actual (if provided) */}
                      {expectedOutputAmount && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-yellow-500" />
                            <h5 className="text-yellow-400 font-medium">Slippage Analysis</h5>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Expected Output:</span>
                              <span className="text-white font-mono">{formatBalance(expectedOutputAmount, 9)} {outputTokenSymbol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Actual Output:</span>
                              <span className="text-white font-mono">{formatBalance(swapDetails.outputAmount, 9)} {swapDetails.outputToken}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Difference:</span>
                              <span className={`font-mono ${
                                BigInt(swapDetails.outputAmount) >= BigInt(expectedOutputAmount || '0')
                                  ? 'text-green-400'
                                  : 'text-red-400'
                              }`}>
                                {BigInt(swapDetails.outputAmount) >= BigInt(expectedOutputAmount || '0') ? '+' : ''}
                                {formatBalance(
                                  (BigInt(swapDetails.outputAmount) - BigInt(expectedOutputAmount || '0')).toString(),
                                  9
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gas Usage */}
                  {txDetails.gasUsed && (
                    <div className="space-y-4">
                      <h4 className="text-white font-semibold">Gas Usage</h4>
                      <div className="bg-white/5 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Computation Cost:</span>
                          <span className="text-white font-mono">{formatGasAmount(txDetails.gasUsed.computationCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Storage Cost:</span>
                          <span className="text-white font-mono">{formatGasAmount(txDetails.gasUsed.storageCost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Storage Rebate:</span>
                          <span className="text-green-400 font-mono">-{formatGasAmount(txDetails.gasUsed.storageRebate)}</span>
                        </div>
                        <div className="border-t border-white/10 pt-2 flex justify-between font-semibold">
                          <span className="text-white">Total Gas Cost:</span>
                          <span className="text-white font-mono">{formatGasAmount(txDetails.gasUsed.totalCost)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="technical" className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-400 text-sm">Sender</label>
                      <code className="text-white font-mono text-sm bg-white/5 px-3 py-2 rounded-lg block mt-1">
                        {txDetails.sender}
                      </code>
                    </div>
                    
                    {txDetails.checkpoint && (
                      <div>
                        <label className="text-gray-400 text-sm">Checkpoint</label>
                        <code className="text-white font-mono text-sm bg-white/5 px-3 py-2 rounded-lg block mt-1">
                          {txDetails.checkpoint}
                        </code>
                      </div>
                    )}

                    {/* Balance Changes */}
                    {txDetails.balanceChanges && txDetails.balanceChanges.length > 0 && (
                      <div>
                        <h4 className="text-white font-semibold mb-3">Balance Changes</h4>
                        <div className="space-y-2">
                          {txDetails.balanceChanges.map((change: any, idx: number) => (
                            <div key={idx} className="bg-white/5 rounded-lg p-3">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 font-mono text-sm">
                                  {getCoinSymbol(change.coinType)}
                                </span>
                                <span className={`font-mono ${
                                  BigInt(change.amount) > 0n ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {BigInt(change.amount) > 0n ? '+' : ''}
                                  {formatBalance(change.amount, 9)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="events" className="p-6">
                  {txDetails.events && txDetails.events.length > 0 ? (
                    <div className="space-y-3">
                      {txDetails.events.map((event: any, idx: number) => (
                        <div key={idx} className="bg-white/5 rounded-lg p-4">
                          <div className="font-mono text-sm text-cyan-400 mb-2">
                            {event.type.split('::').slice(-1)[0]}
                          </div>
                          {event.parsedJson && (
                            <pre className="text-gray-300 text-xs overflow-auto">
                              {JSON.stringify(event.parsedJson, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-center py-8">No events emitted</p>
                  )}
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-400">Failed to load transaction details</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}