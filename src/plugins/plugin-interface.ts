/**
 * Plugin Interface for MCP DevTools Server
 *
 * This interface defines the contract for all plugins in the MCP DevTools ecosystem.
 * It provides lifecycle hooks, tool registration, and execution patterns that ensure
 * secure, isolated, and maintainable plugin development.
 *
 * @module plugins/plugin-interface
 *
 * @example
 * ```typescript
 * export class MyPlugin implements Plugin {
 *   metadata: PluginMetadata = {
 *     name: 'my-plugin',
 *     version: '1.0.0',
 *     description: 'My custom plugin',
 *     requiredCommands: ['my-tool']
 *   };
 *
 *   async initialize(context: PluginContext): Promise<void> {
 *     // Setup plugin
 *   }
 *
 *   async registerTools(): Promise<PluginTool[]> {
 *     return [
 *       {
 *         name: 'my_action',
 *         description: 'Performs my action',
 *         inputSchema: { type: 'object', properties: {} }
 *       }
 *     ];
 *   }
 *
 *   async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
 *     // Execute tool logic
 *   }
 * }
 * ```
 */

import { ShellExecutor } from '../utils/shell-executor.js';
import winston from 'winston';

/**
 * Core plugin interface that all plugins must implement
 */
export interface Plugin {
  /** Plugin metadata for discovery, versioning, and dependency management */
  metadata: PluginMetadata;

  /**
   * Initialize plugin with context (called once during plugin loading)
   *
   * @param context - Plugin execution context with configuration and utilities
   * @throws {PluginInitializationError} If initialization fails
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * Register all MCP tools this plugin provides
   *
   * @returns Array of tool definitions with schemas and metadata
   * @throws {PluginRegistrationError} If tool registration fails
   */
  registerTools(): Promise<PluginTool[]>;

  /**
   * Handle tool execution requests
   *
   * @param toolName - Name of the tool to execute (without plugin prefix)
   * @param args - Tool arguments validated against inputSchema
   * @returns Tool execution result
   * @throws {PluginExecutionError} If tool execution fails
   */
  handleToolCall(toolName: string, args: unknown): Promise<unknown>;

  /**
   * Optional: Validate plugin-specific configuration
   *
   * @param config - Plugin configuration from .mcp-devtools.json
   * @returns True if configuration is valid
   * @throws {PluginConfigurationError} If configuration is invalid
   */
  validateConfig?(config: unknown): Promise<boolean>;

  /**
   * Optional: Cleanup resources on plugin shutdown
   *
   * Called when the server is shutting down or plugin is being unloaded
   */
  shutdown?(): Promise<void>;

  /**
   * Optional: Health check for monitoring and diagnostics
   *
   * @returns Health status with optional diagnostic information
   */
  healthCheck?(): Promise<PluginHealth>;
}

/**
 * Plugin metadata for discovery and management
 */
export interface PluginMetadata {
  /** Unique plugin identifier (e.g., 'git-spice', 'docker-tools') */
  name: string;

  /** Semantic version (e.g., '1.0.0') */
  version: string;

  /** Human-readable description of plugin functionality */
  description: string;

  /** Plugin author name or organization */
  author?: string;

  /** URL to plugin documentation or homepage */
  homepage?: string;

  /** Required server version (semver range, e.g., '>=1.0.0') */
  requiredServerVersion?: string;

  /**
   * External CLI commands required by this plugin
   *
   * @example ['gs', 'docker', 'kubectl']
   */
  requiredCommands?: string[];

  /**
   * Categorization tags for plugin discovery
   *
   * @example ['git', 'workflow', 'ci-cd']
   */
  tags?: string[];

  /** Whether plugin should be enabled by default */
  defaultEnabled?: boolean;
}

/**
 * Plugin execution context provided during initialization
 */
export interface PluginContext {
  /** Plugin-specific configuration from .mcp-devtools.json */
  config: Record<string, unknown>;

  /** Project root directory */
  projectRoot: string;

  /** Shared ShellExecutor for secure command execution */
  shellExecutor: ShellExecutor;

  /** Scoped logger instance for this plugin */
  logger: winston.Logger;

  /** Utility functions for common operations */
  utils: PluginUtils;
}

/**
 * Helper utilities available to plugins
 */
