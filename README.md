# MCP DevTools Server

[![CI Status](https://github.com/rshade/mcp-devtools-server/actions/workflows/ci.yml/badge.svg)](https://github.com/rshade/mcp-devtools-server/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/rshade/mcp-devtools-server/branch/main/graph/badge.svg)](https://codecov.io/gh/rshade/mcp-devtools-server)
[![npm version](https://img.shields.io/npm/v/mcp-devtools-server.svg)](https://www.npmjs.com/package/mcp-devtools-server)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](package.json)
[![Documentation](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://rshade.github.io/mcp-devtools-server)

An MCP (Model Context Protocol) server that standardizes and binds specific patterns for development
tools, enabling Claude Code to generate code more efficiently with fewer errors and better
autocorrection capabilities.

## 🚧 Project Status

**Alpha** - This project is in early development and actively evolving.

**🎉 Major Milestone: Complete Language Support** - We now have comprehensive support for both
Go (13 tools) and Node.js/TypeScript (14 tools), making this a powerful DevTools server for modern
development workflows. With intelligent caching, AI-powered suggestions, and zero-configuration
onboarding, we're ready for the 0.0.1 release!

## Documentation

- **[📚 Full Documentation](https://rshade.github.io/mcp-devtools-server/)** - Complete guide with examples and tutorials
- **[🚀 Quick Start](https://rshade.github.io/mcp-devtools-server/getting-started/quick-start)** - Get started in 5 minutes
- **[🛠️ Tools Reference](https://rshade.github.io/mcp-devtools-server/tools/overview)** - All 40+ available tools
- **[Contributing Guidelines](CONTRIBUTING.md)** - How to contribute to this project
- **[Code of Conduct](CODE_OF_CONDUCT.md)** - Community standards and expectations
- **[Security Policy](SECURITY.md)** - How to report security vulnerabilities
- **[Caching System](CACHING.md)** - Intelligent caching for 3-5x performance improvements
- **[API Documentation](typedoc/)** - TypeDoc generated API documentation (run `npm run docs:api`)

## Overview

This MCP server creates a standardized interface between development tools and AI assistants like
Claude Code. By establishing consistent patterns and best practices, it helps:

- Reduce code generation errors
- Enable better autocorrection of common issues
- Standardize development workflows
- Improve efficiency when working with Claude Code

## Features

### 🎯 Zero-Configuration Onboarding Wizard

The onboarding wizard automatically detects your project type and generates optimal MCP DevTools configuration with
zero user input required.

**Quick Start:**

```bash
# Run complete onboarding (auto-detects everything)
mcp-devtools onboarding_wizard

# Preview changes without writing files
mcp-devtools onboarding_wizard --dry-run true

# Detect project type only
mcp-devtools detect_project
```

**Available Tools:**

- **onboarding_wizard** - Complete automated setup workflow
  - Detects project type (Node.js, Python, Go, Rust, Java, .NET, Mixed)
  - Identifies framework (React, Express, Django, Gin, etc.)
  - Discovers build system (Make, npm, go, cargo, etc.)
  - Generates `.mcp-devtools.json` configuration
  - Verifies tool availability
  - Creates backup of existing config
  - Provides actionable recommendations

- **detect_project** - Analyze project characteristics
  - Returns comprehensive project profile
  - Lists detected configuration files
  - Identifies linting tools and test frameworks
  - Shows Make targets if available

- **generate_config** - Preview configuration without writing
  - Generates configuration based on detection
  - Validates against schema
  - Shows warnings and errors

- **validate_setup** - Validate existing configuration
  - Checks command availability
  - Verifies tool installation
  - Validates configuration schema
  - Provides health score (0-100)
  - Lists errors, warnings, and recommendations

- **rollback_setup** - Restore previous configuration
  - Rollback from automatic backup
  - Backups stored in `.mcp-devtools-backups/`

**Example Output:**

```text
## Onboarding Wizard Results

**Status:** ✅ Success
**Duration:** 2847ms

**Configuration:** /path/to/project/.mcp-devtools.json
**Backup:** /path/to/project/.mcp-devtools-backups/2025-11-04T10-30-00.json

### ⚠️  Skipped Tools (2)

- eslint
- markdownlint-cli

### 💡 Recommendations

#### High Priority

- **Install missing required tools** (tool)
  Install eslint and markdownlint-cli for complete linting support

### Validation

**Score:** 95/100
**Errors:** 0
**Warnings:** 2
```

**Configuration Options:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `directory` | string | `cwd` | Working directory to analyze |
| `interactive` | boolean | `false` | Enable interactive prompts (planned) |
| `autoInstall` | boolean | `false` | Automatically install missing tools (planned) |
| `generateConfig` | boolean | `true` | Generate .mcp-devtools.json file |
| `validateSetup` | boolean | `true` | Run validation after setup |
| `backupExisting` | boolean | `true` | Backup existing config before overwriting |
| `dryRun` | boolean | `false` | Preview changes without writing files |
| `skipToolVerification` | boolean | `false` | Skip tool installation checks |

**Safety Features:**

- ✅ **Automatic Backups** - Existing configs backed up before changes
- ✅ **Rollback Support** - Restore previous config anytime
- ✅ **Dry-Run Mode** - Preview all changes before applying
- ✅ **Path Validation** - Prevents path traversal attacks
- ✅ **Input Sanitization** - All inputs validated and sanitized
- ✅ **Non-Destructive** - Never deletes files, only creates/updates

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

#### Node.js/TypeScript Tools

##### Phase 1: Core Development Tools

- **nodejs_project_info** - Comprehensive Node.js project analysis with smart caching
  - Auto-detects package manager (npm, yarn, pnpm, bun)
  - Framework detection (React, Vue, Angular, Next.js, NestJS, Express, Fastify)
  - Test framework detection (Jest, Vitest, Mocha)
  - Build tool detection (Vite, Webpack, Rollup, esbuild, tsup)
  - 5min cache TTL for fast repeated queries

- **nodejs_test** - Run tests with Jest, Vitest, or Mocha
  - Auto-detects test framework from package.json
  - Coverage reporting support
  - Watch mode for development
  - Framework-specific coverage extraction

- **nodejs_lint** - ESLint integration with auto-fix
  - Auto-fix issues with `--fix` flag
  - Custom output formats (stylish, json, compact)
  - File pattern filtering
  - Integration with existing ESLint configs

- **nodejs_format** - Prettier code formatting
  - Check mode for CI/CD validation
  - Write mode for applying changes
  - Custom file patterns support
  - Respects existing Prettier configuration

- **nodejs_check_types** - TypeScript type checking
  - Uses tsc for strict type validation
  - Custom tsconfig.json support
  - Incremental compilation mode
  - No-emit mode for type-only checks

- **nodejs_install_deps** - Dependency management
  - Auto-detects package manager from lockfiles
  - Production-only installation mode
  - Frozen lockfile support (for CI/CD)
  - Timeout configuration (default: 10min)

##### Phase 2: Advanced Tools

- **nodejs_version** - Version detection with 1hr caching
  - Check node, npm, yarn, pnpm, bun versions
  - Single tool or all tools at once
  - Gracefully handles missing tools
  - Uses commandAvailability cache namespace

- **nodejs_security** - Security vulnerability scanning
  - Run npm/yarn/pnpm/bun audit
  - Auto-fix vulnerabilities with `--fix` flag
  - Production-only dependency checks
  - JSON output for CI/CD integration

- **nodejs_build** - Build orchestration
  - Run build scripts with any package manager
  - Production and watch mode support
  - Configurable timeout (default: 10min)
  - Pass-through arguments to build tools

- **nodejs_scripts** - Script management with caching
  - List all available npm scripts
  - Run scripts with additional arguments
  - Uses cached project info (5min TTL)
  - Helpful error messages for missing scripts

- **nodejs_benchmark** - Performance benchmarking
  - Auto-detects benchmark framework (Vitest, benchmark.js, tinybench)
  - Vitest bench integration with pattern support
  - Fallback to npm run bench script
  - Configurable timeout (default: 5min)

##### Phase 3: Specialized Tools

- **nodejs_update_deps** - Dependency updates
  - Package manager-specific update commands (npm, yarn, pnpm, bun)
  - Interactive mode for yarn/pnpm
  - Latest version updates (ignore semver constraints)
  - Specific package updates or all dependencies
  - DevDependencies-only updates

- **nodejs_compatibility** - Compatibility checking with 2hr caching
  - Check Node.js version against package.json engines field
  - Validate current version meets requirements
  - Detect Node.js 18+ only packages
  - Dependency compatibility analysis
  - Cached results for fast repeated checks

- **nodejs_profile** - Performance profiling
  - Node.js built-in profiler integration (--cpu-prof, --heap-prof)
  - CPU and heap profiling support
  - Configurable profile duration
  - Automatic output directory creation
  - Chrome DevTools compatible profiles (.cpuprofile files)
  - Suggestions for advanced profiling with clinic.js

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

#### JSON Processing Tools

- **jq_query** - Process JSON data using jq filter syntax without requiring approval

  **Use this instead of `Bash(jq ...)` for all JSON processing.** This tool provides the full power
  of jq for JSON manipulation without requiring user approval for each query, making it perfect for
  parsing API responses, extracting fields, filtering arrays, and transforming data structures.

  **Why Use jq_query:**

  1. **No Approval Required** - Runs without user confirmation, enabling seamless AI workflows
  2. **Faster Development** - Eliminates repetitive approval dialogs for JSON operations
  3. **Better Error Handling** - Clear, actionable error messages for invalid filters or JSON
  4. **Input Flexibility** - Accepts both JSON strings and already-parsed objects/arrays
  5. **Safe Operation** - jq only processes data, no code execution risk

  **Parameters:**

  - `input` - JSON string or already-parsed object/array (required)
  - `filter` - jq filter expression (required), e.g., `".[] | .name"`
  - `compact` - Output compact JSON (default: false)
  - `raw_output` - Output raw strings without JSON quotes (default: false)
  - `sort_keys` - Sort object keys alphabetically (default: false)

  **Common Patterns:**

  ```typescript
  // Extract array of field values
  jq_query({ input: data, filter: '.[] | .name' })

  // Filter by condition
  jq_query({ input: data, filter: '.[] | select(.status == "active")' })

  // Transform structure
  jq_query({ input: data, filter: '{name, id}' })

  // Pretty-print minified JSON
  jq_query({ input: minifiedJSON, filter: '.' })

  // Get array length
  jq_query({ input: data, filter: 'length' })

  // Complex transformations
  jq_query({
    input: apiResponse,
    filter: '.data.users | map({name: .user_name, id: .user_id})'
  })
  ```

  **Features:**

  - Full jq syntax support (pipes, select, map, reduce, conditionals)
  - Handles edge cases: null, boolean, numbers, unicode, deeply nested structures
  - Automatic jq availability detection with installation instructions
  - Clear error messages for invalid JSON or jq filter syntax
  - Multiple output format options

  **Installation Requirements:**

  jq must be installed on the system. If not found, the tool provides installation instructions:

  ```bash
  # macOS
  brew install jq

  # Ubuntu/Debian
  apt-get install jq

  # Fedora/RHEL
  dnf install jq

  # Windows
  choco install jq
  ```

  **Real-World Examples:**

  ```typescript
  // Parse GitHub API response
  jq_query({
    input: milestones,
    filter: '.[] | select(.title | contains("2025-Q2")) | .number'
  })

  // Extract specific fields from array
  jq_query({
    input: issues,
    filter: '[.[] | {title, number, state}]'
  })

  // Count matching items
  jq_query({
    input: data,
    filter: '[.[] | select(.status == "open")] | length'
  })
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

### DateTime Tools

The `get_current_datetime` tool provides rich temporal context optimized for LLM awareness. This helps AI
assistants understand the current date and time with confidence, especially when the system date is near or
past the LLM's training cutoff.

**Key Features:**

- **Human-Readable Format:** Clear datetime string optimized for LLM consumption
- **Calendar Context:** Quarter, ISO week number, day of year
- **Timezone Support:** IANA timezone identifiers with DST detection
- **Relative Calculations:** Days/weeks remaining in year, quarter boundaries
- **Zero Dependencies:** Pure JavaScript Date/Intl APIs for fast synchronous operation
- **Cross-Platform:** Works on Windows, macOS, and Linux

**Use Cases:**

1. **Verify System Context:** When LLMs doubt the date in environment variables
2. **Milestone Planning:** "What quarter are we in? How many weeks until year-end?"
3. **Relative Time:** "How many days until Q4 ends?"
4. **Timezone Awareness:** Check time across multiple timezones for distributed teams

**Example Usage:**

```typescript
// Get current datetime with full context
{
  "timezone": "America/Chicago"
}
```

**Example Output:**

```text
## Current Date & Time

**Tuesday, November 12, 2025 at 7:21 PM CST**

### Date Information
- **Year:** 2025
- **Quarter:** Q4 (October 1, 2025 - December 31, 2025)
- **Month:** November (11)
- **Day:** Tuesday, November 12
- **Day of Year:** 316 of 365
- **ISO Week:** 46

### Time Information
- **Time:** 19:21:00
- **Timezone:** America/Chicago (CST)
- **UTC Offset:** -06:00
- **DST Active:** No

### Relative Information
- **Days Remaining in Year:** 49
- **Weeks Remaining in Year:** 7
- **Days in Current Month:** 30

### Technical Details
- **ISO 8601:** 2025-11-12T19:21:00.000Z
- **Unix Timestamp:** 1762994460
```

**Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timezone` | string | System timezone | IANA timezone (e.g., 'America/New_York', 'UTC', 'Asia/Tokyo') |
| `include_calendar` | boolean | `true` | Include calendar information (quarter, week, etc.) |

**Supported Timezones:**

All IANA timezone identifiers are supported, including:

- `UTC` - Coordinated Universal Time
- `America/New_York` - US Eastern
- `America/Chicago` - US Central
- `America/Los_Angeles` - US Pacific
- `Europe/London` - UK
- `Europe/Paris` - Central European
- `Asia/Tokyo` - Japan Standard Time
- `Asia/Shanghai` - China Standard Time
- And 400+ more IANA timezones

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

- Node.js 20+
- TypeScript
- **Go 1.24+** (for Go language support - **PRIORITY**)
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

#### Optional: Installing Linting Tools

Most linting tools are installed automatically via npm. However, some tools require separate installation:

**yamllint** (Python-based YAML linter):

```bash
# macOS (via Homebrew)
brew install yamllint

# Linux (Ubuntu/Debian)
sudo apt-get install yamllint

# Linux (Fedora/RHEL)
sudo dnf install yamllint

# Any platform (via pip)
pip install yamllint

# Verify installation
yamllint --version
```

**actionlint** (GitHub Actions workflow validator):

```bash
# macOS (via Homebrew)
brew install actionlint

# Linux (download binary)
bash <(curl https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash)

# Or via go install
go install github.com/rhysd/actionlint/cmd/actionlint@latest

# Verify installation
actionlint --version
```

### Development

You can use either `make` commands or `npm` scripts (Makefile is a thin wrapper around npm):

```bash
# View all available commands
make help

# Setup and build
make install         # Install dependencies
make build           # Build TypeScript
make install-mcp     # Install to Claude Desktop

# Development
make dev             # Run in development mode
make start           # Start production server

# Testing
make test            # Run tests
make test-watch      # Run tests in watch mode
make test-coverage   # Run tests with coverage

# Linting
make lint            # Run all linters
make lint-ts         # Run TypeScript linting
make lint-md         # Run Markdown linting
make lint-yaml       # Run YAML linting
make lint-commit     # Validate commit message format

# Documentation
make docs-api        # Generate API docs (TypeDoc)
make docs-dev        # Start docs dev server
make docs-build      # Build documentation
make docs-preview    # Preview built docs

# CI/CD
make check           # Run all linters and tests
make all             # Complete CI pipeline

# Or use npm scripts directly
npm run dev          # Run in development mode
npm run lint         # Run TypeScript linting
npm test             # Run tests
npm run clean        # Clean build artifacts
```

## Docker Support

### Using Docker Images

The MCP DevTools Server is available as Docker images for easy deployment and consistent environments across different systems.

#### Quick Start with Docker

```bash
# Pull the latest image
docker pull ghcr.io/rshade/mcp-devtools-server:latest

# Run with stdio (for MCP protocol)
docker run -i --rm ghcr.io/rshade/mcp-devtools-server:latest
```

#### Claude Desktop Integration with Docker

Update your Claude Desktop configuration (`~/.claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-devtools-server": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v",
        "/path/to/your/project:/workspace",
        "-w",
        "/workspace",
        "ghcr.io/rshade/mcp-devtools-server:latest"
      ]
    }
  }
}
```

**Replace `/path/to/your/project` with your actual project directory.**

#### Development with Docker Compose

For local development with hot-reload:

```bash
# Start development server
docker compose up mcp-devtools-dev

# Run tests
docker compose run --rm mcp-devtools-test

# Run linters
docker compose run --rm mcp-devtools-lint

# Production-like testing
docker compose up mcp-devtools
```

**docker-compose.yml features:**

- Hot-reload for source code changes
- Volume mounts for project access
- Separate services for dev, test, and lint
- Environment variable configuration

#### Building Custom Images

Build your own image with custom tools:

```dockerfile
# Extend the base image
FROM ghcr.io/rshade/mcp-devtools-server:latest

# Install additional tools
RUN apk add --no-cache \
    docker-cli \
    kubectl

# Copy custom configuration
COPY .mcp-devtools.json /app/
```

Build and run:

```bash
docker build -t my-mcp-devtools:latest .
docker run -i --rm my-mcp-devtools:latest
```

#### CI/CD Integration

The project includes automated Docker builds via GitHub Actions:

- **Automatic builds** on push to main and tags
- **Multi-platform support** (linux/amd64, linux/arm64)
- **Security scanning** with Trivy
- **Layer caching** for fast builds
- **Published to GitHub Container Registry** (ghcr.io)

Available image tags:

- `latest` - Latest stable release
- `v1.2.3` - Specific version tags
- `main-abc123` - Branch-specific builds with commit SHA
- `dev` - Development builds (not published)

#### Configuration Options

Control Docker behavior with environment variables:

```bash
# Set log level
docker run -i --rm \
  -e LOG_LEVEL=debug \
  ghcr.io/rshade/mcp-devtools-server:latest

# Set Node environment
docker run -i --rm \
  -e NODE_ENV=production \
  ghcr.io/rshade/mcp-devtools-server:latest
```

#### Volume Mounts for Project Access

Mount your project directory to work with your code:

```bash
docker run -i --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  ghcr.io/rshade/mcp-devtools-server:latest
```

#### Troubleshooting Docker

##### Issue: Permission denied when accessing files

- Ensure volume mount paths are correct
- Check file permissions in mounted directory
- Use `--user` flag to match host user ID:

```bash
docker run -i --rm \
  --user $(id -u):$(id -g) \
  -v "$(pwd):/workspace" \
  ghcr.io/rshade/mcp-devtools-server:latest
```

##### Issue: Container exits immediately

- MCP protocol uses stdio - ensure `-i` (interactive) flag is set
- Check logs with `docker logs <container_id>`
- Verify environment variables are set correctly

##### Issue: Cannot connect to Claude Desktop

- Ensure `command` is `"docker"` not `"docker run"`
- Check `args` array formatting in claude_desktop_config.json
- Verify image is pulled: `docker pull ghcr.io/rshade/mcp-devtools-server:latest`

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

### System Prompt Instructions

The MCP server automatically provides guidance to Claude via system prompt instructions (`src/instructions.md`).
These instructions help Claude:

- **Auto-discover** the 50+ available mcp-devtools tools
- **Prefer MCP tools** over built-in Bash commands for development tasks
- **Use onboarding wizard** proactively when no configuration exists
- **Follow common workflows** for linting, testing, PR preparation, and error analysis

**Key behaviors enabled:**

- When starting work, Claude checks for `.mcp-devtools.json` and offers to run `onboarding_wizard` if missing
- For linting, Claude uses `make_lint`, `eslint`, etc. instead of `Bash(make lint)`
- For error handling, Claude uses `analyze_command` for automatic failure analysis
- Claude runs `project_status` before starting work to understand available tooling

The instructions are token-efficient (< 100 lines) and focus on operational guidance rather than marketing content.

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

The MCP DevTools Server is built on a modular, secure architecture:

- **Secure Shell Execution** - Command allowlist and argument sanitization
- **Plugin System** - Auto-discovery and lifecycle management
- **Intelligent Caching** - LRU cache with file-based invalidation (5-10x speedups)
- **Project Detection** - Auto-configuration for Node.js, Python, Go, and more
- **40+ Tools** - Comprehensive development tool integration

🏗️ **[View Complete Architecture Documentation](https://rshade.github.io/mcp-devtools-server/architecture)**

## Plugin System

The MCP DevTools Server supports an extensible plugin architecture that allows you to add custom
tools and integrations without modifying the core codebase.

### What Are Plugins?

Plugins extend the server with additional functionality:

- **Custom tools** accessible through the MCP protocol
- **Language/framework support** (Docker, Kubernetes, etc.)
- **CI/CD integrations** (GitHub Actions, Jenkins, etc.)
- **IDE enhancements** (formatters, linters, etc.)
- **Notification systems** (Slack, Discord, Email)

### Available Plugins

#### git-spice Plugin

A reference implementation demonstrating best practices for plugin development. Provides Git stacked branch management tools.

**Tools Provided:**

- `git_spice_branch_create` - Create new stacked branches
- `git_spice_branch_checkout` - Checkout existing branches
- `git_spice_stack_submit` - Submit entire stack as pull requests
- `git_spice_stack_restack` - Rebase stack on latest changes
- `git_spice_log_short` - View current stack visualization
- `git_spice_repo_sync` - Sync with remote and cleanup merged branches

**Example Configuration:**

```json
{
  "plugins": {
    "enabled": ["git-spice"],
    "git-spice": {
      "defaultBranch": "main",
      "autoRestack": false,
      "jsonOutput": true,
      "timeout": 60000
    }
  }
}
```

**Usage Example:**

```javascript
// Create a new feature branch
await callTool('git_spice_branch_create', {
  name: 'feature/add-authentication',
  base: 'main'
});

// Create a stacked branch on top of the first
await callTool('git_spice_branch_create', {
  name: 'feature/auth-service',
  base: 'feature/add-authentication'
});

// View the stack
await callTool('git_spice_log_short', {});

// Submit all as PRs
await callTool('git_spice_stack_submit', { draft: false });
```

See the [git-spice User Guide](docs/plugins/git-spice.md) for detailed documentation.

### Plugin Architecture

#### How Plugins Work

```text
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

#### Plugin Lifecycle

1. **Discovery**: PluginManager scans `src/plugins/*-plugin.ts`
2. **Validation**: Checks required dependencies
3. **Initialization**: Calls `initialize()` with context
4. **Registration**: Calls `registerTools()` to get tool list
5. **Execution**: Routes tool calls to `handleToolCall()`
6. **Shutdown**: Calls `shutdown()` on server exit

#### Tool Namespacing

Tools are automatically prefixed with plugin name to prevent conflicts:

```text
Plugin: git-spice
Tool: branch_create
Result: git_spice_branch_create
```

### Developing Plugins

#### Quick Start (5 Minutes)

1. **Copy the template:**

   ```bash
   cp examples/plugins/custom-plugin-example.ts src/plugins/my-tool-plugin.ts
   ```

2. **Update metadata:**

   ```typescript
   metadata: PluginMetadata = {
     name: 'my-tool',
     version: '1.0.0',
     description: 'Integration with my-tool',
     requiredCommands: ['my-tool'],
     tags: ['utility'],
   };
   ```

3. **Implement a tool:**

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

4. **Build and test:**

   ```bash
   npm run build
   node dist/index.js
   ```

Your plugin will be auto-discovered and loaded!

#### Plugin Interface

All plugins must implement the `Plugin` interface:

```typescript
export class MyPlugin implements Plugin {
  // Metadata (required)
  metadata: PluginMetadata = {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'My custom plugin',
    requiredCommands: ['my-command'],
    tags: ['utility'],
  };

  // Lifecycle methods (required)
  async initialize(context: PluginContext): Promise<void> {
    // Validate required commands are available
    // Initialize any state
  }

  async registerTools(): Promise<PluginTool[]> {
    // Return array of tool definitions
  }

  async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
    // Route to appropriate tool method
  }

  // Optional methods
  async validateConfig?(config: unknown): Promise<boolean> { }
  async shutdown?(): Promise<void> { }
  async healthCheck?(): Promise<PluginHealth> { }
}
```

#### Plugin Context

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

#### Security Best Practices

1. **Always use the shared ShellExecutor** - Never execute commands directly
2. **Validate all input with Zod schemas** - Runtime type safety
3. **Add commands to the allowlist** - Update `src/utils/shell-executor.ts`
4. **Sanitize user input** - Prevent command injection
5. **No dynamic code execution** - Never use `eval()` or `Function()`

Example:

```typescript
import { z } from 'zod';

const MyToolArgsSchema = z.object({
  input: z.string().min(1).describe('Input parameter'),
  verbose: z.boolean().optional().describe('Verbose output'),
});

private async myTool(args: unknown): Promise<MyToolResult> {
  // 1. Validate input
  const validated = MyToolArgsSchema.parse(args);

  // 2. Execute through ShellExecutor
  const result = await this.context.shellExecutor.execute(
    `my-command ${validated.input}`,
    {
      cwd: this.context.projectRoot,
      timeout: 60000,
    }
  );

  // 3. Return structured result
  if (result.success) {
    return { success: true, output: result.stdout };
  } else {
    return {
      success: false,
      error: result.stderr,
      suggestions: this.generateSuggestions(result.stderr),
    };
  }
}
```

### Plugin Documentation

- **Developer Guide**: [docs/plugin-development.md](docs/plugin-development.md) - Comprehensive
  guide covering architecture, implementation, testing, and best practices
- **git-spice User Guide**: [docs/plugins/git-spice.md](docs/plugins/git-spice.md) - Complete
  user documentation for the git-spice plugin
- **Template**: [examples/plugins/custom-plugin-example.ts](examples/plugins/custom-plugin-example.ts)
  \- Ready-to-use plugin template with TODOs

### Testing Plugins

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

  it('should initialize successfully', async () => {
    await expect(plugin.initialize(mockContext)).resolves.not.toThrow();
  });

  it('should execute tool successfully', async () => {
    const result = await plugin.handleToolCall('my_tool', {
      input: 'test'
    });
    expect(result).toMatchObject({ success: true });
  });
});
```

**Coverage Goals:**

- Plugin Manager: 90%+ coverage
- Individual Plugins: 85%+ coverage

## Error Handling

The server provides comprehensive error handling with:

- Structured error responses
- Helpful suggestions for common failures
- Exit code interpretation
- Tool availability checking

## Contributing

Contributions are welcome! This project is built on continuous learning and improvement.

Please read our [Contributing Guidelines](CONTRIBUTING.md) for detailed information on how to contribute to this project.

### Quick Links

- [Contributing Guidelines](CONTRIBUTING.md) - How to contribute
- [Code of Conduct](CODE_OF_CONDUCT.md) - Community standards
- [Security Policy](SECURITY.md) - Reporting vulnerabilities
- [API Documentation](docs/) - TypeDoc generated API docs

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run linting and tests
6. Submit a pull request

For detailed instructions, see [CONTRIBUTING.md](CONTRIBUTING.md).

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

## Project Status & Roadmap

**Current Status:** MVP 0.0.1 Released ✅

**Active Development:** 2025-Q2 - Plugin Architecture & Performance

**Quick Overview:**

- ✅ Q1 2025: Go Support & Core Foundation (100% complete - 5/5 issues)
- 🚀 Q2 2025: Plugin Ecosystem & Performance (2/10 issues)
- 🔮 Q3 2025: User Experience & AI Integration
- 📊 Q4 2025: Team Collaboration & Enterprise

📚 **[View Full Roadmap](https://rshade.github.io/mcp-devtools-server/roadmap)**
📊 **[Track Progress on GitHub](https://github.com/rshade/mcp-devtools-server/milestones)**
