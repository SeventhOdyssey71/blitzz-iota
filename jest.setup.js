import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    };
  },
}));

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
    };
  },
  useSearchParams() {
    return new URLSearchParams();
  },
  usePathname() {
    return '/';
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_NETWORK = 'testnet';
process.env.NEXT_PUBLIC_RPC_URL = 'https://api.testnet.iota.cafe';
process.env.NEXT_PUBLIC_PACKAGE_ID = '0x123456789';

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock crypto for security tests
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn().mockImplementation((arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
  },
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Custom matchers for blockchain testing
expect.extend({
  toBeValidAddress(received) {
    const isValid = typeof received === 'string' && 
                   /^0x[a-fA-F0-9]+::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*$/.test(received);
    
    return {
      message: () => `expected ${received} to be a valid Move address`,
      pass: isValid,
    };
  },
  
  toBeValidAmount(received) {
    const isValid = typeof received === 'string' && 
                   /^\d+(\.\d+)?$/.test(received) && 
                   parseFloat(received) >= 0;
    
    return {
      message: () => `expected ${received} to be a valid amount`,
      pass: isValid,
    };
  },
  
  toBeValidBigInt(received) {
    try {
      const bigIntValue = BigInt(received);
      const isValid = bigIntValue >= 0n;
      
      return {
        message: () => `expected ${received} to be a valid BigInt`,
        pass: isValid,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid BigInt`,
        pass: false,
      };
    }
  },
});