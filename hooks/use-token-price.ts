import { useState, useEffect } from 'react';
import { getTokenPrice, getMultipleTokenPrices } from '@/lib/services/price-feed';

interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
}

export function useTokenPrice(symbol: string) {
  const [price, setPrice] = useState<TokenPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchPrice = async () => {
      try {
        setLoading(true);
        const priceData = await getTokenPrice(symbol);
        if (mounted) {
          setPrice(priceData);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch price');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPrice();

    // Refresh price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbol]);

  return { price, loading, error };
}

export function useTokenPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, TokenPrice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchPrices = async () => {
      // Skip if no symbols
      if (symbols.length === 0) {
        setPrices({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const priceData = await getMultipleTokenPrices(symbols);
        if (mounted) {
          setPrices(priceData || {});
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          console.warn('Failed to fetch prices, using defaults:', err);
          // Don't set error state, just use empty prices
          setPrices({});
          setError(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPrices();

    // Refresh prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbols.join(',')]);

  return { prices, loading, error, isLoading: loading };
}