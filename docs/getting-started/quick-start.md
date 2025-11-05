# Quick Start

Get up and running with MCP DevTools Server in 5 minutes.

## Prerequisites

Before you start, ensure you've completed the [Installation](/getting-started/installation) guide.

## Your First Command

Let's run the project detection tool to see what MCP DevTools Server can do:

### In Claude Desktop

1. Open Claude Desktop
2. Start a new conversation
3. Use the `detect_project` tool:

```json
{
  "directory": "."
}
```

4. Claude will show you:
   - Project type (Node.js, Python, Go, etc.)
   - Detected framework
   - Build system
   - Available tools
   - Configuration files

**Example Output:**

```text
Project Type: nodejs
Framework: Not detected
Build System: npm
Language: typescript

Detected Configuration Files:
- package.json
- tsconfig.json
- .eslintrc.json
- jest.config.js

Available Make Targets:
(Make not detected)

Linting Tools:
- ESLint: Available
- Markdownlint: Available

Test Frameworks:
- Jest: Available
```

## Zero-Configuration Setup

The fastest way to configure MCP DevTools Server is with the onboarding wizard:

### Run the Onboarding Wizard

In Claude Desktop, use the `onboarding_wizard` tool:

```json
{
  "directory": ".",
  "dryRun": false
}
```

This will:

1. Detect your project type automatically
2. Identify available tools and frameworks
3. Generate `.mcp-devtools.json` with optimal settings
4. Create a backup of any existing configuration
5. Validate the configuration
6. Provide actionable recommendations

**Example Output:**

```text
## Onboarding Wizard Results

**Status:** ✅ Success
**Duration:** 2,847ms

**Configuration:** /path/to/project/.mcp-devtools.json
**Backup:** /path/to/project/.mcp-devtools-backups/2025-11-04T10-30-00.json

### ✅ Configured Tools (8)

- make
- eslint
- jest
- go
- golangci-lint
- actionlint
- git
- markdownlint-cli

### Recommendations

1. Consider enabling `go test -race` for race detection
2. Add `.mcp-devtools.json` to version control
3. Run `validate_setup` to verify configuration

**Next Steps:**
- Review generated configuration
- Run tools to verify setup
- Customize settings as needed
```

## Common Workflows

### Go Development Workflow

#### 1. Build Your Go Project

```json
// Tool: go_build
{
  "directory": ".",
  "output": "bin/myapp",
  "flags": ["-trimpath", "-ldflags=-s -w"]
}
```

#### 2. Run Tests with Coverage

```json
// Tool: go_test
{
  "directory": ".",
  "args": ["./..."],
  "coverage": true,
  "verbose": true
}
```

**Output:**

```text
Running: go test -v -coverprofile=coverage.out ./...

=== RUN   TestCalculator
=== RUN   TestCalculator/Add
=== RUN   TestCalculator/Subtract
--- PASS: TestCalculator (0.00s)
PASS
coverage: 85.2% of statements

Test Summary:
- Total Tests: 12
- Passed: 12
- Failed: 0
- Skipped: 0
- Coverage: 85.2%
```

#### 3. Format Code

```json
// Tool: go_fmt
{
  "directory": ".",
  "write": true
}
```

#### 4. Run Static Analysis

```json
// Tool: go_vet
{
  "directory": ".",
  "args": ["./..."]
}
```

### Node.js Development Workflow

#### 1. Run Linting

```json
// Tool: lint_eslint
{
  "directory": ".",
  "fix": true,
  "format": "stylish"
}
```

#### 2. Run Tests

```json
// Tool: test_run
{
  "directory": ".",
  "framework": "jest",
  "coverage": true,
  "watch": false
}
```

#### 3. Validate Markdown

```json
// Tool: lint_markdownlint
{
  "directory": ".",
  "files": ["**/*.md"],
  "fix": true,
  "config": ".markdownlint.json"
}
```

### Make-Based Projects

#### 1. List Available Targets

```json
// Tool: make_status
{
  "directory": "."
}
```

**Output:**

```text
Available Make targets:
- lint: Run all linters
- test: Run test suite
- build: Build project
- clean: Clean build artifacts
- install: Install dependencies
```

#### 2. Run Make Target

```json
// Tool: make_lint
{
  "directory": ".",
  "args": []
}
```

## Smart Suggestions

MCP DevTools Server can analyze command failures and provide intelligent suggestions:

### Analyze Command with Suggestions

```json
// Tool: analyze_command
{
  "command": "go test",
  "args": ["./..."],
  "context": {
    "language": "go",
    "projectType": "go"
  }
}
```

**When tests fail, you get:**

```text
Exit Code: 1

Suggestions (2):

1. Go Test Failure Detected
   Priority: high
   Confidence: 0.85

   Actions:
   - Review test assertions in calculator_test.go:15
   - Check expected vs actual values
   - Run with -v flag for verbose output

   Related Files:
   - calculator_test.go

2. Missing Test Coverage
   Priority: medium
   Confidence: 0.72

   Actions:
   - Add tests for uncovered functions
   - Current coverage: 65.2% (target: 80%+)
   - Run: go test -coverprofile=coverage.out ./...
```

### Analyze Existing Output

If you have command output from another source:

```json
// Tool: analyze_result
{
  "command": "npm test",
  "output": "...",
  "exitCode": 1,
  "context": {
    "language": "javascript",
    "projectType": "nodejs"
  }
}
```

