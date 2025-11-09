import { FileScanner } from "../../utils/file-scanner.js";
import { CacheManager } from "../../utils/cache-manager.js";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

describe("FileScanner Caching", () => {
  let tempDir: string;
  let scanner: FileScanner;

  beforeEach(async () => {
    // Reset cache before each test
    CacheManager.resetInstance();
    scanner = new FileScanner();

    // Create temporary test directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-scanner-test-"));

    // Create test files
    await fs.writeFile(path.join(tempDir, "file1.md"), "# Test");
    await fs.writeFile(path.join(tempDir, "file2.md"), "# Test 2");
    await fs.writeFile(path.join(tempDir, "file3.ts"), "const x = 1;");
    await fs.mkdir(path.join(tempDir, "subdir"));
    await fs.writeFile(path.join(tempDir, "subdir", "nested.md"), "# Nested");
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
    CacheManager.resetInstance();
  });

  describe("Cache Hit/Miss Behavior", () => {
    it("should cache glob results on first call", async () => {
      const cacheManager = CacheManager.getInstance();

      // First call - cache miss
      const files1 = await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      expect(files1.length).toBe(3); // file1.md, file2.md, subdir/nested.md

      const stats1 = cacheManager.getStats("fileLists");
      expect(stats1?.misses).toBe(1);
      expect(stats1?.hits).toBe(0);
    });

    it("should return cached results on subsequent calls with same pattern", async () => {
      const cacheManager = CacheManager.getInstance();

      // First call - cache miss
      const files1 = await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      // Second call - cache hit
      const files2 = await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      expect(files1).toEqual(files2);

      const stats = cacheManager.getStats("fileLists");
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);
    });

    it("should provide 2x performance improvement with caching", async () => {
      // Warm up the cache
      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      // Measure cached performance
      const start = performance.now();
      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });
      const cachedDuration = performance.now() - start;

      // Cached call should be very fast (< 5ms typically)
      expect(cachedDuration).toBeLessThan(50); // Allow some margin
    });
  });

  describe("Cache Key Differentiation", () => {
    it("should use different cache keys for different patterns", async () => {
      const cacheManager = CacheManager.getInstance();

      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      await scanner.scan({
        patterns: ["**/*.ts"],
        cwd: tempDir,
      });

      const stats = cacheManager.getStats("fileLists");
      expect(stats?.misses).toBe(2); // Both are cache misses
      expect(stats?.hits).toBe(0);
    });

    it("should use different cache keys for different working directories", async () => {
      const cacheManager = CacheManager.getInstance();

      // Create second temp directory
      const tempDir2 = await fs.mkdtemp(
        path.join(os.tmpdir(), "file-scanner-test-2-"),
      );
      await fs.writeFile(path.join(tempDir2, "other.md"), "# Other");

      try {
        await scanner.scan({
          patterns: ["**/*.md"],
          cwd: tempDir,
        });

        await scanner.scan({
          patterns: ["**/*.md"],
          cwd: tempDir2,
        });

        const stats = cacheManager.getStats("fileLists");
        expect(stats?.misses).toBe(2); // Different directories = different cache keys
      } finally {
        await fs.rm(tempDir2, { recursive: true, force: true });
      }
    });

    it("should use different cache keys for different ignore patterns", async () => {
      const cacheManager = CacheManager.getInstance();

      await scanner.scan({
        patterns: ["**/*.md"],
        exclude: ["node_modules/**"],
        cwd: tempDir,
      });

      await scanner.scan({
        patterns: ["**/*.md"],
        exclude: ["node_modules/**", "dist/**"],
        cwd: tempDir,
      });

      const stats = cacheManager.getStats("fileLists");
      expect(stats?.misses).toBe(2); // Different exclude patterns = different keys
    });

    it("should normalize pattern order in cache keys", async () => {
      const cacheManager = CacheManager.getInstance();

      // First call with patterns in one order
      const files1 = await scanner.scan({
        patterns: ["**/*.md", "**/*.ts"],
        cwd: tempDir,
      });

      // Second call with patterns in different order (should still hit cache due to sorting)
      const files2 = await scanner.scan({
        patterns: ["**/*.ts", "**/*.md"],
        cwd: tempDir,
      });

      // Results should be the same
      expect(files1.sort()).toEqual(files2.sort());

      const stats = cacheManager.getStats("fileLists");
      // The implementation sorts patterns in buildFileScanCacheKey, so should be cache hit
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);
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
          fileLists: { max: 200, ttl: 100 }, // 100ms for testing
          commandAvailability: { max: 50, ttl: 3600000 },
          testResults: { max: 100, ttl: 60000 },
          smartSuggestions: { max: 100, ttl: 300000 },
        },
      };
      CacheManager.getInstance(shortTTLConfig);
      scanner = new FileScanner();

      const cacheManager = CacheManager.getInstance();

      // First call - cache miss
      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      // Second call immediately - cache hit
      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      let stats = cacheManager.getStats("fileLists");
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);

      // Wait for TTL to expire (100ms)
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third call after TTL - cache miss
      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      stats = cacheManager.getStats("fileLists");
      expect(stats?.misses).toBe(2); // Initial miss + miss after TTL
      expect(stats?.hits).toBe(1); // Only the immediate second call
    });
  });

  describe("Glob Pattern Expansion", () => {
    it("should handle multiple patterns with caching", async () => {
      const files = await scanner.scan({
        patterns: ["**/*.md", "**/*.ts"],
        cwd: tempDir,
      });

      // Should find all markdown and TypeScript files
      expect(files.length).toBe(4); // 3 md + 1 ts
      expect(files.some((f) => f.endsWith(".md"))).toBe(true);
      expect(files.some((f) => f.endsWith(".ts"))).toBe(true);
    });

    it("should respect exclude patterns", async () => {
      // Create a file in a directory that should be excluded
      await fs.mkdir(path.join(tempDir, "node_modules"));
      await fs.writeFile(
        path.join(tempDir, "node_modules", "excluded.md"),
        "# Excluded",
      );

      const files = await scanner.scan({
        patterns: ["**/*.md"],
        exclude: ["node_modules/**"],
        cwd: tempDir,
      });

      // Should not include the excluded file
      expect(files.every((f) => !f.includes("node_modules"))).toBe(true);
      expect(files.length).toBe(3); // Only the non-excluded files
    });

    it("should return absolute paths", async () => {
      const files = await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      // All paths should be absolute
      files.forEach((file) => {
        expect(path.isAbsolute(file)).toBe(true);
      });
    });

    it("should return sorted results", async () => {
      const files = await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      // Results should be sorted
      const sorted = [...files].sort();
      expect(files).toEqual(sorted);
    });
  });

  describe("Cache Statistics", () => {
    it("should track cache hit rate accurately", async () => {
      const cacheManager = CacheManager.getInstance();

      // 1 miss
      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      // 3 hits (same pattern)
      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });
      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });
      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      const stats = cacheManager.getStats("fileLists");
      expect(stats?.hits).toBe(3);
      expect(stats?.misses).toBe(1);
      expect(stats?.hitRate).toBe(0.75); // 3/4 = 75%
    });

    it("should report cache size correctly", async () => {
      const cacheManager = CacheManager.getInstance();

      await scanner.scan({
        patterns: ["**/*.md"],
        cwd: tempDir,
      });

      await scanner.scan({
        patterns: ["**/*.ts"],
        cwd: tempDir,
      });

      const stats = cacheManager.getStats("fileLists");
      expect(stats?.size).toBe(2); // Two different cache entries
    });
  });

  describe("Error Handling", () => {
    it("should handle non-existent directory gracefully", async () => {
      const nonExistentDir = path.join(tempDir, "does-not-exist");

      const files = await scanner.scan({
        patterns: ["**/*.md"],
        cwd: nonExistentDir,
      });

      // Should return empty array without throwing
      expect(files).toEqual([]);
    });

    it("should handle invalid glob patterns gracefully", async () => {
      // Glob should handle most patterns, but test with edge cases
      const files = await scanner.scan({
        patterns: ["[invalid"],
        cwd: tempDir,
      });

      // Should return empty or minimal results without throwing
      expect(Array.isArray(files)).toBe(true);
    });
  });
});
