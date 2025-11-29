/**
 * Security middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  rateLimiter, 
  getRateLimitId, 
  SECURITY_HEADERS,
  validate,
  csrf 
} from '@/lib/security';
import { log } from '@/lib/logging';
import { RateLimitError, ValidationError } from '@/lib/errors';

export interface SecurityOptions {
  enableRateLimit?: boolean;
  maxRequests?: number;
  windowMs?: number;
  enableCSRF?: boolean;
  requireAuth?: boolean;
  validateInput?: boolean;
  enableLogging?: boolean;
}

const defaultOptions: SecurityOptions = {
  enableRateLimit: true,
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  enableCSRF: false, // Disabled for API endpoints, enabled for forms
  requireAuth: false,
  validateInput: true,
  enableLogging: true,
};

// Security middleware function
export const withSecurity = (
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: SecurityOptions = {}
) => {
  const opts = { ...defaultOptions, ...options };
  
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let rateLimitId: string | undefined;
    
    try {
      // Apply security headers to all responses
      const addSecurityHeaders = (response: NextResponse): NextResponse => {
        Object.entries(SECURITY_HEADERS).forEach(([header, value]) => {
          response.headers.set(header, value);
        });
        return response;
      };

      // Rate limiting
      if (opts.enableRateLimit) {
        rateLimitId = getRateLimitId(request);
        const rateLimit = rateLimiter.checkRateLimit(
          rateLimitId, 
          opts.maxRequests!, 
          opts.windowMs!
        );
        
        if (!rateLimit.allowed) {
          if (opts.enableLogging) {
            log.security('Rate limit exceeded', {
              ip: rateLimitId,
              endpoint: request.nextUrl.pathname,
              method: request.method,
            });
          }
          
          const response = NextResponse.json(
            { 
              success: false,
              error: {
                code: 1600,
                message: 'Rate limit exceeded',
                retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
              },
              timestamp: new Date().toISOString(),
            },
            { status: 429 }
          );
          
          // Add rate limit headers
          response.headers.set('X-RateLimit-Limit', opts.maxRequests!.toString());
          response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
          response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
          response.headers.set('Retry-After', Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString());
          
          return addSecurityHeaders(response);
        }
        
        // Log successful rate limit check
        if (opts.enableLogging) {
          log.debug('Rate limit check passed', {
            ip: rateLimitId,
            remaining: rateLimit.remaining,
            endpoint: request.nextUrl.pathname,
          });
        }
      }

      // CSRF protection for non-GET requests
      if (opts.enableCSRF && request.method !== 'GET') {
        const csrfToken = request.headers.get('X-CSRF-Token');
        if (!csrfToken || !csrf.validateToken(csrfToken)) {
          if (opts.enableLogging) {
            log.security('CSRF validation failed', {
              ip: rateLimitId,
              endpoint: request.nextUrl.pathname,
              method: request.method,
            });
          }
          
          const response = NextResponse.json(
            {
              success: false,
              error: {
                code: 1500,
                message: 'CSRF token validation failed',
              },
              timestamp: new Date().toISOString(),
            },
            { status: 403 }
          );
          
          return addSecurityHeaders(response);
        }
      }

      // Content-Type validation for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          if (opts.enableLogging) {
            log.security('Invalid content type', {
              ip: rateLimitId,
              contentType,
              endpoint: request.nextUrl.pathname,
            });
          }
          
          const response = NextResponse.json(
            {
              success: false,
              error: {
                code: 1000,
                message: 'Invalid content type. Expected application/json',
              },
              timestamp: new Date().toISOString(),
            },
            { status: 400 }
          );
          
          return addSecurityHeaders(response);
        }
      }

      // Input validation
      if (opts.validateInput && request.method !== 'GET') {
        try {
          const contentLength = request.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
            throw new ValidationError('Request body too large');
          }
          
          // Clone request for body parsing (body can only be read once)
          const clonedRequest = request.clone();
          
          try {
            const body = await clonedRequest.json();
            
            // Validate object structure
            validate.validateObjectSafely(body);
            
          } catch (error) {
            if (error instanceof ValidationError) {
              throw error;
            }
            
            // Invalid JSON
            throw new ValidationError('Invalid JSON in request body');
          }
        } catch (error) {
          if (opts.enableLogging) {
            log.security('Input validation failed', {
              ip: rateLimitId,
              endpoint: request.nextUrl.pathname,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
          
          if (error instanceof ValidationError) {
            const response = NextResponse.json(
              {
                success: false,
                error: {
                  code: error.code,
                  message: error.message,
                },
                timestamp: new Date().toISOString(),
              },
              { status: 400 }
            );
            
            return addSecurityHeaders(response);
          }
          
          // Re-throw other errors
          throw error;
        }
      }

      // Authentication check (placeholder for future implementation)
      if (opts.requireAuth) {
        // TODO: Implement authentication logic
        // For now, just check for Authorization header
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          if (opts.enableLogging) {
            log.security('Authentication required', {
              ip: rateLimitId,
              endpoint: request.nextUrl.pathname,
            });
          }
          
          const response = NextResponse.json(
            {
              success: false,
              error: {
                code: 1500,
                message: 'Authentication required',
              },
              timestamp: new Date().toISOString(),
            },
            { status: 401 }
          );
          
          return addSecurityHeaders(response);
        }
      }

      // Log successful security checks
      if (opts.enableLogging) {
        log.api(request.method, request.nextUrl.pathname, undefined, {
          ip: rateLimitId,
          userAgent: request.headers.get('user-agent'),
          referer: request.headers.get('referer'),
        });
      }

      // Call the actual handler
      const response = await handler(request);
      
      // Add security headers and rate limit info to response
      const secureResponse = addSecurityHeaders(response);
      
      if (opts.enableRateLimit && rateLimitId) {
        const rateLimit = rateLimiter.checkRateLimit(rateLimitId, 0); // Check without incrementing
        secureResponse.headers.set('X-RateLimit-Limit', opts.maxRequests!.toString());
        secureResponse.headers.set('X-RateLimit-Remaining', Math.max(0, rateLimit.remaining).toString());
        secureResponse.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
      }
      
      // Log response time
      if (opts.enableLogging) {
        const duration = Date.now() - startTime;
        log.api(request.method, request.nextUrl.pathname, duration, {
          status: response.status,
          ip: rateLimitId,
        });
      }
      
      return secureResponse;
      
    } catch (error) {
      // Handle errors with proper logging
      if (opts.enableLogging) {
        log.error('Security middleware error', {
          ip: rateLimitId,
          endpoint: request.nextUrl.pathname,
          method: request.method,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      
      // Return generic error response
      const response = NextResponse.json(
        {
          success: false,
          error: {
            code: 1700,
            message: 'Internal server error',
          },
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
      
      return response;
    }
  };
};

// Predefined security configurations for different endpoint types
export const securityConfigs = {
  // Public API endpoints (like price feeds)
  public: {
    enableRateLimit: true,
    maxRequests: 1000,
    windowMs: 60000,
    enableCSRF: false,
    requireAuth: false,
    validateInput: true,
    enableLogging: true,
  },
  
  // Trading endpoints (swaps, orders)
  trading: {
    enableRateLimit: true,
    maxRequests: 100,
    windowMs: 60000,
    enableCSRF: false,
    requireAuth: false, // Will be enabled when wallet auth is implemented
    validateInput: true,
    enableLogging: true,
  },
  
  // Admin endpoints
  admin: {
    enableRateLimit: true,
    maxRequests: 50,
    windowMs: 60000,
    enableCSRF: true,
    requireAuth: true,
    validateInput: true,
    enableLogging: true,
  },
  
  // Analysis/stats endpoints
  analytics: {
    enableRateLimit: true,
    maxRequests: 200,
    windowMs: 60000,
    enableCSRF: false,
    requireAuth: false,
    validateInput: false, // Mostly GET requests
    enableLogging: true,
  },
} as const;

// Convenience functions for common configurations
export const withPublicSecurity = (handler: (request: NextRequest) => Promise<NextResponse>) =>
  withSecurity(handler, securityConfigs.public);

export const withTradingSecurity = (handler: (request: NextRequest) => Promise<NextResponse>) =>
  withSecurity(handler, securityConfigs.trading);

export const withAdminSecurity = (handler: (request: NextRequest) => Promise<NextResponse>) =>
  withSecurity(handler, securityConfigs.admin);

export const withAnalyticsSecurity = (handler: (request: NextRequest) => Promise<NextResponse>) =>
  withSecurity(handler, securityConfigs.analytics);