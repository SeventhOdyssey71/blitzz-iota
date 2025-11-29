/**
 * Tests for swap API endpoint
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/swap/route';
import { createMockRequest, mockPools, mockPoolReserves } from '@/lib/testing/test-utils';

// Mock dependencies
jest.mock('@iota/iota-sdk/client', () => ({
  IotaClient: jest.fn().mockImplementation(() => ({
    getObject: jest.fn().mockResolvedValue({
      data: {
        content: {
          dataType: 'moveObject',
          fields: {
            reserve_a: { fields: { value: mockPoolReserves.reserveA.toString() } },
            reserve_b: { fields: { value: mockPoolReserves.reserveB.toString() } },
            lp_supply: mockPoolReserves.lpSupply.toString(),
            fee_data: mockPoolReserves.feeData,
            volume_data: mockPoolReserves.volumeData,
          },
        },
      },
    }),
  })),
  getFullnodeUrl: jest.fn().mockReturnValue('https://api.testnet.iota.cafe'),
}));

jest.mock('@/config/iota.config', () => ({
  SUPPORTED_COINS: {
    IOTA: { type: '0x2::iota::IOTA' },
    stIOTA: { type: '0x2::stiota::STIOTA' },
    vUSD: { type: '0x2::vusd::VUSD' },
  },
}));

describe('Swap API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/swap', () => {
    it('should return estimate for valid swap request', async () => {
      const requestBody = {
        action: 'estimate',
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '100000000000', // 100 IOTA in smallest units
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.outputAmount).toBeDefined();
      expect(data.data.priceImpact).toBeDefined();
      expect(data.data.poolId).toBeDefined();
      expect(data.data.reserves).toBeDefined();
    });

    it('should return transaction params for valid execute request', async () => {
      const requestBody = {
        action: 'execute',
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '100000000000',
          minOutputAmount: '99000000000',
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.transactionParams).toBeDefined();
      expect(data.data.transactionParams.target).toContain('simple_dex::swap_');
      expect(data.data.transactionParams.poolId).toBeDefined();
    });

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/swap', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Invalid JSON');
    });

    it('should return 400 for missing action', async () => {
      const requestBody = {
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '100000000000',
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Action is required');
    });

    it('should return 400 for invalid token types', async () => {
      const requestBody = {
        action: 'estimate',
        params: {
          inputToken: 'invalid-token',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '100000000000',
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for invalid amounts', async () => {
      const requestBody = {
        action: 'estimate',
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: 'invalid-amount',
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 for unsupported action', async () => {
      const requestBody = {
        action: 'unsupported',
        params: {},
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Unsupported action');
    });

    it('should include security headers in response', async () => {
      const requestBody = {
        action: 'estimate',
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '100000000000',
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    });

    it('should handle rate limiting', async () => {
      const requestBody = {
        action: 'estimate',
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '100000000000',
        },
      };

      // Make many requests to trigger rate limiting
      const requests = Array(150).fill(null).map(() => 
        createMockRequest('POST', requestBody)
      );

      const responses = await Promise.all(
        requests.map(request => POST(request))
      );

      // At least one request should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate price impact limits', async () => {
      const requestBody = {
        action: 'estimate',
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '500000000000000', // Very large amount to cause high price impact
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('price impact');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      const IotaClient = require('@iota/iota-sdk/client').IotaClient;
      IotaClient.mockImplementation(() => ({
        getObject: jest.fn().mockRejectedValue(new Error('Network error')),
      }));

      const requestBody = {
        action: 'estimate',
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '100000000000',
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('Failed to fetch pool reserves');
    });

    it('should handle timeout errors', async () => {
      // Mock slow response
      const IotaClient = require('@iota/iota-sdk/client').IotaClient;
      IotaClient.mockImplementation(() => ({
        getObject: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 15000)) // Longer than 10s timeout
        ),
      }));

      const requestBody = {
        action: 'estimate',
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '100000000000',
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error.message).toContain('timeout');
    });
  });

  describe('Response Format', () => {
    it('should return consistent API response format', async () => {
      const requestBody = {
        action: 'estimate',
        params: {
          inputToken: '0x2::iota::IOTA',
          outputToken: '0x2::stiota::STIOTA',
          inputAmount: '100000000000',
        },
      };

      const request = createMockRequest('POST', requestBody);
      const response = await POST(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('timestamp');
      expect(typeof data.timestamp).toBe('string');
      
      if (data.success) {
        expect(data).toHaveProperty('data');
      } else {
        expect(data).toHaveProperty('error');
        expect(data.error).toHaveProperty('code');
        expect(data.error).toHaveProperty('message');
      }
    });
  });
});