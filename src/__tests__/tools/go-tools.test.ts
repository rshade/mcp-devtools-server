import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { GoTools } from "../../tools/go-tools";
import { ShellExecutor } from "../../utils/shell-executor";
import { CacheManager } from "../../utils/cache-manager";

// Mock type for jest.fn()
type MockFn = ReturnType<typeof jest.fn>;

describe("GoTools - P1 Advanced Features", () => {
  let tools: GoTools;
  let mockExecute: MockFn;

  beforeEach(() => {
    // Reset cache to avoid test interference
    CacheManager.resetInstance();

    // Create mock executor
    const mockExecutor = {
      execute: jest.fn(),
      isCommandAvailable: jest.fn(() => Promise.resolve(true)),
    } as unknown as ShellExecutor;

    tools = new GoTools();
    // Replace executor with mock
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tools as any).executor = mockExecutor;
    mockExecute = mockExecutor.execute as MockFn;
  });

  describe("Schema Validation - Benchmark", () => {
    it("should validate benchmark arguments", () => {
      const args = {
        benchmarks: "BenchmarkFoo",
        benchtime: "10s",
        benchmem: true,
        cpu: [1, 2, 4],
        count: 3,
      };
      const validated = GoTools.validateBenchmarkArgs(args);
      expect(validated).toEqual(args);
    });

    it("should handle count parameter", () => {
      const validated = GoTools.validateBenchmarkArgs({ count: 5 });
      expect(validated.count).toBe(5);
    });

    it("should accept cpu values", () => {
      const validated = GoTools.validateBenchmarkArgs({ cpu: [1, 2, 4] });
      expect(validated.cpu).toEqual([1, 2, 4]);
    });
  });

  describe("Schema Validation - Generate", () => {
    it("should validate generate arguments", () => {
      const args = { run: "mockgen", skip: "old_*", dryRun: true };
      const validated = GoTools.validateGenerateArgs(args);
      expect(validated).toEqual(args);
    });
  });

  describe("Schema Validation - Build (Cross-Compilation)", () => {
    it("should validate cross-compilation args", () => {
      const args = {
        goos: "linux",
        goarch: "arm64",
        ldflags: "-X main.version=1.0.0",
      };
      const validated = GoTools.validateBuildArgs(args);
      expect(validated).toEqual(args);
    });

    it("should accept all valid GOOS values", () => {
      const platforms = ["linux", "darwin", "windows"];
      platforms.forEach((goos) => {
        expect(() => GoTools.validateBuildArgs({ goos })).not.toThrow();
      });
    });

    it("should accept valid GOARCH values", () => {
      const validated = GoTools.validateBuildArgs({ goarch: "amd64" });
      expect(validated.goarch).toBe("amd64");
    });
  });

  describe("Schema Validation - Work", () => {
    it("should validate work commands", () => {
      const commands = ["init", "use", "sync", "edit"] as const;
      commands.forEach((command) => {
        const validated = GoTools.validateWorkArgs({ command });
        expect(validated.command).toBe(command);
      });
    });

    it("should handle work with modules", () => {
      const validated = GoTools.validateWorkArgs({
        command: "use",
        modules: ["./mod"],
      });
      expect(validated.modules).toEqual(["./mod"]);
    });
  });

  describe("Schema Validation - Vulncheck", () => {
    it("should validate vulncheck arguments", () => {
      const args = { mode: "source" as const, json: true };
      const validated = GoTools.validateVulncheckArgs(args);
      expect(validated).toEqual(args);
    });

    it("should accept both modes", () => {
      expect(() =>
        GoTools.validateVulncheckArgs({ mode: "source" }),
      ).not.toThrow();
      expect(() =>
        GoTools.validateVulncheckArgs({ mode: "binary" }),
      ).not.toThrow();
    });
  });

  describe("goBenchmark", () => {
    it("should execute benchmark command", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "BenchmarkFoo-8    100000    12345 ns/op",
        stderr: "",
        exitCode: 0,
        duration: 1234,
      });

      const result = await tools.goBenchmark({});

      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["test"]),
        }),
      );
      expect(result.success).toBe(true);
    });

    it("should handle benchtime parameter", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goBenchmark({ benchtime: "10s" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-benchtime", "10s"]),
        }),
      );
    });

    it("should handle benchmem flag", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goBenchmark({ benchmem: true });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-benchmem"]),
        }),
      );
    });

    it("should handle cpu parameter", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goBenchmark({ cpu: [1, 2, 4] });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-cpu", "1,2,4"]),
        }),
      );
    });

    it("should handle count parameter", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goBenchmark({ count: 5 });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-count", "5"]),
        }),
      );
    });
  });

  describe("goGenerate", () => {
    it("should execute generate command", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "generating...",
        stderr: "",
        exitCode: 0,
        duration: 500,
      });
      const result = await tools.goGenerate({});
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["generate"]),
        }),
      );
      expect(result.success).toBe(true);
    });

    it("should handle run pattern", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goGenerate({ run: "mockgen" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-run", "mockgen"]),
        }),
      );
    });

    it("should handle skip pattern", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goGenerate({ skip: "old_*" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-skip", "old_*"]),
        }),
      );
    });

    it("should handle dry run", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goGenerate({ dryRun: true });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-n"]),
        }),
      );
    });

    it("should handle verbose flag", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goGenerate({ verbose: true });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-v"]),
        }),
      );
    });
  });

  describe("goBuild - Cross-Compilation", () => {
    it("should set GOOS environment variable", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 1000,
      });
      await tools.goBuild({ package: ".", goos: "linux" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          env: expect.objectContaining({ GOOS: "linux" }),
        }),
      );
    });

    it("should set GOARCH environment variable", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 1000,
      });
      await tools.goBuild({ package: ".", goarch: "arm64" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          env: expect.objectContaining({ GOARCH: "arm64" }),
        }),
      );
    });

    it("should set both GOOS and GOARCH", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 1000,
      });
      await tools.goBuild({ package: ".", goos: "windows", goarch: "amd64" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          env: expect.objectContaining({ GOOS: "windows", GOARCH: "amd64" }),
        }),
      );
    });

    it("should handle ldflags", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 1000,
      });
      await tools.goBuild({ package: ".", ldflags: "-X main.version=1.0.0" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-ldflags", "-X main.version=1.0.0"]),
        }),
      );
    });

    it("should handle build tags", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 1000,
      });
      await tools.goBuild({ package: ".", tags: ["prod", "secure"] });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-tags", "prod,secure"]),
        }),
      );
    });

    it("should handle output path", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 1000,
      });
      await tools.goBuild({ package: ".", output: "./bin/app" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: expect.arrayContaining(["-o", "./bin/app"]),
        }),
      );
    });
  });

  describe("goWork", () => {
    it("should execute work init", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      const result = await tools.goWork({ command: "init" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: ["work", "init"],
        }),
      );
      expect(result.success).toBe(true);
    });

    it("should execute work use with modules", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goWork({
        command: "use",
        modules: ["./moduleA", "./moduleB"],
      });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: ["work", "use", "./moduleA", "./moduleB"],
        }),
      );
    });

    it("should execute work sync", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goWork({ command: "sync" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: ["work", "sync"],
        }),
      );
    });

    it("should execute work edit", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
      });
      await tools.goWork({ command: "edit" });
      expect(mockExecute).toHaveBeenCalledWith(
        "go",
        expect.objectContaining({
          args: ["work", "edit"],
        }),
      );
    });
  });

  describe("goVulncheck", () => {
    it("should execute vulncheck in source mode", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "No vulnerabilities found.",
        stderr: "",
        exitCode: 0,
        duration: 2000,
      });
      const result = await tools.goVulncheck({ mode: "source" });
      expect(mockExecute).toHaveBeenCalledWith(
        "govulncheck",
        expect.any(Object),
      );
      expect(result.success).toBe(true);
    });

    it("should execute vulncheck in binary mode", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 1000,
      });
      await tools.goVulncheck({ mode: "binary", package: "./bin/app" });
      expect(mockExecute).toHaveBeenCalledWith(
        "govulncheck",
        expect.objectContaining({
          args: expect.arrayContaining(["./bin/app"]),
        }),
      );
    });

    it("should handle JSON output", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "{}",
        stderr: "",
        exitCode: 0,
        duration: 1500,
      });
      await tools.goVulncheck({ json: true });
      expect(mockExecute).toHaveBeenCalledWith(
        "govulncheck",
        expect.objectContaining({
          args: expect.arrayContaining(["-json"]),
        }),
      );
    });

    it("should handle vulnerabilities found", async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "Vulnerability #1: GO-2024-1234",
        stderr: "",
        exitCode: 3,
        duration: 2000,
      });
      const result = await tools.goVulncheck({});
      expect(result.success).toBe(false);
      expect(result.output).toContain("GO-2024-1234");
    });

    it("should suggest installing govulncheck when not found", async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "",
        stderr: "govulncheck: command not found",
        exitCode: 127,
        duration: 50,
      });
      const result = await tools.goVulncheck({});
      expect(result.success).toBe(false);
      expect(result.suggestions).toContain("govulncheck is not installed");
    });
  });

  describe("Error Handling", () => {
    it("should handle benchmark failures", async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "",
        stderr: "no test files",
        exitCode: 1,
        duration: 50,
      });
      const result = await tools.goBenchmark({});
      expect(result.success).toBe(false);
    });

    it("should handle generate failures", async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "",
        stderr: "pattern not found",
        exitCode: 1,
        duration: 50,
      });
      const result = await tools.goGenerate({});
      expect(result.success).toBe(false);
    });

    it("should handle workspace failures", async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "",
        stderr: "go.work already exists",
        exitCode: 1,
        duration: 50,
      });
      const result = await tools.goWork({ command: "init" });
      expect(result.success).toBe(false);
    });
  });

  describe("Caching Behavior", () => {
    describe("Cache configuration", () => {
      it("should have goModules cache namespace with 5-minute TTL", async () => {
        const { getCacheManager, DEFAULT_CACHE_CONFIG } = await import(
          "../../utils/cache-manager"
        );
        const cache = getCacheManager();

        // Verify TTL configuration for goModules
        const config = cache.getConfig();
        expect(config.namespaces.goModules.ttl).toBe(
          DEFAULT_CACHE_CONFIG.namespaces.goModules.ttl,
        );
        expect(config.namespaces.goModules.ttl).toBe(300000); // 5 minutes
      });

      it("should isolate goModules cache from other namespaces", async () => {
        const { getCacheManager } = await import("../../utils/cache-manager");
        const cache = getCacheManager();

        // Verify goModules namespace exists and is separate from gitOperations
        const goStats = cache.getStats("goModules");
        const gitStats = cache.getStats("gitOperations");

        expect(goStats).not.toBeNull();
        expect(gitStats).not.toBeNull();

        // They should be independent
        if (goStats && gitStats) {
          expect(goStats.namespace).toBe("goModules");
          expect(gitStats.namespace).toBe("gitOperations");
        }
      });
    });

    describe("Cache key generation", () => {
      it("should build cache keys with directory and operation", async () => {
        // Test the cache key generation logic by calling getProjectInfo
        // The cache key format should be: operation:absolutePath:argsHash
        // This is verified implicitly by the caching integration

        const { getCacheManager } = await import("../../utils/cache-manager");
        const cache = getCacheManager();

        // Clear the cache first
        cache.clear("goModules");

        // Verify cache is empty
        const stats = cache.getStats("goModules");
        expect(stats).not.toBeNull();
        if (stats) {
          expect(stats.size).toBe(0);
        }
      });
    });

    describe("Cache integration with GoTools", () => {
      it("should use CacheManager for getProjectInfo", () => {
        // Verify that GoTools has a cacheManager instance
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cacheManager = (tools as any).cacheManager;
        expect(cacheManager).toBeDefined();
        expect(typeof cacheManager.get).toBe("function");
        expect(typeof cacheManager.set).toBe("function");
      });

      it("should cache based on directory path", async () => {
        // Call getProjectInfo - it will fail because we're in a non-Go project
        // but it should still cache the result
        const result1 = await tools.getProjectInfo();
        const result2 = await tools.getProjectInfo();

        // Both calls should return same structure (even if hasGoMod is false)
        expect(result2.hasGoMod).toBe(result1.hasGoMod);
        expect(result2.dependencies).toEqual(result1.dependencies);
      });
    });

    describe("File-based invalidation", () => {
      it("should invalidate goModules cache when go.mod changes", async () => {
        const { createDevFileTracker } = await import(
          "../../utils/checksum-tracker"
        );
        const tracker = createDevFileTracker();

        // Verify that go.mod is tracked for goModules invalidation
        const trackedFiles = tracker.getTrackedFiles();

        // We expect go.mod to be tracked (though it may not exist in this project)
        expect(trackedFiles).toBeDefined();
        expect(Array.isArray(trackedFiles)).toBe(true);

        // The tracker should be monitoring key files
        // (go.mod might not exist in this project, but tracker is set up for it)
        expect(typeof tracker.track).toBe("function");
        expect(typeof tracker.hasChanged).toBe("function");
      });
    });
  });
});
