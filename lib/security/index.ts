/**
 * Production-ready security measures and input sanitization
 */

import { ValidationError } from '@/lib/errors';
import { log } from '@/lib/logging';

// Security constants
export const SECURITY_CONSTANTS = {
  MAX_INPUT_LENGTH: 1000,
  MAX_ARRAY_LENGTH: 100,
  MAX_OBJECT_DEPTH: 10,
  MAX_STRING_LENGTH: 500,
  MAX_NUMBER_PRECISION: 18,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 100,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  CSRF_TOKEN_LENGTH: 32,
} as const;

// Input sanitization utilities
export class InputSanitizer {
  // HTML/XSS sanitization
  static sanitizeHtml(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/&/g, '&amp;'); // This should be last
  }

  // SQL injection prevention (for future database queries)
  static sanitizeSql(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  }

  // Remove dangerous characters
  static sanitizeAlphanumeric(input: string): string {
    if (typeof input !== 'string') return '';
    
    return input.replace(/[^a-zA-Z0-9\s\-_]/g, '');
  }

  // Sanitize token addresses (blockchain addresses)
  static sanitizeTokenAddress(input: string): string {
    if (typeof input !== 'string') return '';
    
    // Allow only hex characters, colons, and underscores for Move addresses
    return input.replace(/[^0-9a-fA-F:_]/g, '');
  }

  // Sanitize numeric strings
  static sanitizeNumericString(input: string): string {
    if (typeof input !== 'string') return '0';
    
    // Allow only digits and one decimal point
    const sanitized = input.replace(/[^\d.]/g, '');
    const parts = sanitized.split('.');
    
    // Keep only first decimal point
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    return sanitized || '0';
  }

  // Validate and sanitize object depth
  static sanitizeObjectDepth(obj: any, maxDepth: number = SECURITY_CONSTANTS.MAX_OBJECT_DEPTH): any {
    if (maxDepth <= 0) return null;
    
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      if (obj.length > SECURITY_CONSTANTS.MAX_ARRAY_LENGTH) {
        log.security('Array length exceeded maximum', { length: obj.length });
        throw new ValidationError('Array too large');
      }
      
      return obj.slice(0, SECURITY_CONSTANTS.MAX_ARRAY_LENGTH).map(item => 
        this.sanitizeObjectDepth(item, maxDepth - 1)
      );
    }
    
    const result: any = {};
    let keyCount = 0;
    
    for (const [key, value] of Object.entries(obj)) {
      if (keyCount >= SECURITY_CONSTANTS.MAX_ARRAY_LENGTH) {
        log.security('Object key count exceeded maximum', { keyCount });
        break;
      }
      
      const sanitizedKey = this.sanitizeHtml(String(key));
      if (sanitizedKey.length > 0) {
        result[sanitizedKey] = this.sanitizeObjectDepth(value, maxDepth - 1);
        keyCount++;
      }
    }
    
    return result;
  }
}

// Rate limiting implementation
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private static instance: RateLimiter | null = null;
  private records = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Clean up old records every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  checkRateLimit(
    identifier: string, 
    maxRequests: number = SECURITY_CONSTANTS.MAX_REQUESTS_PER_WINDOW,
    windowMs: number = SECURITY_CONSTANTS.RATE_LIMIT_WINDOW_MS
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.records.get(identifier);
    
    if (!record || now - record.windowStart >= windowMs) {
      // New window or no record
      this.records.set(identifier, {
        count: 1,
        windowStart: now,
      });
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
      };
    }
    
    if (record.count >= maxRequests) {
      // Rate limit exceeded
      log.security('Rate limit exceeded', { 
        identifier, 
        count: record.count, 
        maxRequests 
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.windowStart + windowMs,
      };
    }
    
    // Increment count
    record.count++;
    this.records.set(identifier, record);
    
    return {
      allowed: true,
      remaining: maxRequests - record.count,
      resetTime: record.windowStart + windowMs,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, record] of this.records.entries()) {
      if (now - record.windowStart >= SECURITY_CONSTANTS.RATE_LIMIT_WINDOW_MS) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.records.delete(key));
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// CSRF protection
export class CSRFProtection {
  private static tokens = new Set<string>();
  
