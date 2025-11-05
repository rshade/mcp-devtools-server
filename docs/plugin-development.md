# Plugin Development Guide

Complete guide to developing plugins for the MCP DevTools server.

## Table of Contents

- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Plugin Architecture](#plugin-architecture)
- [Plugin Interface](#plugin-interface)
- [Tool Implementation](#tool-implementation)
- [Security](#security)
- [Testing](#testing)
- [Error Handling](#error-handling)
- [Configuration](#configuration)
- [Best Practices](#best-practices)
- [Publishing](#publishing)
- [Reference](#reference)

## Introduction

### What are Plugins?

Plugins extend the MCP DevTools server with additional functionality. They provide:

- **Custom tools** accessible through the MCP protocol
- **Language/framework support** (Docker, Kubernetes, etc.)
- **CI/CD integrations** (GitHub Actions, Jenkins, etc.)
- **IDE enhancements** (formatters, linters, etc.)
- **Notification systems** (Slack, Discord, Email)

### Why Use Plugins?

- **Extensibility**: Add features without modifying core code
- **Isolation**: Plugin failures don't affect the server
- **Reusability**: Share plugins across projects
- **Security**: Sandboxed execution through shared ShellExecutor

## Quick Start

### 5-Minute Plugin Creation

1. **Copy the template**:

   ```bash
   cp examples/plugins/custom-plugin-example.ts src/plugins/my-tool-plugin.ts
   ```

2. **Update metadata**:

   ```typescript
   metadata: PluginMetadata = {
     name: 'my-tool',
     version: '1.0.0',
     description: 'Integration with my-tool',
     requiredCommands: ['my-tool'],
     tags: ['utility'],
   };
   ```

3. **Implement a tool**:

   ```typescript
   async registerTools(): Promise<PluginTool[]> {
     return [{
       name: 'execute',
       description: 'Execute my-tool command',
       inputSchema: {
         type: 'object',
         properties: {
           args: { type: 'array', items: { type: 'string' } }
         }
       }
     }];
   }
   ```

4. **Build and test**:

   ```bash
   npm run build
   node dist/index.js
   ```

Your plugin will be auto-discovered and loaded!

## Plugin Architecture

### How Plugins Work

```
┌─────────────────────────────────────┐
│     MCP DevTools Server             │
│  ┌───────────────────────────────┐  │
│  │     Plugin Manager            │  │
│  │  - Discovery                  │  │
│  │  - Registration               │  │
│  │  - Tool Routing               │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────┴───────────────────┐  │
│  │   Plugin 1   │   Plugin 2     │  │
│  │  ┌─────┐     │   ┌─────┐      │  │
│  │  │Tool1│     │   │Tool3│      │  │
│  │  │Tool2│     │   │Tool4│      │  │
│  │  └─────┘     │   └─────┘      │  │
│  └──────────────┴────────────────┘  │
│              │                       │
│  ┌───────────┴───────────────────┐  │
│  │    Shared ShellExecutor       │  │
│  │    (Security Layer)           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Plugin Lifecycle

1. **Discovery**: PluginManager scans `src/plugins/*-plugin.ts`
2. **Validation**: Checks required dependencies
3. **Initialization**: Calls `initialize()` with context
4. **Registration**: Calls `registerTools()` to get tool list
5. **Execution**: Routes tool calls to `handleToolCall()`
6. **Shutdown**: Calls `shutdown()` on server exit

### Tool Namespacing

Tools are automatically prefixed with plugin name:

```
Plugin: git-spice
Tool: branch_create
Result: git_spice_branch_create
```

This prevents naming conflicts between plugins.

## Plugin Interface

### Required Methods

```typescript
export class MyPlugin implements Plugin {
  // Metadata (required)
  metadata: PluginMetadata = { /* ... */ };

  // Lifecycle (required)
  async initialize(context: PluginContext): Promise<void> { }

  // Tool registration (required)
  async registerTools(): Promise<PluginTool[]> { }

  // Tool execution (required)
  async handleToolCall(toolName: string, args: unknown): Promise<unknown> { }
}
```

### Optional Methods

```typescript
// Configuration validation
async validateConfig?(config: unknown): Promise<boolean> { }

// Cleanup on shutdown
async shutdown?(): Promise<void> { }

// Health monitoring
async healthCheck?(): Promise<PluginHealth> { }
```

### Plugin Context

Every plugin receives a context with:

```typescript
interface PluginContext {
  config: Record<string, unknown>;    // Plugin configuration
  projectRoot: string;                 // Project directory
  shellExecutor: ShellExecutor;        // Secure command execution
  logger: winston.Logger;              // Scoped logger
  utils: PluginUtils;                  // Helper functions
}
```

### Plugin Utilities

```typescript
interface PluginUtils {
  isCommandAvailable(command: string): Promise<boolean>;
  resolvePath(relativePath: string): string;
  fileExists(filePath: string): Promise<boolean>;
  readFile(filePath: string): Promise<string>;
}
```

## Tool Implementation

### Tool Definition

```typescript
{
  name: 'my_action',                    // Tool name (snake_case)
  description: 'Performs my action',   // AI-friendly description
  inputSchema: {                        // JSON Schema for validation
    type: 'object',
    properties: {
      input: { type: 'string' },
      verbose: { type: 'boolean' }
    },
    required: ['input']
  },
  examples: [{                          // Usage examples
    description: 'Basic usage',
    input: { input: 'test' },
    output: { success: true }
  }],
  tags: ['action', 'utility']           // Categorization
}
```

### Input Validation with Zod

Always validate input using Zod schemas:

```typescript
import { z } from 'zod';

const MyToolArgsSchema = z.object({
  input: z.string().min(1).describe('Input parameter'),
  verbose: z.boolean().optional().describe('Verbose output'),
  timeout: z.number().min(1000).max(300000).optional(),
});

private async myTool(args: unknown): Promise<MyToolResult> {
  // Validate - throws on invalid input
  const validated = MyToolArgsSchema.parse(args);

  // Now use validated.input, validated.verbose, etc.
}
```

### Command Execution

Execute commands through the secure ShellExecutor:

```typescript
const result = await this.context.shellExecutor.execute(
  `my-command ${validated.input}`,
  {
    cwd: this.context.projectRoot,
    timeout: validated.timeout || 60000,
  }
);

if (result.success) {
  return { success: true, output: result.stdout };
} else {
  return {
    success: false,
    error: result.stderr,
    suggestions: this.generateSuggestions(result.stderr),
  };
}
```

### JSON Output Parsing

Prefer JSON output when available:

```typescript
// Request JSON output
const result = await this.context.shellExecutor.execute(
  'my-command --json'
);

if (result.success) {
  try {
    const parsed = JSON.parse(result.stdout);
    return { success: true, data: parsed };
  } catch {
    // Fallback to text parsing
    return { success: true, output: result.stdout };
  }
}
```

## Security

### Command Allowlist

All commands must be in the ShellExecutor allowlist.

**Add your command to `src/utils/shell-executor.ts`**:

```typescript
const ALLOWED_COMMANDS = new Set([
  // ... existing commands ...
  'my-command',  // Your command here
]);
```

### Input Sanitization

1. **Never** concatenate user input directly into commands
2. **Always** use Zod schemas for validation
3. **Validate** file paths are within project boundaries
4. **Sanitize** special characters
5. **Escape** shell arguments (defense-in-depth)

#### Command Injection Prevention

Shell metacharacters must be blocked or escaped to prevent command injection attacks.

**Dangerous Characters to Block:**

- `;` - Command separator
- `&` - Background execution / AND operator
- `|` - Pipe operator
- `` ` `` - Command substitution (backticks)
- `$()` - Command substitution
- `>` `<` - Redirection
- `'` `"` - Quote manipulation
- `\` - Escape sequences
- `()` - Subshells

**Bad** (Command Injection vulnerability):

```typescript
const command = `my-tool ${userInput}`;  // DANGEROUS!
// Attack: userInput = "test; rm -rf /"
```

**Good** (Properly validated with regex):

```typescript
const SAFE_INPUT_REGEX = /^[a-zA-Z0-9\/_.-]+$/;

const InputSchema = z.object({
  value: z
    .string()
    .min(1)
    .max(255)
    .regex(SAFE_INPUT_REGEX, 'Input contains invalid characters'),
});
const validated = InputSchema.parse(args);
const command = `my-tool ${validated.value}`;
```

**Better** (Validation + Shell Escaping - Defense-in-Depth):

```typescript
const SAFE_INPUT_REGEX = /^[a-zA-Z0-9\/_.-]+$/;

const InputSchema = z.object({
  value: z
    .string()
    .min(1)
    .max(255)
    .regex(SAFE_INPUT_REGEX, 'Input contains invalid characters'),
});

function escapeShellArg(arg: string): string {
  // POSIX-compliant shell escaping
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

const validated = InputSchema.parse(args);
const command = `my-tool ${escapeShellArg(validated.value)}`;
```

#### Regex Patterns for Common Inputs

**Branch Names:**

```typescript
const SAFE_BRANCH_NAME_REGEX = /^[a-zA-Z0-9\/_.-]+$/;
```

**Commit Messages:**

```typescript
const SAFE_MESSAGE_REGEX = /^[^;&|`$()<>'"\\]+$/;
```

**File Paths:**

```typescript
const SAFE_PATH_REGEX = /^[a-zA-Z0-9\/_.  -]+$/;
```

#### Security Testing

Always add security tests for command injection:

```typescript
describe('Security Tests', () => {
  it('should reject semicolon injection', async () => {
    await expect(
      plugin.handleToolCall('my_tool', {
        input: 'test; rm -rf /',
      })
    ).rejects.toThrow(/invalid characters/i);
  });

  it('should reject pipe injection', async () => {
    await expect(
      plugin.handleToolCall('my_tool', {
        input: 'test | cat /etc/passwd',
      })
    ).rejects.toThrow(/invalid characters/i);
  });

  it('should reject command substitution', async () => {
    await expect(
      plugin.handleToolCall('my_tool', {
        input: 'test$(whoami)',
      })
    ).rejects.toThrow(/invalid characters/i);
  });
});
```

### No Dynamic Code Execution

- **Never** use `eval()` or `Function()`
- **Never** execute user-provided code
- **Always** use ShellExecutor for external commands

## Testing

### Test Structure

Create tests in `src/__tests__/plugins/your-plugin.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { YourPlugin } from '../../plugins/your-plugin.js';

describe('YourPlugin', () => {
  let plugin: YourPlugin;
  let mockContext: PluginContext;

  beforeEach(() => {
    plugin = new YourPlugin();
    mockContext = createMockContext();
  });

  describe('metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(plugin.metadata.name).toBe('your-plugin');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await expect(plugin.initialize(mockContext)).resolves.not.toThrow();
    });
  });

  describe('my_tool', () => {
    it('should execute successfully', async () => {
      const result = await plugin.handleToolCall('my_tool', {
        input: 'test'
      });
      expect(result).toMatchObject({ success: true });
    });
  });
});
```

### Mock ShellExecutor

```typescript
class MockShellExecutor extends ShellExecutor {
  private mockResults = new Map<string, ExecutionResult>();

  setMockResult(command: string, result: ExecutionResult): void {
    this.mockResults.set(command, result);
  }

  async execute(command: string): Promise<ExecutionResult> {
    return this.mockResults.get(command) || {
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 10,
      command,
    };
  }
}
```

### Coverage Goals

- **Plugin Manager**: 90%+ coverage
- **Individual Plugins**: 85%+ coverage
- **Critical paths**: 100% coverage

## Error Handling

### Helpful Error Messages

Generate actionable suggestions:

```typescript
private generateSuggestions(errorOutput: string): string[] {
  const suggestions: string[] = [];

  if (errorOutput.includes('not found')) {
    suggestions.push('Command not found');
    suggestions.push('Install with: npm install -g my-tool');
    suggestions.push('Documentation: https://...');
  }

  if (errorOutput.includes('permission denied')) {
    suggestions.push('Permission denied');
    suggestions.push('Try running with sudo or check file permissions');
  }

  if (errorOutput.includes('authentication')) {
    suggestions.push('Authentication failed');
    suggestions.push('Run: my-tool login');
    suggestions.push('Or set MY_TOOL_TOKEN environment variable');
  }

  return suggestions;
}
```

### Error Types

Use appropriate error types:

```typescript
import {
  PluginInitializationError,
  PluginExecutionError,
  PluginConfigurationError,
} from '../plugin-interface';

// Initialization errors
throw new PluginInitializationError(
  'my-plugin',
  'Failed to initialize: command not found'
);

// Execution errors
throw new PluginExecutionError(
  'my-plugin',
  'Tool execution failed',
  'my_tool'
);

// Configuration errors
throw new PluginConfigurationError(
  'my-plugin',
  'Invalid configuration',
  ['apiKey', 'endpoint']
);
```

## Configuration

### Plugin Configuration Schema

Add your plugin config to `.mcp-devtools.schema.json`:

```json
{
  "plugins": {
    "properties": {
      "my-plugin": {
        "type": "object",
        "properties": {
          "apiKey": { "type": "string" },
          "endpoint": { "type": "string", "default": "https://api.example.com" },
          "timeout": { "type": "number", "default": 60000 }
        }
      }
    }
  }
}
```

### Validate Configuration

```typescript
async validateConfig(config: unknown): Promise<boolean> {
  const cfg = config as Record<string, unknown>;

  // Check required fields
  if (!cfg.apiKey || typeof cfg.apiKey !== 'string') {
    throw new Error('apiKey is required');
  }

  // Validate format
  if (cfg.endpoint && !cfg.endpoint.toString().startsWith('https://')) {
    throw new Error('endpoint must use HTTPS');
  }

  return true;
}
```

### Access Configuration

```typescript
async initialize(context: PluginContext): Promise<void> {
  this.context = context;

  // Access plugin-specific config
  const apiKey = context.config.apiKey as string;
  const endpoint = (context.config.endpoint as string) || 'https://api.example.com';

  // Use configuration
  this.client = new MyClient(apiKey, endpoint);
}
```

## Best Practices

### 1. Follow Naming Conventions

- **Plugin name**: `kebab-case` (e.g., `git-spice`, `docker-tools`)
- **File name**: `{name}-plugin.ts` (e.g., `git-spice-plugin.ts`)
- **Class name**: `PascalCase` + `Plugin` (e.g., `GitSpicePlugin`)
- **Tool names**: `snake_case` (e.g., `branch_create`, `list_containers`)

### 2. Write Comprehensive Documentation

```typescript
/**
 * Create a new feature branch
 *
 * Creates a new Git branch and sets up tracking with the remote repository.
 * Optionally creates an initial commit with the specified message.
 *
 * @example
 * ```typescript
 * await plugin.handleToolCall('branch_create', {
 *   name: 'feature/new-feature',
 *   base: 'main',
 *   message: 'Initial commit'
 * });
 * ```
 *
 * @param args - Branch creation arguments
 * @returns Creation result with branch info
 * @throws {PluginExecutionError} If branch creation fails
 */
private async branchCreate(args: unknown): Promise<BranchCreateResult> {
  // Implementation
}
```

### 3. Provide Usage Examples

Include examples in tool definitions:

```typescript
examples: [
  {
    description: 'Create a simple branch',
    input: { name: 'feature/simple' },
  },
  {
    description: 'Create branch with custom base',
    input: { name: 'feature/complex', base: 'develop' },
  },
  {
    description: 'Create branch with initial commit',
    input: {
      name: 'feature/documented',
      base: 'main',
      message: 'Initial implementation'
    },
  },
]
```

### 4. Handle Edge Cases

```typescript
// Empty input
if (!validated.input || validated.input.trim() === '') {
  return { success: false, error: 'Input cannot be empty' };
}

// Check file exists
if (!(await this.context.utils.fileExists(filePath))) {
  return { success: false, error: `File not found: ${filePath}` };
}

// Timeout handling
try {
  const result = await this.context.shellExecutor.execute(command, {
    timeout: 60000,
  });
} catch (error) {
  if (error.message.includes('timeout')) {
    return { success: false, error: 'Command timed out', suggestions: ['Increase timeout', 'Check if process is hung'] };
  }
}
```

### 5. Log Appropriately

```typescript
// Info level for normal operations
this.context.logger.info('Starting branch creation', { name: validated.name });

// Debug level for detailed information
this.context.logger.debug('Executing command', { command, args });

// Error level for failures
this.context.logger.error('Branch creation failed', { error, name });
```

## Publishing

### Checklist

- [ ] Plugin implementation complete
- [ ] All tests passing (85%+ coverage)
- [ ] Linting passes
- [ ] TypeScript compiles without errors
- [ ] Documentation complete
- [ ] Example configuration provided
- [ ] CHANGELOG.md updated

### Package Structure

```
your-plugin/
├── src/plugins/
│   └── your-plugin-plugin.ts
├── src/__tests__/plugins/
│   └── your-plugin.test.ts
├── examples/
│   └── your-plugin-project.json
├── docs/plugins/
│   └── your-plugin.md
└── README.md (updated)
```

### Submit Plugin

1. **Create Pull Request** with plugin implementation
2. **Include**:
   - Plugin code
   - Tests
   - Documentation
   - Example configuration
3. **Ensure** all CI checks pass
4. **Await** code review

## Reference

### Complete Example: git-spice Plugin

The git-spice plugin is the reference implementation demonstrating all best practices:

**File**: `src/plugins/git-spice-plugin.ts`

**Features**:
- 6 fully implemented tools
- Comprehensive error handling
- Zod validation for all inputs
- JSON output parsing
- Health checks
- 85%+ test coverage
- Extensive documentation

Study this plugin to understand:
- Project structure
- Code organization
- Testing strategies
- Documentation standards
- Error handling patterns

### Resources

- **Plugin Interface**: `src/plugins/plugin-interface.ts`
- **Plugin Manager**: `src/plugins/plugin-manager.ts`
- **Example Template**: `examples/plugins/custom-plugin-example.ts`
- **Reference Plugin**: `src/plugins/git-spice-plugin.ts`
- **Test Examples**: `src/__tests__/plugins/`

### Getting Help

- **Issues**: https://github.com/rshade/mcp-devtools-server/issues
- **Discussions**: https://github.com/rshade/mcp-devtools-server/discussions
- **Documentation**: https://github.com/rshade/mcp-devtools-server/tree/main/docs

---

**Happy plugin development!** 🎉
