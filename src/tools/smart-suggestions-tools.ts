/**
 * Smart Suggestions Tools
 *
 * MCP tool integration for AI-powered smart suggestions and failure analysis.
 * Provides intelligent recommendations for workflow optimization and issue resolution.
 */

import { z } from 'zod';
import { SuggestionEngine, SmartSuggestion, SuggestionContext } from '../utils/suggestion-engine.js';
import { ShellExecutor, ExecutionResult } from '../utils/shell-executor.js';
import { AnalysisResult } from '../utils/failure-analyzer.js';
import { MCPRecommendations, MCPCategory, MCPServerRecommendation } from '../utils/mcp-recommendations.js';
import { ProjectDetector } from '../utils/project-detector.js';

// Schema for analyze_command arguments
const AnalyzeCommandArgsSchema = z.object({
  command: z.string().min(1).describe('Command to execute and analyze'),
  directory: z.string().optional().describe('Working directory for the command'),
  timeout: z.number().optional().describe('Command timeout in milliseconds'),
  args: z.array(z.string()).optional().describe('Additional command arguments'),
  context: z.object({
    tool: z.string().optional(),
    language: z.string().optional(),
    projectType: z.string().optional()
  }).optional().describe('Additional context for better suggestions')
});

// Schema for analyze_result arguments
const AnalyzeResultArgsSchema = z.object({
  command: z.string().describe('Command that was executed'),
  exitCode: z.number().describe('Exit code from command execution'),
  stdout: z.string().optional().describe('Standard output from command'),
  stderr: z.string().optional().describe('Standard error from command'),
  duration: z.number().optional().describe('Execution duration in milliseconds'),
  context: z.object({
    tool: z.string().optional(),
    language: z.string().optional(),
    projectType: z.string().optional()
  }).optional().describe('Additional context for better suggestions')
});

// Schema for get_knowledge_base_stats arguments
const GetKnowledgeBaseStatsArgsSchema = z.object({
  category: z.string().optional().describe('Filter by category (security, performance, etc.)')
});

// Schema for recommend_mcp_servers arguments
const RecommendMCPServersArgsSchema = z.object({
  category: z.string().optional().describe('Filter by category (development, testing, documentation, etc.)'),
  priority: z.enum(['high', 'medium', 'low']).optional().describe('Filter by priority level'),
  useCase: z.string().optional().describe('Specific use case (e.g., "testing", "database")'),
  includeConfig: z.boolean().optional().describe('Include .mcp.json configuration example')
});

export type AnalyzeCommandArgs = z.infer<typeof AnalyzeCommandArgsSchema>;
export type AnalyzeResultArgs = z.infer<typeof AnalyzeResultArgsSchema>;
export type GetKnowledgeBaseStatsArgs = z.infer<typeof GetKnowledgeBaseStatsArgsSchema>;
export type RecommendMCPServersArgs = z.infer<typeof RecommendMCPServersArgsSchema>;

/**
 * Result from analyzing and executing a command with smart suggestions
 * @property {boolean} success - Whether the command execution was successful
 * @property {string} command - The command that was executed
 * @property {ExecutionResult} executionResult - Complete execution result with stdout/stderr
 * @property {AnalysisResult} analysis - Detailed failure analysis results
 * @property {SmartSuggestion[]} suggestions - Array of actionable smart suggestions
 * @property {string} summary - Human-readable summary of the analysis
 * @property {number} duration - Total execution and analysis time in milliseconds
 */
export interface AnalyzeCommandResult {
  success: boolean;
  command: string;
  executionResult: ExecutionResult;
  analysis: AnalysisResult;
  suggestions: SmartSuggestion[];
  summary: string;
  duration: number;
}

/**
 * Result from analyzing a pre-executed command result
 * @property {boolean} success - Whether the original command execution was successful
 * @property {AnalysisResult} analysis - Detailed failure analysis results
 * @property {SmartSuggestion[]} suggestions - Array of actionable smart suggestions
 * @property {string} summary - Human-readable summary of the analysis
 * @property {number} duration - Analysis time in milliseconds
 */
export interface AnalyzeResultResult {
  success: boolean;
  analysis: AnalysisResult;
  suggestions: SmartSuggestion[];
  summary: string;
  duration: number;
}

