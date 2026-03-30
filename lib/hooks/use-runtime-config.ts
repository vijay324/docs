/**
 * Runtime Configuration Hook
 * 
 * This hook fetches runtime configuration from the server,
 * solving the Next.js build-time vs runtime environment variable problem.
 * 
 * The configuration is cached in memory and localStorage for performance.
 */

'use client';

import { useQuery } from '@tanstack/react-query';

// Runtime configuration type
export interface RuntimeConfig {
  apiUrl: string;
  frontendUrl: string;
  environment: string;
  deploymentPlatform: string;
  isProduction: boolean;
  isDevelopment: boolean;
}

// Cache configuration
const CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = 'runtime-config';

// In-memory cache
let memoryCache: { config: RuntimeConfig; timestamp: number } | null = null;

/**
 * Fetch runtime configuration from the server
 */
async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  // Check in-memory cache first
  if (memoryCache && Date.now() - memoryCache.timestamp < CONFIG_CACHE_DURATION) {
    return memoryCache.config;
  }

  // Check localStorage cache
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const { config, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CONFIG_CACHE_DURATION) {
          memoryCache = { config, timestamp };
          return config;
        }
      } catch (error) {
        console.error('Failed to parse cached runtime config:', error);
      }
    }
  }

  // Fetch from server
  const response = await fetch('/api/config', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'default',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch runtime config: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.success || !data.data) {
    throw new Error('Invalid runtime config response');
  }

  const config: RuntimeConfig = data.data;

  // Update caches
  memoryCache = { config, timestamp: Date.now() };
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
    } catch (error) {
      console.error('Failed to cache runtime config:', error);
    }
  }

  return config;
}

/**
 * Hook to get runtime configuration
 */
export function useRuntimeConfig() {
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['runtime-config'],
    queryFn: fetchRuntimeConfig,
    staleTime: CONFIG_CACHE_DURATION,
    gcTime: CONFIG_CACHE_DURATION * 2,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    config,
    isLoading,
    error,
    apiUrl: config?.apiUrl || '',
    frontendUrl: config?.frontendUrl || '',
    environment: config?.environment || 'development',
    deploymentPlatform: config?.deploymentPlatform || 'local',
    isProduction: config?.isProduction || false,
    isDevelopment: config?.isDevelopment || true,
  };
}

/**
 * Clear runtime configuration cache
 */
export function clearRuntimeConfigCache() {
  memoryCache = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Get runtime configuration synchronously (from cache only)
 * Returns null if not cached
 */
export function getRuntimeConfigSync(): RuntimeConfig | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CONFIG_CACHE_DURATION) {
    return memoryCache.config;
  }

  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      try {
        const { config, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CONFIG_CACHE_DURATION) {
          memoryCache = { config, timestamp };
          return config;
        }
      } catch (error) {
        console.error('Failed to parse cached runtime config:', error);
      }
    }
  }

  return null;
}
