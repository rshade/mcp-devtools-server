---
layout: home

hero:
  name: MCP DevTools Server
  text: Powerful development tooling for AI assistants
  tagline: Standardized development tool integration via Model Context Protocol
  image:
    src: /logo.svg
    alt: MCP DevTools Server
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/rshade/mcp-devtools-server

features:
  - icon: 🛠️
    title: 50+ Development Tools
    details: Go (13), Node.js (14), Make, Git, Linting, Testing, and more - all through a unified MCP interface
  - icon: 🤖
    title: AI-Powered Smart Suggestions
    details: Intelligent failure analysis with actionable recommendations for fixing issues
  - icon: 🔍
    title: Zero-Configuration Onboarding
    details: Automatically detects project type and generates optimal configuration
  - icon: ⚡
    title: Intelligent Caching
    details: LRU caching with file-based invalidation for 5-10x performance improvements
  - icon: 🔐
    title: Secure Execution
    details: Command validation and sandboxing for safe tool execution
  - icon: 🎯
    title: Multi-Language Support
    details: Comprehensive Go (13 tools) and Node.js (14 tools) language support for modern development
---

## Quick Example

Get started in seconds with zero configuration:

```bash
# Install via npx (no installation needed)
npx -y @rshade/mcp-devtools-server
```

### Claude Desktop Setup

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["-y", "@rshade/mcp-devtools-server"]
    }
  }
}
```

### Auto-Configure Your Project

```bash
# Run the onboarding wizard - it detects everything automatically
mcp-devtools onboarding_wizard

# Or use Claude to call the tool:
# Tool: onboarding_wizard
# Result: Generates .mcp-devtools.json with optimal configuration
```

## Why MCP DevTools Server?

### Standardized Tooling Interface

Claude Code and other AI assistants work better when they have standardized interfaces to development tools. MCP DevTools Server provides:

- **Consistent Tool Schemas** - Every tool follows the same input/output patterns
- **Comprehensive Error Handling** - Detailed error messages with actionable suggestions
- **Smart Context Awareness** - Tools understand your project type and adapt accordingly

### Intelligent Analysis

Unlike simple command wrappers, MCP DevTools Server provides:

- **Pattern Matching** - Recognizes 15+ common failure patterns
- **Root Cause Analysis** - Identifies the real issue, not just symptoms
- **Contextual Recommendations** - Suggests fixes based on your project type
- **Confidence Scoring** - Rates suggestion quality (0.0-1.0)

### Production-Ready Performance

Built for real-world development:

- **In-Process Caching** - LRU cache with file-based invalidation
- **Fast Path Optimization** - Checksums only when needed
- **Memory Efficient** - <2MB overhead for typical projects
- **90%+ Cache Hit Rate** - After warmup period

## Features Overview

### 🚀 Zero-Configuration Onboarding

The onboarding wizard automatically detects your project and configures everything:

```typescript
{
  "directory": ".",
  "dryRun": false
}
// Returns: Complete setup with .mcp-devtools.json
```

**Detects:**
- Project type (Node.js, Python, Go, Rust, Java, .NET)
- Framework (React, Express, Django, Gin, etc.)
- Build system (Make, npm, go, cargo, etc.)
- Available tools (linters, test runners, etc.)

### 🔧 Comprehensive Go Support

13 specialized Go tools for complete workflow coverage:

- `go_build` - Build with CGO support and build tags
- `go_test` - Testing with coverage and race detection
- `go_fmt` / `go_vet` - Code formatting and static analysis
- `go_mod_*` - Dependency management
- `go_generate` / `go_doc` - Code generation and documentation

### 🧠 Smart Suggestions System

AI-powered command analysis:

```typescript
// analyze_command - Run with analysis
{
  "command": "go test",
  "args": ["./..."],
  "context": { "language": "go" }
}

// analyze_result - Analyze existing output
{
  "command": "npm test",
  "output": "...",
  "exitCode": 1
}

// Returns: Suggestions with actions, priority, confidence
```

**Analyzes:**
- Security vulnerabilities (hardcoded secrets, SQL injection)
- Dependency issues (missing packages, version conflicts)
- Build errors (compilation failures, undefined symbols)
- Test failures (assertions, timeouts, race conditions)
- Code quality (linting, formatting, style)

### 📦 MCP Server Recommendations

Get intelligent suggestions for complementary MCP servers:

```typescript
// recommend_mcp_servers
{
  "projectType": "nodejs",
  "currentTools": ["devtools"],
  "needs": ["sequential thinking", "web automation"]
}

// Returns: Recommended servers with setup instructions
```

### 🧪 Multi-Language Testing

Unified testing interface across languages:

- **Go** - `go test` with coverage and race detection
- **Node.js** - Jest, Mocha, Vitest support
- **Python** - pytest, unittest integration
- **Generic** - Custom test command support

### 🔍 GitHub Actions Validation

Validate workflow files before pushing:

```typescript
// actionlint
{
  "files": [".github/workflows/*.yml"],
  "format": "default"
}

// Returns: Syntax errors, action validation, shellcheck results
```

### 📝 Git Workflow Integration

Automated code review and PR generation:

- `code_review` - Analyze Git changes for issues
- `generate_pr_message` - Create PR descriptions with conventional commits

## Next Steps

<div class="grid-container">

### 📚 Learn the Basics
Start with our [Getting Started Guide](/getting-started/installation) to install and configure MCP DevTools Server.

### 🔧 Explore Tools
Browse the [Tools Reference](/tools/overview) to see all 40+ available development tools.

### 💡 See Examples
Check out [Examples](/examples/basic-usage) for real-world usage patterns and integration examples.

### 🤝 Contribute
Read the [Contributing Guide](/contributing/development-setup) to help improve the project.

</div>

## Community

- [GitHub Repository](https://github.com/rshade/mcp-devtools-server)
- [Issue Tracker](https://github.com/rshade/mcp-devtools-server/issues)
- [Discussions](https://github.com/rshade/mcp-devtools-server/discussions)
- [Contributing Guidelines](https://github.com/rshade/mcp-devtools-server/blob/main/CONTRIBUTING.md)
- [Code of Conduct](https://github.com/rshade/mcp-devtools-server/blob/main/CODE_OF_CONDUCT.md)

## License

Released under the [Apache-2.0 License](https://github.com/rshade/mcp-devtools-server/blob/main/LICENSE).
