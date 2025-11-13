# Configuration

Customize MCP DevTools Server for your project with `.mcp-devtools.json`.

## Configuration File Location

Create `.mcp-devtools.json` in your project root directory:

```bash
# Example project structure
my-project/
├── .mcp-devtools.json      # Configuration file
├── .mcp-devtools.schema.json  # Schema reference (optional)
├── package.json            # For Node.js projects
├── go.mod                  # For Go projects
├── pyproject.toml          # For Python projects
└── Makefile                # For Make-based projects
```

## Quick Start

### Minimal Configuration

MCP DevTools Server works with zero configuration through automatic project detection:

```json
{}
```

The server automatically detects:

- Project type (Node.js, Go, Python, Rust, etc.)
- Build system (npm, yarn, pnpm, make, go, cargo, etc.)
- Available linters (ESLint, markdownlint, golangci-lint, etc.)
- Test frameworks (Jest, Vitest, pytest, Go test, etc.)

### Basic Configuration

Override auto-detection with explicit settings:

```json
{
  "projectType": "nodejs",
  "buildSystem": "npm",
  "testRunner": "jest",
  "linters": ["eslint", "markdownlint"]
}
```

## Complete Configuration Reference

### Schema Validation

Add JSON Schema support for IDE autocomplete and validation:

```json
{
  "$schema": "https://raw.githubusercontent.com/rshade/mcp-devtools-server/main/.mcp-devtools.schema.json"
}
```

Or use a local schema:

```json
{
  "$schema": "./.mcp-devtools.schema.json"
}
```

### Project Detection

Control how the server identifies your project:

```json
{
  "projectType": "nodejs",
  "buildSystem": "npm",
  "timeout": 300000
}
```

**Options:**

- `projectType`: `"nodejs"` | `"python"` | `"go"` | `"rust"` | `"java"` | `"dotnet"` | `"mixed"`
- `buildSystem`: `"make"` | `"npm"` | `"yarn"` | `"pnpm"` | `"pip"` | `"poetry"` | `"go"` | `"cargo"` | `"maven"` | `"gradle"` | `"dotnet"`
- `timeout`: Command timeout in milliseconds (1000-600000, default: 300000)

### Custom Commands

Define project-specific commands:

```json
{
  "commands": {
    "lint": "npm run lint",
    "test": "npm test",
    "build": "npm run build",
    "clean": "npm run clean",
    "depend": "npm install",
    "format": "npm run format",
    "typecheck": "npm run type-check"
  }
}
```

**Standard Commands:**

- `lint` - Run linting tools
- `test` - Execute test suite
- `build` - Compile/build project
- `clean` - Remove build artifacts
- `depend` - Install dependencies
- Custom commands supported (e.g., `format`, `typecheck`, `deploy`)

### Lint Tools Configuration

Configure linters and code quality tools:

```json
{
  "linters": ["eslint", "markdownlint", "yamllint"]
}
```

**Supported Linters:**

- **JavaScript/TypeScript**: `eslint`
- **Markdown**: `markdownlint`
- **YAML**: `yamllint`
- **Python**: `flake8`, `black`
- **Go**: `golangci-lint`, `gofmt`, `staticcheck`
- **Rust**: `clippy`, `rustfmt`
- **Git Commits**: `commitlint`

### Test Tools Configuration

Configure test runners and coverage:

```json
{
  "testRunner": "jest",
  "parallel": {
    "enableTestParallel": true
  }
}
```

**Supported Test Runners:**

- `jest` - JavaScript/TypeScript (Node.js)
- `vitest` - JavaScript/TypeScript (Vite-based)
- `pytest` - Python
- `go` - Go test
- `cargo` - Rust test
- `npm` - npm test script
- `make` - Make test target

### Go Tools Configuration

Go-specific settings for builds, tests, and modules:

