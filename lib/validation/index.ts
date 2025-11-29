/**
 * Production-ready input validation system
 */

import { ValidationError, createValidationError } from '@/lib/errors';
import { SUPPORTED_COINS } from '@/config/iota.config';

// Type definitions for validation schemas
export interface ValidationRule<T = any> {
  required?: boolean;
  type?: 'string' | 'number' | 'bigint' | 'boolean' | 'array' | 'object';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
  sanitize?: (value: T) => T;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

// Core validation class
export class Validator {
  private schema: ValidationSchema;

  constructor(schema: ValidationSchema) {
    this.schema = schema;
  }

  validate<T = any>(data: any): ValidationResult<T> {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};

    for (const [field, rule] of Object.entries(this.schema)) {
      const value = data[field];
      
      try {
        // Check required fields
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(createValidationError(field, value, 'a non-empty value'));
          continue;
        }

        // Skip validation for optional empty values
        if (!rule.required && (value === undefined || value === null || value === '')) {
          continue;
        }

        // Type validation
        if (rule.type && !this.validateType(value, rule.type)) {
          errors.push(createValidationError(field, value, rule.type));
          continue;
        }

        // Range validation for numbers
        if (rule.type === 'number' && typeof value === 'number') {
          if (rule.min !== undefined && value < rule.min) {
            errors.push(new ValidationError(
              `${field} must be at least ${rule.min}`,
              { field, value, min: rule.min }
            ));
            continue;
          }
          if (rule.max !== undefined && value > rule.max) {
            errors.push(new ValidationError(
              `${field} must be at most ${rule.max}`,
              { field, value, max: rule.max }
            ));
            continue;
          }
        }

        // Pattern validation for strings
        if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
          errors.push(new ValidationError(
            `${field} does not match required format`,
            { field, value, pattern: rule.pattern.toString() }
          ));
          continue;
        }

        // Custom validation
        if (rule.custom) {
          const customResult = rule.custom(value);
          if (typeof customResult === 'string') {
            errors.push(new ValidationError(customResult, { field, value }));
            continue;
          }
          if (!customResult) {
            errors.push(new ValidationError(
              `${field} failed custom validation`,
              { field, value }
            ));
            continue;
          }
        }

        // Sanitization
        const sanitizedValue = rule.sanitize ? rule.sanitize(value) : value;
        sanitizedData[field] = sanitizedValue;

      } catch (error) {
        errors.push(new ValidationError(
          `Validation error for field ${field}: ${error}`,
          { field, value, error: String(error) }
        ));
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? sanitizedData as T : undefined,
      errors,
    };
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
      case 'bigint':
        return typeof value === 'bigint' || (typeof value === 'string' && /^\d+$/.test(value));
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      default:
        return false;
    }
  }
}

// Token validation utilities
export const isValidTokenType = (tokenType: string): boolean => {
  if (!tokenType || typeof tokenType !== 'string') return false;
  
  // Check if it's a supported coin
  const supportedTypes = Object.values(SUPPORTED_COINS).map(coin => coin.type);
  if (supportedTypes.includes(tokenType)) return true;
  
  // Check if it matches Move address pattern
  const moveAddressPattern = /^0x[a-fA-F0-9]{1,64}::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*$/;
  return moveAddressPattern.test(tokenType);
};

export const isValidAmount = (amount: string, decimals: number = 9): boolean => {
  if (!amount || typeof amount !== 'string') return false;
  
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) return false;
  
  // Check if amount doesn't exceed maximum safe integer when converted to smallest unit
  const maxSafeAmount = Number.MAX_SAFE_INTEGER / Math.pow(10, decimals);
  return amountNum <= maxSafeAmount;
};

export const isValidSlippage = (slippage: number): boolean => {
  return typeof slippage === 'number' && 
         slippage >= 0.01 && // Minimum 0.01%
         slippage <= 50 &&   // Maximum 50%
         !isNaN(slippage) && 
         isFinite(slippage);
};

export const isValidPoolId = (poolId: string): boolean => {
  if (!poolId || typeof poolId !== 'string') return false;
  
  // IOTA object ID pattern
  const objectIdPattern = /^0x[a-fA-F0-9]{64}$/;
  return objectIdPattern.test(poolId);
};

// Sanitization utilities
export const sanitizeAmount = (amount: string): string => {
  if (typeof amount !== 'string') return '0';
  
  // Remove any non-numeric characters except decimal point
  const cleaned = amount.replace(/[^\d.]/g, '');
  
  // Ensure only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }
  
  return cleaned || '0';
};

