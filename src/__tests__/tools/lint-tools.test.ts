import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { LintTools } from "../../tools/lint-tools.js";
import { ShellExecutor } from "../../utils/shell-executor.js";
import { ProjectDetector } from "../../utils/project-detector.js";
import { FileScanner } from "../../utils/file-scanner.js";

// Mock type for jest.fn()
type MockFn = ReturnType<typeof jest.fn>;

describe("LintTools", () => {
  let tools: LintTools;
  let mockExecute: MockFn;
  let mockDetectProject: MockFn;
  let mockScan: MockFn;

  beforeEach(() => {
    // Create mock executor
    const mockExecutor = {
      execute: jest.fn(),
      isCommandAvailable: jest.fn(() => Promise.resolve(true)),
    } as unknown as ShellExecutor;

    // Create mock detector
    const mockDetector = {
      detectProject: jest.fn(),
    } as unknown as ProjectDetector;

    // Create mock scanner
    const mockScanner = {
      scan: jest.fn(),
    } as unknown as FileScanner;

    tools = new LintTools();

    // Replace executor, detector, and scanner with mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tools as any).executor = mockExecutor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tools as any).detector = mockDetector;

    // Mock FileScanner globally
    jest.spyOn(FileScanner.prototype, "scan").mockImplementation(mockScanner.scan);

    mockExecute = mockExecutor.execute as MockFn;
    mockDetectProject = mockDetector.detectProject as MockFn;
    mockScan = mockScanner.scan as MockFn;
  });

  describe("Schema Validation", () => {
    describe("validateArgs", () => {
      it("should validate valid arguments", () => {
        const args = {
          directory: "/test",
          files: ["**/*.md"],
          fix: true,
          args: ["--verbose"],
          severity: "error" as const,
        };
        const validated = LintTools.validateArgs(args);
        expect(validated).toEqual(args);
      });

      it("should accept optional arguments", () => {
        const args = {};
        const validated = LintTools.validateArgs(args);
        expect(validated).toEqual({});
      });

      it("should reject invalid severity", () => {
        const args = { severity: "invalid" };
        expect(() => LintTools.validateArgs(args)).toThrow();
      });

      it("should accept valid severity levels", () => {
        const levels = ["error", "warn", "info"] as const;
        for (const severity of levels) {
          const args = { severity };
          const validated = LintTools.validateArgs(args);
          expect(validated.severity).toBe(severity);
        }
      });
    });
  });

  describe("yamllint", () => {
    it("should execute yamllint command (not js-yaml-cli)", async () => {
      // Regression test for Issue #208
      mockScan.mockResolvedValue(["/test/file.yml", "/test/docker-compose.yml"]);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "All files passed",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "yamllint",
      });

      await tools.yamllint({ files: ["**/*.yml"] });

      expect(mockExecute).toHaveBeenCalledWith("yamllint", expect.any(Object));
      // CRITICAL: Ensure it's NOT calling js-yaml-cli
      expect(mockExecute).not.toHaveBeenCalledWith("js-yaml-cli", expect.any(Object));
    });

    it("should return success when no YAML files found", async () => {
      mockScan.mockResolvedValue([]);

      const result = await tools.yamllint({});

      expect(result.success).toBe(true);
      expect(result.filesChecked).toBe(0);
      expect(result.output).toContain("No YAML files found");
    });

    it("should handle yamllint warnings", async () => {
      mockScan.mockResolvedValue(["/test/config.yml"]);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "/test/config.yml\n  1:1       warning  missing document start  (document-start)\n",
        stderr: "",
        exitCode: 0,
        duration: 150,
        command: "yamllint",
      });

      const result = await tools.yamllint({ files: ["config.yml"] });

      expect(result.success).toBe(true);
      expect(result.filesChecked).toBe(1);
      expect(result.issuesFound).toBeGreaterThan(0);
      expect(result.output).toContain("warning");
    });

    it("should handle yamllint errors", async () => {
      mockScan.mockResolvedValue(["/test/invalid.yml"]);
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "",
        stderr: "/test/invalid.yml\n  5:10      error  syntax error  (syntax)\n",
        exitCode: 1,
        duration: 120,
        command: "yamllint",
        error: "Linting failed",
      });

      const result = await tools.yamllint({ files: ["invalid.yml"] });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.issuesFound).toBeGreaterThan(0);
    });

    it("should pass additional arguments to yamllint", async () => {
      mockScan.mockResolvedValue(["/test/file.yml"]);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "yamllint",
      });

      await tools.yamllint({
        files: ["file.yml"],
        args: ["--config-file", ".yamllint.yml"]
      });

      expect(mockExecute).toHaveBeenCalledWith(
        "yamllint",
        expect.objectContaining({
          args: expect.arrayContaining(["--config-file", ".yamllint.yml"])
        })
      );
    });

    it("should handle multiple YAML files", async () => {
      const files = [
        "/test/docker-compose.yml",
        "/test/.github/workflows/ci.yml",
        "/test/config.yaml"
      ];
      mockScan.mockResolvedValue(files);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "All files passed",
        stderr: "",
        exitCode: 0,
        duration: 200,
        command: "yamllint",
      });

      const result = await tools.yamllint({ files: ["**/*.yml", "**/*.yaml"] });

      expect(result.filesChecked).toBe(3);
      expect(mockExecute).toHaveBeenCalledWith(
        "yamllint",
        expect.objectContaining({
          args: expect.arrayContaining(files.map(f => expect.stringContaining(f)))
        })
      );
    });
  });

  describe("markdownlint", () => {
    it("should execute markdownlint command", async () => {
      mockScan.mockResolvedValue(["/test/README.md"]);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "markdownlint",
      });

      await tools.markdownlint({ files: ["**/*.md"] });

      expect(mockExecute).toHaveBeenCalledWith("markdownlint", expect.any(Object));
    });

    it("should support --fix flag", async () => {
      mockScan.mockResolvedValue(["/test/README.md"]);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "markdownlint",
      });

      await tools.markdownlint({ files: ["README.md"], fix: true });

      expect(mockExecute).toHaveBeenCalledWith(
        "markdownlint",
        expect.objectContaining({
          args: expect.arrayContaining(["--fix"])
        })
      );
    });

    it("should return success when no markdown files found", async () => {
      mockScan.mockResolvedValue([]);

      const result = await tools.markdownlint({});

      expect(result.success).toBe(true);
      expect(result.filesChecked).toBe(0);
    });

    it("should count markdown lint issues", async () => {
      mockScan.mockResolvedValue(["/test/README.md"]);
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "README.md:10 MD013/line-length Line length\nREADME.md:15 MD001/heading-increment",
        stderr: "",
        exitCode: 1,
        duration: 100,
        command: "markdownlint",
        error: "Linting failed",
      });

      const result = await tools.markdownlint({ files: ["README.md"] });

      expect(result.success).toBe(false);
      expect(result.issuesFound).toBe(2);
    });
  });

  describe("eslint", () => {
    it("should execute eslint command", async () => {
      mockScan.mockResolvedValue(["/test/src/index.ts"]);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 500,
        command: "eslint",
      });

      await tools.eslint({ files: ["src/**/*.ts"] });

      expect(mockExecute).toHaveBeenCalledWith("eslint", expect.any(Object));
    });

    it("should support --fix flag", async () => {
      mockScan.mockResolvedValue(["/test/src/index.ts"]);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 500,
        command: "eslint",
      });

      await tools.eslint({ files: ["src/**/*.ts"], fix: true });

      expect(mockExecute).toHaveBeenCalledWith(
        "eslint",
        expect.objectContaining({
          args: expect.arrayContaining(["--fix"])
        })
      );
    });

    it("should use compact format", async () => {
      mockScan.mockResolvedValue(["/test/src/index.ts"]);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 500,
        command: "eslint",
      });

      await tools.eslint({ files: ["src/**/*.ts"] });

      expect(mockExecute).toHaveBeenCalledWith(
        "eslint",
        expect.objectContaining({
          args: expect.arrayContaining(["--format", "compact"])
        })
      );
    });
  });

  describe("commitlint", () => {
    it("should execute commitlint command", async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "npx commitlint",
      });

      await tools.commitlint({});

      expect(mockExecute).toHaveBeenCalledWith("npx", expect.objectContaining({
        args: expect.arrayContaining(["commitlint"])
      }));
    });

    it("should validate commit message format", async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "✖   subject may not be empty [subject-empty]",
        stderr: "",
        exitCode: 1,
        duration: 100,
        command: "npx commitlint",
        error: "Commit message validation failed",
      });

      const result = await tools.commitlint({ message: "" });

      expect(result.success).toBe(false);
      expect(result.issuesFound).toBe(1);
    });
  });

  describe("lintAll", () => {
    it("should run all available linters", async () => {
      mockDetectProject.mockResolvedValue({
        lintingTools: ["eslint", "markdownlint", "yamllint"],
      });

      mockScan.mockResolvedValue(["/test/file"]);
      mockExecute.mockResolvedValue({
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "test",
      });

      const result = await tools.lintAll({});

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.overallSuccess).toBe(true);
    });

    it("should handle linter failures gracefully", async () => {
      mockDetectProject.mockResolvedValue({
        lintingTools: ["eslint"],
      });

      mockScan.mockResolvedValue(["/test/file.ts"]);
      mockExecute.mockRejectedValue(new Error("eslint not found"));

      const result = await tools.lintAll({});

      expect(result.overallSuccess).toBe(false);
      expect(result.results[0].error).toBeDefined();
    });
  });

  describe("Issue Count Detection", () => {
    it("should count yamllint issues correctly", async () => {
      mockScan.mockResolvedValue(["/test/file.yml"]);
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "file.yml\n  1:1       warning  missing document start\n  5:10      error    syntax error\n  10:5      warning  trailing spaces",
        stderr: "",
        exitCode: 1,
        duration: 100,
        command: "yamllint",
        error: "Linting failed",
      });

      const result = await tools.yamllint({ files: ["file.yml"] });

      expect(result.issuesFound).toBe(3);
    });

    it("should count markdownlint issues using MD codes", async () => {
      mockScan.mockResolvedValue(["/test/README.md"]);
      mockExecute.mockResolvedValue({
        success: false,
        stdout: "README.md:10 MD013 MD001 MD022",
        stderr: "",
        exitCode: 1,
        duration: 100,
        command: "markdownlint",
        error: "Linting failed",
      });

      const result = await tools.markdownlint({ files: ["README.md"] });

      expect(result.issuesFound).toBe(3);
    });
  });
});
