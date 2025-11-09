# Roadmap

Our development is organized into quarterly milestones with clear priorities and tracked
through [GitHub Milestones](https://github.com/rshade/mcp-devtools-server/milestones).

## 2025-Q1 - Go Support & Core Foundation ✅ **COMPLETED**

**Status:** 5/5 issues closed (100% complete)
**Due Date:** March 31, 2025

### Completed Features

- Enhanced Go language support (13 tools: go_test, go_build, go_fmt, go_lint, go_vet,
  go_mod_tidy, go_benchmark, go_generate, go_work, go_vulncheck, staticcheck, go_mod_download,
  go_project_info)
- POSIX newline compliance validation (ensure_newline tool with check/fix/validate modes)
- **Extensible plugin architecture framework** (Issue #2, #66 ✅)
- **git-spice reference plugin implementation** (Issue #58 ✅)
- **Comprehensive test suite** (584 tests, 22 test suites, Issue #63 ✅)
- **Pre-commit hooks with Husky** (Issue #65 ✅)
- **Community documentation** (CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, Issue #69 ✅)
- **Makefile for standardized development** (Issue #66 ✅)
- **Intelligent caching system** (LRU cache with file-based invalidation, 5-10x speedups)
- **AI-powered smart suggestions** (15+ failure patterns, context-aware recommendations)
- **Git workflow integration** (code_review, generate_pr_message tools)
- **GitHub Actions validation** (actionlint tool)
- **Docker support** (Multi-platform images, CI/CD automation)
- **Zero-configuration onboarding wizard** (Auto-detection, validation, rollback support)

**MVP 0.0.1 Status:** ✅ **RELEASED**

## 2025-Q2 - Plugin Architecture & Performance 🚀 **CURRENT FOCUS**

**Status:** 8/16 issues open (6 Node.js Phase 1 tools completed)
**Due Date:** June 30, 2025

### In Progress

- Enhanced error messages with actionable suggestions (Issue #67)
- Rate limiting and resource management (Issue #73)

### Plugin Ecosystem Expansion

- Plugin CLI scaffolding tool (Issue #90)
- Plugin testing infrastructure and utilities (Issue #91)
- Hot-reloading support for plugin development (Issue #92)
- Plugin registry and marketplace (Issue #93)
- Additional first-party plugins (Docker, Kubernetes, etc.)
- Plugin deduplication and multi-location discovery (Issues #104, #105)

### Security & Quality

- Comprehensive CustomLintersPlugin test suite (Issue #107)
- Fix directory traversal vulnerability in plugin discovery (Issue #108)
- Add input validation for glob patterns (Issue #109)
- Fix TOCTOU race condition in plugin file operations (Issue #110)
- Sanitize error messages to prevent secret leakage (Issue #111)
- Memory leak prevention and resource cleanup (Issue #112)

### Performance Optimizations

- Parallel plugin loading for faster startup (Issue #113)
- Environment-aware glob patterns (Issue #114)

## Node.js Language Support Epic 🟢 **CRITICAL PRIORITY**

**Status:** Epic #155 + 14 sub-issues (6/15 complete - 40%)
**Milestone:** 2025-Q2 - Plugin Architecture & Performance
**Priority:** P0 (Critical - foundational ecosystem support)

### Rationale

Node.js is the **foundation of this MCP server** (TypeScript/Node.js project). Implementing comprehensive
Node.js support enables:

1. **Dogfooding** - Use our own tools while developing this server
2. **Ecosystem Priority** - Most Claude Desktop users work with Node.js projects
3. **Foundation First** - Node.js support is more fundamental than Python
4. **Performance Focus** - Smart caching aligns with Q2 performance goals

### Implemented Tools (Following Go Tools Pattern)

#### Phase 1 - Core Tools ✅ **COMPLETED** (6/6 tools - PR #171)

- ✅ **nodejs_project_info** - Project detection and analysis (Issue #156)
  - **CACHED** (5min TTL, nodeModules namespace)
  - Auto-detects: package manager (npm/yarn/pnpm/bun), frameworks (React/Vue/Angular/Next.js/etc)
  - Auto-detects: test frameworks (Jest/Vitest/Mocha), build tools (Vite/Webpack/etc)
- ✅ **nodejs_test** - Testing with Jest/Vitest/Mocha (Issue #157)
  - Returns error (not default) when no framework detected
  - Coverage extraction (Jest format)
- ✅ **nodejs_lint** - Linting with ESLint (Issue #158)
- ✅ **nodejs_format** - Formatting with Prettier (Issue #159)
- ✅ **nodejs_check_types** - Type checking with TypeScript (Issue #160)
- ✅ **nodejs_install_deps** - Dependency management (npm/yarn/pnpm/bun) (Issue #161)
  - Auto-detects package manager from lockfiles

**Phase 1 Status:**
- Implementation: ✅ Complete (639 lines in nodejs-tools.ts)
- Test Coverage: 48% (8 test cases) - target: 85-90%
- Known Limitations: Test file discovery stubbed, coverage regex Jest-only, cache invalidation gaps

#### Phase 2 - Advanced Tools (5 tools)

- **nodejs_version** - Version detection and recommendations (Issue #162)
  - ✅ **CACHED** (1hr TTL, commandAvailability namespace)
  - Invalidation: .nvmrc, .node-version
- **nodejs_security** - Security scanning (npm audit/Snyk) (Issue #163)
- **nodejs_build** - Package building and bundling (Issue #164)
- **nodejs_scripts** - npm scripts management (Issue #165)
  - ✅ **CACHED** (5min TTL, nodeModules namespace)
  - Invalidation: package.json scripts section
- **nodejs_benchmark** - Performance benchmarking (Issue #166)

#### Phase 3 - Specialized Tools (3 tools)

- **nodejs_update_deps** - Dependency updates (Issue #167)
- **nodejs_compatibility** - Node version compatibility checking (Issue #168)
  - ✅ **CACHED** (2hr TTL, nodeModules namespace)
  - Invalidation: package.json, .nvmrc
- **nodejs_profile** - Performance profiling (Issue #169)

**Key Features:**

- Modern Node.js tooling (npm, yarn, pnpm, bun, ESLint, Prettier, TypeScript)
- **Smart caching for 4 tools** (project_info, version, scripts, compatibility)
- Cache invalidation based on package.json, lock files, and config changes
- Package manager auto-detection (npm → yarn → pnpm → bun)
- Node.js LTS upgrade recommendations (Node 18+)
- 85-90%+ test coverage target
- TypeScript-first approach

**Architecture:**

Follows `src/tools/go-tools.ts` pattern (~900 lines):

- Dedicated NodejsTools class
- Shared ShellExecutor for security
- Cache key pattern: `{operation}:{directory}:{args-hash}`
- File-based cache invalidation with ChecksumTracker
- Comprehensive error handling with smart suggestions

## 2025-Q3 - User Experience & AI Integration 🔮

**Status:** 1/3 issues open
**Due Date:** September 30, 2025

### Planned Features

- Zero-configuration onboarding wizard ✅ (Moved to Q1)
- AI-powered smart suggestions ✅ (Moved to Q1)
- Privacy-respecting telemetry and metrics collection (Issue #72)
- Workflow templates and patterns
- Enhanced project discovery and analysis
- Integration ecosystem (VS Code extension, GitHub Actions)

## 2025-Q4 - Team Collaboration & Enterprise 📊

**Status:** 0/1 issues open
**Due Date:** December 31, 2025

### Long-term Vision

- Team workspace management
- Shared configuration and standards enforcement
- Enterprise features (SSO, RBAC, audit logging)
- Advanced monitoring and compliance reporting
- Multi-tenant support (deferred - not applicable to MCP architecture)

## Python Language Support Epic 🐍 **NEXT PRIORITY**

**Status:** Epic #131 + 13 sub-issues (0/14 complete)
**Milestone:** Not assigned (proposed for Q2/Q3)

### Planned Tools (Following Go Tools Pattern)

#### Phase 1 - Core Tools

- python_project_info - Project detection and analysis (Issue #132)
- python_test - Testing with pytest (Issue #133)
- python_lint, python_format - Linting with ruff (Issue #134)
- python_check_types - Type checking with pyright (Issue #135)
- python_install_deps - Dependency management with uv (Issue #136)
- python_version - Version detection and recommendations (Issue #137)

#### Phase 2 - Advanced Tools

- python_security - Security scanning (Issue #138)
- python_build - Package building (Issue #139)
- python_venv - Virtual environment management (Issue #140)
- python_benchmark - Performance benchmarking (Issue #141)

#### Phase 3 - Specialized Tools

- python_update_deps - Dependency updates (Issue #142)
- python_compatibility - Version compatibility checking (Issue #143)
- python_profile - Profiling and optimization (Issue #144)

**Key Features:**

- Modern Python tooling (uv, ruff, pyright, pytest)
- Cache optimization from the start (following Go tools pattern)
- Python 3.9+ upgrade recommendations
- 85-90%+ test coverage target

## Future Enhancements

- Predictive analytics and failure prediction
- Auto-remediation and self-healing workflows
- Natural language interface ("Run the deployment checklist")
- Cross-project learning and global best practices
- Additional language support (Rust, Java, .NET)

## Progress Summary

**Completed Milestones:** Q1 (100%)
**Active Development:** Q2 Plugin Architecture & Performance
**Total Open Issues:** 46+ (3 P0-high, 14 Node.js Epic, 13 Python Epic, 16 other enhancements)
**Priority Order:** Node.js Epic (P0-Critical) → Python Epic (P1) → Plugin Enhancements
**Test Coverage:** 584 tests passing, comprehensive coverage across 22 test suites
**Quality Gates:** ✅ Linting, ✅ Tests, ✅ Build, ✅ Security, ✅ Documentation

## Contributing to the Roadmap

We welcome community input on our roadmap! Here's how you can get involved:

### Propose New Features

- Open a [feature request](https://github.com/rshade/mcp-devtools-server/issues/new?template=feature_request.yml)
- Describe the use case and expected benefits
- Reference similar tools or implementations if available

### Help With Current Milestones

- Check [open issues](https://github.com/rshade/mcp-devtools-server/issues) for good first issues
- Review [milestones](https://github.com/rshade/mcp-devtools-server/milestones) for prioritized work
- Comment on issues you're interested in helping with

### Vote on Priorities

- 👍 issues that matter to you
- Comment on issues with your use cases
- Help us understand which features provide the most value

## Tracking Progress

- **GitHub Issues:** <https://github.com/rshade/mcp-devtools-server/issues>
- **Milestones:** <https://github.com/rshade/mcp-devtools-server/milestones>
- **Changelog:** [CHANGELOG.md](https://github.com/rshade/mcp-devtools-server/blob/main/CHANGELOG.md)
- **Releases:** <https://github.com/rshade/mcp-devtools-server/releases>
