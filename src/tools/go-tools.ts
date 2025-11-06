import { z } from 'zod';
import { ShellExecutor, ExecutionResult } from '../utils/shell-executor.js';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getCacheManager } from '../utils/cache-manager.js';
import { createHash } from 'crypto';

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
  disabledLinters: z.array(z.string()).optional().describe('Specific linters to disable'),
  verbose: z.boolean().optional().describe('Enable verbose output'),
  format: z.string().optional().describe('Output format (colored-line-number, line-number, json, tab, checkstyle, code-climate, html, junitxml, github-actions)'),
  concurrency: z.number().optional().describe('Number of CPUs to use for linting'),
  timeout: z.number().optional().describe('Timeout for linting in seconds'),
  paths: z.array(z.string()).optional().describe('Specific paths/packages to lint')
});

const GoBenchmarkArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory'),
  package: z.string().optional().describe('Go package to benchmark (e.g., ./...)'),
  benchmarks: z.string().optional().describe('Benchmark pattern to run (e.g., BenchmarkFoo)'),
  benchtime: z.string().optional().describe('Benchmark time (e.g., 10s, 100x)'),
  benchmem: z.boolean().optional().describe('Print memory allocation statistics'),
  cpu: z.array(z.number()).optional().describe('CPU counts to test (e.g., [1, 2, 4])'),
  count: z.number().optional().describe('Run each benchmark n times'),
  args: z.array(z.string()).optional().describe('Additional arguments'),
  timeout: z.number().optional().describe('Command timeout in milliseconds')
});

const GoBuildArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory'),
  package: z.string().optional().describe('Go package to build'),
  output: z.string().optional().describe('Output binary path'),
  ldflags: z.string().optional().describe('Link flags to pass to the linker'),
  buildFlags: z.array(z.string()).optional().describe('Additional build flags'),
  goos: z.string().optional().describe('Target operating system (linux, darwin, windows, etc.)'),
  goarch: z.string().optional().describe('Target architecture (amd64, arm64, 386, etc.)'),
  tags: z.array(z.string()).optional().describe('Build tags to include'),
  verbose: z.boolean().optional().describe('Enable verbose output'),
  race: z.boolean().optional().describe('Enable race condition detection'),
  args: z.array(z.string()).optional().describe('Additional arguments'),
  timeout: z.number().optional().describe('Command timeout in milliseconds')
});

const GoGenerateArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory'),
  package: z.string().optional().describe('Go package to run generate on (e.g., ./...)'),
  run: z.string().optional().describe('Only run generate directives matching this regex'),
  skip: z.string().optional().describe('Skip generate directives matching this regex'),
  verbose: z.boolean().optional().describe('Enable verbose output'),
  dryRun: z.boolean().optional().describe('Print commands without running them'),
  args: z.array(z.string()).optional().describe('Additional arguments'),
  timeout: z.number().optional().describe('Command timeout in milliseconds')
});

const GoWorkArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory'),
  command: z.enum(['init', 'use', 'sync', 'edit']).describe('Workspace command to run'),
  modules: z.array(z.string()).optional().describe('Module paths for use command'),
  args: z.array(z.string()).optional().describe('Additional arguments')
});

const GoVulncheckArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory'),
  package: z.string().optional().describe('Go package to check (e.g., ./...)'),
  mode: z.enum(['source', 'binary']).optional().describe('Analysis mode (source or binary)'),
  json: z.boolean().optional().describe('Output results in JSON format'),
  verbose: z.boolean().optional().describe('Enable verbose output'),
  args: z.array(z.string()).optional().describe('Additional arguments'),
  timeout: z.number().optional().describe('Command timeout in milliseconds')
});

export type GoToolArgs = z.infer<typeof GoToolArgsSchema>;
export type GoFormatArgs = z.infer<typeof GoFormatArgsSchema>;
export type GoLintArgs = z.infer<typeof GoLintArgsSchema>;
export type GoBenchmarkArgs = z.infer<typeof GoBenchmarkArgsSchema>;
export type GoBuildArgs = z.infer<typeof GoBuildArgsSchema>;
export type GoGenerateArgs = z.infer<typeof GoGenerateArgsSchema>;
export type GoWorkArgs = z.infer<typeof GoWorkArgsSchema>;
export type GoVulncheckArgs = z.infer<typeof GoVulncheckArgsSchema>;

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
  hasGoWork?: boolean;
  workspaces?: string[];
  buildTools?: string[];
  lintConfigs?: string[];
  targetOS?: string[];
  targetArch?: string[];
  vendorMode?: boolean;
  hasMain?: boolean;
  mainPackages?: string[];
}

