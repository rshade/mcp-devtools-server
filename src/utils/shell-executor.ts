import { execa, ExecaError } from "execa";
import * as path from "path";
import * as fs from "fs/promises";
import winston from "winston";
import { getCacheManager } from "./cache-manager.js";

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export interface ShellExecutorOptions {
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
  args?: string[];
  captureOutput?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
  command: string;
  error?: string;
}

// Security: Allowlist of permitted commands
const ALLOWED_COMMANDS = new Set([
  "make",
  "npm",
  "yarn",
  "pnpm",
  "bun",
  "npx",
  "node",
  "markdownlint",
  "yamllint",
  "commitlint",
  "eslint",
  "prettier",
  "tsc",
  "jest",
  "vitest",
  "mocha",
  "pytest",
  "go",
  "gofmt",
  "golangci-lint",
  "staticcheck",
  "govulncheck",
  "actionlint",
  "git",
  "gs", // git-spice plugin support
  "jq", // JSON processor - safe, no code execution
  "cargo",
  "mvn",
  "gradle",
  "dotnet",
  // Test utilities
  "echo",
  "false",
  "true",
  "sh",
]);

// Security: Dangerous arguments to block
const DANGEROUS_ARGS = [
  "&&",
  "||",
  ";",
  "|",
  ">",
  "<",
  "`",
  "$(",
  "${",
  "\n",
  "\r",
];

export class ShellExecutor {
  private defaultTimeout: number;
  private projectRoot: string;
  private cacheManager = getCacheManager();

  constructor(projectRoot?: string, defaultTimeout = 30000) {
    this.projectRoot = projectRoot || process.cwd();
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Validates that the working directory is within project boundaries
   */
  private async validateWorkingDirectory(dir: string): Promise<void> {
    const resolvedDir = path.resolve(dir);
    const resolvedRoot = path.resolve(this.projectRoot);

    if (!resolvedDir.startsWith(resolvedRoot)) {
      throw new Error(`Working directory ${dir} is outside project boundaries`);
    }

    try {
      await fs.access(resolvedDir);
    } catch {
      throw new Error(`Working directory ${dir} does not exist`);
    }
  }

  /**
   * Sanitizes command arguments to prevent injection attacks
   */
  private sanitizeArgs(args: string[]): string[] {
    const sanitized: string[] = [];

    for (const arg of args) {
      // Check for dangerous patterns
      for (const dangerous of DANGEROUS_ARGS) {
        if (arg.includes(dangerous)) {
          throw new Error(`Dangerous argument detected: ${arg}`);
        }
      }

      // Basic sanitization
      const cleaned = arg.replace(/[`$]/g, "");
      sanitized.push(cleaned);
    }

    return sanitized;
  }

  /**
   * Extracts the base command from a full command string
   */
  private extractCommand(command: string): string {
    return command.split(" ")[0];
  }

  /**
   * Validates that a command is allowed
   */
  private validateCommand(command: string): void {
    const baseCommand = this.extractCommand(command);

    if (!ALLOWED_COMMANDS.has(baseCommand)) {
      throw new Error(`Command '${baseCommand}' is not in the allowlist`);
    }
  }

  /**
   * Execute a shell command with security checks and proper error handling
   */
  async execute(
    command: string,
    options: ShellExecutorOptions = {},
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Security validations
      this.validateCommand(command);

      const cwd = options.cwd || this.projectRoot;
      await this.validateWorkingDirectory(cwd);

      // Parse command and arguments
      const [baseCommand, ...commandArgs] = command.split(" ");
      const allArgs = [...commandArgs, ...(options.args || [])];
      const sanitizedArgs = this.sanitizeArgs(allArgs);

      logger.info(
        `Executing: ${baseCommand} ${sanitizedArgs.join(" ")} in ${cwd}`,
      );

      // Execute command
      const { stdout, stderr, exitCode } = await execa(
        baseCommand,
        sanitizedArgs,
        {
          cwd,
          timeout: options.timeout || this.defaultTimeout,
          env: {
            ...process.env,
            ...options.env,
          },
          reject: false,
          all: true,
        },
      );

      const duration = Date.now() - startTime;

      const result: ExecutionResult = {
        success: exitCode === 0,
        stdout: stdout || "",
        stderr: stderr || "",
        exitCode: exitCode ?? -1,
        duration,
        command: `${baseCommand} ${sanitizedArgs.join(" ")}`,
      };

      if (exitCode !== 0) {
        logger.warn(`Command failed with exit code ${exitCode}: ${command}`);
        result.error = `Command exited with code ${exitCode}`;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof Error) {
        logger.error(`Command execution failed: ${error.message}`);

        // Handle timeout specifically
        if ((error as ExecaError).timedOut) {
          return {
            success: false,
            stdout: "",
            stderr: `Command timed out after ${options.timeout || this.defaultTimeout}ms`,
            exitCode: -1,
            duration,
            command,
            error: "Timeout",
          };
        }

        // Handle other errors
        return {
          success: false,
          stdout: "",
          stderr: error.message,
          exitCode: -1,
          duration,
          command,
          error: error.message,
        };
      }

      throw error;
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeSequence(
    commands: string[],
    options: ShellExecutorOptions = {},
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const command of commands) {
      const result = await this.execute(command, options);
      results.push(result);

      // Stop on first failure unless specified otherwise
      if (!result.success) {
        break;
      }
    }

    return results;
  }

  /**
   * Check if a command is available in the system
   */
  async isCommandAvailable(command: string): Promise<boolean> {
    // Try cache first
    const cacheKey = `cmd:${command}`;
    const cached = this.cacheManager.get<boolean>(
      "commandAvailability",
      cacheKey,
    );
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await execa("which", [command], {
        reject: false,
      });
      const isAvailable = result.exitCode === 0;

      // Cache the result (commands rarely change availability during runtime)
      this.cacheManager.set("commandAvailability", cacheKey, isAvailable);

      return isAvailable;
    } catch {
      // Cache negative result too
      this.cacheManager.set("commandAvailability", cacheKey, false);
      return false;
    }
  }

  /**
   * Get available commands from the allowlist
   */
  async getAvailableCommands(): Promise<string[]> {
    const available: string[] = [];

    for (const command of ALLOWED_COMMANDS) {
      if (await this.isCommandAvailable(command)) {
        available.push(command);
      }
    }

    return available;
  }
}
