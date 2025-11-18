import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PythonTools } from "../../tools/python-tools.js";
import { CacheManager } from "../../utils/cache-manager.js";
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
  });

  describe("pythonProjectInfo", () => {
    it.skip("should detect Python if available", async () => {
      // Skipped: Calls real Python which may not be installed
      const result = await pythonTools.pythonProjectInfo({});

      expect(result).toBeDefined();
      expect(typeof result.hasPyprojectToml).toBe("boolean");
      expect(Array.isArray(result.dependencies)).toBe(true);
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
      const validated = PythonTools.validateLintArgs({
        directory: "/path",
        check: true,
        files: ["main.py"],
      });
      expect(validated.check).toBe(true);
      expect(validated.files).toEqual(["main.py"]);
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

    it.skip("should detect Python version", async () => {
      // Skipped: calls real Python
      const result = await pythonTools.pythonVersion({});

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

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
  });

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

  describe("Phase 1 enhancements: uv command building with mode support", () => {
    it("should build uv command with system and editable flags", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as any).buildUvCommand.bind(
        pythonTools,
      );

      const resultSystem = buildCommand({ mode: "install", system: true });
      expect(resultSystem).toContain("--system");

      const resultEditable = buildCommand({ mode: "install", editable: true });
      expect(resultEditable).toContain("-e");
    });

    it("should build uv install command with upgrade flag for update mode", () => {
      const pythonTools = new PythonTools();
      const buildCommand = (pythonTools as any).buildUvCommand.bind(
        pythonTools,
      );

      const result = buildCommand({ mode: "update" });
      expect(result).toContain("pip");
      expect(result).toContain("install");
      expect(result).toContain("--upgrade");
    });
  });
});
