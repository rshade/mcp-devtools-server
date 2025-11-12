# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 0.0.1 (2025-11-12)


### ⚠ BREAKING CHANGES

* None - backward compatible feature addition

### Added

* add AI-powered smart suggestions for development workflows ([#62](https://github.com/rshade/mcp-devtools-server/issues/62)) ([d35cad5](https://github.com/rshade/mcp-devtools-server/commit/d35cad5b8c387e6e76ac069928b11e1d06e8f1e1)), closes [#5](https://github.com/rshade/mcp-devtools-server/issues/5)
* add extensible plugin architecture with git-spice reference plugin ([#79](https://github.com/rshade/mcp-devtools-server/issues/79)) ([0a32f19](https://github.com/rshade/mcp-devtools-server/commit/0a32f193fd6df1c375fc2541ec90c96a08b4610e)), closes [#2](https://github.com/rshade/mcp-devtools-server/issues/2) [#58](https://github.com/rshade/mcp-devtools-server/issues/58)
* add Makefile as thin wrapper around npm scripts ([#94](https://github.com/rshade/mcp-devtools-server/issues/94)) ([f265d30](https://github.com/rshade/mcp-devtools-server/commit/f265d30d9623da0b6980be1dbfb8b14c9139cdb4)), closes [#66](https://github.com/rshade/mcp-devtools-server/issues/66)
* **cache:** complete Phase 3-4 intelligent caching system ([#124](https://github.com/rshade/mcp-devtools-server/issues/124)) ([08aa2c5](https://github.com/rshade/mcp-devtools-server/commit/08aa2c53d32585e320f9718d58871bd32a4d3afb))
* **cache:** complete Phase 4 with comprehensive tests and LintTools integration ([#149](https://github.com/rshade/mcp-devtools-server/issues/149)) ([dd90781](https://github.com/rshade/mcp-devtools-server/commit/dd907819d83eb2611b2b2d3407aa0f8a2cdcdd3b))
* configure Husky pre-commit hooks to prevent broken commits ([#103](https://github.com/rshade/mcp-devtools-server/issues/103)) ([42a1c34](https://github.com/rshade/mcp-devtools-server/commit/42a1c344aa0fe4b8494214b9814a59686de8c454))
* **docker:** add comprehensive Docker support for containerized deployment ([#125](https://github.com/rshade/mcp-devtools-server/issues/125)) ([b95b671](https://github.com/rshade/mcp-devtools-server/commit/b95b671cae2455ab1d75f41e72b75d4fc435fcb4))
* enhance Go language support with P0 tools and improved detection ([#31](https://github.com/rshade/mcp-devtools-server/issues/31)) ([39f305f](https://github.com/rshade/mcp-devtools-server/commit/39f305f0b79456f2c4b6d97b7f83e4dd4bd2d73d))
* implement smart suggestions caching and multi-language support ([#89](https://github.com/rshade/mcp-devtools-server/issues/89)) ([729381c](https://github.com/rshade/mcp-devtools-server/commit/729381c22f3e8467c7ba600a440564b564c51665))
* **mvp:** prepare MVP 0.0.1 release with comprehensive Node.js roadmap ([#170](https://github.com/rshade/mcp-devtools-server/issues/170)) ([79e6f50](https://github.com/rshade/mcp-devtools-server/commit/79e6f50f4b157c3847b4dcaeeb91c3e6db81d68f))
* **nodejs:** add Phase 1 Node.js language support with 6 core tools ([#171](https://github.com/rshade/mcp-devtools-server/issues/171)) ([ccd6193](https://github.com/rshade/mcp-devtools-server/commit/ccd619360256df04f87083244d6f5ff27c978e9b))
* **nodejs:** add Phase 2 Node.js advanced tools (5 new tools) ([#172](https://github.com/rshade/mcp-devtools-server/issues/172)) ([cff1be9](https://github.com/rshade/mcp-devtools-server/commit/cff1be9d040f400588c98536a94e63efc7e685df))
* **nodejs:** add Phase 3 Node.js specialized tools (3 new tools) ([#179](https://github.com/rshade/mcp-devtools-server/issues/179)) ([0239e45](https://github.com/rshade/mcp-devtools-server/commit/0239e45ffb31d7286a2ba78f54c5e250487c1ddf))
* **onboarding:** implement zero-configuration onboarding wizard ([#75](https://github.com/rshade/mcp-devtools-server/issues/75)) ([39840af](https://github.com/rshade/mcp-devtools-server/commit/39840afa0880e062409f1366c60055dd54648297))
* **plugins:** complete plugin architecture with multi-location discovery and documentation ([#95](https://github.com/rshade/mcp-devtools-server/issues/95)) ([865e72c](https://github.com/rshade/mcp-devtools-server/commit/865e72cb8f7d0bf4c446461de0a5ca6c53db465d))
* **server:** add system prompt instructions for tool discoverability ([#176](https://github.com/rshade/mcp-devtools-server/issues/176)) ([8ddc70b](https://github.com/rshade/mcp-devtools-server/commit/8ddc70b12d132c5787b2b1ca8a52223cda5f8864))


### Fixed

* **ci:** correct docker.yml YAML syntax and release-please config ([#187](https://github.com/rshade/mcp-devtools-server/issues/187)) ([7e4002b](https://github.com/rshade/mcp-devtools-server/commit/7e4002b54e21d17afd94077dba0e48d60831c97c))
* **deps:** update dependency execa to v9 ([#17](https://github.com/rshade/mcp-devtools-server/issues/17)) ([3e4cdb9](https://github.com/rshade/mcp-devtools-server/commit/3e4cdb940063c6310e959b2510b3f09e4151880b))
* **deps:** update dependency glob to v11 ([#18](https://github.com/rshade/mcp-devtools-server/issues/18)) ([58f3a48](https://github.com/rshade/mcp-devtools-server/commit/58f3a48cbbe502a686a22107bab0b20bb88cb909))
* **release:** configure release-please for 0.0.1 MVP release ([#189](https://github.com/rshade/mcp-devtools-server/issues/189)) ([649898a](https://github.com/rshade/mcp-devtools-server/commit/649898a13acfb8ec6c679b7b5b96fc88ae879193))


### Documentation

* add comprehensive JSDoc documentation to smart suggestions APIs ([#80](https://github.com/rshade/mcp-devtools-server/issues/80)) ([529d821](https://github.com/rshade/mcp-devtools-server/commit/529d821386d04b7e047f98e2375ac4b311a2047d)), closes [#59](https://github.com/rshade/mcp-devtools-server/issues/59)
* clarify Docker plugin example as illustrative pseudocode ([#123](https://github.com/rshade/mcp-devtools-server/issues/123)) ([f09d5ce](https://github.com/rshade/mcp-devtools-server/commit/f09d5ceb47708f34bc6a3201dde7013bcf892af4))
* fixing dead links ([#117](https://github.com/rshade/mcp-devtools-server/issues/117)) ([1d49079](https://github.com/rshade/mcp-devtools-server/commit/1d4907965067702458cc1f1dd9e9be7beccbbd83))
* fixing dead links ([#117](https://github.com/rshade/mcp-devtools-server/issues/117)) ([#122](https://github.com/rshade/mcp-devtools-server/issues/122)) ([1088706](https://github.com/rshade/mcp-devtools-server/commit/108870698a2167a75ea08c8b0490e97a040e0b0e))
* updating documentation for release ([#186](https://github.com/rshade/mcp-devtools-server/issues/186)) ([fe2ff0b](https://github.com/rshade/mcp-devtools-server/commit/fe2ff0be6bd98ad7963cd2b29357707b042af830))
* updating for eol ([#51](https://github.com/rshade/mcp-devtools-server/issues/51)) ([7eda281](https://github.com/rshade/mcp-devtools-server/commit/7eda28109525709ea8e8f490a9af36edb99ffa92))

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
