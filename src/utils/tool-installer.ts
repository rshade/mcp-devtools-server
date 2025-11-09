import { exec } from "child_process";
import { promisify } from "util";
import winston from "winston";
import { ToolInfo } from "./onboarding-wizard.js";

const execAsync = promisify(exec);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

export interface ToolStatus {
  name: string;
  installed: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface InstallResult {
  tool: string;
  success: boolean;
  version?: string;
  command?: string;
  output?: string;
  error?: string;
  duration: number;
}

/**
 * ToolInstaller verifies tool availability and can install missing tools
 */
export class ToolInstaller {
  private timeout: number;
  private readonly ALLOWED_TOOL_PATTERN = /^[a-zA-Z0-9_@./-]+$/;
  private readonly MAX_TIMEOUT = 600000; // 10 minutes
  private readonly MIN_TIMEOUT = 1000; // 1 second

  constructor(timeout = 60000) {
    this.validateTimeout(timeout);
    this.timeout = timeout;
  }

  /**
   * Validate timeout is within acceptable range
   */
  private validateTimeout(timeout: number): void {
    if (timeout < this.MIN_TIMEOUT || timeout > this.MAX_TIMEOUT) {
      throw new Error(
        `Timeout must be between ${this.MIN_TIMEOUT}ms and ${this.MAX_TIMEOUT}ms`,
      );
    }
  }

  /**
   * Sanitize tool name to prevent command injection
   * Allows: letters, numbers, underscore, hyphen, @, dot, forward slash (for scoped packages)
   */
  private sanitizeToolName(tool: string): string {
    if (!tool || typeof tool !== "string") {
      throw new Error("Tool name must be a non-empty string");
    }

    const trimmed = tool.trim();

    if (trimmed.length === 0) {
      throw new Error("Tool name cannot be empty");
    }

    if (trimmed.length > 200) {
      throw new Error("Tool name too long (max 200 characters)");
    }

    if (!this.ALLOWED_TOOL_PATTERN.test(trimmed)) {
      throw new Error(
        `Invalid tool name: ${trimmed}. Only alphanumeric characters, hyphens, underscores, @, dots, and forward slashes are allowed.`,
      );
    }

    // Prevent path traversal attempts
    if (
      trimmed.includes("..") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("\\")
    ) {
      throw new Error(
        `Invalid tool name: ${trimmed}. Path traversal attempts are not allowed.`,
      );
    }

    return trimmed;
  }

