'use client';

import { createNetworkConfig, IotaClientProvider, WalletProvider } from '@iota/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { IOTA_NETWORKS, DEFAULT_NETWORK } from '@/config/iota.config';
import '@iota/dapp-kit/dist/index.css';

const { networkConfig } = createNetworkConfig({
  mainnet: { url: IOTA_NETWORKS.mainnet.rpcUrl },
  testnet: { url: IOTA_NETWORKS.testnet.rpcUrl },
  devnet: { url: IOTA_NETWORKS.devnet.rpcUrl },
});

const queryClient = new QueryClient();

export function IotaProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <IotaClientProvider networks={networkConfig} defaultNetwork={DEFAULT_NETWORK}>
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </IotaClientProvider>
    </QueryClientProvider>
  );
}