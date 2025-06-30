'use client';

import { IotaClient } from '@iota/iota-sdk/client';
import { IOTA_NETWORKS, DEFAULT_NETWORK } from '@/config/iota.config';

// Use a singleton pattern for the client
let clients: Record<string, IotaClient> | null = null;

export function getIotaClient(network: keyof typeof IOTA_NETWORKS = DEFAULT_NETWORK): IotaClient {
  // Initialize clients object lazily
  if (!clients) {
    clients = {};
  }
  
  if (!clients[network]) {
    const rpcUrl = IOTA_NETWORKS[network].rpcUrl;
    clients[network] = new IotaClient({ url: rpcUrl });
  }
  return clients[network];
}

export function setNetwork(network: keyof typeof IOTA_NETWORKS) {
  // Clear the cached client for the network to force a new connection
  delete clients[network];
}

export async function getBalance(address: string, coinType?: string) {
  const client = getIotaClient();
  
  if (coinType) {
    const balance = await client.getBalance({
      owner: address,
      coinType,
    });
    return balance;
  }
  
  const balances = await client.getAllBalances({ owner: address });
  return balances;
}

export async function getCoinMetadata(coinType: string) {
  const client = getIotaClient();
  try {
    const metadata = await client.getCoinMetadata({ coinType });
    return metadata;
  } catch (error) {
    console.error('Failed to get coin metadata:', error);
    return null;
  }
}