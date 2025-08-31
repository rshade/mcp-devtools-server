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
import { GoTools, GoToolResult } from './tools/go-tools.js';

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
            description: 'Build Go packages',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory for the command',
                },
                package: {
                  type: 'string',
                  description: 'Go package to build (e.g., ./...)',
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
            description: 'Lint Go code using golangci-lint',
            inputSchema: {
              type: 'object',
              properties: {
                directory: {
                  type: 'string',
                  description: 'Working directory',
                },
                config: {
                  type: 'string',
                  description: 'Path to golangci-lint config',
                },
                fix: {
                  type: 'boolean',
                  description: 'Fix issues automatically',
                },
                enabledLinters: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific linters to enable',
                },
                disabledLinters: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Specific linters to disable',
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
            const validatedArgs = GoTools.validateArgs(args);
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