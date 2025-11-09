/**
 * Custom Linters Plugin - EXAMPLE IMPLEMENTATION
 *
 * This plugin demonstrates how to create project-specific linting tools that extend
 * beyond standard linters. It shows patterns for:
 * - Custom validation rules
 * - Configuration file checking
 * - Project convention enforcement
 * - Multi-file consistency checks
 *
 * USE CASES:
 * - Enforce company coding standards
 * - Validate API documentation consistency
 * - Check file naming conventions
 * - Verify import/export patterns
 * - Enforce architectural boundaries
 *
 * PLUGIN DEVELOPERS: Study this implementation to learn:
 * - Configuration-driven validation
 * - File pattern matching and scanning
 * - Detailed error reporting with line numbers
 * - Integration with existing linting tools
 *
 * @module plugins/custom-linters-plugin
 */

import { z } from "zod";
import {
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginTool,
  PluginHealth,
} from "./plugin-interface.js";
import * as path from "path";
import * as fs from "fs/promises";
import { glob } from "glob";

/**
 * Zod schemas for input validation
 */

const LintFilesArgsSchema = z.object({
  patterns: z
    .array(z.string())
    .optional()
    .describe("Glob patterns to match files"),
  rules: z
    .array(z.enum(["naming", "imports", "todos", "console", "all"]))
    .optional()
    .describe("Rules to check"),
  fix: z.boolean().optional().describe("Auto-fix issues where possible"),
});

const CheckConventionsArgsSchema = z.object({
  type: z
    .enum(["file-naming", "directory-structure", "api-docs", "exports"])
    .describe("Convention type to check"),
});

/**
 * Custom linting rule interface
 */
interface LintRule {
  name: string;
  pattern?: RegExp;
  check: (content: string, filePath: string) => LintViolation[];
}

/**
 * Linting violation interface
 */
interface LintViolation {
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  file: string;
  line?: number;
  column?: number;
  fixable?: boolean;
}

/**
 * Lint result interface
 */
