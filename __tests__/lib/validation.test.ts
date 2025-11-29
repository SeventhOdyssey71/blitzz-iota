/**
 * Tests for validation system
 */

import {
  Validator,
  isValidTokenType,
  isValidAmount,
  isValidSlippage,
  isValidPoolId,
  sanitizeAmount,
  sanitizeTokenType,
  validateSwapRequest,
  validateDCARequest,
  validators,
} from '@/lib/validation';
import { ValidationError } from '@/lib/errors';

describe('Validation System', () => {
  describe('Validator Class', () => {
    it('should validate required fields', () => {
      const schema = {
        name: { required: true, type: 'string' as const },
        age: { required: true, type: 'number' as const },
      };
      const validator = new Validator(schema);

      const result = validator.validate({ name: 'John', age: 25 });
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ name: 'John', age: 25 });
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', () => {
      const schema = {
        name: { required: true, type: 'string' as const },
      };
      const validator = new Validator(schema);

      const result = validator.validate({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBeInstanceOf(ValidationError);
    });

    it('should validate types correctly', () => {
      const schema = {
        str: { type: 'string' as const },
        num: { type: 'number' as const },
        bool: { type: 'boolean' as const },
        arr: { type: 'array' as const },
        obj: { type: 'object' as const },
      };
      const validator = new Validator(schema);

      const result = validator.validate({
        str: 'hello',
        num: 42,
        bool: true,
        arr: [1, 2, 3],
        obj: { key: 'value' },
      });

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should validate number ranges', () => {
      const schema = {
        value: { type: 'number' as const, min: 0, max: 100 },
      };
      const validator = new Validator(schema);

      expect(validator.validate({ value: 50 }).isValid).toBe(true);
      expect(validator.validate({ value: -1 }).isValid).toBe(false);
      expect(validator.validate({ value: 101 }).isValid).toBe(false);
    });

    it('should validate patterns', () => {
      const schema = {
        email: { type: 'string' as const, pattern: /^[^@]+@[^@]+\.[^@]+$/ },
      };
      const validator = new Validator(schema);

      expect(validator.validate({ email: 'test@example.com' }).isValid).toBe(true);
      expect(validator.validate({ email: 'invalid-email' }).isValid).toBe(false);
    });

    it('should apply custom validation', () => {
      const schema = {
        value: {
          type: 'string' as const,
          custom: (value: string) => value.includes('valid'),
        },
      };
      const validator = new Validator(schema);

      expect(validator.validate({ value: 'valid-string' }).isValid).toBe(true);
      expect(validator.validate({ value: 'invalid-string' }).isValid).toBe(false);
    });

    it('should sanitize values', () => {
      const schema = {
        text: {
          type: 'string' as const,
          sanitize: (value: string) => value.trim().toLowerCase(),
        },
      };
      const validator = new Validator(schema);

      const result = validator.validate({ text: '  HELLO  ' });
      expect(result.isValid).toBe(true);
      expect(result.data?.text).toBe('hello');
    });
  });

  describe('Token Validation', () => {
    it('should validate supported token types', () => {
      expect(isValidTokenType('0x2::iota::IOTA')).toBe(true);
      expect(isValidTokenType('0x2::stiota::STIOTA')).toBe(true);
    });

    it('should validate Move address format', () => {
      expect(isValidTokenType('0x123::module::Type')).toBe(true);
      expect(isValidTokenType('invalid-address')).toBe(false);
      expect(isValidTokenType('')).toBe(false);
      expect(isValidTokenType('0x123')).toBe(false);
    });

    it('should validate amounts', () => {
      expect(isValidAmount('100')).toBe(true);
      expect(isValidAmount('100.5')).toBe(true);
      expect(isValidAmount('0.000000001')).toBe(true);
      expect(isValidAmount('-100')).toBe(false);
      expect(isValidAmount('abc')).toBe(false);
      expect(isValidAmount('')).toBe(false);
    });

    it('should validate slippage', () => {
      expect(isValidSlippage(0.5)).toBe(true);
      expect(isValidSlippage(5)).toBe(true);
      expect(isValidSlippage(0.001)).toBe(false); // Too small
      expect(isValidSlippage(51)).toBe(false); // Too large
      expect(isValidSlippage(NaN)).toBe(false);
    });

    it('should validate pool IDs', () => {
      const validId = '0x' + '1'.repeat(64);
      expect(isValidPoolId(validId)).toBe(true);
      expect(isValidPoolId('0x123')).toBe(false);
      expect(isValidPoolId('invalid')).toBe(false);
    });
  });

  describe('Sanitization', () => {
    it('should sanitize amounts', () => {
      expect(sanitizeAmount('$100.50')).toBe('100.50');
      expect(sanitizeAmount('1,000.00')).toBe('1000.00');
      expect(sanitizeAmount('abc')).toBe('0');
      expect(sanitizeAmount('')).toBe('0');
      expect(sanitizeAmount('100..50')).toBe('100.50');
    });

    it('should sanitize token types', () => {
      expect(sanitizeTokenType('  0x2::iota::IOTA  ')).toBe('0x2::iota::IOTA');
      expect(sanitizeTokenType('')).toBe('');
    });
  });

  describe('Swap Validation', () => {
    it('should validate valid swap request', () => {
      const request = {
        inputToken: '0x2::iota::IOTA',
        outputToken: '0x2::stiota::STIOTA',
        inputAmount: '100.5',
        slippage: 0.5,
      };

      const result = validateSwapRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should fail validation for invalid swap request', () => {
      const request = {
        inputToken: 'invalid-token',
        outputToken: '0x2::stiota::STIOTA',
        inputAmount: 'abc',
      };

      const result = validateSwapRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('DCA Validation', () => {
    it('should validate valid DCA request', () => {
      const request = {
        sourceTokenType: '0x2::iota::IOTA',
        targetTokenType: '0x2::stiota::STIOTA',
        totalAmount: '1000',
        amountPerOrder: '100',
        intervalMs: 86400000, // 1 day
        totalOrders: 10,
        maxSlippageBps: 500, // 5%
        name: 'My DCA Strategy',
      };

      const result = validateDCARequest(request);
      expect(result.isValid).toBe(true);
    });

    it('should fail for same source and target tokens', () => {
      const request = {
        sourceTokenType: '0x2::iota::IOTA',
        targetTokenType: '0x2::iota::IOTA', // Same as source
        totalAmount: '1000',
        amountPerOrder: '100',
        intervalMs: 86400000,
        totalOrders: 10,
        maxSlippageBps: 500,
        name: 'Invalid Strategy',
      };

      const result = validateDCARequest(request);
      expect(result.isValid).toBe(false);
    });

    it('should fail for mismatched amounts and orders', () => {
      const request = {
        sourceTokenType: '0x2::iota::IOTA',
        targetTokenType: '0x2::stiota::STIOTA',
        totalAmount: '1000',
        amountPerOrder: '150', // 1000/150 = 6.67, not 10
        intervalMs: 86400000,
        totalOrders: 10,
        maxSlippageBps: 500,
        name: 'Mismatched Strategy',
      };

      const result = validateDCARequest(request);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Pre-configured Validators', () => {
    it('should use swap validator', () => {
      const validData = {
        inputToken: '0x2::iota::IOTA',
        outputToken: '0x2::stiota::STIOTA',
        inputAmount: '100',
      };

      const result = validators.swap.validate(validData);
      expect(result.isValid).toBe(true);
    });

    it('should use pool validator', () => {
      const validData = {
        poolId: '0x' + '1'.repeat(64),
        coinTypeA: '0x2::iota::IOTA',
        coinTypeB: '0x2::stiota::STIOTA',
      };

      const result = validators.pool.validate(validData);
      expect(result.isValid).toBe(true);
    });
  });
});