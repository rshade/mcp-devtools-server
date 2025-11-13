# Tools Overview

MCP DevTools Server provides 52 development tools across 9 categories, released in version 0.0.1.

## Summary

- **Total Tools**: 52 comprehensive development tools
- **Categories**: 9 specialized categories
- **Version**: 0.0.1 (MVP Release)
- **Key Features**:
  - Security-first command execution
  - Intelligent caching system
  - Multi-language support (Go, Node.js, Python planned)
  - AI-powered suggestions
  - Zero-configuration onboarding

## Tool Categories

### Go Tools (13 tools)

Comprehensive Go development toolchain with intelligent caching and security validation.

- `go_project_info` - Comprehensive Go project analysis
- `go_build` - Build Go projects with custom flags
- `go_test` - Run tests with coverage and race detection
- `go_fmt` - Format Go source code
- `go_vet` - Run Go static analysis
- `go_lint` - Run golangci-lint with customization
- `go_mod_init` - Initialize Go module
- `go_mod_tidy` - Clean up go.mod dependencies
- `go_mod_download` - Download module dependencies
- `go_generate` - Run go generate for code generation
- `go_work` - Manage Go workspaces
- `go_vulncheck` - Check for known vulnerabilities
- `go_benchmark` - Run performance benchmarks
- `staticcheck` - Advanced Go static analysis

**Documentation**: [Go Tools](/tools/go-tools)

**Key Features**:

- Smart caching (5min-2hr TTL based on operation)
- Race condition detection
- Code coverage analysis
- Vulnerability scanning
- Build tag support
- Workspace management

### Node.js Tools (14 tools)

Modern Node.js/TypeScript development tools with auto-detection of package managers and frameworks.

- `nodejs_project_info` - Comprehensive project analysis
- `nodejs_test` - Run tests (Jest, Vitest, Mocha)
- `nodejs_lint` - ESLint integration
- `nodejs_format` - Prettier formatting
- `nodejs_check_types` - TypeScript type checking
- `nodejs_install_deps` - Install dependencies (npm/yarn/pnpm/bun)
- `nodejs_version` - Version management and compatibility
- `nodejs_security` - Security audits and vulnerability scanning
- `nodejs_build` - Build projects (Webpack, Vite, Rollup, etc.)
- `nodejs_scripts` - Execute package.json scripts
- `nodejs_benchmark` - Performance benchmarking
- `nodejs_update_deps` - Update dependencies intelligently
- `nodejs_compatibility` - Check Node.js version compatibility
- `nodejs_profile` - Profile application performance

**Key Features**:

- Auto-detects package manager (bun → pnpm → yarn → npm)
- Framework detection (React, Vue, Angular, Next.js, etc.)
- Test framework auto-detection
- Intelligent caching with invalidation
- Security vulnerability scanning

### Make Tools (5 tools)

Execute Makefile targets with comprehensive validation and error handling.

- `make_lint` - Run make lint command
- `make_test` - Run make test command
- `make_build` - Run make build command
- `make_clean` - Run make clean command
- `make_depend` - Run make depend command

**Documentation**: [Make Tools](/tools/make-tools)

**Key Features**:

- Makefile presence validation
- Target existence checking
- Structured error handling
- Cross-platform support

### Lint Tools (5 tools)

Multi-linter support with aggregated reporting and validation.

- `eslint` - JavaScript/TypeScript linting
- `markdownlint` - Markdown style checking
- `yamllint` - YAML validation
- `commitlint` - Commit message validation
- `lint_all` - Run all applicable linters

**Documentation**: [Lint Tools](/tools/lint-tools)

**Key Features**:

- Auto-detection of available linters
- Configuration file support
- Aggregated error reporting
- Fix mode for auto-correction

### Test Tools (2 tools)

Multi-framework testing support with coverage reporting.

- `run_tests` - Execute tests with framework auto-detection
- `test_status` - Get comprehensive test status

**Documentation**: [Test Tools](/tools/test-tools)

**Key Features**:

- Framework auto-detection (Jest, Go test, pytest, etc.)
- Code coverage extraction
- Parallel test execution
- Watch mode support

### Git Tools (2 tools)

Advanced Git operations and code review automation.

- `code_review` - Automated code review with security analysis
- `generate_pr_message` - Generate PR descriptions with conventional commits

**Documentation**: [Git Tools](/tools/git-tools)

**Key Features**:

- Security vulnerability detection
- Performance issue identification
- Maintainability scoring
- GitHub template integration
- Breaking change detection

### Smart Suggestions (5 tools)

AI-powered command analysis and failure pattern recognition.

- `analyze_command` - Execute and analyze commands
- `analyze_result` - Analyze pre-executed results
- `get_knowledge_base_stats` - View failure patterns
- `recommend_mcp_servers` - Get MCP server recommendations
- `get_performance_metrics` - Cache and performance metrics

**Documentation**: [Smart Suggestions](/tools/smart-suggestions)

**Key Features**:

