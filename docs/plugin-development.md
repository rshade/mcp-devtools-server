# Plugin Development Guide

Complete guide for developing plugins for MCP DevTools Server.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Plugin Interface](#plugin-interface)
- [Security Best Practices](#security-best-practices)
- [Testing Your Plugin](#testing-your-plugin)
- [Example Plugins](#example-plugins)
- [Publishing](#publishing)
- [Troubleshooting](#troubleshooting)

## Overview

MCP DevTools Server supports a plugin architecture that allows you to extend functionality without modifying core code. Plugins can:

- Add new MCP tools for AI assistants
- Integrate external CLI tools (Docker, Kubernetes, etc.)
- Provide custom linting, testing, or deployment workflows
- Extend Git workflows or CI/CD integrations

**Key Benefits:**
- **Isolated**: Plugins run with their own context and error handling
- **Secure**: All command execution goes through validated `ShellExecutor`
- **Type-Safe**: Full TypeScript support with strict typing
- **Testable**: Built-in testing utilities and mocking support
- **Discoverable**: Automatic tool namespacing and registration

## Quick Start

### 1. Create Plugin File

Create a file in `src/plugins/` with the pattern `*-plugin.ts`:

```typescript
// src/plugins/my-plugin.ts
import {
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginTool,
} from './plugin-interface.js';

export class MyPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'My awesome plugin',
    author: 'Your Name',
    requiredCommands: ['my-tool'], // External commands needed
    tags: ['utility', 'workflow'],
  };

  private context!: PluginContext;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    // Validate required tools are available
    const isAvailable = await context.utils.isCommandAvailable('my-tool');
    if (!isAvailable) {
      throw new Error('my-tool command not found. Install from: https://example.com');
    }

    this.context.logger.info('my-plugin initialized');
  }

  async registerTools(): Promise<PluginTool[]> {
    return [
      {
        name: 'my_action',
        description: 'Performs my action',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'Target to act on',
            },
            options: {
              type: 'object',
              properties: {
                verbose: { type: 'boolean' },
              },
            },
          },
          required: ['target'],
        },
        tags: ['action'],
      },
    ];
  }

  async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
    switch (toolName) {
      case 'my_action':
        return await this.myAction(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async myAction(args: unknown): Promise<{ success: boolean; message: string }> {
    // Validate args (use Zod for production)
    const { target } = args as { target: string };

    // Execute command via ShellExecutor
    const result = await this.context.shellExecutor.execute(
      `my-tool action ${target}`,
      { cwd: this.context.projectRoot }
    );

    return {
      success: result.success,
      message: result.success ? 'Action completed' : result.error || 'Failed',
    };
  }
}
```

### 2. Register Your Plugin

Plugins in `src/plugins/*-plugin.ts` are automatically discovered and loaded at server startup. No manual registration needed!

### 3. Enable Your Plugin

Create or update `.mcp-devtools.json` in your project:

```json
{
  "plugins": {
    "enabled": ["my-plugin"]
  }
}
```

### 4. Test Your Plugin

Restart the MCP server and your tool will be available as `my_plugin_my_action`.

## Architecture

### Plugin Lifecycle

```
┌─────────────┐
│  Discovery  │  Scan src/plugins/*-plugin.ts
└──────┬──────┘
       │
┌──────▼──────┐
│   Loading   │  Import and instantiate plugin
└──────┬──────┘
       │
┌──────▼──────┐
│ Validation  │  Check required commands, validate config
└──────┬──────┘
       │
┌──────▼──────┐
│Initialize() │  Setup plugin with context
└──────┬──────┘
       │
┌──────▼──────┐
│  Register   │  Register tools with automatic namespacing
│   Tools     │  my-plugin → my_plugin_tool_name
└──────┬──────┘
       │
┌──────▼──────┐
│   Running   │  Handle tool calls from AI assistant
└──────┬──────┘
       │
┌──────▼──────┐
│ Shutdown()  │  Cleanup resources
└─────────────┘
```

### Tool Namespacing

Plugin tools are automatically namespaced to prevent conflicts:

- Plugin name: `git-spice`
- Tool name: `branch_create`
- Final MCP tool: `git_spice_branch_create`

This ensures plugins can't override core tools or each other.

### Plugin Context

Each plugin receives a `PluginContext` with:

```typescript
interface PluginContext {
  config: Record<string, unknown>;      // Plugin-specific config
  projectRoot: string;                  // Project root directory
  shellExecutor: ShellExecutor;         // Secure command execution
  logger: winston.Logger;               // Scoped logger
  utils: PluginUtils;                   // Helper utilities
}
```

**Security Note:** All plugins share the same `ShellExecutor` instance, ensuring consistent security validation.

## Plugin Interface

### Required Methods

#### `initialize(context: PluginContext): Promise<void>`

Called once when plugin is loaded. Use this to:
- Store context reference
- Validate configuration
- Check required commands are available
- Initialize any stateful resources

```typescript
async initialize(context: PluginContext): Promise<void> {
  this.context = context;

  // Check dependencies
  for (const cmd of this.metadata.requiredCommands || []) {
    const available = await context.utils.isCommandAvailable(cmd);
    if (!available) {
      throw new PluginDependencyError(
        this.metadata.name,
        `Required command not found: ${cmd}`,
        [cmd]
      );
    }
  }

  // Read plugin config
  const myConfig = context.config as MyPluginConfig;
  if (myConfig.apiKey) {
    // Store for later use
  }
}
```

#### `registerTools(): Promise<PluginTool[]>`

Define all MCP tools your plugin provides:

```typescript
async registerTools(): Promise<PluginTool[]> {
  return [
    {
      name: 'deploy',
      description: 'Deploy application to environment',
      inputSchema: {
        type: 'object',
        properties: {
          environment: {
            type: 'string',
            enum: ['dev', 'staging', 'prod'],
            description: 'Target environment',
          },
          version: {
            type: 'string',
            description: 'Version to deploy',
          },
        },
        required: ['environment'],
      },
      examples: [
        {
          description: 'Deploy latest to dev',
          input: { environment: 'dev' },
        },
        {
          description: 'Deploy specific version to prod',
          input: { environment: 'prod', version: 'v1.2.3' },
        },
      ],
      tags: ['deployment', 'ci-cd'],
    },
  ];
}
```

#### `handleToolCall(toolName: string, args: unknown): Promise<unknown>`

Execute tool logic:

```typescript
async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
  this.context.logger.debug(`Executing ${toolName}`, { args });

  switch (toolName) {
    case 'deploy':
      return await this.deploy(args);
    case 'rollback':
      return await this.rollback(args);
    default:
      throw new PluginExecutionError(
        this.metadata.name,
        `Unknown tool: ${toolName}`,
        toolName
      );
  }
}
```

### Optional Methods

#### `validateConfig?(config: unknown): Promise<boolean>`

Validate plugin-specific configuration:

```typescript
async validateConfig(config: unknown): Promise<boolean> {
  const cfg = config as MyPluginConfig;

  if (!cfg.apiKey || cfg.apiKey.length < 10) {
    throw new PluginConfigurationError(
      this.metadata.name,
      'Invalid API key',
      ['apiKey']
    );
  }

  return true;
}
```

#### `shutdown?(): Promise<void>`

Cleanup resources when server stops:

```typescript
async shutdown(): Promise<void> {
  // Close connections
  await this.client?.close();

  // Clear caches
  this.cache.clear();

  this.context.logger.info('Plugin shut down cleanly');
}
```

#### `healthCheck?(): Promise<PluginHealth>`

Monitor plugin health:

```typescript
async healthCheck(): Promise<PluginHealth> {
  const checks: Record<string, boolean> = {};

  // Check API connectivity
  try {
    await this.api.ping();
    checks['api'] = true;
  } catch {
    checks['api'] = false;
  }

  // Check command availability
  checks['tool'] = await this.context.utils.isCommandAvailable('my-tool');

  const allHealthy = Object.values(checks).every(v => v);

  return {
    status: allHealthy ? 'healthy' : 'degraded',
    message: allHealthy ? 'All systems operational' : 'Some checks failed',
    checks,
    timestamp: new Date(),
  };
}
```

## Security Best Practices

### 1. Input Validation

**Always validate and sanitize user inputs:**

```typescript
import { z } from 'zod';

// Define strict schema
const DeployArgsSchema = z.object({
  environment: z.enum(['dev', 'staging', 'prod']),
  version: z.string().regex(/^v\d+\.\d+\.\d+$/),
  force: z.boolean().optional(),
});

// Validate before use
private async deploy(args: unknown): Promise<DeployResult> {
  const validated = DeployArgsSchema.parse(args);
  // Now TypeScript knows the exact shape
}
```

### 2. Command Injection Prevention

**Use ShellExecutor with proper escaping:**

```typescript
// ❌ BAD - Command injection risk
const cmd = `deploy --env ${userInput}`;

// ✅ GOOD - Use ShellExecutor with args array
const result = await this.context.shellExecutor.execute('deploy', {
  args: ['--env', validated.environment],
  cwd: this.context.projectRoot,
});
```

**For shell arguments, escape properly:**

```typescript
function escapeShellArg(arg: string): string {
  // POSIX-compliant shell escaping
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

const safeArg = escapeShellArg(userInput);
```

### 3. Allowlist Required Commands

Commands must be in `ALLOWED_COMMANDS` in `shell-executor.ts`:

```typescript
// Add to src/utils/shell-executor.ts
const ALLOWED_COMMANDS = new Set([
  // ... existing commands
  'my-tool',     // Add your command
  'docker',
  'kubectl',
]);
```

### 4. Validate File Paths

**Prevent directory traversal:**

```typescript
import * as path from 'path';

private validatePath(filePath: string): string {
  const resolved = path.resolve(this.context.projectRoot, filePath);

  // Ensure path is within project boundaries
  if (!resolved.startsWith(this.context.projectRoot)) {
    throw new Error('Path outside project boundaries');
  }

  return resolved;
}
```

### 5. Handle Secrets Securely

**Never log or expose secrets:**

```typescript
// ❌ BAD
this.context.logger.info('Using API key:', apiKey);

// ✅ GOOD
this.context.logger.info('API key configured');

// Read secrets from environment
const apiKey = process.env.MY_PLUGIN_API_KEY;
if (!apiKey) {
  throw new Error('MY_PLUGIN_API_KEY environment variable required');
}
```

### 6. Timeout Long Operations

```typescript
const result = await this.context.shellExecutor.execute('long-task', {
  timeout: 300000, // 5 minutes
  cwd: this.context.projectRoot,
});

if (result.exitCode === -1 && result.error === 'Timeout') {
  return {
    success: false,
    error: 'Operation timed out after 5 minutes',
  };
}
```

## Testing Your Plugin

### Unit Testing with PluginTestHarness

```typescript
// src/__tests__/plugins/my-plugin.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MyPlugin } from '../../plugins/my-plugin.js';
import { PluginContext } from '../../plugins/plugin-interface.js';
import { MockShellExecutor } from '../helpers/mock-shell-executor.js';
import { MockLogger } from '../helpers/mock-logger.js';

describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let mockShellExecutor: MockShellExecutor;
  let mockLogger: MockLogger;
  let context: PluginContext;

  beforeEach(async () => {
    mockShellExecutor = new MockShellExecutor();
    mockLogger = new MockLogger();

    context = {
      config: {},
      projectRoot: '/test/project',
      shellExecutor: mockShellExecutor as any,
      logger: mockLogger as any,
      utils: {
        isCommandAvailable: async () => true,
        resolvePath: (p: string) => `/test/project/${p}`,
        fileExists: async () => true,
        readFile: async () => '',
      },
    };

    plugin = new MyPlugin();
    await plugin.initialize(context);
  });

  it('should initialize successfully', () => {
    expect(mockLogger.hasLog('info', 'initialized')).toBe(true);
  });

  it('should execute my_action', async () => {
    // Mock command response
    mockShellExecutor.mockCommand('my-tool action target1', {
      success: true,
      stdout: 'Success',
    });

    const result = await plugin.handleToolCall('my_action', {
      target: 'target1',
    });

    expect(result).toMatchObject({
      success: true,
      message: 'Action completed',
    });

    expect(mockShellExecutor.wasCommandCalled('my-tool action target1')).toBe(true);
  });

  it('should handle command failures', async () => {
    mockShellExecutor.mockCommandFailure(
      'my-tool action failing',
      'Command failed',
      1
    );

    const result = await plugin.handleToolCall('my_action', {
      target: 'failing',
    });

    expect(result).toMatchObject({
      success: false,
    });
  });

  it('should validate required tools on init', async () => {
    const context2 = {
      ...context,
      utils: {
        ...context.utils,
        isCommandAvailable: async () => false,
      },
    };

    const plugin2 = new MyPlugin();

    await expect(plugin2.initialize(context2)).rejects.toThrow('not found');
  });
});
```

### Integration Testing

```typescript
import { PluginManager } from '../../plugins/plugin-manager.js';
import { ShellExecutor } from '../../utils/shell-executor.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('MyPlugin Integration', () => {
  let tmpDir: string;
  let pluginManager: PluginManager;

  beforeEach(async () => {
    // Create temporary test directory
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'plugin-test-'));

    const shellExecutor = new ShellExecutor(tmpDir);
    pluginManager = new PluginManager(
      tmpDir,
      { enabled: ['my-plugin'] },
      shellExecutor,
      logger
    );

    await pluginManager.loadPlugins();
  });

  afterEach(async () => {
    await pluginManager.shutdownAll();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should load plugin and execute tool', async () => {
    const result = await pluginManager.executeToolCall(
      'my_plugin_my_action',
      { target: 'test' }
    );

    expect(result).toBeDefined();
  });
});
```

## Example Plugins

### 1. git-spice Plugin (Reference Implementation)

Located at `src/plugins/git-spice-plugin.ts` - Study this for best practices:

- Full Zod validation
- Shell argument escaping
- Error handling with suggestions
- Health checks
- Comprehensive JSDoc

**Key Features:**
- 6 working tools
- Security: regex validation, shell escaping
- User-friendly error messages
- 888 lines with extensive documentation

### 2. Docker Tools Plugin (Example)

```typescript
// src/plugins/docker-tools-plugin.ts
import { z } from 'zod';
import {
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginTool,
} from './plugin-interface.js';

const ContainerArgsSchema = z.object({
  name: z.string().regex(/^[a-zA-Z0-9_.-]+$/),
  image: z.string(),
  ports: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
});

export class DockerToolsPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'docker-tools',
    version: '1.0.0',
    description: 'Docker container management',
    requiredCommands: ['docker'],
    tags: ['containers', 'devops'],
  };

  private context!: PluginContext;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    // Verify Docker is running
    const result = await context.shellExecutor.execute('docker info');
    if (!result.success) {
      throw new Error('Docker daemon not running');
    }
  }

  async registerTools(): Promise<PluginTool[]> {
    return [
      {
        name: 'container_run',
        description: 'Run a Docker container',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Container name' },
            image: { type: 'string', description: 'Docker image' },
            ports: {
              type: 'array',
              items: { type: 'string' },
              description: 'Port mappings (e.g., "8080:80")',
            },
            env: {
              type: 'object',
              description: 'Environment variables',
            },
          },
          required: ['name', 'image'],
        },
      },
      {
        name: 'container_stop',
        description: 'Stop a running container',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Container name' },
          },
          required: ['name'],
        },
      },
      {
        name: 'container_list',
        description: 'List running containers',
        inputSchema: {
          type: 'object',
          properties: {
            all: { type: 'boolean', description: 'Include stopped containers' },
          },
        },
      },
    ];
  }

  async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
    switch (toolName) {
      case 'container_run':
        return await this.containerRun(args);
      case 'container_stop':
        return await this.containerStop(args);
      case 'container_list':
        return await this.containerList(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async containerRun(args: unknown) {
    const validated = ContainerArgsSchema.parse(args);

    const cmdArgs = ['run', '-d', '--name', validated.name];

    // Add port mappings
    if (validated.ports) {
      for (const port of validated.ports) {
        cmdArgs.push('-p', port);
      }
    }

    // Add environment variables
    if (validated.env) {
      for (const [key, value] of Object.entries(validated.env)) {
        cmdArgs.push('-e', `${key}=${value}`);
      }
    }

    cmdArgs.push(validated.image);

    const result = await this.context.shellExecutor.execute('docker', {
      args: cmdArgs,
      cwd: this.context.projectRoot,
    });

    return {
      success: result.success,
      containerId: result.success ? result.stdout.trim() : undefined,
      error: result.error,
    };
  }

  private async containerStop(args: unknown) {
    const { name } = z.object({ name: z.string() }).parse(args);

    const result = await this.context.shellExecutor.execute('docker', {
      args: ['stop', name],
      cwd: this.context.projectRoot,
    });

    return {
      success: result.success,
      message: result.success ? `Container ${name} stopped` : result.error,
    };
  }

  private async containerList(args: unknown) {
    const { all } = z.object({ all: z.boolean().optional() }).parse(args);

    const cmdArgs = ['ps', '--format', '{{json .}}'];
    if (all) cmdArgs.push('-a');

    const result = await this.context.shellExecutor.execute('docker', {
      args: cmdArgs,
      cwd: this.context.projectRoot,
    });

    if (!result.success) {
      return { success: false, containers: [], error: result.error };
    }

    // Parse JSON output
    const containers = result.stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    return { success: true, containers };
  }
}
```

## Publishing

### As Part of MCP DevTools

1. Place plugin in `src/plugins/`
2. Add tests in `src/__tests__/plugins/`
3. Update README.md with plugin documentation
4. Submit PR to main repository

### As Standalone Package (Future)

Once plugin registry is available:

1. Create npm package with proper structure
2. Add `mcp-plugin` keyword to package.json
3. Publish to npm
4. Submit to plugin registry

Example `package.json`:

```json
{
  "name": "@my-org/mcp-plugin-docker-tools",
  "version": "1.0.0",
  "keywords": ["mcp-plugin", "docker", "containers"],
  "main": "dist/docker-tools-plugin.js",
  "types": "dist/docker-tools-plugin.d.ts",
  "mcp-plugin": {
    "name": "docker-tools",
    "requiredCommands": ["docker"],
    "minServerVersion": "1.0.0"
  }
}
```

## Troubleshooting

### Plugin Not Loading

**Check plugin file naming:**
- Must be in `src/plugins/`
- Must match pattern `*-plugin.ts`
- Must export a class implementing `Plugin`

**Check server logs:**
```bash
LOG_LEVEL=debug npm run dev
```

Look for plugin loading messages.

### Tool Not Appearing

**Verify plugin is enabled:**
```json
{
  "plugins": {
    "enabled": ["my-plugin"]
  }
}
```

**Check tool registration:**
- Tool name must be unique within plugin
- Tool schema must be valid JSON Schema
- `registerTools()` must return array

### Command Execution Fails

**Ensure command is allowlisted:**
```typescript
// Add to src/utils/shell-executor.ts
const ALLOWED_COMMANDS = new Set([
  'my-command',
]);
```

**Check command availability:**
```bash
which my-command
```

**Verify shell executor configuration:**
```typescript
const result = await this.context.shellExecutor.execute('my-command', {
  args: ['arg1', 'arg2'],
  cwd: this.context.projectRoot,
  timeout: 30000,
});
```

### Plugin Initialization Fails

**Common causes:**
- Required command not found
- Invalid configuration
- Network issues (for API-based plugins)
- Missing dependencies

**Add better error messages:**
```typescript
async initialize(context: PluginContext): Promise<void> {
  try {
    // initialization code
  } catch (error) {
    context.logger.error('Plugin initialization failed', error);
    throw new PluginInitializationError(
      this.metadata.name,
      'Failed to initialize: ' + (error as Error).message,
      error as Error
    );
  }
}
```

### Type Errors

**Ensure proper imports:**
```typescript
import type { Plugin, PluginContext } from './plugin-interface.js';
```

**Use TypeScript strict mode:**
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

## Best Practices

### 1. Error Messages

Provide actionable error messages with suggestions:

```typescript
if (!result.success) {
  const suggestions = [];

  if (result.stderr.includes('not found')) {
    suggestions.push('Install the tool: npm install -g my-tool');
    suggestions.push('Or add to PATH: export PATH=$PATH:/path/to/tool');
  }

  return {
    success: false,
    error: result.stderr,
    suggestions,
  };
}
```

### 2. Logging

Use appropriate log levels:

```typescript
this.context.logger.debug('Processing request', { args });
this.context.logger.info('Action completed successfully');
this.context.logger.warn('Non-critical issue detected', { issue });
this.context.logger.error('Operation failed', { error });
```

### 3. Documentation

Add comprehensive JSDoc comments:

```typescript
/**
 * Deploy application to specified environment
 *
 * @param args - Deployment arguments
 * @returns Deployment result with status and details
 *
 * @example
 * ```typescript
 * const result = await plugin.handleToolCall('deploy', {
 *   environment: 'staging',
 *   version: 'v1.2.3'
 * });
 * ```
 */
private async deploy(args: unknown): Promise<DeployResult> {
  // implementation
}
```

### 4. Performance

Cache expensive operations:

```typescript
private cache = new Map<string, CachedValue>();

private async getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 60000
): Promise<T> {
  const cached = this.cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.value as T;
  }

  const value = await fetcher();
  this.cache.set(key, { value, timestamp: Date.now() });

  return value;
}
```

### 5. Graceful Degradation

Handle failures gracefully:

```typescript
async healthCheck(): Promise<PluginHealth> {
  try {
    // Check health
    return { status: 'healthy', timestamp: new Date() };
  } catch (error) {
    // Log but don't crash
    this.context.logger.warn('Health check failed', error);
    return {
      status: 'degraded',
      message: 'Some features may not work',
      timestamp: new Date(),
    };
  }
}
```

## Resources

- **Plugin Interface**: `src/plugins/plugin-interface.ts`
- **Plugin Manager**: `src/plugins/plugin-manager.ts`
- **Reference Plugin**: `src/plugins/git-spice-plugin.ts`
- **Shell Executor**: `src/utils/shell-executor.ts`
- **Test Utilities**: `src/__tests__/helpers/`

## Getting Help

- **GitHub Issues**: https://github.com/rshade/mcp-devtools-server/issues
- **Documentation**: https://github.com/rshade/mcp-devtools-server
- **Examples**: `src/plugins/` directory

## Contributing

See [CONTRIBUTING.md](https://github.com/rshade/mcp-devtools-server/blob/main/CONTRIBUTING.md) for guidelines on:
- Code style
- Testing requirements
- PR process
- Commit conventions

**Plugin Contribution Checklist:**

- [ ] Plugin follows naming convention (`*-plugin.ts`)
- [ ] All required methods implemented
- [ ] Input validation with Zod schemas
- [ ] Security: shell escaping, path validation
- [ ] Tests with 85%+ coverage
- [ ] JSDoc documentation
- [ ] Example usage in docs
- [ ] README.md updated
- [ ] CHANGELOG.md entry (via commit message)
