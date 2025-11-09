/**
 * Suggestion Engine
 *
 * Core engine that generates intelligent suggestions based on failure analysis,
 * project context, and historical patterns.
 */

import { createHash } from "crypto";
import { ExecutionResult } from "./shell-executor.js";
import {
  FailureAnalyzer,
  AnalysisResult,
  ErrorType,
} from "./failure-analyzer.js";
import { KnowledgeBase } from "./knowledge-base.js";
import { ProjectDetector, ProjectType } from "./project-detector.js";
import { getCacheManager } from "./cache-manager.js";
import { logger } from "./logger.js";

/**
 * Context information for generating more accurate suggestions
 * @property {string} [tool] - The tool or command that was executed
 * @property {string} [language] - Programming language being used
 * @property {ProjectType} [projectType] - Type of project (NodeJS, Go, Python, etc.)
 * @property {string} [command] - The full command that was executed
 * @property {string} [workingDirectory] - Working directory where command was executed
 */
export interface SuggestionContext {
  tool?: string;
  language?: string;
  projectType?: ProjectType;
  command?: string;
  workingDirectory?: string;
}

/**
 * A smart suggestion with actionable recommendations for fixing issues
 * @property {string} title - Brief title describing the suggestion
 * @property {string} description - Detailed description of the issue and context
 * @property {string[]} actions - Array of specific, actionable steps to resolve the issue
 * @property {'high' | 'medium' | 'low'} priority - Priority level indicating urgency of the suggestion
 * @property {string} category - Category classification (security, performance, build, etc.)
 * @property {number} confidence - Confidence score (0.0-1.0) in the suggestion's relevance
 * @property {string[]} [relatedFiles] - Files related to the issue that may need attention
 */
export interface SmartSuggestion {
  title: string;
  description: string;
  actions: string[];
  priority: "high" | "medium" | "low";
  category: string;
  confidence: number;
  relatedFiles?: string[];
}

/**
 * Result of suggestion engine analysis with comprehensive recommendations
 * @property {boolean} success - Whether the original command execution was successful
 * @property {AnalysisResult} analysis - Detailed failure analysis results
 * @property {SmartSuggestion[]} suggestions - Array of prioritized smart suggestions
 * @property {string} summary - Human-readable summary of the analysis and key findings
 * @property {number} executionTime - Time taken to perform the analysis in milliseconds
 */
export interface SuggestionEngineResult {
  success: boolean;
  analysis: AnalysisResult;
  suggestions: SmartSuggestion[];
  summary: string;
  executionTime: number;
}

/**
 * Core engine for generating intelligent, context-aware suggestions
 *
 * The SuggestionEngine orchestrates failure analysis, pattern matching, and contextual
 * recommendation generation. It combines multiple sources of information including
 * execution results, project type, and historical patterns to provide actionable suggestions.
 */
export class SuggestionEngine {
  private knowledgeBase: KnowledgeBase;
  private failureAnalyzer: FailureAnalyzer;
  private projectDetector: ProjectDetector;
  private cacheManager = getCacheManager();

  /**
   * Creates a new SuggestionEngine instance
   *
   * @param {string} [projectRoot] - Optional project root directory for context detection.
   *                                 Defaults to current working directory if not provided.
   *
   * @example
   * ```typescript
   * // Using current directory
   * const engine = new SuggestionEngine();
   *
   * // Using specific project directory
   * const engine = new SuggestionEngine('/path/to/project');
   * ```
   */
  constructor(projectRoot?: string) {
    this.knowledgeBase = new KnowledgeBase();
    this.failureAnalyzer = new FailureAnalyzer(this.knowledgeBase);
    this.projectDetector = new ProjectDetector(projectRoot);
  }

