import { z } from "zod";
import { ShellExecutor, ExecutionResult } from "../utils/shell-executor.js";
import * as path from "path";
import * as fs from "fs/promises";
import { getCacheManager } from "../utils/cache-manager.js";
import { createHash } from "crypto";
import { FileScanner } from "../utils/file-scanner.js";

// Schema for Node.js tool arguments
const NodejsToolArgsSchema = z.object({
  directory: z
    .string()
    .optional()
    .describe("Working directory for the command"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  verbose: z.boolean().optional().describe("Enable verbose output"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const NodejsTestArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  testPattern: z
    .string()
    .optional()
    .describe('Test file pattern (e.g., "**/*.test.ts")'),
  coverage: z.boolean().optional().describe("Enable coverage reporting"),
  watch: z.boolean().optional().describe("Run tests in watch mode"),
  verbose: z.boolean().optional().describe("Enable verbose output"),
  testFramework: z
    .enum(["auto", "jest", "vitest", "mocha"])
    .optional()
    .describe("Test framework to use"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const NodejsLintArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  fix: z.boolean().optional().describe("Auto-fix issues"),
  format: z
    .string()
    .optional()
    .describe("Output format (stylish, json, compact, etc.)"),
  files: z
    .array(z.string())
    .optional()
    .describe("Specific files/patterns to lint"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const NodejsFormatArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  check: z.boolean().optional().describe("Check formatting without writing"),
  write: z.boolean().optional().describe("Write formatted files"),
  files: z
    .array(z.string())
    .optional()
    .describe("Specific files/patterns to format"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
});

const NodejsTypeCheckArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  project: z.string().optional().describe("Path to tsconfig.json"),
  noEmit: z.boolean().optional().describe("Do not emit compiled files"),
  incremental: z
    .boolean()
    .optional()
    .describe("Enable incremental compilation"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const NodejsInstallDepsArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  packageManager: z
    .enum(["auto", "npm", "yarn", "pnpm", "bun"])
    .optional()
    .describe("Package manager to use"),
  production: z
    .boolean()
    .optional()
    .describe("Install production dependencies only"),
  frozen: z.boolean().optional().describe("Use frozen lockfile (no updates)"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

// Phase 2 schemas
const NodejsVersionArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  tool: z
    .enum(["node", "npm", "yarn", "pnpm", "bun", "all"])
    .optional()
    .describe("Tool to check version for"),
});

const NodejsSecurityArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  audit: z.boolean().optional().describe("Run npm/yarn audit"),
  fix: z.boolean().optional().describe("Automatically fix vulnerabilities"),
  production: z.boolean().optional().describe("Only check production dependencies"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const NodejsBuildArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  script: z.string().optional().describe("Build script name (default: build)"),
  production: z.boolean().optional().describe("Production build"),
  watch: z.boolean().optional().describe("Watch mode"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const NodejsScriptsArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  script: z.string().optional().describe("Script name to run"),
  list: z.boolean().optional().describe("List available scripts"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const NodejsBenchmarkArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  pattern: z.string().optional().describe("Benchmark file pattern"),
  iterations: z.number().optional().describe("Number of iterations"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

export type NodejsToolArgs = z.infer<typeof NodejsToolArgsSchema>;
export type NodejsTestArgs = z.infer<typeof NodejsTestArgsSchema>;
export type NodejsLintArgs = z.infer<typeof NodejsLintArgsSchema>;
export type NodejsFormatArgs = z.infer<typeof NodejsFormatArgsSchema>;
export type NodejsTypeCheckArgs = z.infer<typeof NodejsTypeCheckArgsSchema>;
export type NodejsInstallDepsArgs = z.infer<typeof NodejsInstallDepsArgsSchema>;
export type NodejsVersionArgs = z.infer<typeof NodejsVersionArgsSchema>;
export type NodejsSecurityArgs = z.infer<typeof NodejsSecurityArgsSchema>;
export type NodejsBuildArgs = z.infer<typeof NodejsBuildArgsSchema>;
export type NodejsScriptsArgs = z.infer<typeof NodejsScriptsArgsSchema>;
export type NodejsBenchmarkArgs = z.infer<typeof NodejsBenchmarkArgsSchema>;

export interface NodejsToolResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  command: string;
  coverage?: number;
  suggestions?: string[];
}

export interface NodejsProjectInfo {
  hasPackageJson: boolean;
  packageManager?: "npm" | "yarn" | "pnpm" | "bun";
  packageName?: string;
  version?: string;
  nodeVersion?: string;
  hasTypeScript: boolean;
  hasTsConfig: boolean;
  framework?: string;
  testFramework?: string;
  hasTests: boolean;
  testFiles: string[];
  scripts: string[];
  dependencies: string[];
  devDependencies: string[];
  buildTool?: string;
  hasLintConfig: boolean;
  hasPrettierConfig: boolean;
}

export class NodejsTools {
  private executor: ShellExecutor;
  private projectRoot: string;
  private cacheManager = getCacheManager();

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.executor = new ShellExecutor(this.projectRoot);
  }

  /**
   * Build cache key for Node.js operations
   * Includes all parameters that affect the result
   */
  private buildNodejsCacheKey(
    operation: string,
    args: Record<string, unknown>,
  ): string {
    const dir = path.resolve(
      (args.directory as string | undefined) || this.projectRoot,
    );
    const argsJson = JSON.stringify(args, Object.keys(args).sort());
    const argsHash = createHash("sha256")
      .update(argsJson)
      .digest("hex")
      .substring(0, 16);
    return `${operation}:${dir}:${argsHash}`;
  }

  /**
   * Detect package manager from lockfiles
   */
  private async detectPackageManager(
    dir: string,
  ): Promise<"npm" | "yarn" | "pnpm" | "bun"> {
    const lockfiles = [
      { file: "bun.lockb", manager: "bun" as const },
      { file: "pnpm-lock.yaml", manager: "pnpm" as const },
      { file: "yarn.lock", manager: "yarn" as const },
      { file: "package-lock.json", manager: "npm" as const },
    ];

    for (const { file, manager } of lockfiles) {
      try {
        await fs.access(path.join(dir, file));
        return manager;
      } catch {
        // Continue to next
      }
    }

    return "npm"; // Default fallback
  }

  /**
   * Detect test framework from package.json
   */
  private detectTestFramework(packageJson: {
    devDependencies?: Record<string, string>;
    dependencies?: Record<string, string>;
  }): string | undefined {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDeps.vitest) return "vitest";
    if (allDeps.jest || allDeps["@types/jest"]) return "jest";
    if (allDeps.mocha) return "mocha";

    return undefined;
  }

  /**
   * Detect framework from dependencies
   */
  private detectFramework(packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }): string | undefined {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDeps.next) return "Next.js";
    if (allDeps.nuxt) return "Nuxt.js";
    if (allDeps["@angular/core"]) return "Angular";
    if (allDeps.react) return "React";
    if (allDeps.vue) return "Vue";
    if (allDeps.svelte) return "Svelte";
    if (allDeps.express) return "Express";
    if (allDeps["@nestjs/core"]) return "NestJS";
    if (allDeps.fastify) return "Fastify";

    return undefined;
  }

  /**
   * Detect build tool from dependencies
   */
  private detectBuildTool(packageJson: {
    devDependencies?: Record<string, string>;
    dependencies?: Record<string, string>;
  }): string | undefined {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    if (allDeps.vite) return "Vite";
    if (allDeps.webpack) return "Webpack";
    if (allDeps.rollup) return "Rollup";
    if (allDeps.esbuild) return "esbuild";
    if (allDeps.tsup) return "tsup";
    if (allDeps.parcel) return "Parcel";

    return undefined;
  }

  /**
   * Get Node.js project information with caching
   */
  async getProjectInfo(directory?: string): Promise<NodejsProjectInfo> {
    const dir = directory || this.projectRoot;

    // Try cache first
    const cacheKey = this.buildNodejsCacheKey("project-info", {
      directory: dir,
    });
    const cached = this.cacheManager.get<NodejsProjectInfo>(
      "nodeModules",
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const info: NodejsProjectInfo = {
      hasPackageJson: false,
      hasTypeScript: false,
      hasTsConfig: false,
      hasTests: false,
      testFiles: [],
      scripts: [],
      dependencies: [],
      devDependencies: [],
      hasLintConfig: false,
      hasPrettierConfig: false,
    };

    try {
      // Check for package.json
      const packageJsonPath = path.join(dir, "package.json");
      try {
        await fs.access(packageJsonPath);
        info.hasPackageJson = true;

        // Read package.json
        const packageJsonContent = await fs.readFile(packageJsonPath, "utf8");
        try {
          const packageJson = JSON.parse(packageJsonContent);

          info.packageName = packageJson.name;
          info.version = packageJson.version;
          info.scripts = Object.keys(packageJson.scripts || {});
          info.dependencies = Object.keys(packageJson.dependencies || {});
          info.devDependencies = Object.keys(packageJson.devDependencies || {});

          // Detect frameworks and tools
          info.framework = this.detectFramework(packageJson);
          info.testFramework = this.detectTestFramework(packageJson);
          info.buildTool = this.detectBuildTool(packageJson);
          info.hasTypeScript =
            info.devDependencies.includes("typescript") ||
            info.dependencies.includes("typescript");
        } catch (parseError) {
          // Malformed package.json - log error but continue
          console.error("Failed to parse package.json:", parseError);
          info.hasPackageJson = false;
        }
      } catch {
        // No package.json
      }

      // Detect package manager
      info.packageManager = await this.detectPackageManager(dir);

      // Check for tsconfig.json
      try {
        await fs.access(path.join(dir, "tsconfig.json"));
        info.hasTsConfig = true;
      } catch {
        // No tsconfig.json
      }

      // Check for lint configs
      const lintConfigs = [
        ".eslintrc",
        ".eslintrc.js",
        ".eslintrc.json",
        "eslint.config.js",
      ];
      for (const config of lintConfigs) {
        try {
          await fs.access(path.join(dir, config));
          info.hasLintConfig = true;
          break;
        } catch {
          // Continue
        }
      }

      // Check for Prettier configs
      const prettierConfigs = [
        ".prettierrc",
        ".prettierrc.js",
        ".prettierrc.json",
        "prettier.config.js",
      ];
      for (const config of prettierConfigs) {
        try {
          await fs.access(path.join(dir, config));
          info.hasPrettierConfig = true;
          break;
        } catch {
          // Continue
        }
      }

      // Get Node version
      const nodeVersionResult = await this.executor.execute("node", {
        cwd: dir,
        args: ["--version"],
      });
      if (nodeVersionResult.success) {
        info.nodeVersion = nodeVersionResult.stdout.trim();
      }

      // Find test files (common patterns)
      const scanner = new FileScanner();
      const testPatterns = [
        "**/*.test.{ts,js,tsx,jsx}",
        "**/*.spec.{ts,js,tsx,jsx}",
        "__tests__/**/*.{ts,js,tsx,jsx}",
        "test/**/*.{ts,js,tsx,jsx}",
        "tests/**/*.{ts,js,tsx,jsx}",
      ];

      for (const pattern of testPatterns) {
        try {
          const files = await scanner.scan({
            patterns: [pattern],
            cwd: dir,
            exclude: ["node_modules/**", "dist/**", "build/**", "coverage/**"],
          });
          info.testFiles.push(...files);
        } catch {
          // Pattern may not match any files, continue
        }
      }

      // Remove duplicates
      info.testFiles = [...new Set(info.testFiles)];
      info.hasTests = info.testFiles.length > 0;
    } catch (error) {
      console.error("Error getting Node.js project info:", error);
    }

    // Cache the result
    this.cacheManager.set("nodeModules", cacheKey, info);

    return info;
  }

  /**
   * Run Node.js tests
   */
  async runTests(args: NodejsTestArgs): Promise<NodejsToolResult> {
    const dir = args.directory || this.projectRoot;

    // Detect test framework if auto
    let framework: "jest" | "vitest" | "mocha";
    if (args.testFramework && args.testFramework !== "auto") {
      framework = args.testFramework;
    } else {
      const projectInfo = await this.getProjectInfo(dir);
      const detected = projectInfo.testFramework;
      if (
        detected === "vitest" ||
        detected === "mocha" ||
        detected === "jest"
      ) {
        framework = detected;
      } else {
        return {
          success: false,
          command: "nodejs_test",
          output: "",
          error:
            "No test framework detected. Please install jest, vitest, or mocha, or specify testFramework explicitly.",
          duration: 0,
          suggestions: [
            "Install a test framework: npm install --save-dev jest",
            "Or install vitest: npm install --save-dev vitest",
            "Or install mocha: npm install --save-dev mocha",
            'Or specify testFramework explicitly: { "testFramework": "jest" }',
          ],
        };
      }
    }

    const commandArgs: string[] = [];
    let command = "";

    switch (framework) {
      case "vitest":
        command = "vitest";
        commandArgs.push("run");
        if (args.coverage) commandArgs.push("--coverage");
        if (args.watch) commandArgs.push("--watch");
        break;
      case "jest":
        command = "jest";
        if (args.coverage) commandArgs.push("--coverage");
        if (args.watch) commandArgs.push("--watch");
        if (args.verbose) commandArgs.push("--verbose");
        break;
      case "mocha":
        command = "mocha";
        if (args.testPattern) commandArgs.push(args.testPattern);
        break;
      default:
        command = "npm";
        commandArgs.push("test");
    }

    if (args.testPattern && framework !== "mocha") {
      commandArgs.push(args.testPattern);
    }

    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute(command, {
      cwd: dir,
      args: commandArgs,
      timeout: args.timeout || 300000,
    });

    return this.processNodejsResult(
      result,
      `${command} ${commandArgs.join(" ")}`,
    );
  }

  /**
   * Run ESLint
   */
  async runLint(args: NodejsLintArgs): Promise<NodejsToolResult> {
    const commandArgs: string[] = [];

    // Add files or default to current directory
    if (args.files && args.files.length > 0) {
      commandArgs.push(...args.files);
    } else {
      commandArgs.push(".");
    }

    // Add fix flag
    if (args.fix) {
      commandArgs.push("--fix");
    }

    // Add format
    if (args.format) {
      commandArgs.push("--format", args.format);
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute("eslint", {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 120000,
    });

    const fullCommand = ["eslint", ...commandArgs].join(" ");
    return this.processNodejsResult(result, fullCommand);
  }

  /**
   * Run Prettier formatting
   */
  async runFormat(args: NodejsFormatArgs): Promise<NodejsToolResult> {
    const commandArgs: string[] = [];

    // Add check or write mode
    if (args.check) {
      commandArgs.push("--check");
    } else if (args.write) {
      commandArgs.push("--write");
    } else {
      commandArgs.push("--list-different");
    }

    // Add files or default patterns
    if (args.files && args.files.length > 0) {
      commandArgs.push(...args.files);
    } else {
      commandArgs.push("**/*.{js,ts,jsx,tsx,json,md}");
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute("prettier", {
      cwd: args.directory,
      args: commandArgs,
    });

    const fullCommand = ["prettier", ...commandArgs].join(" ");
    return this.processNodejsResult(result, fullCommand);
  }

  /**
   * Run TypeScript type checking
   */
  async checkTypes(args: NodejsTypeCheckArgs): Promise<NodejsToolResult> {
    const commandArgs: string[] = [];

    // Add project flag
    if (args.project) {
      commandArgs.push("--project", args.project);
    }

    // Add noEmit flag (default for type checking)
    if (args.noEmit !== false) {
      commandArgs.push("--noEmit");
    }

    // Add incremental flag
    if (args.incremental) {
      commandArgs.push("--incremental");
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute("tsc", {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 180000,
    });

    const fullCommand = ["tsc", ...commandArgs].join(" ");
    return this.processNodejsResult(result, fullCommand);
  }

  /**
   * Install Node.js dependencies
   */
  async installDependencies(
    args: NodejsInstallDepsArgs,
  ): Promise<NodejsToolResult> {
    const dir = args.directory || this.projectRoot;

    // Detect package manager if auto
    let packageManager = args.packageManager || "auto";
    if (packageManager === "auto") {
      packageManager = await this.detectPackageManager(dir);
    }

    const commandArgs: string[] = ["install"];

    // Add package-manager-specific flags
    switch (packageManager) {
      case "npm":
        if (args.production) commandArgs.push("--production");
        if (args.frozen) commandArgs.push("--package-lock-only");
        break;
      case "yarn":
        if (args.production) commandArgs.push("--production");
        if (args.frozen) commandArgs.push("--frozen-lockfile");
        break;
      case "pnpm":
        if (args.production) commandArgs.push("--prod");
        if (args.frozen) commandArgs.push("--frozen-lockfile");
        break;
      case "bun":
        if (args.production) commandArgs.push("--production");
        if (args.frozen) commandArgs.push("--frozen-lockfile");
        break;
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute(packageManager, {
      cwd: dir,
      args: commandArgs,
      timeout: args.timeout || 600000, // 10 minutes for npm install
    });

    const fullCommand = [packageManager, ...commandArgs].join(" ");
    return this.processNodejsResult(result, fullCommand);
  }

  /**
   * Process Node.js command result
   */
  private processNodejsResult(
    result: ExecutionResult,
    command: string,
  ): NodejsToolResult {
    const nodejsResult: NodejsToolResult = {
      success: result.success,
      output: this.formatOutput(result),
      duration: result.duration,
      command,
    };

    if (!result.success) {
      nodejsResult.error = result.error || `${command} failed`;
      nodejsResult.suggestions = this.generateSuggestions(command, result);
    }

    // Extract coverage if present (framework-specific patterns)
    nodejsResult.coverage = this.extractCoverage(
      result.stdout + result.stderr,
      command,
    );

    return nodejsResult;
  }

  /**
   * Extract coverage percentage from test output (framework-specific)
   */
  private extractCoverage(output: string, command: string): number | undefined {
    // Determine framework from command
    let framework: "jest" | "vitest" | "mocha" | undefined;
    if (command.includes("jest")) {
      framework = "jest";
    } else if (command.includes("vitest")) {
      framework = "vitest";
    } else if (command.includes("mocha") || command.includes("nyc")) {
      framework = "mocha";
    }

    if (!framework) {
      return undefined;
    }

    // Framework-specific patterns
    switch (framework) {
      case "jest": {
        // Jest table format: "All files      | 85.23"
        const match = output.match(/All files\s+\|\s+([\d.]+)/);
        if (match) {
          return parseFloat(match[1]);
        }
        break;
      }

      case "vitest": {
        // Vitest summary: "All files | 85.23 |"
        const match = output.match(/All files\s+\|\s+([\d.]+)/);
        if (match) {
          return parseFloat(match[1]);
        }
        // Alternative format: "Coverage: 85.23%"
        const altMatch = output.match(/Coverage:\s+([\d.]+)%/);
        if (altMatch) {
          return parseFloat(altMatch[1]);
        }
        break;
      }

      case "mocha": {
        // NYC (Istanbul) output: "Statements   : 85.23%"
        const match = output.match(/Statements\s+:\s+([\d.]+)%/);
        if (match) {
          return parseFloat(match[1]);
        }
        // Alternative: "All files | 85.23"
        const altMatch = output.match(/All files\s+\|\s+([\d.]+)/);
        if (altMatch) {
          return parseFloat(altMatch[1]);
        }
        break;
      }
    }

    return undefined;
  }

  /**
   * Format command output
   */
  private formatOutput(result: ExecutionResult): string {
    let output = "";

    if (result.stdout) {
      output += result.stdout;
    }

    if (result.stderr && !result.stderr.includes("warning")) {
      if (output) output += "\n--- stderr ---\n";
      output += result.stderr;
    }

    return output.trim();
  }

  /**
   * Generate helpful suggestions based on failures
   */
  private generateSuggestions(
    command: string,
    result: ExecutionResult,
  ): string[] {
    const suggestions: string[] = [];

    if (
      result.stderr.includes("command not found") ||
      result.stderr.includes("not found")
    ) {
      suggestions.push(`${command.split(" ")[0]} is not installed`);
      suggestions.push("Run npm install to install dependencies");
    }

    if (result.stderr.includes("Cannot find module")) {
      suggestions.push("Missing dependencies detected");
      suggestions.push("Run npm install to install missing dependencies");
    }

    if (command.includes("eslint") && result.exitCode !== 0) {
      suggestions.push("ESLint found issues");
      suggestions.push("Run with --fix flag to auto-fix issues");
    }

    if (command.includes("tsc") && result.exitCode !== 0) {
      suggestions.push("TypeScript type errors found");
      suggestions.push("Check output above for specific type issues");
    }

    if (command.includes("test") && result.exitCode !== 0) {
      suggestions.push("Tests failed - check output above");
      suggestions.push("Run with --verbose for more details");
    }

    if (result.stderr.includes("ENOENT")) {
      suggestions.push("File or directory not found");
      suggestions.push("Check that all required files exist");
    }

    return suggestions;
  }

  /**
   * Get version information for Node.js tools with caching (1hr TTL)
   */
  async getVersion(args: NodejsVersionArgs): Promise<NodejsToolResult> {
    const dir = args.directory || this.projectRoot;
    const tool = args.tool || "all";

    // Try cache first (1hr TTL)
    const cacheKey = this.buildNodejsCacheKey("version", { directory: dir, tool });
    const cached = this.cacheManager.get<NodejsToolResult>(
      "commandAvailability",
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const versions: Record<string, string> = {};
    const tools = tool === "all" ? ["node", "npm", "yarn", "pnpm", "bun"] : [tool];

    for (const t of tools) {
      try {
        const result = await this.executor.execute(t, {
          cwd: dir,
          args: ["--version"],
          timeout: 5000,
        });
        if (result.success) {
          versions[t] = result.stdout.trim().replace(/^v/, "");
        }
      } catch {
        // Tool not available
        versions[t] = "not installed";
      }
    }

    const output = Object.entries(versions)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const toolResult: NodejsToolResult = {
      success: true,
      output,
      command: `version check for ${tool}`,
      duration: 0,
    };

    // Cache result
    this.cacheManager.set("commandAvailability", cacheKey, toolResult);

    return toolResult;
  }

  /**
   * Run security audit
   */
  async runSecurity(args: NodejsSecurityArgs): Promise<NodejsToolResult> {
    const dir = args.directory || this.projectRoot;
    const projectInfo = await this.getProjectInfo(dir);
    const packageManager = projectInfo.packageManager || "npm";

    const commandArgs: string[] = ["audit"];

    // Add fix flag if requested
    if (args.fix) {
      commandArgs.push("fix");
    }

    // Add production flag
    if (args.production) {
      commandArgs.push("--production");
    }

    // Add JSON format for better parsing
    if (!args.fix) {
      commandArgs.push("--json");
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute(packageManager, {
      cwd: dir,
      args: commandArgs,
      timeout: args.timeout || 120000,
    });

    return this.processNodejsResult(
      result,
      `${packageManager} ${commandArgs.join(" ")}`,
    );
  }

  /**
   * Run build command
   */
  async runBuild(args: NodejsBuildArgs): Promise<NodejsToolResult> {
    const dir = args.directory || this.projectRoot;
    const projectInfo = await this.getProjectInfo(dir);
    const packageManager = projectInfo.packageManager || "npm";

    const scriptName = args.script || "build";
    const commandArgs: string[] = ["run", scriptName];

    // Add additional arguments
    if (args.args) {
      commandArgs.push("--");
      commandArgs.push(...args.args);
    }

    // Add production flag for some build tools
    if (args.production && !args.args?.includes("--mode")) {
      commandArgs.push("--", "--mode", "production");
    }

    // Add watch flag
    if (args.watch) {
      commandArgs.push("--", "--watch");
    }

    const result = await this.executor.execute(packageManager, {
      cwd: dir,
      args: commandArgs,
      timeout: args.timeout || 600000, // 10 minutes for builds
    });

    return this.processNodejsResult(
      result,
      `${packageManager} ${commandArgs.join(" ")}`,
    );
  }

  /**
   * Run or list npm scripts with caching (5min TTL)
   */
  async runScripts(args: NodejsScriptsArgs): Promise<NodejsToolResult> {
    const dir = args.directory || this.projectRoot;

    // If listing scripts, use cached project info
    if (args.list) {
      const projectInfo = await this.getProjectInfo(dir);
      const output = projectInfo.scripts.length > 0
        ? `Available scripts:\n${projectInfo.scripts.map(s => `  - ${s}`).join("\n")}`
        : "No scripts found in package.json";

      return {
        success: true,
        output,
        command: "list scripts",
        duration: 0,
      };
    }

    // Run specific script
    if (!args.script) {
      return {
        success: false,
        output: "",
        error: "No script specified. Use 'list: true' to see available scripts or provide a script name.",
        command: "run script",
        duration: 0,
        suggestions: ["Specify a script name", "Use list: true to see available scripts"],
      };
    }

    const projectInfo = await this.getProjectInfo(dir);
    const packageManager = projectInfo.packageManager || "npm";

    const commandArgs: string[] = ["run", args.script];

    // Add additional arguments
    if (args.args) {
      commandArgs.push("--");
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute(packageManager, {
      cwd: dir,
      args: commandArgs,
      timeout: args.timeout || 300000, // 5 minutes default
    });

    return this.processNodejsResult(
      result,
      `${packageManager} ${commandArgs.join(" ")}`,
    );
  }

  /**
   * Run benchmarks
   */
  async runBenchmark(args: NodejsBenchmarkArgs): Promise<NodejsToolResult> {
    const dir = args.directory || this.projectRoot;
    const pattern = args.pattern || "**/*.bench.{ts,js}";

    // Check for common benchmark tools
    const projectInfo = await this.getProjectInfo(dir);
    const hasBenchmark = projectInfo.devDependencies.includes("benchmark") ||
      projectInfo.devDependencies.includes("vitest") ||
      projectInfo.devDependencies.includes("tinybench");

    if (!hasBenchmark) {
      return {
        success: false,
        output: "",
        error: "No benchmark tool detected",
        command: "benchmark",
        duration: 0,
        suggestions: [
          "Install benchmark: npm install --save-dev benchmark",
          "Or use Vitest bench: npm install --save-dev vitest",
          "Or use tinybench: npm install --save-dev tinybench",
        ],
      };
    }

    // Try Vitest benchmark first
    if (projectInfo.devDependencies.includes("vitest")) {
      const commandArgs: string[] = ["bench"];
      if (pattern) commandArgs.push(pattern);
      if (args.args) commandArgs.push(...args.args);

      const result = await this.executor.execute("vitest", {
        cwd: dir,
        args: commandArgs,
        timeout: args.timeout || 300000,
      });

      return this.processNodejsResult(
        result,
        `vitest ${commandArgs.join(" ")}`,
      );
    }

    // Fallback to npm run bench script
    const commandArgs: string[] = ["run", "bench"];
    if (args.args) {
      commandArgs.push("--");
      commandArgs.push(...args.args);
    }

    const packageManager = projectInfo.packageManager || "npm";
    const result = await this.executor.execute(packageManager, {
      cwd: dir,
      args: commandArgs,
      timeout: args.timeout || 300000,
    });

    return this.processNodejsResult(
      result,
      `${packageManager} ${commandArgs.join(" ")}`,
    );
  }

  /**
   * Validate Node.js tool arguments
   */
  static validateArgs(args: unknown): NodejsToolArgs {
    return NodejsToolArgsSchema.parse(args);
  }

  /**
   * Validate Node.js test arguments
   */
  static validateTestArgs(args: unknown): NodejsTestArgs {
    return NodejsTestArgsSchema.parse(args);
  }

  /**
   * Validate Node.js lint arguments
   */
  static validateLintArgs(args: unknown): NodejsLintArgs {
    return NodejsLintArgsSchema.parse(args);
  }

  /**
   * Validate Node.js format arguments
   */
  static validateFormatArgs(args: unknown): NodejsFormatArgs {
    return NodejsFormatArgsSchema.parse(args);
  }

  /**
   * Validate Node.js type check arguments
   */
  static validateTypeCheckArgs(args: unknown): NodejsTypeCheckArgs {
    return NodejsTypeCheckArgsSchema.parse(args);
  }

  /**
   * Validate Node.js install dependencies arguments
   */
  static validateInstallDepsArgs(args: unknown): NodejsInstallDepsArgs {
    return NodejsInstallDepsArgsSchema.parse(args);
  }

  /**
   * Validate Node.js version arguments
   */
  static validateVersionArgs(args: unknown): NodejsVersionArgs {
    return NodejsVersionArgsSchema.parse(args);
  }

  /**
   * Validate Node.js security arguments
   */
  static validateSecurityArgs(args: unknown): NodejsSecurityArgs {
    return NodejsSecurityArgsSchema.parse(args);
  }

  /**
   * Validate Node.js build arguments
   */
  static validateBuildArgs(args: unknown): NodejsBuildArgs {
    return NodejsBuildArgsSchema.parse(args);
  }

  /**
   * Validate Node.js scripts arguments
   */
  static validateScriptsArgs(args: unknown): NodejsScriptsArgs {
    return NodejsScriptsArgsSchema.parse(args);
  }

  /**
   * Validate Node.js benchmark arguments
   */
  static validateBenchmarkArgs(args: unknown): NodejsBenchmarkArgs {
    return NodejsBenchmarkArgsSchema.parse(args);
  }
}
