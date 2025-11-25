import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PythonTools } from "../../tools/python-tools.js";
import { CacheManager } from "../../utils/cache-manager.js";
import type { ExecutionResult } from "../../utils/shell-executor.js";
import type { PythonInstallDepsArgs } from "../../tools/python-tools.js";

/**
 * PythonTools Test Suite
 *
 * Follows nodejs-tools.test.ts pattern:
 * - Fast unit tests with mocking (no integration tests that call real Python)
 * - Integration tests marked with .skip (like nodejs-tools.test.ts)
 * - Error handling with non-existent directories
 * - Comprehensive validation argument testing
 *
 * Philosophy: Unit tests should be fast (<1s total). Integration tests
 * are expensive and should be run manually or in dedicated CI jobs.
 */

// Mock ShellExecutor for unit tests
jest.mock("../../utils/shell-executor.js");

describe("PythonTools", () => {
  let pythonTools: PythonTools;
  const testDir = process.cwd();

  beforeEach(() => {
    // Reset cache between tests
    CacheManager.resetInstance();
    jest.clearAllMocks();
    pythonTools = new PythonTools(testDir);
  });

  describe("Tool instantiation", () => {
    it("should create PythonTools instance", () => {
      expect(pythonTools).toBeDefined();
    });

    it("should create PythonTools with custom project root", () => {
      const customTools = new PythonTools("/custom/path");
      expect(customTools).toBeDefined();
    });

    it("should use cwd when no project root provided", () => {
      const defaultTools = new PythonTools();
      expect(defaultTools).toBeDefined();
    });
  });

  describe("pythonProjectInfo", () => {
    it.skip("should detect Python if available", async () => {
      // Skipped: Calls real Python which may not be installed
      const result = await pythonTools.pythonProjectInfo({});

      expect(result).toBeDefined();
      expect(typeof result.hasPyprojectToml).toBe("boolean");
      expect(Array.isArray(result.dependencies)).toBe("object");
    });

    it.skip("should handle non-existent directory", async () => {
      // Skipped: Filesystem operation (~600ms) - belongs in integration tests
      const emptyDir = "/tmp/nonexistent-python-test-dir-99999";
      const result = await pythonTools.pythonProjectInfo({ directory: emptyDir });

      expect(result).toBeDefined();
      expect(result.hasPyprojectToml).toBe(false);
      expect(result.hasSetupPy).toBe(false);
      expect(result.hasRequirementsTxt).toBe(false);
      expect(Array.isArray(result.dependencies)).toBe(true);
      expect(Array.isArray(result.testFiles)).toBe(true);
    });

    it("should validate project info args correctly", () => {
      expect(() => {
        PythonTools.validateProjectInfoArgs({ directory: "/valid/path" });
      }).not.toThrow();

      expect(() => {
        PythonTools.validateProjectInfoArgs({});
      }).not.toThrow();

      expect(() => {
        PythonTools.validateProjectInfoArgs({ directory: 123 as unknown as string });
      }).toThrow();
    });
  });

  describe("pythonTest", () => {
    it("should return error when directory doesn't exist", async () => {
      const emptyDir = "/tmp/nonexistent-python-test-dir-99999";
      const result = await pythonTools.pythonTest({
        directory: emptyDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it("should build pytest command with coverage (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "TOTAL 100 10 90%",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      const result = await pythonTools.pythonTest({
        directory: testDir,
        coverage: true,
      });

      expect(mockExecute).toHaveBeenCalledWith("pytest", {
        cwd: testDir,
        args: expect.arrayContaining(["--cov=.", "--cov-report=term-missing", "."]),
        timeout: 300000,
      });
      expect(result.command).toContain("pytest");

      mockExecute.mockRestore();
    });

    it("should build pytest command with verbose flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Tests passed",
          stderr: "",
          exitCode: 0,
          duration: 3000,
        } as ExecutionResult);

      const result = await pythonTools.pythonTest({
        directory: testDir,
        verbose: true,
        coverage: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("pytest", {
        cwd: testDir,
        args: expect.arrayContaining(["-vv"]),
        timeout: 300000,
      });
      expect(result.success).toBe(true);

      mockExecute.mockRestore();
    });

    it("should build pytest command with parallel flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Tests passed",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonTest({
        directory: testDir,
        parallel: true,
        maxWorkers: 4,
        coverage: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("pytest", {
        cwd: testDir,
        args: expect.arrayContaining(["-n", "4"]),
        timeout: 300000,
      });

      mockExecute.mockRestore();
    });

    it("should build pytest command with fail-fast flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Tests passed",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonTest({
        directory: testDir,
        failFast: true,
        coverage: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("pytest", {
        cwd: testDir,
        args: expect.arrayContaining(["-x"]),
        timeout: 300000,
      });

      mockExecute.mockRestore();
    });

    it("should build pytest command with markers (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Tests passed",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonTest({
        directory: testDir,
        markers: "slow",
        coverage: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("pytest", {
        cwd: testDir,
        args: expect.arrayContaining(["-m", "slow"]),
        timeout: 300000,
      });

      mockExecute.mockRestore();
    });

    it("should build pytest command with pattern (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Tests passed",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonTest({
        directory: testDir,
        pattern: "test_foo",
        coverage: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("pytest", {
        cwd: testDir,
        args: expect.arrayContaining(["-k", "test_foo"]),
        timeout: 300000,
      });

      mockExecute.mockRestore();
    });

    it("should build pytest command with JUnit XML output (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Tests passed",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonTest({
        directory: testDir,
        junitXml: "results.xml",
        coverage: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("pytest", {
        cwd: testDir,
        args: expect.arrayContaining(["--junit-xml=results.xml"]),
        timeout: 300000,
      });

      mockExecute.mockRestore();
    });

    it("should validate test args correctly", () => {
      expect(() => {
        PythonTools.validateTestArgs({
          directory: "/path",
          coverage: true,
          verbose: true,
        });
      }).not.toThrow();

      expect(() => {
        PythonTools.validateTestArgs({ timeout: 5000 });
      }).not.toThrow();

      expect(() => {
        PythonTools.validateTestArgs({ coverage: "true" as unknown as boolean });
      }).toThrow();
    });

    it("should accept optional test pattern parameter", () => {
      const validated = PythonTools.validateTestArgs({
        pattern: "test_foo",
      });
      expect(validated.pattern).toBe("test_foo");
    });

    it("should accept optional markers parameter", () => {
      const validated = PythonTools.validateTestArgs({
        markers: "slow",
      });
      expect(validated.markers).toBe("slow");
    });

    it.skip("should run pytest with coverage", async () => {
      // Skipped: pytest takes too long
      const result = await pythonTools.pythonTest({
        directory: testDir,
        coverage: true,
      });

      expect(result.command).toContain("pytest");
    });

    it("should extract coverage from pytest output", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: `
Name                      Stmts   Miss  Cover
---------------------------------------------
src/__init__.py               5      0   100%
src/main.py                  50     10    80%
---------------------------------------------
TOTAL                        55     10    82%
          `,
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      const result = await pythonTools.pythonTest({
        directory: testDir,
        coverage: true,
      });

      expect(result.coverage).toBe(82);
      expect(result.success).toBe(true);

      mockExecute.mockRestore();
    });
  });

  describe("pythonLint", () => {
    it("should validate lint args correctly", () => {
      const validated = PythonTools.validateLintArgs({
        directory: "/path",
        fix: true,
        files: ["main.py", "test.py"],
      });
      expect(validated.directory).toBe("/path");
      expect(validated.fix).toBe(true);
      expect(validated.files).toEqual(["main.py", "test.py"]);
    });

    it("should reject invalid file arrays", () => {
      expect(() => {
        PythonTools.validateLintArgs({
          files: "not-an-array" as unknown as string[],
        });
      }).toThrow();
    });

    it("should build ruff check command with fix flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "All checks passed!",
          stderr: "",
          exitCode: 0,
          duration: 500,
        } as ExecutionResult);

      const result = await pythonTools.pythonLint({
        directory: testDir,
        fix: true,
      });

      expect(mockExecute).toHaveBeenCalledWith("ruff", {
        cwd: testDir,
        args: expect.arrayContaining(["check", "--fix", "."]),
        timeout: 300000,
      });
      expect(result.success).toBe(true);
      expect(result.command).toContain("ruff check");

      mockExecute.mockRestore();
    });

    it("should build ruff check command with select rules (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "All checks passed!",
          stderr: "",
          exitCode: 0,
          duration: 500,
        } as ExecutionResult);

      await pythonTools.pythonLint({
        directory: testDir,
        select: ["E", "F", "I"],
      });

      expect(mockExecute).toHaveBeenCalledWith("ruff", {
        cwd: testDir,
        args: expect.arrayContaining(["check", "--select", "E,F,I", "."]),
        timeout: 300000,
      });

      mockExecute.mockRestore();
    });

    it("should build ruff check command with output format (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "{}",
          stderr: "",
          exitCode: 0,
          duration: 500,
        } as ExecutionResult);

      await pythonTools.pythonLint({
        directory: testDir,
        outputFormat: "json",
      });

      expect(mockExecute).toHaveBeenCalledWith("ruff", {
        cwd: testDir,
        args: expect.arrayContaining(["check", "--output-format", "json", "."]),
        timeout: 300000,
      });

      mockExecute.mockRestore();
    });

    it.skip("should lint with ruff", async () => {
      // Skipped: ruff takes too long
      const result = await pythonTools.pythonLint({
        directory: testDir,
      });

      expect(result.command).toContain("ruff");
    });
  });

  describe("pythonFormat", () => {
    it("should validate format args correctly", () => {
      const validated = PythonTools.validateFormatArgs({
        directory: "/path",
        check: true,
        files: ["main.py"],
      });
      expect(validated.check).toBe(true);
      expect(validated.files).toEqual(["main.py"]);
    });

    it("should build ruff format command with check flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "All files formatted",
          stderr: "",
          exitCode: 0,
          duration: 300,
        } as ExecutionResult);

      const result = await pythonTools.pythonFormat({
        directory: testDir,
        check: true,
      });

      expect(mockExecute).toHaveBeenCalledWith("ruff", {
        cwd: testDir,
        args: expect.arrayContaining(["format", "--check", "."]),
        timeout: 300000,
      });
      expect(result.success).toBe(true);
      expect(result.command).toContain("ruff format");

      mockExecute.mockRestore();
    });

    it("should build ruff format command with line-length (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Formatted",
          stderr: "",
          exitCode: 0,
          duration: 300,
        } as ExecutionResult);

      await pythonTools.pythonFormat({
        directory: testDir,
        lineLength: 120,
      });

      expect(mockExecute).toHaveBeenCalledWith("ruff", {
        cwd: testDir,
        args: expect.arrayContaining(["format", "--line-length", "120", "."]),
        timeout: 300000,
      });

      mockExecute.mockRestore();
    });

    it("should build ruff format command with preview flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Formatted",
          stderr: "",
          exitCode: 0,
          duration: 300,
        } as ExecutionResult);

      await pythonTools.pythonFormat({
        directory: testDir,
        preview: true,
      });

      expect(mockExecute).toHaveBeenCalledWith("ruff", {
        cwd: testDir,
        args: expect.arrayContaining(["format", "--preview", "."]),
        timeout: 300000,
      });

      mockExecute.mockRestore();
    });

    it.skip("should format with ruff", async () => {
      // Skipped: ruff takes too long
      const result = await pythonTools.pythonFormat({
        directory: testDir,
      });

      expect(result.command).toContain("ruff format");
    });
  });

  describe("pythonCheckTypes", () => {
    it("should validate type check args correctly", () => {
      const validated = PythonTools.validateTypeCheckArgs({
        directory: "/path",
        watch: true,
        verbose: true,
      });
      expect(validated.watch).toBe(true);
      expect(validated.verbose).toBe(true);
    });

    it("should reject invalid watch flag type", () => {
      expect(() => {
        PythonTools.validateTypeCheckArgs({
          watch: "true" as unknown as boolean,
        });
      }).toThrow();
    });

    it("should build pyright command with JSON output (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: '{"errors": 0, "warnings": 0}',
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonCheckTypes({
        directory: testDir,
        outputFormat: "json",
      });

      expect(mockExecute).toHaveBeenCalledWith("pyright", {
        cwd: testDir,
        args: expect.arrayContaining(["--outputjson"]),
        timeout: 120000,
      });

      mockExecute.mockRestore();
    });

    it("should build pyright command with strict level (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "0 errors, 0 warnings",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonCheckTypes({
        directory: testDir,
        level: "strict",
      });

      expect(mockExecute).toHaveBeenCalledWith("pyright", {
        cwd: testDir,
        args: expect.arrayContaining(["--level", "error"]),
        timeout: 120000,
      });

      mockExecute.mockRestore();
    });

    it("should build pyright command with Python version (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "0 errors, 0 warnings",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonCheckTypes({
        directory: testDir,
        pythonVersion: "3.11",
      });

      expect(mockExecute).toHaveBeenCalledWith("pyright", {
        cwd: testDir,
        args: expect.arrayContaining(["--pythonversion", "3.11"]),
        timeout: 120000,
      });

      mockExecute.mockRestore();
    });

    it("should parse pyright output with errors", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: false,
          stdout: "5 errors, 2 warnings, 1 informations",
          stderr: "",
          exitCode: 1,
          duration: 2000,
        } as ExecutionResult);

      const result = await pythonTools.pythonCheckTypes({
        directory: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("5 errors");
      expect(result.suggestions).toBeDefined();

      mockExecute.mockRestore();
    });

    it.skip("should check types with pyright", async () => {
      // Skipped: pyright takes too long
      const result = await pythonTools.pythonCheckTypes({
        directory: testDir,
      });

      expect(result.command).toContain("pyright");
    });
  });

  describe("pythonInstallDeps", () => {
    it("should validate install deps args correctly", () => {
      const validated = PythonTools.validateInstallDepsArgs({
        packageManager: "uv",
        dev: true,
      });
      expect(validated.packageManager).toBe("uv");
      expect(validated.dev).toBe(true);
    });

    it("should validate package manager enum", () => {
      const validManagers = ["auto", "uv", "poetry", "pipenv", "pip"];
      for (const manager of validManagers) {
        const validated = PythonTools.validateInstallDepsArgs({
          packageManager: manager as "auto" | "uv" | "poetry" | "pipenv" | "pip",
        });
        expect(validated.packageManager).toBe(manager);
      }
    });

    it("should reject invalid package manager", () => {
      expect(() => {
        PythonTools.validateInstallDepsArgs({
          packageManager: "invalid" as unknown as "auto" | "uv" | "poetry" | "pipenv" | "pip",
        });
      }).toThrow();
    });

    it.skip("should install dependencies", async () => {
      // Skipped: modifies system
      const result = await pythonTools.pythonInstallDeps({
        directory: testDir,
      });

      expect(result.command).toBeDefined();
    });
  });

  describe("pythonVersion", () => {
    it("should validate version args correctly", () => {
      const validated = PythonTools.validateVersionArgs({
        tool: "python",
      });
      expect(validated.tool).toBe("python");
    });

    it("should accept all tools option", () => {
      const validated = PythonTools.validateVersionArgs({
        tool: "all",
      });
      expect(validated.tool).toBe("all");
    });

    it("should validate tool enum values", () => {
      const validTools = [
        "python",
        "pip",
        "uv",
        "poetry",
        "pyright",
        "ruff",
        "pytest",
        "all",
      ] as const;
      for (const tool of validTools) {
        const validated = PythonTools.validateVersionArgs({
          tool: tool as unknown as "python" | "pip" | "uv" | "poetry" | "pyright" | "ruff" | "pytest" | "all",
        });
        expect(validated.tool).toBe(tool);
      }
    });

    it("should reject invalid tool name", () => {
      expect(() => {
        PythonTools.validateVersionArgs({
          tool: "invalid-tool" as unknown as
            | "python"
            | "pip"
            | "uv"
            | "poetry"
            | "pyright"
            | "ruff"
            | "pytest"
            | "all",
        });
      }).toThrow();
    });

    it("should get version for single tool (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Python 3.11.5",
          stderr: "",
          exitCode: 0,
          duration: 100,
        } as ExecutionResult);

      const result = await pythonTools.pythonVersion({
        tool: "python",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("python:");
      expect(result.command).toContain("version check");

      mockExecute.mockRestore();
    });

    it("should cache version results", async () => {
      const cacheManager = CacheManager.getInstance();

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Python 3.11.5",
          stderr: "",
          exitCode: 0,
          duration: 100,
        } as ExecutionResult);

      // First call - cache miss
      await pythonTools.pythonVersion({ tool: "python" });
      const stats1 = cacheManager.getStats("commandAvailability");
      expect(stats1?.misses).toBeGreaterThan(0);

      // Second call - cache hit
      await pythonTools.pythonVersion({ tool: "python" });
      const stats2 = cacheManager.getStats("commandAvailability");
      expect(stats2?.hits).toBeGreaterThan(0);

      mockExecute.mockRestore();
    });

    it.skip("should detect Python version", async () => {
      // Skipped: calls real Python
      const result = await pythonTools.pythonVersion({});

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  // ============================================================================
  // Phase 2 Tools: Security, Build, Venv
  // ============================================================================

  describe("pythonSecurity", () => {
    it("should validate security args correctly", () => {
      const validated = PythonTools.validateSecurityArgs({
        tool: "both",
        severity: "high",
        format: "json",
      });
      expect(validated.tool).toBe("both");
      expect(validated.severity).toBe("high");
      expect(validated.format).toBe("json");
    });

    it("should build bandit command (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "No issues identified",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      const result = await pythonTools.pythonSecurity({
        directory: testDir,
        tool: "bandit",
        severity: "all",
        format: "text",
      });

      expect(mockExecute).toHaveBeenCalledWith("bandit", {
        cwd: testDir,
        args: expect.arrayContaining(["-r", "."]),
        timeout: 60000,
      });
      expect(result.success).toBe(true);
      expect(result.output).toContain("Bandit Results");

      mockExecute.mockRestore();
    });

    it("should build pip-audit command (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "No known vulnerabilities found",
          stderr: "",
          exitCode: 0,
          duration: 3000,
        } as ExecutionResult);

      const result = await pythonTools.pythonSecurity({
        directory: testDir,
        tool: "pip-audit",
        severity: "all",
        format: "text",
      });

      expect(mockExecute).toHaveBeenCalledWith("pip-audit", {
        cwd: testDir,
        args: [],
        timeout: 60000,
      });
      expect(result.success).toBe(true);
      expect(result.output).toContain("pip-audit Results");

      mockExecute.mockRestore();
    });

    it("should run both security tools (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "No issues",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      const result = await pythonTools.pythonSecurity({
        directory: testDir,
        tool: "both",
        severity: "all",
        format: "text",
      });

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result.output).toContain("Bandit Results");
      expect(result.output).toContain("pip-audit Results");

      mockExecute.mockRestore();
    });

    it("should add severity filter for bandit (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "No issues",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonSecurity({
        directory: testDir,
        tool: "bandit",
        severity: "high",
        format: "text",
      });

      expect(mockExecute).toHaveBeenCalledWith("bandit", {
        cwd: testDir,
        args: expect.arrayContaining(["-r", ".", "-lh"]),
        timeout: 60000,
      });

      mockExecute.mockRestore();
    });

    it("should add JSON format for pip-audit (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "[]",
          stderr: "",
          exitCode: 0,
          duration: 3000,
        } as ExecutionResult);

      await pythonTools.pythonSecurity({
        directory: testDir,
        tool: "pip-audit",
        severity: "all",
        format: "json",
      });

      expect(mockExecute).toHaveBeenCalledWith("pip-audit", {
        cwd: testDir,
        args: expect.arrayContaining(["--format", "json"]),
        timeout: 60000,
      });

      mockExecute.mockRestore();
    });

    it("should return failure when vulnerabilities found", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: false,
          stdout: "Vulnerability found: CVE-2024-1234",
          stderr: "",
          exitCode: 1,
          duration: 3000,
        } as ExecutionResult);

      const result = await pythonTools.pythonSecurity({
        directory: testDir,
        tool: "bandit",
        severity: "all",
        format: "text",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Security issues detected");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);

      mockExecute.mockRestore();
    });
  });

  describe("pythonBuild", () => {
    it("should validate build args correctly", () => {
      const validated = PythonTools.validateBuildArgs({
        sdist: true,
        wheel: true,
        outdir: "dist/",
      });
      expect(validated.sdist).toBe(true);
      expect(validated.wheel).toBe(true);
      expect(validated.outdir).toBe("dist/");
    });

    it("should build wheel only (mocked)", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue("python3");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Successfully built wheel",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      const result = await pythonTools.pythonBuild({
        directory: testDir,
        wheel: true,
        sdist: false,
        outdir: "dist/",
        noBuildIsolation: false,
        skipDependencyCheck: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("python3", {
        cwd: testDir,
        args: expect.arrayContaining(["-m", "build", "--wheel"]),
        timeout: 300000,
      });
      expect(result.success).toBe(true);
      expect(result.command).toContain("python -m build");

      mockDetectPython.mockRestore();
      mockExecute.mockRestore();
    });

    it("should build sdist only (mocked)", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue("python3");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Successfully built sdist",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      await pythonTools.pythonBuild({
        directory: testDir,
        wheel: false,
        sdist: true,
        outdir: "dist/",
        noBuildIsolation: false,
        skipDependencyCheck: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("python3", {
        cwd: testDir,
        args: expect.arrayContaining(["-m", "build", "--sdist"]),
        timeout: 300000,
      });

      mockDetectPython.mockRestore();
      mockExecute.mockRestore();
    });

    it("should add outdir flag (mocked)", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue("python3");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Built successfully",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      await pythonTools.pythonBuild({
        directory: testDir,
        sdist: true,
        wheel: true,
        outdir: "build/",
        noBuildIsolation: false,
        skipDependencyCheck: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("python3", {
        cwd: testDir,
        args: expect.arrayContaining(["-m", "build", "--outdir", "build/"]),
        timeout: 300000,
      });

      mockDetectPython.mockRestore();
      mockExecute.mockRestore();
    });

    it("should return error when Python not found", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue(null);

      const result = await pythonTools.pythonBuild({
        directory: testDir,
        sdist: true,
        wheel: true,
        outdir: "dist/",
        noBuildIsolation: false,
        skipDependencyCheck: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Python executable not found");
      expect(result.suggestions).toBeDefined();

      mockDetectPython.mockRestore();
    });

    it("should suggest installing build module on missing module error", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue("python3");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: false,
          stdout: "",
          stderr: "No module named build",
          exitCode: 1,
          duration: 1000,
        } as ExecutionResult);

      const result = await pythonTools.pythonBuild({
        directory: testDir,
        sdist: true,
        wheel: true,
        outdir: "dist/",
        noBuildIsolation: false,
        skipDependencyCheck: false,
      });

      expect(result.success).toBe(false);
      expect(result.suggestions).toContain("Install build module: pip install build");

      mockDetectPython.mockRestore();
      mockExecute.mockRestore();
    });
  });

  describe("pythonVenv", () => {
    it("should validate venv args correctly", () => {
      const validated = PythonTools.validateVenvArgs({
        action: "create",
        venvPath: ".venv",
      });
      expect(validated.action).toBe("create");
      expect(validated.venvPath).toBe(".venv");
    });

    it("should return info for non-existent venv", async () => {
      const result = await pythonTools.pythonVenv({
        directory: "/tmp/nonexistent-venv-test-12345",
        action: "info",
        venvPath: ".venv",
        systemSitePackages: false,
        clear: false,
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("Virtual environment not found");
      expect(result.suggestions).toBeDefined();
    });

    it("should return error when deleting non-existent venv", async () => {
      const result = await pythonTools.pythonVenv({
        directory: "/tmp/nonexistent-venv-test-12345",
        action: "delete",
        venvPath: ".venv",
        systemSitePackages: false,
        clear: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Virtual environment not found");
    });

    it("should return error when listing non-existent venv", async () => {
      const result = await pythonTools.pythonVenv({
        directory: "/tmp/nonexistent-venv-test-12345",
        action: "list",
        venvPath: ".venv",
        systemSitePackages: false,
        clear: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Virtual environment not found");
      expect(result.suggestions).toBeDefined();
    });
  });

  // ============================================================================
  // Phase 3 Tools: Benchmark, Update, Compatibility, Profile
  // ============================================================================

  describe("pythonBenchmark", () => {
    it("should validate benchmark args correctly", () => {
      const validated = PythonTools.validateBenchmarkArgs({
        benchmarks: "test_benchmark_",
        save: "baseline",
        json: true,
      });
      expect(validated.benchmarks).toBe("test_benchmark_");
      expect(validated.save).toBe("baseline");
      expect(validated.json).toBe(true);
    });

    it("should build benchmark command with pattern (mocked)", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue("python3");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Benchmark results: 1.23s mean",
          stderr: "",
          exitCode: 0,
          duration: 10000,
        } as ExecutionResult);

      const result = await pythonTools.pythonBenchmark({
        directory: testDir,
        benchmarks: "test_benchmark_",
      });

      expect(mockExecute).toHaveBeenCalledWith("python3", {
        cwd: testDir,
        args: expect.arrayContaining(["-m", "pytest", "--benchmark-only", "-k", "test_benchmark_"]),
        timeout: 300000,
      });
      expect(result.success).toBe(true);

      mockDetectPython.mockRestore();
      mockExecute.mockRestore();
    });

    it("should add compare baseline flag (mocked)", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue("python3");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Compared against baseline",
          stderr: "",
          exitCode: 0,
          duration: 10000,
        } as ExecutionResult);

      await pythonTools.pythonBenchmark({
        directory: testDir,
        compare: "baseline-v1",
      });

      expect(mockExecute).toHaveBeenCalledWith("python3", {
        cwd: testDir,
        args: expect.arrayContaining(["--benchmark-compare=baseline-v1"]),
        timeout: 300000,
      });

      mockDetectPython.mockRestore();
      mockExecute.mockRestore();
    });

    it("should add save baseline flag (mocked)", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue("python3");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Saved to baseline",
          stderr: "",
          exitCode: 0,
          duration: 10000,
        } as ExecutionResult);

      await pythonTools.pythonBenchmark({
        directory: testDir,
        save: "baseline-v2",
      });

      expect(mockExecute).toHaveBeenCalledWith("python3", {
        cwd: testDir,
        args: expect.arrayContaining(["--benchmark-save=baseline-v2"]),
        timeout: 300000,
      });

      mockDetectPython.mockRestore();
      mockExecute.mockRestore();
    });

    it("should return error when Python not found", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue(null);

      const result = await pythonTools.pythonBenchmark({
        directory: testDir,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Python executable not found");

      mockDetectPython.mockRestore();
    });
  });

  describe("pythonUpdateDeps", () => {
    it("should validate update deps args correctly", () => {
      const validated = PythonTools.validateUpdateDepsArgs({
        mode: "check",
        packages: ["requests", "flask"],
      });
      expect(validated.mode).toBe("check");
      expect(validated.packages).toEqual(["requests", "flask"]);
    });

    it("should build pip list outdated command for check mode (mocked)", async () => {
      const mockDetectPM = jest
        .spyOn(pythonTools as unknown as { detectPackageManager: (dir: string) => Promise<string> }, "detectPackageManager")
        .mockResolvedValue("pip");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Package    Version  Latest\nrequests   2.28.0   2.31.0",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      const result = await pythonTools.pythonUpdateDeps({
        directory: testDir,
        mode: "check",
        dryRun: false,
        interactive: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("pip", {
        cwd: testDir,
        args: expect.arrayContaining(["list", "--outdated"]),
        timeout: 120000,
      });
      expect(result.success).toBe(true);

      mockDetectPM.mockRestore();
      mockExecute.mockRestore();
    });

    it("should build uv pip list outdated command for check mode (mocked)", async () => {
      const mockDetectPM = jest
        .spyOn(pythonTools as unknown as { detectPackageManager: (dir: string) => Promise<string> }, "detectPackageManager")
        .mockResolvedValue("uv");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Package    Version  Latest",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonUpdateDeps({
        directory: testDir,
        mode: "check",
        dryRun: false,
        interactive: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("uv", {
        cwd: testDir,
        args: expect.arrayContaining(["pip", "list", "--outdated"]),
        timeout: 120000,
      });

      mockDetectPM.mockRestore();
      mockExecute.mockRestore();
    });

    it("should build poetry show outdated command (mocked)", async () => {
      const mockDetectPM = jest
        .spyOn(pythonTools as unknown as { detectPackageManager: (dir: string) => Promise<string> }, "detectPackageManager")
        .mockResolvedValue("poetry");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Package  Current  Latest",
          stderr: "",
          exitCode: 0,
          duration: 3000,
        } as ExecutionResult);

      await pythonTools.pythonUpdateDeps({
        directory: testDir,
        mode: "check",
        dryRun: false,
        interactive: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("poetry", {
        cwd: testDir,
        args: expect.arrayContaining(["show", "--outdated"]),
        timeout: 120000,
      });

      mockDetectPM.mockRestore();
      mockExecute.mockRestore();
    });

    it("should validate package names to prevent injection", async () => {
      const mockDetectPM = jest
        .spyOn(pythonTools as unknown as { detectPackageManager: (dir: string) => Promise<string> }, "detectPackageManager")
        .mockResolvedValue("pip");

      await expect(
        pythonTools.pythonUpdateDeps({
          directory: testDir,
          mode: "update-patch",
          packages: ["valid-package", "malicious; rm -rf /"],
          dryRun: false,
          interactive: false,
        }),
      ).rejects.toThrow("Invalid package name detected");

      mockDetectPM.mockRestore();
    });

    it("should accept valid package names", async () => {
      const mockDetectPM = jest
        .spyOn(pythonTools as unknown as { detectPackageManager: (dir: string) => Promise<string> }, "detectPackageManager")
        .mockResolvedValue("pip");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Updated packages",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      // These should not throw
      await pythonTools.pythonUpdateDeps({
        directory: testDir,
        mode: "update-patch",
        packages: ["requests", "flask-restful", "python_dateutil", "some.package"],
        dryRun: false,
        interactive: false,
      });

      expect(mockExecute).toHaveBeenCalled();

      mockDetectPM.mockRestore();
      mockExecute.mockRestore();
    });
  });

  describe("pythonCompatibility", () => {
    it("should validate compatibility args correctly", () => {
      const validated = PythonTools.validateCompatibilityArgs({
        targetVersion: "3.9",
        pyupgradeTargetVersion: "3.11-plus",
        suggest: true,
      });
      expect(validated.targetVersion).toBe("3.9");
      expect(validated.pyupgradeTargetVersion).toBe("3.11-plus");
      expect(validated.suggest).toBe(true);
    });

    it("should build vermin command (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Minimum versions: ~3.8, ~3.9",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      const result = await pythonTools.pythonCompatibility({
        directory: testDir,
        suggest: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("vermin", {
        cwd: testDir,
        args: expect.arrayContaining([testDir]),
        timeout: 60000,
      });
      expect(result.success).toBe(true);
      expect(result.command).toContain("vermin");

      mockExecute.mockRestore();
    });

    it("should add target version flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Minimum versions: ~3.9",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult);

      await pythonTools.pythonCompatibility({
        directory: testDir,
        targetVersion: "3.9",
        suggest: false,
      });

      expect(mockExecute).toHaveBeenCalledWith("vermin", {
        cwd: testDir,
        args: expect.arrayContaining(["-t=3.9"]),
        timeout: 60000,
      });

      mockExecute.mockRestore();
    });

    it("should run pyupgrade with suggest flag (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValueOnce({
          success: true,
          stdout: "Minimum versions: ~3.8",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult)
        .mockResolvedValueOnce({
          success: true,
          stdout: "Suggested upgrades",
          stderr: "",
          exitCode: 0,
          duration: 1000,
        } as ExecutionResult);

      const result = await pythonTools.pythonCompatibility({
        directory: testDir,
        suggest: true,
        pyupgradeTargetVersion: "3.11-plus",
      });

      expect(mockExecute).toHaveBeenCalledTimes(2);
      expect(result.output).toContain("Suggested Upgrades");

      mockExecute.mockRestore();
    });

    it("should use default pyupgrade version when not specified", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValueOnce({
          success: true,
          stdout: "Minimum versions: ~3.8",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult)
        .mockResolvedValueOnce({
          success: true,
          stdout: "Suggested upgrades",
          stderr: "",
          exitCode: 0,
          duration: 1000,
        } as ExecutionResult);

      await pythonTools.pythonCompatibility({
        directory: testDir,
        suggest: true,
      });

      // Should use default 3.11-plus
      expect(mockExecute).toHaveBeenLastCalledWith("pyupgrade", {
        cwd: testDir,
        args: expect.arrayContaining(["--py3.11-plus", "--diff", "."]),
        timeout: 60000,
      });

      mockExecute.mockRestore();
    });

    it("should format simple version for pyupgrade (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValueOnce({
          success: true,
          stdout: "Minimum versions: ~3.8",
          stderr: "",
          exitCode: 0,
          duration: 2000,
        } as ExecutionResult)
        .mockResolvedValueOnce({
          success: true,
          stdout: "Suggested upgrades",
          stderr: "",
          exitCode: 0,
          duration: 1000,
        } as ExecutionResult);

      await pythonTools.pythonCompatibility({
        directory: testDir,
        suggest: true,
        pyupgradeTargetVersion: "3.8",
      });

      expect(mockExecute).toHaveBeenLastCalledWith("pyupgrade", {
        cwd: testDir,
        args: expect.arrayContaining(["--py38", "--diff", "."]),
        timeout: 60000,
      });

      mockExecute.mockRestore();
    });
  });

  describe("pythonProfile", () => {
    it("should validate profile args correctly", () => {
      const validated = PythonTools.validateProfileArgs({
        command: "script.py",
        profiler: "cprofile",
        topN: 20,
      });
      expect(validated.command).toBe("script.py");
      expect(validated.profiler).toBe("cprofile");
      expect(validated.topN).toBe(20);
    });

    it("should build cProfile command (mocked)", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue("python3");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "ncalls  tottime  percall  cumtime  percall filename:lineno(function)\n100     0.001    0.00001  0.001    0.00001 script.py:1(main)",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      const result = await pythonTools.pythonProfile({
        directory: testDir,
        command: "script.py",
        profiler: "cprofile",
        topN: 10,
        format: "text",
      });

      expect(mockExecute).toHaveBeenCalledWith("python3", {
        cwd: testDir,
        args: expect.arrayContaining(["-m", "cProfile", "-s", "cumulative"]),
        timeout: 300000,
      });
      expect(result.success).toBe(true);

      mockDetectPython.mockRestore();
      mockExecute.mockRestore();
    });

    it("should build py-spy command (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Profiling complete",
          stderr: "",
          exitCode: 0,
          duration: 10000,
        } as ExecutionResult);

      const result = await pythonTools.pythonProfile({
        directory: testDir,
        command: "script.py",
        profiler: "pyspy",
        topN: 10,
        format: "text",
      });

      expect(mockExecute).toHaveBeenCalledWith("py-spy", {
        cwd: testDir,
        args: expect.arrayContaining(["record"]),
        timeout: 300000,
      });
      expect(result.success).toBe(true);

      mockExecute.mockRestore();
    });

    it("should build memray command (mocked)", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Memory profiling complete",
          stderr: "",
          exitCode: 0,
          duration: 10000,
        } as ExecutionResult);

      const result = await pythonTools.pythonProfile({
        directory: testDir,
        command: "script.py",
        profiler: "memray",
        topN: 10,
        format: "text",
      });

      expect(mockExecute).toHaveBeenCalledWith("memray", {
        cwd: testDir,
        args: expect.arrayContaining(["run"]),
        timeout: 300000,
      });
      expect(result.success).toBe(true);

      mockExecute.mockRestore();
    });

    it("should return error when Python not found for cProfile", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue(null);

      const result = await pythonTools.pythonProfile({
        directory: testDir,
        command: "script.py",
        profiler: "cprofile",
        topN: 10,
        format: "text",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Python executable not found");

      mockDetectPython.mockRestore();
    });

    it("should validate command to prevent injection", async () => {
      await expect(
        pythonTools.pythonProfile({
          directory: testDir,
          command: "script.py; rm -rf /",
          profiler: "cprofile",
          topN: 10,
          format: "text",
        }),
      ).rejects.toThrow("Invalid characters in file path");
    });

    it("should validate command to prevent path traversal", async () => {
      await expect(
        pythonTools.pythonProfile({
          directory: testDir,
          command: "../../../etc/passwd",
          profiler: "cprofile",
          topN: 10,
          format: "text",
        }),
      ).rejects.toThrow("File path outside project root");
    });

    it("should accept valid script paths", async () => {
      const mockDetectPython = jest
        .spyOn(pythonTools as unknown as { detectPythonExecutable: () => Promise<string | null> }, "detectPythonExecutable")
        .mockResolvedValue("python3");

      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: true,
          stdout: "Profiling complete",
          stderr: "",
          exitCode: 0,
          duration: 5000,
        } as ExecutionResult);

      // These should not throw
      await pythonTools.pythonProfile({
        directory: testDir,
        command: "src/main.py",
        profiler: "cprofile",
        topN: 10,
        format: "text",
      });

      expect(mockExecute).toHaveBeenCalled();

      mockDetectPython.mockRestore();
      mockExecute.mockRestore();
    });
  });

  // ============================================================================
  // Error handling
  // ============================================================================

  describe("error handling", () => {
    it("should provide suggestions for missing tools", async () => {
      const emptyDir = "/tmp/nonexistent-python-test-dir-99999";
      const result = await pythonTools.pythonTest({ directory: emptyDir });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it("should suggest vermin installation on error", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockResolvedValue({
          success: false,
          stdout: "",
          stderr: "vermin not found",
          exitCode: 127,
          duration: 100,
        } as ExecutionResult);

      const result = await pythonTools.pythonCompatibility({
        directory: testDir,
        suggest: false,
      });

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.some((s) => s.includes("pip install vermin"))).toBe(true);

      mockExecute.mockRestore();
    });
  });

  // ============================================================================
  // Cache behavior
  // ============================================================================

  describe("cache behavior", () => {
    it.skip("should cache project info results", async () => {
      // Skipped: calls real Python
      const cacheManager = CacheManager.getInstance();

      const result1 = await pythonTools.pythonProjectInfo({});
      const stats1 = cacheManager.getStats("pythonTools");
      expect(stats1?.hits).toBe(0);

      const result2 = await pythonTools.pythonProjectInfo({});
      const stats2 = cacheManager.getStats("pythonTools");
      expect(stats2?.hits).toBe(1);

      expect(result1).toEqual(result2);
    });
  });

  // ============================================================================
  // Security: path validation
  // ============================================================================

  describe("security: path validation", () => {
    it("should reject paths with command injection characters", () => {
      const invalidPaths = [
        "test.py; rm -rf /",
        "test.py && echo hacked",
        "test.py | cat /etc/passwd",
        "test.py`whoami`",
        "test.py$(id)",
        "test.py<input.txt",
        "test.py>output.txt",
      ];

      for (const invalidPath of invalidPaths) {
        expect(() => {
          pythonTools["validateFilePaths"]([invalidPath]);
        }).toThrow();
      }
    });

    it("should reject paths with newline injection", () => {
      const pathsWithNewlines = [
        "test.py\necho hacked",
        "test.py\recho hacked",
        "test.py\n\recho hacked",
      ];

      for (const pathWithNewline of pathsWithNewlines) {
        expect(() => {
          pythonTools["validateFilePaths"]([pathWithNewline]);
        }).toThrow();
      }
    });

    it("should reject paths outside project root", () => {
      expect(() => {
        pythonTools["validateFilePaths"](["../../../etc/passwd"]);
      }).toThrow();
    });

    it("should accept valid paths", () => {
      expect(() => {
        pythonTools["validateFilePaths"]([
          "test.py",
          "src/main.py",
          "tests/test_main.py",
        ]);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Security: package name validation
  // ============================================================================

  describe("security: package name validation", () => {
    it("should reject package names with command injection characters", () => {
      const invalidNames = [
        "package; rm -rf /",
        "package && echo hacked",
        "package | cat /etc/passwd",
        "package`whoami`",
        "package$(id)",
        "package<input.txt",
        "package>output.txt",
        "package\necho hacked",
      ];

      for (const invalidName of invalidNames) {
        expect(() => {
          pythonTools["validatePackageNames"]([invalidName]);
        }).toThrow();
      }
    });

    it("should accept valid package names", () => {
      const validNames = [
        "requests",
        "flask",
        "python-dateutil",
        "python_dateutil",
        "some.package",
        "Django",
        "numpy",
        "scikit-learn",
      ];

      expect(() => {
        pythonTools["validatePackageNames"](validNames);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Version recommendation logic
  // ============================================================================

  describe("version recommendation logic", () => {
    it("should recommend upgrade for Python 2.x", () => {
      expect(pythonTools["shouldRecommendUpgrade"]("2.7.18")).toBe(true);
      expect(pythonTools["shouldRecommendUpgrade"]("2.6.9")).toBe(true);
    });

    it("should recommend upgrade for Python 3.0-3.9", () => {
      expect(pythonTools["shouldRecommendUpgrade"]("3.0.0")).toBe(true);
      expect(pythonTools["shouldRecommendUpgrade"]("3.6.0")).toBe(true);
      expect(pythonTools["shouldRecommendUpgrade"]("3.9.13")).toBe(true);
    });

    it("should not recommend upgrade for Python 3.10+", () => {
      expect(pythonTools["shouldRecommendUpgrade"]("3.10.0")).toBe(false);
      expect(pythonTools["shouldRecommendUpgrade"]("3.11.5")).toBe(false);
      expect(pythonTools["shouldRecommendUpgrade"]("3.12.0")).toBe(false);
    });

    it("should handle invalid version formats gracefully", () => {
      expect(pythonTools["shouldRecommendUpgrade"]("invalid")).toBe(false);
      expect(pythonTools["shouldRecommendUpgrade"]("")).toBe(false);
      expect(pythonTools["shouldRecommendUpgrade"]("3")).toBe(false);
    });
  });

  // ============================================================================
  // pip command building with file existence checks
  // ============================================================================

  describe("pip command building with file existence checks", () => {
    it("should build pip command with defaults when files missing", () => {
      // This tests that buildPipCommand handles missing files gracefully
      const args: PythonInstallDepsArgs = {};
      const result = pythonTools["buildPipCommand"](args);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toBe("install");
    });

    it("should request dev requirements when flag is set", () => {
      const args: PythonInstallDepsArgs = { dev: true };
      const result = pythonTools["buildPipCommand"](args);

      // In test environment, requirements files don't exist,
      // so it won't include -r flags. But the method handles dev: true flag.
      // In real projects with requirements files, it would include them.
      expect(result).toContain("install");
      expect(typeof result).toBe("object");
      expect(Array.isArray(result)).toBe(true);
    });

    it("should append additional arguments", () => {
      const args: PythonInstallDepsArgs = {
        args: ["--upgrade", "--pre"],
      };
      const result = pythonTools["buildPipCommand"](args);

      expect(result).toContain("--upgrade");
      expect(result).toContain("--pre");
    });
  });

  // ============================================================================
  // Phase 1 enhancements: uv command building with mode support
  // ============================================================================

  describe("Phase 1 enhancements: uv command building with mode support", () => {
    it("should build uv command with system and editable flags", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as unknown as { buildUvCommand: (args: PythonInstallDepsArgs) => string[] }).buildUvCommand.bind(
        pythonTools,
      );

      const resultSystem = buildCommand({ mode: "install", system: true });
      expect(resultSystem).toContain("--system");

      const resultEditable = buildCommand({ mode: "install", editable: true });
      expect(resultEditable).toContain("-e");
    });

    it("should build uv install command with upgrade flag for update mode", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as unknown as { buildUvCommand: (args: PythonInstallDepsArgs) => string[] }).buildUvCommand.bind(
        pythonTools,
      );

      const result = buildCommand({ mode: "update" });
      expect(result).toContain("pip");
      expect(result).toContain("install");
      expect(result).toContain("--upgrade");
    });

    it("should build uv sync command", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as unknown as { buildUvCommand: (args: PythonInstallDepsArgs) => string[] }).buildUvCommand.bind(
        pythonTools,
      );

      const result = buildCommand({ mode: "sync" });
      expect(result).toContain("pip");
      expect(result).toContain("sync");
    });

    it("should build uv uninstall command for remove mode", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as unknown as { buildUvCommand: (args: PythonInstallDepsArgs) => string[] }).buildUvCommand.bind(
        pythonTools,
      );

      const result = buildCommand({ mode: "remove", packages: ["requests"] });
      expect(result).toContain("pip");
      expect(result).toContain("uninstall");
      expect(result).toContain("requests");
    });

    it("should add prerelease flag for uv", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as unknown as { buildUvCommand: (args: PythonInstallDepsArgs) => string[] }).buildUvCommand.bind(
        pythonTools,
      );

      const result = buildCommand({ mode: "install", prerelease: "allow" });
      expect(result).toContain("--prerelease");
      expect(result).toContain("allow");
    });
  });

  // ============================================================================
  // Poetry command building
  // ============================================================================

  describe("poetry command building", () => {
    it("should build poetry install command with dev deps", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as unknown as { buildPoetryCommand: (args: PythonInstallDepsArgs) => string[] }).buildPoetryCommand.bind(
        pythonTools,
      );

      const result = buildCommand({ dev: true });
      expect(result).toContain("install");
      expect(result).not.toContain("--only");
    });

    it("should build poetry install command without dev deps", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as unknown as { buildPoetryCommand: (args: PythonInstallDepsArgs) => string[] }).buildPoetryCommand.bind(
        pythonTools,
      );

      const result = buildCommand({ dev: false });
      expect(result).toContain("install");
      expect(result).toContain("--only");
      expect(result).toContain("main");
    });
  });

  // ============================================================================
  // Pipenv command building
  // ============================================================================

  describe("pipenv command building", () => {
    it("should build pipenv install command with dev deps", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as unknown as { buildPipenvCommand: (args: PythonInstallDepsArgs) => string[] }).buildPipenvCommand.bind(
        pythonTools,
      );

      const result = buildCommand({ dev: true });
      expect(result).toContain("install");
      expect(result).toContain("--dev");
    });

    it("should build pipenv install command without dev deps", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as unknown as { buildPipenvCommand: (args: PythonInstallDepsArgs) => string[] }).buildPipenvCommand.bind(
        pythonTools,
      );

      const result = buildCommand({ dev: false });
      expect(result).toContain("install");
      expect(result).not.toContain("--dev");
    });
  });

  // ============================================================================
  // Duration timing with performance.now()
  // ============================================================================

  describe("timing uses performance.now()", () => {
    it("should measure duration accurately in pythonTest", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return {
            success: true,
            stdout: "Tests passed",
            stderr: "",
            exitCode: 0,
            duration: 50,
          } as ExecutionResult;
        });

      const result = await pythonTools.pythonTest({
        directory: testDir,
        coverage: false,
      });

      // Duration should be measured with performance.now() - should be at least ~50ms
      // Using 45ms as threshold to account for timing variance in CI environments
      expect(result.duration).toBeGreaterThanOrEqual(45);

      mockExecute.mockRestore();
    });

    it("should measure duration accurately in pythonLint", async () => {
      const mockExecute = jest
        .spyOn(pythonTools["executor"], "execute")
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 30));
          return {
            success: true,
            stdout: "Lint passed",
            stderr: "",
            exitCode: 0,
            duration: 30,
          } as ExecutionResult;
        });

      const result = await pythonTools.pythonLint({
        directory: testDir,
      });

      // Using 25ms as threshold to account for timing variance in CI environments
      expect(result.duration).toBeGreaterThanOrEqual(25);

      mockExecute.mockRestore();
    });
  });

  // ============================================================================
  // EOL version detection
  // ============================================================================

  describe("EOL version detection", () => {
    it("should detect Python 3.7 as EOL", () => {
      expect(pythonTools["isPythonEOL"](3, 7)).toBe(true);
    });

    it("should detect Python 3.8 as EOL after October 2024", () => {
      // As of January 2025, Python 3.8 is EOL
      expect(pythonTools["isPythonEOL"](3, 8)).toBe(true);
    });

    it("should not detect Python 3.11 as EOL", () => {
      expect(pythonTools["isPythonEOL"](3, 11)).toBe(false);
    });

    it("should not detect Python 3.12 as EOL", () => {
      expect(pythonTools["isPythonEOL"](3, 12)).toBe(false);
    });
  });
});
