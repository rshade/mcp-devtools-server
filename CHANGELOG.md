# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
