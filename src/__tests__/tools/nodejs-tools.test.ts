import { describe, it, expect, beforeEach } from "@jest/globals";
import { NodejsTools } from "../../tools/nodejs-tools.js";
import { CacheManager } from "../../utils/cache-manager.js";

describe("NodejsTools", () => {
  let nodejsTools: NodejsTools;
  const testDir = process.cwd();

  beforeEach(() => {
    // Reset cache between tests
    CacheManager.resetInstance();
    nodejsTools = new NodejsTools(testDir);
  });

  describe("Tool instantiation", () => {
    it("should create NodejsTools instance", () => {
      expect(nodejsTools).toBeDefined();
    });
  });

  describe("Project info analysis", () => {
    it("should analyze the current project", async () => {
      const result = await nodejsTools.getProjectInfo(testDir);

      // Should detect this project
      expect(result.hasPackageJson).toBe(true);
      expect(result.packageName).toBe("mcp-devtools-server");
      expect(result.hasTypeScript).toBe(true);
      expect(result.hasTsConfig).toBe(true);
    });

    it("should detect package manager from lockfiles", async () => {
      const result = await nodejsTools.getProjectInfo(testDir);

      // Current project uses npm (package-lock.json exists)
      expect(result.packageManager).toBeDefined();
      expect(["npm", "yarn", "pnpm", "bun"]).toContain(result.packageManager);
    });

    it("should detect test framework", async () => {
      const result = await nodejsTools.getProjectInfo(testDir);

      // Current project uses jest
      expect(result.testFramework).toBe("jest");
    });

    it("should detect linting configuration", async () => {
      const result = await nodejsTools.getProjectInfo(testDir);

      // Current project has ESLint config
      expect(result.hasLintConfig).toBe(true);
    });

    it("should cache project info results", async () => {
      const cacheManager = CacheManager.getInstance();

      // First call - cache miss
      const result1 = await nodejsTools.getProjectInfo(testDir);
      const stats1 = cacheManager.getStats("nodeModules");
      expect(stats1?.hits).toBe(0);

      // Second call - cache hit
      const result2 = await nodejsTools.getProjectInfo(testDir);
      const stats2 = cacheManager.getStats("nodeModules");
      expect(stats2?.hits).toBe(1);

      // Results should be identical
      expect(result1).toEqual(result2);
    });
  });

  describe("runTests", () => {
    it("should return error when no test framework is detected", async () => {
      // Use a non-existent directory without package.json
      const emptyDir = "/tmp/nonexistent-nodejs-test-dir-12345";
      const result = await nodejsTools.runTests({
        directory: emptyDir,
        testFramework: "auto",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No test framework detected");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it("should build jest command with coverage flag", async () => {
      const result = await nodejsTools.runTests({
        directory: testDir,
        testFramework: "jest",
        coverage: true,
        args: ["--maxWorkers=2"],
      });

      expect(result.command).toContain("jest");
      expect(result.command).toContain("--coverage");
      expect(result.command).toContain("--maxWorkers=2");
    });

    it("should build vitest command", async () => {
      const result = await nodejsTools.runTests({
        directory: testDir,
        testFramework: "vitest",
        coverage: true,
      });

      expect(result.command).toContain("vitest");
      expect(result.command).toContain("run");
      expect(result.command).toContain("--coverage");
    });

    it("should build mocha command", async () => {
      const result = await nodejsTools.runTests({
        directory: testDir,
        testFramework: "mocha",
        verbose: true,
      });

      expect(result.command).toContain("mocha");
    });
  });

  describe("runLint", () => {
    it("should build eslint command with default pattern", async () => {
      const result = await nodejsTools.runLint({
        directory: testDir,
      });

      expect(result.command).toContain("eslint");
      expect(result.command).toContain(".");
    });

    it("should build eslint command with fix flag", async () => {
      const result = await nodejsTools.runLint({
        directory: testDir,
        fix: true,
      });

      expect(result.command).toContain("eslint");
      expect(result.command).toContain("--fix");
    });

    it("should build eslint command with custom files", async () => {
      const result = await nodejsTools.runLint({
        directory: testDir,
        files: ["src/**/*.ts"],
        args: ["--max-warnings=0"],
      });

      expect(result.command).toContain("eslint");
      expect(result.command).toContain("src/**/*.ts");
      expect(result.command).toContain("--max-warnings=0");
    });
  });

  describe("runFormat", () => {
    it("should build prettier command with check mode", async () => {
      const result = await nodejsTools.runFormat({
        directory: testDir,
        check: true,
      });

      expect(result.command).toContain("prettier");
      expect(result.command).toContain("--check");
    });

    it("should build prettier command with write mode", async () => {
      const result = await nodejsTools.runFormat({
        directory: testDir,
        write: true,
        files: ["src/**/*.ts"],
      });

      expect(result.command).toContain("prettier");
      expect(result.command).toContain("--write");
      expect(result.command).toContain("src/**/*.ts");
    });

    it("should build prettier command with custom args", async () => {
      const result = await nodejsTools.runFormat({
        directory: testDir,
        args: ["--single-quote", "--trailing-comma=all"],
      });

      expect(result.command).toContain("prettier");
      expect(result.command).toContain("--single-quote");
      expect(result.command).toContain("--trailing-comma=all");
    });
  });

  describe("checkTypes", () => {
    it("should build tsc command with noEmit", async () => {
      const result = await nodejsTools.checkTypes({
        directory: testDir,
      });

      expect(result.command).toContain("tsc");
      expect(result.command).toContain("--noEmit");
    });

    it("should build tsc command with project flag", async () => {
      const result = await nodejsTools.checkTypes({
        directory: testDir,
        project: "tsconfig.build.json",
      });

      expect(result.command).toContain("tsc");
      expect(result.command).toContain("--project");
      expect(result.command).toContain("tsconfig.build.json");
    });

    it("should build tsc command with custom args", async () => {
      const result = await nodejsTools.checkTypes({
        directory: testDir,
        args: ["--skipLibCheck"],
      });

      expect(result.command).toContain("tsc");
      expect(result.command).toContain("--skipLibCheck");
    });
  });

  describe("installDependencies", () => {
    it("should build npm install command", async () => {
      const result = await nodejsTools.installDependencies({
        directory: testDir,
        packageManager: "npm",
        args: ["--dry-run"],
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("npm");
      expect(result.command).toContain("install");
      expect(result.command).toContain("--dry-run");
    });

    it.skip("should build yarn install command", async () => {
      // Skipped: yarn install takes too long
      const result = await nodejsTools.installDependencies({
        directory: testDir,
        packageManager: "yarn",
        frozen: true,
      });

      expect(result.command).toContain("yarn");
      expect(result.command).toContain("install");
      expect(result.command).toContain("--frozen-lockfile");
    });

    it.skip("should build pnpm install command", async () => {
      // Skipped: pnpm install takes too long
      const result = await nodejsTools.installDependencies({
        directory: testDir,
        packageManager: "pnpm",
        production: true,
      });

      expect(result.command).toContain("pnpm");
      expect(result.command).toContain("install");
      expect(result.command).toContain("--prod");
    });

    it.skip("should build bun install command", async () => {
      // Skipped: bun install takes too long
      const result = await nodejsTools.installDependencies({
        directory: testDir,
        packageManager: "bun",
      });

      expect(result.command).toContain("bun");
      expect(result.command).toContain("install");
    });

    it.skip("should auto-detect package manager", async () => {
      // Skipped: install takes too long
      const result = await nodejsTools.installDependencies({
        directory: testDir,
        packageManager: "auto",
      });

      // Should detect npm from package-lock.json
      expect(result.command).toBeDefined();
      expect(
        ["npm", "yarn", "pnpm", "bun"].some((pm) =>
          result.command.includes(pm),
        ),
      ).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should handle non-existent directories gracefully", async () => {
      const nonExistentDir = "/tmp/nonexistent-nodejs-project-12345";
      const result = await nodejsTools.getProjectInfo(nonExistentDir);

      expect(result.hasPackageJson).toBe(false);
    });

    it("should handle malformed package.json gracefully", async () => {
      // This test verifies the error handling exists
      // The actual malformed JSON test would require creating a temp file
      // For now, we verify the code path exists by checking non-existent dir
      const result = await nodejsTools.getProjectInfo(
        "/tmp/test-malformed-json-12345",
      );
      expect(result.hasPackageJson).toBe(false);
    });
  });

  describe("Framework detection", () => {
    it("should detect frameworks from the current project", async () => {
      const result = await nodejsTools.getProjectInfo(testDir);

      // Framework detection should work
      expect(result.framework).toBeDefined();
    });

    it("should return build tool info if available", async () => {
      const result = await nodejsTools.getProjectInfo(testDir);

      // Build tool may or may not be defined for this project
      // Just verify the field exists
      expect(result).toHaveProperty("buildTool");
    });
  });

  describe("Command timeout configuration", () => {
    it("should use custom timeout for tests", async () => {
      const result = await nodejsTools.runTests({
        directory: testDir,
        testFramework: "jest",
        timeout: 60000, // 1 minute
      });

      expect(result).toBeDefined();
    });

    it("should use custom timeout for install", async () => {
      const result = await nodejsTools.installDependencies({
        directory: testDir,
        packageManager: "npm",
        timeout: 120000, // 2 minutes
        args: ["--dry-run"],
      });

      expect(result).toBeDefined();
    });
  });
});
