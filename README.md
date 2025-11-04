# MCP DevTools Server

An MCP (Model Context Protocol) server that standardizes and binds specific patterns for development
tools, enabling Claude Code to generate code more efficiently with fewer errors and better
autocorrection capabilities.

## 🚧 Project Status

**Alpha** - This project is in early development and actively evolving.

**🎯 Current Priority: Enhanced Go Language Support** - Go development toolchain integration is the
highest priority feature. We're building comprehensive support for Go testing, building, linting,
and formatting to make this the best DevTools server for Go development.

## Overview

This MCP server creates a standardized interface between development tools and AI assistants like
Claude Code. By establishing consistent patterns and best practices, it helps:

- Reduce code generation errors
- Enable better autocorrection of common issues
- Standardize development workflows
- Improve efficiency when working with Claude Code

## Features

### Core Tools

#### Make-based Commands

- **make_lint** - Run `make lint` with optional directory and target specification
- **make_test** - Run `make test` with optional test patterns/targets
- **make_depend** - Run `make depend` or equivalent dependency installation
- **make_build** - Run `make build` or `make all`
- **make_clean** - Run `make clean`

#### Go Language Support 🚀 **PRIORITY**

**Core Tools:**

- **go_test** - Run Go tests with coverage and race detection
- **go_build** - Build Go packages with cross-compilation, custom ldflags, and build tags
- **go_fmt** - Format Go code using gofmt
- **go_lint** - Lint Go code using golangci-lint with comprehensive configuration
- **go_vet** - Examine Go source code for suspicious constructs
- **go_mod_tidy** - Tidy Go module dependencies
- **go_mod_download** - Download Go module dependencies

**Advanced Features:**

- **go_benchmark** - Run Go benchmarks with memory profiling and CPU scaling
- **go_generate** - Execute code generation directives
- **go_work** - Manage Go workspaces (go.work files)
- **go_vulncheck** - Scan for known vulnerabilities using govulncheck
- **staticcheck** - Enhanced static analysis
- **go_project_info** - Comprehensive Go project analysis and detection

#### General Linting

- **markdownlint** - Run markdownlint on markdown files
- **yamllint** - Run yamllint on YAML files
- **eslint** - Run ESLint on JavaScript/TypeScript files
- **lint_all** - Run all available linters based on project type

#### Testing & Status

- **run_tests** - Run tests using the detected test framework
- **project_status** - Get overall project health (lint + test summary)
- **test_status** - Get project test status and recommendations

#### GitHub Actions Validation

- **actionlint** - Validate GitHub Actions workflow files for syntax errors and best practices

  A comprehensive linter for GitHub Actions workflow files that helps catch errors before pushing
  to GitHub. Validates workflow syntax, action parameters, expression syntax, and shell scripts
  within run blocks.

  **Features:**

  - Validates GitHub Actions workflow YAML syntax
  - Checks action parameters against official action schemas
  - Validates GitHub Actions expressions (`${{ }}` syntax)
  - Integrates with shellcheck for validating shell scripts in `run:` blocks
  - Supports pyflakes for Python script validation
  - Multiple output formats: default (human-readable), JSON, and SARIF
  - Configurable ignore patterns for specific rules
  - Detects common workflow issues (missing jobs, invalid triggers, etc.)

  **Parameters:**

  - `directory` - Working directory containing workflows (default: project root)
  - `files` - Specific workflow files or glob patterns (default: `.github/workflows/*.{yml,yaml}`)
  - `format` - Output format: `default`, `json`, or `sarif`
  - `shellcheck` - Enable shellcheck integration (default: true)
  - `pyflakes` - Enable pyflakes for Python (default: false)
  - `verbose` - Enable verbose output
  - `ignore` - Array of rule patterns to ignore
  - `timeout` - Command timeout in milliseconds (default: 60000)

  **Common Use Cases:**

  - Pre-commit validation of workflow changes
  - CI/CD integration to catch workflow errors
  - Debugging workflow failures due to syntax issues
  - Ensuring workflows follow GitHub Actions best practices

  **Example Output:**

  ```text
  .github/workflows/ci.yml:25:15: property "timeout" not defined in action 'actions/checkout@v4' [action]
  .github/workflows/ci.yml:42:9: shellcheck reported issue SC2086: Double quote to prevent globbing [shellcheck]
  ```

