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

**`/implement-python-tool [issue-number]`**

- Implements Python tools from Epic #131
- Follows Go tools pattern with cache optimization
- Enforces 85-90%+ test coverage
- Runs all quality gates

**`/quick-fix [issue-number]`**

- Fast bug fixes (<1 hour, <50 lines)
- Best for linting errors, test failures, docs
- Rejects complex issues

### Issue Management

**`/triage-issues [filter]`**

- Categorizes and labels issues using `gh issue list/view/edit`
- Assigns priorities (P0-P3)
- Detects duplicates and stale issues
- Filters: all, unlabeled, stale, P1

### Code Review

**`/review-pr [pr-number] [--fix]`**

- Deep review across 5 dimensions (correctness, security, performance, maintainability, best practices)
- Uses `gh pr view/diff/checks`
- Optional: implements fixes with --fix flag
- Enforces quality gates

**When to use agents:**

- ✅ Implementing Python tools (issues #132-144)
- ✅ Quick bug fixes
- ✅ Issue triage before sprint planning
- ✅ Comprehensive PR reviews

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

# Run single test file
npm test -- src/__tests__/tools/make-tools.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="make_lint"
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

### Documentation Structure

**Tool Documentation** (`docs/tools/`):

- Each tool category has its own markdown file
- Follow `actionlint-tools.md` or `make-tools.md` as comprehensive examples
- Include: Overview, Parameters table, Returns interface, Usage examples
- Add new tools to `docs/tools/overview.md` summary
- **IMPORTANT**: Update `docs/tools/` when adding new MCP tools, not README.md

**Directory Structure**:

```text
docs/
├── tools/              # Tool reference documentation
│   ├── overview.md     # All tools summary
│   ├── go-tools.md     # Go language tools
│   ├── python-tools.md # Python language tools
│   ├── nodejs-tools.md # Node.js tools
│   └── ...
├── guides/             # How-to guides and workflows
├── api/                # API reference and schemas
└── getting-started/    # Installation, quick start
```

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
   - **Note:** CDN cache takes 5-10 minutes to clear (use Ctrl+Shift+R for hard refresh)
   - **Rollback:** `git revert HEAD && git push` triggers automatic redeployment

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
3. **Documentation** - Update all relevant documentation when adding features:
   - **JSDoc comments** for all public APIs
   - **instructions.md** (`src/instructions.md`) - Update when adding new tools or changing behavior
   - **VitePress docs** (`docs/`) - Add/update tool reference pages and guides
   - **README.md** - Update if adding major features or changing setup
   - Ensure documentation stays in sync with code
4. **Linting** - **ALWAYS RUN BEFORE FINISHING ANY TASK**:
   - `make lint` (or `npm run lint`) - TypeScript/JavaScript linting
   - `make lint-md` (or `npm run lint:md`) - Markdown linting (REQUIRED for all .md file changes)
   - `make lint-yaml` (or `npm run lint:yaml`) - YAML linting
   - `make test` (or `npm test`) - Full test suite
   - `make build` (or `npm run build`) - Verify build passes
5. **Community Guidelines** - Follow [CONTRIBUTING.md](CONTRIBUTING.md) for all contributions

**CRITICAL**: If you edit ANY markdown file (*.md), you MUST run `make lint-md` before considering the
task complete. Do not claim success until all linting passes.

**Markdown Linting Exclusions** (in `.markdownlintignore`):

- `CHANGELOG.md` - Auto-generated by release-please
- `docs/` - VitePress uses special syntax that conflicts with standard markdownlint rules

## PR_MESSAGE.md Validation

**CRITICAL**: When creating or updating `PR_MESSAGE.md`, it MUST pass BOTH commitlint AND markdownlint:

```bash
# Validate with both tools before completing the task
cat PR_MESSAGE.md | npx commitlint
make lint-md  # or: markdownlint PR_MESSAGE.md
```

**Requirements:**

1. **commitlint compliance:**
   - First line: `type: subject` (e.g., `docs: update documentation`)
   - Subject line under 100 characters
   - Body lines under 100 characters
   - Blank line between subject and body

2. **markdownlint compliance:**
   - Use proper markdown headings (`##`, `###`)
   - Follow markdown formatting rules
   - Valid list structure and spacing

**Common Issues:**

- ❌ **Using markdown headings in first line**: `## docs: subject` (commitlint fails)
- ✅ **Correct format**: `docs: subject` then `## Summary` on next section
- ❌ **Long lines**: Break lines at 100 characters for body text
- ✅ **Proper structure**: Conventional commit first line, then markdown content

**Example Structure:**

```markdown
docs: complete comprehensive documentation for v0.0.1 release

## Summary

Complete documentation for v0.0.1 release by updating all tool
reference pages and creating comprehensive configuration guide.
All "Documentation coming soon" placeholders replaced with
production-ready content.

## Changes

### Tool Documentation

- actionlint-tools.md (267 lines)
- make-tools.md (390 lines)
```

**Why This Matters:**

Husky pre-commit hooks validate PR_MESSAGE.md with both tools. If either fails,
the commit will be rejected. Always validate before finishing any task that
involves PR_MESSAGE.md.

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

### Dogfooding Error Reporting Protocol

**CRITICAL:** When encountering MCP tool failures during dogfooding, follow this protocol:

1. **STOP** - Do not silently fall back to Bash commands
2. **ALERT USER** - Immediately report the issue with:
   - What tool failed and how it was invoked
   - Expected behavior vs actual behavior
   - Hidden error details (exit codes, stderr, etc.)
   - Impact on user experience
3. **CREATE GITHUB ISSUE** - Document with:
   - Complete reproduction steps
   - Code references (file:line)
   - Proposed fix with rationale
   - Priority based on UX impact
   - Labels: `bug`, `ux`, appropriate priority
4. **ONLY THEN** proceed with workaround if user approves

**Example:**

When yamllint MCP tool returned "undefined" exit code (Issue #208):

- ❌ **Bad:** Silently fell back to `Bash(yamllint)` without reporting
- ✅ **Good:** Alerted user, created issue #208, documented in Epic #210, then used workaround

This ensures knowledge capture and continuous improvement of the dogfooding experience.

## Test Quality Standards

**CRITICAL**: We are burning cycles fixing low-quality tests. Tests MUST be:

1. **Well thought through** - Not AI slop. Think about edge cases, error conditions, and real usage
2. **Fast execution** - Tests should be concise and not consume excessive CPU time
   - Mock external calls (file system, network, processes) aggressively
   - Avoid spawning real processes when mocks suffice
   - Tests taking >1 second should be rare and justified
3. **Focused and purposeful** - Test one thing clearly, not everything vaguely
4. **Meaningful assertions** - Don't just check `toBeDefined()`, verify actual behavior
5. **Well mocked** - Mock all external dependencies properly
   - Mock file system operations (fs.readFile, fs.writeFile, etc.)
   - Mock shell execution (ShellExecutor.execute)
   - Mock network calls
   - Never mock the code under test itself
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

**Project Conventions:**

- **Milestone naming:** Always use year-first format (YYYY-Q[1-4]) for proper sorting
  - Example: `2025-Q2 - Plugin Architecture`, `2025-Q3 - Enhanced Usability`
- **Label management:** Create labels before creating issues that reference them
- **GitHub CLI:** Use heredocs for multi-line issue/PR bodies with `gh` to avoid escaping issues

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
- **Main Server** (`src/index.ts`) - MCP server implementation with 50+ tool registrations
- **Cache Manager** (`src/utils/cache-manager.ts`) - Multi-namespace LRU caching with file invalidation

### Tool Classes (Specialized Handlers)

- `src/tools/make-tools.ts` - Make command integration (lint, test, build, clean, depend)
- `src/tools/lint-tools.ts` - Multi-linter support (ESLint, markdownlint, yamllint, commitlint)
- `src/tools/test-tools.ts` - Test framework integration with coverage reporting
- `src/tools/go-tools.ts` - Comprehensive Go language support (13 tools)
- `src/tools/nodejs-tools.ts` - Node.js/TypeScript language support (14 tools)
- `src/tools/git-tools.ts` - Git workflow tools (code review, PR generation)
- `src/tools/actionlint-tools.ts` - GitHub Actions workflow validation
- `src/tools/file-validation-tools.ts` - File validation (POSIX newline compliance)
- `src/tools/smart-suggestions-tools.ts` - AI-powered command analysis and suggestions
- `src/tools/onboarding-tools.ts` - Zero-config project setup and wizard
- `src/tools/env-tools.ts` - Environment variable management (dotenv integration)
- `src/tools/datetime-tools.ts` - Current datetime for temporal awareness
- `src/tools/jq-tools.ts` - JSON processing and querying

### Utility Classes

- `src/utils/newline-checker.ts` - Pure Node.js POSIX newline compliance checker
- `src/utils/file-scanner.ts` - Glob-based file pattern matching
- `src/utils/failure-analyzer.ts` - Error pattern analysis (15+ built-in patterns)
- `src/utils/knowledge-base.ts` - Smart suggestions database by category
- `src/utils/suggestion-engine.ts` - Context-aware recommendation engine
- `src/utils/mcp-recommendations.ts` - MCP server recommendations
- `src/utils/onboarding-wizard.ts` - Complete project setup automation

## Configuration

- `.mcp-devtools.json` - Project-specific configuration
- `examples/` - Configuration examples for different project types (Node.js, Python, Go)
- `.mcp-devtools.schema.json` - JSON Schema for configuration validation

**MCP Server Integration:**

- The `.mcp.json` file MUST use the `mcpServers` key (not `mcp`) for Claude Desktop integration
- Each server entry needs `command` and `args` arrays, not a single command array
- Example configuration in `examples/claude-desktop-config.json`

## Cache Architecture

Multi-namespace LRU cache with file-based invalidation provides 3-5x performance improvements:

**Key Namespaces:**

- `projectDetection` (60s TTL) - Project type/framework detection
- `gitOperations` (30s TTL) - Git status, branches, diffs
- `goModules` (5min TTL) - Go module information
- `nodeModules` (5min TTL) - npm package information
- `commandAvailability` (1hr TTL) - External tool availability checks

**Invalidation Strategy:**

- Checksum-based tracking for file changes (package.json, go.mod, etc.)
- Automatic cache invalidation when source files modified
- Per-namespace TTL with configurable expiration

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

1. **Architecture Patterns**:
   - Follows Go tools pattern (same structure, caching, error handling)
   - All commands must be in `ALLOWED_COMMANDS` in `shell-executor.ts`
   - Uses `nodeModules` cache namespace (5min TTL) and `commandAvailability` (1hr TTL)
   - Auto-detects package manager from lockfiles (priority: bun → pnpm → yarn → npm)
   - Auto-detects test framework from devDependencies

2. **Framework Detection Priority**:
   - Meta-frameworks first: Next.js, Nuxt.js
   - UI frameworks: Angular, React, Vue, Svelte
   - Backend frameworks: NestJS, Express, Fastify

3. **Error Handling Requirements**:
   - Malformed package.json must be caught and logged
   - Missing test framework must return helpful suggestions
   - All errors should provide actionable next steps

### Python Language Support

When working with Python tools (`src/tools/python-tools.ts`):

1. **Architecture Patterns**:
   - Follows Go tools pattern (same structure, caching, error handling)
   - All commands must be in `ALLOWED_COMMANDS` in `shell-executor.ts`
   - Uses `pythonModules` cache namespace (5min TTL) and `commandAvailability` (1hr TTL)
   - Auto-detects package manager from lockfiles/config (priority: uv → poetry → pipenv → pip)
   - Prefers modern tools (uv, ruff, pyright) over legacy alternatives

2. **Tool Implementation Pattern**:
   - 14 total tools: 7 Phase 1 (core), 7 Phase 2/3 (advanced)
   - Each tool returns unified `PythonToolResult` interface
   - Comprehensive Zod schemas for validation
   - Helper method `generateSuggestions()` for context-aware error messages

3. **Modern Python Stack (2025)**:
   - **uv** - Ultra-fast package manager (10-100x faster than pip)
   - **ruff** - All-in-one linter/formatter (replaces flake8, black, isort)
   - **pyright** - Static type checker (faster than mypy)
   - **pytest** - Testing with coverage and benchmarking support

4. **Phase 2/3 Tools (Security & Advanced)**:
   - **python_security** - Dual-tool scanning (bandit + pip-audit)
   - **python_build** - Modern package building (PEP 517/518)
   - **python_venv** - Virtual environment management
   - **python_benchmark** - Performance testing with pytest-benchmark
   - **python_update_deps** - Safe dependency updates
   - **python_compatibility** - Version compatibility checking (vermin + pyupgrade)
   - **python_profile** - Performance profiling (cProfile/py-spy/memray)

5. **Error Handling Requirements**:
   - Python version detection with upgrade recommendations (Python ≤3.9)
   - Missing tool detection with installation instructions
   - Virtual environment issues with creation steps
   - Multi-profiler support with fallback suggestions

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

## Updating CLAUDE.md - Strategic Guidelines

**When asked to document learnings in CLAUDE.md, follow these principles:**

### What TO Include (Strategic, Long-Term Value)

**Architectural Patterns:**

- Core design principles that apply across the codebase
- Security patterns (e.g., "All commands must go through ShellExecutor allowlist")
- Testing patterns (e.g., "Mock external dependencies, never mock code under test")
- Integration requirements (e.g., "New Go tools must be in ALLOWED_COMMANDS")

**Build/Development Workflows:**

- Essential commands for common tasks
- Non-obvious setup requirements
- Tool interactions that aren't discoverable from file names

**Persistent Technical Constraints:**

- Performance requirements (e.g., "Tests should be fast, mock aggressively")
- Documentation requirements (e.g., "Update instructions.md when adding tools")
- Quality gates (e.g., "Must pass lint, test, build before PR")

### What NOT to Include (Roadmap Bloat)

**❌ Daily Logs / Session Notes:**

- "Recent Fixes (2025-XX-XX)" - This becomes stale immediately
- Specific bug fix details - Track in GitHub issues instead
- Version-specific information - Belongs in CHANGELOG.md

**❌ Status Updates:**

- "Phase 1 complete", "Epic #XXX done" - Use GitHub for tracking
- Tool counts that change frequently - Discoverable via code
- "NEW" markers - Everything is new at some point

**❌ Temporary Information:**

- Specific test failures and fixes - Should be in commit messages
- Implementation details of closed issues - Should be in issue/PR history
- Work-in-progress notes - Should be in active issues

### How to Update Strategically

**Before adding to CLAUDE.md, ask:**

1. **Will this be true in 6 months?** If not, it's roadmap bloat
2. **Can this be discovered via `gh issue list` or README?** If yes, don't duplicate it
3. **Does this explain architecture/patterns?** If yes, include it
4. **Is this a quality standard or constraint?** If yes, include it

**Good additions:**

- "Always update instructions.md when adding tools" (evergreen principle)
- "Cache uses checksum-based invalidation" (architectural pattern)
- "Tests must be fast and well-mocked" (quality standard)

**Bad additions:**

- "Fixed bug #123 on 2025-11-06" (daily log)
- "Phase 2 tools complete" (roadmap status)
- "Updated cache TTL from 30s to 60s" (implementation detail)

### Keep CLAUDE.md Focused

CLAUDE.md should be a **strategic guide for working in this codebase**, not a **historical log of changes**.
For history, use git log, GitHub issues, and CHANGELOG.md.
