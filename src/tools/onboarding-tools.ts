import winston from "winston";
import {
  OnboardingWizard,
  OnboardingOptions,
  OnboardingResult,
  ProjectProfile,
  ValidationResult,
  MCPDevToolsConfig,
} from "../utils/onboarding-wizard.js";
import { SetupValidator } from "../utils/setup-validator.js";
import { ProjectDetector } from "../utils/project-detector.js";
import { ConfigGenerator } from "../utils/config-generator.js";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

/**
 * OnboardingTools provides MCP tool interfaces for the onboarding wizard
 */
export class OnboardingTools {
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Run the complete onboarding wizard
   */
  async runOnboardingWizard(
    args: OnboardingWizardArgs,
  ): Promise<OnboardingResult> {
    logger.info("Running onboarding wizard...");

    const wizard = new OnboardingWizard(args.directory || this.projectRoot);

    const options: OnboardingOptions = {
      interactive: args.interactive || false,
      autoInstall: args.autoInstall || false,
      generateConfig: args.generateConfig !== false, // Default true
      validateSetup: args.validateSetup !== false, // Default true
      backupExisting: args.backupExisting !== false, // Default true
      dryRun: args.dryRun || false,
      skipToolVerification: args.skipToolVerification || false,
    };

    return await wizard.run(options);
  }

  /**
   * Detect project characteristics and generate profile
   */
  async detectProject(args: DetectProjectArgs): Promise<ProjectProfileResult> {
    logger.info("Detecting project characteristics...");

    // Use ProjectDetector directly
    const detector = new ProjectDetector(args.directory || this.projectRoot);
    const projectInfo = await detector.detectProject();

    // For now, return a simplified profile
    // In a full implementation, we'd expose the full detectProjectCharacteristics method
    return {
      success: true,
      projectType: projectInfo.type,
      language: projectInfo.language,
      framework: projectInfo.framework,
      buildSystem: projectInfo.buildSystem,
      hasTests: projectInfo.hasTests,
      testFramework: projectInfo.testFramework,
      lintingTools: projectInfo.lintingTools,
      configFiles: projectInfo.configFiles.map((f) => f.path),
      makeTargets: projectInfo.makeTargets,
      packageManager: projectInfo.packageManager,
    };
  }

  /**
   * Generate configuration without writing to file
   */
  async generateConfigPreview(
    args: GenerateConfigArgs,
  ): Promise<GenerateConfigResult> {
    logger.info("Generating configuration preview...");

    const detector = new ProjectDetector(args.directory || this.projectRoot);
    const projectInfo = await detector.detectProject();

    const generator = new ConfigGenerator();

    // Create a minimal profile for config generation
    const profile: ProjectProfile = {
      projectType: projectInfo.type,
      language: projectInfo.language,
      framework: projectInfo.framework,
      buildSystem: projectInfo.buildSystem,
      projectInfo,
      dependencies: [],
      devDependencies: [],
      missingDependencies: [],
      availableTools: [],
      recommendedTools: [],
      hasTests: projectInfo.hasTests,
      testFramework: projectInfo.testFramework,
      hasWorkflows: false,
      hasDocker: false,
      hasKubernetes: false,
      hasGitHooks: false,
      detectionConfidence: {
        projectType: 0.8,
        framework: 0.7,
        buildSystem: 0.9,
      },
    };

    const config = generator.generateConfig(profile);
    const validation = generator.validateConfig(config);

    return {
      success: true,
      config,
      validation,
    };
  }

  /**
   * Validate existing setup
   */
  async validateSetup(args: ValidateSetupArgs): Promise<ValidationResult> {
    logger.info("Validating setup...");

    const detector = new ProjectDetector(args.directory || this.projectRoot);
    const projectInfo = await detector.detectProject();

    // Load existing config
    const configPath = args.configPath || ".mcp-devtools.json";
    let config: MCPDevToolsConfig;

    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const fullPath = path.join(
        args.directory || this.projectRoot,
        configPath,
      );
      const content = await fs.readFile(fullPath, "utf8");
      config = JSON.parse(content);
    } catch (error) {
      return {
        success: false,
        validations: [],
        errors: [
          {
            category: "configuration",
            message: `Failed to load config: ${error instanceof Error ? error.message : "Unknown error"}`,
            severity: "critical",
          },
        ],
        warnings: [],
        recommendations: [],
        score: 0,
      };
    }

