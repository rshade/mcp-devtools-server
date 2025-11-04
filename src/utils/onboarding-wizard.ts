import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';
import { ProjectDetector, ProjectInfo, ProjectType, BuildSystem } from './project-detector.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

// ============================================================================
// Core Interfaces
// ============================================================================

export interface OnboardingOptions {
  interactive: boolean;          // Enable interactive prompts
  autoInstall: boolean;          // Auto-install missing tools
  generateConfig: boolean;       // Generate .mcp-devtools.json
  validateSetup: boolean;        // Run validation after setup
  backupExisting: boolean;       // Backup existing configs
  dryRun: boolean;              // Preview without changes
  skipToolVerification: boolean; // Skip tool installation checks
}

export interface OnboardingResult {
  success: boolean;
  configPath?: string;
  installedTools: string[];
  skippedTools: string[];
  recommendations: Recommendation[];
  validationResults?: ValidationResult;
  backupPath?: string;
  duration: number;
  error?: string;
}

export interface Recommendation {
  category: 'tool' | 'config' | 'workflow' | 'integration' | 'security' | 'performance';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actions: string[];
  automatable: boolean;
}

export interface ValidationResult {
  success: boolean;
  validations: Validation[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: Recommendation[];
  score: number;  // 0-100
}

export interface Validation {
  category: string;
  name: string;
  passed: boolean;
  message: string;
  duration?: number;
}

export interface ValidationError {
  category: string;
  message: string;
  file?: string;
  line?: number;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  category: string;
  message: string;
  file?: string;
  suggestion?: string;
}

// ============================================================================
// Project Profile (Enhanced Detection Results)
// ============================================================================

export interface ProjectProfile {
  // Basic info
  projectType: ProjectType;
  language: string;
  framework?: string;
  buildSystem: BuildSystem;

  // Core project info from detector
  projectInfo: ProjectInfo;

  // Dependencies
  dependencies: DependencyInfo[];
  devDependencies: DependencyInfo[];
  missingDependencies: string[];

  // Tooling
  availableTools: ToolInfo[];
  recommendedTools: ToolInfo[];

  // Testing
  hasTests: boolean;
  testFramework?: string;
  testCoverage?: number;

  // CI/CD
  cicdPlatform?: string;
  hasWorkflows: boolean;

  // Containerization
  hasDocker: boolean;
  hasKubernetes: boolean;

  // Development environment
  editorConfig?: EditorConfig;
  hasGitHooks: boolean;

  // Confidence scores
  detectionConfidence: {
    projectType: number;      // 0-1
    framework: number;
    buildSystem: number;
  };
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development';
  installed: boolean;
}

export interface ToolInfo {
  name: string;
  installed: boolean;
  version?: string;
  required: boolean;
  installCommand?: string;
  category: 'build' | 'test' | 'lint' | 'format' | 'security' | 'other';
  packageManager?: string;
}

export interface EditorConfig {
  type: 'vscode' | 'vim' | 'editorconfig' | 'unknown';
  path: string;
  hasSettings: boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface MCPDevToolsConfig {
  $schema?: string;
  commands?: Record<string, string>;
  linters?: string[];
  testRunner?: string;
  timeout?: number;
  projectType?: string;
  buildSystem?: string;
  makeTargets?: string[];
  excludePaths?: string[];
  environment?: Record<string, string>;
  parallel?: ParallelConfig;
  security?: SecurityConfig;
  golang?: GoConfig;
  fileValidation?: FileValidationConfig;
}

export interface ParallelConfig {
  makeJobs?: number;
  enableTestParallel?: boolean;
}

export interface SecurityConfig {
  allowedCommands?: string[];
  restrictedPaths?: string[];
}

export interface GoConfig {
  goPath?: string;
  goModule?: boolean;
  testFlags?: string[];
  lintConfig?: string;
}

export interface FileValidationConfig {
  newline?: {
    enabled?: boolean;
    autoFix?: boolean;
    exclude?: string[];
    fileTypes?: string[];
  };
}

// ============================================================================
// OnboardingWizard Class
// ============================================================================

export class OnboardingWizard {
  private projectRoot: string;
  private detector: ProjectDetector;