export interface PluginUtils {
  /**
   * Check if a command is available in the system
   *
   * @param command - Command name to check
   * @returns True if command is available
   */
  isCommandAvailable(command: string): Promise<boolean>;

  /**
   * Resolve a path relative to the project root
   *
   * @param relativePath - Path relative to project root
   * @returns Absolute path
   */
  resolvePath(relativePath: string): string;

  /**
   * Check if a file exists
   *
   * @param filePath - Path to check
   * @returns True if file exists
   */
  fileExists(filePath: string): Promise<boolean>;

  /**
   * Read file contents
   *
   * @param filePath - Path to file
   * @returns File contents as string
   */
  readFile(filePath: string): Promise<string>;
}

/**
 * Tool definition for MCP protocol
 */
export interface PluginTool {
  /** Tool name (will be prefixed with plugin name automatically) */
  name: string;

  /** AI-friendly description of what this tool does */
  description: string;

  /** JSON Schema for input validation */
  inputSchema: Record<string, unknown>;

  /**
   * Usage examples for documentation and AI context
   *
   * @example
   * ```typescript
   * examples: [
   *   {
   *     description: 'Create a new branch',
   *     input: { name: 'feature/new-feature', base: 'main' },
   *     output: { success: true, branch: 'feature/new-feature' }
   *   }
   * ]
   * ```
   */
  examples?: ToolExample[];

  /** Categorization tags for tool organization */
  tags?: string[];
}

/**
 * Tool usage example for documentation
 */
export interface ToolExample {
  /** Description of what this example demonstrates */
  description: string;

  /** Example input arguments */
  input: Record<string, unknown>;

  /** Expected output (optional) */
  output?: unknown;
}

/**
 * Plugin health status for monitoring
 */
export interface PluginHealth {
  /** Health status indicator */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Optional message describing health status */
  message?: string;

  /** Individual health check results */
  checks?: Record<string, boolean>;

  /** Timestamp of health check */
  timestamp?: Date;
}

/**
 * Result of dependency validation check
 */
export interface DependencyCheckResult {
  /** Whether all required dependencies are available */
  allAvailable: boolean;

  /** List of available commands */
  available: string[];

  /** List of missing commands */
  missing: string[];

  /** Installation instructions for missing dependencies */
  installInstructions?: Record<string, string>;
}

/**
 * Plugin configuration from .mcp-devtools.json
 */
export interface PluginConfiguration {
  /** List of explicitly enabled plugins */
  enabled?: string[];

  /** List of explicitly disabled plugins */
  disabled?: string[];

  /** Plugin-specific configuration sections */
  [pluginName: string]: unknown;
}

/**
 * Base class for plugin errors
 */
export class PluginError extends Error {
  constructor(
    message: string,
    public readonly pluginName: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'PluginError';
  }
}

/**
 * Error thrown during plugin initialization
 */
export class PluginInitializationError extends PluginError {
  constructor(pluginName: string, message: string, public readonly cause?: Error) {
    super(message, pluginName, 'INITIALIZATION_FAILED');
    this.name = 'PluginInitializationError';
  }
}

/**
 * Error thrown during plugin registration
 */
export class PluginRegistrationError extends PluginError {
  constructor(pluginName: string, message: string, public readonly cause?: Error) {
    super(message, pluginName, 'REGISTRATION_FAILED');
    this.name = 'PluginRegistrationError';
  }
}

/**
 * Error thrown during plugin execution
 */
export class PluginExecutionError extends PluginError {
  constructor(
    pluginName: string,
    message: string,
    public readonly toolName?: string,
    public readonly cause?: Error
  ) {
    super(message, pluginName, 'EXECUTION_FAILED');
    this.name = 'PluginExecutionError';
  }
}

/**
 * Error thrown for invalid plugin configuration
 */
export class PluginConfigurationError extends PluginError {
  constructor(pluginName: string, message: string, public readonly invalidKeys?: string[]) {
    super(message, pluginName, 'CONFIGURATION_INVALID');
    this.name = 'PluginConfigurationError';
  }
}

/**
 * Error thrown when required dependencies are missing
 */
export class PluginDependencyError extends PluginError {
  constructor(
    pluginName: string,
    message: string,
    public readonly missingCommands: string[]
  ) {
    super(message, pluginName, 'DEPENDENCIES_MISSING');
    this.name = 'PluginDependencyError';
  }
}
