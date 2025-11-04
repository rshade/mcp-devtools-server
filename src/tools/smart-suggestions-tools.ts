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

export interface AnalyzeCommandResult {
  success: boolean;
  command: string;
  executionResult: ExecutionResult;
  analysis: AnalysisResult;
  suggestions: SmartSuggestion[];
  summary: string;
  duration: number;
}

export interface AnalyzeResultResult {
  success: boolean;
  analysis: AnalysisResult;
  suggestions: SmartSuggestion[];
  summary: string;
  duration: number;
}

export interface KnowledgeBaseStatsResult {
  totalPatterns: number;
  byCategory: Record<string, number>;
}

export interface RecommendMCPServersResult {
  recommendations: MCPServerRecommendation[];
  totalRecommendations: number;
  mcpConfig?: Record<string, unknown>;
}

export class SmartSuggestionsTools {
  private suggestionEngine: SuggestionEngine;
  private executor: ShellExecutor;
  private mcpRecommendations: MCPRecommendations;
  private projectDetector: ProjectDetector;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.suggestionEngine = new SuggestionEngine(this.projectRoot);
    this.executor = new ShellExecutor(this.projectRoot);
    this.mcpRecommendations = new MCPRecommendations();
    this.projectDetector = new ProjectDetector(this.projectRoot);
  }

  /**
   * Validate analyze_command arguments
   */
  static validateAnalyzeCommandArgs(args: unknown): AnalyzeCommandArgs {
    return AnalyzeCommandArgsSchema.parse(args);
  }

  /**
   * Validate analyze_result arguments
   */
  static validateAnalyzeResultArgs(args: unknown): AnalyzeResultArgs {
    return AnalyzeResultArgsSchema.parse(args);
  }

  /**
   * Validate get_knowledge_base_stats arguments
   */
  static validateGetKnowledgeBaseStatsArgs(args: unknown): GetKnowledgeBaseStatsArgs {
    return GetKnowledgeBaseStatsArgsSchema.parse(args);
  }

  /**
   * Validate recommend_mcp_servers arguments
   */
  static validateRecommendMCPServersArgs(args: unknown): RecommendMCPServersArgs {
    return RecommendMCPServersArgsSchema.parse(args);
  }

  /**
   * Execute a command and provide smart suggestions based on the result
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
   * Analyze an already-executed command result and provide suggestions
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
   * Get statistics about the knowledge base
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
   * Recommend MCP servers based on project context and use case
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
