'use client';

import { SUPPORTED_COINS } from '@/config/iota.config';
import { PoolTracker } from './pool-tracker';

// Ensure critical pools are tracked
export function ensureCriticalPools() {
  // Don't add any hardcoded pools - they should be discovered from transactions
  console.log('Critical pools check - pools should be discovered from transactions');
}