import {
  ErrorCategory,
  ErrorCode,
  ErrorContext,
  ErrorSeverity,
  ErrorSuggestion,
  EnrichedToolResult,
  StandardError,
  getCategoryForType,
  getErrorCodesForType,
  isEnrichedResult,
  isStandardError,
} from "../../utils/standard-error.js";
import { ErrorType } from "../../utils/failure-analyzer.js";
import { Category } from "../../utils/knowledge-base.js";

const buildStandardError = (): StandardError => ({
  code: ErrorCode.TEST_FAILED,
  category: ErrorCategory.TEST,
  severity: ErrorSeverity.ERROR,
  message: "Tests failed",
  details: "3 failing suites",
  suggestions: [
    {
      title: "Review failing suites",
      description: "Inspect the failing suites output for root causes.",
      category: ErrorCategory.TEST,
      priority: "high",
      action: "npm test packages/auth -- --runInBand",
    },
  ],
  context: {
    toolName: "run_tests",
    workingDirectory: "/repo",
    affectedFiles: ["src/auth.test.ts"],
    environment: { NODE_ENV: "test" },
    timestamp: new Date(),
  },
  raw: {
    stdout: "failing",
    stderr: "boom",
    exitCode: 1,
    duration: 1234,
    command: "npm test",
  },
  confidence: 0.9,
});

describe("standard-error utilities", () => {
  describe("isStandardError", () => {
    it("returns true for valid StandardError objects", () => {
      expect(isStandardError(buildStandardError())).toBe(true);
    });

    it("returns false when required fields are missing", () => {
      const candidate = buildStandardError();
      // @ts-expect-error testing runtime validation
      delete candidate.raw;
      expect(isStandardError(candidate)).toBe(false);
    });

    it("returns false when context timestamp is not a Date", () => {
      const candidate = buildStandardError();
      candidate.context = {
        ...candidate.context,
        // @ts-expect-error force runtime invalid state
        timestamp: new Date().toISOString(),
      };
      expect(isStandardError(candidate)).toBe(false);
    });

    it("returns false for nullish and primitive values", () => {
      expect(isStandardError(null)).toBe(false);
      expect(isStandardError(undefined)).toBe(false);
      expect(isStandardError("error")).toBe(false);
    });
  });

  describe("isEnrichedResult", () => {
    it("detects enriched tool results", () => {
      const enriched: EnrichedToolResult<string> = {
        result: "value",
        enriched: true,
        standardError: buildStandardError(),
      };
      expect(isEnrichedResult(enriched)).toBe(true);
    });

    it("returns false for plain results", () => {
      expect(isEnrichedResult({ result: "value" })).toBe(false);
    });
  });

  describe("mapping utilities", () => {
    it("maps error types to error codes", () => {
      const codes = getErrorCodesForType(ErrorType.TestFailure);
      expect(codes).toContain(ErrorCode.TEST_FAILED);
      expect(codes).toContain(ErrorCode.SNAPSHOT_MISMATCH);
    });

    it("falls back to unknown error codes", () => {
      const codes = getErrorCodesForType("non-existent" as ErrorType);
      expect(codes).toEqual([ErrorCode.UNKNOWN_ERROR]);
    });

    it("maps error types to categories", () => {
      expect(getCategoryForType(ErrorType.BuildError)).toBe(
        ErrorCategory.BUILD,
      );
      expect(getCategoryForType(ErrorType.SecurityIssue)).toBe(
        ErrorCategory.SECURITY,
      );
    });

    it("defaults to unknown category for unknown types", () => {
      expect(getCategoryForType("bogus" as ErrorType)).toBe(
        ErrorCategory.UNKNOWN,
      );
    });
  });

  describe("interfaces", () => {
    it("supports error suggestions with actions", () => {
      const suggestion: ErrorSuggestion = {
        title: "Install dependencies",
        description: "Run npm install to fetch packages.",
        category: ErrorCategory.DEPENDENCY,
        priority: "medium",
        action: "npm install",
      };
      expect(suggestion.action).toBe("npm install");
    });

    it("captures context metadata", () => {
      const context: ErrorContext = {
        toolName: "build",
        workingDirectory: "/repo",
        affectedFiles: ["src/index.ts"],
        environment: { NODE_ENV: "production" },
        timestamp: new Date(),
      };
      expect(context.toolName).toBe("build");
    });

    it("wraps enriched tool results", () => {
      const payload: EnrichedToolResult<number> = {
        result: 42,
        enriched: true,
        standardError: buildStandardError(),
      };
      expect(payload.result).toBe(42);
      expect(payload.standardError?.code).toBe(ErrorCode.TEST_FAILED);
    });
  });

  describe("enum completeness", () => {
    it("ensures all error code values are unique", () => {
      const codes = Object.values(ErrorCode);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it("aligns categories with knowledge base enums", () => {
      expect(ErrorCategory.BUILD).toBe(Category.Build);
      expect(ErrorCategory.TEST).toBe(Category.Test);
      expect(ErrorCategory.LINT).toBe(Category.Lint);
      expect(ErrorCategory.DEPENDENCY).toBe(Category.Dependencies);
      expect(ErrorCategory.CONFIGURATION).toBe(Category.Configuration);
      expect(ErrorCategory.SECURITY).toBe(Category.Security);
      expect(ErrorCategory.PERFORMANCE).toBe(Category.Performance);
      expect(ErrorCategory.MAINTAINABILITY).toBe(Category.Maintainability);
      expect(ErrorCategory.GENERAL).toBe(Category.General);
    });

    it("contains four severity levels", () => {
      expect(Object.values(ErrorSeverity)).toEqual([
        "critical",
        "error",
        "warning",
        "info",
      ]);
    });
  });
});

