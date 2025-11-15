/**
 * Standard error utilities
 *
 * Provides a consistent error contract across all MCP DevTools utilities so
 * higher-level systems can categorize, rank, and suggest fixes for failures.
 */

import { Category, FailurePattern } from "./knowledge-base.js";
import { ErrorType } from "./failure-analyzer.js";

/**
 * Enumerates the supported error codes for tool execution failures.
 *
 * The codes intentionally align with the {@link ErrorCategory} enum so they can
 * be aggregated by dashboards and suggestions systems. New codes should be
 * additive and favor descriptive names (e.g. `TEST_TIMEOUT` instead of `TIMEOUT`).
 */
export enum ErrorCode {
  /** Generic build failure */
  BUILD_FAILED = "BUILD_FAILED",
  /** Compilation errors produced by compilers or type checkers */
  COMPILATION_ERROR = "COMPILATION_ERROR",
  /** Missing modules or packages during import resolution */
  MODULE_NOT_FOUND = "MODULE_NOT_FOUND",
  /** Linker stage failures */
  LINKER_ERROR = "LINKER_ERROR",
  /** Builds exceeding the configured timeout */
  BUILD_TIMEOUT = "BUILD_TIMEOUT",

  /** Tests returning failing status codes */
  TEST_FAILED = "TEST_FAILED",
  /** Tests exceeding execution time limits */
  TEST_TIMEOUT = "TEST_TIMEOUT",
  /** Coverage thresholds not met */
  COVERAGE_TOO_LOW = "COVERAGE_TOO_LOW",
  /** Known flaky tests detected */
  FLAKY_TEST = "FLAKY_TEST",
  /** Snapshot based tests mismatched their baselines */
  SNAPSHOT_MISMATCH = "SNAPSHOT_MISMATCH",

  /** Lint rules or formatting checks failed */
  LINT_VIOLATION = "LINT_VIOLATION",
  /** Formatting checks reported differences */
  FORMAT_VIOLATION = "FORMAT_VIOLATION",

  /** Dependencies missing from lockfiles or modules */
  DEPENDENCY_MISSING = "DEPENDENCY_MISSING",
  /** Dependencies with incompatible versions */
  DEPENDENCY_CONFLICT = "DEPENDENCY_CONFLICT",
  /** Lockfile and manifest drifted */
  LOCKFILE_OUTDATED = "LOCKFILE_OUTDATED",

  /** Invalid configuration files or flags */
  CONFIGURATION_INVALID = "CONFIGURATION_INVALID",
  /** Required configuration artifacts missing */
  CONFIGURATION_MISSING = "CONFIGURATION_MISSING",
  /** Required environment variables absent */
  ENVIRONMENT_VARIABLE_MISSING = "ENVIRONMENT_VARIABLE_MISSING",

  /** Vulnerabilities or insecure patterns detected */
  SECURITY_VULNERABILITY = "SECURITY_VULNERABILITY",
  /** Hardcoded or leaked secrets */
  SECRET_LEAK = "SECRET_LEAK",
  /** Permission or policy violations */
  PERMISSION_DENIED = "PERMISSION_DENIED",

  /** Detected performance regressions */
  PERFORMANCE_REGRESSION = "PERFORMANCE_REGRESSION",
  /** Memory leaks or unbounded memory growth */
  MEMORY_LEAK = "MEMORY_LEAK",
  /** CPU usage exceeded thresholds */
  HIGH_CPU_USAGE = "HIGH_CPU_USAGE",

  /** Generic runtime exceptions */
  RUNTIME_EXCEPTION = "RUNTIME_EXCEPTION",
  /** Processes exceeded resource quotas (memory, CPU, etc.) */
  RESOURCE_LIMIT_EXCEEDED = "RESOURCE_LIMIT_EXCEEDED",
  /** Network connectivity issues */
  NETWORK_FAILURE = "NETWORK_FAILURE",

  /** Validation or schema checks failed */
  SCHEMA_VALIDATION_FAILED = "SCHEMA_VALIDATION_FAILED",

  /** System level outages or infrastructure issues */
  SYSTEM_OUTAGE = "SYSTEM_OUTAGE",