#### Git and Code Review

- **code_review** - Automated code review analysis on Git changes

  Analyzes Git diffs to identify potential issues in code changes including security vulnerabilities,
  performance concerns, and maintainability problems. Provides severity-based categorization and
  actionable feedback.

  **Features:**

  - Security analysis (hardcoded secrets, dangerous code execution)
  - Performance analysis (nested loops, inefficient patterns)
  - Maintainability analysis (code complexity, TODO comments, line length)
  - Configurable focus areas
  - File filtering (include/exclude test files)

- **generate_pr_message** - Generate PR messages from Git changes

  Automatically generates conventional commit-formatted PR messages by analyzing commit history
  and changed files. Supports GitHub PR templates for consistent documentation.

  **Features:**

  - Analyzes commit history to determine type (feat, fix, etc.)
  - Extracts scope from commit patterns
  - Lists all changes with file statistics
  - Supports conventional commit format
  - Includes issue reference support
  - Breaking changes section
  - **GitHub PR template integration** - Automatically detects and uses templates from:
    - `.github/pull_request_template.md`
    - `.github/PULL_REQUEST_TEMPLATE.md`
    - `.github/PULL_REQUEST_TEMPLATE/pull_request_template.md`
    - `docs/pull_request_template.md`
    - `PULL_REQUEST_TEMPLATE.md`

#### AI-Powered Smart Suggestions

- **analyze_command** - Execute a command and analyze results with AI-powered smart suggestions

  Executes a command and provides intelligent, context-aware recommendations based on the execution
  result. Helps identify issues, suggests fixes, and provides workflow optimization tips.

  **Features:**

  - Automatic failure pattern recognition (15+ built-in patterns)
  - Context-aware suggestions based on project type and language
  - Security vulnerability detection (hardcoded secrets, SQL injection, etc.)
  - Performance issue identification
  - Workflow optimization recommendations
  - Confidence scoring for suggestions
  - Affected file extraction from error messages

  **Parameters:**

  - `command` - Command to execute and analyze (required)
  - `directory` - Working directory for the command
  - `timeout` - Command timeout in milliseconds
  - `args` - Additional command arguments
  - `context` - Optional context for better suggestions:
    - `tool` - Tool being used (e.g., "go test", "npm run")
    - `language` - Programming language
    - `projectType` - Project type

  **Example:**

  ```typescript
  {
    "command": "go test",
    "directory": "./src",
    "context": {
      "tool": "go test",
      "language": "Go"
    }
  }
  ```

- **analyze_result** - Analyze already-executed command results

  Post-mortem analysis of command execution results. Useful for analyzing failures from external
  tools or historical command runs.

  **Parameters:**

  - `command` - Command that was executed (required)
  - `exitCode` - Exit code from execution (required)
  - `stdout` - Standard output from command
  - `stderr` - Standard error from command
  - `duration` - Execution duration in milliseconds
  - `context` - Optional context (same as analyze_command)

- **get_knowledge_base_stats** - Get statistics about the smart suggestions knowledge base

  Returns information about available failure patterns and their categorization.

  **Parameters:**

  - `category` - Optional filter by category (security, performance, dependencies, etc.)

  **Knowledge Base Categories:**

  - **Security** - Hardcoded secrets, SQL injection, unsafe code patterns
  - **Performance** - Nested loops, inefficient algorithms, memory issues
  - **Dependencies** - Missing packages, version conflicts, module issues
  - **Build** - Compilation errors, type mismatches, undefined references
  - **Test** - Test failures, timeouts, race conditions
  - **Lint** - Code style issues, formatting problems
  - **Configuration** - Missing environment variables, config errors
  - **General** - Runtime errors and other issues

  **Supported Languages & Tools:**

  - **Go** - Test failures, missing dependencies, race conditions, lint issues, build errors
  - **JavaScript/TypeScript** - Module not found, type errors, ESLint issues
  - **Python** - Import errors, syntax issues
  - **Cross-language** - Security patterns, performance anti-patterns, configuration issues

