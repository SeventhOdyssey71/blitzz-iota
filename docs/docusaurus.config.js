// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'IOTA DeFi Documentation',
  tagline: 'Build the future of decentralized finance on IOTA',
  favicon: 'img/favicon.ico',
  url: 'https://docs.iota-defi.com',
  baseUrl: '/',
  organizationName: 'iota-defi',
  projectName: 'iota-defi-docs',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          editUrl: 'https://github.com/iota-defi/docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      {
        hashed: true,
        language: ["en"],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: true,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'IOTA DeFi',
        logo: {
          alt: 'IOTA DeFi Logo',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Documentation',
          },
          {
            type: 'docSidebar',
            sidebarId: 'features',
            position: 'left',
            label: 'Features',
          },
          {
            type: 'docSidebar',
            sidebarId: 'technical',
            position: 'left',
            label: 'Technical',
          },
          {
            href: 'https://iota-defi.com',
            label: 'Launch App',
            position: 'right',
            className: 'navbar-launch-app',
          },
          {
            href: 'https://github.com/iota-defi',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/getting-started',
              },
              {
                label: 'Features',
                to: '/features/swaps',
              },
              {
                label: 'Smart Contracts',
                to: '/technical/smart-contracts',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Discord',
                href: 'https://discord.gg/iota',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/iota',
              },
              {
                label: 'Telegram',
                href: 'https://t.me/iota',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                href: 'https://blog.iota-defi.com',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/iota-defi',
              },
              {
                label: 'Bug Bounty',
                href: '/security/bug-bounty',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} IOTA DeFi Platform. Built with ❤️ on IOTA.`,
      },
      prism: {
        theme: require('prism-react-renderer/themes/vsDark'),
        darkTheme: require('prism-react-renderer/themes/vsDark'),
        additionalLanguages: ['solidity', 'rust', 'move'],
      },
    }),
};

module.exports = config;