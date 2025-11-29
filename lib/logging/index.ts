/**
 * Production-ready logging system
 */

import { config } from '@/lib/config';
import { AppError, ErrorSeverity, getErrorSeverity } from '@/lib/errors';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly timestamp: string;
  readonly context?: Record<string, unknown>;
  readonly error?: {
    readonly name: string;
    readonly message: string;
    readonly stack?: string;
    readonly code?: number;
  };
  readonly metadata?: {
    readonly userId?: string;
    readonly sessionId?: string;
    readonly traceId?: string;
    readonly userAgent?: string;
    readonly ip?: string;
    readonly url?: string;
    readonly method?: string;
  };
}

export interface LogTransport {
  log(entry: LogEntry): void | Promise<void>;
}

// Console transport for development
class ConsoleTransport implements LogTransport {
  private readonly colors = {
    [LogLevel.DEBUG]: '\x1b[36m', // Cyan
    [LogLevel.INFO]: '\x1b[32m',  // Green
    [LogLevel.WARN]: '\x1b[33m',  // Yellow
    [LogLevel.ERROR]: '\x1b[31m', // Red
    [LogLevel.CRITICAL]: '\x1b[35m', // Magenta
  };

  private readonly reset = '\x1b[0m';

  log(entry: LogEntry): void {
    const color = this.colors[entry.level] || '';
    const levelName = LogLevel[entry.level].padEnd(8);
    const timestamp = new Date(entry.timestamp).toISOString();
    
    const prefix = `${color}[${levelName}]${this.reset} ${timestamp}`;
    const message = `${prefix} ${entry.message}`;
    
    // Choose console method based on level
    const consoleMethod = entry.level >= LogLevel.ERROR ? 'error' :
                         entry.level >= LogLevel.WARN ? 'warn' :
                         entry.level >= LogLevel.INFO ? 'info' : 'debug';
    
    console[consoleMethod](message);
    
    if (entry.context && Object.keys(entry.context).length > 0) {
      console[consoleMethod]('Context:', entry.context);
    }
    
    if (entry.error) {
      console[consoleMethod]('Error:', entry.error);
    }
    
    if (entry.metadata) {
      console[consoleMethod]('Metadata:', entry.metadata);
    }
  }
}

// JSON transport for production (can be extended to send to external services)
class JsonTransport implements LogTransport {
  log(entry: LogEntry): void {
    const jsonEntry = JSON.stringify(entry);
    
    // In production, you would send this to your logging service
    // For now, we'll use console for structured logging
    if (entry.level >= LogLevel.ERROR) {
      console.error(jsonEntry);
    } else if (entry.level >= LogLevel.WARN) {
      console.warn(jsonEntry);
    } else {
      console.log(jsonEntry);
    }
  }
}

// File transport for server-side logging
class FileTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private readonly maxBufferSize = 100;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Flush buffer every 5 seconds or when it reaches max size
    this.flushInterval = setInterval(() => this.flush(), 5000);
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry);
    
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) return;

    // In a real implementation, you would write to files or send to external service
    const entries = this.buffer.splice(0);
    
    // For demonstration, we'll just log the count
    console.log(`[FileTransport] Flushed ${entries.length} log entries`);
    
    // TODO: Implement actual file writing or external service integration
    // Example integrations:
    // - Winston file transport
    // - Datadog logs
    // - CloudWatch logs
    // - Elasticsearch
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush();
  }
}

// Main logger class
class Logger {
  private static instance: Logger | null = null;
  private transports: LogTransport[] = [];
  private minimumLevel: LogLevel = LogLevel.INFO;

