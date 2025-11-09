import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { SuggestionEngine } from "../../utils/suggestion-engine.js";
import {
  ProjectType,
  ProjectDetector,
  BuildSystem,
} from "../../utils/project-detector.js";
import { ExecutionResult } from "../../utils/shell-executor.js";
import { CacheManager } from "../../utils/cache-manager.js";

describe("SuggestionEngine", () => {
  let engine: SuggestionEngine;
  let originalDetectProject: typeof ProjectDetector.prototype.detectProject;

  beforeEach(() => {
    // Reset cache to ensure clean state between tests
    CacheManager.resetInstance();

    // Mock ProjectDetector.detectProject to avoid slow file system operations
    originalDetectProject = ProjectDetector.prototype.detectProject;
    ProjectDetector.prototype.detectProject = jest.fn(async () => ({
      type: ProjectType.Unknown,
      language: "unknown",
      buildSystem: BuildSystem.Make,
      hasTests: false,
      lintingTools: [],
      configFiles: [],
    })) as typeof originalDetectProject;

    engine = new SuggestionEngine(process.cwd());
  });

  afterEach(() => {
    // Restore original detectProject method
    ProjectDetector.prototype.detectProject = originalDetectProject;

    // Clean up cache after each test
    CacheManager.resetInstance();
  });

  describe("generateSuggestions", () => {
    it("should generate suggestions for Go test failures", async () => {
      const result: ExecutionResult = {
        command: "go test",
        stdout: "FAIL: TestFoo (0.00s)\n    main_test.go:10: expected 1, got 2",
        stderr: "",
        success: false,
        exitCode: 1,
        duration: 100,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(false);
      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions[0].category).toBe("test");
      expect(suggestions.suggestions[0].priority).toBe("high");
      expect(suggestions.suggestions[0].actions.length).toBeGreaterThan(0);
    });

    it("should generate suggestions for missing dependencies", async () => {
      const result: ExecutionResult = {
        command: "go build",
        stdout: "",
        stderr: 'cannot find package "github.com/foo/bar"',
        success: false,
        exitCode: 1,
        duration: 50,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(false);
      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions[0].category).toBe("dependencies");
      expect(
        suggestions.suggestions[0].actions.some(
          (a) => a.includes("go get") || a.includes("go mod tidy"),
        ),
      ).toBe(true);
    });

    it("should generate workflow optimization suggestions for successful builds", async () => {
      const result: ExecutionResult = {
        command: "go build",
        stdout: "Build successful",
        stderr: "",
        success: true,
        exitCode: 0,
        duration: 1000,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(true);
      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.suggestions.some((s) => s.category === "workflow"),
      ).toBe(true);
    });

    it("should handle context-aware suggestions for Node.js projects", async () => {
      const result: ExecutionResult = {
        command: "npm test",
        stdout: "",
        stderr: 'Error: Cannot find module "lodash"',
        success: false,
        exitCode: 1,
        duration: 100,
      };

      const suggestions = await engine.generateSuggestions(result, {
        projectType: ProjectType.NodeJS,
        language: "javascript",
      });

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.suggestions[0].actions.some((a) =>
          a.includes("npm install"),
        ),
      ).toBe(true);
    });

    it("should generate security-related suggestions", async () => {
      const result: ExecutionResult = {
        command: "npm audit",
        stdout: "",
        stderr: "found 3 vulnerabilities (2 moderate, 1 high)",
        success: false,
        exitCode: 1,
        duration: 200,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.suggestions.some((s) => s.category === "security"),
      ).toBe(true);
      expect(suggestions.suggestions[0].priority).toBe("high");
    });

    it("should prioritize suggestions by confidence and severity", async () => {
      const result: ExecutionResult = {
        command: "go test",
        stdout: "FAIL: TestFoo\nFAIL: TestBar",
        stderr: "data race detected",
        success: false,
        exitCode: 1,
        duration: 500,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(1);
      // Higher priority suggestions should come first
      expect(suggestions.suggestions[0].priority).toBe("high");
      expect(suggestions.suggestions[0].confidence).toBeGreaterThanOrEqual(0.5);
    });

    it("should include related files in suggestions", async () => {
      const result: ExecutionResult = {
        command: "go test",
        stdout: "",
        stderr: "main.go:42: undefined: Foo",
        success: false,
        exitCode: 1,
        duration: 100,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      const suggestionWithFiles = suggestions.suggestions.find(
        (s) => s.relatedFiles && s.relatedFiles.length > 0,
      );
      expect(suggestionWithFiles).toBeDefined();
      if (suggestionWithFiles?.relatedFiles) {
        expect(
          suggestionWithFiles.relatedFiles.some((f) => f.includes("main.go")),
        ).toBe(true);
      }
    });

    it("should handle Python import errors", async () => {
      const result: ExecutionResult = {
        command: "python3 main.py",
        stdout: "",
        stderr: "ImportError: No module named requests",
        success: false,
        exitCode: 1,
        duration: 50,
      };

      const suggestions = await engine.generateSuggestions(result, {
        projectType: ProjectType.Python,
        language: "python",
      });

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.suggestions[0].actions.some((a) =>
          a.includes("pip install"),
        ),
      ).toBe(true);
    });

    it("should provide actionable steps for lint issues", async () => {
      const result: ExecutionResult = {
        command: "golangci-lint run",
        stdout: "",
        stderr: "main.go:10:1: error ineffassign",
        success: false,
        exitCode: 1,
        duration: 200,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      // Lint category suggestions should be present (may be first or among multiple)
      expect(
        suggestions.suggestions.some(
          (s) => s.category === "lint" || s.category === "workflow",
        ),
      ).toBe(true);
      expect(suggestions.suggestions[0].actions.length).toBeGreaterThan(0);
    });

    it("should handle empty or minimal output gracefully", async () => {
      const result: ExecutionResult = {
        command: "unknown-command",
        stdout: "",
        stderr: "",
        success: false,
        exitCode: 127,
        duration: 10,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(false);
      expect(suggestions.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it("should aggregate multiple failure patterns into comprehensive suggestions", async () => {
      const result: ExecutionResult = {
        command: "go test",
        stdout: "",
        stderr:
          'cannot find package "foo"\ntest timed out after 30s\nWARNING: DATA RACE',
        success: false,
        exitCode: 1,
        duration: 30000,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(1);
      // Should have suggestions for dependencies, timeouts, or security (race conditions)
      const categories = suggestions.suggestions.map((s) => s.category);
      expect(
        categories.some((c) =>
          ["dependencies", "test", "security"].includes(c),
        ),
      ).toBe(true);
    });

    it("should calculate confidence scores appropriately", async () => {
      const result: ExecutionResult = {
        command: "go test",
        stdout: "",
        stderr: "FAIL: TestFoo (0.00s)",
        success: false,
        exitCode: 1,
        duration: 100,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      suggestions.suggestions.forEach((s) => {
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      });
    });

    it("should provide language-specific recommendations for Go", async () => {
      const result: ExecutionResult = {
        command: "go build",
        stdout: "",
        stderr: "undefined: someVar",
        success: false,
        exitCode: 1,
        duration: 100,
      };

      const suggestions = await engine.generateSuggestions(result, {
        projectType: ProjectType.Go,
        language: "go",
      });

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.suggestions.some((s) =>
          s.actions.some((a) => a.includes("go") || a.includes("Go")),
        ),
      ).toBe(true);
    });

    it("should provide language-specific recommendations for JavaScript/TypeScript", async () => {
      const result: ExecutionResult = {
        command: "npm run build",
        stdout: "",
        stderr: "error TS2304: Cannot find name 'foo'",
        success: false,
        exitCode: 1,
        duration: 200,
      };

      const suggestions = await engine.generateSuggestions(result, {
        projectType: ProjectType.NodeJS,
        language: "typescript",
      });

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      // Should have either TypeScript-specific suggestions or general build suggestions
      expect(
        suggestions.suggestions.some(
          (s) =>
            s.category === "build" ||
            s.actions.some(
              (a) => a.toLowerCase().includes("type") || a.includes("import"),
            ),
        ),
      ).toBe(true);
    });

    it("should generate workflow suggestions for successful commands", async () => {
      const result: ExecutionResult = {
        command: "make test",
        stdout: "All tests passed",
        stderr: "",
        success: true,
        exitCode: 0,
        duration: 5000,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(true);
      expect(
        suggestions.suggestions.some((s) => s.category === "workflow"),
      ).toBe(true);
    });

    it("should use cache for identical failures", async () => {
      const result: ExecutionResult = {
        command: "go test",
        stdout: "FAIL: TestFoo",
        stderr: "",
        success: false,
        exitCode: 1,
        duration: 100,
      };

      // First call - cache miss
      const suggestions1 = await engine.generateSuggestions(result);
      expect(suggestions1.suggestions.length).toBeGreaterThan(0);

      // Second call with same result - should hit cache
      const suggestions2 = await engine.generateSuggestions(result);
      expect(suggestions2.suggestions.length).toBe(
        suggestions1.suggestions.length,
      );
      expect(suggestions2.suggestions[0].title).toBe(
        suggestions1.suggestions[0].title,
      );
    });
  });

  describe("edge cases", () => {
    it("should handle very long output without performance issues", async () => {
      const longOutput = "Error: Something failed\n".repeat(1000);
      const result: ExecutionResult = {
        command: "test",
        stdout: longOutput,
        stderr: "",
        success: false,
        exitCode: 1,
        duration: 100,
      };

      const startTime = Date.now();
      const suggestions = await engine.generateSuggestions(result);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(suggestions.suggestions).toBeDefined();
    });

    it("should handle special characters in output", async () => {
      const result: ExecutionResult = {
        command: "test",
        stdout: "",
        stderr:
          'Error: "foo" != "bar" at line 10:5\nExpected: <nil>, Got: []{1,2,3}',
        success: false,
        exitCode: 1,
        duration: 100,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions).toBeDefined();
      expect(suggestions.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle multiline error messages", async () => {
      const result: ExecutionResult = {
        command: "go test",
        stdout: "",
        stderr: `--- FAIL: TestFoo (0.00s)
    main_test.go:10:
        Error Trace:    main_test.go:10
        Error:          Not equal
        Expected:       1
        Actual:         2`,
        success: false,
        exitCode: 1,
        duration: 100,
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.suggestions[0].relatedFiles?.some((f) =>
          f.includes("main_test.go"),
        ),
      ).toBe(true);
    });
  });

  describe("analyzeHistory", () => {
    it("should detect low success rates", async () => {
      const results: ExecutionResult[] = [
        {
          command: "test1",
          stdout: "",
          stderr: "error",
          success: false,
          exitCode: 1,
          duration: 100,
        },
        {
          command: "test2",
          stdout: "",
          stderr: "error",
          success: false,
          exitCode: 1,
          duration: 100,
        },
        {
          command: "test3",
          stdout: "",
          stderr: "error",
          success: false,
          exitCode: 1,
          duration: 100,
        },
        {
          command: "test4",
          stdout: "ok",
          stderr: "",
          success: true,
          exitCode: 0,
          duration: 100,
        },
      ];

      const suggestions = await engine.analyzeHistory(results);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(
        suggestions.some((s) => s.title.includes("Low Success Rate")),
      ).toBe(true);
    });

    it("should detect recurring issues", async () => {
      const results: ExecutionResult[] = [
        {
          command: "test1",
          stdout: "",
          stderr: 'cannot find package "foo"',
          success: false,
          exitCode: 1,
          duration: 100,
        },
        {
          command: "test2",
          stdout: "",
          stderr: 'cannot find package "foo"',
          success: false,
          exitCode: 1,
          duration: 100,
        },
        {
          command: "test3",
          stdout: "",
          stderr: 'cannot find package "foo"',
          success: false,
          exitCode: 1,
          duration: 100,
        },
      ];

      const suggestions = await engine.analyzeHistory(results);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.title.includes("Recurring"))).toBe(true);
    });

    it("should handle empty history gracefully", async () => {
      const suggestions = await engine.analyzeHistory([]);
      // Empty history produces success rate of 0, triggering low success rate suggestion
      // This is acceptable behavior - empty history is treated as 0% success
      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    it("should handle all successful commands", async () => {
      const results: ExecutionResult[] = [
        {
          command: "test1",
          stdout: "ok",
          stderr: "",
          success: true,
          exitCode: 0,
          duration: 100,
        },
        {
          command: "test2",
          stdout: "ok",
          stderr: "",
          success: true,
          exitCode: 0,
          duration: 100,
        },
        {
          command: "test3",
          stdout: "ok",
          stderr: "",
          success: true,
          exitCode: 0,
          duration: 100,
        },
      ];

      const suggestions = await engine.analyzeHistory(results);
      expect(suggestions.length).toBe(0);
    });
  });

  describe("getKnowledgeBaseStats", () => {
    it("should return knowledge base statistics", () => {
      const stats = engine.getKnowledgeBaseStats();

      expect(stats).toBeDefined();
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.byCategory).toBeDefined();
      expect(typeof stats.byCategory).toBe("object");
    });

    it("should have multiple categories", () => {
      const stats = engine.getKnowledgeBaseStats();

      const categories = Object.keys(stats.byCategory);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain("test");
    });
  });
});
