'use client';

import { useEffect, useState } from 'react';
import { PoolInfo } from '@/lib/services/pool-service';
import { useTokenPrice } from './use-token-price';
import { SUPPORTED_COINS } from '@/config/iota.config';

export function usePoolTVL(poolInfo: PoolInfo | null) {
  const [tvl, setTVL] = useState(0);
  
  // Get prices for tokens
  const { price: iotaPrice } = useTokenPrice('IOTA');
  const { price: stIotaPrice } = useTokenPrice('stIOTA');
  const { price: vusdPrice } = useTokenPrice('vUSD');
  
  useEffect(() => {
    if (!poolInfo) {
      setTVL(0);
      return;
    }
    
    // Calculate TVL based on actual reserves and prices
    let totalValue = 0;
    
    // Get token prices based on pool types
    const getPriceForType = (type: string) => {
      if (type === SUPPORTED_COINS.IOTA.type) return iotaPrice?.price || 0.28;
      if (type === SUPPORTED_COINS.stIOTA.type) return stIotaPrice?.price || 0.28;
      if (type === SUPPORTED_COINS.vUSD.type) return vusdPrice?.price || 1;
      return 0;
    };
    
    const priceA = getPriceForType(poolInfo.coinTypeA);
    const priceB = getPriceForType(poolInfo.coinTypeB);
    
    // Calculate value of each reserve
    const valueA = (Number(poolInfo.reserveA) / 1e9) * priceA;
    const valueB = (Number(poolInfo.reserveB) / 1e9) * priceB;
    
    totalValue = valueA + valueB;
    
    setTVL(totalValue);
  }, [poolInfo, iotaPrice, stIotaPrice, vusdPrice]);
  
  return tvl;
}