- 15+ built-in failure patterns
- Context-aware suggestions
- Confidence scoring (0.0-1.0)
- MCP server recommendations
- Intelligent caching (5min TTL)
- Trend analysis

### Onboarding Tools (4 tools)

Zero-configuration project setup with intelligent detection.

- `onboarding_wizard` - Interactive setup wizard
- `generate_config` - Generate .mcp-devtools.json
- `validate_setup` - Validate configuration
- `rollback_setup` - Revert configuration changes

**Documentation**: [Onboarding Tools](/tools/onboarding-tools)

**Key Features**:

- Zero-configuration defaults
- Auto-detection of project type
- Configuration validation
- Rollback support

### File Validation Tools (1 tool)

POSIX newline compliance checking and fixing.

- `ensure_newline` - Check/fix file endings

**Documentation**: [File Validation](/tools/file-validation)

**Key Features**:

- Pure Node.js implementation (no external commands)
- Cross-platform support
- Smart line ending detection (LF/CRLF)
- Binary file detection
- Safe bulk operations

### Actionlint Tools (1 tool)

GitHub Actions workflow validation with comprehensive checks.

- `actionlint` - Validate GitHub Actions workflows

**Documentation**: [Actionlint Tools](/tools/actionlint-tools)

**Key Features**:

- Syntax error detection
- Action parameter validation
- shellcheck integration
- pyflakes support
- Multiple output formats (default, JSON, SARIF)

## Getting Started

### Installation

```bash
npm install -g mcp-devtools-server
```

### Configuration

Create a `.mcp-devtools.json` file in your project root:

```json
{
  "projectType": "go",
  "allowedCommands": ["go", "make", "git"],
  "cache": {
    "enabled": true,
    "ttl": 300000
  }
}
```

Or use the onboarding wizard for automatic setup:

```bash
onboarding_wizard({})
```

### Basic Usage

```typescript
// Analyze a Go project
const projectInfo = await go_project_info({});

// Run tests with coverage
const testResult = await go_test({ coverage: true });

// Get AI-powered suggestions
const analysis = await analyze_command({
  command: "go test",
  args: ["./..."]
});
```

### MCP Integration

Add to your `.mcp.json` (for Claude Desktop):

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["-y", "mcp-devtools-server"]
    }
  }
}
```

## Tool Selection Guide

### For Go Development

**Essential**:

- `go_project_info` - Project overview
- `go_test` - Testing with race detection
- `go_build` - Build with custom flags
- `go_lint` - golangci-lint integration

**Recommended**:

- `go_vulncheck` - Security scanning
- `go_benchmark` - Performance testing
- `staticcheck` - Advanced analysis

### For Node.js Development

**Essential**:

- `nodejs_project_info` - Project analysis
- `nodejs_test` - Testing (Jest/Vitest/Mocha)
- `nodejs_lint` - ESLint integration
- `nodejs_build` - Build automation

**Recommended**:

- `nodejs_security` - Vulnerability scanning
- `nodejs_check_types` - TypeScript checking
- `nodejs_benchmark` - Performance testing

### For Cross-Language Projects

**Essential**:

- `detect_project` - Auto-detect project type
- `make_test` - Universal test runner
- `lint_all` - All-in-one linting
- `analyze_command` - AI-powered analysis

**Recommended**:

- `code_review` - Automated code review
- `ensure_newline` - File validation
- `actionlint` - CI/CD validation

### For CI/CD Pipelines

**Essential**:

- `lint_all` - Comprehensive linting
- `run_tests` - Framework-agnostic testing
- `validate_setup` - Configuration validation
- `actionlint` - Workflow validation

**Recommended**:

- `analyze_result` - Post-mortem analysis
- `test_status` - Test result aggregation
- `ensure_newline` - File compliance

## Advanced Features

### Intelligent Caching

All tools support intelligent caching with file-based invalidation:

- **L1 Cache**: In-process LRU cache with TTL
- **File Watching**: Automatic invalidation on file changes
- **Cache Namespaces**: Separate caches per tool category
- **Performance**: 5-10x speedup on cache hits

**Configuration**:

```json
{
  "cache": {
    "enabled": true,
    "ttl": 300000,
    "maxItems": 100
  }
}
```

**Monitoring**:

```bash
get_performance_metrics({})
# Returns: hit rates, memory usage, recommendations
```

### Security Model

All command execution goes through `ShellExecutor` with:

- **Command Allowlist**: Only approved commands execute
- **Argument Sanitization**: Prevents injection attacks
- **Directory Restrictions**: Confines operations to project root
- **Timeout Protection**: Configurable execution timeouts

**Configuration**:

```json
{
  "allowedCommands": ["go", "npm", "git", "make"],
  "commandTimeout": 120000,
  "workingDirectory": "/project/root"
}
```

### Project Detection

Automatic detection of project type and available tools:

- **Go**: Detects go.mod, go.work, GOPATH projects
- **Node.js**: Detects package.json, framework, package manager
- **Python**: Detects pyproject.toml, requirements.txt (planned)
- **Rust**: Detects Cargo.toml (planned)

**Usage**:

```bash
const project = await detect_project({});
# Returns: type, language, framework, available tools
```

### Error Analysis

AI-powered failure analysis with:

- **Pattern Matching**: 15+ built-in failure patterns
- **Error Classification**: 9 error types (build, test, security, etc.)
- **File Extraction**: Automatically detects affected files
- **Confidence Scoring**: 0.0-1.0 confidence for each suggestion
- **Context-Aware**: Language and project-specific suggestions

**Built-in Patterns**:

- Go test failures (race detection, timeouts)
- Dependency issues (missing modules, version conflicts)
- Security issues (vulnerabilities, data races)
- Configuration errors (missing env vars, invalid config)
- Performance issues (slowness, memory problems)

## Performance Metrics

Typical execution times (on modern hardware):

| Operation | Without Cache | With Cache | Speedup |
|-----------|---------------|------------|---------|
| `go_project_info` | 50-200ms | <1ms | 50-200x |
| `nodejs_project_info` | 80-150ms | <1ms | 80-150x |
| `detect_project` | 100-300ms | <1ms | 100-300x |
| `go_test` (small) | 1-3s | N/A | - |
| `nodejs_test` (small) | 2-5s | N/A | - |
| `analyze_command` | Cmd time + 50-100ms | Cmd time + <5ms | - |

**Memory Usage**:

- Base server: ~50MB
- Cache overhead: <2MB (typical)
- Per-operation: <10MB

**Cache Hit Rates** (after warmup):

- Project detection: 90%+
- Smart suggestions: 30-50% (normal for varied outputs)
- Tool availability: 95%+

## Integration Examples

### GitHub Actions

```yaml
- name: Run Tests with Analysis
  run: |
    npx mcp-devtools-server --tool analyze_command \
      --command "npm test" \
      --context '{"language":"javascript"}'
