import { LRUCache } from 'lru-cache';
import { logger } from './logger.js';

/**
 * Cache entry metadata
 */
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

/**
 * Cache namespace configuration
 */
export interface CacheNamespaceConfig {
  max: number;  // Maximum number of items
  ttl: number;  // Time-to-live in milliseconds
}

/**
 * Cache statistics for a namespace
 */
export interface CacheStats {
  namespace: string;
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  memoryEstimateMB: number;
}

/**
 * Overall cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  maxMemoryMB: number;
  namespaces: {
    projectDetection: CacheNamespaceConfig;
    gitOperations: CacheNamespaceConfig;
    goModules: CacheNamespaceConfig;
    fileLists: CacheNamespaceConfig;
    commandAvailability: CacheNamespaceConfig;
    testResults: CacheNamespaceConfig;
  };
}

/**
 * Default cache configuration based on MCP best practices
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  maxMemoryMB: 100,
  namespaces: {
    projectDetection: { max: 50, ttl: 60000 },       // 60s
    gitOperations: { max: 100, ttl: 30000 },         // 30s
    goModules: { max: 50, ttl: 300000 },             // 5min
    fileLists: { max: 200, ttl: 30000 },             // 30s
    commandAvailability: { max: 50, ttl: 3600000 },  // 1hr
    testResults: { max: 100, ttl: 60000 },           // 60s
  },
};

/**
 * Multi-namespace LRU cache manager for MCP DevTools Server
 *
 * Implements in-process caching with:
 * - Multiple namespaces with different TTLs
 * - LRU eviction policies
 * - Cache statistics tracking
 * - Memory-bounded operations
 *
 * Based on MCP best practices for L1 (in-process) caching.
 */
export class CacheManager {
  private static instance: CacheManager | null = null;
  private caches: Map<string, LRUCache<string, CacheEntry<unknown>>>;
  private stats: Map<string, { hits: number; misses: number }>;
  private config: CacheConfig;

  private constructor(config: CacheConfig = DEFAULT_CACHE_CONFIG) {
    this.config = config;
    this.caches = new Map();
    this.stats = new Map();

    if (!this.config.enabled) {
      logger.info('CacheManager: Caching disabled via configuration');
      return;
    }

    // Initialize caches for each namespace
    Object.entries(this.config.namespaces).forEach(([namespace, nsConfig]) => {
      this.caches.set(
        namespace,
        new LRUCache<string, CacheEntry<unknown>>({
          max: nsConfig.max,
          ttl: nsConfig.ttl,
          updateAgeOnGet: true,  // LRU behavior
          updateAgeOnHas: true,
          // Track evictions for debugging
          dispose: (value: CacheEntry<unknown>, key: string, reason: LRUCache.DisposeReason) => {
            logger.debug(`Cache eviction in ${namespace}`, {
              key,
              reason,
              timestamp: value.timestamp,
            });
          },
        })
      );
      this.stats.set(namespace, { hits: 0, misses: 0 });
      logger.debug(`CacheManager: Initialized namespace '${namespace}'`, nsConfig);
    });

    logger.info('CacheManager: Initialized with config', {
      enabled: this.config.enabled,
      maxMemoryMB: this.config.maxMemoryMB,
      namespaces: Object.keys(this.config.namespaces),
    });
  }