```json
{
  "golang": {
    "goPath": "/custom/gopath",
    "goModule": true,
    "testFlags": ["-v", "-race", "-coverprofile=coverage.out"],
    "lintConfig": ".golangci.yml"
  },
  "environment": {
    "GO111MODULE": "on",
    "CGO_ENABLED": "1",
    "GOFLAGS": "-buildvcs=false"
  }
}
```

**Go Configuration Options:**

- `goPath`: Custom GOPATH (overrides system default)
- `goModule`: Enable Go modules (default: auto-detected)
- `testFlags`: Default flags for `go test` commands
- `lintConfig`: Path to golangci-lint configuration file

**Common Go Test Flags:**

- `-v` - Verbose output
- `-race` - Enable race detector
- `-coverprofile=FILE` - Write coverage profile
- `-short` - Run shorter tests
- `-timeout=DURATION` - Test timeout (e.g., `30m`)
- `-parallel=N` - Number of parallel tests

### Node.js Tools Configuration

Node.js/TypeScript project settings:

```json
{
  "projectType": "nodejs",
  "buildSystem": "npm",
  "testRunner": "jest",
  "linters": ["eslint"],
  "environment": {
    "NODE_ENV": "development",
    "NODE_OPTIONS": "--max-old-space-size=4096"
  }
}
```

**Package Manager Detection:**

The server auto-detects package managers from lockfiles:

- `bun.lockb` → Bun (highest priority)
- `pnpm-lock.yaml` → pnpm
- `yarn.lock` → Yarn
- `package-lock.json` → npm (fallback)

**Framework Detection:**

Auto-detects meta-frameworks and UI frameworks:

- **Meta-frameworks**: Next.js, Nuxt.js
- **UI frameworks**: React, Vue, Angular, Svelte
- **Backend frameworks**: NestJS, Express, Fastify

### Make Tools Configuration

Configure Make target discovery and execution:

```json
{
  "makeTargets": ["all", "test", "build", "clean", "lint"],
  "parallel": {
    "makeJobs": 4
  },
  "commands": {
    "lint": "make lint",
    "test": "make test",
    "build": "make build"
  }
}
```

**Make Options:**

- `makeTargets`: Override automatic target detection
- `makeJobs`: Number of parallel jobs (`make -j N`)

### Git Tools Configuration

Configure code review and PR generation:

```json
{
  "commands": {
    "review": "git diff HEAD",
    "pr": "gh pr create"
  }
}
```

**Git Tools Available:**

- `code_review` - Analyze Git changes for security, performance, maintainability
- `generate_pr_message` - Create PR descriptions with conventional commit format

### Smart Suggestions Configuration

AI-powered failure analysis and recommendations:

```json
{
  "environment": {
    "ENABLE_SMART_SUGGESTIONS": "true"
  }
}
```

**Smart Suggestions Features:**

- **Failure Pattern Recognition**: 15+ built-in patterns
- **Context-Aware Recommendations**: Based on project type
- **Security Vulnerability Detection**: SAST, dependency auditing
- **Performance Analysis**: Build times, test execution
- **MCP Server Recommendations**: Sequential Thinking, Context7, Playwright

### File Validation Configuration

POSIX newline compliance and file validation:

```json
{
  "fileValidation": {
    "newline": {
      "enabled": true,
      "autoFix": false,
      "exclude": [
        "node_modules/**",
        "dist/**",
        "*.min.js",
        "*.min.css"
      ],
      "fileTypes": [
        "*.ts",
        "*.js",
        "*.go",
        "*.md",
        "*.json",
        "*.yaml"
      ]
    }
  }
}
```

**Newline Validation Options:**

- `enabled`: Enable newline checking (default: true)
- `autoFix`: Automatically fix missing newlines (default: false)
- `exclude`: Glob patterns to exclude
- `fileTypes`: File extensions to check

### Caching Configuration

Intelligent in-process caching for performance:

