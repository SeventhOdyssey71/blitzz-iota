/**
 * Production-ready configuration management system
 */

import { Network, AppConfig, FeatureFlags, NetworkConfig } from '@/types/api';
import { ValidationError } from '@/lib/errors';

// Environment variable validation
const requiredEnvVars = [
  'NEXT_PUBLIC_NETWORK',
  'NEXT_PUBLIC_RPC_URL',
  'NEXT_PUBLIC_PACKAGE_ID',
] as const;

const optionalEnvVars = [
  'NEXT_PUBLIC_EXPLORER_URL',
  'NEXT_PUBLIC_DEFAULT_SLIPPAGE',
  'NEXT_PUBLIC_MAX_SLIPPAGE',
  'NEXT_PUBLIC_DEFAULT_DEADLINE',
  'NEXT_PUBLIC_ENABLE_DCA',
  'NEXT_PUBLIC_ENABLE_LIMIT_ORDERS',
  'NEXT_PUBLIC_ENABLE_ADVANCED_CHARTS',
  'NEXT_PUBLIC_ENABLE_NOTIFICATIONS',
  'NEXT_PUBLIC_MAINTENANCE_MODE',
] as const;

type RequiredEnvVar = typeof requiredEnvVars[number];
type OptionalEnvVar = typeof optionalEnvVars[number];
type AllEnvVars = RequiredEnvVar | OptionalEnvVar;

// Environment validation functions
const validateEnvVar = (key: string, value: string | undefined, required: boolean = true): string => {
  if (!value) {
    if (required) {
      throw new ValidationError(`Missing required environment variable: ${key}`);
    }
    return '';
  }
  
  if (value.trim() === '') {
    throw new ValidationError(`Environment variable ${key} cannot be empty`);
  }
  
  return value.trim();
};

const validateNetwork = (network: string): Network => {
  const validNetworks: Network[] = ['mainnet', 'testnet', 'devnet'];
  if (!validNetworks.includes(network as Network)) {
    throw new ValidationError(
      `Invalid network: ${network}. Must be one of: ${validNetworks.join(', ')}`
    );
  }
  return network as Network;
};

const validateNumber = (value: string, min?: number, max?: number): number => {
  const num = parseFloat(value);
  if (isNaN(num) || !isFinite(num)) {
    throw new ValidationError(`Invalid number: ${value}`);
  }
  if (min !== undefined && num < min) {
    throw new ValidationError(`Number ${num} is below minimum ${min}`);
  }
  if (max !== undefined && num > max) {
    throw new ValidationError(`Number ${num} is above maximum ${max}`);
  }
  return num;
};

const validateBoolean = (value: string): boolean => {
  const lowerValue = value.toLowerCase();
  if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
    return true;
  }
  if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
    return false;
  }
  throw new ValidationError(`Invalid boolean value: ${value}`);
};

const validateUrl = (url: string): string => {
  try {
    new URL(url);
    return url;
  } catch {
    throw new ValidationError(`Invalid URL: ${url}`);
  }
};

// Network configurations
const networkConfigs: Record<Network, NetworkConfig> = {
  mainnet: {
    name: 'IOTA Mainnet',
    rpcUrl: 'https://api.mainnet.iota.cafe',
    explorerUrl: 'https://explorer.iota.org',
    chainId: 'iota-mainnet',
  },
  testnet: {
    name: 'IOTA Testnet',
    rpcUrl: 'https://api.testnet.iota.cafe',
    explorerUrl: 'https://explorer.testnet.iota.org',
    chainId: 'iota-testnet',
  },
  devnet: {
    name: 'IOTA Devnet',
    rpcUrl: 'https://api.devnet.iota.cafe',
    explorerUrl: 'https://explorer.devnet.iota.org',
    chainId: 'iota-devnet',
  },
};