interface LintResult {
  success: boolean;
  filesChecked: number;
  violations: LintViolation[];
  fixed?: number;
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Custom Linters Plugin Implementation
 *
 * Provides project-specific linting beyond standard tools.
 */
export class CustomLintersPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: "custom-linters",
    version: "1.0.0",
    description: "Project-specific linting and convention enforcement",
    author: "MCP DevTools Team",
    homepage: "https://github.com/rshade/mcp-devtools-server",
    requiredCommands: [], // No external commands needed
    tags: ["linting", "quality", "conventions"],
    defaultEnabled: false, // Opt-in for projects that need it
  };

  private context!: PluginContext;
  private rules: Map<string, LintRule> = new Map();

  /**
   * Initialize plugin with context and setup rules
   *
   * @param context - Plugin execution context
   */
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;

    // Setup linting rules
    this.setupRules();

    this.context.logger.info("custom-linters plugin initialized");
  }

  /**
   * Setup custom linting rules
   */
  private setupRules(): void {
    // Rule 1: File naming conventions
    this.rules.set("naming", {
      name: "naming",
      check: (_content: string, filePath: string): LintViolation[] => {
        const violations: LintViolation[] = [];
        const filename = path.basename(filePath);

        // Check for kebab-case in TypeScript files
        if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
          if (
            !/^[a-z0-9-]+\.(ts|tsx)$/.test(filename) &&
            !filename.endsWith(".test.ts")
          ) {
            violations.push({
              rule: "naming",
              severity: "warning",
              message: `File name should use kebab-case: ${filename}`,
              file: filePath,
              fixable: false,
            });
          }
        }

        return violations;
      },
    });

    // Rule 2: Import organization
    this.rules.set("imports", {
      name: "imports",
      pattern: /^import\s+/gm,
      check: (content: string, filePath: string): LintViolation[] => {
        const violations: LintViolation[] = [];
        const lines = content.split("\n");

        let lastImportLine = -1;
        let foundNonImport = false;

        lines.forEach((line, index) => {
          const trimmed = line.trim();

          // Skip comments and empty lines
          if (
            trimmed.startsWith("//") ||
            trimmed.startsWith("/*") ||
            trimmed === ""
          ) {
            return;
          }

          if (trimmed.startsWith("import ")) {
            if (foundNonImport) {
              violations.push({
                rule: "imports",
                severity: "warning",
                message: "Imports should be at the top of the file",
                file: filePath,
                line: index + 1,
                fixable: true,
              });
            }
            lastImportLine = index;
          } else if (lastImportLine >= 0) {
            foundNonImport = true;
          }
        });

        return violations;
      },
    });

    // Rule 3: TODO/FIXME tracking
    this.rules.set("todos", {
      name: "todos",
      pattern: /(TODO|FIXME|HACK|XXX):/gi,
      check: (content: string, filePath: string): LintViolation[] => {
        const violations: LintViolation[] = [];
        const lines = content.split("\n");

        lines.forEach((line, index) => {
          const match = /(TODO|FIXME|HACK|XXX):/gi.exec(line);
          if (match) {
            violations.push({
              rule: "todos",
              severity: "info",
              message: `Found ${match[1]}: ${line.trim()}`,
              file: filePath,
              line: index + 1,
              fixable: false,
            });
          }
        });

        return violations;
      },
    });

    // Rule 4: Console statements (should use logger)
    this.rules.set("console", {
      name: "console",
      pattern: /console\.(log|warn|error|debug|info)/g,
      check: (content: string, filePath: string): LintViolation[] => {
        const violations: LintViolation[] = [];
        const lines = content.split("\n");

        // Skip test files
        if (filePath.includes("__tests__") || filePath.endsWith(".test.ts")) {
          return violations;
        }

        lines.forEach((line, index) => {
          if (/console\.(log|warn|error|debug|info)/.test(line)) {
            // Allow in comments
            if (line.trim().startsWith("//")) return;

            violations.push({
              rule: "console",
              severity: "warning",
              message: "Use logger instead of console statements",
              file: filePath,
              line: index + 1,
              fixable: false,
            });
          }
        });

        return violations;
      },
    });
  }

  /**
   * Register all MCP tools this plugin provides
   *
   * @returns Array of tool definitions
   */
  async registerTools(): Promise<PluginTool[]> {
    return [
      {
        name: "lint_files",
        description: "Run custom linting rules on project files",
        inputSchema: {
          type: "object",
          properties: {
            patterns: {
              type: "array",
              items: { type: "string" },
              description:
                "Glob patterns to match files (default: src/**/*.ts)",
            },
            rules: {
              type: "array",
              items: {
                type: "string",
                enum: ["naming", "imports", "todos", "console", "all"],
              },
              description: "Rules to check (default: all)",
            },
            fix: {
              type: "boolean",
              description: "Auto-fix issues where possible",
            },
          },
        },
        examples: [
          {
            description: "Lint all TypeScript files",
            input: { patterns: ["src/**/*.ts"] },
          },
          {
            description: "Check specific rules",
            input: { patterns: ["src/**/*.ts"], rules: ["imports", "console"] },
          },
        ],
        tags: ["lint", "quality"],
      },
      {
        name: "check_conventions",
        description: "Check project conventions and architecture rules",
        inputSchema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [
                "file-naming",
                "directory-structure",
                "api-docs",
                "exports",
              ],
              description: "Convention type to check",
            },
          },
          required: ["type"],
        },
        examples: [
          {
            description: "Check file naming conventions",
            input: { type: "file-naming" },
          },
          {
            description: "Check directory structure",
            input: { type: "directory-structure" },
          },
        ],
        tags: ["conventions", "architecture"],
      },
    ];
  }

  /**
   * Handle tool execution requests
   *
   * @param toolName - Name of the tool to execute
   * @param args - Tool arguments
   * @returns Tool execution result
   */
  async handleToolCall(toolName: string, args: unknown): Promise<unknown> {
    this.context.logger.debug(`Executing tool: ${toolName}`, { args });

    try {
      switch (toolName) {
        case "lint_files":
          return await this.lintFiles(args);
        case "check_conventions":
          return await this.checkConventions(args);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      this.context.logger.error(`Tool execution failed: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * Optional: Health check for monitoring
   *
   * @returns Health status
   */
  async healthCheck(): Promise<PluginHealth> {
    const checks: Record<string, boolean> = {};

    // Check if project directory is accessible
    try {
      await fs.access(this.context.projectRoot);
      checks["project-accessible"] = true;
    } catch {
      checks["project-accessible"] = false;
    }

    // Check if rules are loaded
    checks["rules-loaded"] = this.rules.size > 0;

    const allHealthy = Object.values(checks).every((v) => v);

    return {
      status: allHealthy ? "healthy" : "degraded",
      message: allHealthy ? "All checks passed" : "Some checks failed",
      checks,
      timestamp: new Date(),
    };
  }

  // ========================================================================
  // Tool Implementations
  // ========================================================================

  /**
   * Lint files with custom rules
   *
   * @param args - Lint arguments
   * @returns Lint result with violations
   */
  private async lintFiles(args: unknown): Promise<LintResult> {
    const validated = LintFilesArgsSchema.parse(args);

    const patterns = validated.patterns || ["src/**/*.ts"];
    const ruleNames = validated.rules || ["all"];
    const shouldFix = validated.fix || false;

    // Resolve patterns
    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.context.projectRoot,
        absolute: true,
        ignore: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
      });
      files.push(...matches);
    }

    if (files.length === 0) {
      return {
        success: true,
        filesChecked: 0,
        violations: [],
        summary: { errors: 0, warnings: 0, info: 0 },
      };
    }

    this.context.logger.info(`Linting ${files.length} file(s)...`);

    // Run rules on each file
    const allViolations: LintViolation[] = [];
    let fixedCount = 0;

    for (const file of files) {
      const content = await fs.readFile(file, "utf-8");

      // Get applicable rules
      const rulesToRun = ruleNames.includes("all")
        ? Array.from(this.rules.values())
        : (ruleNames
            .map((name) => this.rules.get(name))
            .filter(Boolean) as LintRule[]);

      // Run each rule
      for (const rule of rulesToRun) {
        const violations = rule.check(content, file);
        allViolations.push(...violations);

        // Auto-fix if requested and fixable
        if (shouldFix) {
          for (const violation of violations) {
            if (violation.fixable) {
              // Implement fixes here
              fixedCount++;
            }
          }
        }
      }
    }

    // Calculate summary
    const summary = {
      errors: allViolations.filter((v) => v.severity === "error").length,
      warnings: allViolations.filter((v) => v.severity === "warning").length,
      info: allViolations.filter((v) => v.severity === "info").length,
    };

    return {
      success: summary.errors === 0,
      filesChecked: files.length,
      violations: allViolations,
      fixed: shouldFix ? fixedCount : undefined,
      summary,
    };
  }

  /**
   * Check project conventions
   *
   * @param args - Convention check arguments
   * @returns Convention check result
   */
  private async checkConventions(args: unknown): Promise<{
    success: boolean;
    type: string;
    violations: string[];
    suggestions: string[];
  }> {
    const validated = CheckConventionsArgsSchema.parse(args);

    switch (validated.type) {
      case "file-naming":
        return await this.checkFileNaming();
      case "directory-structure":
        return await this.checkDirectoryStructure();
      case "api-docs":
        return await this.checkApiDocs();
      case "exports":
        return await this.checkExports();
      default:
        throw new Error(`Unknown convention type: ${validated.type}`);
    }
  }

  /**
   * Check file naming conventions
   */
  private async checkFileNaming(): Promise<{
    success: boolean;
    type: string;
    violations: string[];
    suggestions: string[];
  }> {
    const violations: string[] = [];
    const suggestions: string[] = [];

    const files = await glob("src/**/*.{ts,tsx}", {
      cwd: this.context.projectRoot,
      absolute: true,
      ignore: ["**/node_modules/**", "**/dist/**"],
    });

    for (const file of files) {
      const filename = path.basename(file);
      const relativePath = path.relative(this.context.projectRoot, file);

      // Check kebab-case
      if (
        !/^[a-z0-9-]+\.(ts|tsx)$/.test(filename) &&
        !filename.endsWith(".test.ts")
      ) {
        violations.push(`${relativePath}: Should use kebab-case`);
      }

      // Check for index files organization
      if (filename === "index.ts") {
        const content = await fs.readFile(file, "utf-8");
        if (!content.includes("export")) {
          suggestions.push(`${relativePath}: index.ts should contain exports`);
        }
      }
    }

    return {
      success: violations.length === 0,
      type: "file-naming",
      violations,
      suggestions,
    };
  }

  /**
   * Check directory structure conventions
   */
  private async checkDirectoryStructure(): Promise<{
    success: boolean;
    type: string;
    violations: string[];
    suggestions: string[];
  }> {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Expected directories for this project
    const expectedDirs = [
      "src",
      "src/tools",
      "src/utils",
      "src/plugins",
      "src/__tests__",
    ];

    for (const dir of expectedDirs) {
      const fullPath = path.join(this.context.projectRoot, dir);
      try {
        await fs.access(fullPath);
      } catch {
        violations.push(`Missing expected directory: ${dir}`);
      }
    }

    // Check for common anti-patterns
    const srcFiles = await glob("src/*.ts", {
      cwd: this.context.projectRoot,
      absolute: true,
    });

    if (srcFiles.length > 5) {
      suggestions.push("Consider organizing src/ files into subdirectories");
    }

    return {
      success: violations.length === 0,
      type: "directory-structure",
      violations,
      suggestions,
    };
  }

  /**
   * Check API documentation conventions
   */
  private async checkApiDocs(): Promise<{
    success: boolean;
    type: string;
    violations: string[];
    suggestions: string[];
  }> {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check for JSDoc on public exports
    const toolFiles = await glob("src/tools/*.ts", {
      cwd: this.context.projectRoot,
      absolute: true,
      ignore: ["**/*.test.ts"],
    });

    for (const file of toolFiles) {
      const content = await fs.readFile(file, "utf-8");
      const relativePath = path.relative(this.context.projectRoot, file);

      // Check for export class/function without JSDoc
      const exportPattern = /export (class|function|const)/g;
      const jsdocPattern = /\/\*\*[\s\S]*?\*\//g;

      const exports = Array.from(content.matchAll(exportPattern));
      const jsdocs = Array.from(content.matchAll(jsdocPattern));

      if (exports.length > jsdocs.length) {
        violations.push(`${relativePath}: Missing JSDoc for some exports`);
      }
    }

    return {
      success: violations.length === 0,
      type: "api-docs",
      violations,
      suggestions,
    };
  }

  /**
   * Check export patterns
   */
  private async checkExports(): Promise<{
    success: boolean;
    type: string;
    violations: string[];
    suggestions: string[];
  }> {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check that index.ts files exist for directories
    const dirs = await glob("src/*/", {
      cwd: this.context.projectRoot,
      absolute: true,
      ignore: ["**/node_modules/**", "**/dist/**", "**/__tests__/**"],
    });

    for (const dir of dirs) {
      const indexPath = path.join(dir, "index.ts");
      const relativePath = path.relative(this.context.projectRoot, dir);

      try {
        await fs.access(indexPath);

        // Check that index.ts exports things
        const content = await fs.readFile(indexPath, "utf-8");
        if (!content.includes("export")) {
          suggestions.push(
            `${relativePath}/index.ts should export module contents`,
          );
        }
      } catch {
        suggestions.push(
          `Consider adding ${relativePath}/index.ts for cleaner imports`,
        );
      }
    }

    return {
      success: violations.length === 0,
      type: "exports",
      violations,
      suggestions,
    };
  }
}
