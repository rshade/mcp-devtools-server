import { z } from "zod";
import { glob } from "glob";
import { ShellExecutor, ExecutionResult } from "../utils/shell-executor.js";
import {
  ProjectDetector,
  ProjectType,
  BuildSystem,
  ProjectInfo,
  ConfigFile,
} from "../utils/project-detector.js";

// Schema for test tool arguments
const TestToolArgsSchema = z.object({
  directory: z
    .string()
    .optional()
    .describe("Working directory for the test command"),
  pattern: z
    .string()
    .optional()
    .describe("Test file pattern or specific test to run"),
  args: z
    .array(z.string())
    .optional()
    .describe("Additional arguments to pass to the test runner"),
  coverage: z.boolean().optional().describe("Generate test coverage report"),
  watch: z.boolean().optional().describe("Run tests in watch mode"),
  parallel: z
    .boolean()
    .optional()
    .describe("Run tests in parallel when supported"),
  timeout: z.number().optional().describe("Test timeout in milliseconds"),
  verbose: z.boolean().optional().describe("Enable verbose output"),
});

const ProjectStatusArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory to analyze"),
});

export type TestToolArgs = z.infer<typeof TestToolArgsSchema>;
export type ProjectStatusArgs = z.infer<typeof ProjectStatusArgsSchema>;

export interface TestResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  runner: string;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  coverage?: CoverageInfo;
  suggestions?: string[];
}

export interface CoverageInfo {
  percentage: number;
  lines: number;
  linesCovered: number;
  branches?: number;
  branchesCovered?: number;
}

export interface ProjectTestStatus {
  hasTests: boolean;
  testFramework?: string;
  testFiles: string[];
  testDirectories: string[];
  recommendations: string[];
  configFiles: string[];
}