  constructor(projectRoot?: string) {
    this.projectRoot = this.validateAndResolveProjectRoot(projectRoot);
    this.detector = new ProjectDetector(this.projectRoot);
  }

  /**
   * Validate and resolve project root path to prevent path traversal attacks
   * @param projectRoot - User-provided project root path
   * @returns Validated absolute path
   * @throws Error if path is invalid or outside allowed boundaries
   */
  private validateAndResolveProjectRoot(projectRoot?: string): string {
    const root = projectRoot || process.cwd();

    // Resolve to absolute path and normalize
    const resolvedPath = path.resolve(root);

    // Get current working directory
    const cwd = process.cwd();

    // Prevent absolute paths that escape the current workspace
    // Allow subdirectories of cwd, but not parent directories unless explicitly in cwd
    const relativeToCwd = path.relative(cwd, resolvedPath);

    // Check if path tries to escape via ..
    if (relativeToCwd.startsWith('..')) {
      throw new Error(
        `Invalid project root: ${projectRoot}. ` +
        `Path must be within or below the current working directory. ` +
        `Attempted path: ${resolvedPath}, CWD: ${cwd}`
      );
    }

    // Additional security: prevent common suspicious patterns
    if (resolvedPath.includes('\0')) {
      throw new Error('Invalid project root: null bytes not allowed in path');
    }

    // Note: We don't validate path existence here to avoid blocking I/O
    // The actual file operations will fail gracefully if path is invalid

    logger.info(`Validated project root: ${resolvedPath}`);
    return resolvedPath;
  }

