'use client';

import { useCallback } from 'react';

interface FixedPoint {
  value: string; // Raw value as string to handle large numbers
}

const PRECISION = BigInt('1000000000000000000'); // 10^18

export function useAdvancedMath() {
  
  const fromU64 = useCallback((value: number | string): FixedPoint => {
    const bigValue = typeof value === 'string' ? BigInt(value) : BigInt(value);
    return { value: (bigValue * PRECISION).toString() };
  }, []);

  const toU64 = useCallback((fp: FixedPoint): string => {
    const bigValue = BigInt(fp.value);
    return (bigValue / PRECISION).toString();
  }, []);

  const fromRaw = useCallback((value: string): FixedPoint => {
    return { value };
  }, []);

  const add = useCallback((a: FixedPoint, b: FixedPoint): FixedPoint => {
    const sum = BigInt(a.value) + BigInt(b.value);
    return { value: sum.toString() };
  }, []);

  const sub = useCallback((a: FixedPoint, b: FixedPoint): FixedPoint => {
    const bigA = BigInt(a.value);
    const bigB = BigInt(b.value);
    if (bigA < bigB) throw new Error('Underflow: a < b in subtraction');
    return { value: (bigA - bigB).toString() };
  }, []);

  const mul = useCallback((a: FixedPoint, b: FixedPoint): FixedPoint => {
    const result = (BigInt(a.value) * BigInt(b.value)) / PRECISION;
    return { value: result.toString() };
  }, []);

  const div = useCallback((a: FixedPoint, b: FixedPoint): FixedPoint => {
    const bigB = BigInt(b.value);
    if (bigB === 0n) throw new Error('Division by zero');
    const result = (BigInt(a.value) * PRECISION) / bigB;
    return { value: result.toString() };
  }, []);

  // Newton's method for square root
  const sqrt = useCallback((x: FixedPoint): FixedPoint => {
    const bigX = BigInt(x.value);
    if (bigX === 0n) return { value: '0' };

    let z = bigX;
    let y = (z + PRECISION) / 2n;

    while (y < z) {
      z = y;
      y = (z + bigX / z) / 2n;
    }

    return { value: z.toString() };
  }, []);

  const pow = useCallback((base: FixedPoint, exponent: number): FixedPoint => {
    if (exponent === 0) return fromU64(1);
    if (exponent === 1) return base;

    let result = fromU64(1);
    let baseCopy = base;
    let exp = exponent;

    while (exp > 0) {
      if (exp % 2 === 1) {
        result = mul(result, baseCopy);
      }
      baseCopy = mul(baseCopy, baseCopy);
      exp = Math.floor(exp / 2);
    }

    return result;
  }, [fromU64, mul]);

  const calculateAPY = useCallback((
    principal: number,
    rate: number, // Annual rate as percentage (e.g., 5 for 5%)
    periodsPerYear: number = 365,
    years: number = 1
  ): FixedPoint => {
    const principalFp = fromU64(principal);
    const rateFp = fromU64(Math.floor(rate * 1000000)); // Convert to fixed point with 6 decimals
    const ratePerPeriod = div(rateFp, fromU64(periodsPerYear * 1000000));
    const onePlusRate = add(fromU64(1), ratePerPeriod);
    const totalPeriods = periodsPerYear * years;
    const compoundFactor = pow(onePlusRate, totalPeriods);
    
    return mul(principalFp, compoundFactor);
  }, [fromU64, div, add, pow, mul]);

  const calculateImpermanentLoss = useCallback((priceRatio: number): number => {
    // IL = 2 * sqrt(ratio) / (1 + ratio) - 1
    const ratio = fromU64(Math.floor(priceRatio * 1000000));
    const sqrtRatio = sqrt(ratio);
    const two = fromU64(2000000);
    const one = fromU64(1000000);
    
    const numerator = mul(two, sqrtRatio);
    const denominator = add(one, ratio);
    const fraction = div(numerator, denominator);
    const result = sub(fraction, one);
    
    return parseFloat(toU64(result)) / 1000000;
  }, [fromU64, sqrt, mul, add, div, sub, toU64]);

  const calculateSlippage = useCallback((
    inputAmount: string,
    outputAmount: string,
    expectedOutputAmount: string
  ): number => {
    const actualOutput = parseFloat(outputAmount);
    const expectedOutput = parseFloat(expectedOutputAmount);
    
    if (expectedOutput === 0) return 0;
    
    return ((expectedOutput - actualOutput) / expectedOutput) * 100;
  }, []);

  const calculatePriceImpact = useCallback((
    reserveIn: string,
    reserveOut: string,
    amountIn: string
  ): number => {
    const rIn = parseFloat(reserveIn);
    const rOut = parseFloat(reserveOut);
    const aIn = parseFloat(amountIn);
    
    if (rIn === 0 || rOut === 0) return 0;
    
    // Price before trade
    const priceBefore = rOut / rIn;
    
    // Price after trade (with 0.3% fee)
    const newReserveIn = rIn + (aIn * 0.997);
    const newReserveOut = (rIn * rOut) / newReserveIn;
    const priceAfter = newReserveOut / newReserveIn;
    
    return ((priceBefore - priceAfter) / priceBefore) * 100;
  }, []);

  const calculateLPTokenValue = useCallback((
    lpTokenSupply: string,
    reserve0: string,
    reserve1: string,
    token0Price: number,
    token1Price: number,
    lpTokenAmount: string
  ): number => {
    const supply = parseFloat(lpTokenSupply);
    const r0 = parseFloat(reserve0);
    const r1 = parseFloat(reserve1);
    const lpAmount = parseFloat(lpTokenAmount);
    
    if (supply === 0) return 0;
    
    const poolShare = lpAmount / supply;
    const token0Value = (r0 * poolShare) * token0Price;
    const token1Value = (r1 * poolShare) * token1Price;
    
    return token0Value + token1Value;
  }, []);

  const calculateOptimalLiquidityRatio = useCallback((
    reserve0: string,
    reserve1: string,
    amount0Desired: string,
    amount1Desired: string
  ): { amount0: string; amount1: string } => {
    const r0 = parseFloat(reserve0);
    const r1 = parseFloat(reserve1);
    const desired0 = parseFloat(amount0Desired);
    const desired1 = parseFloat(amount1Desired);
    
    if (r0 === 0 || r1 === 0) {
      return { amount0: amount0Desired, amount1: amount1Desired };
    }
    
    // Calculate optimal amounts to maintain pool ratio
    const ratio = r1 / r0;
    const optimal1ForDesired0 = desired0 * ratio;
    
    if (optimal1ForDesired0 <= desired1) {
      return {
        amount0: amount0Desired,
        amount1: optimal1ForDesired0.toString()
      };
    } else {
      const optimal0ForDesired1 = desired1 / ratio;
      return {
        amount0: optimal0ForDesired1.toString(),
        amount1: amount1Desired
      };
    }
  }, []);

  const calculateYieldFarming = useCallback((
    stakedAmount: string,
    rewardRate: string, // Rewards per second
    stakingDuration: number, // In seconds
    totalStaked: string
  ): number => {
    const staked = parseFloat(stakedAmount);
    const rate = parseFloat(rewardRate);
    const total = parseFloat(totalStaked);
    
    if (total === 0) return 0;
    
    const userShare = staked / total;
    const totalRewards = rate * stakingDuration;
    
    return totalRewards * userShare;
  }, []);

  // Technical analysis functions
  const calculateSMA = useCallback((prices: number[], period: number): number => {
    if (prices.length < period) return 0;
    
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }, []);

  const calculateEMA = useCallback((prices: number[], period: number): number => {
    if (prices.length === 0) return 0;
    if (prices.length === 1) return prices[0];
    
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }, []);

  const calculateVolatility = useCallback((prices: number[]): number => {
    if (prices.length < 2) return 0;
    
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const squaredDifferences = prices.map(price => Math.pow(price - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / prices.length;
    
    return Math.sqrt(variance);
  }, []);

  const calculateBollingerBands = useCallback((prices: number[], period: number = 20, stdDev: number = 2) => {
    if (prices.length < period) return null;
    
    const sma = calculateSMA(prices, period);
    const recentPrices = prices.slice(-period);
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      middle: sma,
      upper: sma + (standardDeviation * stdDev),
      lower: sma - (standardDeviation * stdDev)
    };
  }, [calculateSMA]);

  const formatFixedPoint = useCallback((fp: FixedPoint, decimals: number = 6): string => {
    const value = parseFloat(toU64(fp)) / Math.pow(10, 18 - decimals);
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  }, [toU64]);

  return {
    // Basic arithmetic
    fromU64,
    toU64,
    fromRaw,
    add,
    sub,
    mul,
    div,
    sqrt,
    pow,
    
    // DeFi calculations
    calculateAPY,
    calculateImpermanentLoss,
    calculateSlippage,
    calculatePriceImpact,
    calculateLPTokenValue,
    calculateOptimalLiquidityRatio,
    calculateYieldFarming,
    
    // Technical analysis
    calculateSMA,
    calculateEMA,
    calculateVolatility,
    calculateBollingerBands,
    
    // Utilities
    formatFixedPoint,
  };
}