  /**
   * Generate intelligent, context-aware suggestions based on execution results
   *
   * This method performs comprehensive analysis including:
   * - Failure pattern detection and matching
   * - Error type classification
   * - Project context consideration (language, type, tools)
   * - Actionable suggestion generation
   * - Workflow optimization recommendations
   *
   * @param {ExecutionResult} result - The execution result to analyze
   * @param {SuggestionContext} [context] - Optional context about the project and command
   * @returns {Promise<SuggestionEngineResult>} Generated suggestions with analysis
   *
   * @example
   * ```typescript
   * const result = await executor.execute('go test', ['./...']);
   * const suggestions = await engine.generateSuggestions(result, {
   *   projectType: ProjectType.Go,
   *   language: 'go'
   * });
   * console.log(suggestions.suggestions); // Array of smart suggestions
   * ```
   */
  async generateSuggestions(
    result: ExecutionResult,
    context?: SuggestionContext,
  ): Promise<SuggestionEngineResult> {
    const startTime = Date.now();

    // Try cache first
    const cacheKey = this.buildCacheKey(result, context);
    const cached = this.cacheManager.get<SuggestionEngineResult>(
      "smartSuggestions",
      cacheKey,
    );

    if (cached) {
      logger.debug("Smart suggestions cache HIT", {
        command: result.command,
        exitCode: result.exitCode,
      });
      return cached;
    }

    logger.debug("Smart suggestions cache MISS", {
      command: result.command,
      exitCode: result.exitCode,
    });

    // Analyze the failure
    const analysis = this.failureAnalyzer.analyze(result);

    // Generate smart suggestions
    const suggestions = await this.createSmartSuggestions(analysis, context);

    // Generate summary
    const summary = this.generateSummary(analysis, suggestions);

    const executionTime = Date.now() - startTime;

    const engineResult: SuggestionEngineResult = {
      success: !analysis.failureDetected,
      analysis,
      suggestions,
      summary,
      executionTime,
    };

    // Store in cache
    this.cacheManager.set("smartSuggestions", cacheKey, engineResult);

    return engineResult;
  }

  /**
   * Create smart suggestions from analysis results and context
   *
   * Generates multiple types of suggestions:
   * - Pattern-based suggestions from matched failure patterns
   * - Context-aware suggestions based on project type and language
   * - Workflow optimization suggestions
   * - Success recommendations for passing executions
   *
   * @param {AnalysisResult} analysis - Failure analysis results
   * @param {SuggestionContext} [context] - Optional project and command context
   * @returns {Promise<SmartSuggestion[]>} Array of prioritized smart suggestions
   * @private
   */
  private async createSmartSuggestions(
    analysis: AnalysisResult,
    context?: SuggestionContext,
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // If no failure detected, return success suggestions with workflow recommendations
    if (!analysis.failureDetected) {
      suggestions.push({
        title: "All checks passed",
        description: "No issues detected in the execution",
        actions: ["Continue with development workflow"],
        priority: "low",
        category: "general",
        confidence: 1.0,
      });

      // Add workflow optimization suggestions for successful builds
      suggestions.push({
        title: "Workflow Optimization",
        description: "Consider next steps in your development workflow",
        actions: [
          "Run tests if not already done",
          "Check code coverage",
          "Review and commit changes",
          "Create a pull request when ready",
        ],
        priority: "low",
        category: "workflow",
        confidence: 0.8,
      });

      return suggestions;
    }

    // Create suggestions from matched patterns
    for (const pattern of analysis.patterns.slice(0, 3)) {
      suggestions.push({
        title: pattern.name,
        description: this.formatPatternDescription(pattern, analysis),
        actions: pattern.suggestions,
        priority:
          pattern.severity === "high"
            ? "high"
            : pattern.severity === "medium"
              ? "medium"
              : "low",
        category: pattern.category,
        confidence: analysis.confidence,
        relatedFiles: analysis.affectedFiles,
      });
    }

    // Add context-aware suggestions
    const contextSuggestions = await this.generateContextAwareSuggestions(
      analysis,
      context,
    );
    suggestions.push(...contextSuggestions);

    // Add workflow optimization suggestions
    const workflowSuggestions = this.generateWorkflowSuggestions(analysis);
    suggestions.push(...workflowSuggestions);

    // Sort by priority and confidence
    return this.prioritizeSuggestions(suggestions);
  }

