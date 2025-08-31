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

- **go_test** - Run Go tests with coverage and race detection
- **go_build** - Build Go packages with custom flags and tags
- **go_fmt** - Format Go code using gofmt
- **go_lint** - Lint Go code using golangci-lint
- **go_vet** - Examine Go source code for suspicious constructs
- **go_mod_tidy** - Tidy Go module dependencies

#### General Linting

- **markdownlint** - Run markdownlint on markdown files
- **yamllint** - Run yamllint on YAML files
- **eslint** - Run ESLint on JavaScript/TypeScript files
- **lint_all** - Run all available linters based on project type

#### Testing & Status

- **run_tests** - Run tests using the detected test framework
- **project_status** - Get overall project health (lint + test summary)
- **test_status** - Get project test status and recommendations

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