## MCP Server Recommendations

Get suggestions for complementary MCP servers:

```json
// Tool: recommend_mcp_servers
{
  "projectType": "nodejs",
  "currentTools": ["devtools"],
  "needs": ["sequential thinking", "documentation"]
}
```

**Output:**

```text
Recommended MCP Servers (3):

1. Sequential Thinking Server
   Priority: high
   Match Score: 0.92

   Benefits:
   - Enhanced reasoning for complex problems
   - Step-by-step problem breakdown
   - Improved debugging workflows

   Setup:
   {
     "mcpServers": {
       "thinking": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
       }
     }
   }

2. Context7 Documentation Server
   Priority: high
   Match Score: 0.88

   Benefits:
   - Up-to-date library documentation
   - API reference integration
   - Code examples and best practices

   Setup:
   {
     "mcpServers": {
       "context7": {
         "command": "npx",
         "args": ["-y", "context7-mcp"]
       }
     }
   }
```

## GitHub Actions Validation

Validate your GitHub Actions workflows before pushing:

```json
// Tool: actionlint
{
  "files": [".github/workflows/ci.yml"],
  "format": "default",
  "shellcheck": true
}
```

**Output:**

```text
Linting: .github/workflows/ci.yml

Issues Found (2):

1. Line 15: Job "test" references undefined secret "NPM_TOKEN"
   Severity: error
   Fix: Add secret to repository settings

2. Line 23: Use of deprecated Node.js version "node@14"
   Severity: warning
   Fix: Update to "node@18" or later

Summary:
- Files: 1
- Errors: 1
- Warnings: 1
```

## Git Workflow Integration

### Code Review

Analyze Git changes for potential issues:

```json
// Tool: code_review
{
  "directory": ".",
  "target": "main",
  "autoFix": false
}
```

**Output:**

```text
Code Review Results

Security Issues (1 high, 0 medium, 0 low):

HIGH: Hardcoded API key in src/config.ts:15
- Severity: high
- Line: const API_KEY = "sk-123abc..."
- Fix: Move to environment variable

Performance Issues (0 high, 1 medium, 2 low):

MEDIUM: Large bundle size in src/components/Dashboard.tsx
- Component size: 125KB
- Consider code splitting or lazy loading

Code Quality (3 issues):

1. Missing JSDoc in src/utils/helpers.ts:42
2. Unused import in src/pages/Home.tsx:3
3. TODO comment in src/api/client.ts:67

Recommendations:
- Fix security issues before merging
- Run linting to address code quality issues
- Consider performance optimizations for production
```

### Generate PR Message

Create a conventional commit format PR description:

```json
// Tool: generate_pr_message
{
  "directory": ".",
  "baseBranch": "main"
}
```

**Output:**

```markdown
## feat: add user authentication system

### Summary

Implements JWT-based authentication with refresh tokens:

- Add login/logout endpoints
- Implement token refresh mechanism
- Add authentication middleware
- Update user model with password hashing

### Breaking Changes

- `User` model now requires `password` field
- API endpoints now require `Authorization` header

### Test Plan

- [x] Unit tests for auth service
- [x] Integration tests for auth endpoints
- [x] Manual testing with Postman

### Related Issues

- Closes #123
- Related to #124
```

## File Validation

Ensure files have proper POSIX newline endings:

```json
// Tool: ensure_newline
{
  "patterns": ["src/**/*.ts"],
  "mode": "check",
  "exclude": ["node_modules/**", "dist/**"]
}
```

## Best Practices

### 1. Start with Onboarding

Always run `onboarding_wizard` for new projects:

```json
{
  "directory": ".",
  "dryRun": false
}
```

### 2. Use Smart Suggestions

Let MCP DevTools Server analyze failures:

```json
// Instead of just running commands
// Tool: analyze_command
{
  "command": "go test",
  "args": ["./..."]
}
```

### 3. Validate Configuration

Periodically check your setup:

```json
// Tool: validate_setup
{
  "directory": "."
}
```

### 4. Enable Caching

Add caching to `.mcp-devtools.json`:

```json
{
  "caching": {
    "enabled": true,
    "maxSize": 100,
    "ttl": 300000
  }
}
```

### 5. Version Control Configuration

Commit `.mcp-devtools.json` to share configuration:

```bash
git add .mcp-devtools.json
git commit -m "chore: add MCP DevTools configuration"
```

## Common Issues

### Tools Not Appearing

1. Restart Claude Desktop
2. Check logs in `~/Library/Logs/Claude/`
3. Verify configuration syntax

### Command Timeouts

Increase timeout in `.mcp-devtools.json`:

```json
{
  "commandTimeout": 60000
}
```

### Permission Errors

Ensure tools are in your PATH:

```bash
which go
which npm
which make
```

## Next Steps

Now that you're familiar with the basics:

1. **[Configuration Guide](/getting-started/configuration)** - Customize for your project
2. **[Tools Overview](/tools/overview)** - Explore all 40+ tools
3. **[Smart Suggestions Guide](/guides/smart-suggestions)** - Master AI-powered analysis
4. **[Examples](/examples/basic-usage)** - See real-world usage patterns

## Getting Help

- [Troubleshooting Guide](/getting-started/troubleshooting)
- [GitHub Issues](https://github.com/rshade/mcp-devtools-server/issues)
- [GitHub Discussions](https://github.com/rshade/mcp-devtools-server/discussions)
