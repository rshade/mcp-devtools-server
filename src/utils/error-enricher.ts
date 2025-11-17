/**
 * Error Enricher
 *
 * Service that enriches ExecutionResult failures with StandardError structures
 * by integrating FailureAnalyzer and SuggestionEngine.
 */

import { FailureAnalyzer, ErrorType, AnalysisResult } from "./failure-analyzer.js";
import { ExecutionResult } from "./shell-executor.js";
import {
  StandardError,
  ErrorCode,
  ErrorSeverity,
  ErrorSuggestion,
  ErrorContext,
  getErrorCodesForType,
  getCategoryForType,
} from "./standard-error.js";

/**
 * Configuration for error enrichment behavior
 */
export interface ErrorEnrichmentConfig {
  /** Whether error enrichment is enabled */
  enabled: boolean;
  /** Maximum time to spend enriching errors (ms) */
  timeout: number;
  /** Whether to include full context (working dir, files, env) */
  includeContext: boolean;
  /** Whether to include suggestions from SuggestionEngine */
  includeSuggestions: boolean;
  /** Minimum confidence score to include suggestions (0.0-1.0) */
  confidenceThreshold: number;
  /** Maximum number of suggestions to include */
  maxSuggestions: number;
}

/**
 * Default configuration for error enrichment
 * Disabled by default during Phase 1-2 to avoid breaking changes
 */
export const DEFAULT_CONFIG: ErrorEnrichmentConfig = {
  enabled: false,
  timeout: 100,
  includeContext: false,
  includeSuggestions: true,
  confidenceThreshold: 0.7,
  maxSuggestions: 5,
};

/**
 * Environment variables that contain sensitive information
 * These will be excluded from error context
 */
const SENSITIVE_ENV_VARS = new Set([
  "TOKEN",
  "SECRET",
  "PASSWORD",
  "API_KEY",
  "APIKEY",
  "ACCESS_KEY",
  "PRIVATE_KEY",
  "CREDENTIALS",
  "AUTH",
  "GITHUB_TOKEN",
  "NPM_TOKEN",
  "AWS_SECRET_ACCESS_KEY",
  "DATABASE_URL",
]);

/**
 * Environment variables that are safe to include in error context
 */
const SAFE_ENV_VARS = new Set([
  "NODE_ENV",
  "CI",
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "LANG",
  "PWD",
]);

/**
 * Service that enriches execution failures with detailed error information
 *
 * The ErrorEnricher integrates FailureAnalyzer and SuggestionEngine to produce
 * StandardError structures with:
 * - Specific error codes based on failure patterns
 * - Severity classification
 * - Actionable suggestions
 * - Full execution context
 *
 * @example
 * ```typescript
 * const enricher = new ErrorEnricher();
 * const result = await executor.execute("npm", ["test"]);
 * const error = await enricher.enrich(result, "run_tests");
 *
 * if (error) {
 *   console.log(`Error: ${error.code} (${error.severity})`);
 *   console.log(`Message: ${error.message}`);
 *   console.log(`Suggestions: ${error.suggestions.length}`);
 * }
 * ```
 */
export class ErrorEnricher {
  private failureAnalyzer: FailureAnalyzer;
  private config: ErrorEnrichmentConfig;

