import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { IotaProviders } from '@/lib/iota/providers'
import { Toaster } from 'sonner'
import { SiteHeader } from '@/components/header/site-header'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter'
})

export const metadata: Metadata = {
  title: 'Iota - IOTA DeFi Platform',
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
      <body className="font-suprema">
        <IotaProviders>
          <SiteHeader />
          {children}
          <Toaster position="bottom-right" />
        </IotaProviders>
      </body>
    </html>
  )
}
