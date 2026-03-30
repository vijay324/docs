/**
 * Frontend Redis / Cache Manager
 * 
 * PRD Section 10: All Redis access MUST go through a single adapter layer.
 * Uses Upstash Redis for serverless-compatible caching.
 * 
 * Key Format: flotick:<env>:cache:<orgId>:<resource>:<identifier>
 */

import Redis from 'ioredis';

// Environment detection
const ENV = process.env.NODE_ENV || 'production';
const KEY_PREFIX = `flotick:${ENV}:cache`;

// Initialize Redis client (lazy)
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.warn('[REDIS] Frontend: REDIS_URL not configured');
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
    });
    return redis;
  } catch (error) {
    console.error('[REDIS] Frontend: Failed to initialize:', error);
    return null;
  }
}

/**
 * Cache configuration constants per PRD Section 6.3
 */
export const CACHE_CONFIG = {
  // TTL values in seconds
  TTL: {
    // Dashboard data: 30-60s
    DASHBOARD: 45,
    // Lists: 60-120s
    LIST: 90,
    // Analytics: 5-15 min
    ANALYTICS: 600,
    // Presence flags: 10-30s
    PRESENCE: 20,
    // Short: 1 minute
    SHORT: 60,
    // Medium: 5 minutes
    MEDIUM: 300,
    // Long: 15 minutes
    LONG: 900,
    // Hour
    HOUR: 3600,
    // Day
    DAY: 86400,
    // Week
    WEEK: 604800,
  },
  
  // Cache key prefixes (PRD format)
  PREFIXES: {
    USER: 'user:',
    PROJECT: 'project:',
    TASK: 'task:',
    SPRINT: 'sprint:',
    EMPLOYEE: 'employee:',
    SEARCH: 'search:',
    API: 'api:',
    STATS: 'stats:',
    SESSION: 'session:',
    FILE: 'file:',
    ANALYTICS: 'analytics:',
    DASHBOARD: 'dashboard:',
    NOTIFICATION: 'notification:',
  },
  
  // Cache patterns for invalidation
  PATTERNS: {
    USER_DATA: `${KEY_PREFIX}:*:user:*`,
    PROJECT_DATA: `${KEY_PREFIX}:*:project:*`,
    TASK_DATA: `${KEY_PREFIX}:*:task:*`,
    SPRINT_DATA: `${KEY_PREFIX}:*:sprint:*`,
    EMPLOYEE_DATA: `${KEY_PREFIX}:*:employee:*`,
    ALL_STATS: `${KEY_PREFIX}:*:stats:*`,
    ALL_SEARCH: `${KEY_PREFIX}:*:search:*`,
    ALL_FILES: `${KEY_PREFIX}:*:file:*`,
    ALL_ANALYTICS: `${KEY_PREFIX}:*:analytics:*`,
    ALL_DASHBOARD: `${KEY_PREFIX}:*:dashboard:*`,
  },
} as const;

/**
 * Build namespaced key following PRD format
 */