  /**
   * Creates a new ErrorEnricher instance
   *
   * @param {Partial<ErrorEnrichmentConfig>} [config] - Optional configuration overrides
   *
   * @example
   * ```typescript
   * // Using default configuration
   * const enricher = new ErrorEnricher();
   *
   * // With custom configuration
   * const enricher = new ErrorEnricher({
   *   enabled: true,
   *   maxSuggestions: 3,
   *   confidenceThreshold: 0.8,
   * });
   * ```
   */
  constructor(config?: Partial<ErrorEnrichmentConfig>) {
    this.failureAnalyzer = new FailureAnalyzer();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Enrich an ExecutionResult with StandardError
   *
   * Performs comprehensive error analysis and enrichment:
   * 1. Runs FailureAnalyzer to detect patterns
   * 2. Maps ErrorType to specific ErrorCode
   * 3. Determines severity level
   * 4. Generates actionable suggestions
   * 5. Builds execution context
   *
   * Returns null if execution was successful.
   *
   * @param {ExecutionResult} result - The execution result to analyze
   * @param {string} toolName - Name of the tool that produced the result
   * @param {Partial<ErrorContext>} [context] - Optional additional context
   * @returns {Promise<StandardError | null>} Enriched error or null if successful
   *
   * @example
   * ```typescript
   * const result = await executor.execute("make", ["test"]);
   * const error = await enricher.enrich(result, "make_test", {
   *   workingDirectory: "/custom/path",
   * });
   *
   * if (error) {
   *   console.log(`Error: ${error.code}`);
   *   console.log(`Severity: ${error.severity}`);
   *   console.log(`Suggestions: ${error.suggestions.length}`);
   * }
   * ```
   */
  async enrich(
    result: ExecutionResult,
    toolName: string,
    context?: Partial<ErrorContext>,
  ): Promise<StandardError | null> {
    // Early return if successful
    if (result.success) {
      return null;
    }

    // Run failure analysis
    const analysis = this.failureAnalyzer.analyze(result);

    // Map ErrorType to specific ErrorCode
    const errorCode = this.selectErrorCode(analysis.errorType, result, analysis);

    // Get ErrorCategory from ErrorType
    const category = getCategoryForType(analysis.errorType);

    // Determine severity
    const severity = this.determineSeverity(analysis, result);

    // Generate enriched suggestions
    const suggestions = await this.generateSuggestions(analysis);

    // Build error context
    const errorContext = this.buildContext(toolName, analysis, context);

    // Format details
    const details = this.formatDetails(result, analysis);

    return {
      code: errorCode,
      category,
      severity,
      message: analysis.errorSummary,
      details,
      suggestions,
      context: errorContext,
      raw: {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        duration: result.duration,
        command: result.command,
      },
      patterns: analysis.patterns,
      confidence: analysis.confidence,
    };
  }

  /**
   * Select the most specific ErrorCode for the given error type
   *
   * Uses heuristics to choose the most appropriate error code:
   * - Exit code 127 → COMMAND_NOT_FOUND
   * - Timeout patterns → TEST_TIMEOUT or BUILD_TIMEOUT
   * - Coverage patterns → COVERAGE_TOO_LOW
   * - Snapshot patterns → SNAPSHOT_MISMATCH
   * - Missing module patterns → MODULE_NOT_FOUND
   * - Dependency conflict patterns → DEPENDENCY_CONFLICT
   * - Security patterns → SECURITY_VULNERABILITY or SECRET_LEAK
   * - Permission patterns → PERMISSION_DENIED
   * - Falls back to first code for error type
   *
   * @param {ErrorType} errorType - Classified error type from FailureAnalyzer
   * @param {ExecutionResult} result - Execution result with command and output
   * @param {AnalysisResult} analysis - Complete analysis with patterns
   * @returns {ErrorCode} Most specific error code
   * @private
   */
  private selectErrorCode(
    errorType: ErrorType,
    result: ExecutionResult,
    analysis: AnalysisResult,
  ): ErrorCode {
    const possibleCodes = getErrorCodesForType(errorType);
    const combinedOutput = `${result.stdout}\n${result.stderr}`.toLowerCase();

    // Exit code 127 always means command not found
    if (result.exitCode === 127) {
      return ErrorCode.MODULE_NOT_FOUND;
    }

    // Check for timeout patterns
    if (/timeout|timed out|time limit exceeded/i.test(combinedOutput)) {
      if (errorType === ErrorType.TestFailure) {
        return ErrorCode.TEST_TIMEOUT;
      }
      if (errorType === ErrorType.BuildError) {
        return ErrorCode.BUILD_TIMEOUT;
      }
    }

    // Check for coverage patterns
    if (
      errorType === ErrorType.TestFailure &&
      /coverage.*(?:below|too low|insufficient|failed)/i.test(combinedOutput)
    ) {
      return ErrorCode.COVERAGE_TOO_LOW;
    }

    // Check for snapshot mismatch
    if (
      errorType === ErrorType.TestFailure &&
      /snapshot.*(?:mismatch|failed|differ)/i.test(combinedOutput)
    ) {
      return ErrorCode.SNAPSHOT_MISMATCH;
    }

    // Check for module not found patterns
    if (
      errorType === ErrorType.BuildError &&
      /(?:cannot find module|module not found|no such file)/i.test(combinedOutput)
    ) {
      return ErrorCode.MODULE_NOT_FOUND;
    }

    // Check for dependency conflicts
    if (
      errorType === ErrorType.DependencyIssue &&
      /(?:conflict|incompatible|peer dep|version mismatch)/i.test(combinedOutput)
    ) {
      return ErrorCode.DEPENDENCY_CONFLICT;
    }

    // Check for security-specific patterns
    if (errorType === ErrorType.SecurityIssue) {
      if (/(?:secret|token|password|api.?key).*(?:leak|exposed|hardcoded)/i.test(combinedOutput)) {
        return ErrorCode.SECRET_LEAK;
      }
      if (/(?:permission denied|access denied|forbidden|unauthorized)/i.test(combinedOutput)) {
        return ErrorCode.PERMISSION_DENIED;
      }
      return ErrorCode.SECURITY_VULNERABILITY;
    }

    // Check pattern names for specific error codes
    for (const pattern of analysis.patterns) {
      const patternName = pattern.name.toLowerCase();
      if (patternName.includes("race") || patternName.includes("flaky")) {
        return ErrorCode.FLAKY_TEST;
      }
      if (patternName.includes("memory")) {
        return ErrorCode.MEMORY_LEAK;
      }
      if (patternName.includes("performance")) {
        return ErrorCode.PERFORMANCE_REGRESSION;
      }
    }

    // Default to first (most general) code for the error type
    return possibleCodes[0] ?? ErrorCode.UNKNOWN_ERROR;
  }

  /**
   * Determine the severity level for an error
   *
   * Severity classification:
   * - CRITICAL: Security issues, data loss, system failures
   * - ERROR: Test failures, build failures, runtime errors
   * - WARNING: Lint issues, low coverage, deprecations
   * - INFO: Successful with notes, configuration suggestions
   *
   * @param {AnalysisResult} analysis - Failure analysis results
   * @param {ExecutionResult} result - Execution result
   * @returns {ErrorSeverity} Severity level
   * @private
   */
  private determineSeverity(
    analysis: AnalysisResult,
    result: ExecutionResult,
  ): ErrorSeverity {
    // Security issues are always critical
    if (analysis.errorType === ErrorType.SecurityIssue) {
      return ErrorSeverity.CRITICAL;
    }

    // High-severity patterns indicate critical issues
    const hasHighSeverityPattern = analysis.patterns.some(
      (p) => p.severity === "high",
    );
    if (hasHighSeverityPattern) {
      return ErrorSeverity.CRITICAL;
    }

    // System outages and resource limits are critical
    const combinedOutput = `${result.stdout}\n${result.stderr}`.toLowerCase();
    if (
      /(?:system outage|out of memory|disk full|resource limit)/i.test(combinedOutput)
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // Lint issues are warnings (unless high severity pattern)
    if (analysis.errorType === ErrorType.LintIssue) {
      return ErrorSeverity.WARNING;
    }

    // Low coverage is a warning
    if (/coverage.*(?:below|too low)/i.test(combinedOutput)) {
      return ErrorSeverity.WARNING;
    }

    // Configuration issues are warnings
    if (analysis.errorType === ErrorType.ConfigurationIssue) {
      return ErrorSeverity.WARNING;
    }

    // Everything else is an error (tests, builds, dependencies, runtime)
    return ErrorSeverity.ERROR;
  }

  /**
   * Generate actionable suggestions from analysis results
   *
   * Converts AnalysisResult suggestions into ErrorSuggestion structures with:
   * - Priority based on pattern severity
   * - Category from error type
   * - Confidence filtering
   * - Limit to maxSuggestions
   *
   * If includeSuggestions is false, returns minimal suggestions.
   *
   * @param {AnalysisResult} analysis - Failure analysis results
   * @returns {Promise<ErrorSuggestion[]>} Array of actionable suggestions
   * @private
   */
  private async generateSuggestions(
    analysis: AnalysisResult,
  ): Promise<ErrorSuggestion[]> {
    const suggestions: ErrorSuggestion[] = [];

    // If suggestions disabled, return minimal suggestion
    if (!this.config.includeSuggestions) {
      suggestions.push({
        title: "Review Error Output",
        description: "Check the error output for details",
        category: getCategoryForType(analysis.errorType),
        priority: "medium",
      });
      return suggestions;
    }

    // Only include suggestions above confidence threshold
    if (analysis.confidence < this.config.confidenceThreshold) {
      suggestions.push({
        title: "Low Confidence Analysis",
        description: `Error analysis has low confidence (${(analysis.confidence * 100).toFixed(0)}%). Review raw output for details.`,
        category: getCategoryForType(analysis.errorType),
        priority: "low",
      });
      return suggestions;
    }

    // Convert pattern suggestions to ErrorSuggestion structures
    for (const pattern of analysis.patterns) {
      // Map pattern severity to suggestion priority
      const priority: "high" | "medium" | "low" =
        pattern.severity === "high"
          ? "high"
          : pattern.severity === "medium"
            ? "medium"
            : "low";

      // Add each suggestion from the pattern
      for (const action of pattern.suggestions.slice(0, 2)) {
        suggestions.push({
          title: pattern.name,
          description: pattern.context || `Issue detected: ${pattern.name}`,
          category: getCategoryForType(analysis.errorType),
          priority,
          action,
        });

        // Stop if we've reached max suggestions
        if (suggestions.length >= this.config.maxSuggestions) {
          return suggestions;
        }
      }
    }

    // If no pattern-based suggestions, add generic ones
    if (suggestions.length === 0) {
      suggestions.push({
        title: "Review Error Details",
        description: analysis.errorSummary,
        category: getCategoryForType(analysis.errorType),
        priority: "medium",
      });

      for (const action of analysis.suggestedActions.slice(0, this.config.maxSuggestions - 1)) {
        suggestions.push({
          title: "Suggested Action",
          description: action,
          category: getCategoryForType(analysis.errorType),
          priority: "medium",
        });
      }
    }

    return suggestions.slice(0, this.config.maxSuggestions);
  }

  /**
   * Build error context with environment, files, and metadata
   *
   * Merges provided context with:
   * - Affected files from analysis
   * - Sanitized environment variables
   * - Current timestamp
   * - Working directory
   *
   * If includeContext is false, provides minimal context.
   *
   * @param {string} toolName - Name of the tool
   * @param {AnalysisResult} analysis - Failure analysis results
   * @param {Partial<ErrorContext>} [context] - Optional additional context
   * @returns {ErrorContext} Complete error context
   * @private
   */
  private buildContext(
    toolName: string,
    analysis: AnalysisResult,
    context?: Partial<ErrorContext>,
  ): ErrorContext {
    const baseContext: ErrorContext = {
      toolName,
      workingDirectory: context?.workingDirectory ?? process.cwd(),
      timestamp: new Date(),
    };

    // If context disabled, return minimal context
    if (!this.config.includeContext) {
      return baseContext;
    }

    // Add affected files from analysis
    if (analysis.affectedFiles.length > 0) {
      baseContext.affectedFiles = analysis.affectedFiles;
    }

    // Add sanitized environment
    baseContext.environment = this.sanitizeEnv();

    // Merge with provided context
    return {
      ...baseContext,
      ...context,
      timestamp: baseContext.timestamp, // Always use new timestamp
    };
  }

  /**
   * Format detailed error information for human readability
   *
   * Creates a summary including:
   * - Error type and pattern matches
   * - Affected files (if any)
   * - Confidence score
   * - Key excerpts from output
   *
   * @param {ExecutionResult} result - Execution result
   * @param {AnalysisResult} analysis - Failure analysis results
   * @returns {string} Formatted details string
   * @private
   */
  private formatDetails(
    result: ExecutionResult,
    analysis: AnalysisResult,
  ): string {
    const parts: string[] = [];

    // Add error type
    parts.push(`Error Type: ${analysis.errorType}`);

    // Add pattern information
    if (analysis.patterns.length > 0) {
      parts.push(
        `Matched Patterns: ${analysis.patterns.map((p) => p.name).join(", ")}`,
      );
    }

    // Add affected files
    if (analysis.affectedFiles.length > 0) {
      parts.push(
        `Affected Files: ${analysis.affectedFiles.slice(0, 5).join(", ")}${
          analysis.affectedFiles.length > 5
            ? ` and ${analysis.affectedFiles.length - 5} more`
            : ""
        }`,
      );
    }

    // Add confidence
    parts.push(`Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);

    // Add key error excerpts (first 3 lines of stderr)
    if (result.stderr) {
      const errorLines = result.stderr.split("\n").slice(0, 3);
      if (errorLines.length > 0) {
        parts.push(`Error Output:\n${errorLines.join("\n")}`);
      }
    }

    return parts.join("\n");
  }

  /**
   * Sanitize environment variables for inclusion in error context
   *
   * Removes sensitive variables (tokens, secrets, passwords) and keeps only
   * safe, relevant variables (NODE_ENV, CI, etc.).
   *
   * Long values are truncated to 100 characters.
   *
   * @returns {Record<string, string>} Sanitized environment variables
   * @private
   */
  private sanitizeEnv(): Record<string, string> {
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(process.env)) {
      // Skip undefined values
      if (value === undefined) {
        continue;
      }

      // Skip sensitive variables
      if (
        Array.from(SENSITIVE_ENV_VARS).some((sensitive) =>
          key.toUpperCase().includes(sensitive),
        )
      ) {
        continue;
      }

      // Only include safe variables
      if (SAFE_ENV_VARS.has(key)) {
        // Truncate long values
        sanitized[key] = value.length > 100 ? `${value.slice(0, 100)}...` : value;
      }
    }

    return sanitized;
  }
}
