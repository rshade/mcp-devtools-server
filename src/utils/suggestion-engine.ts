/**
 * Suggestion Engine
 *
 * Core engine that generates intelligent suggestions based on failure analysis,
 * project context, and historical patterns.
 */

import { ExecutionResult } from './shell-executor.js';
import { FailureAnalyzer, AnalysisResult, ErrorType } from './failure-analyzer.js';
import { KnowledgeBase } from './knowledge-base.js';
import { ProjectDetector, ProjectType } from './project-detector.js';

export interface SuggestionContext {
  tool?: string;
  language?: string;
  projectType?: ProjectType;
  command?: string;
  workingDirectory?: string;
}

export interface SmartSuggestion {
  title: string;
  description: string;
  actions: string[];
  priority: 'high' | 'medium' | 'low';
  category: string;
  confidence: number;
  relatedFiles?: string[];
}

export interface SuggestionEngineResult {
  success: boolean;
  analysis: AnalysisResult;
  suggestions: SmartSuggestion[];
  summary: string;
  executionTime: number;
}

export class SuggestionEngine {
  private knowledgeBase: KnowledgeBase;
  private failureAnalyzer: FailureAnalyzer;
  private projectDetector: ProjectDetector;

  constructor(projectRoot?: string) {
    this.knowledgeBase = new KnowledgeBase();
    this.failureAnalyzer = new FailureAnalyzer(this.knowledgeBase);
    this.projectDetector = new ProjectDetector(projectRoot);
  }

  /**
   * Generate smart suggestions from execution result
   */
  async generateSuggestions(
    result: ExecutionResult,
    context?: SuggestionContext
  ): Promise<SuggestionEngineResult> {
    const startTime = Date.now();

    // Analyze the failure
    const analysis = this.failureAnalyzer.analyze(result);

    // Generate smart suggestions
    const suggestions = await this.createSmartSuggestions(analysis, context);

    // Generate summary
    const summary = this.generateSummary(analysis, suggestions);

    const executionTime = Date.now() - startTime;

    return {
      success: !analysis.failureDetected,
      analysis,
      suggestions,
      summary,
      executionTime
    };
  }

  private async createSmartSuggestions(
    analysis: AnalysisResult,
    context?: SuggestionContext
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    // If no failure detected, return success suggestions with workflow recommendations
    if (!analysis.failureDetected) {
      suggestions.push({
        title: 'All checks passed',
        description: 'No issues detected in the execution',
        actions: ['Continue with development workflow'],
        priority: 'low',
        category: 'general',
        confidence: 1.0
      });

      // Add workflow optimization suggestions for successful builds
      suggestions.push({
        title: 'Workflow Optimization',
        description: 'Consider next steps in your development workflow',
        actions: [
          'Run tests if not already done',
          'Check code coverage',
          'Review and commit changes',
          'Create a pull request when ready'
        ],
        priority: 'low',
        category: 'workflow',
        confidence: 0.8
      });

      return suggestions;
    }

    // Create suggestions from matched patterns
    for (const pattern of analysis.patterns.slice(0, 3)) {
      suggestions.push({
        title: pattern.name,
        description: this.formatPatternDescription(pattern, analysis),
        actions: pattern.suggestions,
        priority: pattern.severity === 'high' ? 'high' :
                 pattern.severity === 'medium' ? 'medium' : 'low',
        category: pattern.category,
        confidence: analysis.confidence,
        relatedFiles: analysis.affectedFiles
      });
    }

    // Add context-aware suggestions
    const contextSuggestions = await this.generateContextAwareSuggestions(
      analysis,
      context
    );
    suggestions.push(...contextSuggestions);

    // Add workflow optimization suggestions
    const workflowSuggestions = this.generateWorkflowSuggestions(analysis);
    suggestions.push(...workflowSuggestions);

    // Sort by priority and confidence
    return this.prioritizeSuggestions(suggestions);
  }

  private formatPatternDescription(
    pattern: { name: string; context?: string },
    analysis: AnalysisResult
  ): string {
    let description = pattern.context || `Issue detected: ${pattern.name}`;

    if (analysis.affectedFiles.length > 0) {
      const fileList = analysis.affectedFiles.slice(0, 3).join(', ');
      description += `. Affected files: ${fileList}`;
      if (analysis.affectedFiles.length > 3) {
        description += ` and ${analysis.affectedFiles.length - 3} more`;
      }
    }

    return description;
  }

