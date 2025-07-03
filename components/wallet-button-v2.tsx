'use client';

import { 
  useCurrentAccount,
  useCurrentWallet,
  useConnectWallet,
  useDisconnectWallet,
  useAccounts,
  ConnectModal
} from '@iota/dapp-kit';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Wallet, Copy, LogOut } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function WalletButtonV2() {
  const currentAccount = useCurrentAccount();
  const currentWallet = useCurrentWallet();
  const accounts = useAccounts();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const isConnected = !!currentAccount && !!currentWallet;

  const handleConnect = () => {
    setShowConnectModal(true);
  };

  const handleDisconnect = () => {
    disconnect(undefined, {
      onSuccess: () => {
        setIsOpen(false);
        toast.success('Wallet disconnected');
      },
      onError: (error) => {
        console.error('Failed to disconnect wallet:', error);
        toast.error('Failed to disconnect wallet');
      }
    });
  };

  const copyAddress = () => {
    if (currentAccount?.address) {
      navigator.clipboard.writeText(currentAccount.address);
      toast.success('Address copied to clipboard');
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <>
        <Button 
          onClick={handleConnect}
          className="btn-primary px-5 py-2 rounded-xl font-medium tracking-wide"
          aria-label="Connect Wallet"
          data-wallet-button="connect"
        >
          <Wallet className="w-4 h-4 mr-2" />
          Connect Wallet
        </Button>
        <ConnectModal
          open={showConnectModal}
          onOpenChange={(open) => setShowConnectModal(open)}
        />
      </>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-black/50 border-white/10 hover:border-cyan-500/50 text-gray-300 hover:text-cyan-400 transition-all rounded-xl">
          <Wallet className="w-4 h-4 mr-2" />
          {formatAddress(currentAccount.address)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-black/90 border-white/10 shadow-2xl rounded-xl">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Connected Account</p>
          <p className="text-xs text-gray-500 mt-1 break-all">
            {currentAccount.address}
          </p>
          {currentWallet?.name && (
            <p className="text-xs text-gray-500 mt-1">
              via {currentWallet.name}
            </p>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="w-4 h-4 mr-2" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDisconnect} className="text-red-600">
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}