```json
{
  "cache": {
    "enabled": true,
    "maxMemoryMB": 100,
    "ttl": {
      "projectDetection": 60000,
      "gitOperations": 30000,
      "goModules": 300000,
      "fileLists": 30000,
      "commandAvailability": 3600000,
      "testResults": 60000
    },
    "maxItems": {
      "projectDetection": 50,
      "gitOperations": 100,
      "goModules": 50,
      "fileLists": 200,
      "commandAvailability": 50,
      "testResults": 100
    },
    "checksumTracking": {
      "enabled": true,
      "watchIntervalMs": 5000,
      "algorithm": "sha256"
    }
  }
}
```

**Cache Configuration Options:**

- `enabled`: Enable caching system (default: true)
- `maxMemoryMB`: Maximum cache memory (10-1000 MB, default: 100)
- `ttl`: Time-to-live per namespace in milliseconds
- `maxItems`: Max entries per namespace (LRU eviction)
- `checksumTracking`: File-based cache invalidation

**Cache Namespaces:**

- `projectDetection`: Project metadata (1 min TTL)
- `gitOperations`: Git diff, log, status (30 sec TTL)
- `goModules`: Go module info (5 min TTL)
- `fileLists`: File scanning results (30 sec TTL)
- `commandAvailability`: Tool detection (1 hour TTL)
- `testResults`: Test execution results (1 min TTL)

**Performance Impact:**

| Operation | Without Cache | With Cache | Speedup |
|-----------|---------------|------------|---------|
| Project Detection | 50-200ms | <1ms | 5-10x |
| Git Operations | 100-800ms | <5ms | 20-160x |
| Go Module Info | 500-1000ms | <5ms | 100-200x |
| File Scanning | 50-500ms | <5ms | 10-100x |

