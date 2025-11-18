/**
 * Tests for ResultFormatter
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  ResultFormatter,
  FormatterConfig,
} from "../../utils/result-formatter.js";
import {
  StandardError,
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
  ErrorSuggestion,
  EnrichedToolResult,
} from "../../utils/standard-error.js";

describe("ResultFormatter", () => {
  let formatter: ResultFormatter;

  beforeEach(() => {
    formatter = new ResultFormatter();
  });

  describe("Configuration", () => {
    it("uses default configuration when none provided", () => {
      const formatter = new ResultFormatter();
      // Access via format() behavior - default includes raw output
      const result = formatter.format("test", createEnrichedResult());
      expect(result).toContain("Raw Output");
    });

    it("allows custom configuration", () => {
      const config: Partial<FormatterConfig> = {
        includeRawOutput: false,
        truncateOutputAt: 100,
      };
      const formatter = new ResultFormatter(config);
      const result = formatter.format("test", createEnrichedResult());
      expect(result).not.toContain("Raw Output");
    });

    it("merges custom config with defaults", () => {
      const formatter = new ResultFormatter({ includeContext: false });
      const result = formatter.format("test", createEnrichedResult());
      expect(result).not.toContain("Context");
      expect(result).toContain("Raw Output"); // Still uses default
    });
  });

  describe("Enriched Error Formatting", () => {
    it("formats enriched result with StandardError", () => {
      const enriched = createEnrichedResult();
      const output = formatter.format("make_lint", enriched);

      expect(output).toContain("## make_lint Results");
      expect(output).toContain("**Status:** ❌ Failed");
      expect(output).toContain("**Duration:** 1234ms");
      expect(output).toContain("**Code:** `LINT_VIOLATION`");
      expect(output).toContain("**Category:** lint");
      expect(output).toContain("**Message:** Linting failed");
    });

    it("includes severity emoji and label", () => {
      const critical = createEnrichedResult({
        severity: ErrorSeverity.CRITICAL,
      });
      expect(formatter.format("test", critical)).toContain("🔴 Critical Failure");

      const error = createEnrichedResult({ severity: ErrorSeverity.ERROR });
      expect(formatter.format("test", error)).toContain("❌ Failed");

      const warning = createEnrichedResult({ severity: ErrorSeverity.WARNING });
      expect(formatter.format("test", warning)).toContain("⚠️ Warning");

      const info = createEnrichedResult({ severity: ErrorSeverity.INFO });
      expect(formatter.format("test", info)).toContain("ℹ️ Info");
    });

    it("includes error details when present", () => {
      const enriched = createEnrichedResult({
        details: "Additional debugging information",
      });
      const output = formatter.format("test", enriched);
      expect(output).toContain("Additional debugging information");
    });

    it("includes confidence score when present", () => {
      const enriched = createEnrichedResult({ confidence: 0.87 });
      const output = formatter.format("test", enriched);
      expect(output).toContain("**Confidence:** 87%");
    });

    it("formats affected files", () => {
      const enriched = createEnrichedResult({
        context: {
          affectedFiles: ["file1.ts", "file2.ts", "file3.ts"],
        },
      });
      const output = formatter.format("test", enriched);
      expect(output).toContain("### Affected Files");
      expect(output).toContain("- file1.ts");
      expect(output).toContain("- file2.ts");
      expect(output).toContain("- file3.ts");
    });

    it("truncates affected files list", () => {
      const files = Array.from({ length: 25 }, (_, i) => `file${i}.ts`);
      const config = { maxAffectedFiles: 5 };
      const formatter = new ResultFormatter(config);
      const enriched = createEnrichedResult({
        context: { affectedFiles: files },
      });
      const output = formatter.format("test", enriched);

      expect(output).toContain("- file0.ts");
      expect(output).toContain("- file4.ts");
      expect(output).not.toContain("- file5.ts");
      expect(output).toContain("... and 20 more");
    });

    it("formats suggestions grouped by priority", () => {
      const suggestions: ErrorSuggestion[] = [
        {
          title: "High priority fix",
          description: "Fix this immediately",
          category: ErrorCategory.LINT,
          priority: "high",
          action: "make lint-fix",
        },
        {
          title: "Medium priority fix",
          description: "Fix this soon",
          category: ErrorCategory.LINT,
          priority: "medium",
        },
        {
          title: "Low priority fix",
          description: "Fix this eventually",
          category: ErrorCategory.LINT,
          priority: "low",
        },
      ];

      const enriched = createEnrichedResult({ suggestions });
      const output = formatter.format("test", enriched);

      expect(output).toContain("### Suggestions");
      expect(output).toContain("**High Priority:**");
      expect(output).toContain("**Medium Priority:**");
      expect(output).toContain("**Low Priority:**");
      expect(output).toContain("**High priority fix**");
      expect(output).toContain("Fix this immediately");
      expect(output).toContain("`make lint-fix`");
    });

    it("formats raw output as collapsible by default", () => {
      const enriched = createEnrichedResult({
        raw: {
          stdout: "stdout output",
          stderr: "stderr output",
        },
      });
      const output = formatter.format("test", enriched);

      expect(output).toContain("<details>");
      expect(output).toContain("<summary>Raw Output</summary>");
      expect(output).toContain("**stdout:**");
      expect(output).toContain("stdout output");
      expect(output).toContain("**stderr:**");
      expect(output).toContain("stderr output");
      expect(output).toContain("</details>");
    });

    it("formats raw output as expanded when configured", () => {
      const config = { collapseRawOutput: false };
      const formatter = new ResultFormatter(config);
      const enriched = createEnrichedResult({
        raw: {
          stdout: "stdout output",
          stderr: "stderr output",
        },
      });
      const output = formatter.format("test", enriched);

      // Should have ### Raw Output header (not in details)
      expect(output).toContain("### Raw Output");
      // Should NOT have Raw Output in details/summary
      expect(output).not.toContain("<summary>Raw Output</summary>");
      expect(output).toContain("**stdout:**");
      expect(output).toContain("**stderr:**");
    });

    it("skips raw output when empty", () => {
      const enriched = createEnrichedResult({
        raw: { stdout: "", stderr: "" },
      });
      const output = formatter.format("test", enriched);
      expect(output).not.toContain("Raw Output");
    });

    it("excludes raw output when configured", () => {
      const config = { includeRawOutput: false };
      const formatter = new ResultFormatter(config);
      const enriched = createEnrichedResult({
        raw: {
          stdout: "stdout output",
          stderr: "stderr output",
        },
      });
      const output = formatter.format("test", enriched);
      expect(output).not.toContain("Raw Output");
      expect(output).not.toContain("stdout output");
    });

    it("formats context as collapsible by default", () => {
      const enriched = createEnrichedResult();
      const output = formatter.format("test", enriched);

      expect(output).toContain("<details>");
      expect(output).toContain("<summary>Context</summary>");
      expect(output).toContain("**Tool:** make_lint");
      expect(output).toContain("**Command:** `make lint`");
      expect(output).toContain("**Exit Code:** 1");
      expect(output).toContain("</details>");
    });

    it("formats context as expanded when configured", () => {
      const config = { collapseContext: false };
      const formatter = new ResultFormatter(config);
      const enriched = createEnrichedResult();
      const output = formatter.format("test", enriched);

      // Should have ### Context header (not in details)
      expect(output).toContain("### Context");
      // Should NOT have Context in details/summary
      expect(output).not.toContain("<summary>Context</summary>");
      expect(output).toContain("**Tool:** make_lint");
    });

    it("excludes context when configured", () => {
      const config = { includeContext: false };
      const formatter = new ResultFormatter(config);
      const enriched = createEnrichedResult();
      const output = formatter.format("test", enriched);
      expect(output).not.toContain("Context");
      expect(output).not.toContain("**Tool:**");
    });

    it("includes environment variables in context", () => {
      const enriched = createEnrichedResult({
        context: {
          environment: { NODE_ENV: "test", DEBUG: "true" },
        },
      });
      const output = formatter.format("test", enriched);

      expect(output).toContain("**Environment:**");
      expect(output).toContain("- NODE_ENV=test");
      expect(output).toContain("- DEBUG=true");
    });
  });

  describe("Legacy Result Formatting", () => {
    it("formats basic legacy result", () => {
      const result = {
        success: false,
        duration: 5678,
        error: "Build failed",
        output: "Build output here",
      };
      const output = formatter.format("make_build", result);

      expect(output).toContain("## make_build Results");
      expect(output).toContain("**Status:** ❌ Failed");
      expect(output).toContain("**Duration:** 5678ms");
      expect(output).toContain("**Error:** Build failed");
      expect(output).toContain("**Output:**");
      expect(output).toContain("Build output here");
    });

    it("formats successful legacy result", () => {
      const result = { success: true, duration: 1000 };
      const output = formatter.format("test", result);
      expect(output).toContain("**Status:** ✅ Success");
    });

    it("handles missing duration", () => {
      const result = { success: true };
      const output = formatter.format("test", result);
      expect(output).not.toContain("**Duration:**");
    });

    it("formats lint-specific fields", () => {
      const result = {
        success: false,
        filesChecked: 42,
        issuesFound: 7,
        issuesFixed: 3,
        duration: 1234,
      };
      const output = formatter.format("lint", result);

      expect(output).toContain("**Files Checked:** 42");
      expect(output).toContain("**Issues Found:** 7");
      expect(output).toContain("**Issues Fixed:** 3");
    });

    it("formats test-specific fields", () => {
      const result = {
        success: true,
        testsRun: 100,
        testsPassed: 95,
        testsFailed: 3,
        testsSkipped: 2,
        coverage: 87.5,
        duration: 5000,
      };
      const output = formatter.format("test", result);

      expect(output).toContain("**Tests Run:** 100");
      expect(output).toContain("**Tests Passed:** 95");
      expect(output).toContain("**Tests Failed:** 3");
      expect(output).toContain("**Tests Skipped:** 2");
      expect(output).toContain("**Coverage:** 87.5%");
    });

    it("formats suggestions", () => {
      const result = {
        success: false,
        suggestions: ["Run make lint-fix", "Check your configuration"],
      };
      const output = formatter.format("test", result);

      expect(output).toContain("**Suggestions:**");
      expect(output).toContain("- Run make lint-fix");
      expect(output).toContain("- Check your configuration");
    });

    it("handles empty suggestions array", () => {
      const result = {
        success: false,
        suggestions: [],
      };
      const output = formatter.format("test", result);
      expect(output).not.toContain("**Suggestions:**");
    });

    it("truncates long output", () => {
      const longOutput = "x".repeat(15000);
      const config = { truncateOutputAt: 1000 };
      const formatter = new ResultFormatter(config);
      const result = {
        success: false,
        output: longOutput,
      };
      const output = formatter.format("test", result);

      expect(output).toContain("... (truncated 14000 bytes)");
      expect(output.length).toBeLessThan(longOutput.length);
    });

    it("does not truncate short output", () => {
      const shortOutput = "Short output";
      const result = {
        success: true,
        output: shortOutput,
      };
      const output = formatter.format("test", result);
      expect(output).toContain(shortOutput);
      expect(output).not.toContain("truncated");
    });
  });

  describe("Duck-typing Detection", () => {
    it("detects enriched result by enriched flag", () => {
      const enriched = createEnrichedResult();
      const output = formatter.format("test", enriched);
      // Should use enriched formatting
      expect(output).toContain("**Code:**");
      expect(output).toContain("**Category:**");
    });

    it("falls back to legacy for non-enriched results", () => {
      const legacy = { success: true, duration: 1000 };
      const output = formatter.format("test", legacy);
      // Should NOT have enriched formatting
      expect(output).not.toContain("**Code:**");
      expect(output).not.toContain("**Category:**");
    });

    it("handles enriched result without StandardError", () => {
      const enriched = {
        result: { success: false, error: "Failed" },
        enriched: true,
        // No standardError
      };
      const output = formatter.format("test", enriched);
      // Should fall back to legacy formatting
      expect(output).toContain("**Status:** ❌ Failed");
      expect(output).not.toContain("**Code:**");
    });
  });

  describe("Edge Cases", () => {
    it("handles null values gracefully", () => {
      const result = {
        success: true,
        error: null,
        output: null,
        suggestions: null,
      };
      const output = formatter.format("test", result);
      expect(output).toContain("**Status:** ✅ Success");
      expect(output).not.toContain("**Error:**");
    });

    it("handles undefined values gracefully", () => {
      const result = {
        success: true,
        error: undefined,
        output: undefined,
      };
      const output = formatter.format("test", result);
      expect(output).toContain("**Status:** ✅ Success");
    });

    it("handles empty strings", () => {
      const result = {
        success: false,
        error: "",
        output: "",
      };
      const output = formatter.format("test", result);
      expect(output).not.toContain("**Error:**");
      expect(output).not.toContain("**Output:**");
    });

    it("handles very long tool names", () => {
      const longName = "very_long_tool_name_that_should_still_work";
      const result = { success: true };
      const output = formatter.format(longName, result);
      expect(output).toContain(`## ${longName} Results`);
    });

    it("handles special characters in output", () => {
      const result = {
        success: false,
        output: "Error: <script>alert('xss')</script>",
      };
      const output = formatter.format("test", result);
      expect(output).toContain("Error: <script>alert('xss')</script>");
      // In markdown code blocks, this is safe
    });
  });
});

// Helper function to create enriched results
interface EnrichedResultOverrides {
  code?: ErrorCode;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  message?: string;
  details?: string;
  suggestions?: ErrorSuggestion[];
  confidence?: number;
  context?: Partial<StandardError["context"]>;
  raw?: Partial<StandardError["raw"]>;
}

function createEnrichedResult(
  overrides: EnrichedResultOverrides = {},
): EnrichedToolResult<{ success: boolean; duration: number }> {
  const defaultError: StandardError = {
    code: overrides.code ?? ErrorCode.LINT_VIOLATION,
    category: overrides.category ?? ErrorCategory.LINT,
    severity: overrides.severity ?? ErrorSeverity.ERROR,
    message: overrides.message ?? "Linting failed",
    details: overrides.details,
    suggestions: overrides.suggestions ?? [],
    confidence: overrides.confidence,
    context: {
      toolName: "make_lint",
      workingDirectory: "/test",
      timestamp: new Date("2025-01-01T00:00:00Z"),
      ...overrides.context,
    },
    raw: {
      stdout: "stdout output",
      stderr: "stderr output",
      exitCode: 1,
      duration: 1234,
      command: "make lint",
      ...overrides.raw,
    },
  };

  return {
    result: { success: false, duration: 1234 },
    standardError: defaultError,
    enriched: true,
  };
}
