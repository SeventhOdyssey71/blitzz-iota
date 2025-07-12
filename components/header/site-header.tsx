'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  User, 
  TrendingUp, 
  BarChart3, 
  Info,
  UserCircle,
  Settings
} from 'lucide-react'
import { WalletButtonV2 } from '@/components/wallet-button-v2'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="glass-dark border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-3 items-center py-3">
          {/* Logo - Left */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/larplogo.png" 
                alt="IOTA Logo" 
                width={40} 
                height={32} 
                className="rounded-lg"
              />
              <span className="text-white font-bold text-2xl tracking-wider" style={{ fontFamily: 'Orbitron, monospace' }}>BLITZ</span>
            </Link>
          </div>

          {/* Navigation - Center */}
          <nav className="hidden md:flex items-center justify-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-gray-400 hover:text-cyan-400 transition-colors font-medium px-3 py-2 rounded-md flex items-center gap-1">
                  Trade <ChevronDown className="w-4 h-4 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/95 border-white/10 backdrop-blur-xl [&>*]:bg-transparent [&>*:hover]:bg-transparent [&>*:focus]:bg-transparent">
                <DropdownMenuItem asChild className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">
                  <Link href="/">Swap</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">Limit Order</DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">DCA</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-gray-400 hover:text-cyan-400 transition-colors font-medium px-3 py-2 rounded-md flex items-center gap-1">
                  Earn <ChevronDown className="w-4 h-4 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/95 border-white/10 backdrop-blur-xl [&>*]:bg-transparent [&>*:hover]:bg-transparent [&>*:focus]:bg-transparent">
                <DropdownMenuItem asChild className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">
                  <Link href="/pool">Pools</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">Farms</DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">Vaults</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button className="text-gray-400 hover:text-cyan-400 transition-colors font-medium px-3 py-2 rounded-md">
              xBLITZ
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-gray-400 hover:text-cyan-400 transition-colors font-medium px-3 py-2 rounded-md flex items-center gap-1">
                  Bridge <ChevronDown className="w-4 h-4 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/95 border-white/10 backdrop-blur-xl [&>*]:bg-transparent [&>*:hover]:bg-transparent [&>*:focus]:bg-transparent">
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">Cross Chain</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button className="text-gray-400 hover:text-cyan-400 transition-colors font-medium px-3 py-2 rounded-md flex items-center gap-1">
                  More <ChevronDown className="w-4 h-4 ml-1" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/95 border-white/10 backdrop-blur-xl w-48 [&>*]:bg-transparent [&>*:hover]:bg-transparent [&>*:focus]:bg-transparent">
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  Compensation
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">
                  <TrendingUp className="w-4 h-4 mr-2 text-gray-400" />
                  Buy Crypto
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">
                  <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
                  Launchpad
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">
                  <Settings className="w-4 h-4 mr-2 text-gray-400" />
                  IOTA Terminal
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">
                  <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
                  Stats
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">
                  <Info className="w-4 h-4 mr-2 text-gray-400" />
                  Docs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/profile">
              <button 
                className={cn(
                  "text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-md",
                  pathname === '/profile' && "text-cyan-400"
                )}
              >
                <UserCircle className="w-5 h-5" />
              </button>
            </Link>
            <WalletButtonV2 />
          </div>
        </div>
      </div>
    </header>
  )
}