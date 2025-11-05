/**
 * git-spice Plugin - REFERENCE IMPLEMENTATION
 *
 * This plugin demonstrates best practices for plugin development in the MCP DevTools ecosystem.
 * It serves dual purposes:
 * 1. Provides valuable stacked Git branch management functionality
 * 2. Educational example for community plugin developers
 *
 * ABOUT GIT-SPICE:
 * git-spice manages stacked Git branches for efficient code review workflows.
 * It helps create, manage, and submit stacks of related changes.
 *
 * Installation: https://abhinav.github.io/git-spice/install/
 * Documentation: https://abhinav.github.io/git-spice/
 * Repository: https://github.com/abhinav/git-spice
 *
 * PLUGIN DEVELOPERS: Study this implementation to learn:
 * - How to structure plugin classes
 * - Input validation patterns with Zod
 * - Error handling and user-friendly suggestions
 * - JSON output parsing strategies
 * - Testing approaches
 * - Documentation standards
 *
 * @module plugins/git-spice-plugin
 */

import { z } from 'zod';
import {
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginTool,
  PluginHealth,
} from './plugin-interface.js';
import { ExecutionResult } from '../utils/shell-executor.js';

/**
 * Zod schemas for input validation
 *
 * Each tool has a corresponding schema that validates and types input arguments.
 * This provides runtime type safety and clear error messages.
 */

/**
 * Validation regex for git branch names
 * Allows: alphanumeric, forward slashes, hyphens, underscores, dots
 * Prevents: shell metacharacters like ; & | ` $ ( ) < > ' " \
 */
const SAFE_BRANCH_NAME_REGEX = /^[a-zA-Z0-9\/_.-]+$/;

/**
 * Validation for commit messages
 * Rejects messages containing dangerous shell metacharacters
 */
