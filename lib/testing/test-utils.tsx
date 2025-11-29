/**
 * Testing utilities for React components and API endpoints
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { NextRequest } from 'next/server';
import { AppError, ErrorCode } from '@/lib/errors';

// Mock data generators
export const mockTokens = {
  IOTA: {
    symbol: 'IOTA',
    name: 'IOTA',
    type: '0x2::iota::IOTA',
    decimals: 9,
    iconUrl: '/icons/iota.png',
  },
  stIOTA: {
    symbol: 'stIOTA',
    name: 'Staked IOTA',
    type: '0x2::stiota::STIOTA',
    decimals: 9,
    iconUrl: '/icons/stiota.png',
  },
  vUSD: {
    symbol: 'vUSD',
    name: 'Virtual USD',
    type: '0x2::vusd::VUSD',
    decimals: 6,
    iconUrl: '/icons/vusd.png',
  },
};

export const mockPools = {
  'IOTA-stIOTA': {
    id: '0x1111111111111111111111111111111111111111111111111111111111111111',
    coinTypeA: mockTokens.IOTA.type,
    coinTypeB: mockTokens.stIOTA.type,
    feeRate: 18, // 1.8%
  },
  'IOTA-vUSD': {
    id: '0x2222222222222222222222222222222222222222222222222222222222222222',
    coinTypeA: mockTokens.IOTA.type,
    coinTypeB: mockTokens.vUSD.type,
    feeRate: 18,
  },
};

export const mockPrices = {
  IOTA: {
    symbol: 'IOTA',
    price: 0.2847,
    change24h: 2.34,
    volume24h: 15234567,
    marketCap: 897654321,
  },
  stIOTA: {
    symbol: 'stIOTA',
    price: 0.2847,
    change24h: 2.34,
    volume24h: 15234567,
    marketCap: 897654321,
  },
  vUSD: {
    symbol: 'vUSD',
    price: 1.0,
    change24h: 0,
    volume24h: 1234567890,
    marketCap: 25678901234,
  },
};

export const mockPoolReserves = {
  reserveA: BigInt('1000000000000000'), // 1,000,000 IOTA
  reserveB: BigInt('990000000000000'),  // 990,000 stIOTA
  lpSupply: BigInt('995000000000000'),
  feeData: '0',
  volumeData: '0',
};

// API testing utilities
export const createMockRequest = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any,
  headers?: Record<string, string>
): NextRequest => {
  const url = 'http://localhost:3000/api/test';
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body && method !== 'GET') {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(url, requestInit);
};

export const expectApiResponse = (response: Response) => ({
  toHaveStatus: (status: number) => {
    expect(response.status).toBe(status);
  },
  
  toHaveSuccessfulResponse: () => {
    expect(response.status).toBe(200);
  },
  
  toHaveErrorResponse: (errorCode?: ErrorCode) => {
    expect(response.status).toBeGreaterThanOrEqual(400);
    if (errorCode) {
      // Would need to parse response body to check error code
    }
  },
});

// Component testing utilities
interface CustomRenderOptions extends Omit<RenderOptions, 'queries'> {
  initialProps?: Record<string, any>;
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  // Add any context providers here that your components need
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock hook implementations
export const mockUseWallet = {
  address: '0x1234567890abcdef',
  isConnected: true,
  connect: jest.fn(),
  disconnect: jest.fn(),
  signAndSubmit: jest.fn(),
  balance: '1000000000', // 1 IOTA
};

export const mockUseSwap = {
  inputToken: mockTokens.IOTA,
  outputToken: mockTokens.stIOTA,
  inputAmount: '100',
  outputAmount: '99.82',
  priceImpact: 0.01,
  isLoading: false,
  error: null,
  executeSwap: jest.fn(),
  setInputAmount: jest.fn(),
  setInputToken: jest.fn(),
  setOutputToken: jest.fn(),
};

// Error testing utilities
export const createMockError = (
  code: ErrorCode,
  message: string = 'Test error'
): AppError => {
  return new AppError(code, message);
};

// Async testing utilities
export const waitForAsync = (fn: () => Promise<void>, timeout = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Async operation timed out after ${timeout}ms`));
    }, timeout);

    fn()
      .then(() => {
        clearTimeout(timeoutId);
        resolve();
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

// Performance testing utilities
export const measurePerformance = async (
  fn: () => Promise<any>,
  maxDuration: number = 1000
): Promise<{ result: any; duration: number }> => {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  
  expect(duration).toBeLessThan(maxDuration);
  
  return { result, duration };
};

// Validation testing utilities
export const testValidation = {
  expectValid: (fn: () => any) => {
    expect(() => fn()).not.toThrow();
  },
  
  expectInvalid: (fn: () => any, errorMessage?: string) => {
    if (errorMessage) {
      expect(() => fn()).toThrow(errorMessage);
    } else {
      expect(() => fn()).toThrow();
    }
  },
};

// Mock generators for large datasets
export const generateMockTransactions = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `tx_${i}`,
    hash: `0x${i.toString(16).padStart(64, '0')}`,
    type: 'swap',
    timestamp: Date.now() - i * 60000,
    status: 'success' as const,
    amount: (Math.random() * 1000).toFixed(6),
    gas: '1000000',
  }));
};

export const generateMockPools = (count: number) => {
  const tokens = Object.values(mockTokens);
  return Array.from({ length: count }, (_, i) => {
    const tokenA = tokens[i % tokens.length];
    const tokenB = tokens[(i + 1) % tokens.length];
    
    return {
      id: `0x${i.toString(16).padStart(64, '0')}`,
      coinTypeA: tokenA.type,
      coinTypeB: tokenB.type,
      reserveA: BigInt(Math.floor(Math.random() * 1000000) * 1e9),
      reserveB: BigInt(Math.floor(Math.random() * 1000000) * 1e9),
      feeRate: 18,
      tvl: Math.random() * 10000000,
      volume24h: Math.random() * 1000000,
      apr: Math.random() * 50,
    };
  });
};

// Test data cleanup utilities
export const cleanupTestData = () => {
  // Reset all mocks
  jest.clearAllMocks();
  
  // Clear any caches
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }
};

// Setup and teardown helpers
export const setupTest = (options?: { mockWallet?: boolean; mockApi?: boolean }) => {
  const { mockWallet = true, mockApi = true } = options || {};
  
  beforeEach(() => {
    cleanupTestData();
    
    if (mockWallet) {
      // Mock wallet functionality
      jest.doMock('@/hooks/use-wallet', () => ({
        useWallet: () => mockUseWallet,
      }));
    }
    
    if (mockApi) {
      // Mock API responses
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('/api/prices')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockPrices }),
          });
        }
        
        if (url.includes('/api/swap')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: {
                outputAmount: '99820000000', // 99.82 tokens
                priceImpact: 0.01,
                minimumReceived: '99720000000',
              },
            }),
          });
        }
        
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Not found' }),
        });
      });
    }
  });
  
  afterEach(() => {
    cleanupTestData();
  });
};