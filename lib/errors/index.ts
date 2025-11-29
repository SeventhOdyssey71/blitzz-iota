/**
 * Production-ready error handling system
 */

export enum ErrorCode {
  // Validation Errors (1000-1099)
  INVALID_INPUT = 1000,
  INVALID_TOKEN_TYPE = 1001,
  INVALID_AMOUNT = 1002,
  INVALID_SLIPPAGE = 1003,
  INVALID_DEADLINE = 1004,
  
  // Network Errors (1100-1199)
  NETWORK_ERROR = 1100,
  RPC_ERROR = 1101,
  TIMEOUT_ERROR = 1102,
  CONNECTION_FAILED = 1103,
  
  // Pool Errors (1200-1299)
  POOL_NOT_FOUND = 1200,
  INSUFFICIENT_LIQUIDITY = 1201,
  POOL_PAUSED = 1202,
  POOL_NOT_INITIALIZED = 1203,
  
  // Transaction Errors (1300-1399)
  TRANSACTION_FAILED = 1300,
  INSUFFICIENT_BALANCE = 1301,
  GAS_ESTIMATION_FAILED = 1302,
  SLIPPAGE_EXCEEDED = 1303,
  DEADLINE_EXCEEDED = 1304,
  
  // Smart Contract Errors (1400-1499)
  CONTRACT_CALL_FAILED = 1400,
  CONTRACT_NOT_DEPLOYED = 1401,
  INVALID_CONTRACT_STATE = 1402,
  
  // Authentication/Authorization Errors (1500-1599)
  UNAUTHORIZED = 1500,
  INVALID_SIGNATURE = 1501,
  WALLET_NOT_CONNECTED = 1502,
  
  // Rate Limiting (1600-1699)
  RATE_LIMIT_EXCEEDED = 1600,
  TOO_MANY_REQUESTS = 1601,
  
  // Internal Errors (1700-1799)
  INTERNAL_SERVER_ERROR = 1700,
  DATABASE_ERROR = 1701,
  CACHE_ERROR = 1702,
  
  // Unknown/Generic (1800-1899)
  UNKNOWN_ERROR = 1800
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, AppError);
    
    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
    };
  }
}

// Specific error classes for better type safety
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.INVALID_INPUT, message, 400, true, context);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(ErrorCode.NETWORK_ERROR, message, 503, true, context);
  }
}

export class PoolError extends AppError {
  constructor(code: ErrorCode, message: string, context?: Record<string, any>) {
    const statusCode = code === ErrorCode.POOL_NOT_FOUND ? 404 : 400;
    super(code, message, statusCode, true, context);
  }
}

export class TransactionError extends AppError {
  constructor(code: ErrorCode, message: string, context?: Record<string, any>) {
    super(code, message, 400, true, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429, true, context);
  }
}

// Error factory functions for common scenarios
export const createValidationError = (field: string, value: any, expected: string) => {
  return new ValidationError(
    `Invalid ${field}: expected ${expected}, got ${typeof value}`,
    { field, value, expected }
  );
};

export const createPoolNotFoundError = (tokenA: string, tokenB: string) => {
  return new PoolError(
    ErrorCode.POOL_NOT_FOUND,
    `No pool found for pair ${tokenA}/${tokenB}`,
    { tokenA, tokenB }
  );
};

export const createInsufficientBalanceError = (required: string, available: string, token: string) => {
  return new TransactionError(
    ErrorCode.INSUFFICIENT_BALANCE,
    `Insufficient ${token} balance: required ${required}, available ${available}`,
    { required, available, token }
  );
};

// Error handler for unhandled promise rejections
export const handleUncaughtError = (error: Error) => {
  console.error('[UNCAUGHT_ERROR]', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
  
  // In production, you might want to:
  // 1. Log to external monitoring service
  // 2. Send notifications to development team
  // 3. Gracefully shutdown if critical
};

// Utility to safely parse error from unknown type
export const parseError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(
      ErrorCode.UNKNOWN_ERROR,
      error.message,
      500,
      false,
      { originalError: error.name }
    );
  }
  
  return new AppError(
    ErrorCode.UNKNOWN_ERROR,
    'An unknown error occurred',
    500,
    false,
    { originalError: String(error) }
  );
};

// Type guards for error checking
export const isValidationError = (error: any): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isNetworkError = (error: any): error is NetworkError => {
  return error instanceof NetworkError;
};

export const isPoolError = (error: any): error is PoolError => {
  return error instanceof PoolError;
};

export const isTransactionError = (error: any): error is TransactionError => {
  return error instanceof TransactionError;
};

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

export const getErrorSeverity = (error: AppError): ErrorSeverity => {
  if (error.statusCode >= 500) return ErrorSeverity.CRITICAL;
  if (error.code >= 1300 && error.code < 1400) return ErrorSeverity.HIGH;
  if (error.code >= 1100 && error.code < 1300) return ErrorSeverity.MEDIUM;
  return ErrorSeverity.LOW;
};