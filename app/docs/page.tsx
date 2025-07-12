'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { 
  Book, 
  Rocket, 
  Coins, 
  ArrowRightLeft, 
  TrendingUp, 
  Shield, 
  Code, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Documentation</h1>
        <p className="text-gray-400 text-lg">
          Everything you need to know about the IOTA DeFi Platform
        </p>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer group">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                <Rocket className="w-5 h-5 text-cyan-400" />
              </div>
              <CardTitle className="text-lg text-white">Getting Started</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-3">
              Connect your wallet and make your first swap in minutes
            </p>
            <Link href="#getting-started" className="text-cyan-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
              Learn more <ChevronRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer group">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
              </div>
              <CardTitle className="text-lg text-white">Swaps</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-3">
              Instant token swaps with minimal fees and slippage protection
            </p>
            <Link href="#swaps" className="text-cyan-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
              Learn more <ChevronRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer group">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:bg-cyan-500/20 transition-colors">
                <Coins className="w-5 h-5 text-cyan-400" />
              </div>
              <CardTitle className="text-lg text-white">Liquidity Pools</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-3">
              Provide liquidity and earn fees from every trade
            </p>
            <Link href="#pools" className="text-cyan-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
              Learn more <ChevronRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="space-y-12">
        {/* Getting Started */}
        <section id="getting-started">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Rocket className="w-6 h-6 text-cyan-400" />
            Getting Started
          </h2>
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">1. Connect Your Wallet</h3>
                <p className="text-gray-400">
                  Click the "Connect Wallet" button in the top right corner. We support all major IOTA wallets.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2. Select Network</h3>
                <p className="text-gray-400">
                  Make sure you're on the correct network (Mainnet or Testnet). The platform will automatically detect your network.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">3. Start Trading</h3>
                <p className="text-gray-400">
                  You're ready to swap tokens, provide liquidity, or set up advanced trading strategies!
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Swaps */}
        <section id="swaps">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <ArrowRightLeft className="w-6 h-6 text-cyan-400" />
            Token Swaps
          </h2>
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-400">
                Our AMM (Automated Market Maker) enables instant token swaps with competitive rates.
              </p>
              
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">How to Swap</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Select the token you want to swap from</li>
                  <li>Select the token you want to receive</li>
                  <li>Enter the amount</li>
                  <li>Review the exchange rate and fees</li>
                  <li>Click "Swap" and confirm in your wallet</li>
                </ol>
              </div>

              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <h4 className="text-white font-medium">Supported Pairs</h4>
                <ul className="space-y-1 text-gray-400 text-sm">
                  <li>• IOTA ↔ stIOTA (1:1 staking/unstaking)</li>
                  <li>• IOTA ↔ vUSD</li>
                  <li>• stIOTA ↔ vUSD</li>
                </ul>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-400 text-sm">
                  <strong>Note:</strong> The IOTA/stIOTA pool allows bidirectional swaps. You can swap from IOTA to stIOTA and from stIOTA back to IOTA using the same pool.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Pools */}
        <section id="pools">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Coins className="w-6 h-6 text-cyan-400" />
            Liquidity Pools
          </h2>
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-400">
                Provide liquidity to earn a share of trading fees. Our pools use the constant product formula (x*y=k).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Adding Liquidity</h4>
                  <ul className="space-y-1 text-gray-400 text-sm">
                    <li>• Deposit equal value of both tokens</li>
                    <li>• Receive LP tokens as receipt</li>
                    <li>• Earn 0.25% of all trades</li>
                    <li>• Compound fees automatically</li>
                  </ul>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Removing Liquidity</h4>
                  <ul className="space-y-1 text-gray-400 text-sm">
                    <li>• Burn LP tokens</li>
                    <li>• Receive proportional share</li>
                    <li>• Get accumulated fees</li>
                    <li>• No withdrawal fees</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  <strong>Impermanent Loss:</strong> Providing liquidity carries risk. When token prices diverge, you may experience temporary loss compared to holding tokens separately.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Technical Details */}
        <section id="technical">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Code className="w-6 h-6 text-cyan-400" />
            Technical Details
          </h2>
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Smart Contracts</h3>
                <p className="text-gray-400 mb-3">
                  Built with Move language on IOTA blockchain for maximum security and efficiency.
                </p>
                <div className="bg-black/60 rounded-lg p-4 font-mono text-sm">
                  <p className="text-gray-400">Package ID (Testnet):</p>
                  <p className="text-cyan-400 break-all">0x3bd65c62e0e4022f2f34b3a02056a4ac5c0e52d5c4a90fa87cb28b0b3b021f7f</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Fee Structure</h3>
                <ul className="space-y-1 text-gray-400">
                  <li>• Swap Fee: 0.3% (0.25% to LPs, 0.05% to protocol)</li>
                  <li>• No deposit or withdrawal fees</li>
                  <li>• Gas fees paid in IOTA</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Security */}
        <section id="security">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-cyan-400" />
            Security
          </h2>
          <Card className="bg-black/40 border-white/10">
            <CardContent className="p-6 space-y-4">
              <p className="text-gray-400">
                Security is our top priority. All smart contracts are open source and thoroughly tested.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-medium mb-2">Audits</h4>
                  <p className="text-gray-400 text-sm">
                    Smart contracts audited by leading security firms
                  </p>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Bug Bounty</h4>
                  <p className="text-gray-400 text-sm">
                    Active bug bounty program for responsible disclosure
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Links */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Additional Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              href="https://github.com/iota-defi" 
              target="_blank"
              className="flex items-center gap-3 p-4 bg-black/40 border border-white/10 rounded-lg hover:border-cyan-500/30 transition-all group"
            >
              <Code className="w-5 h-5 text-cyan-400" />
              <div className="flex-1">
                <h4 className="text-white font-medium">GitHub</h4>
                <p className="text-gray-400 text-sm">View source code</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </Link>
            
            <Link 
              href="https://discord.gg/iota" 
              target="_blank"
              className="flex items-center gap-3 p-4 bg-black/40 border border-white/10 rounded-lg hover:border-cyan-500/30 transition-all group"
            >
              <Book className="w-5 h-5 text-cyan-400" />
              <div className="flex-1">
                <h4 className="text-white font-medium">Community</h4>
                <p className="text-gray-400 text-sm">Join our Discord</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}