export const sanitizeTokenType = (tokenType: string): string => {
  if (typeof tokenType !== 'string') return '';
  
  // Remove whitespace and convert to lowercase for comparison
  return tokenType.trim();
};

// Common validation schemas
export const swapValidationSchema: ValidationSchema = {
  inputToken: {
    required: true,
    type: 'string',
    custom: isValidTokenType,
    sanitize: sanitizeTokenType,
  },
  outputToken: {
    required: true,
    type: 'string',
    custom: isValidTokenType,
    sanitize: sanitizeTokenType,
  },
  inputAmount: {
    required: true,
    type: 'string',
    custom: (value: string) => isValidAmount(value),
    sanitize: sanitizeAmount,
  },
  slippage: {
    required: false,
    type: 'number',
    custom: isValidSlippage,
    min: 0.01,
    max: 50,
  },
  deadline: {
    required: false,
    type: 'number',
    min: Date.now(),
    max: Date.now() + 24 * 60 * 60 * 1000, // Max 24 hours
  },
};

export const poolValidationSchema: ValidationSchema = {
  poolId: {
    required: true,
    type: 'string',
    custom: isValidPoolId,
  },
  coinTypeA: {
    required: true,
    type: 'string',
    custom: isValidTokenType,
    sanitize: sanitizeTokenType,
  },
  coinTypeB: {
    required: true,
    type: 'string',
    custom: isValidTokenType,
    sanitize: sanitizeTokenType,
  },
};

export const dcaValidationSchema: ValidationSchema = {
  sourceTokenType: {
    required: true,
    type: 'string',
    custom: isValidTokenType,
    sanitize: sanitizeTokenType,
  },
  targetTokenType: {
    required: true,
    type: 'string',
    custom: isValidTokenType,
    sanitize: sanitizeTokenType,
  },
  totalAmount: {
    required: true,
    type: 'string',
    custom: (value: string) => isValidAmount(value),
    sanitize: sanitizeAmount,
  },
  amountPerOrder: {
    required: true,
    type: 'string',
    custom: (value: string) => isValidAmount(value),
    sanitize: sanitizeAmount,
  },
  intervalMs: {
    required: true,
    type: 'number',
    min: 60000, // Minimum 1 minute
    max: 30 * 24 * 60 * 60 * 1000, // Maximum 30 days
  },
  totalOrders: {
    required: true,
    type: 'number',
    min: 1,
    max: 1000, // Reasonable maximum
  },
  maxSlippageBps: {
    required: true,
    type: 'number',
    min: 1, // 0.01%
    max: 5000, // 50%
  },
  name: {
    required: true,
    type: 'string',
    pattern: /^[a-zA-Z0-9\s\-_]{1,50}$/,
    sanitize: (value: string) => value.trim().slice(0, 50),
  },
};

// Validation helper functions
export const validateSwapRequest = (data: any): ValidationResult => {
  const validator = new Validator(swapValidationSchema);
  return validator.validate(data);
};

export const validatePoolRequest = (data: any): ValidationResult => {
  const validator = new Validator(poolValidationSchema);
  return validator.validate(data);
};

export const validateDCARequest = (data: any): ValidationResult => {
  const validator = new Validator(dcaValidationSchema);
  const result = validator.validate(data);
  
  // Additional DCA-specific validation
  if (result.isValid && result.data) {
    const { sourceTokenType, targetTokenType, totalAmount, amountPerOrder, totalOrders } = result.data;
    
    // Ensure source and target tokens are different
    if (sourceTokenType === targetTokenType) {
      result.errors.push(new ValidationError(
        'Source and target tokens must be different',
        { sourceTokenType, targetTokenType }
      ));
      result.isValid = false;
    }
    
    // Ensure total amount is properly divided
    const totalAmountNum = parseFloat(totalAmount);
    const amountPerOrderNum = parseFloat(amountPerOrder);
    const calculatedOrders = Math.floor(totalAmountNum / amountPerOrderNum);
    
    if (calculatedOrders !== totalOrders) {
      result.errors.push(new ValidationError(
        `Total orders (${totalOrders}) doesn't match calculated orders (${calculatedOrders}) from total amount and amount per order`,
        { totalAmount, amountPerOrder, totalOrders, calculatedOrders }
      ));
      result.isValid = false;
    }
  }
  
  return result;
};

// Export commonly used validators
export const validators = {
  swap: new Validator(swapValidationSchema),
  pool: new Validator(poolValidationSchema),
  dca: new Validator(dcaValidationSchema),
};