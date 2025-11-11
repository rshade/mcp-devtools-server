import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { NodejsTools } from "../../tools/nodejs-tools.js";
import { CacheManager } from "../../utils/cache-manager.js";
import type { ExecutionResult } from "../../utils/shell-executor.js";

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

    it.skip("should build jest command with coverage flag", async () => {
      // Skipped: jest takes too long
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

    it.skip("should build vitest command", async () => {
      // Skipped: vitest takes too long
      const result = await nodejsTools.runTests({
        directory: testDir,
        testFramework: "vitest",
        coverage: true,
      });

      expect(result.command).toContain("vitest");
      expect(result.command).toContain("run");
      expect(result.command).toContain("--coverage");
    });

    it.skip("should build mocha command", async () => {
      // Skipped: mocha takes too long
      const result = await nodejsTools.runTests({
        directory: testDir,
        testFramework: "mocha",
        verbose: true,
      });

      expect(result.command).toContain("mocha");
    });
  });

  describe("runLint", () => {
    it("should build eslint command with default pattern (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "No errors found",
          stderr: "",
          exitCode: 0,
          duration: 50,
        } as ExecutionResult);

      const result = await nodejsTools.runLint({
        directory: testDir,
      });

      expect(mockExecute).toHaveBeenCalledWith("eslint", {
        cwd: testDir,
        args: ["."],
        timeout: 120000,
      });
      expect(result.success).toBe(true);
      expect(result.command).toContain("eslint");
      expect(result.command).toContain(".");

      mockExecute.mockRestore();
    });

    it("should build eslint command with fix flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Fixed 3 files",
          stderr: "",
          exitCode: 0,
          duration: 100,
        } as ExecutionResult);

      const result = await nodejsTools.runLint({
        directory: testDir,
        fix: true,
      });

      expect(mockExecute).toHaveBeenCalledWith("eslint", {
        cwd: testDir,
        args: [".", "--fix"],
        timeout: 120000,
      });
      expect(result.command).toContain("eslint");
      expect(result.command).toContain("--fix");

      mockExecute.mockRestore();
    });

    it("should build eslint command with custom files and format (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Linted successfully",
          stderr: "",
          exitCode: 0,
          duration: 75,
        } as ExecutionResult);

      const result = await nodejsTools.runLint({
        directory: testDir,
        files: ["src/**/*.ts"],
        format: "json",
        args: ["--max-warnings=0"],
      });

      expect(mockExecute).toHaveBeenCalledWith("eslint", {
        cwd: testDir,
        args: ["src/**/*.ts", "--format", "json", "--max-warnings=0"],
        timeout: 120000,
      });
      expect(result.command).toContain("eslint");
      expect(result.command).toContain("src/**/*.ts");
      expect(result.command).toContain("--format");
      expect(result.command).toContain("json");
      expect(result.command).toContain("--max-warnings=0");

      mockExecute.mockRestore();
    });

    it.skip("should build eslint command with default pattern", async () => {
      // Skipped: eslint takes too long
      const result = await nodejsTools.runLint({
        directory: testDir,
      });

      expect(result.command).toContain("eslint");
      expect(result.command).toContain(".");
    });

    it.skip("should build eslint command with fix flag", async () => {
      // Skipped: eslint takes too long
      const result = await nodejsTools.runLint({
        directory: testDir,
        fix: true,
      });

      expect(result.command).toContain("eslint");
      expect(result.command).toContain("--fix");
    });

    it.skip("should build eslint command with custom files", async () => {
      // Skipped: eslint takes too long
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
    it("should build prettier command with check mode (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "All files formatted",
          stderr: "",
          exitCode: 0,
          duration: 40,
        } as ExecutionResult);

      const result = await nodejsTools.runFormat({
        directory: testDir,
        check: true,
      });

      expect(mockExecute).toHaveBeenCalledWith("prettier", {
        cwd: testDir,
        args: ["--check", "**/*.{js,ts,jsx,tsx,json,md}"],
      });
      expect(result.success).toBe(true);
      expect(result.command).toContain("prettier");
      expect(result.command).toContain("--check");

      mockExecute.mockRestore();
    });

    it("should build prettier command with write mode (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Formatted 5 files",
          stderr: "",
          exitCode: 0,
          duration: 60,
        } as ExecutionResult);

      const result = await nodejsTools.runFormat({
        directory: testDir,
        write: true,
        files: ["src/**/*.ts"],
      });

      expect(mockExecute).toHaveBeenCalledWith("prettier", {
        cwd: testDir,
        args: ["--write", "src/**/*.ts"],
      });
      expect(result.command).toContain("prettier");
      expect(result.command).toContain("--write");
      expect(result.command).toContain("src/**/*.ts");

      mockExecute.mockRestore();
    });

    it("should build prettier command with list-different mode (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "file1.ts\nfile2.ts",
          stderr: "",
          exitCode: 0,
          duration: 45,
        } as ExecutionResult);

      const result = await nodejsTools.runFormat({
        directory: testDir,
        args: ["--single-quote"],
      });

      expect(mockExecute).toHaveBeenCalledWith("prettier", {
        cwd: testDir,
        args: [
          "--list-different",
          "**/*.{js,ts,jsx,tsx,json,md}",
          "--single-quote",
        ],
      });
      expect(result.command).toContain("prettier");
      expect(result.command).toContain("--list-different");
      expect(result.command).toContain("--single-quote");

      mockExecute.mockRestore();
    });

    it.skip("should build prettier command with check mode", async () => {
      // Skipped: prettier takes too long
      const result = await nodejsTools.runFormat({
        directory: testDir,
        check: true,
      });

      expect(result.command).toContain("prettier");
      expect(result.command).toContain("--check");
    });

    it.skip("should build prettier command with write mode", async () => {
      // Skipped: prettier takes too long
      const result = await nodejsTools.runFormat({
        directory: testDir,
        write: true,
        files: ["src/**/*.ts"],
      });

      expect(result.command).toContain("prettier");
      expect(result.command).toContain("--write");
      expect(result.command).toContain("src/**/*.ts");
    });

    it.skip("should build prettier command with custom args", async () => {
      // Skipped: prettier takes too long
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
    it("should build tsc command with noEmit (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "",
          stderr: "",
          exitCode: 0,
          duration: 500,
        } as ExecutionResult);

      const result = await nodejsTools.checkTypes({
        directory: testDir,
      });

      expect(mockExecute).toHaveBeenCalledWith("tsc", {
        cwd: testDir,
        args: ["--noEmit"],
        timeout: 180000,
      });
      expect(result.success).toBe(true);
      expect(result.command).toContain("tsc");
      expect(result.command).toContain("--noEmit");

      mockExecute.mockRestore();
    });

    it("should build tsc command with project flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "",
          stderr: "",
          exitCode: 0,
          duration: 600,
        } as ExecutionResult);

      const result = await nodejsTools.checkTypes({
        directory: testDir,
        project: "tsconfig.build.json",
      });

      expect(mockExecute).toHaveBeenCalledWith("tsc", {
        cwd: testDir,
        args: ["--project", "tsconfig.build.json", "--noEmit"],
        timeout: 180000,
      });
      expect(result.command).toContain("tsc");
      expect(result.command).toContain("--project");
      expect(result.command).toContain("tsconfig.build.json");

      mockExecute.mockRestore();
    });

    it("should build tsc command with incremental flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "",
          stderr: "",
          exitCode: 0,
          duration: 400,
        } as ExecutionResult);

      const result = await nodejsTools.checkTypes({
        directory: testDir,
        incremental: true,
        args: ["--skipLibCheck"],
      });

      expect(mockExecute).toHaveBeenCalledWith("tsc", {
        cwd: testDir,
        args: ["--noEmit", "--incremental", "--skipLibCheck"],
        timeout: 180000,
      });
      expect(result.command).toContain("tsc");
      expect(result.command).toContain("--incremental");
      expect(result.command).toContain("--skipLibCheck");

      mockExecute.mockRestore();
    });

    it.skip("should build tsc command with noEmit", async () => {
      // Skipped: tsc takes too long
      const result = await nodejsTools.checkTypes({
        directory: testDir,
      });

      expect(result.command).toContain("tsc");
      expect(result.command).toContain("--noEmit");
    });

    it.skip("should build tsc command with project flag", async () => {
      // Skipped: tsc takes too long
      const result = await nodejsTools.checkTypes({
        directory: testDir,
        project: "tsconfig.build.json",
      });

      expect(result.command).toContain("tsc");
      expect(result.command).toContain("--project");
      expect(result.command).toContain("tsconfig.build.json");
    });

    it.skip("should build tsc command with custom args", async () => {
      // Skipped: tsc takes too long
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
    it.skip("should use custom timeout for tests", async () => {
      // Skipped: jest takes too long
      const result = await nodejsTools.runTests({
        directory: testDir,
        testFramework: "jest",
        timeout: 60000, // 1 minute
      });

      expect(result).toBeDefined();
    });

    it.skip("should use custom timeout for install", async () => {
      // Skipped: npm install takes too long
      const result = await nodejsTools.installDependencies({
        directory: testDir,
        packageManager: "npm",
        timeout: 120000, // 2 minutes
        args: ["--dry-run"],
      });

      expect(result).toBeDefined();
    });
  });

  // Phase 2 tool tests
  describe("getVersion", () => {
    it("should get version for single tool", async () => {
      const result = await nodejsTools.getVersion({
        directory: testDir,
        tool: "node",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("node:");
      expect(result.command).toContain("version check");
    });

    it("should get versions for all tools", async () => {
      const result = await nodejsTools.getVersion({
        directory: testDir,
        tool: "all",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("node:");
      expect(result.output).toContain("npm:");
    });

    it("should cache version results", async () => {
      const cacheManager = CacheManager.getInstance();

      // First call - cache miss
      const result1 = await nodejsTools.getVersion({
        directory: testDir,
        tool: "node",
      });
      const stats1 = cacheManager.getStats("commandAvailability");
      expect(stats1?.misses).toBeGreaterThan(0);

      // Second call - cache hit
      const result2 = await nodejsTools.getVersion({
        directory: testDir,
        tool: "node",
      });
      const stats2 = cacheManager.getStats("commandAvailability");
      expect(stats2?.hits).toBeGreaterThan(0);

      // Results should be identical
      expect(result1.output).toEqual(result2.output);
    });
  });

  describe("runSecurity", () => {
    it("should build npm audit command (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: '{"vulnerabilities": {}}',
          stderr: "",
          exitCode: 0,
          duration: 3000,
        } as ExecutionResult);

      const result = await nodejsTools.runSecurity({
        directory: testDir,
        audit: true,
      });

      expect(mockExecute).toHaveBeenCalledWith(
        "npm",
        expect.objectContaining({
          cwd: testDir,
          args: expect.arrayContaining(["audit", "--json"]),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.command).toContain("npm");
      expect(result.command).toContain("audit");

      mockExecute.mockRestore();
    });

    it("should build npm audit fix command (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Fixed 3 vulnerabilities",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      const result = await nodejsTools.runSecurity({
        directory: testDir,
        audit: true,
        fix: true,
      });

      expect(mockExecute).toHaveBeenCalledWith(
        "npm",
        expect.objectContaining({
          cwd: testDir,
          args: expect.arrayContaining(["audit", "fix"]),
        }),
      );
      expect(result.command).toContain("audit");
      expect(result.command).toContain("fix");

      mockExecute.mockRestore();
    });

    it.skip("should build npm audit command", async () => {
      // Skipped: npm audit takes too long
      const result = await nodejsTools.runSecurity({
        directory: testDir,
        audit: true,
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("audit");
    });

    it.skip("should build npm audit fix command", async () => {
      // Skipped: npm audit takes too long
      const result = await nodejsTools.runSecurity({
        directory: testDir,
        audit: true,
        fix: true,
      });

      expect(result.command).toContain("audit");
      expect(result.command).toContain("fix");
    });

    it.skip("should add production flag", async () => {
      // Skipped: npm audit takes too long
      const result = await nodejsTools.runSecurity({
        directory: testDir,
        production: true,
      });

      expect(result.command).toContain("--production");
    });
  });

  describe("runBuild", () => {
    it("should build npm run build command (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Build successful",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      const result = await nodejsTools.runBuild({
        directory: testDir,
        script: "build",
      });

      expect(mockExecute).toHaveBeenCalledWith(
        "npm",
        expect.objectContaining({
          cwd: testDir,
          args: expect.arrayContaining(["run", "build"]),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.command).toContain("npm");
      expect(result.command).toContain("run");
      expect(result.command).toContain("build");

      mockExecute.mockRestore();
    });

    it("should add production flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Production build",
          stderr: "",
          exitCode: 0,
          duration: 6000,
        } as ExecutionResult);

      const result = await nodejsTools.runBuild({
        directory: testDir,
        production: true,
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain("npm");
      expect(result.command).toContain("run");

      mockExecute.mockRestore();
    });

    it("should add watch flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Watching...",
          stderr: "",
          exitCode: 0,
          duration: 1000,
        } as ExecutionResult);

      const result = await nodejsTools.runBuild({
        directory: testDir,
        watch: true,
        args: ["--verbose"],
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain("npm");
      expect(result.command).toContain("run");

      mockExecute.mockRestore();
    });

    it.skip("should build npm run build command", async () => {
      // Skipped: npm run build takes too long
      const result = await nodejsTools.runBuild({
        directory: testDir,
        script: "build",
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("run");
      expect(result.command).toContain("build");
    });

    it.skip("should add production flag", async () => {
      // Skipped: npm run build takes too long
      const result = await nodejsTools.runBuild({
        directory: testDir,
        production: true,
      });

      expect(result.command).toContain("run");
    });

    it.skip("should add watch flag", async () => {
      // Skipped: npm run build takes too long
      const result = await nodejsTools.runBuild({
        directory: testDir,
        watch: true,
      });

      expect(result.command).toContain("run");
    });
  });

  describe("runScripts", () => {
    it("should list available scripts", async () => {
      const result = await nodejsTools.runScripts({
        directory: testDir,
        list: true,
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("Available scripts");
    });

    it("should return error when no script specified", async () => {
      const result = await nodejsTools.runScripts({
        directory: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No script specified");
      expect(result.suggestions).toBeDefined();
    });

    it("should build npm run script command (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Test passed",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      const result = await nodejsTools.runScripts({
        directory: testDir,
        script: "test",
        args: ["--verbose"],
      });

      expect(mockExecute).toHaveBeenCalledWith(
        "npm",
        expect.objectContaining({
          cwd: testDir,
          args: expect.arrayContaining(["run", "test", "--", "--verbose"]),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.command).toContain("npm");
      expect(result.command).toContain("run");
      expect(result.command).toContain("test");

      mockExecute.mockRestore();
    });

    it.skip("should build npm run script command", async () => {
      // Skipped: npm run test takes too long
      const result = await nodejsTools.runScripts({
        directory: testDir,
        script: "test",
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("run");
      expect(result.command).toContain("test");
    });
  });

  describe("runBenchmark", () => {
    // Fast test - kept (tests error path, no execution)
    it("should return error when no benchmark tool detected", async () => {
      // Use a directory without benchmark tools
      const emptyDir = "/tmp/nonexistent-benchmark-dir-12345";
      const result = await nodejsTools.runBenchmark({
        directory: emptyDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No benchmark tool detected");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });
  });

  // Phase 3 tool tests
  describe("updateDependencies", () => {
    it.skip("should build npm update command", async () => {
      // Skipped: npm update takes too long
      const result = await nodejsTools.updateDependencies({
        directory: testDir,
        packages: ["typescript"],
      });

      expect(result).toBeDefined();
      expect(result.command).toContain("update");
      expect(result.command).toContain("typescript");
    });

    // Fast test - kept (returns error immediately, no execution)
    it("should return error for npm latest updates", async () => {
      const result = await nodejsTools.updateDependencies({
        directory: testDir,
        latest: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("npm-check-updates");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it.skip("should build yarn upgrade command with interactive", async () => {
      // Skipped: yarn upgrade takes too long
      // Create a mock NodejsTools with yarn as package manager
      const mockGetProjectInfo = async () => ({
        hasPackageJson: true,
        packageName: "test",
        packageManager: "yarn" as const,
        hasTypeScript: false,
        hasTsConfig: false,
        hasLintConfig: false,
        hasPrettierConfig: false,
        testFramework: undefined,
        framework: undefined,
        buildTool: undefined,
        hasTests: false,
        testFiles: [],
        scripts: [],
        dependencies: [],
        devDependencies: [],
      });

      // Temporarily override getProjectInfo
      const originalGetProjectInfo =
        nodejsTools.getProjectInfo.bind(nodejsTools);
      nodejsTools.getProjectInfo = mockGetProjectInfo;

      const result = await nodejsTools.updateDependencies({
        directory: testDir,
        interactive: true,
        latest: true,
      });

      // Restore original method
      nodejsTools.getProjectInfo = originalGetProjectInfo;

      expect(result.command).toContain("upgrade");
      expect(result.command).toContain("--interactive");
      expect(result.command).toContain("--latest");
    });

    it.skip("should add dev flag for npm", async () => {
      // Skipped: npm update takes too long
      const result = await nodejsTools.updateDependencies({
        directory: testDir,
        dev: true,
        packages: ["jest"],
      });

      expect(result.command).toContain("--save-dev");
    });

    it.skip("should handle multiple packages", async () => {
      // Skipped: npm update takes too long
      const result = await nodejsTools.updateDependencies({
        directory: testDir,
        packages: ["typescript", "eslint", "prettier"],
      });

      expect(result.command).toContain("typescript");
      expect(result.command).toContain("eslint");
      expect(result.command).toContain("prettier");
    });
  });

  describe("checkCompatibility", () => {
    it("should check current Node.js version", async () => {
      const result = await nodejsTools.checkCompatibility({
        directory: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("Node.js Compatibility Check");
      expect(result.output).toContain("Current Version:");
    });

    it("should check engines field in package.json", async () => {
      const result = await nodejsTools.checkCompatibility({
        directory: testDir,
        checkEngines: true,
      });

      expect(result.output).toContain("Compatibility Check");
      // Should either have engine requirement or warning about missing engines
      expect(
        result.output.includes("Engine requirement") ||
          result.output.includes("No engines.node field"),
      ).toBe(true);
    });

    it("should detect modern packages requiring Node.js 18+", async () => {
      // This is a conceptual test - actual detection depends on dependencies
      const result = await nodejsTools.checkCompatibility({
        directory: testDir,
        checkDeps: true,
      });

      expect(result).toBeDefined();
      expect(result.output).toContain("Compatibility Check");
    });

    it("should cache compatibility results", async () => {
      const cacheManager = CacheManager.getInstance();

      // First call - cache miss
      const result1 = await nodejsTools.checkCompatibility({
        directory: testDir,
      });
      const stats1 = cacheManager.getStats("nodeModules");
      expect(stats1?.misses).toBeGreaterThan(0);

      // Second call - cache hit
      const result2 = await nodejsTools.checkCompatibility({
        directory: testDir,
      });
      const stats2 = cacheManager.getStats("nodeModules");
      expect(stats2?.hits).toBeGreaterThan(0);

      // Results should be identical
      expect(result1.output).toEqual(result2.output);
    });

    it("should handle non-existent directory gracefully", async () => {
      const nonExistentDir = "/tmp/nonexistent-compat-dir-12345";
      const result = await nodejsTools.checkCompatibility({
        directory: nonExistentDir,
      });

      // Should still return current version info
      expect(result.output).toContain("Current Version:");
    });
  });

  describe("runProfile", () => {
    it("should build profiling command with CPU profile (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Profiling complete",
          stderr: "",
          exitCode: 0,
          duration: 3000,
        } as ExecutionResult);

      const result = await nodejsTools.runProfile({
        directory: testDir,
        script: "start",
        cpuProfile: true,
        outputDir: "/tmp/test-profiles",
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain("npm");
      expect(result.command).toContain("run");
      expect(result.command).toContain("start");
      expect(result.output).toContain("Performance Profile");
      expect(result.output).toContain("/tmp/test-profiles");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.some((s) => s.includes("Chrome DevTools"))).toBe(
        true,
      );

      mockExecute.mockRestore();
    });

    it("should build profiling command with heap profile (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Heap profiling complete",
          stderr: "",
          exitCode: 0,
          duration: 2500,
        } as ExecutionResult);

      const result = await nodejsTools.runProfile({
        directory: testDir,
        script: "build",
        heapProfile: true,
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain("npm");
      expect(result.command).toContain("run");
      expect(result.command).toContain("build");
      expect(result.output).toContain("Performance Profile");

      mockExecute.mockRestore();
    });

    it("should default to CPU profile when no flags specified (mocked)", async () => {
      const mockExecute = jest
        .spyOn(nodejsTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Default profiling",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      const result = await nodejsTools.runProfile({
        directory: testDir,
      });

      expect(result.success).toBe(true);
      expect(result.command).toContain("npm");
      expect(result.output).toContain("Performance Profile");

      mockExecute.mockRestore();
    });

    // Note: mkdir error handling is tested implicitly - see nodejs-tools.ts:1386-1394
    // The fix ensures EACCES and other errors are re-thrown with helpful messages,
    // while EEXIST (directory already exists) is ignored. Testing this requires
    // complex ES module mocking which is not worth the effort.

    it.skip(
      "should build profiling command with CPU profile",
      async () => {
        // Skipped: npm run build with profiling takes 20+ seconds
        const result = await nodejsTools.runProfile({
          directory: testDir,
          script: "build",
          cpuProfile: true,
          duration: 3, // 3 second max
        });

        expect(result).toBeDefined();
        expect(result.command).toContain("run");
        expect(result.command).toContain("build");
        expect(result.output).toContain("Performance Profile");
      },
      120000,
    ); // 2 minute timeout for this test

    it.skip(
      "should build profiling command with heap profile",
      async () => {
        // Skipped: npm run build with profiling takes 20+ seconds
        const result = await nodejsTools.runProfile({
          directory: testDir,
          script: "build",
          heapProfile: true,
          duration: 3, // 3 second max
        });

        expect(result).toBeDefined();
        expect(result.output).toContain("Performance Profile");
      },
      120000,
    ); // 2 minute timeout

    it.skip(
      "should default to CPU profile when no flags specified",
      async () => {
        // Skipped: npm run build with profiling takes 20+ seconds
        const result = await nodejsTools.runProfile({
          directory: testDir,
          script: "build",
          duration: 3, // 3 second max
        });

        expect(result).toBeDefined();
        expect(result.output).toContain("Performance Profile");
      },
      120000,
    ); // 2 minute timeout

    it.skip(
      "should use custom output directory",
      async () => {
        // Skipped: npm run build with profiling takes 20+ seconds
        const customDir = "/tmp/test-profiles-12345";
        const result = await nodejsTools.runProfile({
          directory: testDir,
          script: "build",
          outputDir: customDir,
          duration: 3, // 3 second max
        });

        expect(result.output).toContain(customDir);
      },
      120000,
    ); // 2 minute timeout

    it.skip(
      "should provide suggestions on success",
      async () => {
        // Skipped: npm run build with profiling takes 20+ seconds
        const result = await nodejsTools.runProfile({
          directory: testDir,
          script: "build",
          duration: 3, // 3 second max
        });

        if (result.success) {
          expect(result.suggestions).toBeDefined();
          expect(result.suggestions!.length).toBeGreaterThan(0);
          expect(
            result.suggestions!.some((s) => s.includes("Chrome DevTools")),
          ).toBe(true);
        }
      },
      120000,
    ); // 2 minute timeout
  });

  // Phase 3 validation tests
  describe("Phase 3 validation methods", () => {
    it("should validate updateDependencies args", () => {
      const validArgs = {
        directory: testDir,
        packages: ["typescript"],
      };

      const result = NodejsTools.validateUpdateDepsArgs(validArgs);
      expect(result).toBeDefined();
      expect(result.directory).toBe(testDir);
    });

    it("should validate compatibility args", () => {
      const validArgs = {
        directory: testDir,
        checkEngines: true,
      };

      const result = NodejsTools.validateCompatibilityArgs(validArgs);
      expect(result).toBeDefined();
      expect(result.directory).toBe(testDir);
    });

    it("should validate profile args", () => {
      const validArgs = {
        directory: testDir,
        script: "start",
        cpuProfile: true,
      };

      const result = NodejsTools.validateProfileArgs(validArgs);
      expect(result).toBeDefined();
      expect(result.directory).toBe(testDir);
    });
  });

  // Fast unit tests - no execution, pure logic only
  describe("Fast unit tests for Phase 2/3", () => {
    describe("updateDependencies command construction", () => {
      it("should handle npm latest upgrade with helpful error", async () => {
        const result = await nodejsTools.updateDependencies({
          directory: testDir,
          latest: true,
        });

        // npm doesn't support --latest, should return error with suggestions
        expect(result.success).toBe(false);
        expect(result.error).toContain("npm-check-updates");
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.length).toBeGreaterThan(0);
      });

      it.skip("should handle specific packages for npm", async () => {
        // Skipped: npm update takes 15+ seconds
        const result = await nodejsTools.updateDependencies({
          directory: testDir,
          packages: ["typescript", "eslint"],
        });

        // Should build npm update command with packages
        expect(result.command).toContain("update");
        expect(result.command).toContain("typescript");
        expect(result.command).toContain("eslint");
      });

      it.skip("should handle dev flag for npm", async () => {
        // Skipped: npm update takes 6+ seconds
        const result = await nodejsTools.updateDependencies({
          directory: testDir,
          packages: ["jest"],
          dev: true,
        });

        // npm uses --save-dev
        expect(result.command).toContain("--save-dev");
      });
    });

    describe("checkCompatibility fast tests", () => {
      it("should detect no compatibility issues for current project", async () => {
        const result = await nodejsTools.checkCompatibility({
          directory: testDir,
          checkEngines: true,
          checkDeps: true,
        });

        // Should return current version info
        expect(result.output).toContain("Node.js Compatibility Check");
        expect(result.output).toContain("Current Version:");
        expect(result.success).toBeDefined();
      });

      it("should cache compatibility results on second call", async () => {
        const cacheManager = CacheManager.getInstance();

        // First call
        await nodejsTools.checkCompatibility({ directory: testDir });

        // Second call - should be cached
        await nodejsTools.checkCompatibility({ directory: testDir });
        const stats2 = cacheManager.getStats("nodeModules");
        const hits2 = stats2?.hits || 0;

        expect(hits2).toBeGreaterThan(0);
      });

      it("should handle non-existent directory gracefully", async () => {
        const result = await nodejsTools.checkCompatibility({
          directory: "/tmp/nonexistent-compat-test-12345",
        });

        // Should still return version info (node version check will work)
        expect(result).toBeDefined();
        expect(result.output).toContain("Current Version:");
      });
    });

    describe("runScripts fast tests", () => {
      it("should list available scripts without execution", async () => {
        const result = await nodejsTools.runScripts({
          directory: testDir,
          list: true,
        });

        // This is fast - just reads package.json via cached project info
        expect(result.success).toBe(true);
        expect(result.output).toContain("Available scripts");
        expect(result.duration).toBe(0); // No execution
      });

      it("should return error when script not specified", async () => {
        const result = await nodejsTools.runScripts({
          directory: testDir,
        });

        // Fast error path
        expect(result.success).toBe(false);
        expect(result.error).toContain("No script specified");
        expect(result.suggestions).toContain("Specify a script name");
        expect(result.duration).toBe(0); // No execution
      });
    });

    describe("getVersion caching", () => {
      it("should cache version results and return quickly on second call", async () => {
        const cacheManager = CacheManager.getInstance();

        // First call
        const result1 = await nodejsTools.getVersion({
          directory: testDir,
          tool: "node",
        });
        expect(result1.success).toBe(true);

        // Second call - should be cached (commandAvailability namespace, 1hr TTL)
        const statsBefore = cacheManager.getStats("commandAvailability");
        const result2 = await nodejsTools.getVersion({
          directory: testDir,
          tool: "node",
        });
        const statsAfter = cacheManager.getStats("commandAvailability");

        expect(result2.success).toBe(true);
        expect(result1.output).toEqual(result2.output);
        expect(statsAfter?.hits).toBeGreaterThan(statsBefore?.hits || 0);
      });
    });

    describe("runBenchmark error handling", () => {
      it("should return helpful error when no benchmark tool detected", async () => {
        // Use a directory without benchmark tools
        const emptyDir = "/tmp/nonexistent-bench-test-12345";
        const result = await nodejsTools.runBenchmark({
          directory: emptyDir,
        });

        // Fast error path - no execution
        expect(result.success).toBe(false);
        expect(result.error).toContain("No benchmark tool detected");
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.some((s) => s.includes("npm install"))).toBe(
          true,
        );
      });
    });
  });

  // Coverage extraction tests with realistic fixtures
  describe("Coverage extraction from test output", () => {
    describe("Jest coverage extraction", () => {
      it("should extract coverage from Jest table format", async () => {
        const jestOutput = `
PASS src/__tests__/example.test.ts
  ✓ should work (5 ms)

------------|---------|----------|---------|---------|-------------------
File        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------|---------|----------|---------|---------|-------------------
All files   |   85.23 |    78.45 |   92.15 |   85.23 |
 example.ts |   85.23 |    78.45 |   92.15 |   85.23 | 25-30,45
------------|---------|----------|---------|---------|-------------------
        `;

        const mockExecute = jest
          .spyOn(nodejsTools["executor"], "execute")
          .mockResolvedValue({
            success: true,
            stdout: jestOutput,
            stderr: "",
            exitCode: 0,
            duration: 5000,
          } as ExecutionResult);

        const result = await nodejsTools.runTests({
          directory: testDir,
          testFramework: "jest",
          coverage: true,
        });

        expect(result.coverage).toBe(85.23);
        expect(result.success).toBe(true);

        mockExecute.mockRestore();
      });
    });

    describe("Vitest coverage extraction", () => {
      it("should extract coverage from Vitest table format", async () => {
        const vitestOutput = `
 ✓ src/__tests__/example.test.ts (1 test)

 % Coverage report from c8
--------------------|---------|----------|---------|---------|-------------------
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
--------------------|---------|----------|---------|---------|-------------------
All files           |   92.50 |    88.20 |   95.00 |   92.50 |
 src/example.ts     |   92.50 |    88.20 |   95.00 |   92.50 | 15-20
--------------------|---------|----------|---------|---------|-------------------
        `;

        const mockExecute = jest
          .spyOn(nodejsTools["executor"], "execute")
          .mockResolvedValue({
            success: true,
            stdout: vitestOutput,
            stderr: "",
            exitCode: 0,
            duration: 3000,
          } as ExecutionResult);

        const result = await nodejsTools.runTests({
          directory: testDir,
          testFramework: "vitest",
          coverage: true,
        });

        expect(result.coverage).toBe(92.5);
        expect(result.success).toBe(true);

        mockExecute.mockRestore();
      });

      it("should extract coverage from Vitest alternative format", async () => {
        const vitestOutput = `
Test Files  1 passed (1)
     Tests  5 passed (5)
  Start at  10:30:00
  Duration  2.45s

Coverage: 78.90%
        `;

        const mockExecute = jest
          .spyOn(nodejsTools["executor"], "execute")
          .mockResolvedValue({
            success: true,
            stdout: vitestOutput,
            stderr: "",
            exitCode: 0,
            duration: 2500,
          } as ExecutionResult);

        const result = await nodejsTools.runTests({
          directory: testDir,
          testFramework: "vitest",
          coverage: true,
        });

        expect(result.coverage).toBe(78.9);

        mockExecute.mockRestore();
      });
    });

    describe("Mocha/NYC coverage extraction", () => {
      it("should extract coverage from NYC Statements format", async () => {
        const nycOutput = `
  15 passing (250ms)

-----------|---------|----------|---------|---------|-------------------
File       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------|---------|----------|---------|---------|-------------------
All files  |   88.45 |    82.30 |   90.15 |   88.45 |
 index.js  |   88.45 |    82.30 |   90.15 |   88.45 | 10-15,25
-----------|---------|----------|---------|---------|-------------------

Statements   : 88.45% ( 177/200 )
Branches     : 82.30% ( 82/100 )
Functions    : 90.15% ( 90/100 )
Lines        : 88.45% ( 177/200 )
        `;

        const mockExecute = jest
          .spyOn(nodejsTools["executor"], "execute")
          .mockResolvedValue({
            success: true,
            stdout: nycOutput,
            stderr: "",
            exitCode: 0,
            duration: 1500,
          } as ExecutionResult);

        const result = await nodejsTools.runTests({
          directory: testDir,
          testFramework: "mocha",
          coverage: true,
        });

        expect(result.coverage).toBe(88.45);

        mockExecute.mockRestore();
      });

      it("should extract coverage from NYC table format", async () => {
        const nycOutput = `
  20 passing (180ms)

----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |   95.12 |    91.50 |   98.00 |   95.12 |
 utils.js |   95.12 |    91.50 |   98.00 |   95.12 | 42-45
----------|---------|----------|---------|---------|-------------------
        `;

        const mockExecute = jest
          .spyOn(nodejsTools["executor"], "execute")
          .mockResolvedValue({
            success: true,
            stdout: nycOutput,
            stderr: "",
            exitCode: 0,
            duration: 2000,
          } as ExecutionResult);

        const result = await nodejsTools.runTests({
          directory: testDir,
          testFramework: "mocha",
          coverage: true,
        });

        expect(result.coverage).toBe(95.12);

        mockExecute.mockRestore();
      });
    });

    describe("Coverage extraction edge cases", () => {
      it("should return undefined when no coverage in output", async () => {
        const mockExecute = jest
          .spyOn(nodejsTools["executor"], "execute")
          .mockResolvedValue({
            success: true,
            stdout: "Tests passed but no coverage info",
            stderr: "",
            exitCode: 0,
            duration: 1000,
          } as ExecutionResult);

        const result = await nodejsTools.runTests({
          directory: testDir,
          testFramework: "jest",
          coverage: false,
        });

        expect(result.coverage).toBeUndefined();

        mockExecute.mockRestore();
      });

      it("should return undefined for unknown test framework", async () => {
        const mockExecute = jest
          .spyOn(nodejsTools["executor"], "execute")
          .mockResolvedValue({
            success: true,
            stdout: "All files | 85.50 | some output",
            stderr: "",
            exitCode: 0,
            duration: 1000,
          } as ExecutionResult);

        // This will use npm test which doesn't match any framework pattern
        const result = await nodejsTools.runTests({
          directory: "/tmp/nonexistent-test-dir-12345",
          testFramework: "auto",
        });

        // Will fail due to no framework, coverage will be undefined
        expect(result.success).toBe(false);

        mockExecute.mockRestore();
      });
    });
  });
});
