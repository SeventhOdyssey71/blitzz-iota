'use client';

import { extractLiquidityFromTransaction } from './extract-liquidity-from-tx';
import { refreshPoolCache } from './pool-refresh';

// Store processed transactions to avoid duplicates
const PROCESSED_TXS_KEY = 'blitz_processed_liquidity_txs';
const MAX_STORED_TXS = 100;

export class LiquidityMonitor {
  private static instance: LiquidityMonitor;
  private processedTxs: Set<string>;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  private constructor() {
    // Load processed transactions from localStorage
    const stored = localStorage.getItem(PROCESSED_TXS_KEY);
    this.processedTxs = new Set(stored ? JSON.parse(stored) : []);
  }
  
  static getInstance(): LiquidityMonitor {
    if (!LiquidityMonitor.instance) {
      LiquidityMonitor.instance = new LiquidityMonitor();
    }
    return LiquidityMonitor.instance;
  }
  
  // Process a specific transaction
  async processTransaction(txDigest: string): Promise<boolean> {
    if (this.processedTxs.has(txDigest)) {
      console.log('Transaction already processed:', txDigest);
      return false;
    }
    
    console.log('Processing liquidity transaction:', txDigest);
    const result = await extractLiquidityFromTransaction(txDigest);
    
    if (result.success) {
      this.markAsProcessed(txDigest);
      console.log('Liquidity addition detected and processed:', result);
      
      // Refresh pool cache to update UI
      await refreshPoolCache();
      
      // Emit event for UI components
      window.dispatchEvent(new CustomEvent('pool-liquidity-updated', {
        detail: {
          poolId: result.poolId,
          txDigest,
          ...result.poolInfo
        }
      }));
      
      return true;
    }
    
    return false;
  }
  
  // Mark transaction as processed
  private markAsProcessed(txDigest: string) {
    this.processedTxs.add(txDigest);
    
    // Limit stored transactions
    if (this.processedTxs.size > MAX_STORED_TXS) {
      const txsArray = Array.from(this.processedTxs);
      this.processedTxs = new Set(txsArray.slice(-MAX_STORED_TXS));
    }
    
    // Save to localStorage
    localStorage.setItem(PROCESSED_TXS_KEY, JSON.stringify(Array.from(this.processedTxs)));
  }
  
  // Process multiple transactions
  async processTransactions(txDigests: string[]) {
    const results = await Promise.all(
      txDigests.map(tx => this.processTransaction(tx))
    );
    
    const successCount = results.filter(r => r).length;
    console.log(`Processed ${successCount} liquidity additions out of ${txDigests.length} transactions`);
    
    return successCount;
  }
  
  // Start monitoring for new liquidity events
  startMonitoring(intervalMs: number = 30000) {
    if (this.monitoringInterval) {
      console.log('Liquidity monitoring already active');
      return;
    }
    
    console.log('Starting liquidity monitoring...');
    
    // Initial check
    this.checkRecentTransactions();
    
    // Set up interval
    this.monitoringInterval = setInterval(() => {
      this.checkRecentTransactions();
    }, intervalMs);
  }
  
  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Liquidity monitoring stopped');
    }
  }
  
  // Check recent transactions (placeholder - would need transaction history API)
  private async checkRecentTransactions() {
    // In a real implementation, this would:
    // 1. Query recent transactions from the blockchain
    // 2. Filter for transactions involving known pools
    // 3. Process any liquidity additions
    
    console.log('Checking for recent liquidity additions...');
    await refreshPoolCache();
  }
  
  // Manual transaction processing helper
  static async processLiquidityTx(txDigest: string) {
    const monitor = LiquidityMonitor.getInstance();
    return monitor.processTransaction(txDigest);
  }
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).LiquidityMonitor = LiquidityMonitor;
  (window as any).processLiquidityTx = LiquidityMonitor.processLiquidityTx;
}