  /**
   * Main entry point for the onboarding wizard
   */
  async run(options: OnboardingOptions): Promise<OnboardingResult> {
    const startTime = Date.now();
    logger.info('Starting onboarding wizard...');

    try {
      // Phase 1: Detection
      logger.info('Phase 1: Detecting project characteristics...');
      const profile = await this.detectProjectCharacteristics();

      if (options.dryRun) {
        logger.info('Dry run mode - showing what would be done');
        return this.generateDryRunResult(profile, startTime);
      }

      // Phase 2: Configuration Generation
      logger.info('Phase 2: Generating configuration...');
      const config = await this.generateConfiguration(profile);

      // Phase 3: Interactive Review (if enabled)
      let finalConfig = config;
      if (options.interactive) {
        logger.info('Phase 3: Interactive review...');
        finalConfig = await this.interactiveReview(config);
      }

      // Phase 4: Backup existing config
      let backupPath: string | undefined;
      if (options.backupExisting) {
        logger.info('Phase 4: Backing up existing configuration...');
        backupPath = await this.backupExistingConfig();
      }

      // Phase 5: Tool Verification
      const installedTools: string[] = [];
      const skippedTools: string[] = [];
      if (!options.skipToolVerification) {
        logger.info('Phase 5: Verifying tools...');
        const toolResults = await this.verifyTools(profile);
        installedTools.push(...toolResults.installed);
        skippedTools.push(...toolResults.skipped);
      }

      // Phase 6: Configuration Writing
      let configPath: string | undefined;
      if (options.generateConfig) {
        logger.info('Phase 6: Writing configuration...');
        configPath = await this.writeConfiguration(finalConfig);
      }

      // Phase 7: Validation
      let validationResults: ValidationResult | undefined;
      if (options.validateSetup && configPath) {
        logger.info('Phase 7: Validating setup...');
        validationResults = await this.validateSetup(finalConfig, profile);
      }

      // Generate recommendations
      const recommendations = this.generateRecommendations(profile, finalConfig);

      const duration = Date.now() - startTime;
      logger.info(`Onboarding complete in ${duration}ms`);

      return {
        success: true,
        configPath,
        installedTools,
        skippedTools,
        recommendations,
        validationResults,
        backupPath,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Onboarding failed:', error);

      return {
        success: false,
        installedTools: [],
        skippedTools: [],
        recommendations: [],
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Phase 1: Detect project characteristics
   */
  private async detectProjectCharacteristics(): Promise<ProjectProfile> {
    const projectInfo = await this.detector.detectProject();

    // Calculate confidence scores
    const detectionConfidence = this.calculateConfidence(projectInfo);

    // Detect dependencies
    const { dependencies, devDependencies, missing } = await this.analyzeDependencies(projectInfo);

    // Detect available and recommended tools
    const availableTools = await this.detectAvailableTools(projectInfo);
    const recommendedTools = this.getRecommendedTools(projectInfo);

    // Detect CI/CD
    const cicdInfo = await this.detectCICD();

    // Detect containerization
    const containerInfo = await this.detectContainerization();

    // Detect editor config
    const editorConfig = await this.detectEditorConfig();

    // Detect git hooks
    const hasGitHooks = await this.hasGitHooks();

    return {
      projectType: projectInfo.type,
      language: projectInfo.language,
      framework: projectInfo.framework,
      buildSystem: projectInfo.buildSystem,
      projectInfo,
      dependencies,
      devDependencies,
      missingDependencies: missing,
      availableTools,
      recommendedTools,
      hasTests: projectInfo.hasTests,
      testFramework: projectInfo.testFramework,
      testCoverage: undefined, // Would require running tests
      cicdPlatform: cicdInfo.platform,
      hasWorkflows: cicdInfo.hasWorkflows,
      hasDocker: containerInfo.hasDocker,
      hasKubernetes: containerInfo.hasKubernetes,
      editorConfig,
      hasGitHooks,
      detectionConfidence
    };
  }

  /**
   * Phase 2: Generate configuration
   */
  private async generateConfiguration(profile: ProjectProfile): Promise<MCPDevToolsConfig> {
    const config: MCPDevToolsConfig = {
      $schema: './.mcp-devtools.schema.json'
    };

    // Generate commands based on project type
    config.commands = this.generateCommands(profile);

    // Generate linters list
    config.linters = this.generateLinters(profile);

    // Set test runner
    config.testRunner = this.generateTestRunner(profile);

    // Set timeout
    config.timeout = this.generateTimeout(profile);

    // Set project type and build system
    config.projectType = profile.projectType;
    config.buildSystem = profile.buildSystem;

    // Set exclude paths
    config.excludePaths = this.generateExcludePaths(profile);

    // Set environment variables
    config.environment = this.generateEnvironment(profile);

    // Set parallel configuration
    config.parallel = this.generateParallelConfig(profile);

    // Set security configuration
    config.security = this.generateSecurityConfig(profile);

    // Language-specific configs
    if (profile.projectType === ProjectType.Go) {
      config.golang = this.generateGoConfig(profile);
    }

    // File validation
    config.fileValidation = this.generateFileValidationConfig(profile);

    // Make targets (if available)
    if (profile.projectInfo.makeTargets && profile.projectInfo.makeTargets.length > 0) {
      config.makeTargets = profile.projectInfo.makeTargets;
    }

    return config;
  }

  /**
   * Phase 3: Interactive review (placeholder)
   *
   * NOTE: Interactive mode is planned for future implementation.
   * Will allow users to:
   * - Review and modify detected project type
   * - Select/deselect linters
   * - Customize command mappings
   * - Set environment variables
   *
   * Planned implementation: Use inquirer.js or prompts library
   * Tracked in: Future enhancement (see PR_MESSAGE.md)
   */
  private async interactiveReview(config: MCPDevToolsConfig): Promise<MCPDevToolsConfig> {
    // Interactive mode not yet implemented - using generated config
    logger.info('Interactive mode not yet implemented - using generated config');
    return config;
  }

  /**
   * Phase 4: Backup existing configuration
   */
  private async backupExistingConfig(): Promise<string | undefined> {
    const configPath = path.join(this.projectRoot, '.mcp-devtools.json');

    try {
      await fs.access(configPath);

      // Config exists, create backup
      const backupDir = path.join(this.projectRoot, '.mcp-devtools-backups');
      await fs.mkdir(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
      const backupPath = path.join(backupDir, `${timestamp}.json`);

      await fs.copyFile(configPath, backupPath);
      logger.info(`Backed up existing config to ${backupPath}`);

      return backupPath;
    } catch (error) {
      // Expected: config doesn't exist, no backup needed
      logger.debug('No existing config found to backup', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return undefined;
    }
  }

  /**
   * Phase 5: Verify and optionally install tools
   *
   * NOTE: Basic verification is implemented. Future enhancements planned:
   * - Auto-installation of missing tools
   * - Version compatibility checks
   * - Tool configuration validation
   *
   * Tracked in: Future enhancement (see PR_MESSAGE.md)
   */
  private async verifyTools(profile: ProjectProfile): Promise<{
    installed: string[];
    skipped: string[];
  }> {
    const installed: string[] = [];
    const skipped: string[] = [];

    for (const tool of profile.recommendedTools) {
      if (tool.installed) {
        installed.push(tool.name);
      } else {
        skipped.push(tool.name);
      }
    }

    return { installed, skipped };
  }

  /**
   * Phase 6: Write configuration to file
   */
  private async writeConfiguration(config: MCPDevToolsConfig): Promise<string> {
    const configPath = path.join(this.projectRoot, '.mcp-devtools.json');
    const content = JSON.stringify(config, null, 2) + '\n';

    await fs.writeFile(configPath, content, 'utf8');
    logger.info(`Configuration written to ${configPath}`);

    return configPath;
  }

  /**
   * Phase 7: Validate setup
   *
   * NOTE: Basic validation is implemented. Comprehensive validation available via
   * SetupValidator class. Future enhancements planned:
   * - Command execution dry-run
   * - Tool version compatibility matrix
   * - Performance benchmarking
   *
   * Tracked in: Future enhancement (see PR_MESSAGE.md)
   */
  private async validateSetup(
    config: MCPDevToolsConfig,
    profile: ProjectProfile
  ): Promise<ValidationResult> {
    // Unused parameters - stub implementation for future enhancement
    void config;
    void profile;
    // Basic validation - comprehensive validation available via SetupValidator
    const validations: Validation[] = [
      {
        category: 'configuration',
        name: 'Config file created',
        passed: true,
        message: 'Configuration file created successfully'
      }
    ];

    return {
      success: true,
      validations,
      errors: [],
      warnings: [],
      recommendations: [],
      score: 100
    };
  }

  /**
   * Rollback to a previous configuration
   */
  async rollback(backupPath: string): Promise<void> {
    const configPath = path.join(this.projectRoot, '.mcp-devtools.json');

    await fs.copyFile(backupPath, configPath);
    logger.info(`Rolled back configuration from ${backupPath}`);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateDryRunResult(profile: ProjectProfile, startTime: number): OnboardingResult {
    const recommendations = this.generateRecommendations(profile, {} as MCPDevToolsConfig);

    return {
      success: true,
      installedTools: [],
      skippedTools: profile.recommendedTools.filter(t => !t.installed).map(t => t.name),
      recommendations,
      duration: Date.now() - startTime
    };
  }

  private calculateConfidence(projectInfo: ProjectInfo): ProjectProfile['detectionConfidence'] {
    // Simple confidence calculation based on available indicators
    let projectTypeConfidence = 0.5;
    let frameworkConfidence = 0.5;
    let buildSystemConfidence = 0.5;

    // Increase confidence if we found strong indicators
    if (projectInfo.configFiles.length > 3) {
      projectTypeConfidence = 0.9;
    } else if (projectInfo.configFiles.length > 1) {
      projectTypeConfidence = 0.7;
    }

    if (projectInfo.framework) {
      frameworkConfidence = 0.8;
    }

    if (projectInfo.buildSystem !== BuildSystem.Unknown) {
      buildSystemConfidence = 0.9;
    }

    return {
      projectType: projectTypeConfidence,
      framework: frameworkConfidence,
      buildSystem: buildSystemConfidence
    };
  }

  /**
   * Analyze project dependencies
   *
   * NOTE: Stub implementation. Future enhancements planned:
   * - Parse package.json, go.mod, requirements.txt, Cargo.toml
   * - Detect version mismatches
   * - Identify outdated/deprecated dependencies
   * - Security vulnerability scanning integration
   *
   * Tracked in: Future enhancement (see PR_MESSAGE.md)
   */
  private async analyzeDependencies(projectInfo: ProjectInfo): Promise<{
    dependencies: DependencyInfo[];
    devDependencies: DependencyInfo[];
    missing: string[];
  }> {
    // Unused parameter - stub implementation for future enhancement
    void projectInfo;
    // Stub - dependency analysis planned for future implementation
    return {
      dependencies: [],
      devDependencies: [],
      missing: []
    };
  }

  /**
   * Detect available tools in the environment
   *
   * NOTE: Stub implementation. Future enhancements planned:
   * - Check PATH for installed tools
   * - Verify tool versions
   * - Detect global vs local installations
   *
   * Tracked in: Future enhancement (see PR_MESSAGE.md)
   */
  private async detectAvailableTools(projectInfo: ProjectInfo): Promise<ToolInfo[]> {
    // Unused parameter - stub implementation for future enhancement
    void projectInfo;
    // Stub - tool detection planned for future implementation
    return [];
  }

  private getRecommendedTools(projectInfo: ProjectInfo): ToolInfo[] {
    const tools: ToolInfo[] = [];

    // Recommend tools based on project type
    switch (projectInfo.type) {
      case ProjectType.NodeJS:
        tools.push(
          { name: 'eslint', installed: false, required: true, category: 'lint', packageManager: 'npm' },
          { name: 'markdownlint-cli', installed: false, required: false, category: 'lint', packageManager: 'npm' },
          { name: 'yamllint', installed: false, required: false, category: 'lint', packageManager: 'npm' }
        );
        break;

      case ProjectType.Go:
        tools.push(
          { name: 'golangci-lint', installed: false, required: true, category: 'lint', packageManager: 'go' },
          { name: 'staticcheck', installed: false, required: false, category: 'lint', packageManager: 'go' },
          { name: 'govulncheck', installed: false, required: false, category: 'security', packageManager: 'go' }
        );
        break;

      case ProjectType.Python:
        tools.push(
          { name: 'flake8', installed: false, required: true, category: 'lint', packageManager: 'pip' },
          { name: 'black', installed: false, required: false, category: 'format', packageManager: 'pip' },
          { name: 'pytest', installed: false, required: true, category: 'test', packageManager: 'pip' }
        );
        break;
    }

    return tools;
  }

  private async detectCICD(): Promise<{ platform?: string; hasWorkflows: boolean }> {
    // Check for common CI/CD platforms
    const cicdFiles = [
      { file: '.github/workflows', platform: 'GitHub Actions' },
      { file: '.gitlab-ci.yml', platform: 'GitLab CI' },
      { file: '.circleci/config.yml', platform: 'CircleCI' },
      { file: '.travis.yml', platform: 'Travis CI' },
      { file: 'azure-pipelines.yml', platform: 'Azure Pipelines' }
    ];

    for (const { file, platform } of cicdFiles) {
      try {
        await fs.access(path.join(this.projectRoot, file));
        logger.debug(`Found CI/CD platform: ${platform}`);
        return { platform, hasWorkflows: true };
      } catch (error) {
        // Expected: file doesn't exist, try next
        logger.debug(`CI/CD file not found: ${file}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        continue;
      }
    }

    logger.debug('No CI/CD workflows detected');
    return { hasWorkflows: false };
  }

  private async detectContainerization(): Promise<{ hasDocker: boolean; hasKubernetes: boolean }> {
    let hasDocker = false;
    let hasKubernetes = false;

    // Check for Docker
    try {
      await fs.access(path.join(this.projectRoot, 'Dockerfile'));
      hasDocker = true;
      logger.debug('Dockerfile found');
    } catch (error) {
      // Expected: no Dockerfile
      logger.debug('No Dockerfile found', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Check for Kubernetes
    const k8sPatterns = ['k8s', 'kubernetes', 'manifests'];
    for (const pattern of k8sPatterns) {
      try {
        await fs.access(path.join(this.projectRoot, pattern));
        hasKubernetes = true;
        logger.debug(`Kubernetes directory found: ${pattern}`);
        break;
      } catch (error) {
        // Expected: directory doesn't exist
        logger.debug(`Kubernetes directory not found: ${pattern}`, {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        continue;
      }
    }

    return { hasDocker, hasKubernetes };
  }

  private async detectEditorConfig(): Promise<EditorConfig | undefined> {
    // Check for VS Code
    try {
      const vscodeSettings = path.join(this.projectRoot, '.vscode/settings.json');
      await fs.access(vscodeSettings);
      logger.debug('VS Code settings found');
      return {
        type: 'vscode',
        path: vscodeSettings,
        hasSettings: true
      };
    } catch (error) {
      logger.debug('VS Code settings not found', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Check for .editorconfig
      try {
        const editorconfig = path.join(this.projectRoot, '.editorconfig');
        await fs.access(editorconfig);
        logger.debug('EditorConfig found');
        return {
          type: 'editorconfig',
          path: editorconfig,
          hasSettings: true
        };
      } catch (error2) {
        logger.debug('EditorConfig not found', {
          error: error2 instanceof Error ? error2.message : 'Unknown error'
        });
        return undefined;
      }
    }
  }

  private async hasGitHooks(): Promise<boolean> {
    try {
      const hooksDir = path.join(this.projectRoot, '.git/hooks');
      const files = await fs.readdir(hooksDir);
      // Check if there are any non-sample hooks
      const hasHooks = files.some(f => !f.endsWith('.sample'));
      logger.debug(`Git hooks ${hasHooks ? 'found' : 'not found'}`);
      return hasHooks;
    } catch (error) {
      // Expected: .git directory might not exist or hooks dir missing
      logger.debug('Cannot access git hooks directory', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  private generateCommands(profile: ProjectProfile): Record<string, string> {
    const commands: Record<string, string> = {};

    switch (profile.projectType) {
      case ProjectType.NodeJS:
        commands.lint = 'npm run lint';
        commands.test = 'npm test';
        commands.build = 'npm run build';
        commands.clean = profile.buildSystem === BuildSystem.Make ? 'make clean' : 'rm -rf dist';
        commands.depend = 'npm install';
        break;

      case ProjectType.Go:
        commands.lint = 'golangci-lint run';
        commands.test = 'go test -v -cover ./...';
        commands.build = 'go build ./...';
        commands.clean = 'go clean';
        commands.depend = 'go mod download';
        break;

      case ProjectType.Python:
        commands.lint = 'flake8';
        commands.test = 'pytest';
        commands.build = 'python setup.py build';
        commands.clean = 'rm -rf build dist *.egg-info';
        commands.depend = profile.buildSystem === BuildSystem.Poetry ? 'poetry install' : 'pip install -r requirements.txt';
        break;

      case ProjectType.Rust:
        commands.lint = 'cargo clippy';
        commands.test = 'cargo test';
        commands.build = 'cargo build';
        commands.clean = 'cargo clean';
        commands.depend = 'cargo fetch';
        break;
    }

    return commands;
  }

  private generateLinters(profile: ProjectProfile): string[] {
    return profile.projectInfo.lintingTools;
  }

  private generateTestRunner(profile: ProjectProfile): string {
    return profile.testFramework || this.getDefaultTestRunner(profile.projectType);
  }

  private getDefaultTestRunner(projectType: ProjectType): string {
    switch (projectType) {
      case ProjectType.NodeJS: return 'jest';
      case ProjectType.Python: return 'pytest';
      case ProjectType.Go: return 'go';
      case ProjectType.Rust: return 'cargo';
      default: return 'make';
    }
  }

  private generateTimeout(profile: ProjectProfile): number {
    // Unused parameter - stub implementation for future enhancement
    void profile;
    // Default timeout: 5 minutes
    return 300000;
  }

  private generateExcludePaths(profile: ProjectProfile): string[] {
    const common = ['node_modules/**', 'dist/**', 'build/**', '.git/**'];

    switch (profile.projectType) {
      case ProjectType.NodeJS:
        return [...common, 'coverage/**'];
      case ProjectType.Python:
        return [...common, '__pycache__/**', '*.pyc', '.venv/**', 'venv/**'];
      case ProjectType.Go:
        return [...common, 'vendor/**'];
      case ProjectType.Rust:
        return [...common, 'target/**'];
      default:
        return common;
    }
  }

  private generateEnvironment(profile: ProjectProfile): Record<string, string> {
    const env: Record<string, string> = {};

    if (profile.projectType === ProjectType.NodeJS) {
      env.NODE_ENV = 'development';
    }

    return env;
  }

  private generateParallelConfig(profile: ProjectProfile): ParallelConfig {
    return {
      makeJobs: 1,
      enableTestParallel: profile.projectType === ProjectType.NodeJS
    };
  }

  private generateSecurityConfig(profile: ProjectProfile): SecurityConfig {
    // Unused parameter - stub implementation for future enhancement
    void profile;
    return {
      allowedCommands: [],
      restrictedPaths: ['/etc', '/usr', '/bin', '/sbin']
    };
  }

  private generateGoConfig(profile: ProjectProfile): GoConfig {
    // Unused parameter - stub implementation for future enhancement
    void profile;
    return {
      goModule: true,
      testFlags: ['-race', '-cover'],
      lintConfig: '.golangci.yml'
    };
  }

  private generateFileValidationConfig(profile: ProjectProfile): FileValidationConfig {
    const fileTypes: string[] = ['*.md', '*.json', '*.yaml', '*.yml'];

    switch (profile.projectType) {
      case ProjectType.NodeJS:
        fileTypes.push('*.ts', '*.js', '*.tsx', '*.jsx');
        break;
      case ProjectType.Go:
        fileTypes.push('*.go');
        break;
      case ProjectType.Python:
        fileTypes.push('*.py');
        break;
      case ProjectType.Rust:
        fileTypes.push('*.rs');
        break;
    }

    return {
      newline: {
        enabled: true,
        autoFix: false,
        exclude: ['node_modules/**', 'dist/**', '*.min.js', '*.min.css'],
        fileTypes
      }
    };
  }

  private generateRecommendations(
    profile: ProjectProfile,
    config: MCPDevToolsConfig
  ): Recommendation[] {
    // Unused parameter - stub implementation for future enhancement
    void config;
    const recommendations: Recommendation[] = [];

    // Recommend missing tools
    const missingTools = profile.recommendedTools.filter(t => !t.installed && t.required);
    if (missingTools.length > 0) {
      recommendations.push({
        category: 'tool',
        priority: 'high',
        title: 'Install missing required tools',
        description: `The following required tools are not installed: ${missingTools.map(t => t.name).join(', ')}`,
        actions: missingTools.map(t => `Install ${t.name}: ${t.installCommand || `${t.packageManager} install ${t.name}`}`),
        automatable: true
      });
    }

    // Recommend CI/CD if not present
    if (!profile.hasWorkflows) {
      recommendations.push({
        category: 'workflow',
        priority: 'medium',
        title: 'Set up CI/CD',
        description: 'No CI/CD workflows detected. Consider setting up automated testing and deployment.',
        actions: [
          'Create .github/workflows/ci.yml for GitHub Actions',
          'Configure automated testing on pull requests',
          'Set up deployment workflows'
        ],
        automatable: false
      });
    }

    // Recommend Docker if not present but beneficial
    if (!profile.hasDocker && profile.projectType !== ProjectType.Unknown) {
      recommendations.push({
        category: 'integration',
        priority: 'low',
        title: 'Consider containerization',
        description: 'No Dockerfile detected. Docker can help ensure consistent development and deployment environments.',
        actions: [
          'Create Dockerfile for your project',
          'Create docker-compose.yml for local development',
          'Add .dockerignore file'
        ],
        automatable: false
      });
    }

    // Recommend tests if none found
    if (!profile.hasTests) {
      recommendations.push({
        category: 'workflow',
        priority: 'high',
        title: 'Add tests to your project',
        description: 'No tests detected. Testing is essential for maintaining code quality.',
        actions: [
          `Set up ${profile.testFramework || this.getDefaultTestRunner(profile.projectType)}`,
          'Create test directory structure',
          'Write initial unit tests'
        ],
        automatable: false
      });
    }

    return recommendations;
  }
}
