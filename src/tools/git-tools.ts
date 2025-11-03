import { z } from 'zod';
import { ShellExecutor, ExecutionResult } from '../utils/shell-executor.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Constants
const MAX_PR_TITLE_LENGTH = 72; // GitHub's recommended PR title length
const MAX_CHANGES_TO_DISPLAY = 10;
const MAX_LINE_LENGTH = 120;
const MAX_DIFF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_CONCERNS = 1000;
const MAX_FILES_TO_REVIEW = 100;
const NESTED_LOOP_THRESHOLD = 2; // Number of loops on same line to consider nested
const DEFAULT_PR_LOG_COUNT = 50; // Default number of commits to fetch for PR messages

// Security patterns (case-insensitive)
const SECURITY_PATTERNS = [
  /password/i,
  /secret/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /auth[_-]?token/i,
  /private[_-]?key/i,
  /aws[_-]?access/i,
  /aws[_-]?secret/i,
  /bearer\s+[a-z0-9]/i,
  /ssh[_-]?key/i,
  /\.pem/i,
  /-----BEGIN/i
];

// Schema for Git tool arguments
const GitDiffArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory for the command'),
  cached: z.boolean().optional().describe('Show staged changes only'),
  base: z.string().optional().describe('Base branch or commit to compare against'),
  files: z.array(z.string()).optional().describe('Specific files to diff'),
  stat: z.boolean().optional().describe('Show diffstat summary'),
  nameOnly: z.boolean().optional().describe('Show only file names'),
  unified: z.number().optional().describe('Number of context lines (default: 3)')
});

const GitStatusArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory for the command'),
  short: z.boolean().optional().describe('Show short-format status'),
  branch: z.boolean().optional().describe('Show branch information'),
  untracked: z.boolean().optional().describe('Show untracked files')
});

const GitLogArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory for the command'),
  count: z.number().optional().describe('Number of commits to show'),
  oneline: z.boolean().optional().describe('Show one commit per line'),
  graph: z.boolean().optional().describe('Show commit graph'),
  since: z.string().optional().describe('Show commits since date (e.g., "2 weeks ago")'),
  author: z.string().optional().describe('Filter by author'),
  grep: z.string().optional().describe('Filter commits by message pattern'),
  format: z.string().optional().describe('Custom format string')
});

const CodeReviewArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory for the command'),
  base: z.string().optional().describe('Base branch to compare against (default: main)'),
  includeTests: z.boolean().optional().describe('Include test files in review'),
  maxFiles: z.number().min(1).max(MAX_FILES_TO_REVIEW).optional().describe(`Maximum number of files to review (1-${MAX_FILES_TO_REVIEW})`),
  focus: z.enum(['security', 'performance', 'maintainability', 'all']).optional().describe('Focus area for review')
});

const PRMessageArgsSchema = z.object({
  directory: z.string().optional().describe('Working directory for the command'),
  base: z.string().optional().describe('Base branch to compare against (default: main)'),
  type: z.enum(['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore']).optional().describe('Commit type'),
  scope: z.string().optional().describe('Commit scope'),
  includeBreaking: z.boolean().optional().describe('Include breaking changes section'),
  includeIssue: z.string().optional().describe('Issue number to reference (e.g., "123")'),
  useTemplate: z.boolean().optional().describe('Use GitHub PR template if available (default: true)'),
  maxCommits: z.number().min(1).max(200).optional().describe(`Maximum number of commits to analyze (default: ${DEFAULT_PR_LOG_COUNT})`)
});

export type GitDiffArgs = z.infer<typeof GitDiffArgsSchema>;
export type GitStatusArgs = z.infer<typeof GitStatusArgsSchema>;
export type GitLogArgs = z.infer<typeof GitLogArgsSchema>;
export type CodeReviewArgs = z.infer<typeof CodeReviewArgsSchema>;
export type PRMessageArgs = z.infer<typeof PRMessageArgsSchema>;

export interface GitToolResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  command: string;
  suggestions?: string[];
}