  static generateToken(): string {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(SECURITY_CONSTANTS.CSRF_TOKEN_LENGTH)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    this.tokens.add(token);
    
    // Clean up old tokens after 1 hour
    setTimeout(() => {
      this.tokens.delete(token);
    }, 60 * 60 * 1000);
    
    return token;
  }
  
  static validateToken(token: string): boolean {
    const isValid = this.tokens.has(token);
    if (!isValid) {
      log.security('Invalid CSRF token', { token: token.substring(0, 8) + '...' });
    }
    return isValid;
  }
}

// Input validation with security checks
export class SecurityValidator {
  static validateInput(input: any, maxLength: number = SECURITY_CONSTANTS.MAX_INPUT_LENGTH): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Input must be a string');
    }
    
    if (input.length > maxLength) {
      log.security('Input length exceeded maximum', { 
        length: input.length, 
        maxLength 
      });
      throw new ValidationError(`Input too long: ${input.length} > ${maxLength}`);
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /onload/i,
      /onerror/i,
      /onclick/i,
      /onmouseover/i,
      /eval\(/i,
      /expression\(/i,
      /alert\(/i,
      /confirm\(/i,
      /prompt\(/i,
      /document\./i,
      /window\./i,
      /setTimeout/i,
      /setInterval/i,
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        log.security('Suspicious pattern detected in input', { 
          pattern: pattern.source,
          input: input.substring(0, 100) 
        });
        throw new ValidationError('Input contains suspicious content');
      }
    }
    
    return InputSanitizer.sanitizeHtml(input);
  }

  static validateTokenAddress(address: string): string {
    const sanitized = InputSanitizer.sanitizeTokenAddress(address);
    
    if (sanitized !== address) {
      log.security('Token address contained invalid characters', { 
        original: address,
        sanitized 
      });
      throw new ValidationError('Invalid characters in token address');
    }
    
    // Basic Move address validation
    if (!/^0x[a-fA-F0-9]+::[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_][a-zA-Z0-9_]*$/.test(address)) {
      throw new ValidationError('Invalid Move address format');
    }
    
    return sanitized;
  }

  static validateNumericAmount(amount: string, decimals: number = 18): string {
    const sanitized = InputSanitizer.sanitizeNumericString(amount);
    
    if (sanitized !== amount) {
      log.security('Numeric amount contained invalid characters', { 
        original: amount,
        sanitized 
      });
    }
    
    const num = parseFloat(sanitized);
    
    if (isNaN(num) || !isFinite(num) || num < 0) {
      throw new ValidationError('Invalid numeric amount');
    }
    
    // Check decimal places
    const decimalPlaces = (sanitized.split('.')[1] || '').length;
    if (decimalPlaces > decimals) {
      throw new ValidationError(`Too many decimal places: ${decimalPlaces} > ${decimals}`);
    }
    
    // Check for unreasonably large numbers
    if (num > Number.MAX_SAFE_INTEGER) {
      throw new ValidationError('Amount too large');
    }
    
    return sanitized;
  }

  static validateObjectSafely(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      throw new ValidationError('Input must be an object');
    }
    
    return InputSanitizer.sanitizeObjectDepth(obj);
  }
}

// Content Security Policy helpers
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-eval'"], // unsafe-eval needed for some blockchain libraries
  'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for styled-components
  'img-src': ["'self'", "data:", "https:"],
  'font-src': ["'self'", "data:"],
  'connect-src': ["'self'", "https:", "wss:"], // Allow connections to RPC endpoints
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
} as const;

export const generateCSPHeader = (): string => {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};

// Security headers for API responses
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': generateCSPHeader(),
} as const;

// Export commonly used functions
export const rateLimiter = RateLimiter.getInstance();
export const sanitize = InputSanitizer;
export const validate = SecurityValidator;
export const csrf = CSRFProtection;

// Utility function to get client IP (for rate limiting)
export const getClientIP = (request: Request): string => {
  // Try various headers that might contain the real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-forwarded',
    'forwarded',
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // Take first IP if there are multiple
      const ip = value.split(',')[0]?.trim();
      if (ip && ip !== 'unknown') {
        return ip;
      }
    }
  }
  
  return 'unknown';
};

// Utility function to get rate limit identifier
export const getRateLimitId = (request: Request, identifier?: string): string => {
  if (identifier) return identifier;
  
  // Use IP address as default identifier
  return getClientIP(request);
};