/**
 * Failure Analyzer
 *
 * Analyzes execution results to extract failure patterns, error types,
 * and contextual information for generating smart suggestions.
 */

import { ExecutionResult } from './shell-executor.js';
import { KnowledgeBase, FailurePattern } from './knowledge-base.js';

/**
 * Result of analyzing a command execution for failures and patterns
 * @property {boolean} failureDetected - Whether any failures were detected in the execution
 * @property {FailurePattern[]} patterns - Array of matched failure patterns with suggestions
 * @property {ErrorType} errorType - Classified type of error (build, test, security, etc.)
 * @property {string} errorSummary - Human-readable summary of the error and primary issue
 * @property {string[]} affectedFiles - Files affected by the error (extracted from output)
 * @property {string[]} suggestedActions - Recommended actions to resolve the failure
 * @property {number} confidence - Confidence score (0.0-1.0) in the analysis accuracy
 */
export interface AnalysisResult {
  failureDetected: boolean;
  patterns: FailurePattern[];
  errorType: ErrorType;
  errorSummary: string;
  affectedFiles: string[];
  suggestedActions: string[];
  confidence: number;
}

/**
 * Classification of error types for better categorization and handling
 */
export enum ErrorType {
  /** Build and compilation failures */
  BuildError = 'build',
  /** Test execution failures and test-related issues */
  TestFailure = 'test',
  /** Linting and code style violations */
  LintIssue = 'lint',
  /** Dependency resolution and package management issues */
  DependencyIssue = 'dependency',
  /** Configuration and environment setup problems */
  ConfigurationIssue = 'configuration',
  /** Security vulnerabilities and unsafe practices */
  SecurityIssue = 'security',
  /** Performance issues and bottlenecks */
  PerformanceIssue = 'performance',
  /** Runtime errors during execution */
  RuntimeError = 'runtime',
  /** Unknown or unclassified error types */
  Unknown = 'unknown'
}

/**
 * Analyzer for detecting and categorizing command execution failures
 *
 * The FailureAnalyzer examines execution results to identify failure patterns,
 * extract affected files, classify error types, and calculate confidence scores
 * for its analysis. It leverages the KnowledgeBase for pattern matching.
 */
export class FailureAnalyzer {
  private knowledgeBase: KnowledgeBase;

  /**
   * Creates a new FailureAnalyzer instance
   *
   * @param {KnowledgeBase} [knowledgeBase] - Optional knowledge base to use for pattern matching.
   *                                          If not provided, creates a new instance.
   *
   * @example
   * ```typescript
   * // Using default knowledge base
   * const analyzer = new FailureAnalyzer();
   *
   * // Using custom knowledge base
   * const customKB = new KnowledgeBase();
   * const analyzer = new FailureAnalyzer(customKB);
   * ```
   */
  constructor(knowledgeBase?: KnowledgeBase) {
    this.knowledgeBase = knowledgeBase || new KnowledgeBase();
  }

  /**
   * Analyze an execution result to detect failures and generate suggestions
   *
   * Performs comprehensive analysis of command execution results including:
   * - Pattern matching against known failure types
   * - Error type classification
   * - File path extraction from error messages
   * - Confidence scoring based on pattern matches
   * - Generation of actionable suggestions
   *
   * @param {ExecutionResult} result - The execution result to analyze
   * @returns {AnalysisResult} Analysis result with failure detection, patterns, and suggestions
   *
   * @example
   * ```typescript
   * const result = await executor.execute('go test', ['./...']);
   * const analysis = analyzer.analyze(result);
   *
   * if (analysis.failureDetected) {
   *   console.log('Error:', analysis.errorSummary);
   *   console.log('Suggestions:', analysis.suggestedActions);
   * }
   * ```
   */
  analyze(result: ExecutionResult): AnalysisResult {
    // If execution was successful, return early
    if (result.success) {
      return {
        failureDetected: false,
        patterns: [],
        errorType: ErrorType.Unknown,
        errorSummary: '',
        affectedFiles: [],
        suggestedActions: ['No issues detected'],
        confidence: 1.0
      };
    }

    // Combine stdout and stderr for analysis
    const combinedOutput = `${result.stdout}\n${result.stderr}`.trim();

    // Determine error type
    const errorType = this.determineErrorType(combinedOutput, result);

    // Find matching patterns - search ALL categories to catch multiple issue types
    // This allows us to detect compound failures (e.g., dependency + race condition)
    const matchedPatterns = this.knowledgeBase.findMatchingPatterns(
      combinedOutput,
      undefined // undefined means search all categories
    );

    // Extract affected files
    const affectedFiles = this.extractAffectedFiles(combinedOutput);

    // Generate error summary
    const errorSummary = this.generateErrorSummary(
      result,
      matchedPatterns,
      errorType
    );

    // Aggregate suggestions from matched patterns
    const suggestedActions = this.aggregateSuggestions(matchedPatterns);

    // Calculate confidence based on pattern matches
    const confidence = this.calculateConfidence(matchedPatterns, combinedOutput);

    return {
      failureDetected: true,
      patterns: matchedPatterns,
      errorType,
      errorSummary,
      affectedFiles,
      suggestedActions,
      confidence
    };
  }