  /**
   * Get singleton instance of CacheManager
   */
  public static getInstance(config?: CacheConfig): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }

  /**
   * Reset singleton instance (primarily for testing)
   */
  public static resetInstance(): void {
    if (CacheManager.instance) {
      CacheManager.instance.clearAll();
      CacheManager.instance = null;
    }
  }

  /**
   * Get value from cache namespace
   */
  public get<T>(namespace: string, key: string): T | null {
    if (!this.config.enabled) {
      return null;
    }

    const cache = this.caches.get(namespace);
    if (!cache) {
      logger.warn(`CacheManager: Unknown namespace '${namespace}'`);
      return null;
    }

    const entry = cache.get(key) as CacheEntry<T> | undefined;
    const stats = this.stats.get(namespace)!;

    if (entry) {
      stats.hits++;
      logger.debug(`Cache HIT: ${namespace}:${key}`, {
        hitRate: this.getHitRate(namespace),
      });
      return entry.value;
    }

    stats.misses++;
    logger.debug(`Cache MISS: ${namespace}:${key}`, {
      hitRate: this.getHitRate(namespace),
    });
    return null;
  }

  /**
   * Set value in cache namespace
   */
  public set<T>(namespace: string, key: string, value: T): void {
    if (!this.config.enabled) {
      return;
    }

    const cache = this.caches.get(namespace);
    if (!cache) {
      logger.warn(`CacheManager: Unknown namespace '${namespace}'`);
      return;
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
    };

    cache.set(key, entry as CacheEntry<unknown>);
    logger.debug(`Cache SET: ${namespace}:${key}`, {
      size: cache.size,
      maxSize: cache.max,
    });
  }

  /**
   * Check if key exists in cache namespace
   */
  public has(namespace: string, key: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const cache = this.caches.get(namespace);
    return cache?.has(key) ?? false;
  }

  /**
   * Invalidate specific key in namespace
   */
  public invalidate(namespace: string, key?: string): void {
    if (!this.config.enabled) {
      return;
    }

    const cache = this.caches.get(namespace);
    if (!cache) {
      logger.warn(`CacheManager: Unknown namespace '${namespace}'`);
      return;
    }

    if (key) {
      cache.delete(key);
      logger.debug(`Cache INVALIDATE: ${namespace}:${key}`);
    } else {
      cache.clear();
      logger.debug(`Cache INVALIDATE ALL: ${namespace}`);
    }
  }

  /**
   * Clear all caches in a namespace
   */
  public clear(namespace: string): void {
    this.invalidate(namespace);
  }

  /**
   * Clear all caches across all namespaces
   */
  public clearAll(): void {
    if (!this.config.enabled) {
      return;
    }

    this.caches.forEach((cache, namespace) => {
      cache.clear();
      logger.debug(`Cache CLEAR: ${namespace}`);
    });
    logger.info('CacheManager: Cleared all caches');
  }

  /**
   * Get cache statistics for a namespace
   */
  public getStats(namespace: string): CacheStats | null {
    if (!this.config.enabled) {
      return null;
    }

    const cache = this.caches.get(namespace);
    const stats = this.stats.get(namespace);

    if (!cache || !stats) {
      return null;
    }

    const hitRate = this.getHitRate(namespace);

    return {
      namespace,
      hits: stats.hits,
      misses: stats.misses,
      hitRate,
      size: cache.size,
      maxSize: cache.max,
      memoryEstimateMB: this.estimateMemoryUsage(namespace),
    };
  }

  /**
   * Get all cache statistics
   */
  public getAllStats(): CacheStats[] {
    if (!this.config.enabled) {
      return [];
    }

    return Array.from(this.caches.keys())
      .map((namespace) => this.getStats(namespace))
      .filter((stat): stat is CacheStats => stat !== null);
  }

  /**
   * Get cache hit rate for namespace (0-1)
   */
  private getHitRate(namespace: string): number {
    const stats = this.stats.get(namespace);
    if (!stats) {
      return 0;
    }

    const total = stats.hits + stats.misses;
    return total === 0 ? 0 : stats.hits / total;
  }

  /**
   * Estimate memory usage for namespace
   * Uses JSON.stringify length for more accurate estimation
   * Note: This is still an approximation as it doesn't account for JS object overhead
   */
  private estimateMemoryUsage(namespace: string): number {
    const cache = this.caches.get(namespace);
    if (!cache) {
      return 0;
    }

    let totalBytes = 0;
    let sampleCount = 0;
    const maxSamples = 10; // Sample up to 10 entries for performance

    // Sample cache entries to estimate average size
    for (const [key, entry] of cache.entries()) {
      if (sampleCount >= maxSamples) break;

      try {
        // Estimate: key size + value size + overhead
        const keySize = key.length * 2; // Characters are 2 bytes in JS
        const valueSize = JSON.stringify(entry.value).length * 2;
        const overhead = 100; // Estimate for object/entry overhead

        totalBytes += keySize + valueSize + overhead;
        sampleCount++;
      } catch {
        // If JSON.stringify fails, use fallback
        totalBytes += 1024; // 1KB fallback
        sampleCount++;
      }
    }

    // Calculate average and extrapolate to total cache size
    const avgEntrySize = sampleCount > 0 ? totalBytes / sampleCount : 1024;
    const estimatedTotalBytes = cache.size * avgEntrySize;

    return estimatedTotalBytes / (1024 * 1024); // Convert to MB
  }

  /**
   * Get total estimated memory usage across all caches
   */
  public getTotalMemoryUsage(): number {
    if (!this.config.enabled) {
      return 0;
    }

    return Array.from(this.caches.keys()).reduce((total, namespace) => {
      return total + this.estimateMemoryUsage(namespace);
    }, 0);
  }

  /**
   * Check if caching is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }
}

/**
 * Convenience function to get cache manager instance
 */
export function getCacheManager(): CacheManager {
  return CacheManager.getInstance();
}
