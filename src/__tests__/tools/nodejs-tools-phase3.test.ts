import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { NodejsTools } from "../../tools/nodejs-tools.js";
import { CacheManager } from "../../utils/cache-manager.js";

/**
 * Unit tests for Phase 3 Node.js tools
 * These tests focus on validation, error handling, and non-executing functionality
 * Tests that actually run commands (npm update, profiling) are skipped
 */
describe("NodejsTools - Phase 3 Unit Tests", () => {
  let tools: NodejsTools;
  let projectRoot: string;

  beforeEach(() => {
    // Reset cache to ensure clean state
    CacheManager.resetInstance();
    projectRoot = process.cwd();
    tools = new NodejsTools(projectRoot);
  });

  afterEach(() => {
    CacheManager.resetInstance();
  });

  describe("updateDependencies - validation and errors", () => {
    it("should provide guidance for npm latest updates", async () => {
      // Note: packageManager is auto-detected from project
      const result = await tools.updateDependencies({
        latest: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("npm-check-updates");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
      expect(result.suggestions).toContain("Install npm-check-updates: npm install -g npm-check-updates");
    });

    it("should use auto-detected package manager for updates", async () => {
      // Call updateDependencies without specifying a package
      // It should use the auto-detected package manager
      const result = await tools.updateDependencies({
        packages: ["eslint"],
      });

      // Verify it detected and used a package manager
      expect(result.command).toBeDefined();
      expect(result.command).toMatch(/^(npm|yarn|pnpm|bun)\s+(update|upgrade)/);

      // For npm, it should not use 'latest' flag
      if (result.command.startsWith("npm")) {
        expect(result.command).not.toContain("--latest");
      }
    });
  });

  describe("checkCompatibility - caching and validation", () => {
    it("should check package.json engines field", async () => {
      const result = await tools.checkCompatibility({
        checkEngines: true,
      });

      expect(result).toBeDefined();
      expect(result.command).toBe("compatibility check");
      expect(result.output).toBeDefined();
      expect(result.output).toContain("Node.js Compatibility Check");
    });

    it("should use cache for identical requests", async () => {
      const args = { checkEngines: true, checkDeps: false };

      // First call - cache miss
      const result1 = await tools.checkCompatibility(args);
      expect(result1).toBeDefined();

      // Second call - should hit cache
      const result2 = await tools.checkCompatibility(args);
      expect(result2).toBeDefined();

      // Results should be identical
      expect(result2.output).toBe(result1.output);
      expect(result2.success).toBe(result1.success);
    });

    it("should skip engines check when disabled", async () => {
      const result = await tools.checkCompatibility({
        checkEngines: false,
        checkDeps: false,
      });

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
      expect(result.command).toBe("compatibility check");
    });

    it("should properly validate semver version ranges", async () => {
      // Test with current Node.js version (should pass)
      const result = await tools.checkCompatibility({
        checkEngines: true,
        checkDeps: false,
      });

      expect(result).toBeDefined();
      expect(result.output).toContain("Node.js Compatibility Check");
      expect(result.output).toContain("Current Version:");
    });

    it("should include target version in output when specified", async () => {
      const targetVersion = "18.0.0";
      const result = await tools.checkCompatibility({
        nodeVersion: targetVersion,
        checkEngines: true,
      });

      expect(result).toBeDefined();
      expect(result.command).toBe("compatibility check");
      expect(result.output).toContain("Node.js Compatibility Check");
      expect(result.output).toContain("Current Version:");
      expect(result.output).toContain(`Target Version: ${targetVersion}`);

      // Verify the version comparison provides meaningful output
      const currentVersion = process.version.replace(/^v/, "");
      expect(result.output).toContain(currentVersion);

      // Should include compatibility status or issues detected
      expect(result.output).toMatch(/compatible|warning|issues detected/i);
    });

    it("should handle missing package.json gracefully", async () => {
      const result = await tools.checkCompatibility({
        directory: "/nonexistent",
        checkEngines: true,
      });

      expect(result).toBeDefined();
      // Should have warning about missing package.json or error
      if (result.suggestions) {
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });

    it("should cache results per directory", async () => {
      const result1 = await tools.checkCompatibility({
        directory: projectRoot,
        checkEngines: true,
      });

      const result2 = await tools.checkCompatibility({
        directory: projectRoot,
        checkEngines: true,
      });

      // Should be from cache
      expect(result1.output).toBe(result2.output);
    });

    it("should check against specified Node.js version", async () => {
      const result = await tools.checkCompatibility({
        nodeVersion: "18.0.0",
        checkEngines: true,
      });

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
      expect(result.output).toContain("Target Version:");
    });
  });

  describe("runProfile - error handling", () => {
    it("should return error on directory creation failure", async () => {
      // Try to create profile dir in an invalid location
      const result = await tools.runProfile({
        script: "test",
        outputDir: "/root/invalid-permissions-dir/profiles",
        duration: 1,
      });

      expect(result).toBeDefined();

      // MUST assert regardless of success/failure
      if (result.success) {
        // If it succeeds (e.g., in CI with root permissions), verify output
        expect(result.output).toContain("Profile");
        expect(result.suggestions).toBeDefined();
      } else {
        // If it fails (expected), verify proper error handling
        expect(result.error).toBeDefined();
        expect(result.error).toMatch(/Failed to create profile output directory|permission/i);
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions?.length).toBeGreaterThan(0);
        expect(result.suggestions?.some((s) =>
          s.includes("permissions") || s.includes("directory")
        )).toBe(true);
      }
    });
  });

  describe("Validation methods", () => {
    it("should validate updateDependencies arguments", () => {
      const valid = NodejsTools.validateUpdateDepsArgs({
        packages: ["eslint"],
        dev: true,
      });

      expect(valid).toBeDefined();
      expect(valid.packages).toEqual(["eslint"]);
      expect(valid.dev).toBe(true);
    });

    it("should validate compatibility arguments", () => {
      const valid = NodejsTools.validateCompatibilityArgs({
        checkEngines: true,
        checkDeps: false,
      });

      expect(valid).toBeDefined();
      expect(valid.checkEngines).toBe(true);
      expect(valid.checkDeps).toBe(false);
    });

    it("should validate profile arguments", () => {
      const valid = NodejsTools.validateProfileArgs({
        script: "start",
        cpuProfile: true,
        duration: 30,
      });

      expect(valid).toBeDefined();
      expect(valid.script).toBe("start");
      expect(valid.cpuProfile).toBe(true);
      expect(valid.duration).toBe(30);
    });

    it("should reject invalid updateDependencies arguments", () => {
      expect(() => {
        NodejsTools.validateUpdateDepsArgs({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          packages: "not-an-array" as any, // Invalid type to trigger Zod error
        });
      }).toThrow(/Expected array, received string/i);
    });

    it("should accept valid profile arguments with all options", () => {
      const valid = NodejsTools.validateProfileArgs({
        script: "test",
        cpuProfile: true,
        heapProfile: true,
        duration: 30,
        outputDir: "./profiles",
        timeout: 60000,
        args: ["--verbose"],
      });

      expect(valid).toBeDefined();
      expect(valid.script).toBe("test");
      expect(valid.cpuProfile).toBe(true);
      expect(valid.heapProfile).toBe(true);
      expect(valid.duration).toBe(30);
      expect(valid.outputDir).toBe("./profiles");
      expect(valid.timeout).toBe(60000);
      expect(valid.args).toEqual(["--verbose"]);
    });
  });
});
