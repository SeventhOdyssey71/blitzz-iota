'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  ChevronDown, 
  Bell, 
  Settings, 
  User, 
  TrendingUp, 
  BarChart3, 
  Info,
  UserCircle
} from 'lucide-react'
import { WalletButtonV2 } from '@/components/wallet-button-v2'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="glass-dark border-b border-white/10 sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black border border-cyan-500/50 rounded-lg flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl group-hover:bg-cyan-500/30 transition-all"></div>
              <span className="text-cyan-400 font-bold text-lg z-10">I</span>
            </div>
            <span className="text-white font-bold text-2xl tracking-wider">IOTA</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-400 hover:text-cyan-400 transition-colors font-medium">
                  Trade <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/95 border-white/10 backdrop-blur-xl">
                <DropdownMenuItem asChild className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">
                  <Link href="/">Swap</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">Limit Order</DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">DCA</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-400 hover:text-cyan-400 transition-colors font-medium">
                  Earn <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/95 border-white/10 backdrop-blur-xl">
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">Pools</DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">Farms</DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">Vaults</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" className="text-gray-400 hover:text-cyan-400 transition-colors font-medium">
              xIOTA
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-400 hover:text-cyan-400 transition-colors font-medium">
                  Bridge <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/95 border-white/10 backdrop-blur-xl">
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">Cross Chain</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="text-gray-400 hover:text-cyan-400 transition-colors font-medium">
                  More <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/95 border-white/10 backdrop-blur-xl w-48">
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  Compensation
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">
                  <TrendingUp className="w-4 h-4 mr-2 text-gray-400" />
                  Buy Crypto
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">
                  <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
                  Launchpad
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">
                  <Settings className="w-4 h-4 mr-2 text-gray-400" />
                  IOTA Terminal
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">
                  <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
                  Stats
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-cyan-500/20 focus:bg-cyan-500/20 focus:text-white transition-all">
                  <Info className="w-4 h-4 mr-2 text-gray-400" />
                  Docs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/profile">
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn(
                "text-gray-400 hover:text-cyan-400 transition-colors",
                pathname === '/profile' && "text-cyan-400"
              )}
            >
              <UserCircle className="w-5 h-5" />
            </Button>
          </Link>
          <WalletButtonV2 />
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400 transition-colors">
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-cyan-400 transition-colors">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}