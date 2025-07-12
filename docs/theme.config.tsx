import React from 'react'
import { DocsThemeConfig } from 'nextra-theme-docs'
import { useRouter } from 'next/router'

const config: DocsThemeConfig = {
  logo: (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="url(#gradient)" />
        <defs>
          <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00FFFF" />
            <stop offset="1" stopColor="#0080FF" />
          </linearGradient>
        </defs>
      </svg>
      <span style={{ fontWeight: 700, fontSize: '20px' }}>IOTA DeFi</span>
    </div>
  ),
  project: {
    link: 'https://github.com/yourusername/iota-defi',
  },
  docsRepositoryBase: 'https://github.com/yourusername/iota-defi/tree/main/docs',
  footer: {
    text: (
      <span>
        {new Date().getFullYear()} © IOTA DeFi Platform. Built with Move on IOTA.
      </span>
    ),
  },
  primaryHue: 180, // Cyan hue
  primarySaturation: 100,
  darkMode: true,
  nextThemes: {
    defaultTheme: 'dark',
    forcedTheme: 'dark', // Force dark mode to match the platform
  },
  sidebar: {
    titleComponent({ title }) {
      return <>{title}</>
    },
    defaultMenuCollapseLevel: 1,
    toggleButton: true,
  },
  toc: {
    backToTop: true,
  },
  editLink: {
    text: 'Edit this page on GitHub →',
  },
  feedback: {
    content: 'Question? Give us feedback →',
    labels: 'feedback',
  },
  navigation: {
    prev: true,
    next: true,
  },
  useNextSeoProps() {
    const { asPath } = useRouter()
    if (asPath !== '/') {
      return {
        titleTemplate: '%s – IOTA DeFi Docs'
      }
    }
    return {
      titleTemplate: 'IOTA DeFi Documentation'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="IOTA DeFi Documentation" />
      <meta property="og:description" content="Comprehensive documentation for the IOTA DeFi platform - Swaps, Pools, Limit Orders, and DCA on IOTA blockchain" />
      <link rel="icon" href="/favicon.png" type="image/png" />
    </>
  ),
  banner: {
    key: 'beta-release',
    text: (
      <a href="https://github.com/yourusername/iota-defi" target="_blank">
        🚀 IOTA DeFi is in beta. Join us in building the future of DeFi on IOTA →
      </a>
    ),
  },
}