  /**
   * Determine the error type from command output and execution context
   *
   * Uses a combination of pattern matching and command context to classify
   * the type of error. Pattern-based detection takes precedence over command-based
   * detection for more accurate classification.
   *
   * @param {string} output - Combined stdout and stderr output from command execution
   * @param {ExecutionResult} result - Complete execution result including command info
   * @returns {ErrorType} Classified error type
   * @private
   */
  private determineErrorType(
    output: string,
    result: ExecutionResult
  ): ErrorType {
    // Pattern-based detection (more specific) should come BEFORE command-based detection
    // This ensures we catch specific error types even when command suggests something else

    // High-priority pattern detection
    if (/cannot find (module|package)/i.test(output)) {
      return ErrorType.DependencyIssue;
    }
    if (/security|vulnerabilit(y|ies)|CVE/i.test(output)) {
      return ErrorType.SecurityIssue;
    }
    if (/WARNING: DATA RACE|data race/i.test(output)) {
      return ErrorType.SecurityIssue;
    }

    // Use command context as secondary indicator
    if (result.command.includes('test')) return ErrorType.TestFailure;
    if (result.command.includes('lint')) return ErrorType.LintIssue;

    // More pattern-based detection
    if (/FAIL|failed|failure/i.test(output) && /test/i.test(output)) {
      return ErrorType.TestFailure;
    }
    if (/error|warning/i.test(output) && /lint/i.test(output)) {
      return ErrorType.LintIssue;
    }
    if (/environment variable|config|\.env/i.test(output)) {
      return ErrorType.ConfigurationIssue;
    }
    if (/timeout|slow|performance/i.test(output)) {
      return ErrorType.PerformanceIssue;
    }

    // Build-related command comes after specific pattern checks
    if (result.command.includes('build')) return ErrorType.BuildError;

    if (/undefined|undeclared|not found/i.test(output)) {
      return ErrorType.BuildError;
    }

    return ErrorType.Unknown;
  }


