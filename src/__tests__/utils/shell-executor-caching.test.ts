import { ShellExecutor } from "../../utils/shell-executor.js";
import { CacheManager } from "../../utils/cache-manager.js";

describe("ShellExecutor Command Availability Caching", () => {
  let executor: ShellExecutor;

  beforeEach(() => {
    // Reset cache before each test
    CacheManager.resetInstance();
    executor = new ShellExecutor();
  });

  afterEach(() => {
    CacheManager.resetInstance();
  });

  describe("Cache Hit/Miss Behavior", () => {
    it("should cache command availability on first check", async () => {
      const cacheManager = CacheManager.getInstance();

      // First call - cache miss (executes 'which')
      const available1 = await executor.isCommandAvailable("npm");

      expect(typeof available1).toBe("boolean");

      const stats1 = cacheManager.getStats("commandAvailability");
      expect(stats1?.misses).toBe(1);
      expect(stats1?.hits).toBe(0);
    });

    it("should return cached results on subsequent checks", async () => {
      const cacheManager = CacheManager.getInstance();

      // First call - cache miss
      const available1 = await executor.isCommandAvailable("npm");

      // Second call - cache hit (no 'which' execution)
      const available2 = await executor.isCommandAvailable("npm");

      expect(available1).toBe(available2);

      const stats = cacheManager.getStats("commandAvailability");
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);
    });

    it("should provide significant performance improvement with caching", async () => {
      // First call to warm cache
      await executor.isCommandAvailable("npm");

      // Measure cached performance
      const start = performance.now();
      await executor.isCommandAvailable("npm");
      const cachedDuration = performance.now() - start;

      // Cached call should be extremely fast (< 1ms typically)
      expect(cachedDuration).toBeLessThan(10); // Very generous margin
    });
  });

  describe("Positive and Negative Result Caching", () => {
    it("should cache positive results (command exists)", async () => {
      const cacheManager = CacheManager.getInstance();

      // npm is almost certainly available in test environment
      await executor.isCommandAvailable("npm");
      await executor.isCommandAvailable("npm");

      const stats = cacheManager.getStats("commandAvailability");
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);
    });

    it("should cache negative results (command does not exist)", async () => {
      const cacheManager = CacheManager.getInstance();

      const nonexistent = "nonexistent-command-xyz-12345";

      // First call - cache miss
      const available1 = await executor.isCommandAvailable(nonexistent);
      expect(available1).toBe(false);

      // Second call - cache hit
      const available2 = await executor.isCommandAvailable(nonexistent);
      expect(available2).toBe(false);

      const stats = cacheManager.getStats("commandAvailability");
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);
    });
  });

  describe("Cache Key Differentiation", () => {
    it("should use different cache keys for different commands", async () => {
      const cacheManager = CacheManager.getInstance();

      await executor.isCommandAvailable("npm");
      await executor.isCommandAvailable("node");

      const stats = cacheManager.getStats("commandAvailability");
      expect(stats?.misses).toBe(2); // Both are cache misses
      expect(stats?.hits).toBe(0);
    });

    it("should be case-sensitive for command names", async () => {
      const cacheManager = CacheManager.getInstance();

      await executor.isCommandAvailable("npm");
      await executor.isCommandAvailable("NPM"); // Different command name

      const stats = cacheManager.getStats("commandAvailability");
      expect(stats?.misses).toBe(2); // Treated as different commands
    });
  });

  describe("TTL Expiration", () => {
    it("should invalidate cache after TTL expires", async () => {
      // Reset with short TTL for testing
      CacheManager.resetInstance();
      const shortTTLConfig = {
        enabled: true,
        maxMemoryMB: 100,
        namespaces: {
          projectDetection: { max: 50, ttl: 60000 },
          gitOperations: { max: 100, ttl: 30000 },
          goModules: { max: 50, ttl: 300000 },
          nodeModules: { max: 50, ttl: 300000 },
          fileLists: { max: 200, ttl: 30000 },
          commandAvailability: { max: 50, ttl: 100 }, // 100ms for testing
          testResults: { max: 100, ttl: 60000 },
          smartSuggestions: { max: 100, ttl: 300000 },
        },
      };
      CacheManager.getInstance(shortTTLConfig);
      executor = new ShellExecutor();

      const cacheManager = CacheManager.getInstance();

      // First call - cache miss
      await executor.isCommandAvailable("npm");

      // Second call immediately - cache hit
      await executor.isCommandAvailable("npm");

      let stats = cacheManager.getStats("commandAvailability");
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);

      // Wait for TTL to expire (100ms)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third call after TTL - cache miss
      await executor.isCommandAvailable("npm");

      stats = cacheManager.getStats("commandAvailability");
      expect(stats?.misses).toBe(2); // Initial miss + miss after TTL
      expect(stats?.hits).toBe(1); // Only the immediate second call
    });

    it("should have long TTL (1 hour) as commands rarely change", async () => {
      // This test verifies the default config has 1 hour TTL
      // We can't easily test 30 minutes without slowing down tests
      // So just verify the config value
      const cacheManager = CacheManager.getInstance();
      const config = cacheManager.getConfig();

      expect(config.namespaces.commandAvailability.ttl).toBe(3600000); // 1 hour in ms
    });
  });

  describe("Integration with getAvailableCommands", () => {
    it("should cache results when checking multiple commands", async () => {
      const cacheManager = CacheManager.getInstance();

      // getAvailableCommands checks multiple commands
      const availableCommands = await executor.getAvailableCommands();

      expect(Array.isArray(availableCommands)).toBe(true);

      const stats = cacheManager.getStats("commandAvailability");
      // Should have checked multiple commands (one miss per command)
      expect(stats?.misses).toBeGreaterThan(0);

      // Call getAvailableCommands again - should hit cache for all commands
      const initialMisses = stats?.misses || 0;
      await executor.getAvailableCommands();

      const stats2 = cacheManager.getStats("commandAvailability");
      // Number of misses should not increase (all were cache hits)
      expect(stats2?.misses).toBe(initialMisses);
      expect(stats2?.hits).toBeGreaterThan(0);
    });
  });

  describe("Cache Statistics", () => {
    it("should track cache hit rate accurately", async () => {
      const cacheManager = CacheManager.getInstance();

      // 1 miss
      await executor.isCommandAvailable("npm");

      // 4 hits (same command)
      await executor.isCommandAvailable("npm");
      await executor.isCommandAvailable("npm");
      await executor.isCommandAvailable("npm");
      await executor.isCommandAvailable("npm");

      const stats = cacheManager.getStats("commandAvailability");
      expect(stats?.hits).toBe(4);
      expect(stats?.misses).toBe(1);
      expect(stats?.hitRate).toBe(0.8); // 4/5 = 80%
    });

    it("should report cache size correctly", async () => {
      const cacheManager = CacheManager.getInstance();

      await executor.isCommandAvailable("npm");
      await executor.isCommandAvailable("node");
      await executor.isCommandAvailable("git");

      const stats = cacheManager.getStats("commandAvailability");
      expect(stats?.size).toBe(3); // Three different commands cached
    });

    it("should achieve 90%+ hit rate after warmup", async () => {
      const cacheManager = CacheManager.getInstance();

      const commands = ["npm", "node", "git", "make", "echo"];

      // Warm up cache
      for (const cmd of commands) {
        await executor.isCommandAvailable(cmd);
      }

      // Now make many checks (simulating real usage)
      for (let i = 0; i < 45; i++) {
        const cmd = commands[i % commands.length];
        await executor.isCommandAvailable(cmd);
      }

      const stats = cacheManager.getStats("commandAvailability");
      // 5 initial misses + 45 hits = 50 total, 90% hit rate
      expect(stats?.hitRate).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe("Concurrent Access", () => {
    it("should handle concurrent checks for same command", async () => {
      const cacheManager = CacheManager.getInstance();

      // First, warm the cache with one call
      await executor.isCommandAvailable("npm");

      // Now make multiple concurrent calls - should all hit cache
      const promises = Array(10)
        .fill(null)
        .map(() => executor.isCommandAvailable("npm"));

      const results = await Promise.all(promises);

      // All should return the same result
      expect(results.every((r) => r === results[0])).toBe(true);

      const stats = cacheManager.getStats("commandAvailability");
      // After warming, all subsequent calls should be hits
      expect(stats?.hits).toBeGreaterThanOrEqual(10);
    });

    it("should handle concurrent checks for different commands", async () => {
      const commands = ["npm", "node", "git", "make", "echo"];

      const results = await Promise.all(
        commands.map((cmd) => executor.isCommandAvailable(cmd)),
      );

      // All should return boolean results
      expect(results.every((r) => typeof r === "boolean")).toBe(true);

      // Each unique command should have its own cache entry
      const cacheManager = CacheManager.getInstance();
      const stats = cacheManager.getStats("commandAvailability");
      expect(stats?.size).toBe(5); // 5 different commands cached
    });
  });

  describe("Error Handling", () => {
    it("should handle command checks gracefully on errors", async () => {
      // Test with empty string (edge case)
      const result = await executor.isCommandAvailable("");

      expect(typeof result).toBe("boolean");
      expect(result).toBe(false); // Empty string is not a valid command
    });

    it("should cache error results", async () => {
      const cacheManager = CacheManager.getInstance();

      // First call with invalid command
      await executor.isCommandAvailable("");

      // Second call should be cached
      await executor.isCommandAvailable("");

      const stats = cacheManager.getStats("commandAvailability");
      expect(stats?.hits).toBe(1); // Should cache the negative result
    });
  });

  describe("Real-world Command Checks", () => {
    it("should correctly identify common available commands", async () => {
      // These commands are likely available in test environment
      const likelyAvailable = ["node", "npm"];

      for (const cmd of likelyAvailable) {
        const available = await executor.isCommandAvailable(cmd);
        // In a Node.js test environment, these should be available
        expect(available).toBe(true);
      }
    });

    it("should correctly identify unavailable commands", async () => {
      // These commands are unlikely to exist
      const unlikelyAvailable = [
        "nonexistent-xyz-123",
        "fake-command-abc",
        "not-a-real-tool",
      ];

      for (const cmd of unlikelyAvailable) {
        const available = await executor.isCommandAvailable(cmd);
        expect(available).toBe(false);
      }
    });
  });

  describe("Performance Benchmarks", () => {
    it("should demonstrate 10x+ speedup with caching", async () => {
      const iterations = 10;

      // Measure uncached performance (first call)
      const uncachedStart = performance.now();
      await executor.isCommandAvailable("npm");
      const uncachedDuration = performance.now() - uncachedStart;

      // Measure cached performance (subsequent calls)
      const cachedStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await executor.isCommandAvailable("npm");
      }
      const cachedTotalDuration = performance.now() - cachedStart;
      const cachedAvgDuration = cachedTotalDuration / iterations;

      // Cached should be significantly faster
      // Typical: uncached ~10-50ms, cached <1ms
      expect(cachedAvgDuration).toBeLessThan(uncachedDuration / 10);
    });
  });
});