  /**
   * Format a pattern into a descriptive message with affected files
   *
   * Creates a human-readable description that includes the pattern's context
   * and lists affected files if available.
   *
   * @param {{ name: string; context?: string }} pattern - Pattern with name and optional context
   * @param {AnalysisResult} analysis - Analysis result containing affected files
   * @returns {string} Formatted description string
   * @private
   */
  private formatPatternDescription(
    pattern: { name: string; context?: string },
    analysis: AnalysisResult,
  ): string {
    let description = pattern.context || `Issue detected: ${pattern.name}`;

    if (analysis.affectedFiles.length > 0) {
      const fileList = analysis.affectedFiles.slice(0, 3).join(", ");
      description += `. Affected files: ${fileList}`;
      if (analysis.affectedFiles.length > 3) {
        description += ` and ${analysis.affectedFiles.length - 3} more`;
      }
    }

    return description;
  }

  /**
   * Generate suggestions tailored to project type and error context
   *
   * Provides language-specific and framework-specific suggestions based on:
   * - Detected project type (Go, Node.js, Python, etc.)
   * - Error type classification
   * - Available project context
   *
   * Examples:
   * - Go test failures → suggest verbose mode, race detection flags
   * - Node.js dependency issues → suggest npm cache clearing, peer dependencies
   * - Security issues → recommend secrets management best practices
   *
   * @param {AnalysisResult} analysis - Failure analysis results
   * @param {SuggestionContext} [context] - Optional project context
   * @returns {Promise<SmartSuggestion[]>} Array of context-aware suggestions
   * @private
   */
  private async generateContextAwareSuggestions(
    analysis: AnalysisResult,
    context?: SuggestionContext,
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    try {
      // Detect project type if not provided
      const projectInfo = await this.projectDetector.detectProject();
      const projectType = context?.projectType || projectInfo.type;

      // Language-specific suggestions
      if (
        projectType === ProjectType.Go &&
        analysis.errorType === ErrorType.TestFailure
      ) {
        suggestions.push({
          title: "Go Test Debugging Tips",
          description: "Additional debugging options for Go tests",
          actions: [
            "Run with `-v` for verbose output",
            "Use `-run <TestName>` to run specific test",
            "Add `-race` flag to detect race conditions",
            "Try `-count=1` to disable test caching",
          ],
          priority: "medium",
          category: "test",
          confidence: 0.8,
        });
      }

      if (
        projectType === ProjectType.NodeJS &&
        analysis.errorType === ErrorType.DependencyIssue
      ) {
        suggestions.push({
          title: "Node.js Dependency Resolution",
          description: "Steps to resolve Node.js dependency issues",
          actions: [
            "Clear npm cache: `npm cache clean --force`",
            "Remove node_modules and package-lock.json",
            "Run `npm install` with `--legacy-peer-deps` if peer dependency conflicts",
            "Check for conflicting versions in package.json",
          ],
          priority: "high",
          category: "dependencies",
          confidence: 0.9,
        });
      }

      if (analysis.errorType === ErrorType.SecurityIssue) {
        suggestions.push({
          title: "Security Best Practices",
          description: "Recommended actions for security issues",
          actions: [
            "Never commit secrets to version control",
            "Use environment variables for sensitive data",
            "Consider using a secrets management service",
            "Run security audit tools regularly",
          ],
          priority: "high",
          category: "security",
          confidence: 1.0,
        });
      }
    } catch {
      // If project detection fails, continue with basic suggestions
    }

    return suggestions;
  }

