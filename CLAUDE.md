# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) DevTools server project built with Node.js/TypeScript.
The server provides standardized development tool integration for AI assistants.

**Current Work:** See [GitHub Issues](https://github.com/rshade/mcp-devtools-server/issues) and [Milestones](https://github.com/rshade/mcp-devtools-server/milestones) for active development priorities.

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

1. **Security-First** - All shell commands go through secure validation in `ShellExecutor`
2. **Comprehensive Testing** - Add tests for all new tools and utilities (90%+ coverage goal)
3. **Documentation** - Include JSDoc comments for all public APIs
4. **Linting** - Run `npm run lint`, `npm run lint:md`, `npm run lint:yaml` before committing

## Architecture Overview

### Core Components

- **Shell Executor** (`src/utils/shell-executor.ts`) - Secure command execution with validation
- **Project Detector** (`src/utils/project-detector.ts`) - Auto-detection of project types and tools
- **Main Server** (`src/index.ts`) - MCP server implementation with 40+ tool registrations

### Tool Classes (Specialized Handlers)

- `src/tools/make-tools.ts` - Make command integration (lint, test, build, clean, depend)
- `src/tools/lint-tools.ts` - Multi-linter support (ESLint, markdownlint, yamllint, commitlint)
- `src/tools/test-tools.ts` - Test framework integration with coverage reporting
- `src/tools/go-tools.ts` - Comprehensive Go language support (13 tools)
- `src/tools/git-tools.ts` - **NEW** Git workflow tools (code review, PR generation)
- `src/tools/actionlint-tools.ts` - **NEW** GitHub Actions workflow validation
- `src/tools/file-validation-tools.ts` - File validation (POSIX newline compliance)
- `src/tools/smart-suggestions-tools.ts` - **NEW** AI-powered command analysis and suggestions

### Utility Classes

- `src/utils/newline-checker.ts` - Pure Node.js POSIX newline compliance checker
- `src/utils/file-scanner.ts` - Glob-based file pattern matching
- `src/utils/failure-analyzer.ts` - **NEW** Error pattern analysis (15+ built-in patterns)
- `src/utils/knowledge-base.ts` - **NEW** Smart suggestions database by category
- `src/utils/suggestion-engine.ts` - **NEW** Context-aware recommendation engine
- `src/utils/mcp-recommendations.ts` - **NEW** MCP server recommendations

## Configuration

- `.mcp-devtools.json` - Project-specific configuration
- `examples/` - Configuration examples for different project types (Node.js, Python, Go)
- `.mcp-devtools.schema.json` - JSON Schema for configuration validation

## Security Model

- Commands validated against allowlist in `ShellExecutor`
- Arguments sanitized to prevent injection attacks
- Working directories restricted to project boundaries
- All operations have configurable timeouts

## Development Notes

### Plugin System

When implementing plugins:

1. All plugins must use shared `ShellExecutor` for security
2. Plugin tools are automatically namespaced (e.g., `git_spice_branch_create`)
3. Plugins declare required external commands in metadata
4. 90%+ test coverage for plugin manager, 85%+ for individual plugins
5. Comprehensive JSDoc documentation required

### Go Language Support

When working with Go tools:

1. Go commands must be in `ALLOWED_COMMANDS` in `shell-executor.ts`
2. Go-specific configuration goes in `.mcp-devtools.schema.json`
3. Support both Go modules and legacy GOPATH projects
4. Provide user-friendly error messages with actionable suggestions

## File Validation Tools

The `ensure_newline` tool provides POSIX newline compliance validation:

- **Pure Node.js** - Uses Buffer operations, no external commands (tail, od, etc.)
- **Cross-platform** - Works on Windows, macOS, and Linux
- **Smart detection** - Automatically detects and preserves line ending style (LF vs CRLF)
- **Safe** - Skips binary files automatically, respects file size limits

**Usage:**

```typescript
// Check files
ensure_newline({ patterns: ['src/**/*.ts'], mode: 'check' })

// Fix files
ensure_newline({ patterns: ['**/*.md'], mode: 'fix' })

// Validate in CI/CD
ensure_newline({ patterns: ['**/*'], mode: 'validate', exclude: ['node_modules/**'] })
```

**When to use:**

- Before committing files created by AI assistants
- In CI/CD pipelines to enforce compliance
- When debugging linting failures related to missing newlines

## Project Roadmap

See [README.md](README.md#roadmap) for detailed quarterly milestones and [GitHub Milestones](https://github.com/rshade/mcp-devtools-server/milestones) for current progress.

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

### Missing Critical Components (Status Updated: 2025-11-03)

#### Testing Infrastructure ⚠️ **PARTIALLY ADDRESSED**

- ✅ **Test suite established** - Multiple test files now exist with comprehensive coverage
- ✅ Tests added for: Git tools, Go tools, File validation, Actionlint, Smart suggestions
- ✅ Test fixtures created for different scenarios (workflows, binary files, text files)
- ⏳ **Still needed**: More unit tests for ShellExecutor, ProjectDetector
- ⏳ **Still needed**: E2E tests for MCP protocol compliance
- **Current Coverage**: Growing but not yet at 80%+ target

#### CI/CD Pipeline ✅ **IMPLEMENTED**

- ✅ **GitHub Actions workflow exists** - Comprehensive CI pipeline in place
- ✅ Multi-job workflow: lint, test, build, security, integration
- ✅ Multi-version Node.js testing (18, 20, 22)
- ✅ Cross-platform testing (Ubuntu, Windows, macOS)
- ✅ Security auditing (npm audit, Snyk)
- ✅ Code coverage upload (Codecov)
- ⏳ **Still needed**: Automated releases to npm registry

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

- No CONTRIBUTING.md file (in project root)
- ✅ **PR template exists** - `.github/pull_request_template.md`
- ✅ **Issue templates exist** - `.github/ISSUE_TEMPLATE/`
- No SECURITY.md for vulnerability reporting (in project root)
- No CODE_OF_CONDUCT.md
- API documentation could use TypeDoc generation
- ✅ **Comprehensive analysis** - `codebase_analysis.md` added (1,869 lines)

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

### Next Session Priorities (Updated 2025-11-03)

#### Completed ✅

1. ~~Create comprehensive test suite~~ - **DONE** (3,700+ lines of tests added)
2. ~~Set up GitHub Actions CI/CD pipeline~~ - **DONE** (Full CI with multi-platform testing)
3. ~~Create .github/ templates for issues and PRs~~ - **DONE** (Templates exist)

#### High Priority (P1)

1. **Increase test coverage to 80%+** - Add more unit tests for core utilities
2. **Configure pre-commit hooks with Husky** - Prevent broken commits
3. **Add Makefile for project development** - Standardize commands
4. **Implement rate limiting and resource management** - Prevent abuse

#### Medium Priority (P2)

5. **Add Docker support for containerized deployment** - Container images
6. **Create performance benchmarking suite** - Track performance over time
7. **Add CONTRIBUTING.md and SECURITY.md** - Community guidelines
8. **TypeDoc generation** - Auto-generated API documentation

### Known Issues & Workarounds

- `npm run lint:yaml` uses js-yaml-cli instead of yamllint (platform compatibility)
- Context7 integration may timeout on first run (cold start)
- Go module detection fails if go.mod is in subdirectory
- Parallel make jobs (-j) can cause output interleaving

## Recent Major Updates (2025-11-03)

### New Features Added

#### 1. AI-Powered Smart Suggestions System

- **Tools Added**: `analyze_command`, `analyze_result`, `get_knowledge_base_stats`, `recommend_mcp_servers`
- **New Files**:
  - `src/tools/smart-suggestions-tools.ts` (312 lines)
  - `src/utils/failure-analyzer.ts` (298 lines)
  - `src/utils/knowledge-base.ts` (382 lines)
  - `src/utils/suggestion-engine.ts` (358 lines)
  - `src/utils/mcp-recommendations.ts` (416 lines)
- **Features**:
  - Automatic failure pattern recognition (15+ built-in patterns)
  - Context-aware suggestions based on project type and language
  - Security vulnerability detection
  - Performance issue identification
  - Workflow optimization recommendations
  - Confidence scoring and priority assignment
  - MCP server recommendations (Sequential Thinking, Context7, Playwright, etc.)

#### 2. Git Workflow Integration

- **Tools Added**: `code_review`, `generate_pr_message`
- **New File**: `src/tools/git-tools.ts` (813 lines)
- **Features**:
  - Automated code review analysis on Git changes
  - Security, performance, and maintainability analysis
  - Severity-based issue categorization (high, medium, low)
  - PR message generation with conventional commit format
  - GitHub PR template integration (auto-detects templates)
  - Breaking changes and issue reference support

#### 3. GitHub Actions Validation

- **Tool Added**: `actionlint`
- **New File**: `src/tools/actionlint-tools.ts` (360 lines)
- **Features**:
  - Validates GitHub Actions workflow files
  - Syntax error detection
  - Action parameter validation
  - shellcheck integration for run blocks
  - pyflakes support for Python scripts
  - Multiple output formats (default, JSON, SARIF)

### Test Coverage Improvements

New test files added with comprehensive coverage:

- `src/__tests__/tools/smart-suggestions-tools.test.ts` (498 lines)
- `src/__tests__/tools/git-tools.test.ts` (817 lines)
- `src/__tests__/tools/actionlint-tools.test.ts` (362 lines)
- `src/__tests__/utils/failure-analyzer.test.ts` (278 lines)
- `src/__tests__/utils/knowledge-base.test.ts` (169 lines)
- `src/__tests__/utils/suggestion-engine.test.ts` (348 lines)
- `src/__tests__/utils/mcp-recommendations.test.ts` (408 lines)

**Total new test lines**: ~3,700+ lines of test code added

### CI/CD Updates

- Updated to Node.js 24 in CI pipeline
- Updated GitHub Actions:
  - `actions/setup-node@v6`
  - `actions/upload-artifact@v5`
- Updated dependencies via Renovate:
  - `@modelcontextprotocol/sdk@1.21.0`
  - `eslint@9.39.1`
  - `@typescript-eslint/*@8.46.3`
  - `@commitlint/*@20.0.0`

### Documentation Enhancements

- Comprehensive codebase analysis document added (`codebase_analysis.md` - 1,869 lines)
- README.md significantly expanded with:
  - Smart suggestions documentation
  - Git tools usage examples
  - Actionlint usage guide
  - File validation examples

### Tool Count Growth

- **Previous**: ~30 tools
- **Current**: 40+ tools registered in index.ts
- **New categories**: AI-powered analysis, Git workflows, CI/CD validation

Remember: This project prioritizes Go support, security, and developer experience in that order.