/**
 * Statistics about the knowledge base failure patterns
 * @property {number} totalPatterns - Total number of failure patterns in the knowledge base
 * @property {Record<string, number>} byCategory - Pattern count breakdown by category
 */
export interface KnowledgeBaseStatsResult {
  totalPatterns: number;
  byCategory: Record<string, number>;
}

/**
 * MCP server recommendations with optional configuration
 * @property {MCPServerRecommendation[]} recommendations - Array of recommended MCP servers
 * @property {number} totalRecommendations - Total count of recommendations returned
 * @property {Record<string, unknown>} [mcpConfig] - Optional .mcp.json configuration object
 */
export interface RecommendMCPServersResult {
  recommendations: MCPServerRecommendation[];
  totalRecommendations: number;
  mcpConfig?: Record<string, unknown>;
}

/**
 * MCP tools for AI-powered smart suggestions and failure analysis
 *
 * Provides four MCP tools for intelligent command analysis and recommendations:
 * - analyze_command: Execute commands with AI-powered failure analysis
 * - analyze_result: Analyze pre-executed command results
 * - get_knowledge_base_stats: Inspect failure pattern database
 * - recommend_mcp_servers: Get contextual MCP server recommendations
 *
 * Each tool combines multiple analysis engines to provide actionable insights.
 */
export class SmartSuggestionsTools {
  private suggestionEngine: SuggestionEngine;
  private executor: ShellExecutor;
  private mcpRecommendations: MCPRecommendations;
  private projectDetector: ProjectDetector;
  private projectRoot: string;

