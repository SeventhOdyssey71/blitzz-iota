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

  // Map of supported symbols to their specific logo URLs
  const supportedIcons: Record<string, string> = {
    // IOTA - Using official IOTA logo
    IOTA: 'https://cryptologos.cc/logos/iota-iota-logo.svg',
    // stIOTA - Using IOTA logo with different color (we'll style it)
    stIOTA: 'https://cryptologos.cc/logos/iota-iota-logo.svg',
    // vUSD - Using a USD stable coin icon
    vUSD: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
    VUSD: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.svg',
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