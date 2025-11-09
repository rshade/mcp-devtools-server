/**
 * Plugin Manager
 *
 * Centralized lifecycle management for MCP DevTools plugins. Handles:
 * - Plugin discovery from multiple locations (src/plugins/, ~/.mcp-devtools/plugins/, ./.mcp-devtools-plugins/)
 * - Plugin loading and initialization with error isolation
 * - Tool registration with automatic namespacing
 * - Tool call routing to appropriate plugins
 * - Dependency validation and health monitoring
 * - Graceful shutdown and cleanup
 *
 * Architecture:
 * - Plugins are isolated with individual contexts
 * - Tool names are prefixed: {plugin-name}_{tool-name}
 * - Failures in one plugin don't affect others
 * - All plugins share the same ShellExecutor for security
 *
 * @module plugins/plugin-manager
 *
 * @example
 * ```typescript
 * const manager = new PluginManager(
 *   '/project/root',
 *   config.plugins || {},
 *   shellExecutor,
 *   logger
 * );
 *
 * await manager.loadPlugins();
 * const tools = await manager.getAllTools();
 * const result = await manager.executeToolCall('git_spice_branch_create', args);
 * ```
 */

import * as path from "path";
import * as fs from "fs/promises";
import * as os from "os";
import { glob } from "glob";
import winston from "winston";
import { ShellExecutor } from "../utils/shell-executor.js";
import {
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginTool,
  PluginConfiguration,
  PluginUtils,
  PluginHealth,
  DependencyCheckResult,
  PluginError,
  PluginInitializationError,
  PluginRegistrationError,
  PluginExecutionError,
  PluginDependencyError,
} from "./plugin-interface.js";

/**
 * MCP Tool definition for server registration
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Internal plugin registry entry
 */
interface PluginEntry {
  plugin: Plugin;
  context: PluginContext;
  tools: Map<string, PluginTool>;
  health: PluginHealth;
  lastHealthCheck: Date;
}

/**
 * Plugin Manager - Orchestrates plugin lifecycle
 */
export class PluginManager {
  private plugins: Map<string, PluginEntry> = new Map();
  private toolRegistry: Map<string, { pluginName: string; toolName: string }> =
    new Map();

  constructor(
    private projectRoot: string,
    private config: PluginConfiguration,
    private shellExecutor: ShellExecutor,
    private logger: winston.Logger,
  ) {}

  /**
   * Discover and load all plugins from src/plugins/ directory
   *
   * Scans for *-plugin.ts files, imports them, validates dependencies,
   * initializes, and registers their tools.
   *
   * @throws {PluginError} If critical plugin loading fails (does not throw for individual plugin failures)
   */
  async loadPlugins(): Promise<void> {
    this.logger.info("Starting plugin discovery and loading...");

    try {
      const pluginFiles = await this.discoverPlugins();
      this.logger.info(`Discovered ${pluginFiles.length} plugin file(s)`);

      for (const pluginFile of pluginFiles) {
        try {
          await this.loadPlugin(pluginFile);
        } catch (error) {
          // Log error but continue loading other plugins
          this.logger.error(`Failed to load plugin from ${pluginFile}:`, error);
        }
      }

      this.logger.info(`Successfully loaded ${this.plugins.size} plugin(s)`);
    } catch (error) {
      this.logger.error("Plugin discovery failed:", error);
      throw error;
    }
  }

  /**
   * Discover plugin files from multiple locations
   *
   * Searches in priority order:
   * 1. src/plugins/ - Core/official plugins
   * 2. ~/.mcp-devtools/plugins/ - Global user plugins
   * 3. ./.mcp-devtools-plugins/ - Project-specific plugins
   *
   * @returns Array of absolute paths to plugin files
   */
  private async discoverPlugins(): Promise<string[]> {
    const discoveryPaths = this.getPluginDiscoveryPaths();
    const allFiles: string[] = [];

    for (const searchPath of discoveryPaths) {
      try {
        await fs.access(searchPath);
        this.logger.debug(`Searching for plugins in: ${searchPath}`);

        // Find all *-plugin.ts and *-plugin.js files
        const pattern = path.join(searchPath, "*-plugin.{ts,js}");
        const files = await glob(pattern, { absolute: true });

        if (files.length > 0) {
          this.logger.info(`Found ${files.length} plugin(s) in ${searchPath}`);
          allFiles.push(...files);
        }
      } catch {
        // Directory doesn't exist or not accessible - this is fine
        this.logger.debug(`Plugin directory not accessible: ${searchPath}`);
      }
    }

    // Remove duplicates (same plugin name from multiple locations)
    const uniqueFiles = this.deduplicatePlugins(allFiles);

    return uniqueFiles;
  }

