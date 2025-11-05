/**
 * Custom Plugin Template
 *
 * Copy this file to src/plugins/your-plugin-name-plugin.ts to create your own plugin.
 * Replace all TODO comments with your implementation.
 *
 * This template demonstrates the minimal implementation required for a working plugin.
 * For a more comprehensive example, see src/plugins/git-spice-plugin.ts
 *
 * @example
 * ```bash
 * # 1. Copy this file
 * cp examples/plugins/custom-plugin-example.ts src/plugins/my-plugin-plugin.ts
 *
 * # 2. Edit the file and replace TODOs
 * # 3. Build the project
 * npm run build
 *
 * # 4. The plugin will be auto-discovered and loaded
 * node dist/index.js
 * ```
 */

import { z } from 'zod';
import {
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginTool,
  PluginHealth,
} from '../../src/plugins/plugin-interface';

/**
 * TODO: Define Zod schemas for input validation
 *
 * Zod provides runtime type safety and validation.
 * Define a schema for each tool's input arguments.
 */
const MyToolArgsSchema = z.object({
  input: z.string().min(1).describe('Input parameter'),
  // TODO: Add more parameters as needed
});

/**
 * TODO: Define result interfaces for type-safe responses
 */
interface MyToolResult {
  success: boolean;
  output?: string;
  error?: string;
  suggestions?: string[];
}

/**
 * Custom Plugin Implementation
 *
 * TODO: Rename this class to match your plugin name
 * Convention: use PascalCase and end with "Plugin"
 * Example: DockerPlugin, KubernetesPlugin, etc.
 */
export class CustomPlugin implements Plugin {
  /**
   * Plugin metadata
   *
   * TODO: Update all metadata fields
   */
  metadata: PluginMetadata = {
    name: 'custom-plugin', // TODO: Change to your plugin name (kebab-case)
    version: '1.0.0',
    description: 'TODO: Describe what your plugin does',
    author: 'TODO: Your name',
    homepage: 'TODO: Link to documentation',
    requiredServerVersion: '>=1.0.0',
    requiredCommands: ['TODO'], // TODO: List required external commands
    tags: ['TODO'], // TODO: Add relevant tags
    defaultEnabled: true,
  };

  private context!: PluginContext;