See [CACHING.md](https://github.com/rshade/mcp-devtools-server/blob/main/CACHING.md) for implementation details.

### Plugin System Configuration

Enable and configure plugins:

```json
{
  "plugins": {
    "enabled": ["git-spice"],
    "disabled": [],
    "git-spice": {
      "defaultBranch": "main",
      "autoRestack": false,
      "jsonOutput": true,
      "timeout": 60000
    }
  }
}
```

**Plugin Options:**

- `enabled`: Plugins to enable (empty = all non-disabled plugins)
- `disabled`: Plugins to explicitly disable
- Plugin-specific config sections (e.g., `git-spice`)

**Available Plugins:**

- `git-spice`: Stacked Git workflow management

### Parallel Execution Configuration

Control parallel job execution:

```json
{
  "parallel": {
    "makeJobs": 4,
    "enableTestParallel": true
  }
}
```

**Parallel Options:**

- `makeJobs`: Number of parallel Make jobs (1-16, default: 1)
- `enableTestParallel`: Enable parallel test execution when supported

### Security Configuration

Security policies and command restrictions:

```json
{
  "security": {
    "allowedCommands": ["custom-tool", "special-linter"],
    "restrictedPaths": ["/", "/etc", "/usr", "/bin", "/sbin"]
  }
}
```

**Security Options:**

- `allowedCommands`: Additional commands beyond default allowlist
- `restrictedPaths`: Paths that are off-limits for execution

**Default Allowed Commands:**

- **Build tools**: `npm`, `yarn`, `pnpm`, `go`, `cargo`, `make`
- **Linters**: `eslint`, `markdownlint`, `golangci-lint`, `flake8`
- **Test tools**: `jest`, `vitest`, `pytest`, `go test`
- **Git**: `git` (limited subcommands)
- **File operations**: `cat`, `ls`, `find`, `grep`

::: warning Security Best Practices
Never add untrusted commands to `allowedCommands`. All commands are validated and sanitized, but limiting the allowlist reduces attack surface.
:::

### Environment Variables

Set environment variables for all commands:

```json
{
  "environment": {
    "NODE_ENV": "development",
    "GO111MODULE": "on",
    "PYTHONDONTWRITEBYTECODE": "1",
    "RUST_BACKTRACE": "1"
  }
}
```

**Common Environment Variables:**

**Node.js:**

- `NODE_ENV`: Environment mode (`development`, `production`, `test`)
- `NODE_OPTIONS`: Node.js runtime options
- `CI`: CI/CD mode flag

**Go:**

- `GO111MODULE`: Go modules mode (`on`, `off`, `auto`)
- `CGO_ENABLED`: Enable/disable CGO (`0`, `1`)
- `GOFLAGS`: Additional Go flags
- `GOPROXY`: Go module proxy URL

**Python:**

- `PYTHONDONTWRITEBYTECODE`: Disable .pyc files
- `PYTHONPATH`: Python module search path
- `VIRTUAL_ENV`: Virtualenv location

### Path Exclusions

Exclude paths from file operations:

```json
{
  "excludePaths": [
    "node_modules/**",
    "dist/**",
    "build/**",
    ".git/**",
    "coverage/**",
    "vendor/**",
    "__pycache__/**",
    "*.pyc"
  ]
}
```

**Recommended Exclusions:**

- **Node.js**: `node_modules`, `dist`, `build`, `.next`, `.nuxt`
- **Go**: `vendor`, `bin`, `pkg`
- **Python**: `__pycache__`, `.venv`, `venv`, `*.pyc`, `.pytest_cache`
- **General**: `.git`, `coverage`, `.DS_Store`

## Configuration Examples

### Example 1: Go Project

```json
{
  "$schema": "./.mcp-devtools.schema.json",
  "projectType": "go",
  "buildSystem": "go",
  "testRunner": "go",
  "linters": ["golangci-lint", "gofmt", "staticcheck"],
  "commands": {
    "lint": "golangci-lint run",
    "test": "go test ./...",
    "build": "go build -v ./...",
    "clean": "go clean",
    "depend": "go mod download"
  },
  "golang": {
    "goModule": true,
    "testFlags": ["-v", "-race", "-coverprofile=coverage.out"],
    "lintConfig": ".golangci.yml"
  },
  "environment": {
    "GO111MODULE": "on",
    "CGO_ENABLED": "1"
  },
  "parallel": {
    "makeJobs": 4,
    "enableTestParallel": true
  },
  "excludePaths": ["vendor/**", "bin/**", "dist/**"],
  "cache": {
    "enabled": true,
    "ttl": {
      "goModules": 300000
    }
  }
}
```

### Example 2: Node.js/TypeScript Project

```json
{
  "$schema": "./.mcp-devtools.schema.json",
  "projectType": "nodejs",
  "buildSystem": "npm",
  "testRunner": "jest",
  "linters": ["eslint", "markdownlint"],
  "commands": {
    "lint": "npm run lint",
    "test": "npm test",
    "build": "npm run build",
    "typecheck": "npm run type-check"
  },
  "environment": {
    "NODE_ENV": "development"
  },
  "excludePaths": [
    "node_modules/**",
    "dist/**",
    "coverage/**"
  ],
  "fileValidation": {
    "newline": {
      "enabled": true,
      "fileTypes": ["*.ts", "*.tsx", "*.js", "*.jsx", "*.json"]
    }
  },
  "cache": {
    "enabled": true,
    "maxMemoryMB": 150
  }
}
```

### Example 3: Python Project

```json
{
  "$schema": "./.mcp-devtools.schema.json",
  "projectType": "python",
  "buildSystem": "poetry",
  "testRunner": "pytest",
  "linters": ["flake8", "black"],
  "commands": {
    "lint": "poetry run flake8",
    "test": "poetry run pytest",
    "format": "poetry run black .",
    "typecheck": "poetry run mypy ."
  },
  "environment": {
    "PYTHONDONTWRITEBYTECODE": "1"
  },
  "parallel": {
    "enableTestParallel": true
  },
  "excludePaths": [
    "__pycache__/**",
    "*.pyc",
    ".venv/**",
    "dist/**",
    ".pytest_cache/**"
  ]
}
```

### Example 4: Mixed-Language Monorepo

```json
{
  "$schema": "./.mcp-devtools.schema.json",
  "projectType": "mixed",
  "buildSystem": "make",
  "linters": ["eslint", "golangci-lint", "markdownlint", "yamllint"],
  "commands": {
    "lint": "make lint",
    "test": "make test",
    "build": "make build"
  },
  "makeTargets": ["all", "test", "build", "clean", "lint"],
  "parallel": {
    "makeJobs": 8,
    "enableTestParallel": true
  },
  "excludePaths": [
    "node_modules/**",
    "vendor/**",
    ".venv/**",
    "dist/**"
  ],
  "cache": {
    "enabled": true,
    "maxMemoryMB": 200
  }
}
```

### Example 5: Maximum Security Configuration

```json
{
  "$schema": "./.mcp-devtools.schema.json",
  "projectType": "nodejs",
  "timeout": 120000,
  "security": {
    "allowedCommands": [],
    "restrictedPaths": [
      "/",
      "/etc",
      "/usr",
      "/bin",
      "/sbin",
      "/root",
      "/home"
    ]
  },
  "environment": {},
  "cache": {
    "enabled": false
  },
  "fileValidation": {
    "newline": {
      "enabled": true,
      "autoFix": false
    }
  }
}
```

### Example 6: CI/CD Optimized Configuration

```json
{
  "$schema": "./.mcp-devtools.schema.json",
  "timeout": 600000,
  "parallel": {
    "makeJobs": 8,
    "enableTestParallel": true
  },
  "cache": {
    "enabled": true,
    "maxMemoryMB": 500,
    "ttl": {
      "projectDetection": 3600000,
      "gitOperations": 300000,
      "testResults": 300000
    }
  },
  "environment": {
    "CI": "true",
    "NODE_ENV": "test"
  }
}
```

## Environment Variables

Set environment variables outside configuration:

```bash
# Enable debug logging
export LOG_LEVEL=debug

# Set custom working directory
export MCP_WORKING_DIR=/path/to/project

# Disable caching
export MCP_CACHE_ENABLED=false

# Override command timeout
export MCP_COMMAND_TIMEOUT=600000
```

**Available Environment Variables:**

- `LOG_LEVEL`: Logging level (`debug`, `info`, `warn`, `error`)
- `MCP_WORKING_DIR`: Override working directory
- `MCP_CACHE_ENABLED`: Enable/disable caching
- `MCP_COMMAND_TIMEOUT`: Default command timeout (ms)
- `ENABLE_SMART_SUGGESTIONS`: Enable AI-powered suggestions

## Configuration Validation

### JSON Schema Validation

Use JSON Schema validation in your IDE:

**VS Code (`settings.json`):**

```json
{
  "json.schemas": [
    {
      "fileMatch": [".mcp-devtools.json"],
      "url": "./.mcp-devtools.schema.json"
    }
  ]
}
```

**JetBrains IDEs:**

1. Open Settings → Languages & Frameworks → Schemas and DTDs → JSON Schema Mappings
2. Add schema: `.mcp-devtools.schema.json`
3. Map to file: `.mcp-devtools.json`

### Command-Line Validation

Validate configuration programmatically:

```bash
# Using Node.js
node -e "
const config = require('./.mcp-devtools.json');
const schema = require('./.mcp-devtools.schema.json');
const Ajv = require('ajv');
const ajv = new Ajv();
const valid = ajv.validate(schema, config);
console.log(valid ? 'Valid' : ajv.errorsText());
"

# Using Python
python3 -c "
import json
from jsonschema import validate
config = json.load(open('.mcp-devtools.json'))
schema = json.load(open('.mcp-devtools.schema.json'))
validate(instance=config, schema=schema)
print('Valid configuration')
"
```

### Common Validation Errors

**Error: `projectType` is not valid**

```json
{
  "projectType": "javascript"  // ❌ Invalid
}
```

**Fix:** Use valid project type:

```json
{
  "projectType": "nodejs"  // ✅ Valid
}
```

**Error: `timeout` out of range**

```json
{
  "timeout": 500  // ❌ Too low (min: 1000)
}
```

**Fix:** Use valid timeout:

```json
{
  "timeout": 60000  // ✅ Valid (60 seconds)
}
```

**Error: Duplicate linters**

```json
{
  "linters": ["eslint", "eslint"]  // ❌ Duplicates
}
```

**Fix:** Remove duplicates:

```json
{
  "linters": ["eslint"]  // ✅ Unique items
}
```

## Configuration Inheritance

### Global Configuration

Create a global configuration file:

```bash
# User home directory
~/.config/mcp-devtools/config.json
```

### Project Configuration

Project-specific configuration overrides global:

```
Priority (highest to lowest):
1. .mcp-devtools.json (project root)
2. ~/.config/mcp-devtools/config.json (user home)
3. Default configuration (built-in)
```

### Merging Strategy

Configuration merging follows these rules:

- **Primitives** (strings, numbers, booleans): Override completely
- **Arrays**: Replace entire array (no merging)
- **Objects**: Deep merge (nested properties merged)

**Example:**

**Global config:**

```json
{
  "timeout": 60000,
  "linters": ["markdownlint"],
  "environment": {
    "NODE_ENV": "production"
  }
}
```

**Project config:**

```json
{
  "timeout": 120000,
  "linters": ["eslint"],
  "environment": {
    "DEBUG": "true"
  }
}
```

**Merged result:**

```json
{
  "timeout": 120000,           // Project overrides
  "linters": ["eslint"],       // Project replaces array
  "environment": {              // Objects merge
    "NODE_ENV": "production",  // From global
    "DEBUG": "true"            // From project
  }
}
```

## Team Configuration Best Practices

### 1. Version Control

**Commit configuration to version control:**

```bash
git add .mcp-devtools.json
git commit -m "chore: add MCP DevTools configuration"
```

**Benefits:**

- Team uses consistent settings
- Configuration evolves with project
- Easy onboarding for new developers

### 2. Environment-Specific Configuration

**Use environment variables for secrets:**

```json
{
  "environment": {
    "API_KEY": "${API_KEY}",
    "DATABASE_URL": "${DATABASE_URL}"
  }
}
```

**Keep in `.mcp-devtools.json`:**

- Project structure
- Tool preferences
- Timeout settings

**Keep in environment:**

- Secrets and credentials
- Environment-specific URLs
- Developer-specific paths

### 3. Documentation

**Add comments (use package.json for descriptions):**

```json
{
  "//": "MCP DevTools Server Configuration",
  "projectType": "nodejs",
  "timeout": 300000
}
```

Or create `README.md` section:

```markdown
## MCP DevTools Configuration

Our project uses the following configuration:

- **Linters**: ESLint, markdownlint
- **Test Runner**: Jest with parallel execution
- **Timeout**: 5 minutes for long-running tests
```

### 4. Consistent Formatting

**Use consistent JSON formatting:**

```bash
# Format with 2-space indentation
npx prettier --write .mcp-devtools.json

# Or use JSON formatter
python3 -m json.tool .mcp-devtools.json > temp.json && mv temp.json .mcp-devtools.json
```

### 5. Periodic Reviews

**Review configuration quarterly:**

- Remove unused linters
- Update timeout based on test duration
- Optimize cache settings
- Verify security policies

## Common Configuration Patterns

### Pattern 1: Fast Feedback Loop

Optimize for quick development cycles:

```json
{
  "timeout": 30000,
  "parallel": {
    "makeJobs": 8,
    "enableTestParallel": true
  },
  "cache": {
    "enabled": true,
    "maxMemoryMB": 200
  }
}
```

### Pattern 2: Comprehensive Quality Checks

Enforce strict quality standards:

```json
{
  "linters": [
    "eslint",
    "markdownlint",
    "yamllint",
    "commitlint"
  ],
  "fileValidation": {
    "newline": {
      "enabled": true,
      "autoFix": false
    }
  }
}
```

### Pattern 3: Multi-Language Support

Support polyglot projects:

```json
{
  "projectType": "mixed",
  "linters": [
    "eslint",
    "golangci-lint",
    "flake8",
    "markdownlint"
  ],
  "makeTargets": [
    "lint-js",
    "lint-go",
    "lint-py",
    "test-all"
  ]
}
```

### Pattern 4: Minimal Overhead

Lightweight configuration for resource-constrained environments:

```json
{
  "timeout": 120000,
  "cache": {
    "enabled": true,
    "maxMemoryMB": 50
  },
  "parallel": {
    "makeJobs": 1,
    "enableTestParallel": false
  }
}
```

### Pattern 5: Plugin-Based Workflow

Leverage plugins for specialized workflows:

```json
{
  "plugins": {
    "enabled": ["git-spice"],
    "git-spice": {
      "defaultBranch": "main",
      "autoRestack": true
    }
  }
}
```

## Troubleshooting

### Issue 1: Configuration Not Loaded

**Symptoms:** Server uses default configuration

**Causes:**

- File not in project root
- Invalid JSON syntax
- File permissions issue

**Solutions:**

```bash
# Verify file location
ls -la .mcp-devtools.json

# Validate JSON syntax
npx jsonlint .mcp-devtools.json

# Check permissions
chmod 644 .mcp-devtools.json
```

### Issue 2: Commands Not Found

**Symptoms:** Tools not detected despite configuration

**Causes:**

- Commands not in PATH
- Commands not in allowlist
- Incorrect command names

**Solutions:**

```bash
# Verify command availability
which eslint
which golangci-lint

# Check PATH
echo $PATH

# Add to allowedCommands
{
  "security": {
    "allowedCommands": ["custom-tool"]
  }
}
```

### Issue 3: Cache Not Working

**Symptoms:** Slow performance despite caching enabled

**Causes:**

- Cache disabled in config
- File checksum tracking disabled
- Memory limit too low

**Solutions:**

```json
{
  "cache": {
    "enabled": true,
    "maxMemoryMB": 100,
    "checksumTracking": {
      "enabled": true
    }
  }
}
```

### Issue 4: Timeout Errors

**Symptoms:** Commands fail with timeout errors

**Causes:**

- Timeout too short
- Slow tests/builds
- Network issues

**Solutions:**

```json
{
  "timeout": 600000,  // 10 minutes
  "parallel": {
    "makeJobs": 1  // Reduce parallelism
  }
}
```

### Issue 5: Permission Denied

**Symptoms:** Commands fail with permission errors

**Causes:**

- Restricted paths
- Incorrect working directory
- File permissions

**Solutions:**

```json
{
  "security": {
    "restrictedPaths": ["/", "/etc"]  // Reduce restrictions
  }
}
```

## Next Steps

- **Validate Configuration**: Use JSON Schema validation in your IDE
- **Explore Examples**: Check `examples/` directory for language-specific configurations
- **Enable Caching**: Optimize performance with intelligent caching
- **Review Security**: Ensure security policies match your requirements
- **Monitor Performance**: Use cache statistics to tune configuration

## Related Documentation

- [Installation Guide](/getting-started/installation.html) - Install MCP DevTools Server
- [Tool Reference](/tools/overview) - Available tools and usage
- [Caching Guide](https://github.com/rshade/mcp-devtools-server/blob/main/CACHING.md) - Performance optimization
- [JSON Schema](https://github.com/rshade/mcp-devtools-server/blob/main/.mcp-devtools.schema.json) - Complete schema reference
