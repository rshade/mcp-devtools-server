# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) DevTools server project built with Node.js/TypeScript. The server provides standardized development tool integration for AI assistants, with **Go language support as the highest priority**.

## 🎯 Current Priority: Enhanced Go Language Support

Go development toolchain integration is the **highest priority (P0)**. The project includes comprehensive Go tools:

- `go_test` - Run Go tests with coverage and race detection
- `go_build` - Build Go packages with custom flags and tags  
- `go_fmt` - Format Go code using gofmt
- `go_lint` - Lint Go code using golangci-lint
- `go_vet` - Examine Go source code for suspicious constructs
- `go_mod_tidy` - Tidy Go module dependencies

## Build and Test Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Run linting
npm run lint
npm run lint:md
npm run lint:yaml

# Run tests
npm test

# Clean build artifacts
npm run clean
```

## Development Workflow

1. **Go Support First** - When adding new features, prioritize Go language support
2. **Security-First** - All shell commands go through secure validation in `ShellExecutor`
3. **Plugin Architecture** - Design new tools with future plugin system in mind
4. **Comprehensive Testing** - Add tests for all new tools and utilities

## Architecture Overview

- **Shell Executor** (`src/utils/shell-executor.ts`) - Secure command execution with validation
- **Project Detector** (`src/utils/project-detector.ts`) - Auto-detection of project types and tools
- **Tool Classes** - Specialized handlers:
  - `src/tools/make-tools.ts` - Make command integration
  - `src/tools/lint-tools.ts` - Linting tool integration
  - `src/tools/test-tools.ts` - Test framework integration
  - `src/tools/go-tools.ts` - **Go language support (PRIORITY)**
- **Main Server** (`src/index.ts`) - MCP server implementation with tool registration

## Configuration

- `.mcp-devtools.json` - Project-specific configuration
- `examples/` - Configuration examples for different project types (Node.js, Python, **Go**)
- `.mcp-devtools.schema.json` - JSON Schema for configuration validation

## Security Model

- Commands validated against allowlist in `ShellExecutor`
- Arguments sanitized to prevent injection attacks
- Working directories restricted to project boundaries
- All operations have configurable timeouts

## Go-Specific Development Notes

When working on Go support:
1. Update `ALLOWED_COMMANDS` in `shell-executor.ts` for new Go tools
2. Add Go-specific configuration options to the schema
3. Test with both Go modules and legacy GOPATH projects
4. Ensure proper error handling and user-friendly suggestions

## Project Roadmap

See [README.md](README.md#roadmap) for detailed quarterly milestones. Current focus is Q1 2025: Go Support & Core Foundation.

## Session Learnings & Important Notes

### Critical Implementation Details

#### MCP Protocol Integration
- The `.mcp.json` file MUST use the `mcpServers` key (not `mcp`) for Claude Desktop integration
- Each server entry needs `command` and `args` arrays, not a single command array
- Context7 integration enhances project understanding and should remain enabled

#### Go Tool Integration Specifics
- Always add new Go tools to `ALLOWED_COMMANDS` in `shell-executor.ts`
- Go test coverage extraction regex: `/coverage: ([\d.]+)% of statements/`
- Support both Go modules and GOPATH projects for backward compatibility
- Handle build tags properly for conditional compilation
- Race detection flags significantly increase test execution time

#### Package Management
- The project uses both npm scripts and could benefit from a Makefile
- Added `markdownlint-cli` and `js-yaml-cli` as dev dependencies for linting
- Consider using `npm run lint:md` and `npm run lint:yaml` for documentation quality

#### GitHub Project Management
- Always use year-first format for milestones (YYYY-Q[1-4]) for proper sorting
- Create labels before creating issues that reference them
- Use heredocs for multi-line issue/PR bodies with `gh` CLI

### Missing Critical Components

#### Testing Infrastructure 🚨
- **No tests written yet** - Jest is configured but no test files exist
- Need unit tests for: ShellExecutor, ProjectDetector, all tool classes
- Need integration tests for tool interactions
- Need E2E tests for MCP protocol compliance
- Consider test fixtures for different project types

#### CI/CD Pipeline 📦
- **No GitHub Actions workflow** - Need automated testing and building
- Should include: lint, test, build, and release workflows
- Need semantic versioning and automated releases
- Consider publishing to npm registry

#### Development Tooling
- **No Makefile** for the project itself (ironic for a make-tools server!)
- **No pre-commit hooks** - Should run linting and tests
- **No commitlint configuration** - Despite having it as a dependency
- Consider using Husky for git hooks

#### Error Handling Patterns
- MCP protocol errors need consistent handling
- Tool timeout errors should provide recovery suggestions
- Network errors for Context7 should fail gracefully
- File system errors need better user messaging

#### Performance Considerations
- No rate limiting on command execution
- No command queuing for long-running operations
- Cache invalidation strategies not fully implemented
- Resource limits not configurable per tool

#### Security Enhancements
- Environment variable sanitization needed
- Secrets should never appear in logs
- Consider adding audit logging for all commands
- Need configurable resource limits (CPU, memory, timeout)

#### Platform Compatibility
- Windows path handling needs testing (especially spaces in paths)
- Shell command differences between platforms not documented
- Go tool behavior varies between OS (especially file paths)

#### Documentation Gaps
- No CONTRIBUTING.md file
- No issue/PR templates in .github/
- No SECURITY.md for vulnerability reporting
- No CODE_OF_CONDUCT.md
- API documentation could use TypeDoc generation

### Development Workflow Recommendations

1. **Always run before committing:**
   ```bash
   npm run lint
   npm run lint:md  
   npm run lint:yaml
   npm test
   npm run build
   ```

2. **When adding new Go tools:**
   - Update `ALLOWED_COMMANDS` in shell-executor.ts
   - Add to GoTools class with proper error handling
   - Update index.ts with tool registration and handler
   - Add usage examples to README.md
   - Update golang-project.json example

3. **For debugging MCP issues:**
   - Set `LOG_LEVEL=debug` environment variable
   - Check Claude Desktop logs at: `~/Library/Logs/Claude/`
   - Use `console.error` for critical debugging (appears in Claude logs)
   - Test with standalone MCP client before Claude integration

4. **Performance testing:**
   - Use `console.time()` and `console.timeEnd()` for benchmarking
   - Monitor memory usage with `process.memoryUsage()`
   - Consider implementing telemetry early for production insights

### Production Deployment Considerations

- **Docker support needed** for consistent deployment
- **Health check endpoint** for monitoring
- **Graceful shutdown** handling for long-running commands
- **Connection pooling** for Context7 integration
- **Retry logic** for transient failures
- **Circuit breaker** pattern for external dependencies

### Next Session Priorities

1. Create comprehensive test suite
2. Set up GitHub Actions CI/CD pipeline
3. Add Makefile for project development
4. Configure pre-commit hooks with Husky
5. Create .github/ templates for issues and PRs
6. Implement rate limiting and resource management
7. Add Docker support for containerized deployment
8. Create performance benchmarking suite

### Known Issues & Workarounds

- `npm run lint:yaml` uses js-yaml-cli instead of yamllint (platform compatibility)
- Context7 integration may timeout on first run (cold start)
- Go module detection fails if go.mod is in subdirectory
- Parallel make jobs (-j) can cause output interleaving

Remember: This project prioritizes Go support, security, and developer experience in that order.