function buildKey(orgId: string, resource: string, identifier?: string): string {
  const parts = [KEY_PREFIX, orgId, resource];
  if (identifier) {
    parts.push(identifier);
  }
  return parts.join(':');
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Frontend Cache Manager
 * Fail-safe design: continues without caching if Redis unavailable
 */
export class CacheManager {
  private hitCount: number = 0;
  private missCount: number = 0;

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return getRedis() !== null;
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    const client = getRedis();
    if (!client) return null;

    try {
      const data = await client.get(key);
      if (data !== null) {
        this.hitCount++;
        try {
          return JSON.parse(data) as T;
        } catch (e) {
          return data as unknown as T;
        }
      } else {
        this.missCount++;
      }
      return null;
    } catch (error) {
      console.error(`[CACHE] Get error for ${key}:`, error);
      this.missCount++;
      return null;
    }
  }

  /**
   * Set a value in cache with TTL
   * All keys MUST have TTL per PRD
   */
  async set(key: string, value: any, ttl: number = CACHE_CONFIG.TTL.MEDIUM): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      await client.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`[CACHE] Set error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch (error) {
      console.error(`[CACHE] Delete error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[CACHE] Exists error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      await client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error(`[CACHE] Expire error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    const client = getRedis();
    if (!client) return 0;

    try {
      const keys = await client.keys(pattern);
      if (keys.length === 0) return 0;
      
      await client.del(...keys);
      return keys.length;
    } catch (error) {
      console.error(`[CACHE] Delete pattern error for ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Get keys matching a pattern
   */
  async getKeys(pattern: string): Promise<string[]> {
    const client = getRedis();
    if (!client) return [];

    try {
      return await client.keys(pattern);
    } catch (error) {
      console.error(`[CACHE] Get keys error for ${pattern}:`, error);
      return [];
    }
  }

  // ============================================================================
  // Organization-scoped caching methods (PRD compliant)
  // ============================================================================

  /**
   * Cache API response with organization scope
   */
  async cacheApiResponse(
    orgId: string,
    endpoint: string,
    params: any,
    data: any,
    ttl: number = CACHE_CONFIG.TTL.MEDIUM
  ): Promise<void> {
    const paramHash = simpleHash(JSON.stringify(params || {}));
    const key = buildKey(orgId, 'api', `${endpoint}:${paramHash}`);
    await this.set(key, { data, timestamp: Date.now() }, ttl);
  }

  /**
   * Get cached API response
   */
  async getApiResponse<T>(orgId: string, endpoint: string, params: any): Promise<T | null> {
    const paramHash = simpleHash(JSON.stringify(params || {}));
    const key = buildKey(orgId, 'api', `${endpoint}:${paramHash}`);
    const cached = await this.get<{ data: T; timestamp: number }>(key);
    return cached?.data || null;
  }

  /**
   * Cache user data
   */
  async cacheUserData(orgId: string, userId: string, data: any, ttl: number = CACHE_CONFIG.TTL.LONG): Promise<void> {
    const key = buildKey(orgId, 'user', userId);
    await this.set(key, data, ttl);
  }

  /**
   * Get cached user data
   */
  async getUserData<T>(orgId: string, userId: string): Promise<T | null> {
    const key = buildKey(orgId, 'user', userId);
    return await this.get<T>(key);
  }

  /**
   * Cache project data
   */
  async cacheProjectData(orgId: string, projectId: string, data: any, ttl: number = CACHE_CONFIG.TTL.LIST): Promise<void> {
    const key = buildKey(orgId, 'project', projectId);
    await this.set(key, data, ttl);
  }

  /**
   * Get cached project data
   */
  async getProjectData<T>(orgId: string, projectId: string): Promise<T | null> {
    const key = buildKey(orgId, 'project', projectId);
    return await this.get<T>(key);
  }

  /**
   * Cache search results
   */
  async cacheSearchResults(
    orgId: string,
    query: string,
    filters: any,
    results: any,
    ttl: number = CACHE_CONFIG.TTL.SHORT
  ): Promise<void> {
    const hash = simpleHash(JSON.stringify({ query, filters }));
    const key = buildKey(orgId, 'search', hash);
    await this.set(key, { results, timestamp: Date.now() }, ttl);
  }

  /**
   * Get cached search results
   */
  async getSearchResults<T>(orgId: string, query: string, filters: any): Promise<T | null> {
    const hash = simpleHash(JSON.stringify({ query, filters }));
    const key = buildKey(orgId, 'search', hash);
    const cached = await this.get<{ results: T; timestamp: number }>(key);
    return cached?.results || null;
  }

  // ============================================================================
  // Cache invalidation methods (PRD Section 6.4)
  // ============================================================================

  /**
   * Invalidate user cache
   */
  async invalidateUserCache(orgId: string, userId: string): Promise<void> {
    await this.deletePattern(`${KEY_PREFIX}:${orgId}:user:${userId}*`);
  }

  /**
   * Invalidate project cache
   */
  async invalidateProjectCache(orgId: string, projectId: string): Promise<void> {
    await this.deletePattern(`${KEY_PREFIX}:${orgId}:project:${projectId}*`);
  }

  /**
   * Invalidate all organization cache
   */
  async invalidateOrgCache(orgId: string): Promise<void> {
    await this.deletePattern(`${KEY_PREFIX}:${orgId}:*`);
  }

  /**
   * Invalidate all user data across all orgs
   */
  async invalidateAllUserData(): Promise<void> {
    await this.deletePattern(CACHE_CONFIG.PATTERNS.USER_DATA);
  }

  /**
   * Invalidate all project data across all orgs
   */
  async invalidateAllProjectData(): Promise<void> {
    await this.deletePattern(CACHE_CONFIG.PATTERNS.PROJECT_DATA);
  }

  // ============================================================================
  // Tag-based caching for Next.js optimization
  // ============================================================================

  /**
   * Cache with tags for selective invalidation
   */
  async cacheWithTags(key: string, value: any, ttl: number, tags: string[]): Promise<boolean> {
    try {
      await this.set(key, value, ttl);

      for (const tag of tags) {
        const tagKey = `${KEY_PREFIX}:tag:${tag}`;
        const taggedKeys = (await this.get<string[]>(tagKey)) || [];
        if (!taggedKeys.includes(key)) {
          taggedKeys.push(key);
          await this.set(tagKey, taggedKeys, ttl + 60);
        }
      }

      return true;
    } catch (error) {
      console.error(`[CACHE] Cache with tags error for ${key}:`, error);
      return false;
    }
  }

  /**
   * Invalidate all keys with a specific tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const tagKey = `${KEY_PREFIX}:tag:${tag}`;
      const taggedKeys = (await this.get<string[]>(tagKey)) || [];

      if (taggedKeys.length === 0) return 0;

      await Promise.all(taggedKeys.map((key) => this.del(key)));
      await this.del(tagKey);

      return taggedKeys.length;
    } catch (error) {
      console.error(`[CACHE] Invalidate by tag error for ${tag}:`, error);
      return 0;
    }
  }

  // ============================================================================
  // Batch operations
  // ============================================================================

  async mget(keys: string[]): Promise<(any | null)[]> {
    return Promise.all(keys.map((key) => this.get(key)));
  }

  async mset(keyValuePairs: Array<{ key: string; value: any; ttl?: number }>): Promise<boolean> {
    try {
      await Promise.all(keyValuePairs.map(({ key, value, ttl }) => this.set(key, value, ttl)));
      return true;
    } catch (error) {
      console.error('[CACHE] Batch set error:', error);
      return false;
    }
  }

  // ============================================================================
  // Statistics & Observability (PRD Section 11)
  // ============================================================================

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    keysByPrefix: Record<string, number>;
    hitRate: number;
    hits: number;
    misses: number;
  }> {
    try {
      const client = getRedis();
      if (!client) {
        return {
          totalKeys: 0,
          keysByPrefix: {},
          hitRate: 0,
          hits: this.hitCount,
          misses: this.missCount,
        };
      }

      const allKeys = await client.keys(`${KEY_PREFIX}:*`);
      const keysByPrefix: Record<string, number> = {};

      Object.entries(CACHE_CONFIG.PREFIXES).forEach(([name, prefix]) => {
        keysByPrefix[name] = allKeys.filter((key) => key.includes(`:${prefix.replace(':', '')}`)).length;
      });

      const total = this.hitCount + this.missCount;
      const hitRate = total > 0 ? Math.round((this.hitCount / total) * 100) : 0;

      return {
        totalKeys: allKeys.length,
        keysByPrefix,
        hitRate,
        hits: this.hitCount,
        misses: this.missCount,
      };
    } catch (error) {
      console.error('[CACHE] Error getting stats:', error);
      return {
        totalKeys: 0,
        keysByPrefix: {},
        hitRate: 0,
        hits: this.hitCount,
        misses: this.missCount,
      };
    }
  }

  /**
   * Reset hit/miss counters
   */
  resetMetrics(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager();

/**
 * Cache wrapper for async functions
 */
export function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_CONFIG.TTL.MEDIUM
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    try {
      const cached = await cacheManager.get<T>(key);
      if (cached !== null) {
        resolve(cached);
        return;
      }

      const data = await fetcher();
      await cacheManager.set(key, data, ttl);
      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
}

export default getRedis();