```

### Pre-commit Hooks

```bash
#!/bin/sh
# Run linting before commit
npx mcp-devtools-server --tool lint_all
```

### CI/CD Pipeline

```yaml
steps:
  - name: Validate Setup
    run: npx mcp-devtools-server --tool validate_setup

  - name: Run All Linters
    run: npx mcp-devtools-server --tool lint_all

  - name: Run Tests
    run: npx mcp-devtools-server --tool run_tests

  - name: Validate GitHub Actions
    run: npx mcp-devtools-server --tool actionlint
```

### Claude Desktop

Add to `~/.config/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["-y", "mcp-devtools-server"]
    }
  }
}
```

## Roadmap

See [Roadmap](/roadmap) for detailed quarterly milestones.

**Upcoming Features**:

- **Python Support** (Q1 2025): 13 tools with pyright, ruff, uv, pytest
- **Plugin System** (Q1 2025): Extensible architecture for custom tools
- **Rust Support** (Q2 2025): Comprehensive Rust toolchain integration
- **Enhanced Caching** (Q2 2025): Git-aware invalidation, smart TTL
- **Historical Analysis** (Q2 2025): Long-term trend analysis

## Common Issues

### Tool Not Found

**Problem**: Command not in PATH or not installed

**Solution**:

```bash
# Check tool availability
const project = await detect_project({});
console.log(project.availableTools);

# Install missing tools
# For Go: go install golang.org/x/tools/cmd/goimports@latest
# For Node.js: npm install -g eslint
```

### Cache Stale Data

**Problem**: Cached results are outdated

**Solution**:

```bash
# Disable cache temporarily
{
  "cache": {
    "enabled": false
  }
}

# Or clear specific namespace via performance metrics
```

### Permission Denied

**Problem**: Command not in allowlist

**Solution**:

```json
{
  "allowedCommands": ["go", "npm", "git", "make", "eslint", "jest"]
}
```

### Timeout Errors

**Problem**: Command takes too long

**Solution**:

```json
{
  "commandTimeout": 300000  // 5 minutes
}
```

## Version History

### v0.0.1 (2025-01-XX) - MVP Release

**Initial release with 52 tools**:

- Go language support (13 tools)
- Node.js language support (14 tools)
- Make integration (5 tools)
- Linting tools (5 tools)
- Testing tools (2 tools)
- Git tools (2 tools)
- Smart suggestions (5 tools)
- Onboarding tools (4 tools)
- File validation (1 tool)
- Actionlint (1 tool)

**Key Features**:

- Security-first architecture
- Intelligent caching system
- AI-powered failure analysis
- Zero-configuration onboarding
- Comprehensive documentation

## Contributing

See [Contributing Guide](https://github.com/rshade/mcp-devtools-server/blob/main/CONTRIBUTING.md) for:

- Development setup
- Code style guidelines
- Testing requirements
- PR process
- Commit conventions

## Support

- **Documentation**: [https://rshade.github.io/mcp-devtools-server/](https://rshade.github.io/mcp-devtools-server/)
- **Issues**: [GitHub Issues](https://github.com/rshade/mcp-devtools-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/rshade/mcp-devtools-server/discussions)
- **Security**: [Security Policy](https://github.com/rshade/mcp-devtools-server/blob/main/SECURITY.md)