  /**
   * Get plugin discovery paths in priority order
   *
   * @returns Array of absolute paths to search for plugins
   */
  private getPluginDiscoveryPaths(): string[] {
    const paths: string[] = [];

    // 1. Core plugins (highest priority)
    paths.push(path.join(this.projectRoot, "src", "plugins"));

    // 2. Global user plugins
    const homeDir = os.homedir();
    paths.push(path.join(homeDir, ".mcp-devtools", "plugins"));

    // 3. Project-specific plugins (lowest priority)
    paths.push(path.join(this.projectRoot, ".mcp-devtools-plugins"));

    return paths;
  }

  /**
   * Deduplicate plugins when found in multiple locations
   *
   * Priority: src/plugins/ > ~/.mcp-devtools/plugins/ > ./.mcp-devtools-plugins/
   * If same plugin name exists in multiple locations, only the highest priority is kept.
   *
   * @param files - Array of plugin file paths
   * @returns Deduplicated array of plugin file paths
   */
  private deduplicatePlugins(files: string[]): string[] {
    const pluginMap = new Map<string, { path: string; priority: number }>();

    for (const file of files) {
      // Extract plugin name from filename
      const filename = path.basename(file);
      const pluginName = filename.replace(/-plugin\.(ts|js)$/, "");

      // Determine priority based on location
      let priority = 0;
      if (file.includes(path.join("src", "plugins"))) {
        priority = 3; // Highest - core plugins
      } else if (file.includes(path.join(".mcp-devtools", "plugins"))) {
        priority = 2; // Medium - global user plugins
      } else if (file.includes(".mcp-devtools-plugins")) {
        priority = 1; // Lowest - project-specific plugins
      }

      // Keep highest priority version
      const existing = pluginMap.get(pluginName);
      if (!existing || priority > existing.priority) {
        if (existing) {
          this.logger.info(
            `Plugin '${pluginName}' found in multiple locations, using: ${file}`,
          );
        }
        pluginMap.set(pluginName, { path: file, priority });
      }
    }

    return Array.from(pluginMap.values()).map((entry) => entry.path);
  }

