'use client';

import { useState } from 'react';
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
  ChevronRight,
  ChevronDown,
  Home,
  FileText,
  Settings,
  HelpCircle,
  GitBranch,
  Users,
  Zap,
  Database,
  Globe,
  Terminal
} from 'lucide-react';

export default function DocsPage() {
  const [expandedSections, setExpandedSections] = useState<string[]>(['getting-started']);
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const navigation = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Home,
      items: [
        { title: 'What is IOTA DeFi?', href: '#about' },
        { title: 'Official Links', href: '#links' },
      ]
    },
    {
      id: 'using-platform',
      title: 'Using the Platform',
      icon: Zap,
      items: [
        { title: 'Connect Wallet', href: '#connect' },
        { title: 'Swapping Tokens', href: '#swap' },
        { title: 'Providing Liquidity', href: '#liquidity' },
        { title: 'Limit Orders', href: '#limit' },
        { title: 'DCA Strategy', href: '#dca' },
      ]
    },
    {
      id: 'protocol-design',
      title: 'Protocol Design',
      icon: Database,
      items: [
        { title: 'AMM Architecture', href: '#amm' },
        { title: 'Smart Contracts', href: '#contracts' },
        { title: 'Tokenomics', href: '#tokenomics' },
      ]
    },
    {
      id: 'security',
      title: 'Security',
      icon: Shield,
      items: [
        { title: 'Audits', href: '#audits' },
        { title: 'Bug Bounty', href: '#bounty' },
        { title: 'Best Practices', href: '#practices' },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-black">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-black/40 border-r border-white/10 p-6 sticky top-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Book className="w-6 h-6" />
              DOCS
            </h2>
          </div>
          
          <nav className="space-y-6">
            {navigation.map((section) => (
              <div key={section.id}>
                <button
                  onClick={() => toggleSection(section.id)}
                  className="flex items-center justify-between w-full text-left text-white hover:text-cyan-400 transition-colors mb-2"
                >
                  <div className="flex items-center gap-2">
                    <section.icon className="w-4 h-4" />
                    <span className="font-medium">{section.title}</span>
                  </div>
                  {expandedSections.includes(section.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {expandedSections.includes(section.id) && (
                  <ul className="ml-6 space-y-2">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="text-gray-400 hover:text-cyan-400 text-sm transition-colors block py-1"
                        >
                          {item.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </nav>
          
          {/* Additional Links */}
          <div className="mt-12 pt-6 border-t border-white/10">
            <Link 
              href="https://github.com/iota-defi" 
              target="_blank"
              className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-sm mb-3"
            >
              <GitBranch className="w-4 h-4" />
              GitHub
            </Link>
            <Link 
              href="https://discord.gg/iota" 
              target="_blank"
              className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors text-sm"
            >
              <Users className="w-4 h-4" />
              Community
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            {/* Header Section */}
            <div id="about" className="mb-12">
              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl p-8 mb-8 backdrop-blur-sm border border-cyan-500/20">
                <div className="text-sm text-cyan-400 mb-2">About</div>
                <h1 className="text-4xl font-bold text-white mb-6">What is IOTA DeFi?</h1>
                <p className="text-gray-300 text-lg leading-relaxed mb-6">
                  IOTA DeFi Protocol is a next-generation decentralized exchange (DEX) built on the IOTA network using the 
                  Move programming language. It combines the best of classic v2-style AMMs and stable liquidity pools, 
                  enabling users to swap tokens, provide liquidity, and stake LP tokens for additional rewards — all 
                  through a lightweight and auditable on-chain architecture.
                </p>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white mb-3">What can you do on IOTA DeFi?</h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                      <span className="text-gray-300">Swap tokens instantly using classic or stable pools</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                      <span className="text-gray-300">Provide liquidity to earn a share of trading fees</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                      <span className="text-gray-300">Stake LP tokens in farms for extra rewards</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                      <span className="text-gray-300">Create and configure pools with customizable fee settings</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                      <span className="text-gray-300">Trade with slippage protection and minimal gas</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                      <span className="text-gray-300">Participate in protocol governance (future upgrade)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                      <span className="text-gray-300">Rely on audited smart contracts for safety and transparency</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Navigation Cards */}
              <div className="flex gap-4 mb-8">
                <Link href="#getting-started" className="flex-1">
                  <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all p-4 text-center group">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Previous</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 rotate-180" />
                    </div>
                    <p className="text-white font-medium mt-1">Getting Started</p>
                  </Card>
                </Link>
                
                <Link href="#links" className="flex-1">
                  <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all p-4 text-center group">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">Next</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-cyan-400" />
                    </div>
                    <p className="text-white font-medium mt-1">Official Links</p>
                  </Card>
                </Link>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                      <ArrowRightLeft className="w-6 h-6 text-cyan-400" />
                    </div>
                    <CardTitle className="text-lg text-white">Token Swaps</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">
                    Instant swaps with minimal fees, MEV protection, and smart routing through multiple pools.
                  </p>
                  <Link href="#swap" className="text-cyan-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                      <Coins className="w-6 h-6 text-cyan-400" />
                    </div>
                    <CardTitle className="text-lg text-white">Liquidity Pools</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">
                    Provide liquidity to earn trading fees. Auto-compounding rewards with flexible positions.
                  </p>
                  <Link href="#liquidity" className="text-cyan-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                      <TrendingUp className="w-6 h-6 text-cyan-400" />
                    </div>
                    <CardTitle className="text-lg text-white">Advanced Trading</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">
                    Limit orders, DCA strategies, and portfolio management tools for sophisticated traders.
                  </p>
                  <Link href="#limit" className="text-cyan-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                      <Shield className="w-6 h-6 text-cyan-400" />
                    </div>
                    <CardTitle className="text-lg text-white">Security First</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">
                    Audited contracts, formal verification, and bug bounty program ensure platform safety.
                  </p>
                  <Link href="#security" className="text-cyan-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                      <Code className="w-6 h-6 text-cyan-400" />
                    </div>
                    <CardTitle className="text-lg text-white">Developer Friendly</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">
                    Comprehensive SDK, API documentation, and open-source contracts for builders.
                  </p>
                  <Link href="#contracts" className="text-cyan-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-black/40 border-white/10 hover:border-cyan-500/30 transition-all group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                      <Globe className="w-6 h-6 text-cyan-400" />
                    </div>
                    <CardTitle className="text-lg text-white">Cross-Chain</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">
                    Bridge assets seamlessly between IOTA and other major blockchains.
                  </p>
                  <Link href="#bridge" className="text-cyan-400 text-sm flex items-center gap-1 hover:gap-2 transition-all">
                    Learn more <ChevronRight className="w-4 h-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Quick Start Section */}
            <div id="getting-started" className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Quick Start Guide</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-black/40 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 font-bold">
                        1
                      </div>
                      Connect Your Wallet
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm">
                      Click "Connect Wallet" and choose from supported IOTA wallets. Make sure you're on the correct network.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 font-bold">
                        2
                      </div>
                      Get Some Tokens
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm">
                      For testnet, use the faucet. For mainnet, bridge tokens or purchase from exchanges.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 font-bold">
                        3
                      </div>
                      Make Your First Swap
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm">
                      Select tokens, enter amount, review the rate, and click "Swap". Confirm in your wallet.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-lg text-white flex items-center gap-2">
                      <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-cyan-400 font-bold">
                        4
                      </div>
                      Explore Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm">
                      Try providing liquidity, setting limit orders, or creating DCA strategies for automated trading.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Links Section */}
            <div id="links" className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Official Links & Resources</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link 
                  href="https://iota-defi.com" 
                  target="_blank"
                  className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-xl hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h4 className="text-white font-medium">Website</h4>
                      <p className="text-gray-400 text-sm">Official platform</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </Link>
                
                <Link 
                  href="https://github.com/iota-defi" 
                  target="_blank"
                  className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-xl hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h4 className="text-white font-medium">GitHub</h4>
                      <p className="text-gray-400 text-sm">Source code</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </Link>
                
                <Link 
                  href="https://discord.gg/iota" 
                  target="_blank"
                  className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-xl hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h4 className="text-white font-medium">Discord</h4>
                      <p className="text-gray-400 text-sm">Community chat</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </Link>
                
                <Link 
                  href="https://docs.iota-defi.com" 
                  target="_blank"
                  className="flex items-center justify-between p-4 bg-black/40 border border-white/10 rounded-xl hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-cyan-400" />
                    <div>
                      <h4 className="text-white font-medium">Documentation</h4>
                      <p className="text-gray-400 text-sm">Technical docs</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}