'use client';

import { ConnectButton } from '@iota/dapp-kit';
import { Button } from '@/components/ui/button';

export function WalletButtonSimple() {
  return (
    <ConnectButton 
      className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg"
    />
  );
}