  private constructor() {
    this.setupTransports();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private setupTransports(): void {
    const logLevel = config.getLogLevel();
    
    // Set minimum log level based on environment
    switch (logLevel) {
      case 'debug':
        this.minimumLevel = LogLevel.DEBUG;
        break;
      case 'info':
        this.minimumLevel = LogLevel.INFO;
        break;
      case 'warn':
        this.minimumLevel = LogLevel.WARN;
        break;
      case 'error':
        this.minimumLevel = LogLevel.ERROR;
        break;
    }

    // Add appropriate transports based on environment
    if (config.isDevelopment()) {
      this.transports.push(new ConsoleTransport());
    } else {
      this.transports.push(new JsonTransport());
      
      // Add file transport for server-side logging
      if (typeof window === 'undefined') {
        this.transports.push(new FileTransport());
      }
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    error?: Error | AppError
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = { ...context };
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      if (error instanceof AppError) {
        entry.error.code = error.code;
      }
    }

    // Add metadata if available (from request context, etc.)
    const metadata = this.getMetadata();
    if (metadata) {
      entry.metadata = metadata;
    }

    return entry;
  }

  private getMetadata(): LogEntry['metadata'] | undefined {
    // In a real application, you would extract this from request context
    // For now, we'll return basic information
    if (typeof window !== 'undefined') {
      return {
        userAgent: navigator.userAgent,
        url: window.location.href,
        // sessionId: getSessionId(), // Would be implemented
        // userId: getCurrentUserId(), // Would be implemented
      };
    }
    
    return undefined;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error | AppError): void {
    if (level < this.minimumLevel) {
      return;
    }

    const entry = this.createLogEntry(level, message, context, error);
    
    // Send to all transports
    this.transports.forEach(transport => {
      try {
        transport.log(entry);
      } catch (transportError) {
        // Prevent logging errors from crashing the application
        console.error('Transport error:', transportError);
      }
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>, error?: Error | AppError): void {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: Record<string, unknown>, error?: Error | AppError): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  critical(message: string, context?: Record<string, unknown>, error?: Error | AppError): void {
    this.log(LogLevel.CRITICAL, message, context, error);
  }

  // Convenience method for logging errors with automatic severity detection
  logError(error: Error | AppError, context?: Record<string, unknown>): void {
    let level = LogLevel.ERROR;
    let message = error.message;

    if (error instanceof AppError) {
      const severity = getErrorSeverity(error);
      
      switch (severity) {
        case ErrorSeverity.LOW:
          level = LogLevel.WARN;
          break;
        case ErrorSeverity.MEDIUM:
          level = LogLevel.WARN;
          break;
        case ErrorSeverity.HIGH:
          level = LogLevel.ERROR;
          break;
        case ErrorSeverity.CRITICAL:
          level = LogLevel.CRITICAL;
          break;
      }
      
      message = `[${error.code}] ${error.message}`;
    }

    this.log(level, message, context, error);
  }

  // Performance logging
  logPerformance(operation: string, duration: number, context?: Record<string, unknown>): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    this.log(level, `Performance: ${operation} took ${duration}ms`, context);
  }

  // Security logging
  logSecurity(event: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, `Security: ${event}`, context);
  }

  // Business logic logging
  logBusiness(event: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, `Business: ${event}`, context);
  }

  // API request/response logging
  logApiRequest(method: string, url: string, duration?: number, context?: Record<string, unknown>): void {
    const message = duration ? 
      `API: ${method} ${url} (${duration}ms)` : 
      `API: ${method} ${url}`;
    this.log(LogLevel.INFO, message, context);
  }

  // Transaction logging
  logTransaction(type: string, status: 'started' | 'completed' | 'failed', context?: Record<string, unknown>): void {
    const level = status === 'failed' ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, `Transaction: ${type} ${status}`, context);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports
export const log = {
  debug: (message: string, context?: Record<string, unknown>) => logger.debug(message, context),
  info: (message: string, context?: Record<string, unknown>) => logger.info(message, context),
  warn: (message: string, context?: Record<string, unknown>, error?: Error | AppError) => logger.warn(message, context, error),
  error: (message: string, context?: Record<string, unknown>, error?: Error | AppError) => logger.error(message, context, error),
  critical: (message: string, context?: Record<string, unknown>, error?: Error | AppError) => logger.critical(message, context, error),
  logError: (error: Error | AppError, context?: Record<string, unknown>) => logger.logError(error, context),
  performance: (operation: string, duration: number, context?: Record<string, unknown>) => logger.logPerformance(operation, duration, context),
  security: (event: string, context?: Record<string, unknown>) => logger.logSecurity(event, context),
  business: (event: string, context?: Record<string, unknown>) => logger.logBusiness(event, context),
  api: (method: string, url: string, duration?: number, context?: Record<string, unknown>) => logger.logApiRequest(method, url, duration, context),
  transaction: (type: string, status: 'started' | 'completed' | 'failed', context?: Record<string, unknown>) => logger.logTransaction(type, status, context),
};

// Performance measurement utilities
export class PerformanceTimer {
  private startTime: number;
  private operation: string;

  constructor(operation: string) {
    this.operation = operation;
    this.startTime = Date.now();
    logger.debug(`Performance: Starting ${operation}`);
  }

  end(context?: Record<string, unknown>): number {
    const duration = Date.now() - this.startTime;
    logger.logPerformance(this.operation, duration, context);
    return duration;
  }
}

export const measurePerformance = (operation: string): PerformanceTimer => {
  return new PerformanceTimer(operation);
};

// Async function wrapper with performance logging
export const withPerformanceLogging = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T => {
  return (async (...args: Parameters<T>) => {
    const timer = measurePerformance(operationName);
    try {
      const result = await fn(...args);
      timer.end({ success: true });
      return result;
    } catch (error) {
      timer.end({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }) as T;
};