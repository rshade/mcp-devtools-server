import { CacheManager, DEFAULT_CACHE_CONFIG } from '../../utils/cache-manager.js';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    // Reset singleton before each test
    CacheManager.resetInstance();
    cacheManager = CacheManager.getInstance();
  });

  afterEach(() => {
    CacheManager.resetInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = CacheManager.getInstance();
      const instance2 = CacheManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance correctly', () => {
      const instance1 = CacheManager.getInstance();
      CacheManager.resetInstance();
      const instance2 = CacheManager.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = cacheManager.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.maxMemoryMB).toBe(100);
      expect(config.namespaces.projectDetection).toEqual({
        max: 50,
        ttl: 60000,
      });
    });

    it('should accept custom configuration', () => {
      CacheManager.resetInstance();
      const customConfig = {
        ...DEFAULT_CACHE_CONFIG,
        maxMemoryMB: 200,
        namespaces: {
          ...DEFAULT_CACHE_CONFIG.namespaces,
          projectDetection: { max: 100, ttl: 30000 },
        },
      };
      const customManager = CacheManager.getInstance(customConfig);
      const config = customManager.getConfig();
      expect(config.maxMemoryMB).toBe(200);
      expect(config.namespaces.projectDetection.max).toBe(100);
    });

    it('should report enabled status correctly', () => {
      expect(cacheManager.isEnabled()).toBe(true);
    });

    it('should handle disabled cache', () => {
      CacheManager.resetInstance();
      const disabledConfig = {
        ...DEFAULT_CACHE_CONFIG,
        enabled: false,
      };
      const disabledManager = CacheManager.getInstance(disabledConfig);
      expect(disabledManager.isEnabled()).toBe(false);

      // Operations should be no-ops
      disabledManager.set('projectDetection', 'key1', 'value1');
      const result = disabledManager.get('projectDetection', 'key1');
      expect(result).toBeNull();
    });
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      cacheManager.set('projectDetection', 'key1', 'value1');
      const result = cacheManager.get('projectDetection', 'key1');
      expect(result).toBe('value1');
    });

    it('should return null for missing keys', () => {
      const result = cacheManager.get('projectDetection', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      const testCases = [
        { key: 'string', value: 'test string' },
        { key: 'number', value: 42 },
        { key: 'boolean', value: true },
        { key: 'object', value: { foo: 'bar', nested: { baz: 123 } } },
        { key: 'array', value: [1, 2, 3, 'four'] },
        { key: 'null', value: null },
      ];

      testCases.forEach(({ key, value }) => {
        cacheManager.set('projectDetection', key, value);
        const result = cacheManager.get('projectDetection', key);
        expect(result).toEqual(value);
      });
    });

    it('should check if key exists', () => {
      cacheManager.set('projectDetection', 'key1', 'value1');
      expect(cacheManager.has('projectDetection', 'key1')).toBe(true);
      expect(cacheManager.has('projectDetection', 'nonexistent')).toBe(false);
    });

    it('should handle unknown namespaces gracefully', () => {
      cacheManager.set('unknownNamespace', 'key1', 'value1');
      const result = cacheManager.get('unknownNamespace', 'key1');
      expect(result).toBeNull();
    });
  });

  describe('Invalidation', () => {
    beforeEach(() => {
      cacheManager.set('projectDetection', 'key1', 'value1');
      cacheManager.set('projectDetection', 'key2', 'value2');
      cacheManager.set('gitOperations', 'key3', 'value3');
    });

    it('should invalidate specific key', () => {
      cacheManager.invalidate('projectDetection', 'key1');
      expect(cacheManager.get('projectDetection', 'key1')).toBeNull();
      expect(cacheManager.get('projectDetection', 'key2')).toBe('value2');
    });

    it('should invalidate all keys in namespace', () => {
      cacheManager.invalidate('projectDetection');
      expect(cacheManager.get('projectDetection', 'key1')).toBeNull();
      expect(cacheManager.get('projectDetection', 'key2')).toBeNull();
      expect(cacheManager.get('gitOperations', 'key3')).toBe('value3');
    });

    it('should clear all keys in namespace', () => {
      cacheManager.clear('projectDetection');
      expect(cacheManager.get('projectDetection', 'key1')).toBeNull();
      expect(cacheManager.get('projectDetection', 'key2')).toBeNull();
    });

    it('should clear all namespaces', () => {
      cacheManager.clearAll();
      expect(cacheManager.get('projectDetection', 'key1')).toBeNull();
      expect(cacheManager.get('projectDetection', 'key2')).toBeNull();
      expect(cacheManager.get('gitOperations', 'key3')).toBeNull();
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Prime the cache with some data
      cacheManager.set('projectDetection', 'key1', 'value1');
      cacheManager.set('projectDetection', 'key2', 'value2');
    });

    it('should track cache hits', () => {
      // Generate hits
      cacheManager.get('projectDetection', 'key1');
      cacheManager.get('projectDetection', 'key1');

      const stats = cacheManager.getStats('projectDetection');
      expect(stats).not.toBeNull();
      expect(stats!.hits).toBe(2);
    });

    it('should track cache misses', () => {
      // Generate misses
      cacheManager.get('projectDetection', 'nonexistent1');
      cacheManager.get('projectDetection', 'nonexistent2');

      const stats = cacheManager.getStats('projectDetection');
      expect(stats).not.toBeNull();
      expect(stats!.misses).toBe(2);
    });

    it('should calculate hit rate correctly', () => {
      // 2 hits, 1 miss = 66.7% hit rate
      cacheManager.get('projectDetection', 'key1'); // hit
      cacheManager.get('projectDetection', 'key2'); // hit
      cacheManager.get('projectDetection', 'nonexistent'); // miss

      const stats = cacheManager.getStats('projectDetection');
      expect(stats).not.toBeNull();
      expect(stats!.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should report cache size', () => {
      const stats = cacheManager.getStats('projectDetection');
      expect(stats).not.toBeNull();
      expect(stats!.size).toBe(2);
      expect(stats!.maxSize).toBe(50);
    });

    it('should estimate memory usage', () => {
      const stats = cacheManager.getStats('projectDetection');
      expect(stats).not.toBeNull();
      expect(stats!.memoryEstimateMB).toBeGreaterThan(0);
    });

    it('should get all stats', () => {
      cacheManager.set('gitOperations', 'key3', 'value3');

      const allStats = cacheManager.getAllStats();
      expect(allStats.length).toBeGreaterThan(0);
      expect(allStats.some((s) => s.namespace === 'projectDetection')).toBe(true);
      expect(allStats.some((s) => s.namespace === 'gitOperations')).toBe(true);
    });

    it('should calculate total memory usage', () => {
      cacheManager.set('gitOperations', 'key3', 'value3');
      cacheManager.set('goModules', 'key4', 'value4');

      const totalMemory = cacheManager.getTotalMemoryUsage();
      expect(totalMemory).toBeGreaterThan(0);
    });
  });

  describe('LRU Behavior', () => {
    beforeEach(() => {
      // Use a small cache to test eviction
      CacheManager.resetInstance();
      const smallCacheConfig = {
        ...DEFAULT_CACHE_CONFIG,
        namespaces: {
          ...DEFAULT_CACHE_CONFIG.namespaces,
          projectDetection: { max: 3, ttl: 60000 },
        },
      };
      cacheManager = CacheManager.getInstance(smallCacheConfig);
    });

    it('should evict least recently used items', () => {
      // Fill cache
      cacheManager.set('projectDetection', 'key1', 'value1');
      cacheManager.set('projectDetection', 'key2', 'value2');
      cacheManager.set('projectDetection', 'key3', 'value3');

      // Access key1 and key2 (making key3 LRU)
      cacheManager.get('projectDetection', 'key1');
      cacheManager.get('projectDetection', 'key2');

      // Add key4, should evict key3
      cacheManager.set('projectDetection', 'key4', 'value4');

      const stats = cacheManager.getStats('projectDetection');
      expect(stats!.size).toBe(3);

      // key3 should be evicted
      expect(cacheManager.get('projectDetection', 'key3')).toBeNull();
      expect(cacheManager.get('projectDetection', 'key1')).toBe('value1');
      expect(cacheManager.get('projectDetection', 'key2')).toBe('value2');
      expect(cacheManager.get('projectDetection', 'key4')).toBe('value4');
    });

    it('should maintain max size limit', () => {
      // Add more items than max
      for (let i = 0; i < 10; i++) {
        cacheManager.set('projectDetection', `key${i}`, `value${i}`);
      }

      const stats = cacheManager.getStats('projectDetection');
      expect(stats!.size).toBeLessThanOrEqual(3);
    });
  });

  describe('TTL Behavior', () => {
    beforeEach(() => {
      CacheManager.resetInstance();
      // Use very short TTL for testing
      const shortTTLConfig = {
        ...DEFAULT_CACHE_CONFIG,
        namespaces: {
          ...DEFAULT_CACHE_CONFIG.namespaces,
          projectDetection: { max: 50, ttl: 100 }, // 100ms
        },
      };
      cacheManager = CacheManager.getInstance(shortTTLConfig);
    });

    it('should expire entries after TTL', async () => {
      cacheManager.set('projectDetection', 'key1', 'value1');
      expect(cacheManager.get('projectDetection', 'key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Entry should be expired
      expect(cacheManager.get('projectDetection', 'key1')).toBeNull();
    });

    it('should not expire entries before TTL', async () => {
      cacheManager.set('projectDetection', 'key1', 'value1');

      // Wait for half the TTL
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Entry should still be valid
      expect(cacheManager.get('projectDetection', 'key1')).toBe('value1');
    });
  });

  describe('Namespace Isolation', () => {
    it('should keep namespaces separate', () => {
      cacheManager.set('projectDetection', 'key1', 'value1');
      cacheManager.set('gitOperations', 'key1', 'value2');

      expect(cacheManager.get('projectDetection', 'key1')).toBe('value1');
      expect(cacheManager.get('gitOperations', 'key1')).toBe('value2');
    });

    it('should not affect other namespaces on clear', () => {
      cacheManager.set('projectDetection', 'key1', 'value1');
      cacheManager.set('gitOperations', 'key2', 'value2');

      cacheManager.clear('projectDetection');

      expect(cacheManager.get('projectDetection', 'key1')).toBeNull();
      expect(cacheManager.get('gitOperations', 'key2')).toBe('value2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty namespace string', () => {
      cacheManager.set('', 'key1', 'value1');
      const result = cacheManager.get('', 'key1');
      expect(result).toBeNull();
    });

    it('should handle empty key string', () => {
      cacheManager.set('projectDetection', '', 'value1');
      const result = cacheManager.get('projectDetection', '');
      expect(result).toBe('value1');
    });

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(10000);
      cacheManager.set('projectDetection', longKey, 'value1');
      expect(cacheManager.get('projectDetection', longKey)).toBe('value1');
    });

    it('should handle unicode keys', () => {
      const unicodeKey = '测试🚀café';
      cacheManager.set('projectDetection', unicodeKey, 'value1');
      expect(cacheManager.get('projectDetection', unicodeKey)).toBe('value1');
    });

    it('should handle large objects', () => {
      const largeObject = {
        data: Array(1000).fill({ nested: 'value', array: [1, 2, 3] }),
      };
      cacheManager.set('projectDetection', 'large', largeObject);
      const result = cacheManager.get('projectDetection', 'large');
      expect(result).toEqual(largeObject);
    });
  });
});