  private async generateContextAwareSuggestions(
    analysis: AnalysisResult,
    context?: SuggestionContext
  ): Promise<SmartSuggestion[]> {
    const suggestions: SmartSuggestion[] = [];

    try {
      // Detect project type if not provided
      const projectInfo = await this.projectDetector.detectProject();
      const projectType = context?.projectType || projectInfo.type;

      // Language-specific suggestions
      if (projectType === ProjectType.Go && analysis.errorType === ErrorType.TestFailure) {
        suggestions.push({
          title: 'Go Test Debugging Tips',
          description: 'Additional debugging options for Go tests',
          actions: [
            'Run with `-v` for verbose output',
            'Use `-run <TestName>` to run specific test',
            'Add `-race` flag to detect race conditions',
            'Try `-count=1` to disable test caching'
          ],
          priority: 'medium',
          category: 'test',
          confidence: 0.8
        });
      }

      if (projectType === ProjectType.NodeJS && analysis.errorType === ErrorType.DependencyIssue) {
        suggestions.push({
          title: 'Node.js Dependency Resolution',
          description: 'Steps to resolve Node.js dependency issues',
          actions: [
            'Clear npm cache: `npm cache clean --force`',
            'Remove node_modules and package-lock.json',
            'Run `npm install` with `--legacy-peer-deps` if peer dependency conflicts',
            'Check for conflicting versions in package.json'
          ],
          priority: 'high',
          category: 'dependencies',
          confidence: 0.9
        });
      }

      if (analysis.errorType === ErrorType.SecurityIssue) {
        suggestions.push({
          title: 'Security Best Practices',
          description: 'Recommended actions for security issues',
          actions: [
            'Never commit secrets to version control',
            'Use environment variables for sensitive data',
            'Consider using a secrets management service',
            'Run security audit tools regularly'
          ],
          priority: 'high',
          category: 'security',
          confidence: 1.0
        });
      }

    } catch {
      // If project detection fails, continue with basic suggestions
    }

    return suggestions;
  }

  private generateWorkflowSuggestions(
    analysis: AnalysisResult
  ): SmartSuggestion[] {
    const suggestions: SmartSuggestion[] = [];

    // Suggest workflow improvements based on error type
    if (analysis.errorType === ErrorType.LintIssue) {
      suggestions.push({
        title: 'Workflow Optimization: Pre-commit Hooks',
        description: 'Catch linting issues before committing',
        actions: [
          'Set up pre-commit hooks with Husky',
          'Configure lint-staged to run linters on changed files',
          'Add linting to CI/CD pipeline',
          'Use editor extensions for real-time linting'
        ],
        priority: 'low',
        category: 'workflow',
        confidence: 0.7
      });
    }

    if (analysis.errorType === ErrorType.TestFailure && analysis.affectedFiles.length > 5) {
      suggestions.push({
        title: 'Test Organization Recommendation',
        description: 'Multiple test files failing suggests structural issues',
        actions: [
          'Review shared test setup/teardown logic',
          'Check for environmental dependencies',
          'Consider test isolation improvements',
          'Run tests individually to identify root cause'
        ],
        priority: 'medium',
        category: 'test',
        confidence: 0.75
      });
    }

    return suggestions;
  }

  private prioritizeSuggestions(suggestions: SmartSuggestion[]): SmartSuggestion[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };

    return suggestions.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence
      return b.confidence - a.confidence;
    }).slice(0, 10); // Limit to top 10 suggestions
  }

  private generateSummary(
    analysis: AnalysisResult,
    suggestions: SmartSuggestion[]
  ): string {
    if (!analysis.failureDetected) {
      return 'Execution completed successfully with no issues detected.';
    }

    const parts: string[] = [];

    parts.push(`Failure Analysis: ${analysis.errorSummary}`);

    if (analysis.patterns.length > 0) {
      parts.push(`Matched ${analysis.patterns.length} known pattern(s)`);
    }

    if (analysis.affectedFiles.length > 0) {
      parts.push(`${analysis.affectedFiles.length} file(s) affected`);
    }

    const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high').length;
    if (highPrioritySuggestions > 0) {
      parts.push(`${highPrioritySuggestions} high-priority suggestion(s)`);
    }

    parts.push(`Confidence: ${(analysis.confidence * 100).toFixed(0)}%`);

    return parts.join(' | ');
  }

  /**
   * Analyze command history to provide proactive suggestions
   */
  async analyzeHistory(results: ExecutionResult[]): Promise<SmartSuggestion[]> {
    const trends = this.failureAnalyzer.analyzeTrends(results);
    const suggestions: SmartSuggestion[] = [];

    if (trends.successRate < 0.5) {
      suggestions.push({
        title: 'Low Success Rate Detected',
        description: `Only ${(trends.successRate * 100).toFixed(0)}% of recent commands succeeded`,
        actions: [
          'Review recent code changes for breaking issues',
          'Check environment configuration',
          'Consider reverting to last known good state',
          'Run diagnostic tools to identify root cause'
        ],
        priority: 'high',
        category: 'workflow',
        confidence: 0.9
      });
    }

    if (trends.commonErrors.length > 0) {
      suggestions.push({
        title: 'Recurring Issues Detected',
        description: `Common error: ${trends.commonErrors[0]}`,
        actions: [
          ...trends.recommendations,
          'Address the root cause rather than repeated fixes',
          'Document the solution for future reference'
        ],
        priority: 'high',
        category: 'general',
        confidence: 0.85
      });
    }

    return suggestions;
  }

  /**
   * Get knowledge base statistics
   */
  getKnowledgeBaseStats(): { totalPatterns: number; byCategory: Record<string, number> } {
    return this.knowledgeBase.getStats();
  }
}
