import { z } from "zod";
import { ShellExecutor, ExecutionResult } from "../utils/shell-executor.js";
import * as path from "path";
import * as fs from "fs/promises";
import { glob } from "glob";

// Schema for actionlint arguments
const ActionlintArgsSchema = z.object({
  directory: z
    .string()
    .optional()
    .describe("Working directory for the command"),
  files: z
    .array(z.string())
    .optional()
    .describe("Specific workflow files to lint (supports glob patterns)"),
  format: z
    .enum(["default", "json", "sarif"])
    .optional()
    .describe("Output format"),
  shellcheck: z
    .boolean()
    .optional()
    .describe("Enable shellcheck integration for run: blocks (default: true)"),
  pyflakes: z
    .boolean()
    .optional()
    .describe("Enable pyflakes for Python run: blocks (default: false)"),
  verbose: z.boolean().optional().describe("Enable verbose output"),
  color: z.boolean().optional().describe("Enable colored output"),
  noColor: z.boolean().optional().describe("Disable colored output"),
  ignore: z
    .array(z.string())
    .optional()
    .describe("Ignore rules by glob pattern"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

export type ActionlintArgs = z.infer<typeof ActionlintArgsSchema>;

export interface ActionlintResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  command: string;
  filesChecked: number;
  issuesFound: number;
  suggestions?: string[];
}

export interface ActionlintIssue {
  message: string;
  filepath: string;
  line: number;
  column: number;
  kind: string;
  snippet?: string;
}

export class ActionlintTools {
  private executor: ShellExecutor;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.executor = new ShellExecutor(this.projectRoot);
  }

  /**
   * Run actionlint to validate GitHub Actions workflow files
   */
  async actionlint(args: ActionlintArgs): Promise<ActionlintResult> {
    const commandArgs: string[] = [];

    // Add format flag
    if (args.format === "json") {
      commandArgs.push("-format", "{{json .}}");
    } else if (args.format === "sarif") {
      commandArgs.push("-format", "sarif");
    }

    // Add shellcheck flag (disabled if explicitly set to false)
    if (args.shellcheck === false) {
      commandArgs.push("-shellcheck=");
    }

    // Add pyflakes flag (enabled if explicitly set to true)
    if (args.pyflakes === true) {
      commandArgs.push("-pyflakes", "python");
    }

    // Add verbose flag
    if (args.verbose) {
      commandArgs.push("-verbose");
    }

    // Add color flags
    if (args.color) {
      commandArgs.push("-color");
    } else if (args.noColor) {
      commandArgs.push("-no-color");
    }

    // Add ignore patterns
    if (args.ignore && args.ignore.length > 0) {
      for (const pattern of args.ignore) {
        commandArgs.push("-ignore", pattern);
      }
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    // Find workflow files
    const workflowFiles = await this.findWorkflowFiles(args);

    if (workflowFiles.length === 0) {
      return {
        success: false,
        output: "",
        error: "No workflow files found",
        duration: 0,
        command: "actionlint",
        filesChecked: 0,
        issuesFound: 0,
        suggestions: [
          "No GitHub Actions workflow files found",
          "Workflow files should be in .github/workflows/ directory",
          "Files should have .yml or .yaml extension",
        ],
      };
    }

    // Add workflow files to arguments
    commandArgs.push(...workflowFiles);

    const result = await this.executor.execute("actionlint", {
      cwd: args.directory || this.projectRoot,
      args: commandArgs,
      timeout: args.timeout || 60000,
    });

    return this.processActionlintResult(result, workflowFiles.length);
  }

  /**
   * Check if actionlint is installed
   */
  async isInstalled(): Promise<boolean> {
    return this.executor.isCommandAvailable("actionlint");
  }

  /**
   * Find workflow files based on arguments
   */
  private async findWorkflowFiles(args: ActionlintArgs): Promise<string[]> {
    const cwd = args.directory || this.projectRoot;

    // If specific files are provided, use them
    if (args.files && args.files.length > 0) {
      return this.expandGlobPatterns(args.files, cwd);
    }

    // Otherwise, find all workflow files in .github/workflows
    const defaultPatterns = [
      ".github/workflows/*.yml",
      ".github/workflows/*.yaml",
    ];

    return this.expandGlobPatterns(defaultPatterns, cwd);
  }

  /**
   * Expand glob patterns to file paths
   */
  private async expandGlobPatterns(
    patterns: string[],
    cwd: string,
  ): Promise<string[]> {
    const files: string[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd,
          absolute: false,
          nodir: true,
        });
        files.push(...matches);
      } catch {
        // If glob fails, treat it as a literal file path
        const fullPath = path.resolve(cwd, pattern);
        try {
          await fs.access(fullPath);
          files.push(pattern);
        } catch {
          // File doesn't exist, skip it
        }
      }
    }

    // Remove duplicates
    return [...new Set(files)];
  }

  /**
   * Process actionlint execution result
   */
  private processActionlintResult(
    result: ExecutionResult,
    filesChecked: number,
  ): ActionlintResult {
    const issuesFound = this.countIssues(result);

    const actionlintResult: ActionlintResult = {
      success: result.success,
      output: this.formatOutput(result),
      duration: result.duration,
      command: result.command,
      filesChecked,
      issuesFound,
      error: result.success ? undefined : result.error,
    };

    // Add suggestions if there are errors
    if (!result.success || issuesFound > 0) {
      actionlintResult.suggestions = this.generateSuggestions(
        result,
        issuesFound,
      );
    }

    return actionlintResult;
  }

  /**
   * Format output for display
   */
  private formatOutput(result: ExecutionResult): string {
    const output = result.stdout || result.stderr || "";
    return output.trim();
  }

  /**
   * Count issues found by actionlint
   */
  private countIssues(result: ExecutionResult): number {
    const output = result.stdout || result.stderr || "";

    // If using JSON format, parse the issues
    if (output.trim().startsWith("[") || output.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(output);
        if (Array.isArray(parsed)) {
          return parsed.length;
        }
        return 0;
      } catch {
        // Not valid JSON, fall through to line counting
      }
    }

    // Count lines with error messages (format: file:line:column: message)
    const lines = output.split("\n").filter((line) => {
      return line.match(/^.+:\d+:\d+:/);
    });

    return lines.length;
  }

  /**
   * Generate helpful suggestions based on errors
   */
  private generateSuggestions(
    result: ExecutionResult,
    issuesFound: number,
  ): string[] {
    const suggestions: string[] = [];
    const output = result.stdout || result.stderr || "";

    // Check if actionlint is not installed
    if (
      result.error &&
      (result.error.includes("not found") ||
        result.error.includes("not in the allowlist") ||
        output.includes("command not found"))
    ) {
      suggestions.push("actionlint is not installed or not in PATH");
      suggestions.push(
        "Install with: go install github.com/rhysd/actionlint/cmd/actionlint@latest",
      );
      suggestions.push(
        "Or download from: https://github.com/rhysd/actionlint/releases",
      );
      suggestions.push(
        "Ensure $GOPATH/bin or install directory is in your PATH",
      );
      return suggestions;
    }

    // Shellcheck integration issues
    if (output.includes("shellcheck") && output.includes("not found")) {
      suggestions.push(
        "shellcheck is not installed but actionlint wants to use it",
      );
      suggestions.push("Install shellcheck or disable with shellcheck: false");
      suggestions.push(
        "Install shellcheck: apt-get install shellcheck (Ubuntu/Debian)",
      );
    }

    // Pyflakes integration issues
    if (output.includes("pyflakes") && output.includes("not found")) {
      suggestions.push(
        "pyflakes is not installed but actionlint wants to use it",
      );
      suggestions.push("Install pyflakes: pip install pyflakes");
      suggestions.push("Or disable with pyflakes: false");
    }

    // Common workflow issues
    if (output.includes("property") && output.includes("not defined")) {
      suggestions.push("Invalid property in action usage");
      suggestions.push("Check the action documentation for valid properties");
      suggestions.push("Verify action version and available inputs/outputs");
    }

    if (output.includes("unknown action")) {
      suggestions.push("Action reference not found or invalid");
      suggestions.push("Check action exists: owner/repo@version");
      suggestions.push("Verify action version/tag exists in repository");
    }

    if (output.includes("job") && output.includes("not found")) {
      suggestions.push("Referenced job does not exist");
      suggestions.push("Check job names in needs: declarations");
      suggestions.push("Ensure job IDs match exactly (case-sensitive)");
    }

    if (output.includes("expression")) {
      suggestions.push("Invalid GitHub Actions expression syntax");
      suggestions.push("Check ${{ }} syntax and context variables");
      suggestions.push(
        "See: https://docs.github.com/en/actions/learn-github-actions/expressions",
      );
    }

    if (output.includes("shell")) {
      suggestions.push("Shell script issues detected in run: block");
      suggestions.push("Fix shell script syntax errors");
      suggestions.push(
        "Consider using shellcheck locally for detailed diagnostics",
      );
    }

    if (output.includes("webhook event") || output.includes("trigger")) {
      suggestions.push("Invalid workflow trigger configuration");
      suggestions.push("Check on: event names and syntax");
      suggestions.push(
        "See: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows",
      );
    }

    if (issuesFound > 0 && suggestions.length === 0) {
      suggestions.push(`Found ${issuesFound} issue(s) in workflow files`);
      suggestions.push("Review the output above for specific errors");
      suggestions.push("Check GitHub Actions documentation for proper syntax");
    }

    return suggestions;
  }

  /**
   * Parse actionlint JSON output
   */
  async parseJsonOutput(output: string): Promise<ActionlintIssue[]> {
    try {
      const parsed = JSON.parse(output);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map((issue: unknown) => {
        const issueObj = issue as Record<string, unknown>;
        return {
          message: (issueObj.message as string) || "",
          filepath: (issueObj.filepath as string) || "",
          line: (issueObj.line as number) || 0,
          column: (issueObj.column as number) || 0,
          kind: (issueObj.kind as string) || "error",
          snippet: (issueObj.snippet as string) || undefined,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Validate actionlint arguments
   */
  static validateArgs(args: unknown): ActionlintArgs {
    return ActionlintArgsSchema.parse(args);
  }
}