  /** Fallback code when no classification is available */
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Categorizes errors for reporting and suggestion routing.
 *
 * Categories mirror {@link Category} to keep analytics comparable while adding
 * a few runtime-focused buckets.
 */
export enum ErrorCategory {
  BUILD = Category.Build,
  TEST = Category.Test,
  LINT = Category.Lint,
  DEPENDENCY = Category.Dependencies,
  CONFIGURATION = Category.Configuration,
  SECURITY = Category.Security,
  PERFORMANCE = Category.Performance,
  MAINTAINABILITY = Category.Maintainability,
  GENERAL = Category.General,
  RUNTIME = "runtime",
  VALIDATION = "validation",
  SYSTEM = "system",
  UNKNOWN = "unknown",
}

/**
 * Defines severity levels used when presenting standard errors.
 */
export enum ErrorSeverity {
  CRITICAL = "critical",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

/**
 * Priority value for {@link ErrorSuggestion} so clients can rank remedies.
 */
export type SuggestionPriority = "high" | "medium" | "low";

/**
 * Represents a single actionable remediation step for an error.
 */
export interface ErrorSuggestion {
  /** Short title rendered in UI surfaces */
  title: string;
  /** Detailed description of why this suggestion is helpful */
  description: string;
  /** Suggested remediation category for filtering */
  category: ErrorCategory;
  /** Priority indicator for consumers */
  priority: SuggestionPriority;
  /** Optional shell command or link that applies the suggestion */
  action?: string;
}

/**
 * Execution context describing the environment where the error happened.
 */
export interface ErrorContext {
  /** Name of the tool or adapter producing the error */
  toolName: string;
  /** Working directory passed to the tool */
  workingDirectory: string;
  /** Optional set of files implicated in the failure */
  affectedFiles?: string[];
  /** Environment variables that materially contributed to the result */
  environment?: Record<string, string>;
  /** When the error occurred */
  timestamp: Date;
}

/**
 * Canonical error contract returned by tools and adapters.
 */
export interface StandardError {
  /** Machine readable error code */
  code: ErrorCode;
  /** Top-level category used for routing */
  category: ErrorCategory;
  /** Severity level surfaced to users */
  severity: ErrorSeverity;
  /** Human readable summary */
  message: string;
  /** Additional debugging information */
  details?: string;
  /** Suggested remediation steps */
  suggestions: ErrorSuggestion[];
  /** Context describing where the error occurred */
  context: ErrorContext;
  /** Raw execution logs for downstream diagnostics */
  raw: {
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
    command: string;
  };
  /** Matched failure patterns that informed the error */
  patterns?: FailurePattern[];
  /** Confidence score (0-1) indicating classification reliability */
  confidence?: number;
}

/**
 * Wrapper returned by tools that augment their results with {@link StandardError}.
 */
export interface EnrichedToolResult<T> {
  /** Original result returned by the tool */
  result: T;
  /** Optional standard error payload */
  standardError?: StandardError;
  /** Indicates the result contains enrichment metadata */
  enriched: boolean;
}

/**
 * Maps {@link ErrorType} values to the best matching {@link ErrorCode}s.
 *
 * Codes are ordered from most specific to least specific to help callers pick
 * whichever code best matches their context.
 */
export const ERROR_TYPE_TO_CODE_MAP: Record<ErrorType, ErrorCode[]> = {
  [ErrorType.BuildError]: [
    ErrorCode.BUILD_FAILED,
    ErrorCode.COMPILATION_ERROR,
    ErrorCode.MODULE_NOT_FOUND,
    ErrorCode.LINKER_ERROR,
    ErrorCode.BUILD_TIMEOUT,
  ],
  [ErrorType.TestFailure]: [
    ErrorCode.TEST_FAILED,
    ErrorCode.TEST_TIMEOUT,
    ErrorCode.COVERAGE_TOO_LOW,
    ErrorCode.FLAKY_TEST,
    ErrorCode.SNAPSHOT_MISMATCH,
  ],
  [ErrorType.LintIssue]: [
    ErrorCode.LINT_VIOLATION,
    ErrorCode.FORMAT_VIOLATION,
  ],
  [ErrorType.DependencyIssue]: [
    ErrorCode.DEPENDENCY_MISSING,
    ErrorCode.DEPENDENCY_CONFLICT,
    ErrorCode.LOCKFILE_OUTDATED,
    ErrorCode.MODULE_NOT_FOUND,
  ],
  [ErrorType.ConfigurationIssue]: [
    ErrorCode.CONFIGURATION_INVALID,
    ErrorCode.CONFIGURATION_MISSING,
    ErrorCode.ENVIRONMENT_VARIABLE_MISSING,
  ],
  [ErrorType.SecurityIssue]: [
    ErrorCode.SECURITY_VULNERABILITY,
    ErrorCode.SECRET_LEAK,
    ErrorCode.PERMISSION_DENIED,
  ],
  [ErrorType.PerformanceIssue]: [
    ErrorCode.PERFORMANCE_REGRESSION,
    ErrorCode.MEMORY_LEAK,
    ErrorCode.HIGH_CPU_USAGE,
  ],
  [ErrorType.RuntimeError]: [
    ErrorCode.RUNTIME_EXCEPTION,
    ErrorCode.RESOURCE_LIMIT_EXCEEDED,
    ErrorCode.NETWORK_FAILURE,
  ],
  [ErrorType.Unknown]: [ErrorCode.UNKNOWN_ERROR],
};

/**
 * Maps {@link ErrorType} values to {@link ErrorCategory} for analytics.
 */
export const ERROR_TYPE_TO_CATEGORY_MAP: Record<
  ErrorType,
  ErrorCategory
> = {
  [ErrorType.BuildError]: ErrorCategory.BUILD,
  [ErrorType.TestFailure]: ErrorCategory.TEST,
  [ErrorType.LintIssue]: ErrorCategory.LINT,
  [ErrorType.DependencyIssue]: ErrorCategory.DEPENDENCY,
  [ErrorType.ConfigurationIssue]: ErrorCategory.CONFIGURATION,
  [ErrorType.SecurityIssue]: ErrorCategory.SECURITY,
  [ErrorType.PerformanceIssue]: ErrorCategory.PERFORMANCE,
  [ErrorType.RuntimeError]: ErrorCategory.RUNTIME,
  [ErrorType.Unknown]: ErrorCategory.UNKNOWN,
};

/**
 * Returns the known error codes for the provided {@link ErrorType}.
 *
 * @example
 * ```typescript
 * const codes = getErrorCodesForType(ErrorType.TestFailure);
 * // => [ErrorCode.TEST_FAILED, ErrorCode.TEST_TIMEOUT, ...]
 * ```
 */
export function getErrorCodesForType(errorType: ErrorType): ErrorCode[] {
  return ERROR_TYPE_TO_CODE_MAP[errorType] ?? [ErrorCode.UNKNOWN_ERROR];
}

/**
 * Resolves the {@link ErrorCategory} for a given {@link ErrorType}.
 */
export function getCategoryForType(errorType: ErrorType): ErrorCategory {
  return ERROR_TYPE_TO_CATEGORY_MAP[errorType] ?? ErrorCategory.UNKNOWN;
}

/**
 * Determines whether the provided value implements {@link StandardError}.
 *
 * Performs a light structural check suitable for runtime validation.
 */
export function isStandardError(value: unknown): value is StandardError {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const { code, category, severity, message, suggestions, context, raw } =
    candidate;

  if (
    !Object.values(ErrorCode).includes(code as ErrorCode) ||
    !Object.values(ErrorCategory).includes(category as ErrorCategory) ||
    !Object.values(ErrorSeverity).includes(severity as ErrorSeverity) ||
    typeof message !== "string" ||
    !Array.isArray(suggestions) ||
    suggestions.some((suggestion) => !isErrorSuggestion(suggestion)) ||
    !isErrorContext(context) ||
    !isRawPayload(raw)
  ) {
    return false;
  }

  return true;
}

/**
 * Checks if a value is an {@link EnrichedToolResult}.
 */
export function isEnrichedResult<T = unknown>(
  value: unknown,
): value is EnrichedToolResult<T> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.enriched === true && "result" in candidate;
}

const ALLOWED_PRIORITIES: SuggestionPriority[] = ["high", "medium", "low"];

const isErrorSuggestion = (value: unknown): value is ErrorSuggestion => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const suggestion = value as Record<string, unknown>;
  return (
    typeof suggestion.title === "string" &&
    typeof suggestion.description === "string" &&
    Object.values(ErrorCategory).includes(suggestion.category as ErrorCategory) &&
    ALLOWED_PRIORITIES.includes(suggestion.priority as SuggestionPriority) &&
    (typeof suggestion.action === "undefined" ||
      typeof suggestion.action === "string")
  );
};

const isErrorContext = (value: unknown): value is ErrorContext => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const context = value as Record<string, unknown>;
  const env = context.environment as Record<string, unknown> | undefined;
  return (
    typeof context.toolName === "string" &&
    typeof context.workingDirectory === "string" &&
    (typeof context.affectedFiles === "undefined" ||
      (Array.isArray(context.affectedFiles) &&
        context.affectedFiles.every((file) => typeof file === "string"))) &&
    (typeof context.environment === "undefined" ||
      (typeof context.environment === "object" &&
        context.environment !== null &&
        Object.values(env ?? {}).every((val) => typeof val === "string"))) &&
    context.timestamp instanceof Date
  );
};

const isRawPayload = (
  value: unknown,
): value is StandardError["raw"] => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.stdout === "string" &&
    typeof raw.stderr === "string" &&
    typeof raw.exitCode === "number" &&
    typeof raw.duration === "number" &&
    typeof raw.command === "string"
  );
};