  /**
   * Generate workflow optimization suggestions based on error patterns
   *
   * Suggests improvements to development workflow such as:
   * - Pre-commit hooks for catching linting issues early
   * - Test organization improvements for widespread failures
   * - CI/CD integration recommendations
   *
   * @param {AnalysisResult} analysis - Failure analysis results
   * @returns {SmartSuggestion[]} Array of workflow improvement suggestions
   * @private
   */
  private generateWorkflowSuggestions(
    analysis: AnalysisResult,
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Suggest workflow improvements based on error type
    if (analysis.errorType === ErrorType.LintIssue) {
      suggestions.push({
        title: "Workflow Optimization: Pre-commit Hooks",
        description: "Catch linting issues before committing",
        actions: [
          "Set up pre-commit hooks with Husky",
          "Configure lint-staged to run linters on changed files",
          "Add linting to CI/CD pipeline",
          "Use editor extensions for real-time linting",
        ],
        priority: "low",
        category: "workflow",
        confidence: 0.7,
      });
    }

    if (
      analysis.errorType === ErrorType.TestFailure &&
      analysis.affectedFiles.length > 5
    ) {
      suggestions.push({
        title: "Test Organization Recommendation",
        description: "Multiple test files failing suggests structural issues",
        actions: [
          "Review shared test setup/teardown logic",
          "Check for environmental dependencies",
          "Consider test isolation improvements",
          "Run tests individually to identify root cause",
        ],
        priority: "medium",
        category: "test",
        confidence: 0.75,
      });
    }

    return suggestions;
  }

  /**
   * Prioritize and limit suggestions by priority and confidence
   *
   * Sorts suggestions by:
   * 1. Priority level (high > medium > low)
   * 2. Confidence score (higher first)
   *
   * Returns top 10 suggestions to avoid overwhelming the user.
   *
   * @param {SmartSuggestion[]} suggestions - Array of suggestions to prioritize
   * @returns {SmartSuggestion[]} Sorted and limited array (max 10 suggestions)
   * @private
   */
  private prioritizeSuggestions(
    suggestions: SmartSuggestion[],
  ): SmartSuggestion[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return suggestions
      .sort((a, b) => {
        // First sort by priority
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by confidence
        return b.confidence - a.confidence;
      })
      .slice(0, 10); // Limit to top 10 suggestions
  }