// Configuration class for type-safe access
class ConfigManager {
  private static instance: ConfigManager | null = null;
  private config: AppConfig | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  initialize(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Validate required environment variables
      const network = validateNetwork(
        validateEnvVar('NEXT_PUBLIC_NETWORK', process.env.NEXT_PUBLIC_NETWORK)
      );
      
      const rpcUrl = validateUrl(
        validateEnvVar('NEXT_PUBLIC_RPC_URL', process.env.NEXT_PUBLIC_RPC_URL)
      );
      
      const packageId = validateEnvVar(
        'NEXT_PUBLIC_PACKAGE_ID',
        process.env.NEXT_PUBLIC_PACKAGE_ID
      );

      // Validate optional environment variables with defaults
      const explorerUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || networkConfigs[network].explorerUrl;
      
      const defaultSlippage = process.env.NEXT_PUBLIC_DEFAULT_SLIPPAGE
        ? validateNumber(process.env.NEXT_PUBLIC_DEFAULT_SLIPPAGE, 0.01, 5)
        : 0.5;
        
      const maxSlippage = process.env.NEXT_PUBLIC_MAX_SLIPPAGE
        ? validateNumber(process.env.NEXT_PUBLIC_MAX_SLIPPAGE, 1, 50)
        : 50;
        
      const defaultDeadline = process.env.NEXT_PUBLIC_DEFAULT_DEADLINE
        ? validateNumber(process.env.NEXT_PUBLIC_DEFAULT_DEADLINE, 60, 3600)
        : 1200; // 20 minutes

      // Feature flags
      const featureFlags: FeatureFlags = {
        enableDCA: process.env.NEXT_PUBLIC_ENABLE_DCA
          ? validateBoolean(process.env.NEXT_PUBLIC_ENABLE_DCA)
          : true,
        enableLimitOrders: process.env.NEXT_PUBLIC_ENABLE_LIMIT_ORDERS
          ? validateBoolean(process.env.NEXT_PUBLIC_ENABLE_LIMIT_ORDERS)
          : true,
        enableAdvancedCharts: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_CHARTS
          ? validateBoolean(process.env.NEXT_PUBLIC_ENABLE_ADVANCED_CHARTS)
          : false,
        enableNotifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS
          ? validateBoolean(process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS)
          : false,
        maintenanceMode: process.env.NEXT_PUBLIC_MAINTENANCE_MODE
          ? validateBoolean(process.env.NEXT_PUBLIC_MAINTENANCE_MODE)
          : false,
      };

      // Validate configuration consistency
      if (defaultSlippage > maxSlippage) {
        throw new ValidationError(
          `Default slippage (${defaultSlippage}) cannot exceed max slippage (${maxSlippage})`
        );
      }

      // Build final configuration
      this.config = {
        network,
        rpcUrl,
        packageId,
        supportedTokens: [], // Will be populated from IOTA config
        defaultSlippage,
        maxSlippage,
        defaultDeadline,
        featureFlags,
      };

      this.initialized = true;
    } catch (error) {
      throw new ValidationError(
        `Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getConfig(): AppConfig {
    if (!this.initialized || !this.config) {
      this.initialize();
    }
    return this.config!;
  }

  getNetworkConfig(network?: Network): NetworkConfig {
    const targetNetwork = network || this.getConfig().network;
    return networkConfigs[targetNetwork];
  }

  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.getConfig().featureFlags[feature];
  }

  isMaintenanceMode(): boolean {
    return this.getConfig().featureFlags.maintenanceMode;
  }

  // Environment-specific getters
  isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return process.env.NODE_ENV === 'test';
  }

  // Hot reload support for development
  reload(): void {
    this.initialized = false;
    this.config = null;
    this.initialize();
  }

  // Configuration validation for runtime checks
  validateRuntime(): boolean {
    try {
      const config = this.getConfig();
      
      // Check required fields
      if (!config.network || !config.rpcUrl || !config.packageId) {
        return false;
      }

      // Validate network connectivity (in production)
      if (this.isProduction()) {
        // Could add RPC connectivity check here
      }

      return true;
    } catch {
      return false;
    }
  }

  // Get environment-specific values
  getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    if (this.isDevelopment()) return 'debug';
    if (this.isTest()) return 'warn';
    return 'error';
  }

  getApiTimeout(): number {
    return this.isDevelopment() ? 30000 : 10000; // 30s dev, 10s prod
  }

  getCacheTimeout(): number {
    return this.isDevelopment() ? 30000 : 300000; // 30s dev, 5min prod
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();

// Initialize configuration on import
config.initialize();

// Export commonly used values
export const getAppConfig = (): AppConfig => config.getConfig();
export const getNetworkConfig = (network?: Network): NetworkConfig => config.getNetworkConfig(network);
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => config.isFeatureEnabled(feature);
export const isMaintenanceMode = (): boolean => config.isMaintenanceMode();
export const isDevelopment = (): boolean => config.isDevelopment();
export const isProduction = (): boolean => config.isProduction();

// Configuration constants
export const CONFIG_CONSTANTS = {
  MIN_SLIPPAGE: 0.01,
  MAX_SLIPPAGE: 50,
  MIN_DEADLINE: 60, // 1 minute
  MAX_DEADLINE: 3600, // 1 hour
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  API_TIMEOUT: config.getApiTimeout(),
  CACHE_TIMEOUT: config.getCacheTimeout(),
  LOG_LEVEL: config.getLogLevel(),
} as const;

// Type exports
export type { AppConfig, FeatureFlags, NetworkConfig };