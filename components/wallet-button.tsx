'use client';

import { 
  useCurrentAccount,
  useConnectWallet,
  useDisconnectWallet,
  useAccounts 
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

export function WalletButton() {
  const currentAccount = useCurrentAccount();
  const accounts = useAccounts();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  const isConnected = !!currentAccount;
  const [isOpen, setIsOpen] = useState(false);

  const handleConnect = () => {
    try {
      connect();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    try {
      disconnect();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
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

  if (!isConnected || !currentAccount) {
    return (
      <Button 
        onClick={handleConnect}
        className="bg-black hover:bg-gray-800 text-white"
        aria-label="Connect Wallet"
      >
        <Wallet className="w-4 h-4 mr-2" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-gray-300">
          <Wallet className="w-4 h-4 mr-2" />
          {formatAddress(currentAccount.address)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Connected Account</p>
          <p className="text-xs text-gray-500 mt-1 break-all">
            {currentAccount.address}
          </p>
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