  /**
   * Generate a concise summary of the analysis and suggestions
   *
   * Creates a pipe-separated summary including:
   * - Error summary or success message
   * - Number of patterns matched
   * - Number of affected files
   * - Count of high-priority suggestions
   * - Confidence percentage
   *
   * @param {AnalysisResult} analysis - Failure analysis results
   * @param {SmartSuggestion[]} suggestions - Generated suggestions
   * @returns {string} Formatted summary string
   *
   * @example
   * ```typescript
   * // Example output:
   * // "Failure Analysis: Go Test Failures | Matched 2 known pattern(s) | 3 file(s) affected | 1 high-priority suggestion(s) | Confidence: 85%"
   * ```
   *
   * @private
   */
  private generateSummary(
    analysis: AnalysisResult,
    suggestions: SmartSuggestion[],
  ): string {
    if (!analysis.failureDetected) {
      return "Execution completed successfully with no issues detected.";
    }

    const parts: string[] = [];

    parts.push(`Failure Analysis: ${analysis.errorSummary}`);

    if (analysis.patterns.length > 0) {
      parts.push(`Matched ${analysis.patterns.length} known pattern(s)`);
    }

    if (analysis.affectedFiles.length > 0) {
      parts.push(`${analysis.affectedFiles.length} file(s) affected`);
    }

    const highPrioritySuggestions = suggestions.filter(
      (s) => s.priority === "high",
    ).length;
    if (highPrioritySuggestions > 0) {
      parts.push(`${highPrioritySuggestions} high-priority suggestion(s)`);
    }

    parts.push(`Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);

    return parts.join(" | ");
  }

  /**
   * Analyze command execution history to provide proactive workflow suggestions
   *
   * Examines patterns across multiple command executions to identify:
   * - Recurring failures that need attention
   * - Success rate trends
   * - Workflow optimization opportunities
   * - Preventive measures for common issues
   *
   * @param {ExecutionResult[]} results - Array of historical execution results to analyze
   * @returns {Promise<SmartSuggestion[]>} Array of proactive suggestions based on historical patterns
   *
   * @example
   * ```typescript
   * const history = await getCommandHistory();
   * const proactiveSuggestions = await engine.analyzeHistory(history);
   *
   * for (const suggestion of proactiveSuggestions) {
   *   if (suggestion.priority === 'high') {
   *     console.log('High priority:', suggestion.title);
   *   }
   * }
   * ```
   */
  async analyzeHistory(results: ExecutionResult[]): Promise<SmartSuggestion[]> {
    const trends = this.failureAnalyzer.analyzeTrends(results);
    const suggestions: SmartSuggestion[] = [];

    if (trends.successRate < 0.5) {
      suggestions.push({
        title: "Low Success Rate Detected",
        description: `Only ${(trends.successRate * 100).toFixed(0)}% of recent commands succeeded`,
        actions: [
          "Review recent code changes for breaking issues",
          "Check environment configuration",
          "Consider reverting to last known good state",
          "Run diagnostic tools to identify root cause",
        ],
        priority: "high",
        category: "workflow",
        confidence: 0.9,
      });
    }

    if (trends.commonErrors.length > 0) {
      suggestions.push({
        title: "Recurring Issues Detected",
        description: `Common error: ${trends.commonErrors[0]}`,
        actions: [
          ...trends.recommendations,
          "Address the root cause rather than repeated fixes",
          "Document the solution for future reference",
        ],
        priority: "high",
        category: "general",
        confidence: 0.85,
      });
    }

    return suggestions;
  }

  /**
   * Get statistics about the underlying knowledge base
   *
   * Provides insights into the pattern database used for failure detection,
   * including total pattern count and distribution across categories.
   *
   * @returns {{ totalPatterns: number; byCategory: Record<string, number> }}
   * Statistics about the knowledge base patterns
   *
   * @example
   * ```typescript
   * const stats = engine.getKnowledgeBaseStats();
   * console.log(`Engine has ${stats.totalPatterns} failure patterns`);
   * console.log('Coverage by category:', stats.byCategory);
   * ```
   */
  getKnowledgeBaseStats(): {
    totalPatterns: number;
    byCategory: Record<string, number>;
  } {
    return this.knowledgeBase.getStats();
  }

  /**
   * Build a cache key for smart suggestions based on execution result and context
   *
   * The cache key is constructed from:
   * - Command name and exit code
   * - SHA-256 hash of output (first 500 chars of stdout + stderr)
   * - Optional context parameters (tool, language, projectType)
   *
   * This ensures cache hits for identical failures while avoiding collisions.
   *
   * @param {ExecutionResult} result - The execution result
   * @param {SuggestionContext} [context] - Optional context information
   * @returns {string} Cache key string
   * @private
   */
  private buildCacheKey(
    result: ExecutionResult,
    context?: SuggestionContext,
  ): string {
    // Create a stable hash of the output (limit to first 500 chars to avoid huge keys)
    const outputSample = (result.stdout + result.stderr).substring(0, 500);
    const outputHash = createHash("sha256")
      .update(outputSample)
      .digest("hex")
      .substring(0, 16); // First 16 chars of hash

    // Build cache key with command, exit code, and output hash
    const parts = [result.command, result.exitCode.toString(), outputHash];

    // Add context if available
    if (context?.tool) parts.push(`tool:${context.tool}`);
    if (context?.language) parts.push(`lang:${context.language}`);
    if (context?.projectType) parts.push(`proj:${context.projectType}`);

    return parts.join(":");
  }
}