export interface CodeReviewResult extends GitToolResult {
  filesReviewed: number;
  concerns: Array<{
    file: string;
    line?: number;
    severity: 'high' | 'medium' | 'low';
    category: string;
    message: string;
  }>;
  summary: string;
}

export interface PRMessageResult {
  success: boolean;
  message: string;
  title: string;
  body: string;
  error?: string;
}

export class GitTools {
  private executor: ShellExecutor;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.executor = new ShellExecutor(this.projectRoot);
  }

  /**
   * Get git diff
   */
  async gitDiff(args: GitDiffArgs): Promise<GitToolResult> {
    const commandArgs: string[] = ['diff'];

    // Add flags
    if (args.cached) commandArgs.push('--cached');
    if (args.stat) commandArgs.push('--stat');
    if (args.nameOnly) commandArgs.push('--name-only');
    if (args.unified !== undefined) commandArgs.push(`-U${args.unified}`);

    // Add base comparison
    if (args.base) {
      commandArgs.push(args.base);
    }

    // Add specific files
    if (args.files && args.files.length > 0) {
      commandArgs.push('--');
      commandArgs.push(...args.files);
    }

    const result = await this.executor.execute('git', {
      cwd: args.directory,
      args: commandArgs
    });

    return this.processGitResult(result, 'git diff');
  }

  /**
   * Get git status
   */
  async gitStatus(args: GitStatusArgs): Promise<GitToolResult> {
    const commandArgs: string[] = ['status'];

    if (args.short) commandArgs.push('--short');
    if (args.branch) commandArgs.push('--branch');
    if (args.untracked !== false) commandArgs.push('--untracked-files=all');

    const result = await this.executor.execute('git', {
      cwd: args.directory,
      args: commandArgs
    });

    return this.processGitResult(result, 'git status');
  }

  /**
   * Get git log
   *
   * SECURITY: All user inputs are passed as separate arguments to prevent command injection
   */
  async gitLog(args: GitLogArgs): Promise<GitToolResult> {
    const commandArgs: string[] = ['log'];

    if (args.count) commandArgs.push(`-${args.count}`);
    if (args.oneline) commandArgs.push('--oneline');
    if (args.graph) commandArgs.push('--graph');

    // SECURITY: Pass arguments separately without quotes to prevent injection
    if (args.since) {
      commandArgs.push('--since');
      commandArgs.push(args.since);
    }
    if (args.author) {
      commandArgs.push('--author');
      commandArgs.push(args.author);
    }
    if (args.grep) {
      commandArgs.push('--grep');
      commandArgs.push(args.grep);
    }
    if (args.format) {
      commandArgs.push('--format');
      commandArgs.push(args.format);
    }

    const result = await this.executor.execute('git', {
      cwd: args.directory,
      args: commandArgs
    });

    return this.processGitResult(result, 'git log');
  }

  /**
   * Perform code review analysis
   *
   * @param args - Code review arguments
   * @returns Code review result with detected concerns
   *
   * SECURITY: Checks diff size to prevent memory exhaustion
   * PERFORMANCE: Limits file count to prevent long analysis times
   */
  async codeReview(args: CodeReviewArgs): Promise<CodeReviewResult> {
    const base = args.base || 'main';
    const concerns: CodeReviewResult['concerns'] = [];

    // Get diff against base
    const diffResult = await this.gitDiff({
      directory: args.directory,
      base,
      unified: 5
    });

    if (!diffResult.success) {
      return {
        ...diffResult,
        filesReviewed: 0,
        concerns: [],
        summary: 'Failed to get git diff for code review'
      };
    }

    // Check diff size to prevent memory exhaustion
    const diffSize = Buffer.byteLength(diffResult.output, 'utf-8');
    if (diffSize > MAX_DIFF_SIZE_BYTES) {
      return {
        success: false,
        output: '',
        duration: diffResult.duration,
        command: diffResult.command,
        filesReviewed: 0,
        concerns: [{
          file: 'SYSTEM',
          severity: 'high',
          category: 'security',
          message: `Diff size (${Math.round(diffSize / 1024 / 1024)}MB) exceeds limit (${MAX_DIFF_SIZE_BYTES / 1024 / 1024}MB)`
        }],
        summary: 'Diff too large for analysis'
      };
    }

    // Get list of changed files
    const filesResult = await this.gitDiff({
      directory: args.directory,
      base,
      nameOnly: true
    });

    const changedFiles = filesResult.output.split('\n').filter(f => f.trim());
    let filesToReview = changedFiles;

    // Filter out test files if requested
    if (!args.includeTests) {
      filesToReview = filesToReview.filter(f =>
        !f.includes('.test.') &&
        !f.includes('.spec.') &&
        !f.includes('__tests__')
      );
    }

    // Limit number of files
    if (args.maxFiles && filesToReview.length > args.maxFiles) {
      filesToReview = filesToReview.slice(0, args.maxFiles);
    }

    // Analyze the diff output
    const diffLines = diffResult.output.split('\n');
    this.analyzeDiffForConcerns(diffLines, concerns, args.focus);

    // Generate summary
    const summary = this.generateReviewSummary(filesToReview.length, concerns);

    return {
      success: true,
      output: diffResult.output,
      duration: diffResult.duration,
      command: `git diff ${base}`,
      filesReviewed: filesToReview.length,
      concerns,
      summary
    };
  }

  /**
   * Find and read GitHub PR template
   */
  private async findPRTemplate(directory?: string): Promise<string | null> {
    const dir = directory || this.projectRoot;

    // Common locations for PR templates
    const templatePaths = [
      '.github/pull_request_template.md',
      '.github/PULL_REQUEST_TEMPLATE.md',
      '.github/PULL_REQUEST_TEMPLATE/pull_request_template.md',
      'docs/pull_request_template.md',
      'PULL_REQUEST_TEMPLATE.md'
    ];

    for (const templatePath of templatePaths) {
      const fullPath = path.join(dir, templatePath);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        return content;
      } catch {
        // File doesn't exist, try next location
        continue;
      }
    }

    return null;
  }

  /**
   * Generate PR message
   */
  async generatePRMessage(args: PRMessageArgs): Promise<PRMessageResult> {
    const base = args.base || 'main';
    const useTemplate = args.useTemplate !== false; // Default to true

    // Get commit messages since base
    const logResult = await this.gitLog({
      directory: args.directory,
      format: '%s',
      count: args.maxCommits || DEFAULT_PR_LOG_COUNT
    });

    // Get changed files
    const filesResult = await this.gitDiff({
      directory: args.directory,
      base,
      nameOnly: true,
      stat: true
    });

    if (!logResult.success || !filesResult.success) {
      return {
        success: false,
        message: '',
        title: '',
        body: '',
        error: 'Failed to get git information for PR message generation'
      };
    }

    const commits = logResult.output.split('\n').filter(c => c.trim());
    const changedFiles = filesResult.output;

    // Analyze commits to determine type and scope
    const analysis = this.analyzeCommits(commits);
    const type = args.type || analysis.type;
    const scope = args.scope || analysis.scope;

    // Generate title
    const title = this.generateTitle(type, scope, analysis.summary);

    // Try to read PR template if requested
    let template: string | null = null;
    if (useTemplate) {
      template = await this.findPRTemplate(args.directory);
    }

    // Generate body
    const body = template
      ? this.mergeWithTemplate(template, {
          type,
          summary: analysis.summary,
          changes: analysis.changes,
          changedFiles,
          includeBreaking: args.includeBreaking,
          issueNumber: args.includeIssue
        })
      : this.generateBody({
          type,
          summary: analysis.summary,
          changes: analysis.changes,
          changedFiles,
          includeBreaking: args.includeBreaking,
          issueNumber: args.includeIssue
        });

    const message = `${title}\n\n${body}`;

    return {
      success: true,
      message,
      title,
      body
    };
  }

  /**
   * Analyze diff for potential concerns
   *
   * @param diffLines - Array of diff output lines
   * @param concerns - Array to populate with found concerns
   * @param focus - Optional focus area (security, performance, maintainability, all)
   * @returns void - modifies concerns array in place
   *
   * SECURITY: Uses case-insensitive pattern matching to avoid bypasses
   * PERFORMANCE: Limits concerns to MAX_CONCERNS to prevent memory issues
   */
  private analyzeDiffForConcerns(
    diffLines: string[],
    concerns: CodeReviewResult['concerns'],
    focus?: string
  ): void {
    let currentFile = '';
    let lineNumber = 0;
    let concernCount = 0;

    for (const line of diffLines) {
      // Resource limit check
      if (concernCount >= MAX_CONCERNS) {
        concerns.push({
          file: 'SYSTEM',
          severity: 'medium',
          category: 'performance',
          message: `Analysis stopped: ${MAX_CONCERNS} concerns limit reached`
        });
        break;
      }

      // Track current file
      if (line.startsWith('diff --git')) {
        const match = line.match(/b\/(.+)$/);
        if (match) {
          currentFile = match[1];
          lineNumber = 0; // Reset line number for new file
        }
        continue;
      }

      // Track line numbers from hunk headers
      if (line.startsWith('@@')) {
        const match = line.match(/\+(\d+)/);
        if (match) {
          lineNumber = parseInt(match[1], 10) - 1; // Will be incremented for first + line
        }
        continue;
      }

      // Skip removed lines (don't increment line number)
      if (line.startsWith('-')) continue;
      if (line.startsWith('+++')) continue;

      // Increment line number for added lines and context lines
      // Context lines (starting with space) also count toward the line number in the new file
      if (line.startsWith('+') || line.startsWith(' ')) {
        lineNumber++;
      }

      // Only analyze added lines (not removed or file markers)
      if (!line.startsWith('+')) continue;

      // Skip if no current file (defensive programming)
      if (!currentFile) {
        continue;
      }

      const cleanLine = line.substring(1); // Remove the '+' prefix

      // Security checks
      if (!focus || focus === 'security' || focus === 'all') {
        // Check against all security patterns
        for (const pattern of SECURITY_PATTERNS) {
          if (pattern.test(cleanLine)) {
            // Reduce false positives: skip comments and documentation
            const lowerLine = cleanLine.toLowerCase().trim();
            if (lowerLine.startsWith('//') || lowerLine.startsWith('#') || lowerLine.startsWith('*')) {
              continue;
            }

            concerns.push({
              file: currentFile,
              line: lineNumber,
              severity: 'high',
              category: 'security',
              message: `Potential secret or credential detected: ${pattern.source}`
            });
            concernCount++;
            break; // Only report once per line
          }
        }

        // Dangerous code execution
        if (/\beval\s*\(/.test(cleanLine) || /\bexec\s*\(/.test(cleanLine)) {
          concerns.push({
            file: currentFile,
            line: lineNumber,
            severity: 'high',
            category: 'security',
            message: 'Potentially dangerous code execution (eval/exec)'
          });
          concernCount++;
        }
      }

      // Performance checks
      if (!focus || focus === 'performance' || focus === 'all') {
        // Detect nested loops (more realistic check)
        const forCount = (cleanLine.match(/\bfor\s*\(/g) || []).length;
        const whileCount = (cleanLine.match(/\bwhile\s*\(/g) || []).length;
        if (forCount + whileCount >= NESTED_LOOP_THRESHOLD) {
          concerns.push({
            file: currentFile,
            line: lineNumber,
            severity: 'medium',
            category: 'performance',
            message: 'Multiple nested loops detected - potential performance concern'
          });
          concernCount++;
        }
      }

      // Maintainability checks
      if (!focus || focus === 'maintainability' || focus === 'all') {
        if (/\bTODO\b|\bFIXME\b/.test(cleanLine)) {
          concerns.push({
            file: currentFile,
            line: lineNumber,
            severity: 'low',
            category: 'maintainability',
            message: 'TODO/FIXME comment added'
          });
          concernCount++;
        }
        if (cleanLine.length > MAX_LINE_LENGTH) {
          concerns.push({
            file: currentFile,
            line: lineNumber,
            severity: 'low',
            category: 'maintainability',
            message: `Line exceeds ${MAX_LINE_LENGTH} characters (${cleanLine.length})`
          });
          concernCount++;
        }
      }
    }
  }

  /**
   * Generate review summary
   */
  private generateReviewSummary(filesReviewed: number, concerns: CodeReviewResult['concerns']): string {
    const high = concerns.filter(c => c.severity === 'high').length;
    const medium = concerns.filter(c => c.severity === 'medium').length;
    const low = concerns.filter(c => c.severity === 'low').length;

    let summary = `Reviewed ${filesReviewed} file(s). `;

    if (concerns.length === 0) {
      summary += 'No major concerns detected.';
    } else {
      summary += `Found ${concerns.length} potential concern(s): `;
      const parts = [];
      if (high > 0) parts.push(`${high} high`);
      if (medium > 0) parts.push(`${medium} medium`);
      if (low > 0) parts.push(`${low} low`);
      summary += parts.join(', ');
    }

    return summary;
  }

  /**
   * Analyze commits to determine type and scope
   */
  private analyzeCommits(commits: string[]): {
    type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'chore';
    scope: string;
    summary: string;
    changes: string[];
  } {
    // Count commit types
    const typeCounts: Record<string, number> = {};
    const scopes = new Set<string>();
    const changes: string[] = [];

    for (const commit of commits) {
      // Try to parse conventional commit format
      const match = commit.match(/^(feat|fix|docs|style|refactor|perf|test|chore)(?:\(([^)]+)\))?:\s*(.+)$/);
      if (match) {
        const [, type, scope, message] = match;
        typeCounts[type] = (typeCounts[type] || 0) + 1;
        if (scope) scopes.add(scope);
        changes.push(message);
      } else {
        // Non-conventional commit
        changes.push(commit);
      }
    }

    // Determine primary type
    let primaryType: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'chore' = 'chore';
    let maxCount = 0;
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) {
        maxCount = count;
        primaryType = type as typeof primaryType;
      }
    }

    // Determine scope
    const scope = scopes.size === 1 ? Array.from(scopes)[0] : '';

    // Generate summary
    const summary = changes[0] || 'Updates and improvements';

    return { type: primaryType, scope, summary, changes };
  }

  /**
   * Generate PR title
   */
  private generateTitle(type: string, scope: string, summary: string): string {
    const scopeStr = scope ? `(${scope})` : '';
    return `${type}${scopeStr}: ${summary}`.slice(0, MAX_PR_TITLE_LENGTH);
  }

  /**
   * Generate PR body
   */
  private generateBody(options: {
    type: string;
    summary: string;
    changes: string[];
    changedFiles: string;
    includeBreaking?: boolean;
    issueNumber?: string;
  }): string {
    let body = `## Summary\n\n${options.summary}\n\n`;

    // Add changes section if multiple commits
    if (options.changes.length > 1) {
      body += `## Changes\n\n`;
      const uniqueChanges = [...new Set(options.changes)].slice(0, MAX_CHANGES_TO_DISPLAY);
      for (const change of uniqueChanges) {
        body += `- ${change}\n`;
      }
      if (options.changes.length > MAX_CHANGES_TO_DISPLAY) {
        body += `- ... and ${options.changes.length - MAX_CHANGES_TO_DISPLAY} more changes\n`;
      }
      body += `\n`;
    }

    // Add files changed section
    body += `## Files Changed\n\n\`\`\`\n${options.changedFiles}\n\`\`\`\n\n`;

    // Add breaking changes section if requested
    if (options.includeBreaking) {
      body += `## Breaking Changes\n\n_None_\n\n`;
    }

    // Add test plan
    body += `## Test Plan\n\n- [ ] Linting passes\n- [ ] Tests pass\n- [ ] Manual testing completed\n\n`;

    // Add issue reference
    if (options.issueNumber) {
      body += `Fixes #${options.issueNumber}\n`;
    }

    return body;
  }

  /**
   * Merge generated content with PR template
   */
  private mergeWithTemplate(template: string, options: {
    type: string;
    summary: string;
    changes: string[];
    changedFiles: string;
    includeBreaking?: boolean;
    issueNumber?: string;
  }): string {
    let body = template;

    // Common template placeholders to replace
    const replacements: Record<string, string> = {
      '<!-- Summary -->': `## Summary\n\n${options.summary}`,
      '<!-- Description -->': `## Summary\n\n${options.summary}`,
      '## Summary': `## Summary\n\n${options.summary}`,
      '## Description': `## Description\n\n${options.summary}`,

      // Changes section
      '<!-- Changes -->': this.formatChanges(options.changes),
      '## Changes': `## Changes\n\n${this.formatChanges(options.changes)}`,

      // Files changed
      '<!-- Files Changed -->': `## Files Changed\n\n\`\`\`\n${options.changedFiles}\n\`\`\``,

      // Test plan
      '<!-- Test Plan -->': '## Test Plan\n\n- [ ] Linting passes\n- [ ] Tests pass\n- [ ] Manual testing completed',

      // Issue reference
      '<!-- Related Issues -->': options.issueNumber ? `Fixes #${options.issueNumber}` : '',
      'Fixes #': options.issueNumber ? `Fixes #${options.issueNumber}` : ''
    };

    // Replace placeholders
    for (const [placeholder, replacement] of Object.entries(replacements)) {
      if (body.includes(placeholder)) {
        body = body.replace(placeholder, replacement);
      }
    }

    // Add issue reference at the end if not already present
    if (options.issueNumber && !body.includes(`Fixes #${options.issueNumber}`)) {
      body += `\n\nFixes #${options.issueNumber}\n`;
    }

    return body;
  }

  /**
   * Format changes list
   */
  private formatChanges(changes: string[]): string {
    if (changes.length === 0) return '';

    let output = '';
    const uniqueChanges = [...new Set(changes)].slice(0, MAX_CHANGES_TO_DISPLAY);
    for (const change of uniqueChanges) {
      output += `- ${change}\n`;
    }
    if (changes.length > MAX_CHANGES_TO_DISPLAY) {
      output += `- ... and ${changes.length - MAX_CHANGES_TO_DISPLAY} more changes\n`;
    }
    return output;
  }

  /**
   * Process Git command result
   */
  private processGitResult(result: ExecutionResult, command: string): GitToolResult {
    const gitResult: GitToolResult = {
      success: result.success,
      output: result.stdout || result.stderr || '',
      duration: result.duration,
      command
    };

    if (!result.success) {
      gitResult.error = result.error || `${command} failed`;
      gitResult.suggestions = this.generateSuggestions(command, result);
    }

    return gitResult;
  }

  /**
   * Generate helpful suggestions based on failures
   */
  private generateSuggestions(_command: string, result: ExecutionResult): string[] {
    const suggestions: string[] = [];

    if (result.stderr.includes('not a git repository')) {
      suggestions.push('This directory is not a Git repository');
      suggestions.push('Initialize with: git init');
    }

    if (result.stderr.includes('unknown revision')) {
      suggestions.push('The specified branch or commit does not exist');
      suggestions.push('Check available branches with: git branch -a');
    }

    if (result.stderr.includes('no changes')) {
      suggestions.push('No changes to show');
    }

    return suggestions;
  }

  /**
   * Validation methods
   */
  static validateDiffArgs(args: unknown): GitDiffArgs {
    return GitDiffArgsSchema.parse(args);
  }

  static validateStatusArgs(args: unknown): GitStatusArgs {
    return GitStatusArgsSchema.parse(args);
  }

  static validateLogArgs(args: unknown): GitLogArgs {
    return GitLogArgsSchema.parse(args);
  }

  static validateCodeReviewArgs(args: unknown): CodeReviewArgs {
    return CodeReviewArgsSchema.parse(args);
  }

  static validatePRMessageArgs(args: unknown): PRMessageArgs {
    return PRMessageArgsSchema.parse(args);
  }
}