export class TestTools {
  private executor: ShellExecutor;
  private detector: ProjectDetector;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.executor = new ShellExecutor(this.projectRoot);
    this.detector = new ProjectDetector(this.projectRoot);
  }

  /**
   * Run tests using make test command
   */
  async makeTest(args: TestToolArgs): Promise<TestResult> {
    const commandArgs: string[] = ["test"];

    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute("make", {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000, // 5 minutes default
    });

    return this.processTestResult(result, "make");
  }

  /**
   * Run tests using the detected test framework
   */
  async runTests(args: TestToolArgs): Promise<TestResult> {
    const projectInfo = await this.detector.detectProject();

    // Determine the best test runner
    const runner = await this.determineTestRunner(
      projectInfo.type,
      projectInfo.buildSystem,
    );

    switch (runner) {
      case "npm":
        return this.runNpmTests(args);
      case "jest":
        return this.runJestTests(args);
      case "pytest":
        return this.runPytestTests(args);
      case "go":
        return this.runGoTests(args);
      case "cargo":
        return this.runCargoTests(args);
      case "make":
        return this.makeTest(args);
      default:
        throw new Error(
          `No suitable test runner found for project type: ${projectInfo.type}`,
        );
    }
  }

  /**
   * Run NPM tests
   */
  private async runNpmTests(args: TestToolArgs): Promise<TestResult> {
    const commandArgs: string[] = ["test"];

    if (args.coverage) {
      commandArgs.push("--", "--coverage");
    }

    if (args.args) {
      commandArgs.push("--", ...args.args);
    }

    const result = await this.executor.execute("npm", {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000,
    });

    return this.processTestResult(result, "npm");
  }

  /**
   * Run Jest tests directly
   */
  private async runJestTests(args: TestToolArgs): Promise<TestResult> {
    const commandArgs: string[] = [];

    if (args.pattern) {
      commandArgs.push(args.pattern);
    }

    if (args.coverage) {
      commandArgs.push("--coverage");
    }

    if (args.watch) {
      commandArgs.push("--watch");
    }

    if (args.verbose) {
      commandArgs.push("--verbose");
    }

    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute("jest", {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000,
    });

    return this.processTestResult(result, "jest");
  }

  /**
   * Run pytest tests
   */
  private async runPytestTests(args: TestToolArgs): Promise<TestResult> {
    const commandArgs: string[] = [];

    if (args.pattern) {
      commandArgs.push("-k", args.pattern);
    }

    if (args.coverage) {
      commandArgs.push("--cov=.");
    }

    if (args.verbose) {
      commandArgs.push("-v");
    }

    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute("pytest", {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000,
    });

    return this.processTestResult(result, "pytest");
  }

  /**
   * Run Go tests
   */
  private async runGoTests(args: TestToolArgs): Promise<TestResult> {
    const commandArgs: string[] = ["test"];

    if (args.pattern) {
      commandArgs.push("-run", args.pattern);
    }

    if (args.coverage) {
      commandArgs.push("-cover");
    }

    if (args.verbose) {
      commandArgs.push("-v");
    }

    if (args.parallel) {
      commandArgs.push("-parallel", "4");
    }

    commandArgs.push("./...");

    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute("go", {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000,
    });

    return this.processTestResult(result, "go");
  }

  /**
   * Run Cargo tests
   */
  private async runCargoTests(args: TestToolArgs): Promise<TestResult> {
    const commandArgs: string[] = ["test"];

    if (args.pattern) {
      commandArgs.push(args.pattern);
    }

    if (args.verbose) {
      commandArgs.push("--verbose");
    }

    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute("cargo", {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000,
    });

    return this.processTestResult(result, "cargo");
  }

  /**
   * Get project test status and recommendations
   */
  async getProjectTestStatus(
    args: ProjectStatusArgs,
  ): Promise<ProjectTestStatus> {
    try {
      const projectInfo = await this.detector.detectProject();
      const testFiles = await this.findTestFiles(args.directory);
      const testDirectories = await this.findTestDirectories(args.directory);
      const configFiles = this.findTestConfigFiles(projectInfo.configFiles);

      return {
        hasTests: projectInfo.hasTests,
        testFramework: projectInfo.testFramework,
        testFiles,
        testDirectories,
        configFiles: configFiles.map((cf) => cf.name),
        recommendations: this.generateTestRecommendations(
          projectInfo,
          testFiles.length,
        ),
      };
    } catch (error) {
      return {
        hasTests: false,
        testFiles: [],
        testDirectories: [],
        configFiles: [],
        recommendations: [
          `Error analyzing project: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  /**
   * Determine the best test runner for the project
   */
  private async determineTestRunner(
    projectType: ProjectType,
    buildSystem: BuildSystem,
  ): Promise<string> {
    // Check if make test target exists first
    try {
      const projectInfo = await this.detector.detectProject();
      if (projectInfo.makeTargets?.includes("test")) {
        return "make";
      }
    } catch {
      // Continue with other options
    }

    switch (projectType) {
      case ProjectType.NodeJS:
        if (
          buildSystem === BuildSystem.NPM ||
          buildSystem === BuildSystem.Yarn ||
          buildSystem === BuildSystem.PNPM
        ) {
          return "npm";
        }
        return "jest";

      case ProjectType.Python:
        return "pytest";

      case ProjectType.Go:
        return "go";

      case ProjectType.Rust:
        return "cargo";

      default:
        return "make";
    }
  }

  /**
   * Find test files in the project
   */
  private async findTestFiles(directory?: string): Promise<string[]> {
    const cwd = directory || this.projectRoot;
    const patterns = [
      "**/*.test.*",
      "**/*.spec.*",
      "**/test_*.py",
      "**/*_test.go",
      "**/tests/**/*.js",
      "**/tests/**/*.ts",
      "**/tests/**/*.py",
      "**/__tests__/**/*",
      "**/test/**/*",
    ];

    const files: string[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd,
          ignore: ["**/node_modules/**", "**/dist/**", "**/build/**"],
        });
        files.push(...matches);
      } catch {
        // Continue with other patterns
      }
    }

    return [...new Set(files)].sort();
  }

  /**
   * Find test directories in the project
   */
  private async findTestDirectories(directory?: string): Promise<string[]> {
    const cwd = directory || this.projectRoot;
    const patterns = ["**/test", "**/tests", "**/__tests__"];

    const directories: string[] = [];

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd,
          ignore: ["**/node_modules/**"],
        });
        directories.push(...matches);
      } catch {
        // Continue with other patterns
      }
    }

    return [...new Set(directories)].sort();
  }

  /**
   * Find test configuration files
   */
  private findTestConfigFiles(configFiles: ConfigFile[]): ConfigFile[] {
    return configFiles.filter((cf) => cf.type === "test");
  }

  /**
   * Process test command result into structured format
   */
  private processTestResult(
    result: ExecutionResult,
    runner: string,
  ): TestResult {
    const output = this.formatTestOutput(result.stdout, result.stderr);
    const stats = this.parseTestStats(output, runner);
    const coverage = this.parseCoverage(output, runner);

    const testResult: TestResult = {
      success: result.success,
      output,
      duration: result.duration,
      runner,
      ...stats,
    };

    if (coverage) {
      testResult.coverage = coverage;
    }

    if (!result.success) {
      testResult.error = result.error;
      testResult.suggestions = this.generateTestSuggestions(runner, result);
    }

    return testResult;
  }

  /**
   * Format test output for better readability
   */
  private formatTestOutput(stdout: string, stderr: string): string {
    let output = "";

    if (stdout) {
      output += stdout;
    }

    if (stderr && !stderr.includes("warning")) {
      if (output) output += "\n--- Errors ---\n";
      output += stderr;
    }

    return output.trim();
  }

  /**
   * Parse test statistics from output
   */
  private parseTestStats(
    output: string,
    runner: string,
  ): {
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    testsSkipped: number;
  } {
    const stats = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      testsSkipped: 0,
    };

    switch (runner) {
      case "jest":
        const jestMatch = output.match(
          /Tests:\s+(\d+) failed.*?(\d+) passed.*?(\d+) total/,
        );
        if (jestMatch) {
          stats.testsFailed = parseInt(jestMatch[1], 10);
          stats.testsPassed = parseInt(jestMatch[2], 10);
          stats.testsRun = parseInt(jestMatch[3], 10);
        }
        break;

      case "pytest":
        const pytestMatch = output.match(
          /(\d+) passed.*?(\d+) failed.*?(\d+) skipped/,
        );
        if (pytestMatch) {
          stats.testsPassed = parseInt(pytestMatch[1], 10);
          stats.testsFailed = parseInt(pytestMatch[2], 10);
          stats.testsSkipped = parseInt(pytestMatch[3], 10);
          stats.testsRun =
            stats.testsPassed + stats.testsFailed + stats.testsSkipped;
        }
        break;

      case "go":
        const goPassMatch = output.match(/PASS/);
        const goFailMatch = output.match(/FAIL/);
        if (goPassMatch && !goFailMatch) {
          stats.testsPassed = 1; // Go doesn't report individual test counts easily
          stats.testsRun = 1;
        } else if (goFailMatch) {
          stats.testsFailed = 1;
          stats.testsRun = 1;
        }
        break;

      case "cargo":
        const cargoMatch = output.match(
          /test result: (\w+)\. (\d+) passed; (\d+) failed/,
        );
        if (cargoMatch) {
          stats.testsPassed = parseInt(cargoMatch[2], 10);
          stats.testsFailed = parseInt(cargoMatch[3], 10);
          stats.testsRun = stats.testsPassed + stats.testsFailed;
        }
        break;
    }

    return stats;
  }

  /**
   * Parse coverage information from output
   */
  private parseCoverage(
    output: string,
    runner: string,
  ): CoverageInfo | undefined {
    switch (runner) {
      case "jest":
        const jestCoverage = output.match(/All files\s+\|\s+([\d.]+)/);
        if (jestCoverage) {
          return {
            percentage: parseFloat(jestCoverage[1]),
            lines: 0,
            linesCovered: 0,
          };
        }
        break;

      case "pytest":
        const pytestCoverage = output.match(/TOTAL\s+\d+\s+\d+\s+([\d.]+)%/);
        if (pytestCoverage) {
          return {
            percentage: parseFloat(pytestCoverage[1]),
            lines: 0,
            linesCovered: 0,
          };
        }
        break;

      case "go":
        const goCoverage = output.match(/coverage: ([\d.]+)% of statements/);
        if (goCoverage) {
          return {
            percentage: parseFloat(goCoverage[1]),
            lines: 0,
            linesCovered: 0,
          };
        }
        break;
    }

    return undefined;
  }

  /**
   * Generate suggestions based on test failures
   */
  private generateTestSuggestions(
    runner: string,
    result: ExecutionResult,
  ): string[] {
    const suggestions: string[] = [];

    if (result.stderr.includes("command not found")) {
      suggestions.push(`${runner} is not installed or not in PATH`);

      switch (runner) {
        case "jest":
          suggestions.push("Install Jest: npm install --save-dev jest");
          break;
        case "pytest":
          suggestions.push("Install pytest: pip install pytest");
          break;
      }

      return suggestions;
    }

    if (result.stderr.includes("No tests found")) {
      suggestions.push("No test files found");
      suggestions.push("Create test files with appropriate naming conventions");
      suggestions.push("Check test file patterns and locations");
    }

    if (result.stderr.includes("configuration")) {
      suggestions.push("Check test configuration files");
      suggestions.push("Ensure test framework is properly configured");
    }

    if (result.exitCode !== 0 && result.stderr.includes("timeout")) {
      suggestions.push("Tests timed out");
      suggestions.push("Consider increasing timeout or optimizing slow tests");
    }

    return suggestions;
  }

  /**
   * Generate recommendations for test setup
   */
  private generateTestRecommendations(
    projectInfo: ProjectInfo,
    testFileCount: number,
  ): string[] {
    const recommendations: string[] = [];

    if (!projectInfo.hasTests) {
      recommendations.push("No tests detected in this project");

      switch (projectInfo.type) {
        case ProjectType.NodeJS:
          recommendations.push(
            "Consider setting up Jest or Vitest for testing",
          );
          recommendations.push(
            "Create test files with .test.js or .spec.js extensions",
          );
          break;
        case ProjectType.Python:
          recommendations.push("Consider setting up pytest for testing");
          recommendations.push(
            "Create test files with test_ prefix or _test suffix",
          );
          break;
        case ProjectType.Go:
          recommendations.push("Create test files with _test.go suffix");
          break;
        case ProjectType.Rust:
          recommendations.push(
            "Add #[cfg(test)] modules or create tests/ directory",
          );
          break;
      }
    } else {
      recommendations.push(`Found ${testFileCount} test files`);

      if (projectInfo.testFramework) {
        recommendations.push(
          `Using ${projectInfo.testFramework} test framework`,
        );
      }

      recommendations.push("Run tests regularly during development");
      recommendations.push("Consider setting up continuous integration");
    }

    return recommendations;
  }

  /**
   * Validate test tool arguments
   */
  static validateArgs(args: unknown): TestToolArgs {
    return TestToolArgsSchema.parse(args);
  }

  /**
   * Validate project status arguments
   */
  static validateStatusArgs(args: unknown): ProjectStatusArgs {
    return ProjectStatusArgsSchema.parse(args);
  }
}
