import { z } from "zod";
import path from "path";
import { ShellExecutor, ExecutionResult } from "../utils/shell-executor.js";
import { ProjectDetector } from "../utils/project-detector.js";
import { FileScanner } from "../utils/file-scanner.js";

// Schema for lint tool arguments
const LintToolArgsSchema = z.object({
  directory: z
    .string()
    .optional()
    .describe("Working directory for the lint command"),
  files: z
    .array(z.string())
    .optional()
    .describe("Specific files to lint (glob patterns supported)"),
  fix: z
    .boolean()
    .optional()
    .describe("Automatically fix issues where possible"),
  args: z
    .array(z.string())
    .optional()
    .describe("Additional arguments to pass to the linter"),
  severity: z
    .enum(["error", "warn", "info"])
    .optional()
    .describe("Minimum severity level to report"),
});

export type LintToolArgs = z.infer<typeof LintToolArgsSchema>;

export interface LintResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  tool: string;
  filesChecked: number;
  issuesFound: number;
  issuesFixed?: number;
  suggestions?: string[];
}

export interface LintSummary {
  overallSuccess: boolean;
  results: LintResult[];
  totalIssues: number;
  totalFixed: number;
  recommendations: string[];
}

export class LintTools {
  private executor: ShellExecutor;
  private detector: ProjectDetector;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.executor = new ShellExecutor(this.projectRoot);
    this.detector = new ProjectDetector(this.projectRoot);
  }

  /**
   * Run markdownlint on markdown files
   */
  async markdownlint(args: LintToolArgs): Promise<LintResult> {
    const files = await this.findMarkdownFiles(args);

    if (files.length === 0) {
      return {
        success: true,
        output: "No markdown files found to lint",
        duration: 0,
        tool: "markdownlint",
        filesChecked: 0,
        issuesFound: 0,
      };
    }

    const commandArgs: string[] = [];

    // Add fix flag if requested
    if (args.fix) {
      commandArgs.push("--fix");
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    // Add files
    commandArgs.push(...files);

    const result = await this.executor.execute("markdownlint", {
      cwd: args.directory,
      args: commandArgs,
    });

    return this.processLintResult(result, "markdownlint", files.length);
  }

  /**
   * Run yamllint on YAML files using js-yaml-cli
   */
  async yamllint(args: LintToolArgs): Promise<LintResult> {
    const files = await this.findYamlFiles(args);

    if (files.length === 0) {
      return {
        success: true,
        output: "No YAML files found to lint",
        duration: 0,
        tool: "yamllint",
        filesChecked: 0,
        issuesFound: 0,
      };
    }

    const commandArgs: string[] = [];

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    // Add files
    commandArgs.push(...files);

    const result = await this.executor.execute("js-yaml-cli", {
      cwd: args.directory,
      args: commandArgs,
    });

    return this.processLintResult(result, "yamllint", files.length);
  }

  /**
   * Run commitlint to validate commit messages
   */
  async commitlint(
    args: LintToolArgs & { message?: string },
  ): Promise<LintResult> {
    const commandArgs: string[] = [];

    if (args.message) {
      // Validate a specific commit message
      commandArgs.push("--from", "HEAD~1");
    } else {
      // Validate the last commit by default
      commandArgs.push("--from", "HEAD~1");
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute("npx", {
      cwd: args.directory,
      args: ["commitlint", ...commandArgs],
    });

    return this.processLintResult(result, "commitlint", 1);
  }

  /**
   * Run ESLint on JavaScript/TypeScript files
   */
  async eslint(args: LintToolArgs): Promise<LintResult> {
    const files = await this.findJSFiles(args);

    if (files.length === 0) {
      return {
        success: true,
        output: "No JavaScript/TypeScript files found to lint",
        duration: 0,
        tool: "eslint",
        filesChecked: 0,
        issuesFound: 0,
      };
    }

    const commandArgs: string[] = [];

    // Add fix flag if requested
    if (args.fix) {
      commandArgs.push("--fix");
    }

    // Add format option
    commandArgs.push("--format", "compact");

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    // Add files
    commandArgs.push(...files);

    const result = await this.executor.execute("eslint", {
      cwd: args.directory,
      args: commandArgs,
    });

    return this.processLintResult(result, "eslint", files.length);
  }

  /**
   * Run all available linters based on project type
   */
  async lintAll(args: LintToolArgs): Promise<LintSummary> {
    const projectInfo = await this.detector.detectProject();
    const results: LintResult[] = [];

    // Run appropriate linters based on detected tools
    for (const tool of projectInfo.lintingTools) {
      try {
        let result: LintResult;

        switch (tool) {
          case "eslint":
            result = await this.eslint(args);
            break;
          case "markdownlint":
            result = await this.markdownlint(args);
            break;
          case "yamllint":
            result = await this.yamllint(args);
            break;
          case "commitlint":
            result = await this.commitlint(args);
            break;
          default:
            continue;
        }

        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          output: "",
          error: error instanceof Error ? error.message : "Unknown error",
          duration: 0,
          tool,
          filesChecked: 0,
          issuesFound: 0,
        });
      }
    }

    // Always try markdown and yaml if no specific linters found
    if (results.length === 0) {
      try {
        const markdownResult = await this.markdownlint(args);
        if (markdownResult.filesChecked > 0) {
          results.push(markdownResult);
        }
      } catch {
        // Ignore if markdownlint is not available
      }

      try {
        const yamlResult = await this.yamllint(args);
        if (yamlResult.filesChecked > 0) {
          results.push(yamlResult);
        }
      } catch {
        // Ignore if yamllint is not available
      }
    }

    const totalIssues = results.reduce((sum, r) => sum + r.issuesFound, 0);
    const totalFixed = results.reduce(
      (sum, r) => sum + (r.issuesFixed || 0),
      0,
    );
    const overallSuccess = results.every((r) => r.success);

    return {
      overallSuccess,
      results,
      totalIssues,
      totalFixed,
      recommendations: this.generateRecommendations(results),
    };
  }

  /**
   * Find markdown files to lint
   */
  private async findMarkdownFiles(args: LintToolArgs): Promise<string[]> {
    if (args.files) {
      return this.expandGlobPatterns(args.files, args.directory);
    }

    return this.expandGlobPatterns(
      ["**/*.md", "**/*.markdown"],
      args.directory,
    );
  }

  /**
   * Find YAML files to lint
   */
  private async findYamlFiles(args: LintToolArgs): Promise<string[]> {
    if (args.files) {
      return this.expandGlobPatterns(args.files, args.directory);
    }

    return this.expandGlobPatterns(["**/*.yml", "**/*.yaml"], args.directory);
  }

  /**
   * Find JavaScript/TypeScript files to lint
   */
  private async findJSFiles(args: LintToolArgs): Promise<string[]> {
    if (args.files) {
      return this.expandGlobPatterns(args.files, args.directory);
    }

    return this.expandGlobPatterns(
      ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.mjs", "**/*.cjs"],
      args.directory,
    );
  }

  /**
   * Expand glob patterns to actual file paths using cached FileScanner
   */
  private async expandGlobPatterns(
    patterns: string[],
    directory?: string,
  ): Promise<string[]> {
    const cwd = directory || this.projectRoot;
    const scanner = new FileScanner();

    try {
      // Use FileScanner which provides caching
      const files = await scanner.scan({
        patterns,
        exclude: [
          "**/node_modules/**",
          "**/dist/**",
          "**/build/**",
          "**/.git/**",
          "**/coverage/**",
        ],
        cwd,
      });

      // FileScanner returns absolute paths, convert to relative for compatibility
      return files.map((file) => path.relative(cwd, file));
    } catch (error) {
      console.warn(`Error expanding patterns ${patterns.join(", ")}: ${error}`);
      return [];
    }
  }

  /**
   * Process lint command result into structured format
   */
  private processLintResult(
    result: ExecutionResult,
    tool: string,
    filesChecked: number,
  ): LintResult {
    const output = this.formatLintOutput(result.stdout, result.stderr);
    const issuesFound = this.countIssues(output, tool);
    const issuesFixed = this.countFixed(output, tool);

    const lintResult: LintResult = {
      success: result.success,
      output,
      duration: result.duration,
      tool,
      filesChecked,
      issuesFound,
    };

    if (issuesFixed > 0) {
      lintResult.issuesFixed = issuesFixed;
    }

    if (!result.success) {
      lintResult.error = result.error;
      lintResult.suggestions = this.generateLintSuggestions(tool, result);
    }

    return lintResult;
  }

  /**
   * Format lint output for better readability
   */
  private formatLintOutput(stdout: string, stderr: string): string {
    let output = "";

    if (stdout) {
      output += stdout;
    }

    if (stderr && !stderr.includes("warning") && !stderr.includes("info")) {
      if (output) output += "\n--- Errors ---\n";
      output += stderr;
    }

    return output.trim();
  }

  /**
   * Count issues found in lint output
   */
  private countIssues(output: string, tool: string): number {
    switch (tool) {
      case "eslint":
        // ESLint typically shows problems at the end
        const eslintMatch = output.match(/(\d+) problems? \(/);
        return eslintMatch ? parseInt(eslintMatch[1], 10) : 0;

      case "markdownlint":
        // Count lines that look like markdownlint errors
        return (output.match(/MD\d+/g) || []).length;

      case "yamllint":
        // Count lines with file:line:column format
        return (output.match(/^[^:]+:\d+:\d+:/gm) || []).length;

      case "commitlint":
        // commitlint shows errors for invalid commit messages
        return output.includes("✖") ? 1 : 0;

      default:
        // Generic counting - count non-empty lines that aren't summary
        const lines = output
          .split("\n")
          .filter(
            (line) =>
              line.trim() &&
              !line.includes("files checked") &&
              !line.includes("No issues found"),
          );
        return lines.length;
    }
  }

  /**
   * Count issues fixed in lint output
   */
  private countFixed(output: string, tool: string): number {
    switch (tool) {
      case "eslint":
        const fixedMatch = output.match(/(\d+) errors? potentially fixable/);
        return fixedMatch ? parseInt(fixedMatch[1], 10) : 0;

      case "markdownlint":
        // markdownlint doesn't typically report fixed count
        return 0;

      default:
        return 0;
    }
  }

  /**
   * Generate suggestions based on lint failures
   */
  private generateLintSuggestions(
    tool: string,
    result: ExecutionResult,
  ): string[] {
    const suggestions: string[] = [];

    if (result.stderr.includes("command not found")) {
      suggestions.push(`${tool} is not installed`);
      suggestions.push(`Install ${tool} using: npm install -g ${tool}`);
      return suggestions;
    }

    if (result.stderr.includes("No such file or directory")) {
      suggestions.push("Check if the specified files exist");
      suggestions.push("Verify the working directory is correct");
    }

    switch (tool) {
      case "eslint":
        if (result.stderr.includes("No ESLint configuration")) {
          suggestions.push(
            "Create an ESLint configuration file (.eslintrc.js, .eslintrc.json, etc.)",
          );
          suggestions.push("Run `npx eslint --init` to set up configuration");
        }
        break;

      case "markdownlint":
        if (result.stderr.includes("ENOENT")) {
          suggestions.push(
            "Install markdownlint-cli: npm install -g markdownlint-cli",
          );
        }
        break;

      case "yamllint":
        if (result.stderr.includes("yamllint: command not found")) {
          suggestions.push("Install yamllint: pip install yamllint");
          suggestions.push("Or using conda: conda install yamllint");
        }
        break;

      case "commitlint":
        if (result.stderr.includes("commitlint: command not found")) {
          suggestions.push(
            "Install commitlint: npm install --save-dev @commitlint/cli @commitlint/config-conventional",
          );
          suggestions.push("Create commitlint.config.js configuration file");
        }
        if (result.stdout.includes("subject may not be empty")) {
          suggestions.push("Commit message subject cannot be empty");
        }
        if (result.stdout.includes("type may not be empty")) {
          suggestions.push(
            "Use conventional commit format: type(scope): description",
          );
          suggestions.push(
            "Valid types: feat, fix, docs, style, refactor, test, chore",
          );
        }
        break;
    }

    return suggestions;
  }

  /**
   * Generate recommendations based on lint results
   */
  private generateRecommendations(results: LintResult[]): string[] {
    const recommendations: string[] = [];

    if (results.length === 0) {
      recommendations.push(
        "No linters were run. Consider setting up linting tools for your project:",
      );
      recommendations.push("- ESLint for JavaScript/TypeScript");
      recommendations.push("- markdownlint for Markdown files");
      recommendations.push("- yamllint for YAML files");
      return recommendations;
    }

    const failedTools = results.filter((r) => !r.success).map((r) => r.tool);
    const successfulTools = results.filter((r) => r.success);

    if (failedTools.length > 0) {
      recommendations.push(`Failed linters: ${failedTools.join(", ")}`);
      recommendations.push(
        "Check the error messages above and ensure tools are properly installed",
      );
    }

    const totalIssues = results.reduce((sum, r) => sum + r.issuesFound, 0);
    if (totalIssues > 0) {
      recommendations.push(
        `Found ${totalIssues} total issues across all files`,
      );
      recommendations.push(
        "Consider running with --fix flag to automatically fix issues where possible",
      );
    }

    if (successfulTools.length > 0 && totalIssues === 0) {
      recommendations.push(
        "All linters passed! Your code follows the configured style guidelines.",
      );
    }

    return recommendations;
  }

  /**
   * Validate lint tool arguments
   */
  static validateArgs(args: unknown): LintToolArgs {
    return LintToolArgsSchema.parse(args);
  }
}
