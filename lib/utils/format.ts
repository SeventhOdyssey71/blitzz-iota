export function formatBalance(balance: string | bigint, decimals: number = 9, displayDecimals: number = 2): string {
  const balanceNum = BigInt(balance);
  const divisor = BigInt(10 ** decimals);
  const quotient = balanceNum / divisor;
  const remainder = balanceNum % divisor;
  
  // Format the decimal part
  const decimalStr = remainder.toString().padStart(decimals, '0');
  const trimmedDecimal = decimalStr.replace(/0+$/, ''); // Remove trailing zeros
  
  if (trimmedDecimal === '') {
    return quotient.toString();
  }
  
  // Show max displayDecimals decimal places (default 2)
  const finalDecimals = trimmedDecimal.slice(0, displayDecimals);
  return `${quotient}.${finalDecimals.padEnd(displayDecimals, '0')}`;
}

export function formatTokenAmount(amount: number | string, decimals: number = 2): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  } else if (num < 0.01 && num > 0) {
    return num.toExponential(2);
  } else {
    return num.toFixed(decimals);
  }
}

export function parseTokenAmount(amount: string, decimals: number = 9): bigint {
  // Remove any commas
  const cleanAmount = amount.replace(/,/g, '');
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart = ''] = cleanAmount.split('.');
  
  // Pad decimal part to required decimals
  const paddedDecimal = decimalPart.padEnd(decimals, '0').slice(0, decimals);
  
  // Combine parts
  const fullAmount = integerPart + paddedDecimal;
  
  return BigInt(fullAmount);
}

export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}