# Architecture

This document provides a comprehensive overview of the MCP DevTools Server architecture, including
core components, security model, plugin system, and data flow.

## Overview

The MCP DevTools Server is built on a modular, secure architecture that provides standardized
development tool integration for AI assistants. The server implements the
[Model Context Protocol (MCP)](https://modelcontextprotocol.io/) to enable seamless communication
between AI assistants like Claude and development tools.

### Design Principles

1. **Security First** - All commands are validated and sanitized
2. **Modularity** - Plugin-based architecture for extensibility
3. **Performance** - Intelligent caching for fast repeated operations
4. **Developer Experience** - Auto-configuration and smart defaults
5. **Type Safety** - Full TypeScript implementation with Zod validation

## System Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│                     Claude Desktop                            │
│                    (MCP Client)                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ stdio (MCP Protocol)
                            │
┌───────────────────────────▼──────────────────────────────────┐
│                  MCP DevTools Server                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │            Server Layer (index.ts)                     │  │
│  │  - Tool Registration                                   │  │
│  │  - Request Routing                                     │  │
│  │  - Response Formatting                                 │  │
│  └──────────────┬─────────────────────────────────────────┘  │
│                 │                                             │
│  ┌──────────────▼─────────────────────────────────────────┐  │
│  │          Tool Registry & Routing                       │  │
│  │  - 40+ Tool Definitions                                │  │
│  │  - Schema Validation (Zod)                             │  │
│  │  - Tool → Handler Mapping                              │  │
│  └──────────┬────────────────────┬──────────────┬─────────┘  │
│             │                    │              │             │
│  ┌──────────▼──────────┐  ┌──────▼───────┐  ┌──▼─────────┐  │
│  │   Tool Classes      │  │   Plugins    │  │  Utilities │  │
│  │  - GoTools          │  │  - git-spice │  │  - Cache   │  │
│  │  - GitTools         │  │  - Custom    │  │  - Logger  │  │
│  │  - MakeTools        │  │  - (more)    │  │  - Scanner │  │
│  │  - LintTools        │  │              │  │            │  │
│  │  - TestTools        │  │              │  │            │  │
│  │  - SmartSuggestions │  │              │  │            │  │
│  │  - (more)           │  │              │  │            │  │
│  └──────────┬──────────┘  └──────┬───────┘  └──┬─────────┘  │
│             │                    │              │             │
│  ┌──────────▼────────────────────▼──────────────▼─────────┐  │
│  │          Shared Infrastructure Layer                   │  │
│  │  ┌────────────────┐  ┌───────────────┐  ┌───────────┐ │  │
│  │  │ ShellExecutor  │  │ CacheManager  │  │  Project  │ │  │
│  │  │  (Security)    │  │   (LRU+TTL)   │  │ Detector  │ │  │
│  │  └────────────────┘  └───────────────┘  └───────────┘ │  │
│  └──────────────────────────────────────────────────────── ┘  │
│                 │                                             │
└─────────────────┼─────────────────────────────────────────────┘
                  │
                  │ Validated & Sanitized Commands
                  │
┌─────────────────▼─────────────────────────────────────────────┐
│                 Operating System                              │
│  - Shell Commands (make, go, git, npm, etc.)                  │
│  - File System Operations                                     │
│  - External Tools (linters, test frameworks, etc.)            │
└───────────────────────────────────────────────────────────────┘
```

## Core Components

### Server Layer

**File:** `src/index.ts`

The main server implementation that:

- Initializes the MCP server using `@modelcontextprotocol/sdk`
- Registers all available tools (40+ tools)
- Routes incoming requests to appropriate handlers
- Formats responses according to MCP protocol
- Handles errors and provides meaningful feedback

**Key Responsibilities:**

- Tool registration with JSON Schema validation
- Request/response lifecycle management
- Error handling and logging
- Server lifecycle (startup, shutdown)

### Shell Executor

**File:** `src/utils/shell-executor.ts`

The security-critical component responsible for safe command execution.

**Security Model:**

```typescript
// Command Allowlist - Only these commands can be executed
const ALLOWED_COMMANDS = new Set([
  'make', 'go', 'git', 'npm', 'eslint', 'markdownlint',
  'yamllint', 'actionlint', 'gs', // git-spice
  // ... more
]);

// Dangerous Arguments - Blocked even if command is allowed
const DANGEROUS_ARGS = [
  ';', '&&', '||', '|', '>', '<', '`', '$(',
  '../', '~/', '/etc/', '/var/', '/usr/',
];
```

**Features:**

- Command allowlist validation
- Argument sanitization
- Working directory restrictions
- Timeout protection (default: 2 minutes)
- Output capture (stdout/stderr)
- Exit code handling

### Cache Manager

**File:** `src/utils/cache-manager.ts`

Implements intelligent LRU caching with file-based invalidation.

**Architecture:**

```typescript
interface CacheEntry {
  value: unknown;
  timestamp: number;
  checksum?: string;  // SHA-256 hash for file-based invalidation
}

// Multi-namespace cache
class CacheManager {
  private caches: Map<string, LRUCache>;
  private checksumTracker: ChecksumTracker;
}
```

**Features:**

- LRU eviction policy
- TTL-based expiration (configurable per namespace)
- File-based invalidation (SHA-256 checksums)
- Memory management (max entries, size limits)
- Namespace isolation
- Performance: 5-10x speedups for repeated operations

**Use Cases:**

- Project detection caching (50-200ms → <1ms)
- Go module analysis (100-500ms → <5ms)
- File scanning (varies → <10ms)

See the Caching System section above for implementation details.

### Project Detector

**File:** `src/utils/project-detector.ts`

Auto-detects project type, framework, and available tools.

**Detection Logic:**

1. **File-based detection:**
   - `package.json` → Node.js
   - `go.mod` → Go
   - `requirements.txt` → Python
   - `Cargo.toml` → Rust
   - `pom.xml` → Java
   - `.csproj` → .NET

2. **Framework detection:**
   - React, Vue, Angular (Node.js)
   - Django, Flask (Python)
   - Gin, Echo (Go)
   - And more

3. **Tool availability:**
   - Linters (ESLint, golangci-lint, ruff, etc.)
   - Test frameworks (Jest, pytest, go test, etc.)
   - Build systems (Make, npm, go, cargo, etc.)

**Caching:** Project detection is heavily cached (5-minute TTL).

### Plugin Manager

**File:** `src/plugins/plugin-manager.ts`

Manages the plugin lifecycle and tool registration.

**Plugin Discovery:**

```text
Search Paths (in order):
1. src/plugins/*-plugin.ts  (built-in plugins)
2. ~/.mcp-devtools/plugins/*-plugin.ts  (user plugins)
3. .mcp-devtools-plugins/*-plugin.ts  (project plugins)
```

**Plugin Lifecycle:**

```text
Discovery → Validation → Initialization → Registration → Execution
    ↓           ↓             ↓              ↓            ↓
  Scan     Check Deps    Plugin.init()  registerTools()  handleToolCall()
  paths    & metadata    with context                    on demand
```

**Features:**

- Auto-discovery from multiple locations
- Dependency validation (required commands)
- Tool namespacing (`{plugin-name}_{tool-name}`)
- Health monitoring
- Graceful degradation (failed plugins don't crash server)

### Tool Classes

Specialized handlers for different tool categories:

- **GoTools** (`src/tools/go-tools.ts`) - 13 Go language tools
- **GitTools** (`src/tools/git-tools.ts`) - Code review, PR generation
- **MakeTools** (`src/tools/make-tools.ts`) - Make command integration
- **LintTools** (`src/tools/lint-tools.ts`) - Multi-linter support
- **TestTools** (`src/tools/test-tools.ts`) - Test framework integration
- **SmartSuggestionsTools** (`src/tools/smart-suggestions-tools.ts`) - AI-powered analysis
- **FileValidationTools** (`src/tools/file-validation-tools.ts`) - POSIX compliance
- **ActionlintTools** (`src/tools/actionlint-tools.ts`) - GitHub Actions validation
- **OnboardingTools** (`src/tools/onboarding-tools.ts`) - Zero-config setup

Each tool class:

- Uses ShellExecutor for security
- Implements input validation with Zod schemas
- Provides structured error handling
- Returns consistent response formats

## Security Model

### Defense in Depth

The MCP DevTools Server implements multiple layers of security:

#### Layer 1: Command Allowlist

```typescript
// Only explicitly allowed commands can execute
if (!ALLOWED_COMMANDS.has(command)) {
  throw new Error(`Command not allowed: ${command}`);
}
```

#### Layer 2: Argument Sanitization

```typescript
// Block dangerous patterns
for (const arg of args) {
  if (DANGEROUS_ARGS.some(pattern => arg.includes(pattern))) {
    throw new Error(`Dangerous argument detected: ${arg}`);
  }
}
```

#### Layer 3: Working Directory Validation

```typescript
// Commands can only run within project boundaries
const resolvedPath = path.resolve(cwd);
const projectRoot = path.resolve(process.cwd());

if (!resolvedPath.startsWith(projectRoot)) {
  throw new Error('Working directory outside project boundaries');
}
```

#### Layer 4: Timeout Protection

```typescript
// All commands have maximum execution time
const result = await executeWithTimeout(command, args, {
  timeout: 120000, // 2 minutes default
});
```

#### Layer 5: Output Sanitization

- Secrets are filtered from error messages
- Paths are sanitized in logs
- Sensitive environment variables are not exposed

### Plugin Security Isolation

Plugins execute through the shared ShellExecutor:

- Plugins CANNOT bypass security checks
- Plugins CANNOT execute arbitrary code
- Plugins MUST declare required commands
- Plugins run with same restrictions as core tools

## Plugin System Architecture

### Plugin Interface

```typescript
export interface Plugin {
  metadata: PluginMetadata;
  initialize(context: PluginContext): Promise<void>;
  registerTools(): Promise<PluginTool[]>;
  handleToolCall(toolName: string, args: unknown): Promise<unknown>;
  validateConfig?(config: unknown): Promise<boolean>;
  shutdown?(): Promise<void>;
  healthCheck?(): Promise<PluginHealth>;
}
```

### Plugin Context

Every plugin receives a context with shared infrastructure:

```typescript
interface PluginContext {
  config: Record<string, unknown>;    // Plugin configuration
  projectRoot: string;                // Project directory
  shellExecutor: ShellExecutor;       // Secure command execution
  logger: winston.Logger;             // Scoped logger
  utils: PluginUtils;                 // Helper functions
}
```

### Tool Namespacing

Tools are automatically namespaced to prevent conflicts:

```text
Plugin: git-spice
Tool: branch_create
Result: git_spice_branch_create
```

### Plugin Examples

**Built-in Plugins:**

- **git-spice** (`src/plugins/git-spice-plugin.ts`) - Stacked branch management
  - 6 tools (branch_create, branch_checkout, stack_submit, stack_restack, log_short, repo_sync)
  - 850+ lines, comprehensive implementation
  - Security validated, well-tested

**Creating Custom Plugins:**

See [Plugin Development Guide](./plugin-development.md) for detailed instructions.

## Data Flow

### Request Flow

```text
1. Claude sends MCP request
   ↓
2. Server validates request schema
   ↓
3. Tool Registry routes to handler
   ↓
4. Handler validates input (Zod)
   ↓
5. Cache lookup (if applicable)
   ↓ (cache miss)
6. ShellExecutor executes command
   ↓
7. Result cached (if applicable)
   ↓
8. Response formatted (MCP protocol)
   ↓
9. Claude receives response
```

### Error Handling Flow

```text
1. Error occurs during execution
   ↓
2. Error captured with context
   ↓
3. FailureAnalyzer identifies pattern
   ↓
4. SuggestionEngine generates recommendations
   ↓
5. Structured error response
   {
     success: false,
     error: "Clear error message",
     suggestions: ["Fix 1", "Fix 2"],
     affectedFiles: ["file1.ts"],
     severity: "high"
   }
```

### Caching Integration Points

```text
┌─────────────┐
│ Tool Called │
└──────┬──────┘
       │
       ▼
  ┌────────────┐
  │ Cache Hit? │───Yes──→ Return cached value
  └────┬───────┘
       │ No
       ▼
  ┌────────────────┐
  │ Execute Command│
  └────┬───────────┘
       │
       ▼
  ┌────────────────┐
  │  Cache Result  │
  └────┬───────────┘
       │
       ▼
  ┌────────────────┐
  │ Return Result  │
  └────────────────┘
```

## Performance Optimizations

### 1. Intelligent Caching

- **Project Detection:** 5-minute TTL, file-based invalidation
- **Go Project Info:** 2-hour TTL, go.mod checksum invalidation
- **File Scanning:** 5-minute TTL, directory checksum tracking

### 2. Fast-Path Checks

```typescript
// Check mtime + size before expensive checksum
if (stats.mtime === cached.mtime && stats.size === cached.size) {
  return cached.value;
}

// Only compute SHA-256 if fast checks fail
const checksum = await computeChecksum(filePath);
```

### 3. Sampling for Memory Estimation

```typescript
// Sample 10 entries instead of measuring all
const sample = Array.from(this.cache.values()).slice(0, 10);
const avgSize = sample.reduce((sum, entry) =>
  sum + JSON.stringify(entry).length, 0) / sample.length;
```

### 4. Skip Large Files

```typescript
// Files >100MB use only mtime+size (no checksum)
if (stats.size > 100 * 1024 * 1024) {
  return { mtime: stats.mtime, size: stats.size };
}
```

## Configuration

### Project Configuration

**File:** `.mcp-devtools.json`

```json
{
  "commands": {
    "lint": "make lint",
    "test": "make test",
    "build": "make build"
  },
  "linters": ["eslint", "markdownlint", "golangci-lint"],
  "testRunner": "jest",
  "timeout": 120000,
  "plugins": {
    "enabled": ["git-spice"],
    "git-spice": {
      "defaultBranch": "main",
      "autoRestack": false
    }
  },
  "cache": {
    "enabled": true,
    "maxSize": 500,
    "ttl": {
      "project-detection": 300000,
      "go-project-info": 7200000
    }
  }
}
```

### Server Configuration

**Environment Variables:**

- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)
- `NODE_ENV` - Environment (development, production)
- `MCP_SERVER_TIMEOUT` - Global timeout override

## Dependency Graph

```text
Core Utilities (No Dependencies)
├── Logger (winston)
├── ShellExecutor
└── CacheManager
    └── ChecksumTracker

Tool Classes (Depend on Utilities)
├── GoTools → ShellExecutor, CacheManager
├── GitTools → ShellExecutor
├── MakeTools → ShellExecutor
├── LintTools → ShellExecutor
├── TestTools → ShellExecutor
├── SmartSuggestionsTools → ShellExecutor, FailureAnalyzer, SuggestionEngine
└── OnboardingTools → ProjectDetector, ShellExecutor

Plugin System
├── PluginManager → ShellExecutor, Logger
└── Plugins (git-spice, etc.) → ShellExecutor via PluginContext

Server (Depends on Everything)
└── index.ts → All Tool Classes + PluginManager + Utilities
```

## Extensibility Points

### 1. Adding New Tools

```typescript
// In src/tools/your-tools.ts
export class YourTools {
  constructor(private shellExecutor: ShellExecutor) {}

  async yourTool(args: YourToolArgs): Promise<YourToolResult> {
    // Implementation
  }
}

// In src/index.ts
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'your_tool',
      description: 'Your tool description',
      inputSchema: zodToJsonSchema(YourToolArgsSchema),
    },
  ],
}));
```

### 2. Creating Plugins

See [Plugin Development Guide](./plugin-development.md)

### 3. Custom Failure Patterns

```typescript
// Add to src/utils/knowledge-base.ts
export const CUSTOM_PATTERNS: FailurePattern[] = [
  {
    id: 'your-pattern',
    pattern: /your regex/,
    category: 'build',
    // ... more
  },
];
```

### 4. Custom Caching Namespaces

```typescript
// Register new namespace with TTL
CacheManager.getInstance().set(
  'your-namespace',
  'key',
  value,
  { ttl: 300000 } // 5 minutes
);
```

## Related Documentation

- [Plugin Development](./plugin-development.md) - Creating custom plugins
- [Security Policy](https://github.com/rshade/mcp-devtools-server/blob/main/SECURITY.md) - Security practices and reporting
- [API Reference](./api/mcp-protocol.md) - MCP protocol details
- [Tool Schemas](./api/tool-schemas.md) - Input/output schemas

## Diagrams

### Plugin Lifecycle

```text
┌─────────────────────────────────────────────────────────────┐
│                    Plugin Lifecycle                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Discovery                                                  │
│  ┌─────────────────────────────────────────────┐           │
│  │ Scan: src/plugins/, ~/.mcp-devtools/plugins/│           │
│  │ Find: *-plugin.ts files                     │           │
│  └──────────────┬──────────────────────────────┘           │
│                 │                                            │
│  Validation     ▼                                           │
│  ┌─────────────────────────────────────────────┐           │
│  │ Check required commands exist               │           │
│  │ Validate metadata                           │           │
│  └──────────────┬──────────────────────────────┘           │
│                 │                                            │
│  Initialization ▼                                           │
│  ┌─────────────────────────────────────────────┐           │
│  │ Call plugin.initialize(context)             │           │
│  │ Provide: ShellExecutor, Logger, Config      │           │
│  └──────────────┬──────────────────────────────┘           │
│                 │                                            │
│  Registration   ▼                                           │
│  ┌─────────────────────────────────────────────┐           │
│  │ Call plugin.registerTools()                 │           │
│  │ Namespace tools: {plugin}_{tool}            │           │
│  │ Register with MCP server                    │           │
│  └──────────────┬──────────────────────────────┘           │
│                 │                                            │
│  Execution      ▼                                           │
│  ┌─────────────────────────────────────────────┐           │
│  │ On tool call: plugin.handleToolCall()       │           │
│  │ Execute through ShellExecutor               │           │
│  │ Return structured result                    │           │
│  └──────────────┬──────────────────────────────┘           │
│                 │                                            │
│  Shutdown       ▼                                           │
│  ┌─────────────────────────────────────────────┐           │
│  │ Call plugin.shutdown() (if exists)          │           │
│  │ Cleanup resources                           │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Security Layers

```text
┌──────────────────────────────────────────────────────────┐
│                   Security Layers                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Layer 1: Command Allowlist                             │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Only whitelisted commands: make, go, git, npm...   │ │
│  │ REJECT: curl, wget, python, bash, sh, eval, exec  │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↓ PASS                            │
│  Layer 2: Argument Sanitization                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Block: ; && || | > < ` $( ../ ~/ /etc/ /var/      │ │
│  │ Prevent command injection and path traversal       │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↓ PASS                            │
│  Layer 3: Working Directory Validation                  │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Restrict to project boundaries                     │ │
│  │ No access outside project root                     │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↓ PASS                            │
│  Layer 4: Timeout Protection                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Maximum execution: 2 minutes (default)             │ │
│  │ Prevents runaway processes                         │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↓ PASS                            │
│  Layer 5: Output Sanitization                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Filter secrets from error messages                 │ │
│  │ Sanitize paths in logs                             │ │
│  └────────────────────────────────────────────────────┘ │
│                        ↓                                 │
│              SAFE EXECUTION                             │
│                                                          │
└──────────────────────────────────────────────────────────┘
```