#### File Validation

- **ensure_newline** - Validate and fix POSIX newline compliance

  Ensures text files end with a proper newline character, as required by POSIX standards. This
  addresses a common pain point where AI coding assistants frequently create or modify files
  without proper trailing newlines, causing linting failures and git diff noise.

  **Modes:**

  - `check` - Report files without trailing newlines (read-only, non-destructive)
  - `fix` - Automatically add missing newlines to files (safe, preserves line ending style)
  - `validate` - Exit with error if non-compliant files found (CI/CD mode)

  **Key Features:**

  - Pure Node.js implementation using Buffer operations (no shell commands like `tail` or `od`)
  - Cross-platform compatibility (Windows, macOS, Linux)
  - Smart line ending detection - automatically detects and preserves LF vs CRLF style
  - Binary file detection and automatic skipping
  - Configurable file size limits for safety
  - Flexible glob pattern support for file selection
  - Exclusion patterns for node_modules, build artifacts, etc.

  **Why This Matters:**

  - **POSIX Compliance:** Text files should end with a newline character per POSIX definition
  - **Linting:** Many linters (ESLint, markdownlint, golangci-lint) enforce trailing newlines
  - **Git Diffs:** Missing newlines create "No newline at end of file" warnings
  - **AI Assistants:** Common issue when AI tools generate or modify files

### Security Features

- Input sanitization to prevent command injection
- Allowlist of permitted commands and arguments
- Working directory validation (must be within project boundaries)
- Timeout protection for long-running commands

### Project Detection

- Auto-detect project type (Node.js, Python, Go, Rust, Java, .NET)
- Locate Makefiles and configuration files
- Suggest relevant tools based on project structure
- Extract available make targets

## Getting Started

### Prerequisites

- Node.js 18+
- TypeScript
- **Go 1.19+** (for Go language support - **PRIORITY**)
- Make (for make-based commands)
- Go tools: `golangci-lint`, `staticcheck` (for enhanced Go support)
- Project-specific tools (eslint, markdownlint, yamllint, etc.)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/rshade/mcp-devtools-server.git
cd mcp-devtools-server
```

1. Install dependencies:

```bash
npm install
```

1. Build the project:

```bash
npm run build
```

1. Start the server:

```bash
npm start
```

### Development

```bash
# Run in development mode
npm run dev

# Run linting
npm run lint

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## Configuration

### Claude Desktop Integration

1. **Build the project first:**

   ```bash
   npm run build
   ```

2. **Add to your Claude Desktop configuration file** (`~/.claude/claude_desktop_config.json`):

   ```json
   {
     "mcpServers": {
       "mcp-devtools-server": {
         "command": "node",
         "args": ["/absolute/path/to/mcp-devtools-server/dist/index.js"],
         "env": {
           "LOG_LEVEL": "info"
         }
       },
       "context7": {
         "command": "npx",
         "args": ["-y", "@upstash/context7-mcp"]
       }
     }
   }
   ```

   **Replace `/absolute/path/to/mcp-devtools-server` with your actual project path.**

3. **Example configuration files:**
   - See `examples/claude-desktop-config.json` for a complete example
   - The `.mcp.json` file in the project root is a template you can copy

4. **Restart Claude Desktop** after updating the configuration.

### Project-Specific Configuration

Create a `.mcp-devtools.json` file in your project root:

```json
{
  "commands": {
    "lint": "make lint",
    "test": "make test",
    "build": "make build",
    "clean": "make clean"
  },
  "linters": ["eslint", "markdownlint", "yamllint"],
  "testRunner": "jest",
  "timeout": 300000
}
```

## Usage Examples

### Basic Commands

```javascript
// Run make lint
await callTool('make_lint', {});

// Run make test with specific target
await callTool('make_test', { target: 'unit-tests' });

// Run all linters
await callTool('lint_all', { fix: true });

// Get project status
await callTool('project_status', {});
```