  /**
   * Creates a new SmartSuggestionsTools instance
   *
   * @param {string} [projectRoot] - Optional project root directory.
   *                                 Defaults to current working directory.
   *
   * @example
   * ```typescript
   * // Using current directory
   * const tools = new SmartSuggestionsTools();
   *
   * // Using specific project directory
   * const tools = new SmartSuggestionsTools('/path/to/project');
   * ```
   */
  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.suggestionEngine = new SuggestionEngine(this.projectRoot);
    this.executor = new ShellExecutor(this.projectRoot);
    this.mcpRecommendations = new MCPRecommendations();
    this.projectDetector = new ProjectDetector(this.projectRoot);
  }

  /**
   * Validate and parse analyze_command arguments using Zod schema
   *
   * @param {unknown} args - Arguments to validate
   * @returns {AnalyzeCommandArgs} Validated and typed arguments
   * @throws {z.ZodError} If validation fails
   */
  static validateAnalyzeCommandArgs(args: unknown): AnalyzeCommandArgs {
    return AnalyzeCommandArgsSchema.parse(args);
  }

  /**
   * Validate and parse analyze_result arguments using Zod schema
   *
   * @param {unknown} args - Arguments to validate
   * @returns {AnalyzeResultArgs} Validated and typed arguments
   * @throws {z.ZodError} If validation fails
   */
  static validateAnalyzeResultArgs(args: unknown): AnalyzeResultArgs {
    return AnalyzeResultArgsSchema.parse(args);
  }

  /**
   * Validate and parse get_knowledge_base_stats arguments using Zod schema
   *
   * @param {unknown} args - Arguments to validate
   * @returns {GetKnowledgeBaseStatsArgs} Validated and typed arguments
   * @throws {z.ZodError} If validation fails
   */
  static validateGetKnowledgeBaseStatsArgs(args: unknown): GetKnowledgeBaseStatsArgs {
    return GetKnowledgeBaseStatsArgsSchema.parse(args);
  }

  /**
   * Validate and parse recommend_mcp_servers arguments using Zod schema
   *
   * @param {unknown} args - Arguments to validate
   * @returns {RecommendMCPServersArgs} Validated and typed arguments
   * @throws {z.ZodError} If validation fails
   */
  static validateRecommendMCPServersArgs(args: unknown): RecommendMCPServersArgs {
    return RecommendMCPServersArgsSchema.parse(args);
  }

  /**
   * Execute a command and provide AI-powered analysis with smart suggestions
   *
   * This tool combines command execution with intelligent failure analysis,
   * providing actionable suggestions for fixing issues and optimizing workflows.
   *
   * @param {AnalyzeCommandArgs} args - Command execution parameters
   * @param {string} args.command - The command to execute
   * @param {string[]} [args.args] - Command arguments
   * @param {string} [args.directory] - Working directory
   * @param {number} [args.timeout] - Execution timeout in milliseconds
   * @param {object} [args.context] - Additional context (tool, language, projectType)
   * @returns {Promise<AnalyzeCommandResult>} Execution result with analysis and suggestions
   *
   * @example
   * ```typescript
   * const result = await tools.analyzeCommand({
   *   command: 'go test',
   *   args: ['./...'],
   *   context: { language: 'go', projectType: 'go' }
   * });
   * if (!result.success) {
   *   console.log('Suggestions:', result.suggestions);
   * }
   * ```
   */
  async analyzeCommand(args: AnalyzeCommandArgs): Promise<AnalyzeCommandResult> {
    // Validate arguments
    const validatedArgs = SmartSuggestionsTools.validateAnalyzeCommandArgs(args);

    const startTime = Date.now();

    try {
      // Execute the command
      const executionResult = await this.executor.execute(
        validatedArgs.command,
        {
          cwd: validatedArgs.directory,
          timeout: validatedArgs.timeout,
          args: validatedArgs.args
        }
      );

      // Generate suggestions
      const context: SuggestionContext = {
        tool: args.context?.tool,
        language: args.context?.language,
        command: args.command,
        workingDirectory: args.directory
      };

      const suggestionResult = await this.suggestionEngine.generateSuggestions(
        executionResult,
        context
      );

      const totalDuration = Date.now() - startTime;

      return {
        success: executionResult.success,
        command: args.command,
        executionResult,
        analysis: suggestionResult.analysis,
        suggestions: suggestionResult.suggestions,
        summary: suggestionResult.summary,
        duration: totalDuration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Create a failed execution result
      const executionResult: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: errorMessage,
        exitCode: -1,
        duration: duration,
        command: args.command,
        error: errorMessage
      };

      const suggestionResult = await this.suggestionEngine.generateSuggestions(
        executionResult,
        {
          tool: args.context?.tool,
          language: args.context?.language,
          command: args.command
        }
      );

      return {
        success: false,
        command: args.command,
        executionResult,
        analysis: suggestionResult.analysis,
        suggestions: suggestionResult.suggestions,
        summary: suggestionResult.summary,
        duration
      };
    }
  }

  /**
   * Analyze an already-executed command result and provide smart suggestions
   *
   * Takes the results of a previously executed command and performs the same
   * intelligent analysis as analyzeCommand, but without re-executing the command.
   *
   * @param {AnalyzeResultArgs} args - Pre-executed command result parameters
   * @param {string} args.command - Command that was executed
   * @param {number} args.exitCode - Exit code from command execution
   * @param {string} [args.stdout] - Standard output from command
   * @param {string} [args.stderr] - Standard error from command
   * @param {number} [args.duration] - Execution duration in milliseconds
   * @param {object} [args.context] - Additional context for better suggestions
   * @returns {Promise<AnalyzeResultResult>} Analysis result with suggestions
   *
   * @example
   * ```typescript
   * const result = await tools.analyzeResult({
   *   command: 'npm test',
   *   exitCode: 1,
   *   stderr: 'Test failed: expected 2 but got 3',
   *   context: { language: 'javascript', projectType: 'nodejs' }
   * });
   * console.log('Analysis:', result.analysis.errorSummary);
   * ```
   */
  async analyzeResult(args: AnalyzeResultArgs): Promise<AnalyzeResultResult> {
    const startTime = Date.now();

    // Create ExecutionResult from provided data
    const executionResult: ExecutionResult = {
      success: args.exitCode === 0,
      stdout: args.stdout || '',
      stderr: args.stderr || '',
      exitCode: args.exitCode,
      duration: args.duration || 0,
      command: args.command,
      error: args.exitCode !== 0 ? `Command exited with code ${args.exitCode}` : undefined
    };

    // Generate suggestions
    const context: SuggestionContext = {
      tool: args.context?.tool,
      language: args.context?.language,
      command: args.command
    };

    const suggestionResult = await this.suggestionEngine.generateSuggestions(
      executionResult,
      context
    );

    const duration = Date.now() - startTime;

    return {
      success: executionResult.success,
      analysis: suggestionResult.analysis,
      suggestions: suggestionResult.suggestions,
      summary: suggestionResult.summary,
      duration
    };
  }

  /**
   * Get statistics about the smart suggestions knowledge base
   *
   * Provides insights into the pattern database used for failure detection,
   * including total pattern counts and category distribution.
   *
   * @param {GetKnowledgeBaseStatsArgs} args - Statistics query parameters
   * @param {string} [args.category] - Optional category filter
   * @returns {Promise<KnowledgeBaseStatsResult>} Knowledge base statistics
   *
   * @example
   * ```typescript
   * const stats = await tools.getKnowledgeBaseStats({});
   * console.log(`Knowledge base has ${stats.totalPatterns} patterns`);
   *
   * const securityStats = await tools.getKnowledgeBaseStats({
   *   category: 'security'
   * });
   * console.log(`Security patterns: ${securityStats.totalPatterns}`);
   * ```
   */
  async getKnowledgeBaseStats(
    args: GetKnowledgeBaseStatsArgs
  ): Promise<KnowledgeBaseStatsResult> {
    const stats = this.suggestionEngine.getKnowledgeBaseStats();

    if (args.category) {
      // Filter by category if specified
      const categoryStats = stats.byCategory[args.category];
      return {
        totalPatterns: categoryStats || 0,
        byCategory: { [args.category]: categoryStats || 0 }
      };
    }

    return stats;
  }

  /**
   * Recommend MCP servers based on project context and use case requirements
   *
   * Provides intelligent recommendations for MCP servers that would enhance
   * development workflows, based on project type, existing tools, and specific needs.
   *
   * @param {RecommendMCPServersArgs} args - Recommendation query parameters
   * @param {string} [args.category] - Filter by category (development, testing, etc.)
   * @param {'high' | 'medium' | 'low'} [args.priority] - Filter by priority level
   * @param {string} [args.useCase] - Specific use case (e.g., "testing", "database")
   * @param {boolean} [args.includeConfig] - Include .mcp.json configuration example
   * @returns {Promise<RecommendMCPServersResult>} MCP server recommendations with optional config
   *
   * @example
   * ```typescript
   * // Get testing-focused recommendations
   * const testingRecs = await tools.recommendMCPServers({
   *   category: 'testing',
   *   includeConfig: true
   * });
   *
   * // Get contextual recommendations for current project
   * const contextualRecs = await tools.recommendMCPServers({});
   * console.log('Recommended servers:', contextualRecs.recommendations.map(r => r.name));
   * ```
   */
  async recommendMCPServers(
    args: RecommendMCPServersArgs
  ): Promise<RecommendMCPServersResult> {
    let recommendations: MCPServerRecommendation[] = [];

    // Get recommendations based on filters
    if (args.category) {
      const category = args.category as MCPCategory;
      recommendations = this.mcpRecommendations.getRecommendationsByCategory(category);
    } else if (args.priority) {
      recommendations = this.mcpRecommendations.getRecommendationsByPriority(args.priority);
    } else if (args.useCase) {
      recommendations = this.mcpRecommendations.getRecommendationsForUseCase(args.useCase);
    } else {
      // Get contextual recommendations based on project
      const projectInfo = await this.projectDetector.detectProject();
      recommendations = this.mcpRecommendations.getContextualRecommendations({
        projectType: projectInfo.type,
        hasTests: projectInfo.hasTests,
        hasDatabase: false, // Could be enhanced with database detection
        hasWebInterface: projectInfo.framework?.includes('React') ||
                        projectInfo.framework?.includes('Vue') ||
                        projectInfo.framework?.includes('Angular'),
        detectedIssues: []
      });
    }

    const result: RecommendMCPServersResult = {
      recommendations,
      totalRecommendations: recommendations.length
    };

    // Include config if requested
    if (args.includeConfig) {
      result.mcpConfig = this.mcpRecommendations.generateMCPConfig(recommendations);
    }

    return result;
  }
}
