import { z } from 'zod';
import { ShellExecutor, ExecutionResult } from '../utils/shell-executor.js';
import * as path from 'path';
import * as fs from 'fs/promises';

// Schema for Go tool arguments
const GoToolArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory for the command'),
  package: z.string().optional().describe('Go package to operate on (e.g., ./...)'),
  args: z.array(z.string()).optional().describe('Additional arguments'),
  verbose: z.boolean().optional().describe('Enable verbose output'),
  race: z.boolean().optional().describe('Enable race condition detection'),
  cover: z.boolean().optional().describe('Enable coverage analysis'),
  tags: z.array(z.string()).optional().describe('Build tags to include'),
  timeout: z.number().optional().describe('Command timeout in milliseconds')
});

const GoFormatArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory'),
  write: z.boolean().optional().describe('Write changes to files'),
  simplify: z.boolean().optional().describe('Simplify code'),
  files: z.array(z.string()).optional().describe('Specific files to format')
});

const GoLintArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory'),
  config: z.string().optional().describe('Path to golangci-lint config'),
  fix: z.boolean().optional().describe('Fix issues automatically'),
  enabledLinters: z.array(z.string()).optional().describe('Specific linters to enable'),
  disabledLinters: z.array(z.string()).optional().describe('Specific linters to disable')
});

export type GoToolArgs = z.infer<typeof GoToolArgsSchema>;
export type GoFormatArgs = z.infer<typeof GoFormatArgsSchema>;
export type GoLintArgs = z.infer<typeof GoLintArgsSchema>;

export interface GoToolResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  command: string;
  coverage?: number;
  suggestions?: string[];
}

export interface GoProjectInfo {
  hasGoMod: boolean;
  goVersion?: string;
  moduleName?: string;
  dependencies: string[];
  hasTests: boolean;
  testFiles: string[];
  packages: string[];
}