### Go Language Usage 🚀 **PRIORITY**

```javascript
// Run Go tests with coverage and race detection
await callTool('go_test', { 
  coverage: true, 
  race: true, 
  verbose: true 
});

// Build Go application with specific tags
await callTool('go_build', { 
  tags: ["integration", "postgres"],
  verbose: true 
});

// Format Go code
await callTool('go_fmt', { 
  write: true, 
  simplify: true 
});

// Lint Go code with custom config
await callTool('go_lint', { 
  config: ".golangci.yml",
  fix: true 
});

// Vet Go code for issues
await callTool('go_vet', { package: "./..." });

// Tidy Go modules
await callTool('go_mod_tidy', { verbose: true });

// Run benchmarks with memory profiling
await callTool('go_benchmark', {
  benchmem: true,
  benchtime: '10s',
  cpu: [1, 2, 4]
});

// Execute code generation
await callTool('go_generate', {
  run: 'mockgen',
  verbose: true
});

// Cross-compile for different platforms
await callTool('go_build', {
  goos: 'linux',
  goarch: 'arm64',
  ldflags: '-X main.version=1.0.0',
  output: './bin/app-linux-arm64'
});

// Manage Go workspaces
await callTool('go_work', {
  command: 'use',
  modules: ['./moduleA', './moduleB']
});

// Scan for vulnerabilities
await callTool('go_vulncheck', {
  mode: 'source',
  json: true
});
```

### File Validation Usage

```javascript
// Check all TypeScript and JavaScript files for missing newlines
await callTool('ensure_newline', {
  patterns: ['src/**/*.ts', 'src/**/*.js'],
  mode: 'check',
  exclude: ['node_modules/**', 'dist/**']
});

// Fix all markdown files (automatically adds trailing newlines)
await callTool('ensure_newline', {
  patterns: ['**/*.md'],
  mode: 'fix',
  exclude: ['node_modules/**']
});

// Validate in CI/CD pipeline (exits with error if non-compliant)
await callTool('ensure_newline', {
  patterns: ['**/*'],
  mode: 'validate',
  exclude: ['node_modules/**', '.git/**', 'dist/**', '*.min.js'],
  maxFileSizeMB: 5
});

// Check specific file types only
await callTool('ensure_newline', {
  patterns: ['**/*'],
  fileTypes: ['*.ts', '*.go', '*.md', '*.json'],
  mode: 'check'
});

// Fix files after AI code generation
await callTool('ensure_newline', {
  patterns: ['src/**/*.ts', 'test/**/*.ts'],
  mode: 'fix',
  skipBinary: true  // default: true
});
```

### Advanced Usage

```javascript
// Run tests with coverage
await callTool('run_tests', { 
  coverage: true, 
  pattern: "*.test.js" 
});

// Lint specific files
await callTool('markdownlint', { 
  files: ["README.md", "docs/*.md"],
  fix: true 
});

// Build with parallel jobs
await callTool('make_build', { parallel: 4 });
```

### CI/CD Integration

#### GitHub Actions Example

Add EOL validation to your GitHub Actions workflow:

```yaml
name: Lint
on: [push, pull_request]

jobs:
  validate-eol:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install MCP DevTools Server
        run: |
          git clone https://github.com/rshade/mcp-devtools-server.git
          cd mcp-devtools-server
          npm install
          npm run build

      - name: Validate EOL compliance
        run: |
          # Use the ensure_newline tool in validate mode
          # This will exit with error if any files lack trailing newlines
          node mcp-devtools-server/dist/index.js ensure_newline \
            --patterns "**/*.ts" "**/*.js" "**/*.md" \
            --mode validate \
            --exclude "node_modules/**" "dist/**"
```

#### Pre-commit Hook

