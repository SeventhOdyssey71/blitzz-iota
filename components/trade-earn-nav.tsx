'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function TradeEarnNav() {
  const pathname = usePathname();
  
  return (
    <div className="flex items-center gap-0 bg-black/40 border border-white/10 rounded-xl p-1 inline-flex">
      <Link
        href="/"
        className={cn(
          "px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 relative",
          pathname === '/' 
            ? "text-cyan-400 bg-white/10 shadow-[0_0_20px_rgba(0,212,255,0.3)]" 
            : "text-gray-400 hover:text-gray-300 hover:scale-105"
        )}
      >
        Trade
      </Link>
      <Link
        href="/pool"
        className={cn(
          "px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 relative",
          pathname === '/pool' 
            ? "text-cyan-400 bg-white/10 shadow-[0_0_20px_rgba(0,212,255,0.3)]" 
            : "text-gray-400 hover:text-gray-300 hover:scale-105"
        )}
      >
        Earn
      </Link>
      <Link
        href="/launchpad"
        className={cn(
          "px-6 py-2 rounded-lg font-medium text-sm transition-all duration-200 relative",
          pathname.startsWith('/launchpad') 
            ? "text-cyan-400 bg-white/10 shadow-[0_0_20px_rgba(0,212,255,0.3)]" 
            : "text-gray-400 hover:text-gray-300 hover:scale-105"
        )}
      >
        Launchpad
      </Link>
    </div>
  );
}