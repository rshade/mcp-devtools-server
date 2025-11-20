import { z } from "zod";
import { ShellExecutor, ExecutionResult } from "../utils/shell-executor.js";
import * as path from "path";
import * as fs from "fs/promises";
import { existsSync } from "fs";
import { getCacheManager } from "../utils/cache-manager.js";
import { createHash } from "crypto";

// ============================================================================
// Zod Schemas for Python Tool Arguments
// ============================================================================

const PythonProjectInfoSchema = z.object({
  directory: z
    .string()
    .optional()
    .describe("Working directory for the command"),
});

const PythonTestArgsSchema = z.object({
  directory: z
    .string()
    .optional()
    .describe("Working directory for the command"),
  testPath: z
    .string()
    .optional()
    .describe("Specific test file or directory to run"),
  pattern: z
    .string()
    .optional()
    .describe("Test file pattern to match using -k flag (e.g., test_foo)"),
  coverage: z.boolean().optional().describe("Enable coverage reporting"),
  verbose: z.boolean().optional().describe("Enable verbose output"),
  markers: z
    .string()
    .optional()
    .describe("Run tests matching given mark expression (-m)"),
  parallel: z
    .boolean()
    .optional()
    .describe("Run tests in parallel with pytest-xdist"),
  maxWorkers: z
    .number()
    .optional()
    .describe("Number of parallel workers (default: auto)"),
  failFast: z
    .boolean()
    .optional()
    .describe("Stop on first failure (-x)"),
  junitXml: z.string().optional().describe("Output JUnit XML to file"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonLintArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  fix: z.boolean().optional().describe("Automatically fix issues"),
  check: z.boolean().optional().describe("Check only, don't modify files"),
  files: z
    .array(z.string())
    .optional()
    .describe("Specific files to lint/format"),
  select: z
    .array(z.string())
    .optional()
    .describe('Rule codes to enable (e.g., ["E", "F", "I"])'),
  ignore: z.array(z.string()).optional().describe("Rule codes to ignore"),
  outputFormat: z
    .enum(["text", "json", "github"])
    .optional()
    .describe("Output format"),
  showFixes: z.boolean().optional().describe("Show available fixes"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonFormatArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  check: z
    .boolean()
    .optional()
    .describe("Check without modifying"),
  files: z.array(z.string()).optional().describe("Specific files to format"),
  lineLength: z.number().optional().describe("Max line length"),
  preview: z
    .boolean()
    .optional()
    .describe("Enable preview style"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonTypeCheckArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  files: z.array(z.string()).optional().describe("Specific files to check"),
  level: z
    .enum(["basic", "standard", "strict"])
    .optional()
    .describe("Type checking strictness level"),
  outputFormat: z
    .enum(["text", "json"])
    .optional()
    .describe("Output format"),
  createStubs: z
    .boolean()
    .optional()
    .describe("Create type stubs for untyped libraries"),
  pythonVersion: z
    .string()
    .optional()
    .describe('Target Python version (e.g., "3.11")'),
  showStats: z.boolean().optional().describe("Show statistics"),
  watch: z.boolean().optional().describe("Watch mode"),
  verbose: z.boolean().optional().describe("Enable verbose output"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonInstallDepsArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  mode: z
    .enum(["install", "sync", "update", "add", "remove"])
    .optional()
    .describe("Installation mode"),
  packages: z
    .array(z.string())
    .optional()
    .describe("Packages to add/remove (for add/remove modes)"),
  packageManager: z
    .enum(["auto", "uv", "poetry", "pipenv", "pip"])
    .optional()
    .describe("Package manager to use (auto-detected by default)"),
  dev: z
    .boolean()
    .optional()
    .describe("Install development dependencies too"),
  upgrade: z.boolean().optional().describe("Upgrade packages"),
  prerelease: z
    .enum(["allow", "if-necessary", "disallow"])
    .optional()
    .describe("Pre-release handling (uv only)"),
  system: z
    .boolean()
    .optional()
    .describe("Install to system Python (uv only)"),
  editable: z
    .boolean()
    .optional()
    .describe("Install in editable mode"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonVersionArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  tool: z
    .enum(["python", "pip", "uv", "poetry", "pyright", "ruff", "pytest", "all"])
    .optional()
    .describe("Tool to check version for (default: all)"),
});

const PythonSecurityArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  tool: z
    .enum(["bandit", "pip-audit", "both"])
    .optional()
    .default("both")
    .describe("Security tool to use"),
  severity: z
    .enum(["low", "medium", "high", "all"])
    .optional()
    .default("all")
    .describe("Minimum severity level to report"),
  format: z
    .enum(["text", "json", "sarif"])
    .optional()
    .default("text")
    .describe("Output format"),
  fix: z.boolean().optional().describe("Fix vulnerabilities automatically"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonBuildArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  sdist: z
    .boolean()
    .optional()
    .default(true)
    .describe("Build source distribution"),
  wheel: z.boolean().optional().default(true).describe("Build wheel"),
  outdir: z
    .string()
    .optional()
    .default("dist/")
    .describe("Output directory"),
  noBuildIsolation: z
    .boolean()
    .optional()
    .default(false)
    .describe("Disable build isolation"),
  skipDependencyCheck: z
    .boolean()
    .optional()
    .default(false)
    .describe("Skip dependency checks"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonVenvArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  action: z
    .enum(["create", "delete", "info", "list"])
    .default("info")
    .describe("Virtual environment action"),
  venvPath: z
    .string()
    .optional()
    .default(".venv")
    .describe("Path to virtual environment"),
  python: z.string().optional().describe("Python interpreter to use"),
  systemSitePackages: z
    .boolean()
    .optional()
    .default(false)
    .describe("Give access to system site-packages"),
  clear: z
    .boolean()
    .optional()
    .default(false)
    .describe("Delete venv contents if it exists"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonBenchmarkArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  benchmarks: z
    .string()
    .optional()
    .describe("Benchmark pattern to run (e.g., test_benchmark_)"),
  compare: z
    .string()
    .optional()
    .describe("Compare against saved baseline"),
  save: z.string().optional().describe("Save results to baseline"),
  json: z.boolean().optional().describe("Output results as JSON"),
  warmup: z
    .number()
    .optional()
    .describe("Number of warmup iterations"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonUpdateDepsArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  mode: z
    .enum(["check", "update-patch", "update-minor", "update-major"])
    .default("check")
    .describe("Update mode"),
  packages: z
    .array(z.string())
    .optional()
    .describe("Specific packages to update"),
  dryRun: z.boolean().optional().default(false).describe("Dry run mode"),
  interactive: z
    .boolean()
    .optional()
    .default(false)
    .describe("Interactive mode"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonCompatibilityArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  targetVersion: z
    .string()
    .optional()
    .describe('Target Python version (e.g., "3.9")'),
  suggest: z
    .boolean()
    .optional()
    .default(false)
    .describe("Suggest syntax upgrades"),
  files: z.array(z.string()).optional().describe("Specific files to check"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

const PythonProfileArgsSchema = z.object({
  directory: z.string().optional().describe("Working directory"),
  command: z.string().describe("Python script to profile"),
  profiler: z
    .enum(["cprofile", "pyspy", "memray"])
    .default("cprofile")
    .describe("Profiler to use"),
  topN: z.number().optional().default(20).describe("Show top N functions"),
  outputFile: z.string().optional().describe("Save profile to file"),
  format: z
    .enum(["text", "json", "flamegraph"])
    .optional()
    .default("text")
    .describe("Output format"),
  args: z.array(z.string()).optional().describe("Additional arguments"),
  timeout: z.number().optional().describe("Command timeout in milliseconds"),
});

// ============================================================================
// Type Exports
// ============================================================================

export type PythonProjectInfoArgs = z.infer<typeof PythonProjectInfoSchema>;
export type PythonTestArgs = z.infer<typeof PythonTestArgsSchema>;
export type PythonLintArgs = z.infer<typeof PythonLintArgsSchema>;
export type PythonFormatArgs = z.infer<typeof PythonFormatArgsSchema>;
export type PythonTypeCheckArgs = z.infer<typeof PythonTypeCheckArgsSchema>;
export type PythonInstallDepsArgs = z.infer<typeof PythonInstallDepsArgsSchema>;
export type PythonVersionArgs = z.infer<typeof PythonVersionArgsSchema>;
export type PythonSecurityArgs = z.infer<typeof PythonSecurityArgsSchema>;
export type PythonBuildArgs = z.infer<typeof PythonBuildArgsSchema>;
export type PythonVenvArgs = z.infer<typeof PythonVenvArgsSchema>;
export type PythonBenchmarkArgs = z.infer<typeof PythonBenchmarkArgsSchema>;
export type PythonUpdateDepsArgs = z.infer<typeof PythonUpdateDepsArgsSchema>;
export type PythonCompatibilityArgs = z.infer<typeof PythonCompatibilityArgsSchema>;
export type PythonProfileArgs = z.infer<typeof PythonProfileArgsSchema>;

// ============================================================================
// Result Interfaces
// ============================================================================

export interface PythonToolResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  command: string;
  coverage?: number;
  suggestions?: string[];
}

export interface PythonVersionInfo {
  current: string;
  required?: string;
  isEOL: boolean;
  recommendation: string | null;
  upgradeReason?: string;
}

export interface PythonProjectInfo {
  hasPyprojectToml: boolean;
  hasSetupPy: boolean;
  hasRequirementsTxt: boolean;
  pythonVersion?: string;
  pythonVersionInfo?: PythonVersionInfo;
  packageManager?: string;
  projectName?: string;
  projectVersion?: string;
  virtualEnv?: string;
  installedPackages?: number;
  devDependencies?: number;
  hasTests: boolean;
  testFiles: string[];
  upgradeRecommendation?: string;
  dependencies: string[];
  pythonExecutable?: string;
  supportsModernFeatures?: boolean;
}

// ============================================================================
// PythonTools Class
// ============================================================================

export class PythonTools {
  // ============================================================================
  // Timeout Constants
  // ============================================================================
  private static readonly TIMEOUT_VERSION_CHECK = 5000; // Check Python version
  private static readonly TIMEOUT_PACKAGE_LIST = 10000; // List installed packages

  private executor: ShellExecutor;
  private projectRoot: string;
  private cacheManager = getCacheManager();
  private detectedPythonExecutable: string | null = null;
  private detectPythonExecutablePromise: Promise<string | null> | null = null;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.executor = new ShellExecutor(this.projectRoot);
  }

  /**
   * Detects which Python executable is available (python3 or python)
   * Results are cached for the lifetime of the PythonTools instance
   * @returns The Python executable name ("python3" or "python") or null if not found
   */
  private async detectPythonExecutable(): Promise<string | null> {
    // Return cached result if available
    if (this.detectedPythonExecutable !== null) {
      return this.detectedPythonExecutable;
    }

    if (!this.detectPythonExecutablePromise) {
      this.detectPythonExecutablePromise = (async () => {
        try {
          const candidates = ["python3", "python"];
          for (const executable of candidates) {
            try {
              const result = await this.executor.execute(executable, {
                args: ["--version"],
                timeout: PythonTools.TIMEOUT_VERSION_CHECK,
              });
              if (result.success) {
                this.detectedPythonExecutable = executable;
                return executable;
              }
            } catch {
              // Try next candidate
            }
          }

          this.detectedPythonExecutable = null;
          return null;
        } finally {
          this.detectPythonExecutablePromise = null;
        }
      })();
    }

    return this.detectPythonExecutablePromise;
  }

  /**
   * Validates file paths to prevent command injection and path traversal
   * @param files - Array of file paths to validate
   * @throws Error if any file path contains suspicious characters
   */
  private validateFilePaths(files: string[]): void {
    // Check for shell metacharacters and newlines that could enable command injection
    const suspiciousChars = /[;&|`$()<>\n\r]/;
    for (const file of files) {
      if (suspiciousChars.test(file)) {
        throw new Error(`Invalid characters in file path: ${file}`);
      }
      // Prevent path traversal outside project root
      const resolved = path.resolve(this.projectRoot, file);
      if (!resolved.startsWith(path.resolve(this.projectRoot))) {
        throw new Error(`File path outside project root: ${file}`);
      }
    }
  }

  /**
   * Build cache key for Python operations
   * Includes all parameters that affect the result
   */
  private buildPythonCacheKey(
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
   * Check if Python version is End of Life
   */
  private isPythonEOL(major: number, minor: number): boolean {
    const eolVersions = [
      { major: 3, minor: 7, eolDate: "2023-06-27" },
      { major: 3, minor: 8, eolDate: "2024-10-14" },
      { major: 3, minor: 9, eolDate: "2025-10-05" },
    ];

    return eolVersions.some(
      (v) =>
        v.major === major &&
        v.minor === minor &&
        new Date() > new Date(v.eolDate),
    );
  }

  /**
   * Get required Python version from pyproject.toml
   */
  private async getRequiredPythonVersion(
    directory: string,
  ): Promise<string | undefined> {
    const pyprojectPath = path.join(directory, "pyproject.toml");
    try {
      await fs.access(pyprojectPath);
      const content = await fs.readFile(pyprojectPath, "utf-8");
      const match = content.match(/requires-python\s*=\s*"([^"]+)"/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Check Python version and generate PythonVersionInfo
   */
  private async checkPythonVersion(
    directory: string,
  ): Promise<PythonVersionInfo | undefined> {
    try {
      const pythonExecutable = await this.detectPythonExecutable();
      if (!pythonExecutable) {
        return undefined;
      }

      const versionResult = await this.executor.execute(pythonExecutable, {
        cwd: directory,
        args: ["--version"],
        timeout: PythonTools.TIMEOUT_VERSION_CHECK,
      });

      if (!versionResult.success) {
        return undefined;
      }

      const versionMatch = versionResult.stdout.match(/Python (\d+\.\d+\.\d+)/);
      const current = versionMatch ? versionMatch[1] : "unknown";

      if (current === "unknown") {
        return {
          current,
          isEOL: false,
          recommendation: null,
        };
      }

      // Parse version
      const [major, minor] = current.split(".").map(Number);

      // Check if EOL
      const isEOL = this.isPythonEOL(major, minor);

      // Get required version from pyproject.toml
      const required = await this.getRequiredPythonVersion(directory);

      // Generate recommendation (using existing method)
      const recommendation = this.shouldRecommendUpgrade(current)
        ? this.getUpgradeRecommendation(current)
        : null;

      // Get upgrade reason
      const upgradeReason =
        major !== 3
          ? undefined
          : minor <= 9
            ? "Security updates discontinued, performance improvements available"
            : minor === 10
              ? "Approaching end of life"
              : undefined;

      return {
        current,
        required,
        isEOL,
        recommendation,
        upgradeReason,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Get Python project information
   * Detects Python version, package manager, dependencies, and project structure
   */
  async pythonProjectInfo(
    args: PythonProjectInfoArgs,
  ): Promise<PythonProjectInfo> {
    const dir = args.directory || this.projectRoot;

    // Try cache first (uses projectDetection namespace: 60s TTL)
    const cacheKey = this.buildPythonCacheKey("project-info", { directory: dir });
    const cached = this.cacheManager.get<PythonProjectInfo>(
      "projectDetection",
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const info: PythonProjectInfo = {
      hasPyprojectToml: false,
      hasSetupPy: false,
      hasRequirementsTxt: false,
      hasTests: false,
      testFiles: [],
      dependencies: [],
    };

    try {
      // Check for pyproject.toml
      const pyprojectPath = path.join(dir, "pyproject.toml");
      try {
        await fs.access(pyprojectPath);
        info.hasPyprojectToml = true;

        // Parse pyproject.toml for project metadata
        const pyprojectContent = await fs.readFile(pyprojectPath, "utf8");
        const projectMatch = pyprojectContent.match(
          /\[project\][\s\S]*?name\s*=\s*['"](.*?)['"]/,
        );
        if (projectMatch) {
          info.projectName = projectMatch[1];
        }

        const versionMatch = pyprojectContent.match(
          /\[project\][\s\S]*?version\s*=\s*['"](.*?)['"]/,
        );
        if (versionMatch) {
          info.projectVersion = versionMatch[1];
        }

        // Check for build system (poetry, uv, etc.)
        if (pyprojectContent.includes("[tool.poetry]")) {
          if (!info.packageManager) {
            info.packageManager = "poetry";
          }
        }
        if (pyprojectContent.includes("[tool.uv]")) {
          if (!info.packageManager) {
            info.packageManager = "uv";
          }
        }
      } catch {
        // No pyproject.toml file
      }

      // Check for setup.py
      const setupPyPath = path.join(dir, "setup.py");
      try {
        await fs.access(setupPyPath);
        info.hasSetupPy = true;
      } catch {
        // No setup.py file
      }

      // Check for requirements.txt
      const requirementsTxtPath = path.join(dir, "requirements.txt");
      try {
        await fs.access(requirementsTxtPath);
        info.hasRequirementsTxt = true;
      } catch {
        // No requirements.txt file
      }

      // Check for Pipfile (pipenv)
      const pipfilePath = path.join(dir, "Pipfile");
      try {
        await fs.access(pipfilePath);
        if (!info.packageManager) {
          info.packageManager = "pipenv";
        }
      } catch {
        // No Pipfile
      }

      // Check for poetry.lock
      const poetryLockPath = path.join(dir, "poetry.lock");
      try {
        await fs.access(poetryLockPath);
        if (!info.packageManager) {
          info.packageManager = "poetry";
        }
      } catch {
        // No poetry.lock
      }

      // Check for uv.lock
      const uvLockPath = path.join(dir, "uv.lock");
      try {
        await fs.access(uvLockPath);
        if (!info.packageManager) {
          info.packageManager = "uv";
        }
      } catch {
        // No uv.lock
      }

      // Detect virtual environment
      const venvPaths = [".venv", "venv", "env"];
      for (const venvPath of venvPaths) {
        try {
          await fs.access(path.join(dir, venvPath));
          info.virtualEnv = path.join(dir, venvPath);
          break;
        } catch {
          // Continue checking other paths
        }
      }

      // Detect Python version and generate version info
      const pythonExecutable = await this.detectPythonExecutable();
      const versionInfo = await this.checkPythonVersion(dir);

      if (versionInfo && pythonExecutable) {
        info.pythonVersion = versionInfo.current;
        info.pythonVersionInfo = versionInfo;
        info.pythonExecutable = pythonExecutable;
        info.supportsModernFeatures = !versionInfo.isEOL && !versionInfo.recommendation;

        if (versionInfo.recommendation) {
          info.upgradeRecommendation = versionInfo.recommendation;
        }
      }

      // Count installed packages if we can access pip/uv
      if (pythonExecutable) {
        let pipListResult: ExecutionResult;

        // Try uv if available and packageManager is uv
        if (info.packageManager === "uv") {
          pipListResult = await this.executor.execute("uv", {
            cwd: dir,
            args: ["pip", "list", "--format=quiet"],
            timeout: PythonTools.TIMEOUT_PACKAGE_LIST,
          });
        } else {
          // Use python -m pip for reliable pip invocation (recommended by Python docs)
          // This ensures we use the pip associated with the detected Python interpreter
          pipListResult = await this.executor.execute(pythonExecutable, {
            cwd: dir,
            args: ["-m", "pip", "list", "--quiet"],
            timeout: PythonTools.TIMEOUT_PACKAGE_LIST,
          });
        }

        if (pipListResult.success) {
          const packageLines = pipListResult.stdout
            .split("\n")
            .filter((line) => line.trim() && !line.includes("WARNING"));
          info.installedPackages = packageLines.length;
          info.dependencies = packageLines;
        }
      }

      // Look for test files (pytest patterns) - run glob operations in parallel
      const testPatterns = ["test_*.py", "*_test.py", "tests/"];
      const uniqueTestFiles = new Set<string>();
      try {
        const { glob: globFunc } = await import("glob");
        // Run all glob operations in parallel for better performance
        const globPromises = testPatterns.map((pattern) =>
          globFunc(path.join(dir, pattern), { nodir: false }),
        );
        const allMatches = await Promise.all(globPromises);

        // Process results
        for (const matches of allMatches) {
          if (matches.length > 0) {
            info.hasTests = true;
            const relativePaths = matches.map((f) => path.relative(dir, f));
            for (const relativePath of relativePaths) {
              uniqueTestFiles.add(relativePath);
            }
          }
        }

        if (uniqueTestFiles.size > 0) {
          const relativePaths = Array.from(uniqueTestFiles);
          const displayCount = Math.min(10, relativePaths.length);
          const displayFiles = relativePaths.slice(0, displayCount);

          if (relativePaths.length > displayCount) {
            displayFiles.push(
              `... and ${relativePaths.length - displayCount} more test files`,
            );
          }

          info.testFiles.push(...displayFiles);
        }
      } catch {
        // Glob failed, continue
      }

      // Try to detect package manager if not already detected
      if (!info.packageManager) {
        // Check for pip requirements
        if (info.hasRequirementsTxt) {
          info.packageManager = "pip";
        } else {
          info.packageManager = "pip"; // Default to pip
        }
      }

      // Cache the result (uses projectDetection namespace: 60s TTL)
      this.cacheManager.set("projectDetection", cacheKey, info);

      return info;
    } catch (error) {
      if (this.isExpectedProjectInfoError(error)) {
        return info;
      }
      console.error(
        "[pythonTools] Unexpected error gathering project info",
        error,
      );
      throw error;
    }
  }

  /**
   * Run Python tests with pytest
   *
   * Supports coverage reporting, test selection by path/pattern/markers,
   * verbose output, and test result parsing. Results are NOT cached
   * since test outcomes can change frequently.
   *
   * @param args - Test configuration options
   * @returns Test results including pass/fail counts and coverage
   *
   * @example
   * ```typescript
   * // Run all tests with coverage
   * await pythonTools.pythonTest({ coverage: true });
   *
   * // Run specific test file
   * await pythonTools.pythonTest({
   *   testPath: 'tests/test_api.py',
   *   verbose: true
   * });
   *
   * // Run tests matching a pattern
   * await pythonTools.pythonTest({
   *   pattern: 'test_unit',
   *   coverage: true
   * });
   * ```
   */
  async pythonTest(args: PythonTestArgs): Promise<PythonToolResult> {
    const dir = args.directory || this.projectRoot;
    const validated = PythonTestArgsSchema.parse(args);

    // Check cache (uses testResults namespace: 60s TTL)
    const cacheKey = this.buildPythonCacheKey("test", args);
    const cached = this.cacheManager.get<PythonToolResult>(
      "testResults",
      cacheKey,
    );
    if (cached) {
      return {
        ...cached,
        command: cached.command + " (cached)",
      };
    }

    const startTime = performance.now();

    try {
      // Build pytest command incrementally
      const commandArgs: string[] = [];

      // Add coverage flags
      if (validated.coverage !== false) {
        commandArgs.push("--cov=.");
        commandArgs.push("--cov-report=term-missing");
      }

      // Add verbose flag
      if (validated.verbose) {
        commandArgs.push("-vv");
      }

      // Add parallel execution
      if (validated.parallel) {
        commandArgs.push("-n", validated.maxWorkers?.toString() || "auto");
      }

      // Add fail fast
      if (validated.failFast) {
        commandArgs.push("-x");
      }

      // Add JUnit XML output
      if (validated.junitXml) {
        commandArgs.push(`--junit-xml=${validated.junitXml}`);
      }

      // Add markers (e.g., -m "unit" to run tests marked as unit tests)
      if (validated.markers) {
        commandArgs.push("-m", validated.markers);
      }

      // Add test pattern matching (e.g., -k "test_foo" to match specific tests)
      if (validated.pattern) {
        commandArgs.push("-k", validated.pattern);
      }

      // Add additional arguments
      if (validated.args && validated.args.length > 0) {
        commandArgs.push(...validated.args);
      }

      // Add test path or default to current directory
      if (validated.testPath) {
        this.validateFilePaths([validated.testPath]);
        commandArgs.push(validated.testPath);
      } else {
        commandArgs.push(".");
      }

      const result = await this.executor.execute("pytest", {
        cwd: dir,
        args: commandArgs,
        timeout: validated.timeout || 300000, // 5 minutes default
      });

      const duration = performance.now() - startTime;
      const pythonResult = this.processPythonResult(result, "pytest", duration);

      // Cache successful test results (uses testResults namespace: 60s TTL)
      if (pythonResult.success) {
        this.cacheManager.set("testResults", cacheKey, pythonResult);
      }

      return pythonResult;
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: "",
        error: errorMsg,
        duration,
        command: "pytest",
        suggestions: this.generateSuggestions("pytest", {
          success: false,
          stdout: "",
          stderr: errorMsg,
          exitCode: 1,
          duration: 0,
          command: "pytest",
          error: errorMsg,
        } as ExecutionResult),
      };
    }
  }

  /**
   * Lint Python code with ruff check
   *
   * Features:
   * - Run ruff check for style and correctness issues
   * - Support auto-fix mode (--fix)
   * - Support check-only mode (no file modification)
   * - Respect pyproject.toml configuration
   * - Provide detailed error explanations
   *
   * @param args - Linting configuration with directory, files, fix, check options
   * @returns Result with linting output, errors, and suggestions
   */
  async pythonLint(args: PythonLintArgs): Promise<PythonToolResult> {
    const validated = PythonLintArgsSchema.parse(args);
    const directory = validated.directory || this.projectRoot;
    const startTime = performance.now();

    try {
      const commandArgs: string[] = ["check"];

      // Add fix flag (auto-fix issues)
      if (validated.fix) {
        commandArgs.push("--fix");
      }

      // Add output format
      if (validated.outputFormat && validated.outputFormat !== "text") {
        commandArgs.push("--output-format", validated.outputFormat);
      }

      // Add rule selection
      if (validated.select && validated.select.length > 0) {
        commandArgs.push("--select", validated.select.join(","));
      }

      // Add rule ignores
      if (validated.ignore && validated.ignore.length > 0) {
        commandArgs.push("--ignore", validated.ignore.join(","));
      }

      // Add show fixes
      if (validated.showFixes) {
        commandArgs.push("--show-fixes");
      }

      // Add files to lint, or current directory
      if (validated.files && validated.files.length > 0) {
        this.validateFilePaths(validated.files);
        commandArgs.push(...validated.files);
      } else {
        commandArgs.push(".");
      }

      // Add additional arguments
      if (validated.args && validated.args.length > 0) {
        commandArgs.push(...validated.args);
      }

      const result = await this.executor.execute("ruff", {
        cwd: directory,
        args: commandArgs,
        timeout: validated.timeout || 300000,
      });

      const duration = performance.now() - startTime;
      return this.processPythonResult(result, "ruff check", duration);
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: "",
        error: errorMsg,
        duration,
        command: "ruff check",
        suggestions: this.generateSuggestions("ruff", {
          success: false,
          stdout: "",
          stderr: errorMsg,
          exitCode: 1,
          duration: 0,
          command: "ruff check",
          error: errorMsg,
        }),
      };
    }
  }

  /**
   * Format Python code with ruff format
   *
   * Features:
   * - Format code with ruff format command
   * - Check mode to verify formatting without modifying files
   * - Respect line length and style settings from pyproject.toml
   * - Support unstable formatting features with preview flag
   *
   * @param args - Formatting configuration with directory, files, check, preview options
   * @returns Result with formatting output and suggestions
   */
  async pythonFormat(args: PythonFormatArgs): Promise<PythonToolResult> {
    const validated = PythonFormatArgsSchema.parse(args);
    const directory = validated.directory || this.projectRoot;
    const startTime = performance.now();

    try {
      const commandArgs: string[] = ["format"];

      // Add check flag (verify without modifying)
      if (validated.check) {
        commandArgs.push("--check");
      }

      // Add line length
      if (validated.lineLength) {
        commandArgs.push("--line-length", validated.lineLength.toString());
      }

      // Add preview mode
      if (validated.preview) {
        commandArgs.push("--preview");
      }

      // Add files to format, or current directory
      if (validated.files && validated.files.length > 0) {
        this.validateFilePaths(validated.files);
        commandArgs.push(...validated.files);
      } else {
        commandArgs.push(".");
      }

      // Add additional arguments
      if (validated.args && validated.args.length > 0) {
        commandArgs.push(...validated.args);
      }

      const result = await this.executor.execute("ruff", {
        cwd: directory,
        args: commandArgs,
        timeout: validated.timeout || 300000,
      });

      const duration = performance.now() - startTime;
      return this.processPythonResult(result, "ruff format", duration);
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: "",
        error: errorMsg,
        duration,
        command: "ruff format",
        suggestions: this.generateSuggestions("ruff", {
          success: false,
          stdout: "",
          stderr: errorMsg,
          exitCode: 1,
          duration: 0,
          command: "ruff format",
          error: errorMsg,
        }),
      };
    }
  }

  /**
   * Check Python types with pyright
   *
   * Pyright is a fast, strict type checker for Python with excellent editor integration
   * and helpful error messages. It provides better performance and more helpful error
   * messages than mypy.
   *
   * @param args - Type checking configuration
   * @returns Type checking results with error/warning counts
   *
   * @example
   * ```typescript
   * // Standard type checking
   * await pythonTools.pythonCheckTypes({});
   *
   * // Watch mode with verbose output
   * await pythonTools.pythonCheckTypes({
   *   watch: true,
   *   verbose: true
   * });
   * ```
   */
  async pythonCheckTypes(args: PythonTypeCheckArgs): Promise<PythonToolResult> {
    const validated = PythonTypeCheckArgsSchema.parse(args);
    const directory = validated.directory || this.projectRoot;
    const startTime = performance.now();

    try {
      // Build pyright command
      const commandArgs: string[] = [];

      // Add output format
      if (validated.outputFormat === "json") {
        commandArgs.push("--outputjson");
      }

      // Add strictness level (default: standard)
      const level = validated.level || "standard";
      if (level === "strict") {
        commandArgs.push("--level", "error");
      } else if (level === "basic") {
        commandArgs.push("--level", "warning");
      }

      // Add Python version
      if (validated.pythonVersion) {
        commandArgs.push("--pythonversion", validated.pythonVersion);
      }

      // Add stats
      if (validated.showStats) {
        commandArgs.push("--stats");
      }

      // Add create stubs
      if (validated.createStubs) {
        commandArgs.push("--createstub");
      }

      // Add watch mode
      if (validated.watch) {
        commandArgs.push("--watch");
      }

      // Add verbose output
      if (validated.verbose) {
        commandArgs.push("--verbose");
      }

      // Add specific files to check
      if (validated.files && validated.files.length > 0) {
        this.validateFilePaths(validated.files);
        commandArgs.push(...validated.files);
      }

      // Add any additional arguments
      if (validated.args && validated.args.length > 0) {
        commandArgs.push(...validated.args);
      }

      const result = await this.executor.execute("pyright", {
        cwd: directory,
        args: commandArgs,
        timeout: validated.timeout || 120000, // 2 minutes for large codebases
      });

      const duration = performance.now() - startTime;
      return this.parsePyrightOutput(result, duration);
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        output: "",
        error: errorMsg,
        duration,
        command: "pyright",
        suggestions: this.generateSuggestions("pyright", {
          success: false,
          stdout: "",
          stderr: errorMsg,
          exitCode: 1,
          duration: 0,
          command: "pyright",
          error: errorMsg,
        }),
      };
    }
  }

  /**
   * Parse pyright output and extract type checking results
   */
  private parsePyrightOutput(
    result: ExecutionResult,
    duration: number,
  ): PythonToolResult {
    const output = this.formatOutput(result);

    // Parse error and information counts from output
    // Format: "X errors, Y warnings, Z informations"
    // or for success: "0 errors, 0 warnings, 0 informations"
    const errorMatch = output.match(/(\d+)\s+errors?/i);
    const warningMatch = output.match(/(\d+)\s+warnings?/i);
    const infoMatch = output.match(/(\d+)\s+informations?/i);

    const errors = errorMatch ? parseInt(errorMatch[1], 10) : 0;
    const warnings = warningMatch ? parseInt(warningMatch[1], 10) : 0;
    const infos = infoMatch ? parseInt(infoMatch[1], 10) : 0;

    const toolResult: PythonToolResult = {
      success: result.success && errors === 0,
      output,
      duration,
      command: "pyright",
    };

    if (!result.success || errors > 0) {
      toolResult.error = `Type checking failed: ${errors} errors, ${warnings} warnings`;
      toolResult.suggestions = this.generateSuggestions("pyright", result);
    }

    // Add error summary to output if not already present
    if (!output.includes("errors")) {
      toolResult.output = `${output}\n\nSummary: ${errors} errors, ${warnings} warnings, ${infos} informations`;
    }

    return toolResult;
  }

  /**
   * Install Python dependencies using uv (or pip fallback)
   *
   * Supports multiple package managers with preference order: uv > poetry > pipenv > pip.
   * Prefers uv for 10-100x faster installation and unified dependency management.
   *
   * @param args - Dependency installation configuration
   * @returns Installation results with success status and output
   *
   * @example
   * ```typescript
   * // Install all dependencies with auto-detected package manager
   * await pythonTools.pythonInstallDeps({});
   *
   * // Install with dev dependencies
   * await pythonTools.pythonInstallDeps({ dev: true });
   *
   * // Force specific package manager
   * await pythonTools.pythonInstallDeps({
   *   packageManager: 'uv'
   * });
   * ```
   */
  async pythonInstallDeps(
    args: PythonInstallDepsArgs,
  ): Promise<PythonToolResult> {
    const dir = args.directory || this.projectRoot;

    // Determine package manager to use
    let packageManager: string = args.packageManager || "auto";
    if (packageManager === "auto") {
      packageManager = await this.detectPackageManager(dir);
    }

    // Build command based on package manager
    const commandArgs = this.buildInstallCommand(packageManager, args);

    const result = await this.executor.execute(packageManager as string, {
      cwd: dir,
      args: commandArgs,
      timeout: args.timeout || 600000, // 10 minutes for large dependencies
    });

    const fullCommand = [packageManager, ...commandArgs].join(" ");
    return this.processPythonResult(result, fullCommand);
  }

  /**
   * Get Python tool versions
   *
   * Detects versions of Python interpreter and related tools (pip, uv, poetry, pyright, ruff, pytest).
   * Results are cached with 1hr TTL in commandAvailability namespace.
   *
   * @param args - Version check arguments
   * @returns Tool version information
   */
  async pythonVersion(args: PythonVersionArgs): Promise<PythonToolResult> {
    const dir = args.directory || this.projectRoot;
    const tool = args.tool || "all";

    // Try cache first (1hr TTL)
    const cacheKey = this.buildPythonCacheKey("version", {
      directory: dir,
      tool,
    });
    const cached = this.cacheManager.get<PythonToolResult>(
      "commandAvailability",
      cacheKey,
    );
    if (cached) {
      return cached;
    }

    const versions: Record<string, string> = {};
    const tools =
      tool === "all"
        ? ["python", "pip", "uv", "poetry", "pyright", "ruff", "pytest"]
        : [tool];

    for (const t of tools) {
      try {
        // Use python3 if tool is 'python'
        const cmd = t === "python" ? "python3" : t;
        const result = await this.executor.execute(cmd, {
          cwd: dir,
          args: ["--version"],
          timeout: PythonTools.TIMEOUT_VERSION_CHECK,
        });
        if (result.success) {
          versions[t] = result.stdout.trim().replace(/^v/, "");
        } else {
          versions[t] = "not installed";
        }
      } catch {
        // Tool not available
        versions[t] = "not installed";
      }
    }

    const output = Object.entries(versions)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    const toolResult: PythonToolResult = {
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
   * Python security scanning with bandit and pip-audit
   * Issue: #138
   */
  async pythonSecurity(args: PythonSecurityArgs): Promise<PythonToolResult> {
    const startTime = Date.now();
    const directory = args.directory || this.projectRoot;
    const tool = args.tool || "both";
    const severity = args.severity || "all";
    const format = args.format || "text";

    const results: string[] = [];
    let allSuccess = true;
    let combinedOutput = "";

    // Run bandit if requested
    if (tool === "bandit" || tool === "both") {
      const banditArgs: string[] = ["-r", "."];

      // Add severity filter
      if (severity !== "all") {
        const severityMap = { low: "ll", medium: "lm", high: "lh" };
        banditArgs.push("-" + severityMap[severity as keyof typeof severityMap]);
      }

      // Add format
      if (format === "json") {
        banditArgs.push("-f", "json");
      } else if (format === "sarif") {
        banditArgs.push("-f", "sarif");
      }

      if (args.args) {
        banditArgs.push(...args.args);
      }

      const banditResult = await this.executor.execute("bandit", {
        cwd: directory,
        args: banditArgs,
        timeout: args.timeout || 60000,
      });

      combinedOutput += `=== Bandit Results ===\n${banditResult.stdout || banditResult.stderr}\n\n`;
      allSuccess = allSuccess && banditResult.success;
      results.push(`Bandit: ${banditResult.success ? "✓ No issues" : "✗ Issues found"}`);
    }

    // Run pip-audit if requested
    if (tool === "pip-audit" || tool === "both") {
      const pipAuditArgs: string[] = [];

      // Add format
      if (format === "json") {
        pipAuditArgs.push("--format", "json");
      }

      // Add fix flag
      if (args.fix) {
        pipAuditArgs.push("--fix");
      }

      if (args.args) {
        pipAuditArgs.push(...args.args);
      }

      const pipAuditResult = await this.executor.execute("pip-audit", {
        cwd: directory,
        args: pipAuditArgs,
        timeout: args.timeout || 60000,
      });

      combinedOutput += `=== pip-audit Results ===\n${pipAuditResult.stdout || pipAuditResult.stderr}\n`;
      allSuccess = allSuccess && pipAuditResult.success;
      results.push(`pip-audit: ${pipAuditResult.success ? "✓ No vulnerabilities" : "✗ Vulnerabilities found"}`);
    }

    const duration = Date.now() - startTime;
    return {
      success: allSuccess,
      output: combinedOutput || results.join("\n"),
      error: allSuccess ? undefined : "Security issues detected",
      duration,
      command: `python_security (${tool})`,
      suggestions: allSuccess
        ? undefined
        : [
            "Review security issues above",
            "Update vulnerable dependencies",
            "Consider using: pip install --upgrade <package>",
          ],
    };
  }

  /**
   * Build Python packages (wheels and sdists)
   * Issue: #139
   */
  async pythonBuild(args: PythonBuildArgs): Promise<PythonToolResult> {
    const startTime = Date.now();
    const directory = args.directory || this.projectRoot;
    const pythonExec = await this.detectPythonExecutable();

    if (!pythonExec) {
      return {
        success: false,
        output: "",
        error: "Python executable not found",
        duration: Date.now() - startTime,
        command: "python_build",
        suggestions: ["Install Python 3.x", "Ensure python3 or python is in PATH"],
      };
    }

    const buildArgs: string[] = ["-m", "build"];

    // Determine build targets
    const buildWheel = args.wheel !== false;
    const buildSdist = args.sdist !== false;

    if (buildWheel && !buildSdist) {
      buildArgs.push("--wheel");
    } else if (!buildWheel && buildSdist) {
      buildArgs.push("--sdist");
    }
    // If both true, build both (default behavior, no flags needed)

    // Output directory
    if (args.outdir) {
      buildArgs.push("--outdir", args.outdir);
    }

    // Build isolation
    if (args.noBuildIsolation) {
      buildArgs.push("--no-isolation");
    }

    // Skip dependency check
    if (args.skipDependencyCheck) {
      buildArgs.push("--skip-dependency-check");
    }

    // Additional args
    if (args.args) {
      buildArgs.push(...args.args);
    }

    const result = await this.executor.execute(pythonExec, {
      cwd: directory,
      args: buildArgs,
      timeout: args.timeout || 300000, // 5 minutes default
    });

    const duration = Date.now() - startTime;
    const suggestions = this.generateSuggestions("python -m build", result);

    // Add build-specific suggestions
    if (!result.success) {
      if (result.stderr.includes("No module named build")) {
        suggestions.unshift("Install build module: pip install build");
      }
      if (result.stderr.includes("pyproject.toml")) {
        suggestions.unshift("Ensure pyproject.toml has valid [build-system] section");
      }
    }

    return {
      success: result.success,
      output: result.stdout || result.stderr,
      error: result.success ? undefined : result.stderr,
      duration,
      command: `python -m build`,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Virtual environment management
   * Issue: #140
   */
  async pythonVenv(args: PythonVenvArgs): Promise<PythonToolResult> {
    const startTime = Date.now();
    const directory = args.directory || this.projectRoot;
    const action = args.action || "info";
    const venvPath = args.venvPath || ".venv";
    const fullVenvPath = path.join(directory, venvPath);

    // Check if venv exists
    const venvExists = existsSync(fullVenvPath);

    switch (action) {
      case "info": {
        if (!venvExists) {
          return {
            success: true,
            output: `Virtual environment not found at ${venvPath}`,
            duration: Date.now() - startTime,
            command: "python_venv info",
            suggestions: [`Create venv: python -m venv ${venvPath}`],
          };
        }

        // Get venv info
        const pythonPath = path.join(
          fullVenvPath,
          process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
        );
        const pipPath = path.join(
          fullVenvPath,
          process.platform === "win32" ? "Scripts/pip.exe" : "bin/pip",
        );

        return {
          success: true,
          output: `Virtual environment exists at ${venvPath}\nPython: ${pythonPath}\nPip: ${pipPath}`,
          duration: Date.now() - startTime,
          command: "python_venv info",
        };
      }

      case "list": {
        if (!venvExists) {
          return {
            success: false,
            output: "",
            error: `Virtual environment not found at ${venvPath}`,
            duration: Date.now() - startTime,
            command: "python_venv list",
            suggestions: [`Create venv first: python -m venv ${venvPath}`],
          };
        }

        const pipPath = path.join(
          fullVenvPath,
          process.platform === "win32" ? "Scripts/pip" : "bin/pip",
        );
        const result = await this.executor.execute(pipPath, {
          cwd: directory,
          args: ["list"],
          timeout: args.timeout || 30000,
        });

        return {
          success: result.success,
          output: result.stdout || result.stderr,
          error: result.success ? undefined : result.stderr,
          duration: Date.now() - startTime,
          command: "pip list",
        };
      }

      case "create": {
        if (venvExists && !args.clear) {
          return {
            success: false,
            output: "",
            error: `Virtual environment already exists at ${venvPath}`,
            duration: Date.now() - startTime,
            command: "python_venv create",
            suggestions: ["Use clear: true to recreate", "Use a different venvPath"],
          };
        }

        // Try using uv first (much faster)
        let result = await this.executor.execute("uv", {
          cwd: directory,
          args: ["venv", venvPath],
          timeout: args.timeout || 60000,
        });

        if (!result.success) {
          // Fallback to python -m venv
          const pythonExec = args.python || (await this.detectPythonExecutable()) || "python3";
          const venvArgs = ["-m", "venv"];

          if (args.systemSitePackages) {
            venvArgs.push("--system-site-packages");
          }

          if (args.clear) {
            venvArgs.push("--clear");
          }

          if (args.args) {
            venvArgs.push(...args.args);
          }

          venvArgs.push(venvPath);

          result = await this.executor.execute(pythonExec, {
            cwd: directory,
            args: venvArgs,
            timeout: args.timeout || 60000,
          });
        }

        return {
          success: result.success,
          output: result.stdout || result.stderr || `Created virtual environment at ${venvPath}`,
          error: result.success ? undefined : result.stderr,
          duration: Date.now() - startTime,
          command: "python_venv create",
        };
      }

      case "delete": {
        if (!venvExists) {
          return {
            success: false,
            output: "",
            error: `Virtual environment not found at ${venvPath}`,
            duration: Date.now() - startTime,
            command: "python_venv delete",
          };
        }

        try {
          await fs.rm(fullVenvPath, { recursive: true, force: true });
          return {
            success: true,
            output: `Deleted virtual environment at ${venvPath}`,
            duration: Date.now() - startTime,
            command: "python_venv delete",
          };
        } catch (error) {
          return {
            success: false,
            output: "",
            error: error instanceof Error ? error.message : "Failed to delete venv",
            duration: Date.now() - startTime,
            command: "python_venv delete",
          };
        }
      }

      default:
        return {
          success: false,
          output: "",
          error: `Unknown action: ${action}`,
          duration: Date.now() - startTime,
          command: "python_venv",
        };
    }
  }

  /**
   * Python benchmarking with pytest-benchmark
   * Issue: #141
   */
  async pythonBenchmark(args: PythonBenchmarkArgs): Promise<PythonToolResult> {
    const startTime = Date.now();
    const directory = args.directory || this.projectRoot;
    const pythonExec = await this.detectPythonExecutable();

    if (!pythonExec) {
      return {
        success: false,
        output: "",
        error: "Python executable not found",
        duration: Date.now() - startTime,
        command: "python_benchmark",
        suggestions: ["Install Python 3.x", "Ensure python3 or python is in PATH"],
      };
    }

    const pytestArgs: string[] = ["-m", "pytest", "--benchmark-only"];

    // Add benchmark pattern
    if (args.benchmarks) {
      pytestArgs.push("-k", args.benchmarks);
    }

    // Compare against baseline
    if (args.compare) {
      pytestArgs.push("--benchmark-compare=" + args.compare);
    }

    // Save to baseline
    if (args.save) {
      pytestArgs.push("--benchmark-save=" + args.save);
    }

    // JSON output
    if (args.json) {
      pytestArgs.push("--benchmark-json=benchmark-results.json");
    }

    // Warmup
    if (args.warmup) {
      pytestArgs.push(`--benchmark-warmup=${args.warmup}`);
    }

    // Additional args
    if (args.args) {
      pytestArgs.push(...args.args);
    }

    const result = await this.executor.execute(pythonExec, {
      cwd: directory,
      args: pytestArgs,
      timeout: args.timeout || 300000, // 5 minutes
    });

    const duration = Date.now() - startTime;
    const suggestions = this.generateSuggestions("pytest --benchmark-only", result);

    if (!result.success) {
      if (result.stderr.includes("No module named pytest") || result.stderr.includes("No module named benchmark")) {
        suggestions.unshift("Install pytest-benchmark: pip install pytest-benchmark");
      }
    }

    return {
      success: result.success,
      output: result.stdout || result.stderr,
      error: result.success ? undefined : result.stderr,
      duration,
      command: "pytest --benchmark-only",
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Update Python dependencies
   * Issue: #142
   */
  async pythonUpdateDeps(args: PythonUpdateDepsArgs): Promise<PythonToolResult> {
    const startTime = Date.now();
    const directory = args.directory || this.projectRoot;
    const mode = args.mode || "check";
    const packageManager = await this.detectPackageManager(directory);

    let command: string;
    let commandArgs: string[];

    switch (packageManager) {
      case "uv":
        command = "uv";
        commandArgs = ["pip", "list", "--outdated"];
        if (mode !== "check") {
          commandArgs = ["pip", "install", "--upgrade"];
          if (args.packages && args.packages.length > 0) {
            commandArgs.push(...args.packages);
          } else {
            commandArgs.push(".");
          }
        }
        break;

      case "poetry":
        command = "poetry";
        commandArgs = mode === "check" ? ["show", "--outdated"] : ["update"];
        if (args.packages && args.packages.length > 0 && mode !== "check") {
          commandArgs.push(...args.packages);
        }
        break;

      case "pipenv":
        command = "pipenv";
        commandArgs = mode === "check" ? ["update", "--dry-run"] : ["update"];
        if (args.packages && args.packages.length > 0 && mode !== "check") {
          commandArgs.push(...args.packages);
        }
        break;

      default:
        command = "pip";
        commandArgs = ["list", "--outdated"];
        if (mode !== "check") {
          commandArgs = ["install", "--upgrade"];
          if (args.packages && args.packages.length > 0) {
            commandArgs.push(...args.packages);
          }
        }
        break;
    }

    // Dry run for pip/uv
    if (args.dryRun && (packageManager === "pip" || packageManager === "uv")) {
      commandArgs.push("--dry-run");
    }

    // Additional args
    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute(command, {
      cwd: directory,
      args: commandArgs,
      timeout: args.timeout || 120000,
    });

    const duration = Date.now() - startTime;

    return {
      success: result.success,
      output: result.stdout || result.stderr,
      error: result.success ? undefined : result.stderr,
      duration,
      command: `${command} ${commandArgs.join(" ")}`,
      suggestions: result.success
        ? undefined
        : [
            "Check if package manager is installed",
            "Verify requirements.txt or pyproject.toml exists",
          ],
    };
  }

  /**
   * Python version compatibility checking
   * Issue: #143
   */
  async pythonCompatibility(args: PythonCompatibilityArgs): Promise<PythonToolResult> {
    const startTime = Date.now();
    const directory = args.directory || this.projectRoot;

    // Use vermin to detect minimum Python version
    const verminArgs: string[] = [directory];

    if (args.targetVersion) {
      verminArgs.push("-t=" + args.targetVersion);
    }

    if (args.files && args.files.length > 0) {
      verminArgs.length = 0;
      verminArgs.push(...args.files);
    }

    if (args.args) {
      verminArgs.push(...args.args);
    }

    const result = await this.executor.execute("vermin", {
      cwd: directory,
      args: verminArgs,
      timeout: args.timeout || 60000,
    });

    let output = result.stdout || result.stderr;

    // Optionally suggest upgrades with pyupgrade
    if (args.suggest && result.success) {
      const pyupgradeArgs = ["--py311-plus", "--diff"];
      if (args.files && args.files.length > 0) {
        pyupgradeArgs.push(...args.files);
      } else {
        pyupgradeArgs.push(".");
      }

      const upgradeResult = await this.executor.execute("pyupgrade", {
        cwd: directory,
        args: pyupgradeArgs,
        timeout: args.timeout || 60000,
      });

      if (upgradeResult.stdout) {
        output += "\n\n=== Suggested Upgrades (pyupgrade) ===\n" + upgradeResult.stdout;
      }
    }

    const duration = Date.now() - startTime;
    const suggestions = this.generateSuggestions("vermin", result);

    if (!result.success) {
      if (result.stderr.includes("vermin") && result.stderr.includes("not found")) {
        suggestions.unshift("Install vermin: pip install vermin");
      }
    }

    return {
      success: result.success,
      output,
      error: result.success ? undefined : result.stderr,
      duration,
      command: "vermin",
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Python profiling and optimization
   * Issue: #144
   */
  async pythonProfile(args: PythonProfileArgs): Promise<PythonToolResult> {
    const startTime = Date.now();
    const directory = args.directory || this.projectRoot;
    const profiler = args.profiler || "cprofile";
    const topN = args.topN || 20;

    let command: string;
    let commandArgs: string[];

    switch (profiler) {
      case "cprofile": {
        const pythonExec = await this.detectPythonExecutable();
        if (!pythonExec) {
          return {
            success: false,
            output: "",
            error: "Python executable not found",
            duration: Date.now() - startTime,
            command: "python_profile",
            suggestions: ["Install Python 3.x"],
          };
        }

        command = pythonExec;
        commandArgs = ["-m", "cProfile"];

        if (args.outputFile) {
          commandArgs.push("-o", args.outputFile);
        } else {
          commandArgs.push("-s", "cumulative");
        }

        commandArgs.push(args.command);

        if (args.args) {
          commandArgs.push(...args.args);
        }
        break;
      }

      case "pyspy":
        command = "py-spy";
        commandArgs = ["record"];

        if (args.format === "flamegraph") {
          commandArgs.push("--format", "flamegraph");
        } else if (args.format === "json") {
          commandArgs.push("--format", "speedscope");
        }

        if (args.outputFile) {
          commandArgs.push("-o", args.outputFile);
        }

        commandArgs.push("--", args.command);

        if (args.args) {
          commandArgs.push(...args.args);
        }
        break;

      case "memray":
        command = "memray";
        commandArgs = ["run"];

        if (args.outputFile) {
          commandArgs.push("-o", args.outputFile);
        }

        commandArgs.push(args.command);

        if (args.args) {
          commandArgs.push(...args.args);
        }
        break;

      default:
        return {
          success: false,
          output: "",
          error: `Unknown profiler: ${profiler}`,
          duration: Date.now() - startTime,
          command: "python_profile",
        };
    }

    const result = await this.executor.execute(command, {
      cwd: directory,
      args: commandArgs,
      timeout: args.timeout || 300000, // 5 minutes
    });

    let output = result.stdout || result.stderr;

    // For cProfile, show top N functions if not saving to file
    if (profiler === "cprofile" && !args.outputFile && result.success) {
      const lines = output.split("\n");
      output = lines.slice(0, Math.min(lines.length, topN + 10)).join("\n");
    }

    const duration = Date.now() - startTime;
    const suggestions = this.generateSuggestions(command, result);

    if (!result.success) {
      if (profiler === "pyspy" && result.stderr.includes("py-spy")) {
        suggestions.unshift("Install py-spy: pip install py-spy");
      } else if (profiler === "memray" && result.stderr.includes("memray")) {
        suggestions.unshift("Install memray: pip install memray");
      }
    }

    return {
      success: result.success,
      output,
      error: result.success ? undefined : result.stderr,
      duration,
      command: `${command} ${commandArgs.slice(0, 3).join(" ")}`,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  /**
   * Detect package manager to use
   * Strategy: Check lockfiles/config FIRST, then command availability
   * Priority: uv.lock/pyproject[tool.uv] > poetry.lock > Pipfile > pip
   */
  private async detectPackageManager(directory: string): Promise<string> {
    // 1. Check for uv.lock and [tool.uv] in pyproject.toml
    try {
      await fs.access(path.join(directory, "uv.lock"));
      return "uv";
    } catch {
      // Not found
    }

    // Check pyproject.toml for [tool.uv]
    try {
      const pyprojectPath = path.join(directory, "pyproject.toml");
      const content = await fs.readFile(pyprojectPath, "utf-8");
      if (content.includes("[tool.uv]")) {
        return "uv";
      }
    } catch {
      // Not found or can't read
    }

    // 2. Check for poetry.lock and [tool.poetry] config
    try {
      await fs.access(path.join(directory, "poetry.lock"));
      return "poetry";
    } catch {
      // Not found
    }

    // Check pyproject.toml for [tool.poetry]
    try {
      const pyprojectPath = path.join(directory, "pyproject.toml");
      const content = await fs.readFile(pyprojectPath, "utf-8");
      if (content.includes("[tool.poetry]")) {
        return "poetry";
      }
    } catch {
      // Not found or can't read
    }

    // 3. Check for Pipfile (pipenv)
    try {
      await fs.access(path.join(directory, "Pipfile"));
      return "pipenv";
    } catch {
      // Not found
    }

    // 4. Check for uv command availability (if no config detected)
    try {
      const uvResult = await this.executor.execute("uv", {
        cwd: directory,
        args: ["--version"],
        timeout: PythonTools.TIMEOUT_VERSION_CHECK,
      });
      if (uvResult.success) {
        return "uv";
      }
    } catch {
      // uv not available, continue
    }

    // 5. Default to pip
    return "pip";
  }

  /**
   * Build install command arguments based on package manager
   */
  private buildInstallCommand(
    packageManager: string,
    args: PythonInstallDepsArgs,
  ): string[] {
    switch (packageManager) {
      case "uv":
        return this.buildUvCommand(args);
      case "poetry":
        return this.buildPoetryCommand(args);
      case "pipenv":
        return this.buildPipenvCommand(args);
      case "pip":
      case "pip3":
        return this.buildPipCommand(args);
      default:
        return this.buildPipCommand(args);
    }
  }

  /**
   * Build uv command based on mode
   * Supports: install, sync, update, add, remove
   */
  private buildUvCommand(args: PythonInstallDepsArgs): string[] {
    const mode = args.mode || "install";  // Default: install
    const commandArgs = ["pip"];

    switch (mode) {
      case "install":
        commandArgs.push("install");
        break;
      case "sync":
        commandArgs.push("sync");
        if (args.packages && args.packages.length > 0) {
          commandArgs.push(...args.packages);
        } else {
          commandArgs.push("requirements.txt");
        }
        return commandArgs;
      case "update":
        commandArgs.push("install", "--upgrade");
        break;
      case "add":
        commandArgs.push("install");
        break;
      case "remove":
        commandArgs.push("uninstall");
        if (args.packages && args.packages.length > 0) {
          commandArgs.push(...args.packages);
        }
        return commandArgs;
    }

    // Add upgrade flag
    if (args.upgrade && mode !== "update") {
      commandArgs.push("--upgrade");
    }

    // Add prerelease handling
    if (args.prerelease) {
      commandArgs.push("--prerelease", args.prerelease);
    }

    // Add system flag
    if (args.system) {
      commandArgs.push("--system");
    }

    // Add editable flag
    if (args.editable) {
      commandArgs.push("-e");
    }

    // Install dev dependencies (extras)
    if (args.dev && mode === "install") {
      commandArgs.push("--all-extras");
    }

    // Add packages or install from project
    if (args.packages && args.packages.length > 0) {
      commandArgs.push(...args.packages);
    } else if (mode === "install" || mode === "update") {
      // Install from pyproject.toml or requirements.txt
      commandArgs.push(".");
    }

    // Add any additional arguments
    if (args.args && args.args.length > 0) {
      commandArgs.push(...args.args);
    }

    return commandArgs;
  }

  /**
   * Build poetry install command
   * poetry install [--only dev|main] [--no-dev|--with dev]
   */
  private buildPoetryCommand(args: PythonInstallDepsArgs): string[] {
    const commandArgs = ["install"];

    // Handle dev dependencies
    if (args.dev) {
      // Install both dev and main dependencies
      // (default behavior of 'poetry install')
    } else {
      // Install only main dependencies
      commandArgs.push("--only", "main");
    }

    // Add any additional arguments
    if (args.args && args.args.length > 0) {
      commandArgs.push(...args.args);
    }

    return commandArgs;
  }

  /**
   * Build pipenv install command
   * pipenv install [--dev] [--categories {packages,dev-packages,...}]
   */
  private buildPipenvCommand(args: PythonInstallDepsArgs): string[] {
    const commandArgs = ["install"];

    // Handle dev dependencies
    if (args.dev) {
      commandArgs.push("--dev");
    }

    // Add any additional arguments
    if (args.args && args.args.length > 0) {
      commandArgs.push(...args.args);
    }

    return commandArgs;
  }

  /**
   * Build pip command based on mode
   * Supports: install, sync, update, add, remove
   */
  private buildPipCommand(args: PythonInstallDepsArgs): string[] {
    const mode = args.mode || "install";  // Default: install
    const dir = args.directory || this.projectRoot;
    const commandArgs = [];

    switch (mode) {
      case "install":
      case "sync":
        commandArgs.push("install");
        break;
      case "update":
        commandArgs.push("install", "--upgrade");
        break;
      case "add":
        commandArgs.push("install");
        break;
      case "remove":
        commandArgs.push("uninstall", "-y");
        if (args.packages && args.packages.length > 0) {
          commandArgs.push(...args.packages);
        }
        return commandArgs;
    }

    // Add upgrade flag
    if (args.upgrade && mode !== "update") {
      commandArgs.push("--upgrade");
    }

    // Add editable flag
    if (args.editable) {
      commandArgs.push("-e");
    }

    // Add packages or install from requirements
    if (args.packages && args.packages.length > 0) {
      commandArgs.push(...args.packages);
    } else if (mode === "install" || mode === "sync" || mode === "update") {
      // Check for requirements.txt
      const reqPath = path.join(dir, "requirements.txt");
      const reqDevPath = path.join(dir, "requirements-dev.txt");

      try {
        const hasRequirements = existsSync(reqPath);
        if (hasRequirements) {
          commandArgs.push("-r", "requirements.txt");
        }

        // Handle dev dependencies
        if (args.dev) {
          const hasDevRequirements = existsSync(reqDevPath);
          if (hasDevRequirements) {
            commandArgs.push("-r", "requirements-dev.txt");
          }
        }
      } catch {
        // If file system check fails, proceed with defaults
        commandArgs.push("-r", "requirements.txt");
        if (args.dev) {
          commandArgs.push("-r", "requirements-dev.txt");
        }
      }
    }

    // Add any additional arguments
    if (args.args && args.args.length > 0) {
      commandArgs.push(...args.args);
    }

    return commandArgs;
  }

  /**
   * Process Python command result
   */
  private processPythonResult(
    result: ExecutionResult,
    command: string,
    duration?: number,
  ): PythonToolResult {
    const pythonResult: PythonToolResult = {
      success: result.success,
      output: this.formatOutput(result),
      duration: duration !== undefined ? duration : result.duration,
      command,
    };

    if (!result.success) {
      pythonResult.error = result.error || `${command} failed`;
      pythonResult.suggestions = this.generateSuggestions(command, result);
    }

    // Extract coverage if present (pytest format)
    const coverageMatch = result.stdout.match(/TOTAL\s+\d+\s+\d+\s+(\d+)%/);
    if (coverageMatch) {
      pythonResult.coverage = parseFloat(coverageMatch[1]);
    }

    return pythonResult;
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

    // Check for directory errors
    const errorMessage = result.error || result.stderr;
    if (errorMessage.includes("does not exist") || errorMessage.includes("Working directory")) {
      suggestions.push("Verify the directory path exists");
      suggestions.push("Create the directory if needed: mkdir -p <path>");
      suggestions.push("Check your current working directory with: pwd");
    }

    if (result.stderr.includes("command not found")) {
      if (command.includes("pytest")) {
        suggestions.push("Install pytest: pip install pytest");
        suggestions.push("Or with uv: uv pip install pytest");
      } else if (command.includes("ruff")) {
        suggestions.push("Install ruff: pip install ruff");
        suggestions.push("Or with uv: uv pip install ruff");
      } else if (command.includes("pyright")) {
        suggestions.push("Install pyright: npm install -g pyright");
        suggestions.push("Or use local install: npx pyright");
      } else if (command.includes("uv")) {
        suggestions.push("Install uv: curl -LsSf https://astral.sh/uv/install.sh | sh");
        suggestions.push("Or with pip: pip install uv");
      }
    }

    if (result.stderr.includes("No module named")) {
      suggestions.push("Install missing dependencies with: pip install -r requirements.txt");
      suggestions.push("Or with uv: uv pip install -r requirements.txt");
    }

    if (result.stderr.includes("virtual environment")) {
      suggestions.push("Create virtual environment: python -m venv .venv");
      suggestions.push("Activate it: source .venv/bin/activate (Unix) or .venv\\Scripts\\activate (Windows)");
    }

    return suggestions;
  }

  /**
   * Check if Python version should be upgraded
   */
  private shouldRecommendUpgrade(version: string): boolean {
    const match = version.match(/(\d+)\.(\d+)/);
    if (!match) return false;
    const [, major, minor] = match;
    const majorNum = parseInt(major, 10);
    const minorNum = parseInt(minor, 10);
    if (Number.isNaN(majorNum) || Number.isNaN(minorNum)) {
      return false;
    }
    // Recommend upgrade for Python 2.x or Python 3.0-3.9
    return majorNum < 3 || (majorNum === 3 && minorNum <= 9);
  }

  /**
   * Generate upgrade recommendation message
   */
  private getUpgradeRecommendation(version: string): string {
    return `⚠️  Python ${version} is outdated. Upgrade to Python 3.11+ for:
- 20-30% better performance
- Enhanced security updates
- Modern type hints and syntax
- Better error messages

Installation:
- Ubuntu/Debian: sudo apt install python3.11
- macOS: brew install python@3.11
- Windows: Download from python.org`;
  }

  // ============================================================================
  // Zod Schema Validators
  // ============================================================================

  static validateProjectInfoArgs(args: unknown): PythonProjectInfoArgs {
    return PythonProjectInfoSchema.parse(args);
  }

  static validateTestArgs(args: unknown): PythonTestArgs {
    return PythonTestArgsSchema.parse(args);
  }

  static validateLintArgs(args: unknown): PythonLintArgs {
    return PythonLintArgsSchema.parse(args);
  }

  static validateFormatArgs(args: unknown): PythonFormatArgs {
    return PythonFormatArgsSchema.parse(args);
  }

  static validateTypeCheckArgs(args: unknown): PythonTypeCheckArgs {
    return PythonTypeCheckArgsSchema.parse(args);
  }

  static validateInstallDepsArgs(args: unknown): PythonInstallDepsArgs {
    return PythonInstallDepsArgsSchema.parse(args);
  }

  static validateVersionArgs(args: unknown): PythonVersionArgs {
    return PythonVersionArgsSchema.parse(args);
  }

  static validateSecurityArgs(args: unknown): PythonSecurityArgs {
    return PythonSecurityArgsSchema.parse(args);
  }

  static validateBuildArgs(args: unknown): PythonBuildArgs {
    return PythonBuildArgsSchema.parse(args);
  }

  static validateVenvArgs(args: unknown): PythonVenvArgs {
    return PythonVenvArgsSchema.parse(args);
  }

  static validateBenchmarkArgs(args: unknown): PythonBenchmarkArgs {
    return PythonBenchmarkArgsSchema.parse(args);
  }

  static validateUpdateDepsArgs(args: unknown): PythonUpdateDepsArgs {
    return PythonUpdateDepsArgsSchema.parse(args);
  }

  static validateCompatibilityArgs(args: unknown): PythonCompatibilityArgs {
    return PythonCompatibilityArgsSchema.parse(args);
  }

  static validateProfileArgs(args: unknown): PythonProfileArgs {
    return PythonProfileArgsSchema.parse(args);
  }

  /**
   * Determine whether the caught error is expected during project info gathering
   */
  private isExpectedProjectInfoError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    if ("code" in error) {
      const nodeError = error as NodeJS.ErrnoException;
      const expectedCodes = new Set(["ENOENT", "ENOTDIR", "EACCES"]);
      if (nodeError.code && expectedCodes.has(nodeError.code)) {
        return true;
      }
    }

    return false;
  }
}
