import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import winston from 'winston';
import { MCPDevToolsConfig, ProjectProfile, ValidationResult, Validation, ValidationError, ValidationWarning, Recommendation } from './onboarding-wizard.js';
import { ToolInstaller } from './tool-installer.js';

const execAsync = promisify(exec);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

/**
 * SetupValidator validates MCP DevTools configuration and setup
 */
export class SetupValidator {
  private projectRoot: string;
  private toolInstaller: ToolInstaller;

  constructor(projectRoot?: string) {
    this.projectRoot = this.validateProjectRoot(projectRoot);
    this.toolInstaller = new ToolInstaller();
  }

  /**
   * Validate project root path
   * @param projectRoot - User-provided project root
   * @returns Validated absolute path
   * @throws Error if path is invalid
   */
  private validateProjectRoot(projectRoot?: string): string {
    const root = projectRoot || process.cwd();
    const resolvedPath = path.resolve(root);

    // Basic validation
    if (resolvedPath.includes('\0')) {
      throw new Error('Invalid project root: null bytes not allowed in path');
    }

    logger.debug(`Validated project root: ${resolvedPath}`);
    return resolvedPath;
  }

  /**
   * Validate the complete setup
   */
  async validateSetup(config: MCPDevToolsConfig, profile: ProjectProfile): Promise<ValidationResult> {
    logger.info('Starting setup validation...');

    const validations: Validation[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: Recommendation[] = [];

    // 1. Validate configuration file
    const configValidation = await this.validateConfiguration(config);
    validations.push(...configValidation.validations);
    errors.push(...configValidation.errors);
    warnings.push(...configValidation.warnings);

    // 2. Validate commands
    const commandValidations = await this.validateCommands(config);
    validations.push(...commandValidations);

    // 3. Validate tools
    const toolValidations = await this.validateTools(config);
    validations.push(...toolValidations.validations);
    errors.push(...toolValidations.errors);
    warnings.push(...toolValidations.warnings);

    // 4. Test basic operations (if safe to do so)
    const operationTests = await this.testBasicOperations(config);
    validations.push(...operationTests);

    // 5. Generate recommendations
    const setupRecommendations = this.generateRecommendations(
      config,
      profile,
      validations,
      errors,
      warnings
    );
    recommendations.push(...setupRecommendations);

    // Calculate overall score
    const score = this.calculateScore(validations, errors, warnings);

    const success = errors.length === 0;

    logger.info(`Validation complete. Score: ${score}/100, Errors: ${errors.length}, Warnings: ${warnings.length}`);

    return {
      success,
      validations,
      errors,
      warnings,
      recommendations,
      score
    };
  }

  /**
   * Validate configuration against schema
   */
  private async validateConfiguration(config: MCPDevToolsConfig): Promise<{
    validations: Validation[];
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const validations: Validation[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const startTime = Date.now();

    // Check schema reference
    if (!config.$schema) {
      warnings.push({
        category: 'configuration',
        message: 'No $schema reference found',
        suggestion: 'Add "$schema": "./.mcp-devtools.schema.json" for IDE validation'
      });
    }

    // Validate commands
    if (!config.commands || Object.keys(config.commands).length === 0) {
      errors.push({
        category: 'configuration',
        message: 'No commands defined in configuration',
        severity: 'error'
      });
    } else {
      validations.push({
        category: 'configuration',
        name: 'Commands defined',
        passed: true,
        message: `${Object.keys(config.commands).length} commands configured`
      });
    }

    // Validate timeout
    if (config.timeout !== undefined) {
      if (config.timeout < 1000) {
        errors.push({
          category: 'configuration',
          message: 'Timeout must be at least 1000ms',
          severity: 'error'
        });
      } else if (config.timeout > 3600000) {
        warnings.push({
          category: 'configuration',
          message: 'Timeout is very high (> 1 hour)',
          suggestion: 'Consider reducing timeout to a more reasonable value'
        });
      } else {
        validations.push({
          category: 'configuration',
          name: 'Timeout valid',
          passed: true,
          message: `Timeout set to ${config.timeout}ms`
        });
      }
    }

    // Validate parallel settings
    if (config.parallel?.makeJobs !== undefined) {
      if (config.parallel.makeJobs < 1 || config.parallel.makeJobs > 32) {
        errors.push({
          category: 'configuration',
          message: 'makeJobs must be between 1 and 32',
          severity: 'error'
        });
      }
    }

    // Validate linters
    if (config.linters && config.linters.length === 0) {
      warnings.push({
        category: 'configuration',
        message: 'No linters configured',
        suggestion: 'Consider adding linters like eslint, markdownlint, or yamllint'
      });
    }

    // Validate project type
    const validProjectTypes = ['nodejs', 'python', 'go', 'rust', 'java', 'dotnet', 'mixed'];
    if (config.projectType && !validProjectTypes.includes(config.projectType)) {
      warnings.push({
        category: 'configuration',
        message: `Unknown project type: ${config.projectType}`,
        suggestion: `Valid types: ${validProjectTypes.join(', ')}`
      });
    }

    const duration = Date.now() - startTime;
    validations.push({
      category: 'configuration',
      name: 'Configuration validation',
      passed: errors.length === 0,
      message: 'Configuration schema validated',
      duration
    });

    return { validations, errors, warnings };
  }

  /**
   * Validate that commands are executable
   */
  private async validateCommands(config: MCPDevToolsConfig): Promise<Validation[]> {
    const validations: Validation[] = [];

    if (!config.commands) {
      return validations;
    }

    for (const [name, command] of Object.entries(config.commands)) {
      const startTime = Date.now();

      try {
        // Extract the executable from the command
        const executable = command.split(' ')[0];

        // Check if it's a built-in command or executable exists
        if (this.isBuiltinCommand(executable) || await this.isExecutable(executable)) {
          validations.push({
            category: 'commands',
            name: `Command: ${name}`,
            passed: true,
            message: `Command '${executable}' is available`,
            duration: Date.now() - startTime
          });
        } else {
          validations.push({
            category: 'commands',
            name: `Command: ${name}`,
            passed: false,
            message: `Command '${executable}' not found in PATH`,
            duration: Date.now() - startTime
          });
        }
      } catch (error) {
        validations.push({
          category: 'commands',
          name: `Command: ${name}`,
          passed: false,
          message: `Error checking command: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - startTime
        });
      }
    }

    return validations;
  }

  /**
   * Validate that required tools are available
   */
  private async validateTools(config: MCPDevToolsConfig): Promise<{
    validations: Validation[];
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const validations: Validation[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Collect all tools mentioned in config
    const tools = new Set<string>();

    // Add linters
    if (config.linters) {
      for (const linter of config.linters) {
        tools.add(linter);
      }
    }

    // Add test runner
    if (config.testRunner && config.testRunner !== 'make') {
      tools.add(config.testRunner);
    }

    // Validate each tool
    for (const tool of tools) {
      const startTime = Date.now();
      const status = await this.toolInstaller.verifyTool(tool);

      if (status.installed) {
        validations.push({
          category: 'tools',
          name: `Tool: ${tool}`,
          passed: true,
          message: status.version ? `${tool} v${status.version} installed` : `${tool} installed`,
          duration: Date.now() - startTime
        });
      } else {
        warnings.push({
          category: 'tools',
          message: `Tool '${tool}' not found`,
          suggestion: `Install ${tool} to enable related functionality`
        });

        validations.push({
          category: 'tools',
          name: `Tool: ${tool}`,
          passed: false,
          message: `${tool} not installed`,
          duration: Date.now() - startTime
        });
      }
    }

    return { validations, errors, warnings };
  }

  /**
   * Test basic operations (dry-run style)
   */
  private async testBasicOperations(config: MCPDevToolsConfig): Promise<Validation[]> {
    // Unused parameter - stub implementation for future enhancement
    void config;
    const validations: Validation[] = [];

    // Check if config file exists
    const startTime = Date.now();
    try {
      const configPath = path.join(this.projectRoot, '.mcp-devtools.json');
      await fs.access(configPath);

      validations.push({
        category: 'setup',
        name: 'Config file exists',
        passed: true,
        message: 'Configuration file created successfully',
        duration: Date.now() - startTime
      });
    } catch {
      validations.push({
        category: 'setup',
        name: 'Config file exists',
        passed: false,
        message: 'Configuration file not found',
        duration: Date.now() - startTime
      });
    }

    // Check if config is valid JSON
    try {
      const configPath = path.join(this.projectRoot, '.mcp-devtools.json');
      const content = await fs.readFile(configPath, 'utf8');
      JSON.parse(content);

      validations.push({
        category: 'setup',
        name: 'Config file valid JSON',
        passed: true,
        message: 'Configuration is valid JSON'
      });
    } catch (error) {
      validations.push({
        category: 'setup',
        name: 'Config file valid JSON',
        passed: false,
        message: `Configuration is not valid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    return validations;
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(
    config: MCPDevToolsConfig,
    profile: ProjectProfile,
    validations: Validation[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): Recommendation[] {
    // Unused parameters - stub implementation for future enhancement
    void config;
    void warnings;
    const recommendations: Recommendation[] = [];

    // If there are critical errors
    if (errors.length > 0) {
      recommendations.push({
        category: 'config',
        priority: 'high',
        title: 'Fix configuration errors',
        description: `${errors.length} error(s) found in configuration`,
        actions: errors.map(e => e.message),
        automatable: false
      });
    }

    // If tools are missing
    const failedToolValidations = validations.filter(
      v => v.category === 'tools' && !v.passed
    );

    if (failedToolValidations.length > 0) {
      recommendations.push({
        category: 'tool',
        priority: 'medium',
        title: 'Install missing tools',
        description: `${failedToolValidations.length} tool(s) not found`,
        actions: failedToolValidations.map(v => `Install ${v.name.replace('Tool: ', '')}`),
        automatable: true
      });
    }

    // If no tests configured
    if (!profile.hasTests) {
      recommendations.push({
        category: 'workflow',
        priority: 'high',
        title: 'Add tests to your project',
        description: 'No tests detected in the project',
        actions: [
          'Set up test framework',
          'Create test directory structure',
          'Write initial unit tests'
        ],
        automatable: false
      });
    }

    // If no CI/CD
    if (!profile.hasWorkflows) {
      recommendations.push({
        category: 'workflow',
        priority: 'medium',
        title: 'Set up CI/CD',
        description: 'No CI/CD workflows detected',
        actions: [
          'Create .github/workflows/ci.yml',
          'Configure automated testing',
          'Set up deployment pipeline'
        ],
        automatable: false
      });
    }

    return recommendations;
  }

  /**
   * Calculate overall health score (0-100)
   */
  private calculateScore(
    validations: Validation[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): number {
    if (validations.length === 0) {
      return 0;
    }

    // Base score from passing validations
    const passedCount = validations.filter(v => v.passed).length;
    const baseScore = (passedCount / validations.length) * 100;

    // Deduct for errors (critical)
    const errorPenalty = errors.length * 10;

    // Deduct for warnings (minor)
    const warningPenalty = warnings.length * 2;

    // Calculate final score
    let score = baseScore - errorPenalty - warningPenalty;

    // Clamp to 0-100
    score = Math.max(0, Math.min(100, score));

    return Math.round(score);
  }

  /**
   * Generate human-readable validation report
   */
  generateReport(result: ValidationResult): string {
    let report = '# Setup Validation Report\n\n';

    // Overall status
    report += `**Status:** ${result.success ? '✅ Passed' : '❌ Failed'}\n`;
    report += `**Score:** ${result.score}/100\n\n`;

    // Summary
    const passed = result.validations.filter(v => v.passed).length;
    const failed = result.validations.filter(v => !v.passed).length;

    report += `## Summary\n\n`;
    report += `- **Validations:** ${result.validations.length} total (${passed} passed, ${failed} failed)\n`;
    report += `- **Errors:** ${result.errors.length}\n`;
    report += `- **Warnings:** ${result.warnings.length}\n`;
    report += `- **Recommendations:** ${result.recommendations.length}\n\n`;

    // Errors
    if (result.errors.length > 0) {
      report += `## ❌ Errors (${result.errors.length})\n\n`;
      for (const error of result.errors) {
        report += `- **[${error.category}]** ${error.message}\n`;
        if (error.file) {
          report += `  File: ${error.file}${error.line ? `:${error.line}` : ''}\n`;
        }
      }
      report += `\n`;
    }

    // Warnings
    if (result.warnings.length > 0) {
      report += `## ⚠️  Warnings (${result.warnings.length})\n\n`;
      for (const warning of result.warnings) {
        report += `- **[${warning.category}]** ${warning.message}\n`;
        if (warning.suggestion) {
          report += `  Suggestion: ${warning.suggestion}\n`;
        }
      }
      report += `\n`;
    }

    // Validations by category
    const categories = new Set(result.validations.map(v => v.category));

    for (const category of categories) {
      const categoryValidations = result.validations.filter(v => v.category === category);
      const categoryPassed = categoryValidations.filter(v => v.passed).length;

      report += `## ${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryPassed}/${categoryValidations.length})\n\n`;

      for (const validation of categoryValidations) {
        const icon = validation.passed ? '✅' : '❌';
        report += `${icon} **${validation.name}** - ${validation.message}`;
        if (validation.duration) {
          report += ` (${validation.duration}ms)`;
        }
        report += `\n`;
      }
      report += `\n`;
    }

    // Recommendations
    if (result.recommendations.length > 0) {
      report += `## 💡 Recommendations\n\n`;

      const high = result.recommendations.filter(r => r.priority === 'high');
      const medium = result.recommendations.filter(r => r.priority === 'medium');
      const low = result.recommendations.filter(r => r.priority === 'low');

      if (high.length > 0) {
        report += `### High Priority\n\n`;
        for (const rec of high) {
          report += `- **${rec.title}** (${rec.category})\n`;
          report += `  ${rec.description}\n`;
          if (rec.actions.length > 0) {
            report += `  Actions:\n`;
            for (const action of rec.actions) {
              report += `    - ${action}\n`;
            }
          }
        }
        report += `\n`;
      }

      if (medium.length > 0) {
        report += `### Medium Priority\n\n`;
        for (const rec of medium) {
          report += `- **${rec.title}** (${rec.category})\n`;
          report += `  ${rec.description}\n`;
        }
        report += `\n`;
      }

      if (low.length > 0) {
        report += `### Low Priority\n\n`;
        for (const rec of low) {
          report += `- **${rec.title}**\n`;
        }
        report += `\n`;
      }
    }

    return report;
  }

  // Helper methods

  private isBuiltinCommand(cmd: string): boolean {
    const builtins = ['cd', 'echo', 'pwd', 'export', 'source', 'alias'];
    return builtins.includes(cmd);
  }

  private async isExecutable(cmd: string): Promise<boolean> {
    try {
      const whichCmd = process.platform === 'win32' ? 'where' : 'which';
      await execAsync(`${whichCmd} ${cmd}`, { timeout: 5000, windowsHide: true });
      return true;
    } catch {
      return false;
    }
  }
}
