/**
 * Failure Analyzer
 *
 * Analyzes execution results to extract failure patterns, error types,
 * and contextual information for generating smart suggestions.
 */

import { ExecutionResult } from './shell-executor.js';
import { KnowledgeBase, FailurePattern } from './knowledge-base.js';

export interface AnalysisResult {
  failureDetected: boolean;
  patterns: FailurePattern[];
  errorType: ErrorType;
  errorSummary: string;
  affectedFiles: string[];
  suggestedActions: string[];
  confidence: number;
}

export enum ErrorType {
  BuildError = 'build',
  TestFailure = 'test',
  LintIssue = 'lint',
  DependencyIssue = 'dependency',
  ConfigurationIssue = 'configuration',
  SecurityIssue = 'security',
  PerformanceIssue = 'performance',
  RuntimeError = 'runtime',
  Unknown = 'unknown'
}

export class FailureAnalyzer {
  private knowledgeBase: KnowledgeBase;

  constructor(knowledgeBase?: KnowledgeBase) {
    this.knowledgeBase = knowledgeBase || new KnowledgeBase();
  }

  /**
   * Analyze execution result and generate suggestions
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
   * Analyze multiple execution results for trend analysis
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
