import { z } from "zod";
import { ShellExecutor, ExecutionResult } from "../utils/shell-executor.js";
import { ProjectDetector } from "../utils/project-detector.js";

// Schema for make tool arguments
const MakeToolArgsSchema = z.object({
  directory: z
    .string()
    .optional()
    .describe("Working directory for the make command"),
  target: z.string().optional().describe("Specific make target to run"),
  args: z
    .array(z.string())
    .optional()
    .describe("Additional arguments to pass to make"),
  parallel: z
    .number()
    .min(1)
    .max(16)
    .optional()
    .describe("Number of parallel jobs (-j flag)"),
});

const MakeStatusArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory to analyze"),
});

export type MakeToolArgs = z.infer<typeof MakeToolArgsSchema>;
export type MakeStatusArgs = z.infer<typeof MakeStatusArgsSchema>;

export interface MakeToolResponse {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  target?: string;
  suggestions?: string[];
}

export interface MakeStatusResponse {
  hasMakefile: boolean;
  availableTargets: string[];
  recommendedTargets: string[];
  projectContext: string;
  makefileLocation?: string;
}

export class MakeTools {
  private executor: ShellExecutor;
  private detector: ProjectDetector;

  constructor(projectRoot?: string) {
    this.executor = new ShellExecutor(projectRoot);
    this.detector = new ProjectDetector(projectRoot);
  }

  /**
   * Run make lint command
   */
  async makeLint(args: MakeToolArgs): Promise<MakeToolResponse> {
    const target = args.target || "lint";
    return this.runMakeCommand(target, args);
  }

  /**
   * Run make test command
   */
  async makeTest(args: MakeToolArgs): Promise<MakeToolResponse> {
    const target = args.target || "test";
    return this.runMakeCommand(target, args);
  }

  /**
   * Run make depend or install dependencies
   */
  async makeDepend(args: MakeToolArgs): Promise<MakeToolResponse> {
    const target = args.target || "depend";
    return this.runMakeCommand(target, args);
  }

  /**
   * Run make build command
   */
  async makeBuild(args: MakeToolArgs): Promise<MakeToolResponse> {
    const target = args.target || "build";
    return this.runMakeCommand(target, args);
  }

  /**
   * Run make clean command
   */
  async makeClean(args: MakeToolArgs): Promise<MakeToolResponse> {
    const target = args.target || "clean";
    return this.runMakeCommand(target, args);
  }