const SAFE_MESSAGE_REGEX = /^[^;&|`$()<>'"\\]+$/;

const BranchCreateArgsSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(
      SAFE_BRANCH_NAME_REGEX,
      'Branch name contains invalid characters. Only alphanumeric, /, -, _, and . are allowed.'
    )
    .describe('Branch name'),
  message: z
    .string()
    .optional()
    .refine(
      (val) => !val || SAFE_MESSAGE_REGEX.test(val),
      'Commit message contains potentially dangerous characters.'
    )
    .describe('Initial commit message'),
  base: z
    .string()
    .regex(
      SAFE_BRANCH_NAME_REGEX,
      'Base branch name contains invalid characters. Only alphanumeric, /, -, _, and . are allowed.'
    )
    .optional()
    .describe('Base branch to stack on'),
});

const BranchCheckoutArgsSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(
      SAFE_BRANCH_NAME_REGEX,
      'Branch name contains invalid characters. Only alphanumeric, /, -, _, and . are allowed.'
    )
    .describe('Branch name to checkout'),
});

const StackSubmitArgsSchema = z.object({
  draft: z.boolean().optional().describe('Create draft PRs'),
  fill: z.boolean().optional().describe('Auto-fill PR templates'),
});

const StackRestackArgsSchema = z.object({
  // No arguments needed for restack
});

const LogShortArgsSchema = z.object({
  // No arguments needed for log short
});

const RepoSyncArgsSchema = z.object({
  // No arguments needed for repo sync
});

/**
 * Escape shell arguments for safe command construction
 * This provides defense-in-depth even after Zod validation
 *
 * @param arg - Argument to escape
 * @returns Safely escaped argument wrapped in single quotes
 */
function escapeShellArg(arg: string): string {
  // Replace single quotes with '\'' (end quote, escaped quote, start quote)
  // This is the POSIX-compliant way to escape single quotes in shell arguments
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

// Type aliases for validation (unused but kept for documentation)
// type BranchCreateArgs = z.infer<typeof BranchCreateArgsSchema>;
// type BranchCheckoutArgs = z.infer<typeof BranchCheckoutArgsSchema>;
// type StackSubmitArgs = z.infer<typeof StackSubmitArgsSchema>;

/**
 * Result interfaces for typed responses
 */

interface BranchCreateResult {
  success: boolean;
  branch: string;
  base?: string;
  commit?: string;
  message?: string;
  error?: string;
  suggestions?: string[];
}

interface BranchCheckoutResult {
  success: boolean;
  branch: string;
  message?: string;
  error?: string;
  suggestions?: string[];
}

interface StackSubmitResult {
  success: boolean;
  prs?: Array<{ branch: string; url: string; number?: number }>;
  message?: string;
  error?: string;
  suggestions?: string[];
}

interface StackRestackResult {
  success: boolean;
  restacked: number;
  message?: string;
  error?: string;
  suggestions?: string[];
}

interface LogShortResult {
  success: boolean;
  output: string;
  branches?: string[];
  error?: string;
  suggestions?: string[];
}

interface RepoSyncResult {
  success: boolean;
  synced: boolean;
  deleted?: string[];
  message?: string;
  error?: string;
  suggestions?: string[];
}

/**
 * git-spice Plugin Implementation
 *
 * Provides stacked Git branch management through MCP tools.
 */
export class GitSpicePlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'git-spice',
    version: '1.0.0',
    description: 'Stacked Git branch management with git-spice',
    author: 'MCP DevTools Team',
    homepage: 'https://github.com/rshade/mcp-devtools-server',
    requiredServerVersion: '>=1.0.0',
    requiredCommands: ['gs'],
    tags: ['git', 'workflow', 'stacked-prs'],
    defaultEnabled: true,
  };

  private context!: PluginContext;

  /**
   * Initialize plugin with context
   *
   * @param context - Plugin execution context
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.context.logger.info('git-spice plugin initialized');

    // Validate git-spice is available
    const isAvailable = await context.utils.isCommandAvailable('gs');
    if (!isAvailable) {
      throw new Error(
        'git-spice (gs) command not found. Install from: https://abhinav.github.io/git-spice/install/'
      );
    }
  }

  /**
   * Register all MCP tools this plugin provides
   *
   * @returns Array of tool definitions
   */
  async registerTools(): Promise<PluginTool[]> {
    return [
      {
        name: 'branch_create',
        description: 'Create a new stacked branch',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Branch name',
            },
            message: {
              type: 'string',
              description: 'Initial commit message (optional)',
            },
            base: {
              type: 'string',
              description: 'Base branch to stack on (optional)',
            },
          },
          required: ['name'],
        },
        examples: [
          {
            description: 'Create a new feature branch',
            input: { name: 'feature/new-feature' },
          },
          {
            description: 'Create a branch with custom base',
            input: { name: 'feature/another', base: 'develop' },
          },
        ],
        tags: ['branch', 'create'],
      },
      {
        name: 'branch_checkout',
        description: 'Checkout an existing branch',
        inputSchema: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Branch name to checkout',
            },
          },
          required: ['name'],
        },
        examples: [
          {
            description: 'Checkout a branch',
            input: { name: 'feature/existing' },
          },
        ],
        tags: ['branch', 'checkout'],
      },
      {
        name: 'stack_submit',
        description: 'Submit entire stack as pull requests',
        inputSchema: {
          type: 'object',
          properties: {
            draft: {
              type: 'boolean',
              description: 'Create draft PRs',
            },
            fill: {
              type: 'boolean',
              description: 'Auto-fill PR templates',
            },
          },
        },
        examples: [
          {
            description: 'Submit stack as draft PRs',
            input: { draft: true },
          },
          {
            description: 'Submit stack with auto-fill',
            input: { fill: true },
          },
        ],
        tags: ['stack', 'pr', 'submit'],
      },
      {
        name: 'stack_restack',
        description: 'Rebase stack on latest changes',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        examples: [
          {
            description: 'Restack current branch',
            input: {},
          },
        ],
        tags: ['stack', 'rebase'],
      },
      {
        name: 'log_short',
        description: 'View current stack visualization',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        examples: [
          {
            description: 'View stack',
            input: {},
          },
        ],
        tags: ['stack', 'log', 'view'],
      },
      {
        name: 'repo_sync',
        description: 'Sync with remote and cleanup merged branches',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        examples: [
          {
            description: 'Sync repository',
            input: {},
          },
        ],
        tags: ['sync', 'cleanup'],
      },
    ];
  }

  /**
   * Handle tool execution requests
   *
   * Routes tool calls to appropriate handlers with validation and error handling.
   *
   * @param toolName - Name of the tool to execute
   * @param args - Tool arguments
   * @returns Tool execution result
   */
  async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
    this.context.logger.debug(`Executing tool: ${toolName}`, { args });

    try {
      switch (toolName) {
        case 'branch_create':
          return await this.branchCreate(args);
        case 'branch_checkout':
          return await this.branchCheckout(args);
        case 'stack_submit':
          return await this.stackSubmit(args);
        case 'stack_restack':
          return await this.stackRestack(args);
        case 'log_short':
          return await this.logShort(args);
        case 'repo_sync':
          return await this.repoSync(args);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      this.context.logger.error(`Tool execution failed: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * Optional: Health check for monitoring
   *
   * @returns Health status
   */
  async healthCheck(): Promise<PluginHealth> {
    const checks: Record<string, boolean> = {};

    // Check if gs command is available
    checks['gs-available'] = await this.context.utils.isCommandAvailable('gs');

    // Check if we're in a git repository
    try {
      const result = await this.context.shellExecutor.execute('git rev-parse --git-dir', {
        cwd: this.context.projectRoot,
      });
      checks['git-repository'] = result.success;
    } catch {
      checks['git-repository'] = false;
    }

    const allHealthy = Object.values(checks).every((v) => v);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      message: allHealthy
        ? 'All checks passed'
        : 'Some checks failed - see details',
      checks,
      timestamp: new Date(),
    };
  }

  // ========================================================================
  // Tool Implementations
  // ========================================================================

  /**
   * Create a new stacked branch
   *
   * @param args - Branch creation arguments
   * @returns Creation result
   */
  private async branchCreate(args: unknown): Promise<BranchCreateResult> {
    const validated = BranchCreateArgsSchema.parse(args);

    // Build command with escaped arguments (defense-in-depth)
    const cmdParts = ['gs', 'branch', 'create'];

    if (validated.base) {
      cmdParts.push('--base', escapeShellArg(validated.base));
    }

    if (validated.message) {
      cmdParts.push('--message', escapeShellArg(validated.message));
    }

    cmdParts.push(escapeShellArg(validated.name));

    const command = cmdParts.join(' ');

    const result = await this.context.shellExecutor.execute(command, {
      cwd: this.context.projectRoot,
    });

    if (result.success) {
      return {
        success: true,
        branch: validated.name,
        base: validated.base,
        message: 'Branch created successfully',
      };
    } else {
      return {
        success: false,
        branch: validated.name,
        error: result.stderr || result.error,
        suggestions: this.generateBranchCreateSuggestions(result),
      };
    }
  }

  /**
   * Checkout an existing branch
   *
   * @param args - Checkout arguments
   * @returns Checkout result
   */
  private async branchCheckout(args: unknown): Promise<BranchCheckoutResult> {
    const validated = BranchCheckoutArgsSchema.parse(args);

    const command = `gs branch checkout ${escapeShellArg(validated.name)}`;

    const result = await this.context.shellExecutor.execute(command, {
      cwd: this.context.projectRoot,
    });

    if (result.success) {
      return {
        success: true,
        branch: validated.name,
        message: `Checked out branch: ${validated.name}`,
      };
    } else {
      return {
        success: false,
        branch: validated.name,
        error: result.stderr || result.error,
        suggestions: this.generateBranchCheckoutSuggestions(result),
      };
    }
  }

  /**
   * Submit entire stack as pull requests
   *
   * @param args - Submit arguments
   * @returns Submit result
   */
  private async stackSubmit(args: unknown): Promise<StackSubmitResult> {
    const validated = StackSubmitArgsSchema.parse(args);

    const cmdParts = ['gs', 'stack', 'submit'];

    if (validated.draft) {
      cmdParts.push('--draft');
    }

    if (validated.fill) {
      cmdParts.push('--fill');
    }

    const command = cmdParts.join(' ');

    const result = await this.context.shellExecutor.execute(command, {
      cwd: this.context.projectRoot,
    });

    if (result.success) {
      // Parse PR URLs from output
      const prs = this.parsePRUrls(result.stdout);

      return {
        success: true,
        prs,
        message: `Successfully submitted ${prs.length} PR(s)`,
      };
    } else {
      return {
        success: false,
        error: result.stderr || result.error,
        suggestions: this.generateStackSubmitSuggestions(result),
      };
    }
  }

  /**
   * Rebase stack on latest changes
   *
   * @param args - Restack arguments (none currently)
   * @returns Restack result
   */
  private async stackRestack(args: unknown): Promise<StackRestackResult> {
    StackRestackArgsSchema.parse(args); // Validate even if empty

    const command = 'gs stack restack';

    const result = await this.context.shellExecutor.execute(command, {
      cwd: this.context.projectRoot,
    });

    if (result.success) {
      return {
        success: true,
        restacked: 1, // TODO: Parse actual count from output
        message: 'Stack restacked successfully',
      };
    } else {
      return {
        success: false,
        restacked: 0,
        error: result.stderr || result.error,
        suggestions: this.generateStackRestackSuggestions(result),
      };
    }
  }

  /**
   * View current stack visualization
   *
   * @param args - Log arguments (none currently)
   * @returns Log result with visualization
   */
  private async logShort(args: unknown): Promise<LogShortResult> {
    LogShortArgsSchema.parse(args); // Validate even if empty

    const command = 'gs log short';

    const result = await this.context.shellExecutor.execute(command, {
      cwd: this.context.projectRoot,
    });

    if (result.success) {
      return {
        success: true,
        output: result.stdout,
        branches: this.parseBranchesFromLog(result.stdout),
      };
    } else {
      return {
        success: false,
        output: '',
        error: result.stderr || result.error,
        suggestions: this.generateLogShortSuggestions(result),
      };
    }
  }

  /**
   * Sync with remote and cleanup merged branches
   *
   * @param args - Sync arguments (none currently)
   * @returns Sync result
   */
  private async repoSync(args: unknown): Promise<RepoSyncResult> {
    RepoSyncArgsSchema.parse(args); // Validate even if empty

    const command = 'gs repo sync';

    const result = await this.context.shellExecutor.execute(command, {
      cwd: this.context.projectRoot,
    });

    if (result.success) {
      const deleted = this.parseDeletedBranches(result.stdout);

      return {
        success: true,
        synced: true,
        deleted,
        message: deleted.length > 0
          ? `Deleted ${deleted.length} merged branch(es)`
          : 'Repository synced',
      };
    } else {
      return {
        success: false,
        synced: false,
        error: result.stderr || result.error,
        suggestions: this.generateRepoSyncSuggestions(result),
      };
    }
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Parse PR URLs from stack submit output
   *
   * @param output - Command stdout
   * @returns Array of PR information
   */
  private parsePRUrls(output: string): Array<{ branch: string; url: string }> {
    const prs: Array<{ branch: string; url: string }> = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Look for PR URLs in output
      const urlMatch = line.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
      if (urlMatch) {
        prs.push({
          branch: '', // TODO: Parse branch name from output
          url: urlMatch[0],
        });
      }
    }

    return prs;
  }

  /**
   * Parse branch names from log output
   *
   * @param output - Command stdout
   * @returns Array of branch names
   */
  private parseBranchesFromLog(output: string): string[] {
    const branches: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Simple parsing - could be improved with actual log format
      const match = line.match(/^\s*[*│]\s+(\S+)/);
      if (match) {
        branches.push(match[1]);
      }
    }

    return branches;
  }

  /**
   * Parse deleted branches from repo sync output
   *
   * @param output - Command stdout
   * @returns Array of deleted branch names
   */
  private parseDeletedBranches(output: string): string[] {
    const deleted: string[] = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('Deleted') || line.includes('deleted')) {
        const match = line.match(/['\"]([^'"]+)['\"]|(\S+)$/);
        if (match) {
          deleted.push(match[1] || match[2]);
        }
      }
    }

    return deleted;
  }

  // ========================================================================
  // Error Suggestion Generators
  // ========================================================================

  /**
   * Generate helpful suggestions for branch create errors
   */
  private generateBranchCreateSuggestions(result: ExecutionResult): string[] {
    const suggestions: string[] = [];
    const error = result.stderr.toLowerCase();

    if (error.includes('not a git repository')) {
      suggestions.push('This directory is not a Git repository');
      suggestions.push('Initialize with: git init');
    }

    if (error.includes('already exists')) {
      suggestions.push('Branch name already exists');
      suggestions.push('Choose a different name or use git_spice_branch_checkout');
    }

    if (error.includes('not initialized')) {
      suggestions.push('git-spice not initialized for this repository');
      suggestions.push('Run: gs repo init');
    }

    if (suggestions.length === 0) {
      suggestions.push('Check git-spice documentation: https://abhinav.github.io/git-spice/');
    }

    return suggestions;
  }

  /**
   * Generate helpful suggestions for branch checkout errors
   */
  private generateBranchCheckoutSuggestions(result: ExecutionResult): string[] {
    const suggestions: string[] = [];
    const error = result.stderr.toLowerCase();

    if (error.includes('does not exist') || error.includes('not found')) {
      suggestions.push('Branch does not exist');
      suggestions.push('Use git_spice_log_short to see available branches');
      suggestions.push('Create new branch with git_spice_branch_create');
    }

    if (error.includes('uncommitted changes')) {
      suggestions.push('You have uncommitted changes');
      suggestions.push('Commit or stash changes before switching branches');
    }

    if (suggestions.length === 0) {
      suggestions.push('Verify branch name and try again');
    }

    return suggestions;
  }

  /**
   * Generate helpful suggestions for stack submit errors
   */
  private generateStackSubmitSuggestions(result: ExecutionResult): string[] {
    const suggestions: string[] = [];
    const error = result.stderr.toLowerCase();

    if (error.includes('no remote')) {
      suggestions.push('No remote repository configured');
      suggestions.push('Add remote with: git remote add origin <url>');
    }

    if (error.includes('authentication') || error.includes('permission')) {
      suggestions.push('GitHub authentication failed');
      suggestions.push('Ensure GitHub CLI (gh) is authenticated');
      suggestions.push('Run: gh auth login');
    }

    if (error.includes('no commits')) {
      suggestions.push('No commits to submit in current stack');
      suggestions.push('Make changes and commit before submitting');
    }

    if (suggestions.length === 0) {
      suggestions.push('Ensure remote repository is configured and accessible');
    }

    return suggestions;
  }

  /**
   * Generate helpful suggestions for stack restack errors
   */
  private generateStackRestackSuggestions(result: ExecutionResult): string[] {
    const suggestions: string[] = [];
    const error = result.stderr.toLowerCase();

    if (error.includes('conflict')) {
      suggestions.push('Merge conflicts detected during restack');
      suggestions.push('Resolve conflicts and continue with: gs stack restack --continue');
      suggestions.push('Or abort with: gs stack restack --abort');
    }

    if (error.includes('no commits')) {
      suggestions.push('No commits to restack');
      suggestions.push('Ensure you have commits in your stack');
    }

    if (suggestions.length === 0) {
      suggestions.push('Check stack status with git_spice_log_short');
    }

    return suggestions;
  }

  /**
   * Generate helpful suggestions for log short errors
   */
  private generateLogShortSuggestions(result: ExecutionResult): string[] {
    const suggestions: string[] = [];
    const error = result.stderr.toLowerCase();

    if (error.includes('not initialized')) {
      suggestions.push('git-spice not initialized for this repository');
      suggestions.push('Run: gs repo init');
    }

    if (error.includes('not a git repository')) {
      suggestions.push('This directory is not a Git repository');
    }

    if (suggestions.length === 0) {
      suggestions.push('Ensure git-spice is properly initialized');
    }

    return suggestions;
  }

  /**
   * Generate helpful suggestions for repo sync errors
   */
  private generateRepoSyncSuggestions(result: ExecutionResult): string[] {
    const suggestions: string[] = [];
    const error = result.stderr.toLowerCase();

    if (error.includes('no remote')) {
      suggestions.push('No remote repository configured');
      suggestions.push('Add remote with: git remote add origin <url>');
    }

    if (error.includes('network') || error.includes('connection')) {
      suggestions.push('Network error - check your internet connection');
      suggestions.push('Verify remote repository URL is accessible');
    }

    if (error.includes('uncommitted changes')) {
      suggestions.push('You have uncommitted changes');
      suggestions.push('Commit or stash changes before syncing');
    }

    if (suggestions.length === 0) {
      suggestions.push('Ensure remote repository is accessible');
    }

    return suggestions;
  }
}
