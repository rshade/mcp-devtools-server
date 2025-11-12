# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Node.js/TypeScript Language Support (14 Tools)**
  - **Phase 1 - Core Development Tools:**
    - nodejs_project_info - Project analysis with smart caching (5min TTL)
    - nodejs_test - Test execution (Jest, Vitest, Mocha)
    - nodejs_lint - ESLint integration with auto-fix
    - nodejs_format - Prettier formatting
    - nodejs_check_types - TypeScript type checking
    - nodejs_install_deps - Dependency management (npm/yarn/pnpm/bun)
  - **Phase 2 - Advanced Tools:**
    - nodejs_version - Version detection with 1hr caching
    - nodejs_security - Security vulnerability scanning
    - nodejs_build - Build orchestration
    - nodejs_scripts - Script management with caching
    - nodejs_benchmark - Performance benchmarking
  - **Phase 3 - Specialized Tools:**
    - nodejs_update_deps - Dependency updates
    - nodejs_compatibility - Compatibility checking with 2hr caching
    - nodejs_profile - Performance profiling (CPU/heap profiles)
  - Auto-detection of package managers (npm, yarn, pnpm, bun)
  - Framework detection (React, Vue, Angular, Next.js, NestJS, Express, Fastify)
  - Test framework detection (Jest, Vitest, Mocha)
  - Build tool detection (Vite, Webpack, Rollup, esbuild, tsup)
  - Intelligent caching for fast repeated operations
- **System Prompt Instructions** - Auto-discovery guidance for Claude (src/instructions.md)

### Fixed

- Missing @types/semver dependency causing TypeScript compilation errors

## [0.0.1] - 2025-11-08

### Added

- **Go Language Support (13 Tools)**
  - go_test, go_build, go_fmt, go_lint, go_vet, go_mod_tidy, go_mod_download
  - go_benchmark, go_generate, go_work, go_vulncheck, staticcheck, go_project_info
- **Plugin Architecture**
  - Extensible plugin system with auto-discovery
  - git-spice reference plugin (6 tools for stacked branch management)
  - Plugin lifecycle management and health monitoring
  - Tool namespacing and security isolation
- **Intelligent Caching System**
  - LRU cache with file-based invalidation (SHA-256 checksums)
  - Multi-namespace support with configurable TTLs
  - 5-10x performance improvements for repeated operations
- **AI-Powered Smart Suggestions**
  - 15+ failure pattern recognition
  - Context-aware recommendations
  - Security vulnerability detection
  - Performance issue identification
- **Git Workflow Integration**
  - code_review tool (security, performance, maintainability analysis)
  - generate_pr_message tool (conventional commits, GitHub template support)
- **File Validation**
  - ensure_newline tool (POSIX compliance, check/fix/validate modes)
  - Cross-platform support (Windows, macOS, Linux)
- **GitHub Actions Integration**
  - actionlint tool (workflow validation)
  - CI/CD pipeline with multi-platform testing
- **Zero-Configuration Onboarding**
  - Auto-detection of project type, framework, and tools
  - Configuration generation and validation
  - Rollback support for safety
- **Docker Support**
  - Multi-platform images (linux/amd64, linux/arm64)
  - Automated builds via GitHub Actions
  - Security scanning with Trivy
- **Comprehensive Documentation**
  - 35+ documentation files
  - Getting started guides
  - Tool reference documentation
  - Plugin development guide
  - API documentation
- **Community Guidelines**
  - CONTRIBUTING.md with development workflow
  - SECURITY.md with vulnerability reporting
  - CODE_OF_CONDUCT.md (Contributor Covenant 2.1)
- **Development Tooling**
  - Makefile for standardized commands
  - Pre-commit hooks with Husky
  - commitlint for commit message validation
  - TypeDoc for API documentation generation

### Changed

- Improved test coverage (584 tests across 22 test suites)
- Enhanced security model with multiple layers of protection
- Optimized performance with intelligent caching

### Security

- Implemented command allowlist validation
- Added argument sanitization to prevent injection attacks
- Restricted working directories to project boundaries
- Added timeout protection for all operations

## [1.1.0] - 2025-08-19

### Added

- GitHub Actions CI/CD pipeline with comprehensive testing
- TypeScript compilation with strict error checking
- ESLint configuration for code quality enforcement  
- Jest testing framework with coverage reporting
- Security audit checks with npm audit
- Cross-platform integration testing (Ubuntu, Windows, macOS)
- Go tools integration testing in CI environment
- Markdownlint for documentation quality
- Basic test suite to ensure Jest functionality

### Changed

- Updated ESLint configuration to use `plugin:@typescript-eslint/recommended`
- Simplified ESLint rules to focus on essential code quality checks
- Modified Jest configuration to support ES modules with TypeScript
- Removed vulnerable `js-yaml-cli` dependency in favor of `yamllint`
- Updated YAML linting script to gracefully handle missing tools

### Fixed

- TypeScript compilation errors from unused variables and parameters
- Function signature mismatches across multiple tool classes
- ESLint configuration issues preventing proper linting
- Jest configuration for ES modules compatibility
- Security vulnerabilities in dependencies
- Missing TypeScript definitions for Jest testing framework

### Security

- Resolved 8 npm security vulnerabilities (1 moderate, 4 high, 3 critical)
- Removed packages with known security issues
- Updated npm audit to pass without warnings

## [1.0.0] - 2025-08-17

### Added

- Initial MCP DevTools Server implementation
- Go language support with comprehensive toolchain integration
  - `go_test` - Run Go tests with coverage and race detection
  - `go_build` - Build Go packages with custom flags and tags
  - `go_fmt` - Format Go code using gofmt
  - `go_lint` - Lint Go code using golangci-lint
  - `go_vet` - Examine Go source code for suspicious constructs
  - `go_mod_tidy` - Tidy Go module dependencies
- Make-based command integration
  - `make_lint` - Run linting via Makefile
  - `make_test` - Run tests via Makefile
  - `make_build` - Build project via Makefile
- General linting tools
  - `markdownlint` - Run markdown linting
  - `yamllint` - Run YAML linting
  - `eslint` - Run ESLint for JavaScript/TypeScript
- Testing and status tools
  - `run_tests` - Run tests using detected framework
  - `project_status` - Get project information and available tools
  - `test_status` - Get test framework status and suggestions
- Context7 integration for enhanced project understanding
- Secure shell command execution with validation
- Project detection and auto-configuration
- MCP (Model Context Protocol) server implementation
- TypeScript support with comprehensive type definitions
- Zod schemas for robust input validation
- Winston logging integration
- Comprehensive error handling and user-friendly suggestions

### Security

- Implemented secure command execution with allowlist validation
- Added argument sanitization to prevent injection attacks
- Restricted working directories to project boundaries
- Configurable timeouts for all operations

[Unreleased]: https://github.com/rshade/mcp-devtools-server/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/rshade/mcp-devtools-server/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/rshade/mcp-devtools-server/releases/tag/v1.0.0