Add to your `.git/hooks/pre-commit` or use with [Husky](https://typicode.github.io/husky/):

```bash
#!/bin/bash
# Automatically fix missing newlines before commit

npx mcp-devtools-server ensure_newline \
  --patterns "**/*.ts" "**/*.js" "**/*.go" "**/*.md" \
  --mode fix \
  --exclude "node_modules/**" "vendor/**" "dist/**"

# Stage any files that were fixed
git add -u
```

## Architecture

### Core Components

- **Shell Executor** - Secure command execution with validation
- **Project Detector** - Auto-detection of project type and configuration
- **Tool Classes** - Specialized handlers for make, lint, and test operations
- **MCP Server** - Main server implementation with tool registration

### Security Model

- Commands are validated against an allowlist
- Arguments are sanitized to prevent injection attacks
- Working directories are restricted to project boundaries
- All operations have configurable timeouts

### Tool Schema

Each tool uses JSON Schema for input validation:

```typescript
{
  directory?: string;    // Working directory
  args?: string[];      // Additional arguments
  // Tool-specific options...
}
```

## Error Handling

The server provides comprehensive error handling with:

- Structured error responses
- Helpful suggestions for common failures
- Exit code interpretation
- Tool availability checking

## Contributing

Contributions are welcome! This project is built on continuous learning and improvement.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

### Areas for Contribution

- Better development patterns
- Error prevention strategies
- Workflow optimizations
- Tool integrations
- Documentation improvements

## Troubleshooting

### Common Issues

1. **Command not found errors**
   - Ensure required tools are installed
   - Check PATH environment variable
   - Verify tool permissions

2. **Permission denied**
   - Check file permissions in project directory
   - Ensure write permissions for build outputs

3. **Timeout errors**
   - Increase timeout values in configuration
   - Optimize slow operations
   - Check system resources

4. **EOL/Newline validation issues**
   - Files created by AI often miss trailing newlines
   - Use `ensure_newline` with `mode: 'fix'` to automatically correct
   - Binary files are automatically skipped - check file encoding if issues persist
   - CRLF vs LF is automatically detected and preserved
   - Use `validate` mode in CI/CD to catch issues before commit

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

This project represents an ongoing effort to improve the developer experience when working with
AI-powered coding assistants. All feedback and contributions help shape better development
practices for the community.

## Roadmap

Our development is organized into quarterly milestones with clear priorities:

### 2025-Q1 - Go Support & Core Foundation 🎯 **CURRENT FOCUS**

#### Priority: HIGHEST (P0)

- [x] Enhanced Go language support (go_test, go_build, go_fmt, go_lint, go_vet, go_mod_tidy)
- [x] POSIX newline compliance validation (ensure_newline tool)
- [ ] Complete Go toolchain integration
- [ ] golangci-lint and staticcheck integration
- [ ] Go project analysis and recommendations
- [ ] Go-specific configuration options

### 2025-Q2 - Plugin Architecture & Performance

#### Priority: HIGH (P1)

- [ ] Extensible plugin architecture framework
- [ ] Intelligent caching system (10x performance improvement)
- [ ] Advanced telemetry and observability
- [ ] Resource management and concurrency control
- [ ] Event-driven architecture

### 2025-Q3 - User Experience & AI Integration

#### Priority: HIGH (P1)

- [ ] Zero-configuration onboarding wizard
- [ ] AI-powered smart suggestions and failure analysis
- [ ] Workflow templates and patterns
- [ ] Enhanced project discovery and analysis
- [ ] Integration ecosystem (VS Code, GitHub Actions)

### 2025-Q4 - Team Collaboration & Enterprise

#### Priority: MEDIUM (P2)

- [ ] Team workspace management
- [ ] Shared configuration and standards enforcement
- [ ] Enterprise features (SSO, RBAC, audit logging)
- [ ] Advanced monitoring and compliance reporting
- [ ] Multi-tenant support

### Long-term Vision

- [ ] Predictive analytics and failure prediction
- [ ] Auto-remediation and self-healing workflows
- [ ] Natural language interface ("Run the deployment checklist")
- [ ] Cross-project learning and global best practices

See our [GitHub Issues](https://github.com/rshade/mcp-devtools-server/issues) and
[Milestones](https://github.com/rshade/mcp-devtools-server/milestones) for detailed tracking and
progress updates.
