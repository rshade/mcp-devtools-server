# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) DevTools server project built with Node.js/TypeScript.
The server provides standardized development tool integration for AI assistants.

**Current Work:** See [GitHub Issues](https://github.com/rshade/mcp-devtools-server/issues) and
[Milestones](https://github.com/rshade/mcp-devtools-server/milestones) for active development
priorities.

## Specialized Agents Available

This project has custom agents in `.claude/` for common tasks. **Use these instead of implementing manually:**

### Implementation Agents

**`/implement-python-tool [issue-number]`** (Haiku, ~$0.10-0.25, 1.5-3 hours)

- Implements Python tools from Epic #131
- Follows Go tools pattern with cache optimization
- Enforces 85-90%+ test coverage
- Runs all quality gates

**`/quick-fix [issue-number]`** (Haiku, ~$0.10-0.25, 30-60 min)

- Fast bug fixes (<1 hour, <50 lines)
- Best for linting errors, test failures, docs
- Rejects complex issues

### Issue Management

**`/triage-issues [filter]`** (Haiku, ~$0.05-0.10/issue, 5-10 min)

- Categorizes and labels issues using `gh issue list/view/edit`
- Assigns priorities (P0-P3)
- Detects duplicates and stale issues
- Filters: all, unlabeled, stale, P1

### Code Review

**`/review-pr [pr-number] [--fix]`** (Sonnet, ~$2-5, 30-60 min)

- Deep review across 5 dimensions (correctness, security, performance, maintainability, best practices)
- Uses `gh pr view/diff/checks`
- Optional: implements fixes with --fix flag
- Enforces quality gates

**When to use agents:**

- ✅ Implementing Python tools (issues #132-144)
- ✅ Quick bug fixes
- ✅ Issue triage before sprint planning
- ✅ Comprehensive PR reviews

**Cost efficiency:** Haiku is 95% cheaper than Sonnet for straightforward tasks.
Use Sonnet only for deep reasoning (code reviews).

See `.claude/README.md` for complete documentation.

## Build and Test Commands

You can use either `make` commands (recommended) or `npm` scripts directly.
**Makefile is a thin wrapper around npm - npm is the source of truth.**

```bash
# View all available commands
make help

# Common commands
make install         # Install dependencies
make build           # Build TypeScript
make dev             # Start development server
make test            # Run tests
make lint            # Run all linters (TypeScript, Markdown, YAML)
make check           # Run all linters and tests
make all             # Complete CI pipeline (install, check, build)

# Or use npm scripts directly
npm install
npm run build
npm run dev
npm run lint
npm run lint:md
npm run lint:yaml
npm test
npm run clean
```

## Makefile Maintenance

**IMPORTANT:** The Makefile must be kept in sync with package.json scripts:

- When adding/removing npm scripts, update the Makefile accordingly
- Keep `make help` output current and accurate
- All Makefile targets should delegate to npm (no duplicate logic)
- The Makefile is just a convenience wrapper - npm is the source of truth

## Documentation and GitHub Pages

This project uses VitePress for documentation hosted on GitHub Pages at <https://rshade.github.io/mcp-devtools-server/>

### Local Documentation Development

```bash
# Install dependencies first
npm install

# Start development server (hot reload)
npm run docs:dev
# Visit http://localhost:5173/mcp-devtools-server/

# Build documentation
npm run docs:build

# Preview built documentation (simulates GitHub Pages)
npm run docs:preview
# Visit http://localhost:4173/mcp-devtools-server/
```

### VitePress Configuration Requirements

**CRITICAL**: The VitePress configuration MUST be properly structured for GitHub Pages deployment:

1. **Directory Structure**:
   - VitePress config: `docs/.vitepress/config.ts`
   - Content files: `docs/*.md` and `docs/*/`
   - Build output: `docs/.vitepress/dist`
   - ❌ **INCORRECT**: `docs/docs/.vitepress/` (nested docs directory causes 404s)

2. **Base Path Configuration**:

   ```typescript
   // docs/.vitepress/config.ts
   export default defineConfig({
     base: '/mcp-devtools-server/',  // MUST match GitHub repo name
     // ... other config
   })
   ```

3. **GitHub Actions Workflow**:
   - Workflow file: `.github/workflows/docs-deploy.yml`
   - Build command: `npm run docs:build`
   - Upload path: `docs/.vitepress/dist` (MUST match VitePress output directory)

### Common GitHub Pages Issues and Solutions

#### Issue: Site Shows Unstyled HTML (No CSS/JS)

**Symptoms**:

- Console shows 404 errors for CSS/JS assets
- Page title shows "VitePress" (default)
- Navigation and styling completely broken
- Content is readable but completely unstyled

**Root Causes**:

1. `.vitepress` directory in wrong location (e.g., `docs/docs/.vitepress/` instead of `docs/.vitepress/`)
2. `base` path mismatch in config.ts
3. GitHub Actions uploading wrong directory
4. Build command not running in correct directory

**Solution Steps**:

1. Verify VitePress config location:

   ```bash
   # Should exist:
   ls -la docs/.vitepress/config.ts

   # Should NOT exist:
   ls -la docs/docs/.vitepress/
   ```

2. Check base path in config:

   ```bash
   grep "base:" docs/.vitepress/config.ts
   # Should show: base: '/mcp-devtools-server/',
   ```

3. Verify build output:

   ```bash
   npm run docs:build
   ls -la docs/.vitepress/dist/
   # Should contain: index.html, assets/, mcp-devtools-server/, etc.
   ```

4. Test locally with preview (mimics GitHub Pages):

   ```bash
   npm run docs:preview
   # Visit http://localhost:4173/mcp-devtools-server/
   ```

5. Use Playwright to debug:

   ```bash
   # Start preview server in background
   npm run docs:preview &

   # Open Playwright and navigate to local site
   # Compare with production site to identify differences
   ```

#### Issue: Links Broken After Deployment

**Solution**: Ensure all internal links include the base path or use relative paths:

- ✅ `/mcp-devtools-server/getting-started/installation.html`
- ✅ `./installation.html` (relative)
- ❌ `/getting-started/installation.html` (missing base)

#### Issue: Images Not Loading

**Solution**: Place images in `docs/public/` directory:

- `docs/public/logo.svg` → Available at `/mcp-devtools-server/logo.svg`
- Reference in markdown: `![Logo](/mcp-devtools-server/logo.svg)`

### GitHub Pages Deployment Process

1. **Commit changes to docs/**:

   ```bash
   git add docs/
   git commit -m "docs: update documentation"
   ```

2. **GitHub Actions automatically**:
   - Triggers on push to main (if docs/** files changed)
   - Runs `npm ci && npm run docs:build`
   - Uploads `docs/.vitepress/dist` as artifact
   - Deploys to GitHub Pages

3. **Verify deployment**:
   - Check Actions tab: <https://github.com/rshade/mcp-devtools-server/actions>
   - Visit site: <https://rshade.github.io/mcp-devtools-server/>
   - Open browser console to check for 404 errors

### Using Playwright for Debugging

When GitHub Pages site isn't working:

1. **Start local preview**:

   ```bash
   npm run docs:preview
   ```

2. **Navigate with Playwright** (via Claude Code):

   ```text
   Navigate to http://localhost:4173/mcp-devtools-server/
   Take full-page screenshot
   Check console messages for errors
   ```

3. **Compare with production**:

   ```text
   Navigate to https://rshade.github.io/mcp-devtools-server/
   Take full-page screenshot
   Compare with local version
   ```

4. **Common Playwright checks**:
   - Verify CSS loads: Check for style elements in snapshot
   - Verify navigation works: Click links and check URLs
   - Verify images load: Check for img elements with valid src
   - Check console: Look for 404s or other errors

## Development Workflow

1. **Security-First** - All shell commands go through secure validation in `ShellExecutor`
2. **Comprehensive Testing** - Add tests for all new tools and utilities (90%+ coverage goal)
3. **Documentation** - Include JSDoc comments for all public APIs
4. **Linting** - **ALWAYS RUN BEFORE FINISHING ANY TASK**:
   - `make lint` (or `npm run lint`) - TypeScript/JavaScript linting
   - `make lint-md` (or `npm run lint:md`) - Markdown linting (REQUIRED for all .md file changes)
   - `make lint-yaml` (or `npm run lint:yaml`) - YAML linting
   - `make test` (or `npm test`) - Full test suite
   - `make build` (or `npm run build`) - Verify build passes
5. **Community Guidelines** - Follow [CONTRIBUTING.md](CONTRIBUTING.md) for all contributions

**CRITICAL**: If you edit ANY markdown file (*.md), you MUST run `make lint-md` before considering the
task complete. Do not claim success until all linting passes.

**NOTE**: CHANGELOG.md is excluded from markdown linting (in `.markdownlintignore`) because it's
auto-generated by release-please and should not be manually edited.

## Dogfooding Principle

**When working on the mcp-devtools codebase itself, always prioritize using MCP tools over built-in Bash commands.**

This validates that:

- Tools are actually usable in real-world scenarios
- Error messages are helpful and actionable
- Tool behavior matches expectations
- Performance is acceptable
- API design is intuitive

**Examples:**

- Use `make_lint` instead of `Bash(make lint)`
- Use `make_test` instead of `Bash(npm test)`
- Use `analyze_command` for commands that might fail
- Use `markdownlint` instead of `Bash(npx markdownlint-cli ...)`

**Benefits:**

- Immediate feedback on usability issues
- Dogfooding catches edge cases early
- Ensures tools provide value to users
- Validates system prompt instructions work correctly

**Reporting Issues:**

- If a tool is hard to use, improve it
- If an error message is unclear, fix it
- If you find yourself using Bash instead, consider why

## Test Quality Standards

**CRITICAL**: We are burning cycles fixing low-quality tests. Tests MUST be:

1. **Well thought through** - Not AI slop. Think about edge cases, error conditions, and real usage
2. **Fast execution** - Tests that take too long are a productivity killer
3. **Focused and purposeful** - Test one thing clearly, not everything vaguely
4. **Meaningful assertions** - Don't just check `toBeDefined()`, verify actual behavior
5. **Minimal mocking** - Only mock external dependencies, not the code under test
6. **No flaky tests** - Tests must be deterministic and reliable

**BAD TEST (AI slop):**

```typescript
it('should work', async () => {
  const result = await someFunction();
  expect(result).toBeDefined();
  expect(result).toBeTruthy();
});
```

**GOOD TEST:**

```typescript
it('returns error when file does not exist', async () => {
  const result = await readConfig('/nonexistent.json');
  expect(result.error).toBe('ENOENT');
  expect(result.data).toBeNull();
});
```

**Code Review**: When reviewing code, explicitly check test quality against these standards.

### GitHub Issue Management: Epics vs. Single Issues

**Epic Issues** - Use for large, multi-week features requiring multiple discrete tasks:

- **When to create an Epic:**
  - Feature requires 40+ hours of work
  - Multiple independent tasks that could be worked on in parallel
  - Complex architecture changes affecting multiple components
  - Features spanning multiple milestones or sprints
  - Work that benefits from breaking into smaller, reviewable PRs

- **Epic Structure:**

  ```markdown
  ## Epic: [Feature Name]

  **Priority:** P1/P2/P3
  **Milestone:** YYYY-Q[1-4]
  **Estimated Effort:** X-Y weeks

  ### Overview
  [High-level description]

  ### Implementation Tasks
  - [ ] #issue1: Task 1 (X-Y hours)
  - [ ] #issue2: Task 2 (X-Y hours)
  - [ ] #issue3: Task 3 (X-Y hours)

  ### Dependencies
  - Task 1 must complete before Task 2
  - Tasks 3-5 can be done in parallel

  ### Acceptance Criteria
  [Overall epic acceptance criteria]
  ```

- **Creating Sub-Issues from Epics:**
  1. Break epic into discrete, completable tasks (4-16 hours each)
  2. Create separate GitHub issues for each task
  3. Link back to epic issue: "Part of Epic #XX"
  4. Each sub-issue should be:
     - Self-contained (can be completed independently)
     - Testable (clear acceptance criteria)
     - Reviewable (focused PR, not 50+ files changed)
     - Complete prompt format (see below)

**Single Issues** - Use for focused, discrete tasks:

- **When to create a Single Issue:**
  - Feature/fix can be completed in < 40 hours
  - Single logical unit of work
  - Changes confined to 1-3 files
  - Can be completed in a single PR
  - Does not require coordination across multiple PRs

**Complete Prompt Format** - All GitHub issues should follow this structure:

**CRITICAL**: Issues must be complete, actionable prompts that guide implementation from start to finish,
including all quality gates.

```markdown
## Priority: P1 - High Priority

## Problem Statement

Clear description of the problem or need. Include:

- Current limitations
- Why this matters
- Who it affects

## Proposed Solution

Detailed technical approach with:

- Architecture/design overview
- Key implementation details
- Code examples or pseudocode
- File structure changes

## Implementation Guidance

### Development Steps

1. **Codebase Analysis** (if needed)
   - Search for existing patterns: `grep -r "pattern" src/`
   - Review related files: [list specific files]
   - Understand integration points

2. **Implementation**
   - Create/modify files: [list specific files]
   - Follow existing patterns in [reference file]
   - Ensure TypeScript types are correct

3. **Testing Requirements**
   - Add unit tests in `src/__tests__/[category]/[feature].test.ts`
   - Target coverage: 85-90%+
   - Test edge cases, error conditions, and integration points
   - Follow test quality standards (see CLAUDE.md)

4. **Linting & Validation**
   - **MUST RUN BEFORE PR**:
     ```bash
     make lint      # TypeScript/JavaScript linting
     make lint-md   # Markdown linting (for any .md changes)
     make test      # Full test suite
     make build     # Verify build passes
     ```
   - Fix all linting errors (zero tolerance)
   - Ensure 100% test pass rate

5. **Documentation Updates**
   - Update README.md if adding new features/tools
   - Add JSDoc comments for all public APIs
   - Update CLAUDE.md for significant changes

6. **PR Message Generation**
   - Use conventional commit format: `type(scope): description`
   - Generate comprehensive PR_MESSAGE.md including:
     - Summary of changes (what and why)
     - Testing performed
     - Breaking changes (if any)
     - Related issues

## Acceptance Criteria

**Feature Complete:**
- [ ] Feature X implemented and working
- [ ] Code follows project patterns and conventions
- [ ] TypeScript types are correct and complete

**Quality Gates (MUST PASS):**
- [ ] `make lint` passes with zero errors
- [ ] `make lint-md` passes (if .md files changed)
- [ ] `make test` passes with 85-90%+ coverage
- [ ] `make build` completes successfully
- [ ] All tests are meaningful (not AI slop - see Test Quality Standards)
**Documentation:**
- [ ] JSDoc comments added for all public APIs
- [ ] README.md updated (if needed)
- [ ] CLAUDE.md updated (if significant architectural changes)

**PR Ready:**
- [ ] PR_MESSAGE.md generated with conventional commit format
- [ ] No breaking changes (or migration guide provided)
- [ ] Related issues referenced

## Implementation Phases (if multi-step)

### Phase 1: Foundation (Week 1, X-Y hours)

- Task 1
- Task 2

### Phase 2: Core Features (Week 2, X-Y hours)

- Task 3
- Task 4

## Example Use Cases

Real-world scenarios showing how this will be used:

```bash
# Example command or usage
```

## References

- Related issues: #123, #456
- Relevant documentation
- External resources
- Similar implementations: [file references]

## Success Metrics

How we'll know this is successful:

- [ ] Metric 1
- [ ] Metric 2
- [ ] All quality gates passed
- [ ] PR merged without revision requests

```text
End of template
```

### Example: Epic vs. Single Issue Decision

❌ **BAD** - Single massive issue (#64 was initially this way):

```text
Title: Implement plugin architecture for extensible tool integration
Body: [40+ acceptance criteria, 8+ weeks of work, multiple components]
```

✅ **GOOD** - Epic with sub-issues:

```text
Epic #64: Plugin Architecture
├── Issue #65: Plugin interface and base classes (8-12 hours)
├── Issue #66: Plugin discovery and loading (6-8 hours)
├── Issue #67: Tool registration and routing (8-12 hours)
├── Issue #90: Plugin CLI scaffolding tool (8-12 hours)
├── Issue #91: Plugin testing infrastructure (6-8 hours)
└── Issue #92: Hot-reloading support (8-12 hours)
```

**When Converting Large Issues to Epics:**

1. Analyze the issue scope (is it > 40 hours?)
2. Identify natural task boundaries
3. Create Epic issue summarizing the overall goal
4. Create sub-issues for each discrete task
5. Link sub-issues to Epic
6. Close or update original issue
7. Use Epic for tracking overall progress

**Benefits:**

- ✅ Smaller, focused PRs (easier to review)
- ✅ Parallel development possible
- ✅ Clear progress tracking
- ✅ Better prioritization (high-priority sub-tasks first)
- ✅ Reduced merge conflicts
- ✅ Faster feedback cycles

## Community Documentation

This project has comprehensive community documentation:

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Development setup, code style, testing, commit conventions, PR process
- **[SECURITY.md](SECURITY.md)** - Security policy and vulnerability reporting
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** - Community standards (Contributor Covenant 2.1)
- **API Documentation** - Generated via TypeDoc (`npm run docs`, output in `docs/`)

### Important Guidelines

**CHANGELOG Management:**

- **DO NOT manually edit CHANGELOG.md** - It's managed by release-please
- Commit messages using conventional commits format automatically update the CHANGELOG
- release-please creates Release PRs with CHANGELOG updates
- See [CONTRIBUTING.md](CONTRIBUTING.md#changelog-management) for details

**Commit Messages:**

- Follow Conventional Commits specification (enforced by commitlint)
- Format: `type(scope): description`
- Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore
- Examples in [CONTRIBUTING.md](CONTRIBUTING.md#commit-message-conventions)

**Security:**

- Report vulnerabilities via
  [GitHub Security Advisories](https://github.com/rshade/mcp-devtools-server/security/advisories/new)
- Do NOT open public issues for security vulnerabilities
- See [SECURITY.md](SECURITY.md) for full policy

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
- `src/tools/nodejs-tools.ts` - **NEW** Node.js/TypeScript language support (6 Phase 1 tools)
- `src/tools/git-tools.ts` - Git workflow tools (code review, PR generation)
- `src/tools/actionlint-tools.ts` - GitHub Actions workflow validation
- `src/tools/file-validation-tools.ts` - File validation (POSIX newline compliance)
- `src/tools/smart-suggestions-tools.ts` - AI-powered command analysis and suggestions

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

### Node.js Language Support

When working with Node.js tools (`src/tools/nodejs-tools.ts`):

1. **All Phases Complete** (14 tools total) - Epic #155 ✅:
   - **Phase 1 - Core Tools:** nodejs_project_info, nodejs_test, nodejs_lint, nodejs_format, nodejs_check_types, nodejs_install_deps
   - **Phase 2 - Advanced Tools:** nodejs_version, nodejs_security, nodejs_build, nodejs_scripts, nodejs_benchmark
   - **Phase 3 - Specialized Tools:** nodejs_update_deps, nodejs_compatibility, nodejs_profile

2. **Architecture Patterns**:
   - Follows Go tools pattern exactly (same structure, caching, error handling)
   - All commands must be in `ALLOWED_COMMANDS` in `shell-executor.ts`
   - Uses `nodeModules` cache namespace (5min TTL) and `commandAvailability` (1hr TTL)
   - Auto-detects package manager from lockfiles (priority: bun → pnpm → yarn → npm)
   - Auto-detects test framework from devDependencies

3. **Framework Detection Priority**:
   - Meta-frameworks first: Next.js, Nuxt.js
   - UI frameworks: Angular, React, Vue, Svelte
   - Backend frameworks: NestJS, Express, Fastify

4. **Test Framework Behavior**:
   - Returns error (not default) when no framework detected
   - Provides installation suggestions
   - Coverage extraction regex works for Jest (Vitest/Mocha may vary)

5. **Error Handling Requirements**:
   - Malformed package.json must be caught and logged
   - Missing test framework must return helpful suggestions
   - All errors should provide actionable next steps

6. **Smart Caching** (4 tools with intelligent caching):
   - nodejs_project_info: 5min TTL, invalidates on package.json changes
   - nodejs_version: 1hr TTL, invalidates on .nvmrc changes
   - nodejs_scripts: 5min TTL, invalidates on package.json scripts changes
   - nodejs_compatibility: 2hr TTL, invalidates on package.json/engines changes

7. **Known Technical Debt** (non-blocking, tracked in GitHub issues):
   - Test file discovery implementation can be enhanced (#180)
   - Coverage regex pattern works best for Jest (#180)
   - Cache invalidation for package.json changes in checkCompatibility (#183)
   - Empty catch block needs logging in checkCompatibility (#181)

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

See [README.md](README.md#roadmap) for detailed quarterly milestones and
[GitHub Milestones](https://github.com/rshade/mcp-devtools-server/milestones) for current
progress.

## Session Learnings & Important Notes

### Recent Fixes (2025-11-06)

- **GitTools Test Fixes**: Fixed failing tests by resetting CacheManager in test setup to prevent
  cached results from interfering between tests
- **Diff Size Limit**: Updated MAX_DIFF_SIZE_BYTES from 1MB to 10MB to match test expectations
- **Test Isolation**: Added CacheManager.resetInstance() in beforeEach to ensure clean test state

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
- ✅ **release-please workflow** - Automated CHANGELOG and version management
- ⏳ **Still needed**: Automated releases to npm registry (can be added to release-please workflow)

#### Development Tooling ⚠️ **PARTIALLY ADDRESSED**

- ✅ **commitlint configured** - Validates commit messages (dependency exists)
- ✅ **TypeDoc configured** - API documentation generation via `npm run docs`
- ✅ **release-please** - Automated CHANGELOG and release management
- **No Makefile** for the project itself (ironic for a make-tools server!)
- **No pre-commit hooks** - Should run linting and tests
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

#### Documentation Gaps ✅ **FULLY ADDRESSED**

- ✅ **CONTRIBUTING.md** - Comprehensive 400+ line contributing guide
- ✅ **PR template exists** - `.github/pull_request_template.md`
- ✅ **Issue templates exist** - `.github/ISSUE_TEMPLATE/`
- ✅ **SECURITY.md** - 220+ line security policy with vulnerability reporting
- ✅ **CODE_OF_CONDUCT.md** - Contributor Covenant 2.1 community standards
- ✅ **TypeDoc configured** - API documentation generation via `npm run docs`
- ✅ **Architecture documentation** - `docs/architecture.md` added (comprehensive system architecture)
- ✅ **Roadmap documentation** - `docs/roadmap.md` added (quarterly milestones and progress)
- ✅ **release-please** - Automated CHANGELOG management

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

1. **Add Docker support for containerized deployment** - Container images
2. **Create performance benchmarking suite** - Track performance over time
3. ~~**Add CONTRIBUTING.md and SECURITY.md**~~ - ✅ Completed
4. ~~**TypeDoc generation**~~ - ✅ Completed

### Known Issues & Workarounds

- `npm run lint:yaml` uses js-yaml-cli instead of yamllint (platform compatibility)
- Context7 integration may timeout on first run (cold start)
- Go module detection fails if go.mod is in subdirectory
- Parallel make jobs (-j) can cause output interleaving

## Recent Major Updates

### 2025-11-06: Python Support Epic & Specialized Agents

**Epic #131** - Python Language Support with Modern Tooling (pyright, ruff, uv, pytest)

**GitHub Issues Created:**

- Phase 1 (Core): #132-137 - project_info, test, lint/format, check_types, install_deps, version detection
- Phase 2 (Advanced): #138-141 - security, build, venv, benchmark
- Phase 3 (Specialized): #142-144 - update_deps, compatibility, profile

**Key Features:**

- All 13 tools include **cache optimization from the start** (not optional)
- Follows Go tools pattern (src/tools/go-tools.ts)
- Modern Python stack: uv, ruff, pyright (not mypy), pytest
- Python 3.9 upgrade recommendations built-in
- Cache TTLs: 5min (quick ops) to 2hr (dep checks)

**Specialized Agents Created:**

- `.claude/agents/python-implementation.md` - Haiku agent for Python tool implementation
- `.claude/agents/issue-triage.md` - Haiku agent for issue categorization using gh CLI
- `.claude/agents/code-review-fix.md` - Sonnet agent for comprehensive PR review

**Slash Commands:**

- `/implement-python-tool [issue]` - Implement Python tool (Haiku, $0.10-0.25)
- `/quick-fix [issue]` - Fast bug fixes (Haiku, $0.10-0.25)
- `/triage-issues [filter]` - Categorize issues (Haiku, $0.05-0.10)
- `/review-pr [number] [--fix]` - Code review (Sonnet, $2-5)

**Cost Efficiency:**

- Haiku: 95% cheaper than Sonnet for straightforward tasks
- Strategic Sonnet use only for deep reasoning (code reviews)
- Estimated savings: $25-62 for 13 Python tools

**Documentation:**

- `.claude/README.md` - Complete agent documentation
- Cache optimization requirements in all issue comments
- Integration with GitHub CLI (gh issue/pr commands)

### 2025-11-09: Node.js Language Support - Phase 1

**PR #171** - Implemented Phase 1 of Node.js language support with 6 core tools

**New Tools:**

- `nodejs_project_info` - Comprehensive project analysis (639 lines total in nodejs-tools.ts)
- `nodejs_test` - Test execution (Jest, Vitest, Mocha)
- `nodejs_lint` - ESLint integration
- `nodejs_format` - Prettier formatting
- `nodejs_check_types` - TypeScript type checking
- `nodejs_install_deps` - Dependency installation (npm/yarn/pnpm/bun)

**Key Features:**

1. **Smart Detection**
   - Auto-detects package manager from lockfiles (bun → pnpm → yarn → npm)
   - Framework detection (React, Vue, Angular, Next.js, NestJS, Express, etc.)
   - Test framework detection (Jest, Vitest, Mocha)
   - Build tool detection (Vite, Webpack, Rollup, esbuild, tsup)

2. **Architecture**
   - Follows Go tools pattern exactly (same structure, caching, error handling)
   - Uses `nodeModules` cache namespace (5min TTL)
   - All 6 tools integrated with intelligent caching
   - Zod schemas for input validation

3. **Testing**
   - 48% line coverage (8 test cases)
   - Tests cover: package manager detection, framework detection, error handling
   - Known gaps: lint/format/checkTypes tools, cache behavior, edge cases

**Key Learnings:**

1. **Test Framework Fallback**
   - Don't default to 'jest' silently - return error with suggestions
   - Provide actionable installation instructions
   - Check for framework in devDependencies before defaulting

2. **Package.json Parsing**
   - Always wrap JSON.parse() in try-catch
   - Log errors but continue gracefully
   - Set hasPackageJson: false on parse failure

3. **Known Limitations** (to address in future PRs):
   - Test file discovery stubbed (testFiles array empty)
   - Coverage regex only reliable for Jest (not Vitest/Mocha)
   - Cache doesn't invalidate on package.json changes
   - Glob patterns may need shell quoting

**Files Changed:**

- Added: `src/tools/nodejs-tools.ts` (639 lines)
- Added: `src/__tests__/tools/nodejs-tools.test.ts` (87 lines)
- Updated: `src/utils/cache-manager.ts` - Added nodeModules namespace
- Updated: `src/utils/shell-executor.ts` - Added Node.js commands to allowlist
- Updated: `src/index.ts` - Registered 6 new tools with schemas and handlers

**Epic Progress:**

- Part of Epic #155 (14 tools total)
- Phase 1 complete: 6/14 tools (43%)
- Closes: #156, #157, #158, #159, #160, #161
- Remaining: Phase 2 (5 tools), Phase 3 (3 tools)

### 2025-11-04: Intelligent Caching System (Phases 1-2)

**PR #78** - Implemented intelligent in-process LRU caching with file-based invalidation

**Core Components:**

- `src/utils/cache-manager.ts` (347 lines) - Multi-namespace LRU cache
- `src/utils/checksum-tracker.ts` (260 lines) - SHA-256 file change detection
- `src/utils/logger.ts` (77 lines) - Shared logging utility
- 60+ comprehensive tests with 100% coverage

**Key Learnings:**

1. **MCP Caching Best Practices**
   - Use in-process L1 caching (no external dependencies like Redis)
   - External caching adds too many hops and latency
   - LRU eviction with TTL is sufficient for development tools
   - File-based invalidation is more reliable than polling intervals

2. **Performance Optimization Patterns**
   - Fast-path checks before expensive operations (mtime + size before checksum)
   - Sampling for memory estimation (10 entries) to avoid full iteration
   - Skip checksums for files >100MB to prevent memory issues
   - Mutex flags to prevent concurrent expensive operations

3. **Logger Design**
   - Created shared logger utility to avoid duplication
   - ProjectDetector was creating its own Winston logger (anti-pattern)
   - Centralized logger allows consistent configuration and formatting
   - All utilities should import and use shared logger

4. **Race Condition Protection**
   - `checkAll()` can take longer than `watchIntervalMs` causing overlaps
   - Simple mutex flag (`isCheckingAll`) prevents concurrent calls
   - Alternative: use debouncing or queue-based approach for more complexity

5. **Memory Estimation Trade-offs**
   - Fixed 1KB per entry is too inaccurate
   - `JSON.stringify()` provides better estimates but still 20-50% off
   - True memory tracking requires native modules (not worth the complexity)
   - Sampling approach balances accuracy vs. performance

**Performance Impact:**

- Project detection: 50-200ms → <1ms (5-10x speedup)
- Expected hit rate: 90%+ after warmup
- Memory overhead: <2MB for current implementation

**Architecture Decisions:**

- Multi-namespace design allows different TTLs per data type
- Singleton pattern with reset capability for testing
- Configuration-driven with `.mcp-devtools.json` schema
- LRU eviction prevents unbounded growth

**Known Issues Documented:**

- Memory estimates are approximations (acceptable for development tools)
- Large files (>100MB) use mtime + size only (no checksum)
- Race conditions between TTL and file-based invalidation (minor)
- Cache keys must include all parameters (documented pattern)
**Documentation:**

- Complete implementation guide in `CACHING.md` (550+ lines)
- Known issues and limitations section
- Troubleshooting guide
- Roadmap for Phases 3-4 (Git/Go tools, file scanning)

### 2025-11-03: AI-Powered Smart Suggestions

**New Features Added:**

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

- Architecture documentation added (`docs/architecture.md` - comprehensive system design)
- Roadmap documentation added (`docs/roadmap.md` - quarterly milestones on GitHub Pages)
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