    // Create minimal profile
    const profile: ProjectProfile = {
      projectType: projectInfo.type,
      language: projectInfo.language,
      framework: projectInfo.framework,
      buildSystem: projectInfo.buildSystem,
      projectInfo,
      dependencies: [],
      devDependencies: [],
      missingDependencies: [],
      availableTools: [],
      recommendedTools: [],
      hasTests: projectInfo.hasTests,
      testFramework: projectInfo.testFramework,
      hasWorkflows: false,
      hasDocker: false,
      hasKubernetes: false,
      hasGitHooks: false,
      detectionConfidence: {
        projectType: 0.8,
        framework: 0.7,
        buildSystem: 0.9,
      },
    };

    const validator = new SetupValidator(args.directory || this.projectRoot);
    return await validator.validateSetup(config, profile);
  }

  /**
   * Rollback to a previous configuration
   */
  async rollbackSetup(args: RollbackArgs): Promise<RollbackResult> {
    logger.info(`Rolling back to ${args.backupPath}...`);

    const wizard = new OnboardingWizard(args.directory || this.projectRoot);

    try {
      await wizard.rollback(args.backupPath);

      return {
        success: true,
        message: `Successfully rolled back to ${args.backupPath}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Rollback failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ============================================================================
  // Validation Methods (for MCP schema validation)
  // ============================================================================

  static validateOnboardingArgs(args: unknown): OnboardingWizardArgs {
    if (typeof args !== "object" || args === null) {
      throw new Error("Invalid arguments: expected object");
    }

    const a = args as Record<string, unknown>;

    return {
      directory: typeof a.directory === "string" ? a.directory : undefined,
      interactive: typeof a.interactive === "boolean" ? a.interactive : false,
      autoInstall: typeof a.autoInstall === "boolean" ? a.autoInstall : false,
      generateConfig:
        typeof a.generateConfig === "boolean" ? a.generateConfig : true,
      validateSetup:
        typeof a.validateSetup === "boolean" ? a.validateSetup : true,
      backupExisting:
        typeof a.backupExisting === "boolean" ? a.backupExisting : true,
      dryRun: typeof a.dryRun === "boolean" ? a.dryRun : false,
      skipToolVerification:
        typeof a.skipToolVerification === "boolean"
          ? a.skipToolVerification
          : false,
    };
  }

  static validateDetectArgs(args: unknown): DetectProjectArgs {
    if (typeof args !== "object" || args === null) {
      throw new Error("Invalid arguments: expected object");
    }

    const a = args as Record<string, unknown>;

    return {
      directory: typeof a.directory === "string" ? a.directory : undefined,
    };
  }

  static validateGenerateConfigArgs(args: unknown): GenerateConfigArgs {
    if (typeof args !== "object" || args === null) {
      throw new Error("Invalid arguments: expected object");
    }

    const a = args as Record<string, unknown>;

    return {
      directory: typeof a.directory === "string" ? a.directory : undefined,
    };
  }

  static validateValidateSetupArgs(args: unknown): ValidateSetupArgs {
    if (typeof args !== "object" || args === null) {
      throw new Error("Invalid arguments: expected object");
    }

    const a = args as Record<string, unknown>;

    return {
      directory: typeof a.directory === "string" ? a.directory : undefined,
      configPath: typeof a.configPath === "string" ? a.configPath : undefined,
    };
  }

  static validateRollbackArgs(args: unknown): RollbackArgs {
    if (typeof args !== "object" || args === null) {
      throw new Error("Invalid arguments: expected object");
    }

    const a = args as Record<string, unknown>;

    if (typeof a.backupPath !== "string") {
      throw new Error("backupPath is required and must be a string");
    }

    return {
      backupPath: a.backupPath,
      directory: typeof a.directory === "string" ? a.directory : undefined,
    };
  }
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface OnboardingWizardArgs {
  directory?: string;
  interactive?: boolean;
  autoInstall?: boolean;
  generateConfig?: boolean;
  validateSetup?: boolean;
  backupExisting?: boolean;
  dryRun?: boolean;
  skipToolVerification?: boolean;
}

export interface DetectProjectArgs {
  directory?: string;
}

export interface GenerateConfigArgs {
  directory?: string;
}

export interface ValidateSetupArgs {
  directory?: string;
  configPath?: string;
}

export interface RollbackArgs {
  backupPath: string;
  directory?: string;
}

export interface ProjectProfileResult {
  success: boolean;
  projectType: string;
  language: string;
  framework?: string;
  buildSystem: string;
  hasTests: boolean;
  testFramework?: string;
  lintingTools: string[];
  configFiles: string[];
  makeTargets?: string[];
  packageManager?: string;
}

export interface GenerateConfigResult {
  success: boolean;
  config: MCPDevToolsConfig;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface RollbackResult {
  success: boolean;
  message: string;
  error?: string;
}

export { OnboardingResult, ValidationResult };
