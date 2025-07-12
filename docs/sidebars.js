// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'doc',
      id: 'getting-started',
      label: 'Getting Started',
    },
    {
      type: 'category',
      label: 'Features',
      collapsed: false,
      items: [
        'features/swaps',
        'features/pools',
        'features/limit-orders',
        'features/dca',
        'features/bridge',
      ],
    },
    {
      type: 'category',
      label: 'Technical',
      items: [
        'technical/smart-contracts',
        'technical/architecture',
        'technical/amm',
        'technical/security',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/overview',
        'api/swap-api',
        'api/pool-api',
        'api/websocket',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/yield-farming',
        'guides/risk-management',
        'guides/tax-reporting',
        'guides/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: 'Governance',
      items: [
        'governance/overview',
        'governance/proposals',
        'governance/voting',
        'governance/tokenomics',
      ],
    },
  ],
  
  features: [
    'features/swaps',
    'features/pools',
    'features/limit-orders',
    'features/dca',
    'features/bridge',
    'features/yield-farming',
    'features/analytics',
  ],
  
  technical: [
    'technical/smart-contracts',
    'technical/architecture',
    'technical/amm',
    'technical/security',
    'technical/audits',
    'technical/bug-bounty',
  ],
};

module.exports = sidebars;