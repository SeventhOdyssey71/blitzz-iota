'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCurrentAccount, useIotaClient } from '@iota/dapp-kit';
import { IOTA_CONFIG } from '@/config/iota.config';

interface PriceData {
  price: string;
  lastUpdated: number;
  confidence: number;
  decimals: number;
}

interface HistoricalPrice {
  price: string;
  timestamp: number;
  confidence: number;
}

interface TWAPData {
  twap: string;
  windowSize: number;
  lastUpdated: number;
}

interface AggregatedPrice {
  price: string;
  numSources: number;
  lastUpdated: number;
  deviation: string;
}

export function useOracle() {
  const client = useIotaClient();
  const currentAccount = useCurrentAccount();
  const [priceFeeds, setPriceFeeds] = useState<Map<string, PriceData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const fetchPriceFeed = useCallback(async (feedId: string): Promise<PriceData | null> => {
    try {
      const object = await client.getObject({
        id: feedId,
        options: {
          showContent: true,
        },
      });

      if (object.data?.content?.dataType === 'moveObject') {
        const fields = object.data.content.fields as any;
        return {
          price: fields.price?.value || '0',
          lastUpdated: parseInt(fields.last_updated || '0'),
          confidence: parseInt(fields.confidence || '0'),
          decimals: parseInt(fields.decimals || '18'),
        };
      }

      return null;
    } catch (error) {
      console.warn('Failed to fetch price feed:', error);
      return null;
    }
  }, [client]);

  const fetchHistoricalPrices = useCallback(async (feedId: string): Promise<HistoricalPrice[]> => {
    try {
      const object = await client.getObject({
        id: feedId,
        options: {
          showContent: true,
        },
      });

      if (object.data?.content?.dataType === 'moveObject') {
        const fields = object.data.content.fields as any;
        const historicalPrices = fields.historical_prices?.fields?.contents || [];
        
        return historicalPrices.map((entry: any) => ({
          price: entry.fields.price?.value || '0',
          timestamp: parseInt(entry.fields.timestamp || '0'),
          confidence: parseInt(entry.fields.confidence || '0'),
        }));
      }

      return [];
    } catch (error) {
      console.warn('Failed to fetch historical prices:', error);
      return [];
    }
  }, [client]);

  const fetchTWAP = useCallback(async (oracleId: string): Promise<TWAPData | null> => {
    try {
      const object = await client.getObject({
        id: oracleId,
        options: {
          showContent: true,
        },
      });

      if (object.data?.content?.dataType === 'moveObject') {
        const fields = object.data.content.fields as any;
        return {
          twap: fields.current_twap?.value || '0',
          windowSize: parseInt(fields.window_size || '0'),
          lastUpdated: parseInt(fields.last_updated || '0'),
        };
      }

      return null;
    } catch (error) {
      console.warn('Failed to fetch TWAP:', error);
      return null;
    }
  }, [client]);

  const fetchAggregatedPrice = useCallback(async (aggregatorId: string): Promise<AggregatedPrice | null> => {
    try {
      const object = await client.getObject({
        id: aggregatorId,
        options: {
          showContent: true,
        },
      });

      if (object.data?.content?.dataType === 'moveObject') {
        const fields = object.data.content.fields as any;
        return {
          price: fields.aggregated_price?.value || '0',
          numSources: parseInt(fields.feeds?.fields?.size || '0'),
          lastUpdated: parseInt(fields.last_updated || '0'),
          deviation: fields.max_deviation?.value || '0',
        };
      }

      return null;
    } catch (error) {
      console.warn('Failed to fetch aggregated price:', error);
      return null;
    }
  }, [client]);

  const isPriceFresh = useCallback((priceData: PriceData, maxAgeMs: number): boolean => {
    const now = Date.now();
    return now <= priceData.lastUpdated + maxAgeMs;
  }, []);

  const calculatePriceChange = useCallback((historicalPrices: HistoricalPrice[], period: number): number => {
    if (historicalPrices.length < 2) return 0;

    const now = Date.now();
    const cutoffTime = now - period;
    
    // Find prices at the beginning and end of the period
    const oldPrice = historicalPrices.find(p => p.timestamp <= cutoffTime);
    const currentPrice = historicalPrices[historicalPrices.length - 1];
    
    if (!oldPrice || !currentPrice) return 0;

    const oldPriceNum = parseFloat(oldPrice.price) / 1e18;
    const currentPriceNum = parseFloat(currentPrice.price) / 1e18;
    
    if (oldPriceNum === 0) return 0;
    
    return ((currentPriceNum - oldPriceNum) / oldPriceNum) * 100;
  }, []);

  const getVolatility = useCallback((historicalPrices: HistoricalPrice[]): number => {
    if (historicalPrices.length < 2) return 0;

    const prices = historicalPrices.map(p => parseFloat(p.price) / 1e18);
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    
    const squaredDifferences = prices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / prices.length;
    
    return Math.sqrt(variance) / mean * 100; // Return as percentage
  }, []);

  const monitorPriceFeeds = useCallback(async (feedIds: string[]) => {
    setIsLoading(true);
    
    try {
      const feedPromises = feedIds.map(async (feedId) => {
        const priceData = await fetchPriceFeed(feedId);
        return { feedId, priceData };
      });

      const results = await Promise.all(feedPromises);
      const newPriceFeeds = new Map<string, PriceData>();

      results.forEach(({ feedId, priceData }) => {
        if (priceData) {
          newPriceFeeds.set(feedId, priceData);
        }
      });

      setPriceFeeds(newPriceFeeds);
    } catch (error) {
      console.error('Failed to monitor price feeds:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchPriceFeed]);

  // Auto-refresh price feeds every 30 seconds
  useEffect(() => {
    if (priceFeeds.size === 0) return;

    const interval = setInterval(() => {
      const feedIds = Array.from(priceFeeds.keys());
      monitorPriceFeeds(feedIds);
    }, 30000);

    return () => clearInterval(interval);
  }, [priceFeeds, monitorPriceFeeds]);

  const formatPrice = useCallback((rawPrice: string, decimals: number = 18): string => {
    const price = parseFloat(rawPrice) / Math.pow(10, decimals);
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  }, []);

  const getConfidenceLevel = useCallback((confidence: number): string => {
    if (confidence >= 90) return 'High';
    if (confidence >= 70) return 'Medium';
    if (confidence >= 50) return 'Low';
    return 'Very Low';
  }, []);

  // Utility function to detect price anomalies
  const detectPriceAnomaly = useCallback((
    currentPrice: number, 
    historicalPrices: HistoricalPrice[], 
    deviationThreshold: number = 0.1
  ): boolean => {
    if (historicalPrices.length < 5) return false;

    const recentPrices = historicalPrices.slice(-5).map(p => parseFloat(p.price) / 1e18);
    const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    
    const deviation = Math.abs(currentPrice - avgPrice) / avgPrice;
    return deviation > deviationThreshold;
  }, []);

  return {
    priceFeeds,
    isLoading,
    fetchPriceFeed,
    fetchHistoricalPrices,
    fetchTWAP,
    fetchAggregatedPrice,
    isPriceFresh,
    calculatePriceChange,
    getVolatility,
    monitorPriceFeeds,
    formatPrice,
    getConfidenceLevel,
    detectPriceAnomaly,
  };
}