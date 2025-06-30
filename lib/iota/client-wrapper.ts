'use client';

import { IotaClient } from '@iota/iota-sdk/client';
import { IOTA_NETWORKS, DEFAULT_NETWORK } from '@/config/iota.config';

// Use a singleton pattern for the client
let clients: Record<string, IotaClient> | null = null;

export function getIotaClientSafe(network: keyof typeof IOTA_NETWORKS = DEFAULT_NETWORK): IotaClient | null {
  // Always return a client, as this is marked 'use client'
  // Initialize clients object lazily
  if (!clients) {
    clients = {};
  }
  
  if (!clients[network]) {
    const rpcUrl = IOTA_NETWORKS[network].rpcUrl;
    try {
      clients[network] = new IotaClient({ url: rpcUrl });
    } catch (error) {
      console.error('Failed to create IotaClient:', error);
      return null;
    }
  }
  return clients[network];
}