  /**
   * Load and initialize a single plugin from file
   *
   * @param pluginFile - Absolute path to plugin file
   */
  private async loadPlugin(pluginFile: string): Promise<void> {
    this.logger.info(`Loading plugin from: ${pluginFile}`);

    try {
      // Import plugin module
      const pluginModule = await import(pluginFile);

      // Find plugin class (convention: export class that implements Plugin)
      const PluginClass = this.findPluginClass(pluginModule);
      if (!PluginClass) {
        throw new Error("No plugin class found in module");
      }

      // Instantiate plugin
      const plugin: Plugin = new PluginClass();

      // Check if plugin is enabled
      if (!this.isPluginEnabled(plugin.metadata.name)) {
        this.logger.info(
          `Plugin ${plugin.metadata.name} is disabled, skipping`,
        );
        return;
      }

      // Register plugin
      await this.registerPlugin(plugin);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new PluginInitializationError(
        path.basename(pluginFile),
        `Failed to load plugin: ${errorMessage}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Find plugin class in imported module
   *
   * @param module - Imported module object
   * @returns Plugin class constructor or null
   */
  private findPluginClass(module: unknown): (new () => Plugin) | null {
    if (!module || typeof module !== "object") {
      return null;
    }

    // Look for exported class that looks like a plugin
    for (const key of Object.keys(module)) {
      const exported = (module as Record<string, unknown>)[key];
      if (typeof exported === "function" && exported.prototype) {
        return exported as new () => Plugin;
      }
    }

    return null;
  }

  /**
   * Check if plugin is enabled in configuration
   *
   * @param pluginName - Name of plugin to check
   * @returns True if plugin should be loaded
   */
  private isPluginEnabled(pluginName: string): boolean {
    const { enabled, disabled } = this.config;

    // If explicitly disabled, skip
    if (disabled && disabled.includes(pluginName)) {
      return false;
    }

    // If enabled list exists and plugin not in it, skip
    if (enabled && enabled.length > 0 && !enabled.includes(pluginName)) {
      return false;
    }

    return true;
  }

  /**
   * Register a plugin instance
   *
   * Validates dependencies, creates context, initializes plugin,
   * and registers all tools.
   *
   * @param plugin - Plugin instance to register
   * @throws {PluginError} If registration fails
   */
  async registerPlugin(plugin: Plugin): Promise<void> {
    const { name, version } = plugin.metadata;
    this.logger.info(`Registering plugin: ${name} v${version}`);

    try {
      // Check if plugin already registered
      if (this.plugins.has(name)) {
        throw new PluginRegistrationError(
          name,
          `Plugin ${name} is already registered`,
        );
      }

      // Validate dependencies
      const depCheck = await this.checkDependencies(plugin);
      if (!depCheck.allAvailable) {
        throw new PluginDependencyError(
          name,
          `Missing required commands: ${depCheck.missing.join(", ")}`,
          depCheck.missing,
        );
      }

      // Create plugin context
      const context = this.createPluginContext(plugin.metadata.name);

      // Validate configuration if plugin implements validation
      if (plugin.validateConfig) {
        const isValid = await plugin.validateConfig(context.config);
        if (!isValid) {
          throw new PluginRegistrationError(
            name,
            "Plugin configuration validation failed",
          );
        }
      }

      // Initialize plugin
      await plugin.initialize(context);

      // Register tools
      const tools = await plugin.registerTools();
      const toolMap = new Map<string, PluginTool>();

      for (const tool of tools) {
        const namespacedName = this.namespaceToolName(name, tool.name);

        // Check for tool name conflicts
        if (this.toolRegistry.has(namespacedName)) {
          throw new PluginRegistrationError(
            name,
            `Tool name conflict: ${namespacedName} already registered`,
          );
        }

        toolMap.set(tool.name, tool);
        this.toolRegistry.set(namespacedName, {
          pluginName: name,
          toolName: tool.name,
        });

        this.logger.debug(`Registered tool: ${namespacedName}`);
      }

      // Initial health check
      const health: PluginHealth = plugin.healthCheck
        ? await plugin.healthCheck()
        : { status: "healthy" as const, timestamp: new Date() };

      // Store plugin entry
      this.plugins.set(name, {
        plugin,
        context,
        tools: toolMap,
        health,
        lastHealthCheck: new Date(),
      });

      this.logger.info(
        `Successfully registered plugin ${name} with ${tools.length} tool(s)`,
      );
    } catch (error) {
      // Rethrow plugin-specific errors
      if (error instanceof PluginError) {
        throw error;
      }

      // Wrap other errors
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new PluginRegistrationError(
        name,
        `Plugin registration failed: ${errorMessage}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Create plugin execution context
   *
   * @param pluginName - Name of plugin for configuration lookup
   * @returns Plugin context with configuration and utilities
   */
  private createPluginContext(pluginName: string): PluginContext {
    const pluginConfig =
      (this.config[pluginName] as Record<string, unknown>) || {};

    return {
      config: pluginConfig,
      projectRoot: this.projectRoot,
      shellExecutor: this.shellExecutor,
      logger: this.createScopedLogger(pluginName),
      utils: this.createPluginUtils(),
    };
  }

  /**
   * Create scoped logger for plugin
   *
   * @param pluginName - Plugin name for log context
   * @returns Scoped Winston logger
   */
  private createScopedLogger(pluginName: string): winston.Logger {
    return this.logger.child({ plugin: pluginName });
  }

  /**
   * Create plugin utility functions
   *
   * @returns Plugin utility interface implementation
   */
  private createPluginUtils(): PluginUtils {
    return {
      isCommandAvailable: async (command: string) => {
        return this.shellExecutor.isCommandAvailable(command);
      },

      resolvePath: (relativePath: string) => {
        return path.resolve(this.projectRoot, relativePath);
      },

      fileExists: async (filePath: string) => {
        try {
          await fs.access(filePath);
          return true;
        } catch {
          return false;
        }
      },

      readFile: async (filePath: string) => {
        return fs.readFile(filePath, "utf-8");
      },
    };
  }

  /**
   * Namespace tool name with plugin name prefix
   *
   * @param pluginName - Plugin name
   * @param toolName - Original tool name
   * @returns Namespaced tool name (e.g., "git_spice_branch_create")
   */
  private namespaceToolName(pluginName: string, toolName: string): string {
    // Convert plugin name to snake_case and append tool name
    const prefix = pluginName.replace(/-/g, "_");
    return `${prefix}_${toolName}`;
  }

  /**
   * Get all tools from all loaded plugins
   *
   * Converts plugin tools to MCP tool format with proper namespacing.
   *
   * @returns Array of MCP tool definitions
   */
  async getAllTools(): Promise<MCPTool[]> {
    const allTools: MCPTool[] = [];

    for (const [pluginName, entry] of this.plugins) {
      for (const [toolName, tool] of entry.tools) {
        const namespacedName = this.namespaceToolName(pluginName, toolName);

        allTools.push({
          name: namespacedName,
          description: `[${pluginName}] ${tool.description}`,
          inputSchema: tool.inputSchema,
        });
      }
    }

    return allTools;
  }

  /**
   * Execute a tool call, routing to the appropriate plugin
   *
   * @param toolName - Fully namespaced tool name
   * @param args - Tool arguments
   * @returns Tool execution result
   * @throws {PluginExecutionError} If tool execution fails
   */
  async executeToolCall(toolName: string, args: unknown): Promise<unknown> {
    this.logger.debug(`Executing tool: ${toolName}`);

    // Look up tool in registry
    const toolInfo = this.toolRegistry.get(toolName);
    if (!toolInfo) {
      throw new PluginExecutionError(
        "unknown",
        `Tool not found: ${toolName}`,
        toolName,
      );
    }

    const { pluginName, toolName: originalToolName } = toolInfo;

    // Get plugin entry
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      throw new PluginExecutionError(
        pluginName,
        `Plugin not loaded: ${pluginName}`,
        toolName,
      );
    }

    try {
      // Execute tool via plugin
      const result = await entry.plugin.handleToolCall(originalToolName, args);
      this.logger.debug(`Tool ${toolName} executed successfully`);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Tool execution failed: ${toolName}`, error);

      throw new PluginExecutionError(
        pluginName,
        `Tool execution failed: ${errorMessage}`,
        toolName,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Check if required commands are installed
   *
   * @param plugin - Plugin to check dependencies for
   * @returns Dependency check result with available/missing commands
   */
  async checkDependencies(plugin: Plugin): Promise<DependencyCheckResult> {
    const { requiredCommands } = plugin.metadata;

    if (!requiredCommands || requiredCommands.length === 0) {
      return { allAvailable: true, available: [], missing: [] };
    }

    const available: string[] = [];
    const missing: string[] = [];

    for (const command of requiredCommands) {
      const isAvailable = await this.shellExecutor.isCommandAvailable(command);
      if (isAvailable) {
        available.push(command);
      } else {
        missing.push(command);
      }
    }

    return {
      allAvailable: missing.length === 0,
      available,
      missing,
      installInstructions: this.getInstallInstructions(missing),
    };
  }

  /**
   * Get installation instructions for missing commands
   *
   * @param commands - List of missing command names
   * @returns Map of command to installation instructions
   */
  private getInstallInstructions(commands: string[]): Record<string, string> {
    const instructions: Record<string, string> = {};

    for (const command of commands) {
      switch (command) {
        case "gs":
          instructions[command] =
            "Install git-spice: https://abhinav.github.io/git-spice/install/";
          break;
        case "docker":
          instructions[command] =
            "Install Docker: https://docs.docker.com/get-docker/";
          break;
        case "kubectl":
          instructions[command] =
            "Install kubectl: https://kubernetes.io/docs/tasks/tools/";
          break;
        default:
          instructions[command] =
            `Install ${command} and ensure it's in your PATH`;
      }
    }

    return instructions;
  }

  /**
   * Get health status for a specific plugin
   *
   * @param pluginName - Name of plugin to check
   * @returns Plugin health status or null if not found
   */
  async getPluginHealth(pluginName: string): Promise<PluginHealth | null> {
    const entry = this.plugins.get(pluginName);
    if (!entry) {
      return null;
    }

    // Run health check if plugin implements it
    if (entry.plugin.healthCheck) {
      try {
        const health = await entry.plugin.healthCheck();
        entry.health = health;
        entry.lastHealthCheck = new Date();
        return health;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        return {
          status: "unhealthy",
          message: `Health check failed: ${errorMessage}`,
          timestamp: new Date(),
        };
      }
    }

    return entry.health;
  }

  /**
   * Get health status for all plugins
   *
   * @returns Map of plugin name to health status
   */
  async getAllPluginHealth(): Promise<Map<string, PluginHealth>> {
    const healthMap = new Map<string, PluginHealth>();

    for (const pluginName of this.plugins.keys()) {
      const health = await this.getPluginHealth(pluginName);
      if (health) {
        healthMap.set(pluginName, health);
      }
    }

    return healthMap;
  }

  /**
   * Gracefully shutdown all plugins
   *
   * Calls shutdown() on plugins that implement it, in reverse registration order.
   */
  async shutdownAll(): Promise<void> {
    this.logger.info("Shutting down all plugins...");

    const pluginNames = Array.from(this.plugins.keys()).reverse();

    for (const pluginName of pluginNames) {
      const entry = this.plugins.get(pluginName);
      if (!entry) continue;

      try {
        if (entry.plugin.shutdown) {
          this.logger.info(`Shutting down plugin: ${pluginName}`);
          await entry.plugin.shutdown();
        }
      } catch (error) {
        this.logger.error(`Error shutting down plugin ${pluginName}:`, error);
        // Continue shutting down other plugins
      }
    }

    this.plugins.clear();
    this.toolRegistry.clear();

    this.logger.info("All plugins shut down");
  }

  /**
   * Get list of loaded plugin names
   *
   * @returns Array of plugin names
   */
  getLoadedPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get plugin metadata by name
   *
   * @param pluginName - Name of plugin
   * @returns Plugin metadata or null if not found
   */
  getPluginMetadata(pluginName: string): PluginMetadata | null {
    const entry = this.plugins.get(pluginName);
    return entry ? entry.plugin.metadata : null;
  }
}
