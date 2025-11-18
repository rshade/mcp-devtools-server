/**
 * Universal result formatter for MCP DevTools
 *
 * Provides consistent formatting for both enriched results (with StandardError)
 * and legacy results. Eliminates code duplication across 25+ private formatters
 * in src/index.ts.
 *
 * @example
 * ```typescript
 * const formatter = new ResultFormatter();
 *
 * // Format enriched result
 * const output = formatter.format("make_lint", {
 *   result: { success: false, output: "...", duration: 1234 },
 *   standardError: { code: "LINT_ERROR", ... },
 *   enriched: true,
 * });
 *
 * // Format legacy result (auto-detected)
 * const output = formatter.format("make_test", {
 *   success: false,
 *   error: "Tests failed",
 *   output: "...",
 *   duration: 5678,
 * });
 * ```
 */

import {
  StandardError,
  ErrorSeverity,
  ErrorSuggestion,
  isEnrichedResult,
} from "./standard-error.js";

/**
 * Configuration options for ResultFormatter
 */
export interface FormatterConfig {
  /** Include raw stdout/stderr output from StandardError */
  includeRawOutput: boolean;
  /** Include error context metadata */
  includeContext: boolean;
  /** Collapse raw output by default (use details/summary) */
  collapseRawOutput: boolean;
  /** Collapse context by default */
  collapseContext: boolean;
  /** Maximum output size before truncation (bytes) */
  truncateOutputAt: number;
  /** Maximum number of affected files to display */
  maxAffectedFiles: number;
}

/**
 * Default formatter configuration
 */
export const DEFAULT_FORMATTER_CONFIG: FormatterConfig = {
  includeRawOutput: true,
  includeContext: true,
  collapseRawOutput: true,
  collapseContext: true,
  truncateOutputAt: 10000, // 10KB
  maxAffectedFiles: 20,
};

/**
 * Legacy result interface (common fields across existing formatters)
 */
interface LegacyResult {
  success: boolean;
  duration?: number;
  error?: string;
  output?: string;
  suggestions?: string[];
  [key: string]: unknown; // Allow additional fields
}

/**
 * Universal result formatter that handles both enriched and legacy results
 */
export class ResultFormatter {
  private config: FormatterConfig;

  constructor(config: Partial<FormatterConfig> = {}) {
    this.config = { ...DEFAULT_FORMATTER_CONFIG, ...config };
  }

  /**
   * Format a tool result (enriched or legacy)
   *
   * @param toolName - Name of the tool that produced the result
   * @param result - Tool result (enriched or legacy)
   * @returns Formatted markdown string
   */
  format(toolName: string, result: unknown): string {
    // Check if this is an enriched result
    if (isEnrichedResult(result)) {
      return this.formatEnrichedResult(toolName, result);
    }

    // Fall back to legacy formatting
    return this.formatLegacyResult(toolName, result as LegacyResult);
  }

  /**
   * Format an enriched result with StandardError
   */
  private formatEnrichedResult<T>(
    toolName: string,
    enriched: { result: T; standardError?: StandardError; enriched: boolean },
  ): string {
    const { result, standardError } = enriched;

    // If no StandardError, fall back to legacy formatting
    if (!standardError) {
      return this.formatLegacyResult(toolName, result as LegacyResult);
    }

    let output = `## ${toolName} Results\n\n`;

    // Status with severity emoji
    const emoji = this.getSeverityEmoji(standardError.severity);
    output += `**Status:** ${emoji} ${this.getSeverityLabel(standardError.severity)}\n`;
    output += `**Duration:** ${standardError.raw.duration}ms\n\n`;

    // Error summary
    output += `### Error Summary\n\n`;
    output += `**Code:** \`${standardError.code}\`\n`;
    output += `**Category:** ${standardError.category}\n`;
    output += `**Message:** ${standardError.message}\n`;

    if (standardError.details) {
      output += `\n${standardError.details}\n`;
    }

    if (standardError.confidence !== undefined) {
      output += `\n**Confidence:** ${Math.round(standardError.confidence * 100)}%\n`;
    }

    output += `\n`;

    // Affected files
    if (
      standardError.context.affectedFiles &&
      standardError.context.affectedFiles.length > 0
    ) {
      output += this.formatAffectedFiles(standardError.context.affectedFiles);
      output += `\n`;
    }

    // Suggestions grouped by priority
    if (standardError.suggestions.length > 0) {
      output += this.formatSuggestions(standardError.suggestions);
      output += `\n`;
    }

    // Raw output (collapsible)
    if (this.config.includeRawOutput) {
      const rawOutput = this.formatRawOutput(standardError);
      if (rawOutput) {
        output += rawOutput;
        output += `\n`;
      }
    }

    // Context (collapsible)
    if (this.config.includeContext) {
      output += this.formatContext(standardError);
    }

    return output;
  }