  /**
   * Generic make command runner
   */
  private async runMakeCommand(
    target: string,
    args: MakeToolArgs,
  ): Promise<MakeToolResponse> {
    try {
      // Build command arguments
      const commandArgs: string[] = [target];

      // Add parallel jobs if specified
      if (args.parallel) {
        commandArgs.push(`-j${args.parallel}`);
      }

      // Add additional arguments
      if (args.args) {
        commandArgs.push(...args.args);
      }

      // Execute the make command
      const result = await this.executor.execute("make", {
        cwd: args.directory,
        args: commandArgs,
        timeout: 300000, // 5 minutes default timeout for make commands
      });

      const response: MakeToolResponse = {
        success: result.success,
        output: this.formatOutput(result),
        duration: result.duration,
        target,
      };

      if (!result.success) {
        response.error = result.error || `Make ${target} failed`;
        response.suggestions = await this.generateSuggestions(target, result);
      }

      return response;
    } catch (error) {
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error.message : "Unknown error",
        duration: 0,
        target,
        suggestions: ["Check if Makefile exists and target is defined"],
      };
    }
  }

  /**
   * Get project status and available make targets
   */
  async getProjectStatus(): Promise<MakeStatusResponse> {
    try {
      const projectInfo = await this.detector.detectProject();
      const context = await this.detector.getProjectContext();

      const response: MakeStatusResponse = {
        hasMakefile: projectInfo.configFiles.some(
          (cf) => cf.type === "makefile",
        ),
        availableTargets: projectInfo.makeTargets || [],
        recommendedTargets: this.getRecommendedTargets(
          projectInfo.makeTargets || [],
        ),
        projectContext: context,
      };

      // Find makefile location
      const makefileConfig = projectInfo.configFiles.find(
        (cf) => cf.type === "makefile",
      );
      if (makefileConfig) {
        response.makefileLocation = makefileConfig.path;
      }

      return response;
    } catch (error) {
      return {
        hasMakefile: false,
        availableTargets: [],
        recommendedTargets: [],
        projectContext: `Error detecting project: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Format execution output for better readability
   */
  private formatOutput(result: ExecutionResult): string {
    let output = "";

    if (result.stdout) {
      output += result.stdout;
    }

    if (result.stderr) {
      if (output) output += "\n--- stderr ---\n";
      output += result.stderr;
    }

    if (!output && result.success) {
      output = `Command completed successfully in ${result.duration}ms`;
    }

    return output;
  }

  /**
   * Generate helpful suggestions based on make command failures
   */
  private async generateSuggestions(
    target: string,
    result: ExecutionResult,
  ): Promise<string[]> {
    const suggestions: string[] = [];

    if (result.stderr.includes("No such file or directory")) {
      suggestions.push("Check if Makefile exists in the current directory");
      suggestions.push("Try running from the project root directory");
    }

    if (result.stderr.includes(`No rule to make target '${target}'`)) {
      suggestions.push(`Target '${target}' not found in Makefile`);

      try {
        const status = await this.getProjectStatus();
        if (status.availableTargets.length > 0) {
          suggestions.push(
            `Available targets: ${status.availableTargets.join(", ")}`,
          );
        }
      } catch {
        suggestions.push(
          "Run `make` without arguments to see available targets",
        );
      }
    }

    if (
      result.stderr.includes("command not found") ||
      result.stderr.includes("make: not found")
    ) {
      suggestions.push("Make is not installed or not in PATH");
      suggestions.push("Install make using your system package manager");
    }

    if (result.stderr.includes("Permission denied")) {
      suggestions.push("Check file permissions in the project directory");
      suggestions.push("Ensure you have write permissions for build outputs");
    }

    if (result.exitCode === 2) {
      suggestions.push("Make encountered an error - check the output above");
      suggestions.push("Try running with verbose flag: make -d");
    }

    // Add common make troubleshooting tips
    if (suggestions.length === 0) {
      suggestions.push(
        "Try running `make --version` to check make installation",
      );
      suggestions.push("Verify all dependencies are installed");
      suggestions.push("Check if all source files exist");
    }

    return suggestions;
  }

  /**
   * Get recommended targets based on available targets
   */
  private getRecommendedTargets(availableTargets: string[]): string[] {
    const commonTargets = [
      "build",
      "test",
      "lint",
      "clean",
      "install",
      "depend",
      "all",
      "help",
    ];
    const recommended: string[] = [];

    // Add common targets that exist
    for (const target of commonTargets) {
      if (availableTargets.includes(target)) {
        recommended.push(target);
      }
    }

    // Add any other targets that look important
    for (const target of availableTargets) {
      if (!recommended.includes(target)) {
        // Include targets that end with common suffixes
        if (
          target.endsWith("-test") ||
          target.endsWith("-lint") ||
          target.endsWith("-build")
        ) {
          recommended.push(target);
        }
        // Include targets that start with common prefixes
        if (
          target.startsWith("test-") ||
          target.startsWith("lint-") ||
          target.startsWith("build-")
        ) {
          recommended.push(target);
        }
      }
    }

    return recommended.slice(0, 10); // Limit to first 10 recommendations
  }

  /**
   * Validate make tool arguments
   */
  static validateArgs(args: unknown): MakeToolArgs {
    return MakeToolArgsSchema.parse(args);
  }

  /**
   * Validate make status arguments
   */
  static validateStatusArgs(args: unknown): MakeStatusArgs {
    return MakeStatusArgsSchema.parse(args);
  }
}
