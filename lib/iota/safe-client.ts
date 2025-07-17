'use client';

import { IotaClient } from '@iota/iota-sdk/client';
import { IOTA_NETWORKS, DEFAULT_NETWORK } from '@/config/iota.config';

// Wrapper for IotaClient with built-in error handling and retry logic
export class SafeIotaClient {
  private client: IotaClient;
  private network: keyof typeof IOTA_NETWORKS;
  
  constructor(network: keyof typeof IOTA_NETWORKS = DEFAULT_NETWORK) {
    this.network = network;
    this.client = new IotaClient({ url: IOTA_NETWORKS[network].rpcUrl });
  }
  
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T | null> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === maxRetries - 1) {
          console.error('Operation failed after retries:', error);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    return null;
  }
  
  async getObject(params: Parameters<IotaClient['getObject']>[0]) {
    return this.withRetry(() => this.client.getObject(params));
  }
  
  async getTransactionBlock(params: Parameters<IotaClient['getTransactionBlock']>[0]) {
    return this.withRetry(() => this.client.getTransactionBlock(params));
  }
  
  async getCoins(params: Parameters<IotaClient['getCoins']>[0]) {
    return this.withRetry(() => this.client.getCoins(params));
  }
  
  async queryTransactionBlocks(params: Parameters<IotaClient['queryTransactionBlocks']>[0]) {
    return this.withRetry(() => this.client.queryTransactionBlocks(params));
  }
  
  async getBalance(params: Parameters<IotaClient['getBalance']>[0]) {
    return this.withRetry(() => this.client.getBalance(params));
  }
  
  async getAllBalances(params: Parameters<IotaClient['getAllBalances']>[0]) {
    return this.withRetry(() => this.client.getAllBalances(params));
  }
  
  async getCoinMetadata(params: Parameters<IotaClient['getCoinMetadata']>[0]) {
    return this.withRetry(() => this.client.getCoinMetadata(params));
  }
  
  // Expose the raw client for cases where direct access is needed
  getRawClient(): IotaClient {
    return this.client;
  }
}

// Singleton instances
let safeClients: Record<string, SafeIotaClient> = {};

export function getSafeIotaClient(network: keyof typeof IOTA_NETWORKS = DEFAULT_NETWORK): SafeIotaClient {
  if (!safeClients[network]) {
    safeClients[network] = new SafeIotaClient(network);
  }
  return safeClients[network];
}