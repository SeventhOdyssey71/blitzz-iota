import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { IotaProviders } from '@/lib/iota/providers'
import { Toaster } from 'sonner'
import { SiteHeader } from '@/components/header/site-header'
import { SiteFooter } from '@/components/footer/site-footer'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'BLITZ - DeFi Platform on IOTA',
  description: 'Decentralized Finance Platform on IOTA',
  generator: 'Iota',
  icons: {
    icon: '/larplogo.png',
    shortcut: '/larplogo.png',
    apple: '/larplogo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-suprema min-h-screen flex flex-col">
        <IotaProviders>
          <SiteHeader />
          <main className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <Toaster position="bottom-right" />
        </IotaProviders>
      </body>
    </html>
  )
}
