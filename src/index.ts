#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import winston from 'winston';

// Import tool classes
import { MakeTools, MakeToolResponse, MakeStatusResponse } from './tools/make-tools.js';
import { LintTools, LintResult, LintSummary } from './tools/lint-tools.js';
import { TestTools, TestResult, ProjectTestStatus } from './tools/test-tools.js';
import { GoTools, GoToolResult, GoProjectInfo } from './tools/go-tools.js';
import { FileValidationTools, EnsureNewlineResult } from './tools/file-validation-tools.js';
import { ActionlintTools, ActionlintResult } from './tools/actionlint-tools.js';
import { GitTools, CodeReviewResult, PRMessageResult } from './tools/git-tools.js';
import { SmartSuggestionsTools, AnalyzeCommandResult, AnalyzeResultResult, KnowledgeBaseStatsResult, RecommendMCPServersResult } from './tools/smart-suggestions-tools.js';

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Server configuration
const SERVER_NAME = 'mcp-devtools-server';
const SERVER_VERSION = '1.0.0';

class MCPDevToolsServer {
  private server: Server;
  private makeTools: MakeTools;
  private lintTools: LintTools;
  private testTools: TestTools;
  private goTools: GoTools;
  private fileValidationTools: FileValidationTools;
  private actionlintTools: ActionlintTools;
  private gitTools: GitTools;
  private smartSuggestionsTools: SmartSuggestionsTools;