  /**
   * Format a legacy result using common patterns
   */
  private formatLegacyResult(toolName: string, result: LegacyResult): string {
    let output = `## ${toolName} Results\n\n`;

    // Status (check for success field)
    output += `**Status:** ${result.success ? "✅ Success" : "❌ Failed"}\n`;

    // Duration
    if (result.duration !== undefined) {
      output += `**Duration:** ${result.duration}ms\n`;
    }

    // Type guards for common fields
    output = this.appendIfPresent(output, result, "filesChecked", "Files Checked");
    output = this.appendIfPresent(output, result, "issuesFound", "Issues Found");
    output = this.appendIfPresent(output, result, "issuesFixed", "Issues Fixed");
    output = this.appendIfPresent(output, result, "testsRun", "Tests Run");
    output = this.appendIfPresent(output, result, "testsPassed", "Tests Passed");
    output = this.appendIfPresent(output, result, "testsFailed", "Tests Failed");
    output = this.appendIfPresent(output, result, "testsSkipped", "Tests Skipped");
    output = this.appendIfPresent(output, result, "coverage", "Coverage", "%");

    output += `\n`;

    // Output block
    if (result.output) {
      const truncated = this.truncateOutput(result.output);
      output += `**Output:**\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
    }

    // Error block
    if (result.error) {
      output += `**Error:** ${result.error}\n\n`;
    }

    // Suggestions
    if (result.suggestions && result.suggestions.length > 0) {
      output += `**Suggestions:**\n`;
      for (const suggestion of result.suggestions) {
        output += `- ${suggestion}\n`;
      }
      output += `\n`;
    }

    return output;
  }

  /**
   * Append a field to output if it exists
   */
  private appendIfPresent(
    output: string,
    result: LegacyResult,
    field: string,
    label: string,
    suffix = "",
  ): string {
    if (result[field] !== undefined && result[field] !== null) {
      output += `**${label}:** ${result[field]}${suffix}\n`;
    }
    return output;
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "🔴";
      case ErrorSeverity.ERROR:
        return "❌";
      case ErrorSeverity.WARNING:
        return "⚠️";
      case ErrorSeverity.INFO:
        return "ℹ️";
      default:
        return "❓";
    }
  }

  /**
   * Get label for severity level
   */
  private getSeverityLabel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "Critical Failure";
      case ErrorSeverity.ERROR:
        return "Failed";
      case ErrorSeverity.WARNING:
        return "Warning";
      case ErrorSeverity.INFO:
        return "Info";
      default:
        return "Unknown";
    }
  }

  /**
   * Format affected files list
   */
  private formatAffectedFiles(files: string[]): string {
    let output = `### Affected Files\n\n`;

    const displayFiles = files.slice(0, this.config.maxAffectedFiles);
    for (const file of displayFiles) {
      output += `- ${file}\n`;
    }

    if (files.length > this.config.maxAffectedFiles) {
      output += `- ... and ${files.length - this.config.maxAffectedFiles} more\n`;
    }

    return output;
  }

  /**
   * Format suggestions grouped by priority
   */
  private formatSuggestions(suggestions: ErrorSuggestion[]): string {
    let output = `### Suggestions\n\n`;

    // Group by priority
    const high = suggestions.filter((s) => s.priority === "high");
    const medium = suggestions.filter((s) => s.priority === "medium");
    const low = suggestions.filter((s) => s.priority === "low");

    // Format high priority first
    if (high.length > 0) {
      output += `**High Priority:**\n\n`;
      for (const suggestion of high) {
        output += this.formatSuggestion(suggestion);
      }
      output += `\n`;
    }

    // Medium priority
    if (medium.length > 0) {
      output += `**Medium Priority:**\n\n`;
      for (const suggestion of medium) {
        output += this.formatSuggestion(suggestion);
      }
      output += `\n`;
    }

    // Low priority
    if (low.length > 0) {
      output += `**Low Priority:**\n\n`;
      for (const suggestion of low) {
        output += this.formatSuggestion(suggestion);
      }
    }

    return output;
  }

  /**
   * Format a single suggestion
   */
  private formatSuggestion(suggestion: ErrorSuggestion): string {
    let output = `- **${suggestion.title}**\n`;
    output += `  ${suggestion.description}\n`;

    if (suggestion.action) {
      output += `  \`${suggestion.action}\`\n`;
    }

    return output;
  }

  /**
   * Format raw output (collapsible)
   */
  private formatRawOutput(error: StandardError): string | null {
    const { stdout, stderr } = error.raw;

    // Skip if both empty
    if (!stdout && !stderr) {
      return null;
    }

    const truncatedStdout = this.truncateOutput(stdout);
    const truncatedStderr = this.truncateOutput(stderr);

    if (this.config.collapseRawOutput) {
      let output = `<details>\n<summary>Raw Output</summary>\n\n`;

      if (truncatedStdout) {
        output += `**stdout:**\n\`\`\`\n${truncatedStdout}\n\`\`\`\n\n`;
      }

      if (truncatedStderr) {
        output += `**stderr:**\n\`\`\`\n${truncatedStderr}\n\`\`\`\n\n`;
      }

      output += `</details>\n`;
      return output;
    } else {
      let output = `### Raw Output\n\n`;

      if (truncatedStdout) {
        output += `**stdout:**\n\`\`\`\n${truncatedStdout}\n\`\`\`\n\n`;
      }

      if (truncatedStderr) {
        output += `**stderr:**\n\`\`\`\n${truncatedStderr}\n\`\`\`\n\n`;
      }

      return output;
    }
  }

  /**
   * Format error context (collapsible)
   */
  private formatContext(error: StandardError): string {
    const { context, raw } = error;

    if (this.config.collapseContext) {
      let output = `<details>\n<summary>Context</summary>\n\n`;
      output += `**Tool:** ${context.toolName}\n`;
      output += `**Working Directory:** ${context.workingDirectory}\n`;
      output += `**Command:** \`${raw.command}\`\n`;
      output += `**Exit Code:** ${raw.exitCode}\n`;
      output += `**Timestamp:** ${context.timestamp.toISOString()}\n`;

      if (context.environment) {
        output += `\n**Environment:**\n`;
        for (const [key, value] of Object.entries(context.environment)) {
          output += `- ${key}=${value}\n`;
        }
      }

      output += `\n</details>\n`;
      return output;
    } else {
      let output = `### Context\n\n`;
      output += `**Tool:** ${context.toolName}\n`;
      output += `**Working Directory:** ${context.workingDirectory}\n`;
      output += `**Command:** \`${raw.command}\`\n`;
      output += `**Exit Code:** ${raw.exitCode}\n`;
      output += `**Timestamp:** ${context.timestamp.toISOString()}\n`;

      if (context.environment) {
        output += `\n**Environment:**\n`;
        for (const [key, value] of Object.entries(context.environment)) {
          output += `- ${key}=${value}\n`;
        }
      }

      output += `\n`;
      return output;
    }
  }

  /**
   * Truncate output to configured size
   */
  private truncateOutput(text: string): string {
    if (!text) {
      return "";
    }

    if (text.length <= this.config.truncateOutputAt) {
      return text;
    }

    const truncated = text.substring(0, this.config.truncateOutputAt);
    return `${truncated}\n\n... (truncated ${text.length - this.config.truncateOutputAt} bytes)`;
  }
}