export class GoTools {
  private executor: ShellExecutor;
  private projectRoot: string;
  private cacheManager = getCacheManager();

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.executor = new ShellExecutor(this.projectRoot);
  }

  /**
   * Build cache key for go operations
   * Includes all parameters that affect the result
   */
  private buildGoCacheKey(operation: string, args: Record<string, unknown>): string {
    const dir = path.resolve((args.directory as string | undefined) || this.projectRoot);
    const argsJson = JSON.stringify(args, Object.keys(args).sort());
    const argsHash = createHash('sha256').update(argsJson).digest('hex').substring(0, 16);
    return `${operation}:${dir}:${argsHash}`;
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
   * Run go build with enhanced cross-compilation and ldflags support
   */
  async goBuild(args: GoBuildArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['build'];

    // Add output file
    if (args.output) {
      commandArgs.push('-o', args.output);
    }

    // Add ldflags
    if (args.ldflags) {
      commandArgs.push('-ldflags', args.ldflags);
    }

    // Add build flags
    if (args.buildFlags && args.buildFlags.length > 0) {
      commandArgs.push(...args.buildFlags);
    }

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
    const pkg = args.package || '.';
    commandArgs.push(pkg);

    // Set cross-compilation environment variables
    const env: Record<string, string> = {};
    if (args.goos) {
      env.GOOS = args.goos;
    }
    if (args.goarch) {
      env.GOARCH = args.goarch;
    }

    const result = await this.executor.execute('go', {
      cwd: args.directory,
      args: commandArgs,
      env: Object.keys(env).length > 0 ? env : undefined,
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
    
    // Add verbose flag
    if (args.verbose) {
      commandArgs.push('--verbose');
    }
    
    // Add output format
    if (args.format) {
      commandArgs.push('--out-format', args.format);
    }
    
    // Add concurrency setting
    if (args.concurrency) {
      commandArgs.push('--concurrency', args.concurrency.toString());
    }
    
    // Add timeout
    if (args.timeout) {
      commandArgs.push('--timeout', `${args.timeout}s`);
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
    
    // Add specific paths/packages to lint
    if (args.paths && args.paths.length > 0) {
      commandArgs.push(...args.paths);
    } else {
      commandArgs.push('./...');
    }
    
    const result = await this.executor.execute('golangci-lint', {
      cwd: args.directory,
      args: commandArgs,
      timeout: (args.timeout ? args.timeout * 1000 : 300000) + 30000 // Add buffer to executor timeout
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
   * Run Go benchmarks
   */
  async goBenchmark(args: GoBenchmarkArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['test', '-bench'];

    // Add benchmark pattern
    const benchPattern = args.benchmarks || '.';
    commandArgs.push(benchPattern);

    // Add benchtime
    if (args.benchtime) {
      commandArgs.push('-benchtime', args.benchtime);
    }

    // Add benchmem
    if (args.benchmem) {
      commandArgs.push('-benchmem');
    }

    // Add CPU counts
    if (args.cpu && args.cpu.length > 0) {
      commandArgs.push('-cpu', args.cpu.join(','));
    }

    // Add count
    if (args.count) {
      commandArgs.push('-count', args.count.toString());
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    // Add package at the end
    const pkg = args.package || './...';
    commandArgs.push(pkg);

    const result = await this.executor.execute('go', {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 600000 // Benchmarks can take longer
    });

    return this.processGoResult(result, 'go test -bench');
  }

  /**
   * Run go generate
   */
  async goGenerate(args: GoGenerateArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['generate'];

    // Add run pattern
    if (args.run) {
      commandArgs.push('-run', args.run);
    }

    // Add skip pattern
    if (args.skip) {
      commandArgs.push('-skip', args.skip);
    }

    // Add verbose flag
    if (args.verbose) {
      commandArgs.push('-v');
    }

    // Add dry-run flag
    if (args.dryRun) {
      commandArgs.push('-n');
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    // Add package at the end
    const pkg = args.package || './...';
    commandArgs.push(pkg);

    const result = await this.executor.execute('go', {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000
    });

    return this.processGoResult(result, 'go generate');
  }

  /**
   * Run Go workspace commands
   */
  async goWork(args: GoWorkArgs): Promise<GoToolResult> {
    const commandArgs: string[] = ['work', args.command];

    // Add modules for 'use' command
    if (args.command === 'use' && args.modules && args.modules.length > 0) {
      commandArgs.push(...args.modules);
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute('go', {
      cwd: args.directory,
      args: commandArgs
    });

    return this.processGoResult(result, `go work ${args.command}`);
  }

  /**
   * Run govulncheck for vulnerability scanning
   */
  async goVulncheck(args: GoVulncheckArgs): Promise<GoToolResult> {
    const commandArgs: string[] = [];

    // Add mode flag
    if (args.mode === 'binary') {
      // For binary mode, package should be path to binary
      if (args.package) {
        commandArgs.push(args.package);
      }
    } else {
      // Source mode (default)
      const pkg = args.package || './...';
      commandArgs.push(pkg);
    }

    // Add JSON flag
    if (args.json) {
      commandArgs.push('-json');
    }

    // Add verbose flag
    if (args.verbose) {
      commandArgs.push('-v');
    }

    // Add additional arguments
    if (args.args) {
      commandArgs.push(...args.args);
    }

    const result = await this.executor.execute('govulncheck', {
      cwd: args.directory,
      args: commandArgs,
      timeout: args.timeout || 300000
    });

    return this.processGoResult(result, 'govulncheck');
  }

  /**
   * Get Go project information
   */
  async getProjectInfo(directory?: string): Promise<GoProjectInfo> {
    const dir = directory || this.projectRoot;

    // Try cache first
    const cacheKey = this.buildGoCacheKey('project-info', { directory: dir });
    const cached = this.cacheManager.get<GoProjectInfo>('goModules', cacheKey);
    if (cached) {
      return cached;
    }

    const info: GoProjectInfo = {
      hasGoMod: false,
      dependencies: [],
      hasTests: false,
      testFiles: [],
      packages: [],
      buildTools: [],
      lintConfigs: [],
      targetOS: [],
      targetArch: [],
      mainPackages: []
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

      // Check for go.work (workspace support)
      const goWorkPath = path.join(dir, 'go.work');
      try {
        await fs.access(goWorkPath);
        info.hasGoWork = true;
        
        const goWorkContent = await fs.readFile(goWorkPath, 'utf8');
        const useMatches = goWorkContent.match(/^use\s+(.+)$/gm);
        if (useMatches) {
          info.workspaces = useMatches.map(match => match.replace(/^use\s+/, '').trim());
        }
      } catch {
        // No go.work file
      }

      // Check for vendor directory
      const vendorPath = path.join(dir, 'vendor');
      try {
        await fs.access(vendorPath);
        info.vendorMode = true;
      } catch {
        info.vendorMode = false;
      }

      // Detect lint configuration files
      const lintConfigFiles = [
        '.golangci.yml',
        '.golangci.yaml',
        'golangci.yml',
        'golangci.yaml'
      ];
      
      for (const configFile of lintConfigFiles) {
        try {
          await fs.access(path.join(dir, configFile));
          info.lintConfigs!.push(configFile);
        } catch {
          // File doesn't exist
        }
      }

      // Detect build tools (Makefile, Dockerfile, etc.)
      const buildFiles = [
        'Makefile',
        'makefile',
        'Dockerfile',
        'docker-compose.yml',
        'docker-compose.yaml',
        '.github/workflows',
        'Taskfile.yml',
        'justfile'
      ];
      
      for (const buildFile of buildFiles) {
        try {
          await fs.access(path.join(dir, buildFile));
          info.buildTools!.push(buildFile);
        } catch {
          // File doesn't exist
        }
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
      
      // Find test files and main packages
      const testResult = await this.executor.execute('go', {
        cwd: dir,
        args: ['list', '-f', '{{.ImportPath}},{{.TestGoFiles}},{{.Name}}', './...']
      });
      
      if (testResult.success) {
        const lines = testResult.stdout.split('\n').filter(line => line);
        for (const line of lines) {
          const [importPath, testFiles, pkgName] = line.split(',');
          
          if (testFiles && testFiles !== '[]') {
            const files = testFiles.replace(/[\[\]]/g, '').split(' ').filter(f => f);
            info.testFiles.push(...files);
          }
          
          if (pkgName === 'main') {
            info.mainPackages!.push(importPath);
            info.hasMain = true;
          }
        }
        
        info.testFiles = [...new Set(info.testFiles)];
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

      // Get build constraints and supported platforms
      const envResult = await this.executor.execute('go', {
        cwd: dir,
        args: ['env', 'GOOS', 'GOARCH']
      });
      
      if (envResult.success) {
        const [goos, goarch] = envResult.stdout.trim().split('\n');
        info.targetOS = [goos];
        info.targetArch = [goarch];
      }
      
    } catch (error) {
      console.error('Error getting Go project info:', error);
      // Return partial results instead of empty object to provide useful info
      // even when some operations fail
    }

    // Cache the result
    this.cacheManager.set('goModules', cacheKey, info);

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

  /**
   * Validate Go benchmark arguments
   */
  static validateBenchmarkArgs(args: unknown): GoBenchmarkArgs {
    return GoBenchmarkArgsSchema.parse(args);
  }

  /**
   * Validate Go build arguments
   */
  static validateBuildArgs(args: unknown): GoBuildArgs {
    return GoBuildArgsSchema.parse(args);
  }

  /**
   * Validate Go generate arguments
   */
  static validateGenerateArgs(args: unknown): GoGenerateArgs {
    return GoGenerateArgsSchema.parse(args);
  }

  /**
   * Validate Go work arguments
   */
  static validateWorkArgs(args: unknown): GoWorkArgs {
    return GoWorkArgsSchema.parse(args);
  }

  /**
   * Validate Go vulncheck arguments
   */
  static validateVulncheckArgs(args: unknown): GoVulncheckArgs {
    return GoVulncheckArgsSchema.parse(args);
  }
}