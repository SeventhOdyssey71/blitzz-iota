/**
 * Tests for error handling system
 */

import {
  AppError,
  ErrorCode,
  ValidationError,
  NetworkError,
  PoolError,
  TransactionError,
  RateLimitError,
  createValidationError,
  createPoolNotFoundError,
  createInsufficientBalanceError,
  parseError,
  getErrorSeverity,
  ErrorSeverity,
} from '@/lib/errors';

describe('Error System', () => {
  describe('AppError', () => {
    it('should create an error with all properties', () => {
      const context = { field: 'amount', value: 'invalid' };
      const error = new AppError(
        ErrorCode.INVALID_INPUT,
        'Test error message',
        400,
        true,
        context
      );

      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.message).toBe('Test error message');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error.context).toEqual(context);
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should have default values', () => {
      const error = new AppError(ErrorCode.UNKNOWN_ERROR, 'Test message');

      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
      expect(error.context).toBeUndefined();
    });

    it('should serialize to JSON correctly', () => {
      const context = { test: 'value' };
      const error = new AppError(
        ErrorCode.INVALID_INPUT,
        'Test error',
        400,
        true,
        context
      );

      const json = error.toJSON();
      expect(json).toMatchObject({
        code: ErrorCode.INVALID_INPUT,
        message: 'Test error',
        statusCode: 400,
        context,
      });
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('Specific Error Classes', () => {
    it('should create ValidationError with correct defaults', () => {
      const error = new ValidationError('Invalid input');

      expect(error.code).toBe(ErrorCode.INVALID_INPUT);
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should create NetworkError with correct defaults', () => {
      const error = new NetworkError('Network failed');

      expect(error.code).toBe(ErrorCode.NETWORK_ERROR);
      expect(error.statusCode).toBe(503);
      expect(error.isOperational).toBe(true);
    });

    it('should create PoolError with correct status codes', () => {
      const notFoundError = new PoolError(ErrorCode.POOL_NOT_FOUND, 'Pool not found');
      expect(notFoundError.statusCode).toBe(404);

      const liquidityError = new PoolError(ErrorCode.INSUFFICIENT_LIQUIDITY, 'No liquidity');
      expect(liquidityError.statusCode).toBe(400);
    });

    it('should create TransactionError with correct defaults', () => {
      const error = new TransactionError(ErrorCode.TRANSACTION_FAILED, 'TX failed');

      expect(error.code).toBe(ErrorCode.TRANSACTION_FAILED);
      expect(error.statusCode).toBe(400);
    });

    it('should create RateLimitError with correct defaults', () => {
      const error = new RateLimitError();

      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Rate limit exceeded');
    });
  });

  describe('Error Factory Functions', () => {
    it('should create validation error with context', () => {
      const error = createValidationError('amount', 'abc', 'number');

      expect(error instanceof ValidationError).toBe(true);
      expect(error.message).toContain('Invalid amount');
      expect(error.context).toMatchObject({
        field: 'amount',
        value: 'abc',
        expected: 'number',
      });
    });

    it('should create pool not found error', () => {
      const error = createPoolNotFoundError('IOTA', 'stIOTA');

      expect(error instanceof PoolError).toBe(true);
      expect(error.code).toBe(ErrorCode.POOL_NOT_FOUND);
      expect(error.message).toContain('IOTA/stIOTA');
      expect(error.context).toMatchObject({
        tokenA: 'IOTA',
        tokenB: 'stIOTA',
      });
    });

    it('should create insufficient balance error', () => {
      const error = createInsufficientBalanceError('100', '50', 'IOTA');

      expect(error instanceof TransactionError).toBe(true);
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
      expect(error.message).toContain('Insufficient IOTA balance');
      expect(error.context).toMatchObject({
        required: '100',
        available: '50',
        token: 'IOTA',
      });
    });
  });

  describe('parseError', () => {
    it('should return AppError as-is', () => {
      const originalError = new ValidationError('Test error');
      const parsed = parseError(originalError);

      expect(parsed).toBe(originalError);
    });

    it('should convert Error to AppError', () => {
      const originalError = new Error('Regular error');
      const parsed = parseError(originalError);

      expect(parsed instanceof AppError).toBe(true);
      expect(parsed.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(parsed.message).toBe('Regular error');
      expect(parsed.statusCode).toBe(500);
    });

    it('should convert unknown type to AppError', () => {
      const parsed = parseError('string error');

      expect(parsed instanceof AppError).toBe(true);
      expect(parsed.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(parsed.message).toBe('An unknown error occurred');
      expect(parsed.context).toMatchObject({
        originalError: 'string error',
      });
    });
  });

  describe('getErrorSeverity', () => {
    it('should return CRITICAL for 5xx errors', () => {
      const error = new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Server error', 500);
      expect(getErrorSeverity(error)).toBe(ErrorSeverity.CRITICAL);
    });

    it('should return HIGH for transaction errors', () => {
      const error = new TransactionError(ErrorCode.TRANSACTION_FAILED, 'TX failed');
      expect(getErrorSeverity(error)).toBe(ErrorSeverity.HIGH);
    });

    it('should return MEDIUM for network errors', () => {
      const error = new NetworkError('Network failed');
      expect(getErrorSeverity(error)).toBe(ErrorSeverity.MEDIUM);
    });

    it('should return LOW for validation errors', () => {
      const error = new ValidationError('Invalid input');
      expect(getErrorSeverity(error)).toBe(ErrorSeverity.LOW);
    });
  });
});