  /**
   * Extract file paths from error output using common error message patterns
   *
   * Scans the command output for file paths using language-specific patterns:
   * - Go-style: ./path/to/file.go:123:45
   * - JavaScript-style: at /path/to/file.js:123:45
   * - Python-style: File "/path/to/file.py", line 123
   * - Generic: /path/to/file.ext
   *
   * @param {string} output - Command output to scan for file paths
   * @returns {string[]} Array of unique file paths found in the output
   * @private
   */
  private extractAffectedFiles(output: string): string[] {
    const files: Set<string> = new Set();

    // Common patterns for file paths in error messages
    const filePatterns = [
      // Go-style: ./path/to/file.go:123:45
      /(?:\.\/)?([a-zA-Z0-9_/-]+\.[a-z]+):\d+(?::\d+)?/g,
      // JavaScript-style: at /path/to/file.js:123:45
      /at\s+([a-zA-Z0-9_/-]+\.[a-z]+):\d+:\d+/g,
      // Python-style: File "/path/to/file.py", line 123
      /File\s+"([^"]+\.py)".*?line\s+\d+/g,
      // Generic: /path/to/file.ext
      /(?:^|\s)([a-zA-Z0-9_/-]+\.[a-z]{2,4})(?:\s|$)/g
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(output)) !== null) {
        if (match[1]) {
          files.add(match[1]);
        }
      }
    }

    return Array.from(files);
  }

  /**
   * Generate a human-readable error summary
   *
   * Creates a concise, actionable summary of the error. Prefers pattern-based
   * summaries when available, falls back to generic error type descriptions.
   *
   * @param {ExecutionResult} result - Execution result with exit code and command info
   * @param {FailurePattern[]} patterns - Matched failure patterns
   * @param {ErrorType} errorType - Classified error type
   * @returns {string} Human-readable error summary
   * @private
   */
  private generateErrorSummary(
    result: ExecutionResult,
    patterns: FailurePattern[],
    errorType: ErrorType
  ): string {
    if (patterns.length > 0) {
      const primaryPattern = patterns[0];
      return `${primaryPattern.name}: ${primaryPattern.suggestions[0]}`;
    }

    // Fallback to generic summary
    const errorTypeMap: Record<ErrorType, string> = {
      [ErrorType.BuildError]: 'Build failed with compilation errors',
      [ErrorType.TestFailure]: 'Tests failed',
      [ErrorType.LintIssue]: 'Linting issues detected',
      [ErrorType.DependencyIssue]: 'Dependency resolution failed',
      [ErrorType.ConfigurationIssue]: 'Configuration error',
      [ErrorType.SecurityIssue]: 'Security vulnerability detected',
      [ErrorType.PerformanceIssue]: 'Performance issue identified',
      [ErrorType.RuntimeError]: 'Runtime error occurred',
      [ErrorType.Unknown]: `Command failed with exit code ${result.exitCode}`
    };

    return errorTypeMap[errorType];
  }

  /**
   * Aggregate suggestions from multiple matched patterns
   *
   * Combines suggestions from the top matched patterns, prioritizing the most
   * relevant suggestions. Limits to top 3 patterns with top 2 suggestions each,
   * then removes duplicates and limits total to 5 suggestions.
   *
   * @param {FailurePattern[]} patterns - Matched failure patterns with suggestions
   * @returns {string[]} Array of unique, prioritized suggestions (max 5)
   * @private
   */
  private aggregateSuggestions(
    patterns: FailurePattern[]
  ): string[] {
    const suggestions: string[] = [];

    // Add pattern-specific suggestions
    for (const pattern of patterns.slice(0, 3)) {
      // Limit to top 3 patterns
      suggestions.push(...pattern.suggestions.slice(0, 2)); // Top 2 suggestions per pattern
    }

    // Add general suggestions if no patterns matched
    if (suggestions.length === 0) {
      suggestions.push('Review the error output above for details');
      suggestions.push('Check recent code changes for potential issues');
    }

    // Remove duplicates and limit total
    return Array.from(new Set(suggestions)).slice(0, 5);
  }

  /**
   * Calculate confidence score for failure pattern matches
   *
   * Algorithm:
   * 1. Base confidence starts at 0.5 for any matches (0.3 for no matches)
   * 2. Increase by 0.15 for each additional pattern match (max +0.3)
   * 3. Increase by 0.1 for each high-severity match
   * 4. Decrease by 10% for very long output (>5000 chars, likely multiple issues)
   * 5. Clamp final score to [0.0, 1.0]
   *
   * @param {FailurePattern[]} patterns - Matched failure patterns
   * @param {string} output - Command output
   * @returns {number} Confidence score between 0.0 and 1.0
   *
   * @example
   * ```typescript
   * const confidence = calculateConfidence(
   *   [goTestPattern, raceConditionPattern],
   *   stderr
   * );
   * // Returns: ~0.8 (high confidence with 2 patterns, including high-severity)
   * ```
   *
   * @private
   */
  private calculateConfidence(
    patterns: FailurePattern[],
    output: string
  ): number {
    if (patterns.length === 0) return 0.3; // Low confidence with no matches

    // Base confidence on number of matches and pattern specificity
    let confidence = 0.5;

    // Increase confidence for each matched pattern
    confidence += Math.min(patterns.length * 0.15, 0.3);

    // Increase confidence for high-severity matches
    const highSeverityMatches = patterns.filter(p => p.severity === 'high').length;
    confidence += highSeverityMatches * 0.1;

    // Decrease confidence for very long output (likely multiple issues)
    if (output.length > 5000) {
      confidence *= 0.9;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Analyze multiple execution results to identify trends and patterns
   *
   * Performs trend analysis across multiple command executions to identify:
   * - Common error patterns across executions
   * - Success rate calculations
   * - Workflow improvement recommendations
   * - Recurring issues that need attention
   *
   * @param {ExecutionResult[]} results - Array of execution results to analyze for trends
   * @returns {{
   *   commonErrors: string[];
   *   successRate: number;
   *   recommendations: string[];
   * }} Trend analysis results with common errors, success rate, and recommendations
   *
   * @example
   * ```typescript
   * const results = [
   *   await executor.execute('npm test'),
   *   await executor.execute('npm run lint'),
   *   await executor.execute('npm run build')
   * ];
   *
   * const trends = analyzer.analyzeTrends(results);
   * console.log(`Success rate: ${(trends.successRate * 100).toFixed(1)}%`);
   * console.log('Common errors:', trends.commonErrors);
   * ```
   */
  analyzeTrends(results: ExecutionResult[]): {
    commonErrors: string[];
    successRate: number;
    recommendations: string[];
  } {
    const totalResults = results.length;
    const successfulResults = results.filter(r => r.success).length;
    const successRate = totalResults > 0 ? successfulResults / totalResults : 0;

    // Collect all error types
    const errorCounts: Map<string, number> = new Map();

    for (const result of results) {
      if (!result.success) {
        const analysis = this.analyze(result);
        for (const pattern of analysis.patterns) {
          const count = errorCounts.get(pattern.name) || 0;
          errorCounts.set(pattern.name, count + 1);
        }
      }
    }

    // Sort by frequency
    const commonErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 5);

    // Generate recommendations based on trends
    const recommendations: string[] = [];

    if (successRate < 0.5) {
      recommendations.push('Low success rate detected - consider reviewing recent changes');
    }

    if (commonErrors.length > 0) {
      recommendations.push(`Focus on fixing: ${commonErrors[0]} (most common issue)`);
    }

    if (successRate > 0.9) {
      recommendations.push('Excellent success rate - current workflow is effective');
    }

    return {
      commonErrors,
      successRate,
      recommendations
    };
  }
}