  /**
   * Verify if a tool is installed and get its version
   */
  async verifyTool(tool: string): Promise<ToolStatus> {
    try {
      // Sanitize tool name to prevent command injection
      const safeTool = this.sanitizeToolName(tool);

      // Try to get version first (most tools support --version)
      const versionCommands = [
        `${safeTool} --version`,
        `${safeTool} -version`,
        `${safeTool} version`,
      ];

      for (const cmd of versionCommands) {
        try {
          const { stdout, stderr } = await execAsync(cmd, {
            timeout: 5000,
            windowsHide: true,
          });

          const output = stdout || stderr;
          const version = this.extractVersion(output);

          // Also get the path
          const path = await this.getToolPath(tool);

          return {
            name: tool,
            installed: true,
            version,
            path,
          };
        } catch {
          // Try next command
          continue;
        }
      }

      // If version check failed, try which/where
      const path = await this.getToolPath(safeTool);
      if (path) {
        return {
          name: safeTool,
          installed: true,
          path,
        };
      }

      return {
        name: safeTool,
        installed: false,
      };
    } catch (error) {
      return {
        name: tool,
        installed: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Install a tool using the appropriate package manager
   */
  async installTool(toolInfo: ToolInfo): Promise<InstallResult> {
    const startTime = Date.now();

    try {
      // Sanitize tool name
      const safeTool = this.sanitizeToolName(toolInfo.name);
      logger.info(`Attempting to install ${safeTool}...`);

      let command: string;
      let output: string;

      if (toolInfo.installCommand) {
        // Use provided install command (validate it doesn't contain tool name directly)
        command = toolInfo.installCommand;
        const result = await execAsync(command, {
          timeout: this.timeout,
          windowsHide: true,
        });
        output = result.stdout || result.stderr;
      } else if (toolInfo.packageManager) {
        // Use package manager
        const result = await this.installViaPackageManager(
          safeTool,
          toolInfo.packageManager,
        );
        command = result.command;
        output = result.output;
      } else {
        throw new Error("No install command or package manager specified");
      }

      // Verify installation
      const status = await this.verifyTool(safeTool);

      const duration = Date.now() - startTime;

      if (status.installed) {
        logger.info(`Successfully installed ${safeTool} in ${duration}ms`);
        return {
          tool: safeTool,
          success: true,
          version: status.version,
          command,
          output,
          duration,
        };
      } else {
        return {
          tool: safeTool,
          success: false,
          command,
          output,
          error: "Tool not found after installation",
          duration,
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Failed to install ${toolInfo.name}:`, error);

      return {
        tool: toolInfo.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration,
      };
    }
  }

  /**
   * Verify all tools in a list
   */
  async verifyAllTools(tools: ToolInfo[]): Promise<ToolStatus[]> {
    logger.info(`Verifying ${tools.length} tools...`);

    const results: ToolStatus[] = [];

    // Verify tools in parallel for speed
    const promises = tools.map((tool) => this.verifyTool(tool.name));
    const statuses = await Promise.allSettled(promises);

    for (let i = 0; i < tools.length; i++) {
      const result = statuses[i];
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          name: tools[i].name,
          installed: false,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown error",
        });
      }
    }

    const installedCount = results.filter((r) => r.installed).length;
    logger.info(`${installedCount}/${tools.length} tools installed`);

    return results;
  }

  /**
   * Install all missing tools from a list
   */
  async installMissingTools(tools: ToolInfo[]): Promise<InstallResult[]> {
    // First verify which tools are missing
    const statuses = await this.verifyAllTools(tools);
    const missingTools = tools.filter((_, i) => !statuses[i].installed);

    if (missingTools.length === 0) {
      logger.info("All tools already installed");
      return [];
    }

    logger.info(`Installing ${missingTools.length} missing tools...`);

    const results: InstallResult[] = [];

    // Install tools sequentially to avoid overwhelming the system
    for (const tool of missingTools) {
      const result = await this.installTool(tool);
      results.push(result);

      // Stop if a required tool fails to install
      if (!result.success && tool.required) {
        logger.error(`Required tool ${tool.name} failed to install, stopping`);
        break;
      }
    }

    const successCount = results.filter((r) => r.success).length;
    logger.info(
      `Successfully installed ${successCount}/${missingTools.length} tools`,
    );

    return results;
  }

  /**
   * Install a tool via package manager
   * @param tool - Already sanitized tool name
   * @param packageManager - Package manager to use
   */
  private async installViaPackageManager(
    tool: string,
    packageManager: string,
  ): Promise<{ command: string; output: string }> {
    // Note: tool should already be sanitized by caller
    // but we validate packageManager
    const validPackageManagers = ["npm", "go", "pip", "cargo"];
    const pmLower = packageManager.toLowerCase();

    if (!validPackageManagers.includes(pmLower)) {
      throw new Error(`Unsupported package manager: ${packageManager}`);
    }

    let command: string;

    switch (pmLower) {
      case "npm":
        command = await this.installViaNpm(tool);
        break;
      case "go":
        command = await this.installViaGo(tool);
        break;
      case "pip":
        command = await this.installViaPip(tool);
        break;
      case "cargo":
        command = await this.installViaCargo(tool);
        break;
      default:
        throw new Error(`Unsupported package manager: ${packageManager}`);
    }

    const { stdout, stderr } = await execAsync(command, {
      timeout: this.timeout,
      windowsHide: true,
    });

    return {
      command,
      output: stdout || stderr,
    };
  }

  /**
   * Install via npm (global)
   */
  private async installViaNpm(tool: string): Promise<string> {
    // Check if npm is available
    await this.verifyTool("npm");

    // Install globally
    return `npm install -g ${tool}`;
  }

  /**
   * Install via Go
   */
  private async installViaGo(tool: string): Promise<string> {
    // Check if go is available
    await this.verifyTool("go");

    // Map common tool names to their Go package paths
    const goPackages: Record<string, string> = {
      "golangci-lint":
        "github.com/golangci/golangci-lint/cmd/golangci-lint@latest",
      staticcheck: "honnef.co/go/tools/cmd/staticcheck@latest",
      govulncheck: "golang.org/x/vuln/cmd/govulncheck@latest",
      gofumpt: "mvdan.cc/gofumpt@latest",
      goimports: "golang.org/x/tools/cmd/goimports@latest",
    };

    const packagePath = goPackages[tool] || `${tool}@latest`;
    return `go install ${packagePath}`;
  }

  /**
   * Install via pip
   */
  private async installViaPip(tool: string): Promise<string> {
    // Check if pip is available
    try {
      await this.verifyTool("pip");
      return `pip install ${tool}`;
    } catch {
      // Try pip3
      await this.verifyTool("pip3");
      return `pip3 install ${tool}`;
    }
  }

  /**
   * Install via cargo
   */
  private async installViaCargo(tool: string): Promise<string> {
    // Check if cargo is available
    await this.verifyTool("cargo");

    return `cargo install ${tool}`;
  }

  /**
   * Get the path to a tool
   */
  private async getToolPath(tool: string): Promise<string | undefined> {
    try {
      // Use 'which' on Unix-like systems, 'where' on Windows
      const command = process.platform === "win32" ? "where" : "which";
      const { stdout } = await execAsync(`${command} ${tool}`, {
        timeout: 5000,
        windowsHide: true,
      });

      return stdout.trim().split("\n")[0]; // Return first match
    } catch {
      return undefined;
    }
  }

  /**
   * Extract version from tool output
   */
  private extractVersion(output: string): string | undefined {
    // Common version patterns
    const patterns = [
      /version\s+v?(\d+\.\d+\.\d+[\w.-]*)/i,
      /v?(\d+\.\d+\.\d+[\w.-]*)/,
      /(\d+\.\d+\.\d+)/,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }
}
