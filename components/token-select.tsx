'use client';

import { TokenDropdown } from './token-dropdown';

interface Token {
  symbol: string;
  type: string;
  decimals: number;
  name: string;
  iconUrl?: string;
}

interface TokenSelectProps {
  selectedToken: Token;
  onSelect: (token: Token) => void;
  excludeToken?: Token;
}

// Adapter component that wraps TokenDropdown for compatibility
export function TokenSelect({ selectedToken, onSelect, excludeToken }: TokenSelectProps) {
  return (
    <TokenDropdown 
      selectedToken={selectedToken}
      onSelect={onSelect}
      excludeToken={excludeToken}
    />
  );
}