  constructor() {
    this.server = new Server(
      {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize tool classes
    const projectRoot = process.cwd();
    this.makeTools = new MakeTools(projectRoot);
    this.lintTools = new LintTools(projectRoot);
    this.testTools = new TestTools(projectRoot);
    this.goTools = new GoTools(projectRoot);
    this.fileValidationTools = new FileValidationTools();
    this.actionlintTools = new ActionlintTools(projectRoot);
    this.gitTools = new GitTools(projectRoot);
    this.smartSuggestionsTools = new SmartSuggestionsTools(projectRoot);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Make tools
          {
            name: 'make_lint',
            description: 'Run make lint command to check code style and quality',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the make command',
                },
                target: {
                  type: 'string',
                  description: 'Specific make target to run (defaults to "lint")',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to make',
                },
                parallel: {
                  type: 'number',
                  minimum: 1,
                  maximum: 16,
                  description: 'Number of parallel jobs (-j flag)',
                },
              },
            },
          },
          {
            name: 'make_test',
            description: 'Run make test command to execute project tests',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the make command',
                },
                target: {
                  type: 'string',
                  description: 'Specific make target to run (defaults to "test")',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to make',
                },
                parallel: {
                  type: 'number',
                  minimum: 1,
                  maximum: 16,
                  description: 'Number of parallel jobs (-j flag)',
                },
              },
            },
          },
          {
            name: 'make_depend',
            description: 'Run make depend command to install or update dependencies',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the make command',
                },
                target: {
                  type: 'string',
                  description: 'Specific make target to run (defaults to "depend")',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to make',
                },
                parallel: {
                  type: 'number',
                  minimum: 1,
                  maximum: 16,
                  description: 'Number of parallel jobs (-j flag)',
                },
              },
            },
          },
          {
            name: 'make_build',
            description: 'Run make build command to build the project',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the make command',
                },
                target: {
                  type: 'string',
                  description: 'Specific make target to run (defaults to "build")',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to make',
                },
                parallel: {
                  type: 'number',
                  minimum: 1,
                  maximum: 16,
                  description: 'Number of parallel jobs (-j flag)',
                },
              },
            },
          },
          {
            name: 'make_clean',
            description: 'Run make clean command to clean build artifacts',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the make command',
                },
                target: {
                  type: 'string',
                  description: 'Specific make target to run (defaults to "clean")',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to make',
                },
                parallel: {
                  type: 'number',
                  minimum: 1,
                  maximum: 16,
                  description: 'Number of parallel jobs (-j flag)',
                },
              },
            },
          },

          // Lint tools
          {
            name: 'markdownlint',
            description: 'Run markdownlint on markdown files',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the lint command',
                },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific files to lint (glob patterns supported)',
                },
                fix: {
                  type: 'boolean',
                  description: 'Automatically fix issues where possible',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to markdownlint',
                },
              },
            },
          },
          {
            name: 'yamllint',
            description: 'Run yamllint on YAML files',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the lint command',
                },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific files to lint (glob patterns supported)',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to yamllint',
                },
              },
            },
          },
          {
            name: 'commitlint',
            description: 'Run commitlint to validate commit messages',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the lint command',
                },
                message: {
                  type: 'string',
                  description: 'Specific commit message to validate',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to commitlint',
                },
              },
            },
          },
          {
            name: 'eslint',
            description: 'Run ESLint on JavaScript/TypeScript files',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the lint command',
                },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific files to lint (glob patterns supported)',
                },
                fix: {
                  type: 'boolean',
                  description: 'Automatically fix issues where possible',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to ESLint',
                },
              },
            },
          },
          {
            name: 'lint_all',
            description: 'Run all available linters based on project type',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the lint commands',
                },
                fix: {
                  type: 'boolean',
                  description: 'Automatically fix issues where possible',
                },
              },
            },
          },

          // Test tools
          {
            name: 'run_tests',
            description: 'Run tests using the detected test framework',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the test command',
                },
                pattern: {
                  type: 'string',
                  description: 'Test file pattern or specific test to run',
                },
                coverage: {
                  type: 'boolean',
                  description: 'Generate test coverage report',
                },
                watch: {
                  type: 'boolean',
                  description: 'Run tests in watch mode',
                },
                parallel: {
                  type: 'boolean',
                  description: 'Run tests in parallel when supported',
                },
                timeout: {
                  type: 'number',
                  description: 'Test timeout in milliseconds',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments to pass to the test runner',
                },
              },
            },
          },

          // Go-specific tools
          {
            name: 'go_test',
            description: 'Run Go tests with coverage and race detection',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the command',
                },
                package: {
                  type: 'string',
                  description: 'Go package to test (e.g., ./...)',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                },
                race: {
                  type: 'boolean',
                  description: 'Enable race condition detection',
                },
                cover: {
                  type: 'boolean',
                  description: 'Enable coverage analysis',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Build tags to include',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
              },
            },
          },
          {
            name: 'go_build',
            description: 'Build Go packages with cross-compilation and custom build flags support',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the command',
                },
                package: {
                  type: 'string',
                  description: 'Go package to build',
                },
                output: {
                  type: 'string',
                  description: 'Output binary path',
                },
                ldflags: {
                  type: 'string',
                  description: 'Link flags to pass to the linker (e.g., -X main.version=1.0.0)',
                },
                buildFlags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional build flags',
                },
                goos: {
                  type: 'string',
                  description: 'Target operating system (linux, darwin, windows, etc.)',
                },
                goarch: {
                  type: 'string',
                  description: 'Target architecture (amd64, arm64, 386, etc.)',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                },
                race: {
                  type: 'boolean',
                  description: 'Enable race condition detection',
                },
                tags: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Build tags to include',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
                timeout: {
                  type: 'number',
                  description: 'Command timeout in milliseconds',
                },
              },
            },
          },
          {
            name: 'go_fmt',
            description: 'Format Go code using gofmt',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                write: {
                  type: 'boolean',
                  description: 'Write changes to files',
                },
                simplify: {
                  type: 'boolean',
                  description: 'Simplify code',
                },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific files to format',
                },
              },
            },
          },
          {
            name: 'go_lint',
            description: 'Lint Go code using golangci-lint with comprehensive configuration options',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                config: {
                  type: 'string',
                  description: 'Path to golangci-lint config file (.golangci.yml)',
                },
                fix: {
                  type: 'boolean',
                  description: 'Fix issues automatically where possible',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                },
                format: {
                  type: 'string',
                  description: 'Output format (colored-line-number, line-number, json, tab, checkstyle, code-climate, html, junitxml, github-actions)',
                },
                concurrency: {
                  type: 'number',
                  minimum: 1,
                  maximum: 32,
                  description: 'Number of CPUs to use for linting',
                },
                timeout: {
                  type: 'number',
                  minimum: 1,
                  maximum: 3600,
                  description: 'Timeout for linting in seconds',
                },
                enabledLinters: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific linters to enable (e.g., golint, gofmt, ineffassign)',
                },
                disabledLinters: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific linters to disable',
                },
                paths: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific paths or packages to lint (defaults to ./...)',
                },
              },
            },
          },
          {
            name: 'go_vet',
            description: 'Examine Go source code and report suspicious constructs',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                package: {
                  type: 'string',
                  description: 'Go package to vet (e.g., ./...)',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
              },
            },
          },
          {
            name: 'go_mod_tidy',
            description: 'Tidy Go module dependencies',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                },
              },
            },
          },
          {
            name: 'go_mod_download',
            description: 'Download Go module dependencies',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
              },
            },
          },
          {
            name: 'staticcheck',
            description: 'Run staticcheck for enhanced Go static analysis',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                package: {
                  type: 'string',
                  description: 'Go package to analyze (e.g., ./...)',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
              },
            },
          },
          {
            name: 'go_benchmark',
            description: 'Run Go benchmarks to measure code performance',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                package: {
                  type: 'string',
                  description: 'Go package to benchmark (e.g., ./...)',
                },
                benchmarks: {
                  type: 'string',
                  description: 'Benchmark pattern to run (e.g., BenchmarkFoo)',
                },
                benchtime: {
                  type: 'string',
                  description: 'Benchmark duration (e.g., 10s, 100x)',
                },
                benchmem: {
                  type: 'boolean',
                  description: 'Print memory allocation statistics',
                },
                cpu: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'CPU counts to test (e.g., [1, 2, 4])',
                },
                count: {
                  type: 'number',
                  description: 'Run each benchmark n times',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
                timeout: {
                  type: 'number',
                  description: 'Command timeout in milliseconds',
                },
              },
            },
          },
          {
            name: 'go_generate',
            description: 'Run go generate to execute code generation directives',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                package: {
                  type: 'string',
                  description: 'Go package to run generate on (e.g., ./...)',
                },
                run: {
                  type: 'string',
                  description: 'Only run generate directives matching this regex',
                },
                skip: {
                  type: 'string',
                  description: 'Skip generate directives matching this regex',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                },
                dryRun: {
                  type: 'boolean',
                  description: 'Print commands without running them',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
                timeout: {
                  type: 'number',
                  description: 'Command timeout in milliseconds',
                },
              },
            },
          },
          {
            name: 'go_work',
            description: 'Manage Go workspaces (go.work files)',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                command: {
                  type: 'string',
                  enum: ['init', 'use', 'sync', 'edit'],
                  description: 'Workspace command: init (create), use (add modules), sync (sync deps), edit (edit go.work)',
                },
                modules: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Module paths for use command',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
              },
              required: ['command'],
            },
          },
          {
            name: 'go_vulncheck',
            description: 'Scan for known vulnerabilities using govulncheck',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                package: {
                  type: 'string',
                  description: 'Go package or binary path to check',
                },
                mode: {
                  type: 'string',
                  enum: ['source', 'binary'],
                  description: 'Analysis mode: source (analyze source code) or binary (analyze compiled binary)',
                },
                json: {
                  type: 'boolean',
                  description: 'Output results in JSON format',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
                timeout: {
                  type: 'number',
                  description: 'Command timeout in milliseconds',
                },
              },
            },
          },
          {
            name: 'go_project_info',
            description: 'Get comprehensive Go project information and analysis',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory to analyze',
                },
              },
            },
          },

          // Status and analysis tools
          {
            name: 'project_status',
            description: 'Get overall project health and available make targets',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory to analyze',
                },
              },
            },
          },
          {
            name: 'test_status',
            description: 'Get project test status and recommendations',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory to analyze',
                },
              },
            },
          },

          // GitHub Actions validation
          {
            name: 'actionlint',
            description: 'Validate GitHub Actions workflow files for syntax errors, invalid parameters, and best practices',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the command',
                },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific workflow files to lint (supports glob patterns)',
                },
                format: {
                  type: 'string',
                  enum: ['default', 'json', 'sarif'],
                  description: 'Output format for validation results',
                },
                shellcheck: {
                  type: 'boolean',
                  description: 'Enable shellcheck integration for run: blocks (default: true)',
                },
                pyflakes: {
                  type: 'boolean',
                  description: 'Enable pyflakes for Python run: blocks (default: false)',
                },
                verbose: {
                  type: 'boolean',
                  description: 'Enable verbose output',
                },
                color: {
                  type: 'boolean',
                  description: 'Enable colored output',
                },
                noColor: {
                  type: 'boolean',
                  description: 'Disable colored output',
                },
                ignore: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Ignore rules by glob pattern',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional arguments',
                },
                timeout: {
                  type: 'number',
                  description: 'Command timeout in milliseconds',
                },
              },
            },
          },

          // File validation tools
          {
            name: 'ensure_newline',
            description: 'Validate and fix POSIX newline compliance. Checks if files end with proper ' +
              'newline characters. Modes: check (report only), fix (auto-correct), ' +
              'validate (error if non-compliant for CI/CD).',
            inputSchema: {
              type: 'object',
              properties: {
                patterns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Glob patterns for files to check (e.g., [\'src/**/*.ts\', \'*.md\'])',
                },
                mode: {
                  type: 'string',
                  enum: ['check', 'fix', 'validate'],
                  description: 'check=report only, fix=auto-correct, validate=error if non-compliant',
                },
                exclude: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Patterns to exclude (e.g., [\'node_modules/**\', \'*.min.js\'])',
                },
                fileTypes: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'File types to process (e.g., [\'*.ts\', \'*.go\', \'*.md\'])',
                },
                cwd: {
                  type: 'string',
                  description: 'Working directory (defaults to project root)',
                },
                skipBinary: {
                  type: 'boolean',
                  description: 'Skip binary files automatically (default: true)',
                },
                maxFileSizeMB: {
                  type: 'number',
                  description: 'Maximum file size to process in MB (default: 10)',
                },
              },
              required: ['patterns', 'mode'],
            },
          },

          // Git and Code Review tools
          {
            name: 'code_review',
            description: 'Perform automated code review analysis on Git changes',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the command',
                },
                base: {
                  type: 'string',
                  description: 'Base branch to compare against (default: main)',
                },
                includeTests: {
                  type: 'boolean',
                  description: 'Include test files in review',
                },
                maxFiles: {
                  type: 'number',
                  description: 'Maximum number of files to review',
                },
                focus: {
                  type: 'string',
                  enum: ['security', 'performance', 'maintainability', 'all'],
                  description: 'Focus area for review',
                },
              },
            },
          },
          {
            name: 'generate_pr_message',
            description: 'Generate a PR message based on Git changes',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the command',
                },
                base: {
                  type: 'string',
                  description: 'Base branch to compare against (default: main)',
                },
                type: {
                  type: 'string',
                  enum: ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore'],
                  description: 'Commit type (conventional commits)',
                },
                scope: {
                  type: 'string',
                  description: 'Commit scope',
                },
                includeBreaking: {
                  type: 'boolean',
                  description: 'Include breaking changes section',
                },
                includeIssue: {
                  type: 'string',
                  description: 'Issue number to reference (e.g., "123")',
                },
                useTemplate: {
                  type: 'boolean',
                  description: 'Use GitHub PR template if available (default: true)',
                },
              },
            },
          },

          // Smart Suggestions tools
          {
            name: 'analyze_command',
            description: 'Execute a command and analyze the result with AI-powered smart suggestions. Provides intelligent recommendations for fixing failures, optimizing workflows, and identifying issues.',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'Command to execute and analyze',
                },
                directory: {
                  type: 'string',
                  description: 'Working directory for the command',
                },
                timeout: {
                  type: 'number',
                  description: 'Command timeout in milliseconds',
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional command arguments',
                },
                context: {
                  type: 'object',
                  properties: {
                    tool: {
                      type: 'string',
                      description: 'Tool being used (e.g., "go test", "npm run")',
                    },
                    language: {
                      type: 'string',
                      description: 'Programming language',
                    },
                    projectType: {
                      type: 'string',
                      description: 'Project type',
                    },
                  },
                  description: 'Additional context for better suggestions',
                },
              },
              required: ['command'],
            },
          },
          {
            name: 'analyze_result',
            description: 'Analyze an already-executed command result and generate smart suggestions. Useful for post-mortem analysis and understanding failures.',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'Command that was executed',
                },
                exitCode: {
                  type: 'number',
                  description: 'Exit code from command execution',
                },
                stdout: {
                  type: 'string',
                  description: 'Standard output from command',
                },
                stderr: {
                  type: 'string',
                  description: 'Standard error from command',
                },
                duration: {
                  type: 'number',
                  description: 'Execution duration in milliseconds',
                },
                context: {
                  type: 'object',
                  properties: {
                    tool: {
                      type: 'string',
                      description: 'Tool being used',
                    },
                    language: {
                      type: 'string',
                      description: 'Programming language',
                    },
                    projectType: {
                      type: 'string',
                      description: 'Project type',
                    },
                  },
                  description: 'Additional context for better suggestions',
                },
              },
              required: ['command', 'exitCode'],
            },
          },
          {
            name: 'get_knowledge_base_stats',
            description: 'Get statistics about the smart suggestions knowledge base, including total patterns and categorization.',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Filter by category (security, performance, maintainability, etc.)',
                },
              },
            },
          },
          {
            name: 'recommend_mcp_servers',
            description: 'Get intelligent recommendations for best-practice MCP servers based on project context. Suggests MCP servers like Sequential Thinking, Context7, Playwright, and others.',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Filter by category (development, testing, documentation, ai, database, filesystem, web, productivity)',
                },
                priority: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                  description: 'Filter by priority level',
                },
                useCase: {
                  type: 'string',
                  description: 'Specific use case (e.g., "testing", "database", "browser automation")',
                },
                includeConfig: {
                  type: 'boolean',
                  description: 'Include .mcp.json configuration example (default: false)',
                },
              },
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          // Make tools
          case 'make_lint': {
            const validatedArgs = MakeTools.validateArgs(args);
            const result = await this.makeTools.makeLint(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatToolResult('Make Lint', result),
                },
              ],
            };
          }

          case 'make_test': {
            const validatedArgs = MakeTools.validateArgs(args);
            const result = await this.makeTools.makeTest(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatToolResult('Make Test', result),
                },
              ],
            };
          }

          case 'make_depend': {
            const validatedArgs = MakeTools.validateArgs(args);
            const result = await this.makeTools.makeDepend(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatToolResult('Make Depend', result),
                },
              ],
            };
          }

          case 'make_build': {
            const validatedArgs = MakeTools.validateArgs(args);
            const result = await this.makeTools.makeBuild(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatToolResult('Make Build', result),
                },
              ],
            };
          }

          case 'make_clean': {
            const validatedArgs = MakeTools.validateArgs(args);
            const result = await this.makeTools.makeClean(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatToolResult('Make Clean', result),
                },
              ],
            };
          }

          // Lint tools
          case 'markdownlint': {
            const validatedArgs = LintTools.validateArgs(args);
            const result = await this.lintTools.markdownlint(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatLintResult('Markdownlint', result),
                },
              ],
            };
          }

          case 'yamllint': {
            const validatedArgs = LintTools.validateArgs(args);
            const result = await this.lintTools.yamllint(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatLintResult('YAML Lint', result),
                },
              ],
            };
          }

          case 'commitlint': {
            const validatedArgs = LintTools.validateArgs(args);
            const result = await this.lintTools.commitlint(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatLintResult('Commitlint', result),
                },
              ],
            };
          }

          case 'eslint': {
            const validatedArgs = LintTools.validateArgs(args);
            const result = await this.lintTools.eslint(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatLintResult('ESLint', result),
                },
              ],
            };
          }

          case 'lint_all': {
            const validatedArgs = LintTools.validateArgs(args);
            const result = await this.lintTools.lintAll(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatLintSummary(result),
                },
              ],
            };
          }

          // Test tools
          case 'run_tests': {
            const validatedArgs = TestTools.validateArgs(args);
            const result = await this.testTools.runTests(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatTestResult('Test Run', result),
                },
              ],
            };
          }

          // Status tools
          case 'project_status': {
            const result = await this.makeTools.getProjectStatus();
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatProjectStatus(result),
                },
              ],
            };
          }

          case 'test_status': {
            const validatedArgs = TestTools.validateStatusArgs(args);
            const result = await this.testTools.getProjectTestStatus(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatTestStatus(result),
                },
              ],
            };
          }

          // Go tools
          case 'go_test': {
            const validatedArgs = GoTools.validateArgs(args);
            const result = await this.goTools.goTest(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Test', result),
                },
              ],
            };
          }

          case 'go_build': {
            const validatedArgs = GoTools.validateBuildArgs(args);
            const result = await this.goTools.goBuild(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Build', result),
                },
              ],
            };
          }

          case 'go_fmt': {
            const validatedArgs = GoTools.validateFormatArgs(args);
            const result = await this.goTools.goFormat(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Format', result),
                },
              ],
            };
          }

          case 'go_lint': {
            const validatedArgs = GoTools.validateLintArgs(args);
            const result = await this.goTools.goLint(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Lint', result),
                },
              ],
            };
          }

          case 'go_vet': {
            const validatedArgs = GoTools.validateArgs(args);
            const result = await this.goTools.goVet(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Vet', result),
                },
              ],
            };
          }

          case 'go_mod_tidy': {
            const validatedArgs = GoTools.validateArgs(args);
            const result = await this.goTools.goModTidy(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Mod Tidy', result),
                },
              ],
            };
          }

          case 'go_mod_download': {
            const validatedArgs = GoTools.validateArgs(args);
            const result = await this.goTools.goModDownload(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Mod Download', result),
                },
              ],
            };
          }

          case 'staticcheck': {
            const validatedArgs = GoTools.validateArgs(args);
            const result = await this.goTools.staticCheck(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Staticcheck', result),
                },
              ],
            };
          }

          case 'go_benchmark': {
            const validatedArgs = GoTools.validateBenchmarkArgs(args);
            const result = await this.goTools.goBenchmark(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Benchmark', result),
                },
              ],
            };
          }

          case 'go_generate': {
            const validatedArgs = GoTools.validateGenerateArgs(args);
            const result = await this.goTools.goGenerate(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Generate', result),
                },
              ],
            };
          }

          case 'go_work': {
            const validatedArgs = GoTools.validateWorkArgs(args);
            const result = await this.goTools.goWork(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Work', result),
                },
              ],
            };
          }

          case 'go_vulncheck': {
            const validatedArgs = GoTools.validateVulncheckArgs(args);
            const result = await this.goTools.goVulncheck(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoResult('Go Vulncheck', result),
                },
              ],
            };
          }

          case 'go_project_info': {
            const directory = (args?.directory as string) || process.cwd();
            const result = await this.goTools.getProjectInfo(directory);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatGoProjectInfo(result),
                },
              ],
            };
          }

          // GitHub Actions validation
          case 'actionlint': {
            const validatedArgs = ActionlintTools.validateArgs(args);
            const result = await this.actionlintTools.actionlint(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatActionlintResult(result),
                },
              ],
            };
          }

          // File validation tools
          case 'ensure_newline': {
            const result = await this.fileValidationTools.ensureNewline(args as never);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatEnsureNewlineResult(result),
                },
              ],
            };
          }

          // Git and Code Review tools
          case 'code_review': {
            const validatedArgs = GitTools.validateCodeReviewArgs(args);
            const result = await this.gitTools.codeReview(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatCodeReviewResult(result),
                },
              ],
            };
          }

          case 'generate_pr_message': {
            const validatedArgs = GitTools.validatePRMessageArgs(args);
            const result = await this.gitTools.generatePRMessage(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatPRMessageResult(result),
                },
              ],
            };
          }

          // Smart Suggestions tools
          case 'analyze_command': {
            const validatedArgs = SmartSuggestionsTools.validateAnalyzeCommandArgs(args);
            const result = await this.smartSuggestionsTools.analyzeCommand(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatAnalyzeCommandResult(result),
                },
              ],
            };
          }

          case 'analyze_result': {
            const validatedArgs = SmartSuggestionsTools.validateAnalyzeResultArgs(args);
            const result = await this.smartSuggestionsTools.analyzeResult(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatAnalyzeResultResult(result),
                },
              ],
            };
          }

          case 'get_knowledge_base_stats': {
            const validatedArgs = SmartSuggestionsTools.validateGetKnowledgeBaseStatsArgs(args);
            const result = await this.smartSuggestionsTools.getKnowledgeBaseStats(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatKnowledgeBaseStatsResult(result),
                },
              ],
            };
          }

          case 'recommend_mcp_servers': {
            const validatedArgs = SmartSuggestionsTools.validateRecommendMCPServersArgs(args);
            const result = await this.smartSuggestionsTools.recommendMCPServers(validatedArgs);
            return {
              content: [
                {
                  type: 'text',
                  text: this.formatRecommendMCPServersResult(result),
                },
              ],
            };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${
                error instanceof Error ? error.message : 'Unknown error'
              }`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private formatToolResult(toolName: string, result: MakeToolResponse): string {
    let output = `## ${toolName} Results\n\n`;
    output += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    output += `**Duration:** ${result.duration}ms\n\n`;
    
    if (result.target) {
      output += `**Target:** ${result.target}\n\n`;
    }
    
    if (result.output) {
      output += `**Output:**\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
    }
    
    if (result.error) {
      output += `**Error:** ${result.error}\n\n`;
    }
    
    if (result.suggestions && result.suggestions.length > 0) {
      output += `**Suggestions:**\n`;
      for (const suggestion of result.suggestions) {
        output += `- ${suggestion}\n`;
      }
    }
    
    return output;
  }

  private formatLintResult(toolName: string, result: LintResult): string {
    let output = `## ${toolName} Results\n\n`;
    output += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    output += `**Files Checked:** ${result.filesChecked}\n`;
    output += `**Issues Found:** ${result.issuesFound}\n`;
    
    if (result.issuesFixed) {
      output += `**Issues Fixed:** ${result.issuesFixed}\n`;
    }
    
    output += `**Duration:** ${result.duration}ms\n\n`;
    
    if (result.output) {
      output += `**Output:**\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
    }
    
    if (result.error) {
      output += `**Error:** ${result.error}\n\n`;
    }
    
    if (result.suggestions && result.suggestions.length > 0) {
      output += `**Suggestions:**\n`;
      for (const suggestion of result.suggestions) {
        output += `- ${suggestion}\n`;
      }
    }
    
    return output;
  }

  private formatLintSummary(result: LintSummary): string {
    let output = `## Lint Summary\n\n`;
    output += `**Overall Status:** ${result.overallSuccess ? '✅ All Passed' : '❌ Issues Found'}\n`;
    output += `**Total Issues:** ${result.totalIssues}\n`;
    
    if (result.totalFixed > 0) {
      output += `**Total Fixed:** ${result.totalFixed}\n`;
    }
    
    output += `\n### Individual Results\n\n`;
    
    for (const lintResult of result.results) {
      output += `**${lintResult.tool}:** ${lintResult.success ? '✅' : '❌'} `;
      output += `(${lintResult.filesChecked} files, ${lintResult.issuesFound} issues)\n`;
    }
    
    if (result.recommendations && result.recommendations.length > 0) {
      output += `\n### Recommendations\n\n`;
      for (const rec of result.recommendations) {
        output += `- ${rec}\n`;
      }
    }
    
    return output;
  }

  private formatTestResult(toolName: string, result: TestResult): string {
    let output = `## ${toolName} Results\n\n`;
    output += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    output += `**Runner:** ${result.runner}\n`;
    output += `**Tests Run:** ${result.testsRun}\n`;
    output += `**Tests Passed:** ${result.testsPassed}\n`;
    output += `**Tests Failed:** ${result.testsFailed}\n`;
    
    if (result.testsSkipped > 0) {
      output += `**Tests Skipped:** ${result.testsSkipped}\n`;
    }
    
    output += `**Duration:** ${result.duration}ms\n\n`;
    
    if (result.coverage) {
      output += `**Coverage:** ${result.coverage.percentage}%\n\n`;
    }
    
    if (result.output) {
      output += `**Output:**\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
    }
    
    if (result.error) {
      output += `**Error:** ${result.error}\n\n`;
    }
    
    if (result.suggestions && result.suggestions.length > 0) {
      output += `**Suggestions:**\n`;
      for (const suggestion of result.suggestions) {
        output += `- ${suggestion}\n`;
      }
    }
    
    return output;
  }

  private formatProjectStatus(result: MakeStatusResponse): string {
    let output = `## Project Status\n\n`;
    output += `**Has Makefile:** ${result.hasMakefile ? '✅ Yes' : '❌ No'}\n\n`;
    
    if (result.makefileLocation) {
      output += `**Makefile Location:** ${result.makefileLocation}\n\n`;
    }
    
    if (result.availableTargets.length > 0) {
      output += `**Available Make Targets:**\n`;
      for (const target of result.availableTargets) {
        output += `- ${target}\n`;
      }
      output += `\n`;
    }
    
    if (result.recommendedTargets.length > 0) {
      output += `**Recommended Targets:**\n`;
      for (const target of result.recommendedTargets) {
        output += `- ${target}\n`;
      }
      output += `\n`;
    }
    
    output += `**Project Context:**\n\`\`\`\n${result.projectContext}\n\`\`\`\n`;
    
    return output;
  }

  private formatTestStatus(result: ProjectTestStatus): string {
    let output = `## Test Status\n\n`;
    output += `**Has Tests:** ${result.hasTests ? '✅ Yes' : '❌ No'}\n`;
    
    if (result.testFramework) {
      output += `**Test Framework:** ${result.testFramework}\n`;
    }
    
    output += `**Test Files Found:** ${result.testFiles.length}\n`;
    output += `**Test Directories:** ${result.testDirectories.length}\n\n`;
    
    if (result.configFiles.length > 0) {
      output += `**Test Config Files:**\n`;
      for (const config of result.configFiles) {
        output += `- ${config}\n`;
      }
      output += `\n`;
    }
    
    if (result.recommendations.length > 0) {
      output += `**Recommendations:**\n`;
      for (const rec of result.recommendations) {
        output += `- ${rec}\n`;
      }
    }
    
    return output;
  }

  private formatGoResult(toolName: string, result: GoToolResult): string {
    let output = `## ${toolName} Results\n\n`;
    output += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    output += `**Duration:** ${result.duration}ms\n`;

    if (result.coverage !== undefined) {
      output += `**Coverage:** ${result.coverage}%\n`;
    }

    output += `\n`;

    if (result.output) {
      output += `**Output:**\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
    }

    if (result.error) {
      output += `**Error:** ${result.error}\n\n`;
    }

    if (result.suggestions && result.suggestions.length > 0) {
      output += `**Suggestions:**\n`;
      for (const suggestion of result.suggestions) {
        output += `- ${suggestion}\n`;
      }
    }

    return output;
  }

  private formatActionlintResult(result: ActionlintResult): string {
    let output = `## Actionlint Results\n\n`;
    output += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    output += `**Files Checked:** ${result.filesChecked}\n`;
    output += `**Issues Found:** ${result.issuesFound}\n`;
    output += `**Duration:** ${result.duration}ms\n\n`;

    if (result.output) {
      output += `**Output:**\n\`\`\`\n${result.output}\n\`\`\`\n\n`;
    }

    if (result.error) {
      output += `**Error:** ${result.error}\n\n`;
    }

    if (result.suggestions && result.suggestions.length > 0) {
      output += `**Suggestions:**\n`;
      for (const suggestion of result.suggestions) {
        output += `- ${suggestion}\n`;
      }
      output += `\n`;
    }

    return output;
  }

  private formatEnsureNewlineResult(result: EnsureNewlineResult): string {
    let output = `## EOL Validation Results\n\n`;
    output += `**Status:** ${result.exitCode === 0 ? '✅ Success' : result.exitCode === 1 ? '⚠️  Non-compliant files found' : '❌ Errors occurred'}\n`;
    output += `**Summary:** ${result.summary}\n\n`;

    output += `**Files Checked:** ${result.totalFiles}\n`;
    output += `**Files Without Newline:** ${result.filesWithoutNewline.length}\n`;

    if (result.filesFixed.length > 0) {
      output += `**Files Fixed:** ${result.filesFixed.length}\n`;
    }

    if (result.filesSkipped.length > 0) {
      output += `**Files Skipped:** ${result.filesSkipped.length}\n`;
    }

    output += `\n`;

    if (result.filesWithoutNewline.length > 0) {
      output += `**Files Without Trailing Newlines:**\n`;
      for (const file of result.filesWithoutNewline) {
        output += `- ${file}\n`;
      }
      output += `\n`;
    }

    if (result.filesFixed.length > 0) {
      output += `**Files Fixed:**\n`;
      for (const file of result.filesFixed) {
        output += `- ${file}\n`;
      }
      output += `\n`;
    }

    if (result.filesSkipped.length > 0 && result.filesSkipped.length <= 10) {
      output += `**Files Skipped:**\n`;
      for (const skip of result.filesSkipped) {
        output += `- ${skip.file} (${skip.reason})\n`;
      }
      output += `\n`;
    }

    if (result.errors.length > 0) {
      output += `**Errors:**\n`;
      for (const error of result.errors) {
        output += `- ${error.file}: ${error.error}\n`;
      }
      output += `\n`;
    }

    return output;
  }

  private formatGoProjectInfo(info: GoProjectInfo): string {
    let output = `## Go Project Information\n\n`;
    
    // Basic project info
    output += `**Go Module:** ${info.hasGoMod ? '✅ Yes' : '❌ No'}\n`;
    if (info.moduleName) {
      output += `**Module Name:** ${info.moduleName}\n`;
    }
    if (info.goVersion) {
      output += `**Go Version:** ${info.goVersion}\n`;
    }
    
    // Workspace info
    if (info.hasGoWork) {
      output += `**Go Workspace:** ✅ Yes\n`;
      if (info.workspaces && info.workspaces.length > 0) {
        output += `**Workspace Modules:** ${info.workspaces.join(', ')}\n`;
      }
    }
    
    // Vendor mode
    if (info.vendorMode) {
      output += `**Vendor Mode:** ✅ Enabled\n`;
    }
    
    output += `\n`;
    
    // Package and test info
    output += `**Packages Found:** ${info.packages.length}\n`;
    output += `**Has Tests:** ${info.hasTests ? '✅ Yes' : '❌ No'}\n`;
    output += `**Test Files:** ${info.testFiles.length}\n`;
    
    if (info.hasMain && info.mainPackages) {
      output += `**Main Packages:** ${info.mainPackages.length}\n`;
      if (info.mainPackages.length > 0) {
        output += `  - ${info.mainPackages.join('\n  - ')}\n`;
      }
    }
    
    output += `\n`;
    
    // Build tools and configs
    if (info.buildTools && info.buildTools.length > 0) {
      output += `**Build Tools Found:**\n`;
      for (const tool of info.buildTools) {
        output += `  - ${tool}\n`;
      }
      output += `\n`;
    }
    
    if (info.lintConfigs && info.lintConfigs.length > 0) {
      output += `**Lint Configurations:**\n`;
      for (const config of info.lintConfigs) {
        output += `  - ${config}\n`;
      }
      output += `\n`;
    }
    
    // Platform info
    if (info.targetOS && info.targetOS.length > 0) {
      output += `**Target OS:** ${info.targetOS.join(', ')}\n`;
    }
    if (info.targetArch && info.targetArch.length > 0) {
      output += `**Target Architecture:** ${info.targetArch.join(', ')}\n`;
    }
    
    // Dependencies
    if (info.dependencies.length > 0) {
      output += `\n**Dependencies (${info.dependencies.length}):**\n`;
      const maxDeps = 10;
      const displayDeps = info.dependencies.slice(0, maxDeps);
      for (const dep of displayDeps) {
        output += `  - ${dep}\n`;
      }
      if (info.dependencies.length > maxDeps) {
        output += `  ... and ${info.dependencies.length - maxDeps} more\n`;
      }
    }
    
    return output;
  }

  private formatCodeReviewResult(result: CodeReviewResult): string {
    let output = `## Code Review Results\n\n`;
    output += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    output += `**Files Reviewed:** ${result.filesReviewed}\n`;
    output += `**Duration:** ${result.duration}ms\n\n`;

    output += `**Summary:** ${result.summary}\n\n`;

    if (result.concerns.length > 0) {
      // Group concerns by severity
      const high = result.concerns.filter(c => c.severity === 'high');
      const medium = result.concerns.filter(c => c.severity === 'medium');
      const low = result.concerns.filter(c => c.severity === 'low');

      if (high.length > 0) {
        output += `### 🔴 High Severity Issues (${high.length})\n\n`;
        for (const concern of high) {
          output += `**${concern.file}**`;
          if (concern.line) output += `:${concern.line}`;
          output += ` - ${concern.category}\n`;
          output += `  ${concern.message}\n\n`;
        }
      }

      if (medium.length > 0) {
        output += `### 🟡 Medium Severity Issues (${medium.length})\n\n`;
        for (const concern of medium) {
          output += `**${concern.file}**`;
          if (concern.line) output += `:${concern.line}`;
          output += ` - ${concern.category}\n`;
          output += `  ${concern.message}\n\n`;
        }
      }

      if (low.length > 0) {
        output += `### 🟢 Low Severity Issues (${low.length})\n\n`;
        for (const concern of low) {
          output += `**${concern.file}**`;
          if (concern.line) output += `:${concern.line}`;
          output += ` - ${concern.category}\n`;
          output += `  ${concern.message}\n\n`;
        }
      }
    } else {
      output += `✅ No concerns detected!\n\n`;
    }

    if (result.error) {
      output += `**Error:** ${result.error}\n\n`;
    }

    if (result.suggestions && result.suggestions.length > 0) {
      output += `**Suggestions:**\n`;
      for (const suggestion of result.suggestions) {
        output += `- ${suggestion}\n`;
      }
    }

    return output;
  }

  private formatPRMessageResult(result: PRMessageResult): string {
    let output = `## Generated PR Message\n\n`;
    output += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n\n`;

    if (result.success) {
      output += `### Title\n\n\`\`\`\n${result.title}\n\`\`\`\n\n`;
      output += `### Message Body\n\n\`\`\`markdown\n${result.body}\n\`\`\`\n\n`;
      output += `### Full Message\n\n\`\`\`markdown\n${result.message}\n\`\`\`\n`;
    } else {
      output += `**Error:** ${result.error}\n`;
    }

    return output;
  }

  private formatAnalyzeCommandResult(result: AnalyzeCommandResult): string {
    let output = `## Smart Analysis Results\n\n`;
    output += `**Command:** \`${result.command}\`\n`;
    output += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    output += `**Duration:** ${result.duration}ms\n`;
    output += `**Analysis Time:** ${result.executionResult.duration}ms\n\n`;

    output += `**Summary:** ${result.summary}\n\n`;

    if (result.suggestions.length > 0) {
      output += `### Smart Suggestions\n\n`;

      for (const suggestion of result.suggestions) {
        const priorityIcon = suggestion.priority === 'high' ? '🔴' :
                            suggestion.priority === 'medium' ? '🟡' : '🟢';

        output += `${priorityIcon} **${suggestion.title}** (${suggestion.category})\n`;
        output += `   Confidence: ${(suggestion.confidence * 100).toFixed(0)}%\n\n`;
        output += `   ${suggestion.description}\n\n`;

        if (suggestion.actions.length > 0) {
          output += `   **Actions:**\n`;
          for (const action of suggestion.actions) {
            output += `   - ${action}\n`;
          }
          output += `\n`;
        }

        if (suggestion.relatedFiles && suggestion.relatedFiles.length > 0) {
          output += `   **Related Files:** ${suggestion.relatedFiles.join(', ')}\n\n`;
        }
      }
    }

    if (!result.success && result.executionResult.stderr) {
      output += `### Error Output\n\n\`\`\`\n${result.executionResult.stderr}\n\`\`\`\n\n`;
    }

    return output;
  }

  private formatAnalyzeResultResult(result: AnalyzeResultResult): string {
    let output = `## Analysis Results\n\n`;
    output += `**Status:** ${result.success ? '✅ Success' : '❌ Failed'}\n`;
    output += `**Analysis Time:** ${result.duration}ms\n\n`;

    output += `**Summary:** ${result.summary}\n\n`;

    if (result.analysis.affectedFiles.length > 0) {
      output += `**Affected Files:** ${result.analysis.affectedFiles.length}\n`;
      for (const file of result.analysis.affectedFiles.slice(0, 5)) {
        output += `  - ${file}\n`;
      }
      if (result.analysis.affectedFiles.length > 5) {
        output += `  ... and ${result.analysis.affectedFiles.length - 5} more\n`;
      }
      output += `\n`;
    }

    if (result.suggestions.length > 0) {
      output += `### Smart Suggestions\n\n`;

      for (const suggestion of result.suggestions) {
        const priorityIcon = suggestion.priority === 'high' ? '🔴' :
                            suggestion.priority === 'medium' ? '🟡' : '🟢';

        output += `${priorityIcon} **${suggestion.title}** (${suggestion.category})\n`;
        output += `   Confidence: ${(suggestion.confidence * 100).toFixed(0)}%\n\n`;
        output += `   ${suggestion.description}\n\n`;

        if (suggestion.actions.length > 0) {
          output += `   **Actions:**\n`;
          for (const action of suggestion.actions) {
            output += `   - ${action}\n`;
          }
          output += `\n`;
        }
      }
    }

    return output;
  }

  private formatKnowledgeBaseStatsResult(result: KnowledgeBaseStatsResult): string {
    let output = `## Knowledge Base Statistics\n\n`;
    output += `**Total Patterns:** ${result.totalPatterns}\n\n`;

    output += `### Patterns by Category\n\n`;

    const sortedCategories = Object.entries(result.byCategory)
      .sort(([, a], [, b]) => b - a);

    for (const [category, count] of sortedCategories) {
      output += `- **${category}:** ${count} pattern(s)\n`;
    }

    return output;
  }

  private formatRecommendMCPServersResult(result: RecommendMCPServersResult): string {
    let output = `## MCP Server Recommendations\n\n`;
    output += `**Total Recommendations:** ${result.totalRecommendations}\n\n`;

    if (result.recommendations.length === 0) {
      output += `No recommendations found for the given criteria.\n`;
      return output;
    }

    for (const rec of result.recommendations) {
      const priorityIcon = rec.priority === 'high' ? '🔴' :
                          rec.priority === 'medium' ? '🟡' : '🟢';

      output += `### ${priorityIcon} ${rec.name}\n\n`;
      output += `**Package:** \`${rec.package}\`\n`;
      output += `**Priority:** ${rec.priority}\n`;
      output += `**Categories:** ${rec.categories.join(', ')}\n\n`;
      output += `${rec.description}\n\n`;

      if (rec.useCases.length > 0) {
        output += `**Use Cases:**\n`;
        for (const useCase of rec.useCases) {
          output += `- ${useCase}\n`;
        }
        output += `\n`;
      }

      if (rec.benefits.length > 0) {
        output += `**Benefits:**\n`;
        for (const benefit of rec.benefits) {
          output += `- ${benefit}\n`;
        }
        output += `\n`;
      }

      output += `**Configuration Example:**\n\`\`\`json\n${JSON.stringify(rec.configExample, null, 2)}\n\`\`\`\n\n`;
      output += `---\n\n`;
    }

    if (result.mcpConfig) {
      output += `### Complete .mcp.json Configuration\n\n`;
      output += `\`\`\`json\n${JSON.stringify(result.mcpConfig, null, 2)}\n\`\`\`\n`;
    }

    return output;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info(`${SERVER_NAME} v${SERVER_VERSION} started`);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MCPDevToolsServer();
  server.run().catch((error) => {
    logger.error('Server failed to start:', error);
    process.exit(1);
  });
}

export { MCPDevToolsServer };