  /**
   * Initialize plugin with context
   *
   * This is called once when the plugin is loaded.
   * Use this to:
   * - Validate required commands are available
   * - Initialize any state
   * - Setup configuration
   *
   * @param context - Plugin execution context
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.context.logger.info('Custom plugin initialized');

    // TODO: Validate required commands
    // Example:
    // const isAvailable = await context.utils.isCommandAvailable('my-command');
    // if (!isAvailable) {
    //   throw new Error('my-command not found. Install from: https://...');
    // }
  }

  /**
   * Register all MCP tools this plugin provides
   *
   * Each tool becomes available as: {plugin-name}_{tool-name}
   * Example: custom_plugin_my_tool
   *
   * @returns Array of tool definitions
   */
  async registerTools(): Promise<PluginTool[]> {
    return [
      {
        name: 'my_tool', // TODO: Change to your tool name (snake_case)
        description: 'TODO: Describe what this tool does',
        inputSchema: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'TODO: Describe this parameter',
            },
            // TODO: Add more properties
          },
          required: ['input'], // TODO: List required parameters
        },
        examples: [
          {
            description: 'TODO: Example usage description',
            input: { input: 'example value' },
            output: { success: true, output: 'example result' },
          },
        ],
        tags: ['example'], // TODO: Add relevant tags
      },
      // TODO: Add more tools
    ];
  }

  /**
   * Handle tool execution requests
   *
   * This is called when a user invokes one of your tools.
   * Route to the appropriate method based on toolName.
   *
   * @param toolName - Name of the tool (without plugin prefix)
   * @param args - Tool arguments (will be validated against inputSchema)
   * @returns Tool execution result
   */
  async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
    this.context.logger.debug(`Executing tool: ${toolName}`, { args });

    try {
      switch (toolName) {
        case 'my_tool':
          return await this.myTool(args);
        // TODO: Add more cases for additional tools
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      this.context.logger.error(`Tool execution failed: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * Optional: Validate plugin configuration
   *
   * Implement this if your plugin requires specific configuration.
   *
   * @param config - Plugin configuration from .mcp-devtools.json
   * @returns True if configuration is valid
   */
  async validateConfig?(config: unknown): Promise<boolean> {
    // TODO: Implement configuration validation
    // Example:
    // const cfg = config as Record<string, unknown>;
    // return typeof cfg.apiKey === 'string';
    return true;
  }

  /**
   * Optional: Cleanup resources on shutdown
   *
   * Called when the server is shutting down.
   * Use this to cleanup any resources (connections, files, etc.)
   */
  async shutdown?(): Promise<void> {
    // TODO: Implement cleanup logic
    this.context.logger.info('Custom plugin shutting down');
  }

  /**
   * Optional: Health check for monitoring
   *
   * Implement this to provide health status information.
   *
   * @returns Health status
   */
  async healthCheck?(): Promise<PluginHealth> {
    const checks: Record<string, boolean> = {};

    // TODO: Add health checks
    // Example:
    // checks['command-available'] = await this.context.utils.isCommandAvailable('my-command');

    const allHealthy = Object.values(checks).every((v) => v);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      message: allHealthy ? 'All checks passed' : 'Some checks failed',
      checks,
      timestamp: new Date(),
    };
  }

  // ========================================================================
  // Tool Implementations
  // ========================================================================

  /**
   * Example tool implementation
   *
   * TODO: Implement your tool logic
   *
   * Best practices:
   * 1. Validate input with Zod schema
   * 2. Execute command via context.shellExecutor
   * 3. Parse output (prefer JSON when available)
   * 4. Return structured result
   * 5. Provide helpful error suggestions
   *
   * @param args - Tool arguments
   * @returns Tool result
   */
  private async myTool(args: unknown): Promise<MyToolResult> {
    // 1. Validate input
    const validated = MyToolArgsSchema.parse(args);

    // 2. Build and execute command
    const command = `my-command ${validated.input}`; // TODO: Build your command

    const result = await this.context.shellExecutor.execute(command, {
      cwd: this.context.projectRoot,
    });

    // 3. Parse output and return result
    if (result.success) {
      return {
        success: true,
        output: result.stdout,
      };
    } else {
      return {
        success: false,
        error: result.stderr || result.error,
        suggestions: this.generateSuggestions(result.stderr),
      };
    }
  }

  /**
   * Generate helpful error suggestions
   *
   * TODO: Implement error pattern matching for your tool
   *
   * Good error messages help users self-correct without reading docs.
   *
   * @param errorOutput - Error message from command
   * @returns Array of suggestions
   */
  private generateSuggestions(errorOutput: string): string[] {
    const suggestions: string[] = [];

    // TODO: Add error pattern matching
    // Example:
    // if (errorOutput.includes('not found')) {
    //   suggestions.push('Command not found. Install with: npm install -g my-tool');
    // }

    if (suggestions.length === 0) {
      suggestions.push('TODO: Add link to documentation');
    }

    return suggestions;
  }
}

/**
 * Development Checklist:
 *
 * [ ] Update plugin metadata (name, description, author, etc.)
 * [ ] Define required commands in metadata.requiredCommands
 * [ ] Implement initialize() with command validation
 * [ ] Define Zod schemas for all tool inputs
 * [ ] Implement registerTools() with all tool definitions
 * [ ] Implement tool methods with proper error handling
 * [ ] Add error suggestion patterns
 * [ ] Add configuration validation if needed
 * [ ] Implement health check if monitoring is important
 * [ ] Add comprehensive JSDoc comments
 * [ ] Write unit tests in src/__tests__/plugins/
 * [ ] Test with actual command execution
 * [ ] Update examples/your-plugin-project.json with config
 *
 * Testing:
 * ```bash
 * npm run build
 * npm test
 * npm run lint
 * ```
 *
 * Documentation:
 * - Add user guide to docs/plugins/your-plugin.md
 * - Update README.md to mention your plugin
 * - Include example configurations
 */
