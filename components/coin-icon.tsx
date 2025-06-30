import Image from 'next/image';
import { useState } from 'react';

interface CoinIconProps {
  symbol: string;
  iconUrl?: string | null;
  size?: number;
  className?: string;
  coinType?: string;
}

export function CoinIcon({ symbol, iconUrl, size = 24, className = '', coinType }: CoinIconProps) {
  const [imageError, setImageError] = useState(false);

  // Map of supported symbols to their specific external logo URLs
  const supportedIcons: Record<string, string> = {
    // IOTA - Using Trust Wallet CDN
    IOTA: 'https://assets-cdn.trustwallet.com/blockchains/iota/info/logo.png',
    // USDC - Using Trust Wallet CDN (Ethereum contract address)
    USDC: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    // USDT - Using Trust Wallet CDN (Ethereum contract address)
    USDT: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    // WETH - Using Trust Wallet CDN (Ethereum contract address)
    WETH: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    // WBTC - Using Trust Wallet CDN (Ethereum contract address)
    WBTC: 'https://assets-cdn.trustwallet.com/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
    stIOTA: '/tokens/stiota.png', // No external logo, fallback to local
    vUSD: '/tokens/vusd.png',     // No external logo, fallback to local
    VUSD: '/tokens/vusd.png',     // No external logo, fallback to local
  };

  // Always use the specific logo for supported coins
  let finalIconUrl = iconUrl;
  if (!finalIconUrl && supportedIcons[symbol]) {
    finalIconUrl = supportedIcons[symbol];
  }

  // Use generic coin icon only for unknown tokens
  if (!finalIconUrl) {
    finalIconUrl = '/tokens/generic-coin.png';
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src={imageError ? '/tokens/generic-coin.png' : finalIconUrl}
        alt={`${symbol} logo`}
        width={size}
        height={size}
        className="rounded-full object-cover"
        onError={() => setImageError(true)}
        unoptimized
      />
    </div>
  );
}