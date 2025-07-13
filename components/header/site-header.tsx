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
  Settings,
  Menu
} from 'lucide-react'
import { WalletButtonV2 } from '@/components/wallet-button-v2'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

export function SiteHeader() {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <header className="glass-dark border-b border-white/10 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-3">
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
              <span className="text-white font-bold text-2xl tracking-wider" style={{ fontFamily: 'Orbitron, monospace' }}>BLITZZ</span>
            </Link>
          </div>

          {/* Desktop Navigation - Center */}
          <nav className="hidden lg:flex items-center justify-center gap-6">
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

            <Link href="/launchpad" className="text-gray-400 hover:text-cyan-400 transition-colors font-medium px-3 py-2 rounded-md">
              Launchpad
            </Link>

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
                <DropdownMenuItem asChild className="text-gray-300 hover:text-cyan-400 focus:text-cyan-400 transition-colors cursor-pointer">
                  <Link href="/launchpad">
                    <BarChart3 className="w-4 h-4 mr-2 text-gray-400" />
                    Launchpad
                  </Link>
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
          <div className="flex items-center gap-3">
            {/* Desktop Profile Icon */}
            <Link href="/profile" className="hidden lg:block">
              <button 
                className={cn(
                  "text-gray-400 hover:text-cyan-400 transition-colors p-2 rounded-md",
                  pathname === '/profile' && "text-cyan-400"
                )}
              >
                <UserCircle className="w-5 h-5" />
              </button>
            </Link>
            
            {/* Wallet Button - Always visible */}
            <WalletButtonV2 />
            
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-gray-400 hover:text-cyan-400"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-black/95 border-white/10 backdrop-blur-xl">
                <nav className="flex flex-col gap-4 mt-8">
                  {/* Mobile Menu Items */}
                  <Accordion type="single" collapsible className="w-full">
                    {/* Trade Menu */}
                    <AccordionItem value="trade" className="border-white/10">
                      <AccordionTrigger className="text-gray-300 hover:text-cyan-400 py-4">
                        Trade
                      </AccordionTrigger>
                      <AccordionContent className="pl-4">
                        <Link 
                          href="/" 
                          onClick={closeMobileMenu}
                          className="block py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          Swap
                        </Link>
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="block py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          Limit Order
                        </Link>
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="block py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          DCA
                        </Link>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Earn Menu */}
                    <AccordionItem value="earn" className="border-white/10">
                      <AccordionTrigger className="text-gray-300 hover:text-cyan-400 py-4">
                        Earn
                      </AccordionTrigger>
                      <AccordionContent className="pl-4">
                        <Link 
                          href="/pool" 
                          onClick={closeMobileMenu}
                          className="block py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          Pools
                        </Link>
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="block py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          Farms
                        </Link>
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="block py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          Vaults
                        </Link>
                      </AccordionContent>
                    </AccordionItem>

                    {/* Bridge Menu */}
                    <AccordionItem value="bridge" className="border-white/10">
                      <AccordionTrigger className="text-gray-300 hover:text-cyan-400 py-4">
                        Bridge
                      </AccordionTrigger>
                      <AccordionContent className="pl-4">
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="block py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          Cross Chain
                        </Link>
                      </AccordionContent>
                    </AccordionItem>

                    {/* More Menu */}
                    <AccordionItem value="more" className="border-white/10">
                      <AccordionTrigger className="text-gray-300 hover:text-cyan-400 py-4">
                        More
                      </AccordionTrigger>
                      <AccordionContent className="pl-4">
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          Compensation
                        </Link>
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <TrendingUp className="w-4 h-4" />
                          Buy Crypto
                        </Link>
                        <Link 
                          href="/launchpad" 
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Launchpad
                        </Link>
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          IOTA Terminal
                        </Link>
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Stats
                        </Link>
                        <Link 
                          href="#" 
                          onClick={closeMobileMenu}
                          className="flex items-center gap-3 py-2 text-gray-400 hover:text-cyan-400 transition-colors"
                        >
                          <Info className="w-4 h-4" />
                          Docs
                        </Link>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>

                  {/* Single Menu Items */}
                  <Link 
                    href="/launchpad" 
                    onClick={closeMobileMenu}
                    className="py-4 text-gray-300 hover:text-cyan-400 transition-colors border-t border-white/10"
                  >
                    Launchpad
                  </Link>

                  {/* Profile Link for Mobile */}
                  <Link 
                    href="/profile" 
                    onClick={closeMobileMenu}
                    className={cn(
                      "flex items-center gap-3 py-4 text-gray-300 hover:text-cyan-400 transition-colors border-t border-white/10",
                      pathname === '/profile' && "text-cyan-400"
                    )}
                  >
                    <UserCircle className="w-5 h-5" />
                    Profile
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}