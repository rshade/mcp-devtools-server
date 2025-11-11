import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { NodejsTools } from "../../tools/nodejs-tools.js";
import { CacheManager } from "../../utils/cache-manager.js";

describe("NodejsTools - Phase 3", () => {
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

  describe("updateDependencies", () => {
    it("should handle npm update without packages", async () => {
      const result = await tools.updateDependencies({
        packageManager: "npm",
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("npm");
      expect(result.command).toContain("update");
    });

    it("should handle npm update with specific packages", async () => {
      const result = await tools.updateDependencies({
        packageManager: "npm",
        packages: ["eslint", "typescript"],
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("npm");
      expect(result.command).toContain("update");
      expect(result.command).toContain("eslint");
      expect(result.command).toContain("typescript");
    });

    it("should provide guidance for npm latest updates", async () => {
      const result = await tools.updateDependencies({
        packageManager: "npm",
        latest: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("npm-check-updates");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it("should handle yarn upgrade with interactive mode", async () => {
      const result = await tools.updateDependencies({
        packageManager: "yarn",
        interactive: true,
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("yarn");
      expect(result.command).toContain("upgrade");
      expect(result.command).toContain("--interactive");
    });

    it("should handle yarn upgrade with latest flag", async () => {
      const result = await tools.updateDependencies({
        packageManager: "yarn",
        latest: true,
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("yarn");
      expect(result.command).toContain("upgrade");
      expect(result.command).toContain("--latest");
    });

    it("should handle pnpm update with specific packages", async () => {
      const result = await tools.updateDependencies({
        packageManager: "pnpm",
        packages: ["zod"],
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("pnpm");
      expect(result.command).toContain("update");
      expect(result.command).toContain("zod");
    });

    it("should handle pnpm update with interactive and latest flags", async () => {
      const result = await tools.updateDependencies({
        packageManager: "pnpm",
        interactive: true,
        latest: true,
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("pnpm");
      expect(result.command).toContain("update");
      expect(result.command).toContain("--interactive");
      expect(result.command).toContain("--latest");
    });

    it("should handle bun update", async () => {
      const result = await tools.updateDependencies({
        packageManager: "bun",
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("bun");
      expect(result.command).toContain("update");
    });

    it("should auto-detect package manager when not specified", async () => {
      const result = await tools.updateDependencies({});

      expect(result).toBeDefined();
      expect(result.command).toBeDefined();
    });

    it("should include additional arguments", async () => {
      const result = await tools.updateDependencies({
        packageManager: "npm",
        args: ["--save-exact"],
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("--save-exact");
    });

    it("should use custom timeout", async () => {
      const result = await tools.updateDependencies({
        packageManager: "npm",
        timeout: 120000,
      });

      expect(result).toBeDefined();
    });
  });

  describe("checkCompatibility", () => {
    it("should check package.json engines field", async () => {
      const result = await tools.checkCompatibility({
        checkEngines: true,
      });

      expect(result).toBeDefined();
      expect(result.command).toBe("compatibility check");
      // Should have output about engines check
      expect(result.output).toBeDefined();
    });

    it("should use cache for identical requests", async () => {
      const args = { checkEngines: true, checkDependencies: false };

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
        checkDependencies: false,
      });

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
    });

    it("should check dependency compatibility when enabled", async () => {
      const result = await tools.checkCompatibility({
        checkEngines: false,
        checkDependencies: true,
      });

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
      // Should contain dependency check output
      expect(result.output).toContain("Dependency check");
    });

    it("should handle both engines and dependencies check", async () => {
      const result = await tools.checkCompatibility({
        checkEngines: true,
        checkDependencies: true,
      });

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
    });

    it("should detect missing package.json gracefully", async () => {
      const result = await tools.checkCompatibility({
        directory: "/nonexistent",
        checkEngines: true,
      });

      expect(result).toBeDefined();
      // Should have warning about missing package.json
      expect(result.suggestions).toBeDefined();
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

      expect(result1.output).toBe(result2.output);
    });

    it("should check against specified Node.js version", async () => {
      const result = await tools.checkCompatibility({
        nodeVersion: "18.0.0",
        checkEngines: true,
      });

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
    });
  });

  describe("profilePerformance", () => {
    it("should profile with default settings", async () => {
      const result = await tools.profilePerformance({
        script: "start",
      });

      expect(result).toBeDefined();
      expect(result.command).toBeDefined();
      expect(result.output).toBeDefined();
    });

    it("should generate CPU profile", async () => {
      const result = await tools.profilePerformance({
        script: "start",
        cpuProfile: true,
      });

      expect(result).toBeDefined();
      expect(result.output).toContain("profiles");
      const containsProfile =
        result.output.includes("CPU profile") ||
        result.output.includes("--cpu-prof");
      expect(containsProfile).toBe(true);
    });

    it("should generate heap profile", async () => {
      const result = await tools.profilePerformance({
        script: "start",
        heapProfile: true,
      });

      expect(result).toBeDefined();
      expect(result.output).toContain("profiles");
      const containsHeap =
        result.output.includes("heap") || result.output.includes("--heap-prof");
      expect(containsHeap).toBe(true);
    });

    it("should generate both CPU and heap profiles", async () => {
      const result = await tools.profilePerformance({
        script: "start",
        cpuProfile: true,
        heapProfile: true,
      });

      expect(result).toBeDefined();
      expect(result.output).toContain("profiles");
    });

    it("should use custom duration", async () => {
      const result = await tools.profilePerformance({
        script: "start",
        duration: 10,
      });

      expect(result).toBeDefined();
      expect(result.output).toBeDefined();
    });

    it("should profile custom script", async () => {
      const result = await tools.profilePerformance({
        script: "test",
      });

      expect(result).toBeDefined();
      expect(result.command).toBeDefined();
    });

    it("should include additional arguments", async () => {
      const result = await tools.profilePerformance({
        script: "start",
        args: ["--port", "3000"],
      });

      expect(result).toBeDefined();
      const hasPortArg =
        result.command.includes("--port") || result.command.includes("3000");
      expect(hasPortArg).toBe(true);
    });

    it("should provide analysis suggestions on success", async () => {
      const result = await tools.profilePerformance({
        script: "test", // Use test script which is likely to exist and complete quickly
        duration: 1,
      });

      expect(result).toBeDefined();
      if (result.success) {
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions?.length).toBeGreaterThan(0);
      }
    });

    it("should handle different output formats", async () => {
      const textResult = await tools.profilePerformance({
        script: "start",
        outputFormat: "text",
      });

      expect(textResult).toBeDefined();

      const jsonResult = await tools.profilePerformance({
        script: "start",
        outputFormat: "json",
      });

      expect(jsonResult).toBeDefined();
    });

    it("should use custom timeout", async () => {
      const result = await tools.profilePerformance({
        script: "start",
        timeout: 5000,
      });

      expect(result).toBeDefined();
    });
  });

  describe("Validation methods", () => {
    it("should validate updateDependencies arguments", () => {
      const valid = NodejsTools.validateUpdateDepsArgs({
        packageManager: "npm",
        packages: ["eslint"],
      });

      expect(valid).toBeDefined();
      expect(valid.packageManager).toBe("npm");
      expect(valid.packages).toEqual(["eslint"]);
    });

    it("should validate compatibility arguments", () => {
      const valid = NodejsTools.validateCompatibilityArgs({
        checkEngines: true,
        checkDependencies: false,
      });

      expect(valid).toBeDefined();
      expect(valid.checkEngines).toBe(true);
      expect(valid.checkDependencies).toBe(false);
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
          packageManager: "invalid",
        });
      }).toThrow();
    });

    it("should reject invalid profile output format", () => {
      expect(() => {
        NodejsTools.validateProfileArgs({
          outputFormat: "invalid",
        });
      }).toThrow();
    });
  });
});
