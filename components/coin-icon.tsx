import Image from 'next/image';
import { getTokenIconUrl } from '@/lib/services/price-feed';

interface CoinIconProps {
  symbol: string;
  iconUrl?: string | null;
  size?: number;
  className?: string;
  coinType?: string;
}

export function CoinIcon({ symbol, iconUrl, size = 24, className = '', coinType }: CoinIconProps) {
  // Get the icon URL from Blockberry API or use provided URL
  const finalIconUrl = iconUrl || getTokenIconUrl(symbol);

  if (!finalIconUrl) {
    // If no icon URL is found, use a placeholder
    console.warn(`No icon URL found for token: ${symbol}`);
    // Use a data URL for a simple colored circle as placeholder
    const placeholderSvg = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23${symbol.charCodeAt(0).toString(16)}${symbol.charCodeAt(1 % symbol.length).toString(16)}${symbol.charCodeAt(2 % symbol.length).toString(16)}" /><text x="50" y="50" text-anchor="middle" dy=".3em" fill="white" font-size="40" font-weight="bold">${symbol.charAt(0).toUpperCase()}</text></svg>`;
    
    return (
      <div className={`relative ${className}`} style={{ width: size, height: size }}>
        <Image
          src={placeholderSvg}
          alt={`${symbol} logo`}
          width={size}
          height={size}
          className="rounded-full object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Image
        src={finalIconUrl}
        alt={`${symbol} logo`}
        width={size}
        height={size}
        className="rounded-full object-cover"
        unoptimized
      />
    </div>
  );
}