export class GoTools {
  private executor: ShellExecutor;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.executor = new ShellExecutor(this.projectRoot);
  }

  /**
   * Run go test
   */
  async goTest(args: GoToolArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['test'];
    
    // Add package specification
    const pkg = args.package || './...';
    
    // Add flags
    if (args.verbose) commandArgs.push('-v');
    if (args.race) commandArgs.push('-race');
    if (args.cover) commandArgs.push('-cover');
    
    // Add build tags
    if (args.tags && args.tags.length > 0) {
      commandArgs.push('-tags', args.tags.join(','));
    }
    
    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }
    
    // Add package at the end
    commandArgs.push(pkg);
    
    const result = await this.executor.execute('go', {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000
    });
    
    return this.processGoResult(result, 'go test');
  }

  /**
   * Run go build
   */
  async goBuild(args: GoToolArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['build'];
    
    // Add package specification
    const pkg = args.package || './...';
    
    // Add flags
    if (args.verbose) commandArgs.push('-v');
    if (args.race) commandArgs.push('-race');
    
    // Add build tags
    if (args.tags && args.tags.length > 0) {
      commandArgs.push('-tags', args.tags.join(','));
    }
    
    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }
    
    // Add package at the end
    commandArgs.push(pkg);
    
    const result = await this.executor.execute('go', {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000
    });
    
    return this.processGoResult(result, 'go build');
  }

  /**
   * Run gofmt to format Go code
   */
  async goFormat(args: GoFormatArgs): Promise<GoToolResult> {
    const commandArgs: string[] = [];
    
    // Add flags
    if (args.simplify) commandArgs.push('-s');
    if (args.write) commandArgs.push('-w');
    else commandArgs.push('-l'); // List files that need formatting
    
    // Add files or directory
    if (args.files && args.files.length > 0) {
      commandArgs.push(...args.files);
    } else {
      commandArgs.push('.');
    }
    
    const result = await this.executor.execute('gofmt', {
      cwd: args.directory,
      args: commandArgs
    });
    
    return this.processGoResult(result, 'gofmt');
  }

  /**
   * Run golangci-lint
   */
  async goLint(args: GoLintArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['run'];
    
    // Add config file
    if (args.config) {
      commandArgs.push('--config', args.config);
    }
    
    // Add fix flag
    if (args.fix) {
      commandArgs.push('--fix');
    }
    
    // Enable specific linters
    if (args.enabledLinters && args.enabledLinters.length > 0) {
      for (const linter of args.enabledLinters) {
        commandArgs.push('--enable', linter);
      }
    }
    
    // Disable specific linters
    if (args.disabledLinters && args.disabledLinters.length > 0) {
      for (const linter of args.disabledLinters) {
        commandArgs.push('--disable', linter);
      }
    }
    
    const result = await this.executor.execute('golangci-lint', {
      cwd: args.directory,
      args: commandArgs,
      timeout: 300000
    });
    
    return this.processGoResult(result, 'golangci-lint');
  }

  /**
   * Run go mod tidy
   */
  async goModTidy(args: GoToolArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['mod', 'tidy'];
    
    if (args.verbose) commandArgs.push('-v');
    
    const result = await this.executor.execute('go', {
      cwd: args.directory,
      args: commandArgs
    });
    
    return this.processGoResult(result, 'go mod tidy');
  }

  /**
   * Run go mod download
   */
  async goModDownload(args: GoToolArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['mod', 'download'];
    
    if (args.verbose) commandArgs.push('-x');
    
    const result = await this.executor.execute('go', {
      cwd: args.directory,
      args: commandArgs
    });
    
    return this.processGoResult(result, 'go mod download');
  }

  /**
   * Run go vet
   */
  async goVet(args: GoToolArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['vet'];
    
    // Add package specification
    const pkg = args.package || './...';
    
    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }
    
    // Add package at the end
    commandArgs.push(pkg);
    
    const result = await this.executor.execute('go', {
      cwd: args.directory,
      args: commandArgs
    });
    
    return this.processGoResult(result, 'go vet');
  }

  /**
   * Run staticcheck
   */
  async staticCheck(args: GoToolArgs): Promise<GoToolResult> {
    const commandArgs: string[] = [];
    
    // Add package specification
    const pkg = args.package || './...';
    commandArgs.push(pkg);
    
    const result = await this.executor.execute('staticcheck', {
      cwd: args.directory,
      args: commandArgs,
      timeout: 300000
    });
    
    return this.processGoResult(result, 'staticcheck');
  }

  /**
   * Get Go project information
   */
  async getProjectInfo(directory?: string): Promise<GoProjectInfo> {
    const dir = directory || this.projectRoot;
    const info: GoProjectInfo = {
      hasGoMod: false,
      dependencies: [],
      hasTests: false,
      testFiles: [],
      packages: []
    };
    
    try {
      // Check for go.mod
      const goModPath = path.join(dir, 'go.mod');
      try {
        await fs.access(goModPath);
        info.hasGoMod = true;
        
        // Read go.mod for module name and Go version
        const goModContent = await fs.readFile(goModPath, 'utf8');
        const moduleMatch = goModContent.match(/^module\s+(.+)$/m);
        if (moduleMatch) {
          info.moduleName = moduleMatch[1];
        }
        
        const goVersionMatch = goModContent.match(/^go\s+(.+)$/m);
        if (goVersionMatch) {
          info.goVersion = goVersionMatch[1];
        }
      } catch {
        // No go.mod file
      }
      
      // List dependencies
      if (info.hasGoMod) {
        const listResult = await this.executor.execute('go', {
          cwd: dir,
          args: ['list', '-m', 'all']
        });
        
        if (listResult.success) {
          info.dependencies = listResult.stdout
            .split('\n')
            .filter(line => line && !line.startsWith(info.moduleName || ''))
            .map(line => line.trim());
        }
      }
      
      // Find test files
      const testResult = await this.executor.execute('go', {
        cwd: dir,
        args: ['list', '-f', '{{.TestGoFiles}}', './...']
      });
      
      if (testResult.success) {
        const testFiles = testResult.stdout
          .split('\n')
          .filter(line => line && line !== '[]')
          .map(line => line.replace(/[\[\]]/g, '').split(' '))
          .flat()
          .filter(file => file);
        
        info.testFiles = [...new Set(testFiles)];
        info.hasTests = info.testFiles.length > 0;
      }
      
      // List packages
      const pkgResult = await this.executor.execute('go', {
        cwd: dir,
        args: ['list', './...']
      });
      
      if (pkgResult.success) {
        info.packages = pkgResult.stdout
          .split('\n')
          .filter(line => line)
          .map(line => line.trim());
      }
      
    } catch (error) {
      console.error('Error getting Go project info:', error);
    }
    
    return info;
  }

  /**
   * Process Go command result
   */
  private processGoResult(result: ExecutionResult, command: string): GoToolResult {
    const goResult: GoToolResult = {
      success: result.success,
      output: this.formatOutput(result),
      duration: result.duration,
      command
    };
    
    if (!result.success) {
      goResult.error = result.error || `${command} failed`;
      goResult.suggestions = this.generateSuggestions(command, result);
    }
    
    // Extract coverage if present
    const coverageMatch = result.stdout.match(/coverage: ([\d.]+)% of statements/);
    if (coverageMatch) {
      goResult.coverage = parseFloat(coverageMatch[1]);
    }
    
    return goResult;
  }

  /**
   * Format command output
   */
  private formatOutput(result: ExecutionResult): string {
    let output = '';
    
    if (result.stdout) {
      output += result.stdout;
    }
    
    if (result.stderr && !result.stderr.includes('warning')) {
      if (output) output += '\n--- stderr ---\n';
      output += result.stderr;
    }
    
    return output.trim();
  }

  /**
   * Generate helpful suggestions based on failures
   */
  private generateSuggestions(command: string, result: ExecutionResult): string[] {
    const suggestions: string[] = [];
    
    if (result.stderr.includes('command not found')) {
      if (command.includes('golangci-lint')) {
        suggestions.push('Install golangci-lint: go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest');
      } else if (command.includes('staticcheck')) {
        suggestions.push('Install staticcheck: go install honnef.co/go/tools/cmd/staticcheck@latest');
      } else {
        suggestions.push(`${command} is not installed`);
        suggestions.push('Check your Go installation and PATH');
      }
    }
    
    if (result.stderr.includes('no Go files')) {
      suggestions.push('No Go files found in the specified package');
      suggestions.push('Check the package path or use ./... for all packages');
    }
    
    if (result.stderr.includes('cannot find module')) {
      suggestions.push('Run "go mod init" to initialize a Go module');
      suggestions.push('Or run "go mod download" to download dependencies');
    }
    
    if (result.stderr.includes('build constraints')) {
      suggestions.push('Check build tags in your Go files');
      suggestions.push('Use -tags flag to include specific build tags');
    }
    
    if (command.includes('test') && result.exitCode !== 0) {
      suggestions.push('Check test output above for failing tests');
      suggestions.push('Run with -v flag for verbose output');
      suggestions.push('Use -run flag to run specific tests');
    }
    
    return suggestions;
  }

  /**
   * Validate Go tool arguments
   */
  static validateArgs(args: unknown): GoToolArgs {
    return GoToolArgsSchema.parse(args);
  }

  /**
   * Validate Go format arguments
   */
  static validateFormatArgs(args: unknown): GoFormatArgs {
    return GoFormatArgsSchema.parse(args);
  }

  /**
   * Validate Go lint arguments
   */
  static validateLintArgs(args: unknown): GoLintArgs {
    return GoLintArgsSchema.parse(args);
  }
}