/**
 * Knowledge Base for Smart Suggestions
 *
 * Contains patterns, rules, and solutions for common development issues.
 * Organized by tool/language for efficient matching.
 */

/**
 * Represents a failure pattern that can be detected in command output
 * @property {string} id - Unique identifier for the pattern
 * @property {string} name - Human-readable name describing the failure
 * @property {Category} category - Classification category for the failure
 * @property {RegExp[]} patterns - Array of regex patterns to match against output
 * @property {'high' | 'medium' | 'low'} severity - Severity level of the failure
 * @property {string[]} suggestions - Actionable suggestions to fix the failure
 * @property {string} [context] - Optional additional context about when this pattern applies
 */
export interface FailurePattern {
  id: string;
  name: string;
  category: Category;
  patterns: RegExp[];
  severity: 'high' | 'medium' | 'low';
  suggestions: string[];
  context?: string;
}

/**
 * Categories for classifying failure patterns and suggestions
 */
export enum Category {
  /** Security-related issues like vulnerabilities, race conditions, and hardcoded secrets */
  Security = 'security',
  /** Performance issues like slow operations, memory leaks, and inefficient algorithms */
  Performance = 'performance',
  /** Code maintainability issues like code smells, complexity, and readability */
  Maintainability = 'maintainability',
  /** Build and compilation failures */
  Build = 'build',
  /** Test execution failures and test-related issues */
  Test = 'test',
  /** Linting and code style violations */
  Lint = 'lint',
  /** Dependency resolution and package management issues */
  Dependencies = 'dependencies',
  /** Configuration and environment setup problems */
  Configuration = 'configuration',
  /** General issues that don't fit other categories */
  General = 'general'
}

/**
 * Knowledge base containing patterns for detecting and resolving common development failures
 *
 * The knowledge base maintains a collection of failure patterns organized by category,
 * enabling efficient pattern matching and suggestion generation for various development issues.
 */
export class KnowledgeBase {
  private patterns: Map<Category, FailurePattern[]> = new Map();

  /**
   * Creates a new KnowledgeBase instance and initializes all built-in failure patterns
   *
   * @example
   * ```typescript
   * const kb = new KnowledgeBase();
   * const stats = kb.getStats();
   * console.log(`Loaded ${stats.totalPatterns} patterns`);
   * ```
   */
  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize all built-in failure patterns across different categories
   *
   * This method populates the knowledge base with patterns for:
   * - Go language issues (dependencies, tests, race conditions, linting, build)
   * - JavaScript/TypeScript issues (modules, type errors, linting)
   * - Python issues (imports)
   * - Security issues (hardcoded secrets, SQL injection)
   * - Performance issues (nested loops)
   * - Configuration issues (missing environment variables)
   * - Build/test patterns (timeouts, out of memory)
   *
   * @private
   */
  private initializePatterns(): void {
    // Go-specific patterns
    this.addPattern({
      id: 'go-missing-dep',
      name: 'Missing Go Dependency',
      category: Category.Dependencies,
      patterns: [
        /cannot find package ["'](.+?)["']/,
        /no required module provides package (.+)/,
        /module (.+) is not in GOROOT/
      ],
      severity: 'high',
      suggestions: [
        'Run `go mod tidy` to download missing dependencies',
        'Verify the package path is correct',
        'Check if the package exists in go.mod',
        'Try `go get <package-name>` to add the dependency'
      ]
    });

    this.addPattern({
      id: 'go-test-fail',
      name: 'Go Test Failures',
      category: Category.Test,
      patterns: [
        /FAIL[:\s]+(.+)/,
        /--- FAIL: (.+?) \(/,
        /test timed out/
      ],
      severity: 'high',
      suggestions: [
        'Review test failure details above',
        'Run with `-v` flag for verbose output',
        'Check if test setup/teardown is correct',
        'Consider adding `-race` flag to detect race conditions'
      ]
    });

    this.addPattern({
      id: 'go-race-condition',
      name: 'Race Condition Detected',
      category: Category.Security,
      patterns: [
        /WARNING: DATA RACE/,
        /Found \d+ data race/
      ],
      severity: 'high',
      suggestions: [
        'Use mutex locks to protect shared data',
        'Consider using channels for goroutine communication',
        'Review concurrent access patterns in your code',
        'Use atomic operations for simple counters'
      ]
    });

    this.addPattern({
      id: 'go-lint-issues',
      name: 'Go Linting Issues',
      category: Category.Lint,
      patterns: [
        /golangci-lint.+?error|warning/i,
        /\d+ issues? found/
      ],
      severity: 'medium',
      suggestions: [
        'Run `golangci-lint run --fix` to auto-fix issues',
        'Review .golangci.yml configuration',
        'Consider disabling specific linters if false positives',
        'Add nolint comments for intentional violations'
      ]
    });

    this.addPattern({
      id: 'go-build-fail',
      name: 'Go Build Failure',
      category: Category.Build,
      patterns: [
        /undefined: (.+)/,
        /undeclared name: (.+)/,
        /cannot use .+ as .+ value/,
        /too many errors/
      ],
      severity: 'high',
      suggestions: [
        'Check for typos in variable/function names',
        'Verify all imports are correct',
        'Ensure types match in assignments',
        'Run `go vet` to catch common mistakes'
      ]
    });

    // JavaScript/TypeScript patterns
    this.addPattern({
      id: 'js-module-not-found',
      name: 'Module Not Found',
      category: Category.Dependencies,
      patterns: [
        /Cannot find module ['"](.+?)['"]/,
        /Module not found: Error: Can't resolve ['"](.+?)['"]/,
        /ENOENT.*?node_modules/
      ],
      severity: 'high',
      suggestions: [
        'Run `npm install` or `yarn install` to install dependencies',
        'Check if the package is in package.json',
        'Verify the import path is correct',
        'Clear node_modules and reinstall: `rm -rf node_modules && npm install`'
      ]
    });

    this.addPattern({
      id: 'js-typescript-error',
      name: 'TypeScript Type Error',
      category: Category.Build,
      patterns: [
        /TS\d+:/,
        /Type '.+' is not assignable to type '.+'/,
        /Property '.+' does not exist on type/
      ],
      severity: 'medium',
      suggestions: [
        'Check type annotations match actual usage',
        'Add proper type definitions',
        'Use type assertions if you\'re certain of the type',
        'Update tsconfig.json for stricter type checking'
      ]
    });

    this.addPattern({
      id: 'js-eslint-errors',
      name: 'ESLint Errors',
      category: Category.Lint,
      patterns: [
        /\d+:\d+\s+error/,
        /✖ \d+ problems?/
      ],
      severity: 'medium',
      suggestions: [
        'Run `eslint --fix` to auto-fix issues',
        'Review ESLint configuration in .eslintrc',
        'Add eslint-disable comments for intentional violations',
        'Consider updating ESLint rules'
      ]
    });

    // Python patterns
    this.addPattern({
      id: 'python-import-error',
      name: 'Python Import Error',
      category: Category.Dependencies,
      patterns: [
        /ModuleNotFoundError: No module named ['"](.+?)['"]/,
        /ImportError: No module named (.+)/,
        /ImportError: cannot import name/
      ],
      severity: 'high',
      suggestions: [
        'Install the package: `pip install <package-name>`',
        'Check if the package is in requirements.txt',
        'Activate your virtual environment',
        'Verify PYTHONPATH is set correctly'
      ]
    });

    // Security patterns (cross-language)
    this.addPattern({
      id: 'sec-hardcoded-secrets',
      name: 'Hardcoded Secrets Detected',
      category: Category.Security,
      patterns: [
        /password\s*[:=]\s*["'].+["']/i,
        /api[_-]?key\s*[:=]\s*["'].+["']/i,
        /secret\s*[:=]\s*["'].+["']/i,
        /token\s*[:=]\s*["'].+["']/i
      ],
      severity: 'high',
      suggestions: [
        'Move secrets to environment variables',
        'Use a secrets management service (AWS Secrets Manager, HashiCorp Vault)',
        'Add secrets file to .gitignore',
        'Never commit secrets to version control'
      ]
    });

    this.addPattern({
      id: 'sec-sql-injection',
      name: 'Potential SQL Injection',
      category: Category.Security,
      patterns: [
        /sql.*?query.*?\+/i,
        /execute\(.*?\+.*?\)/i,
        /SELECT.*?\$\{/i
      ],
      severity: 'high',
      suggestions: [
        'Use parameterized queries or prepared statements',
        'Never concatenate user input into SQL queries',
        'Use an ORM to handle queries safely',
        'Validate and sanitize all user input'
      ]
    });

    // Performance patterns
    this.addPattern({
      id: 'perf-nested-loops',
      name: 'Performance: Nested Loops',
      category: Category.Performance,
      patterns: [
        /for.*?{[^}]*for.*?{/s
      ],
      severity: 'low',
      suggestions: [
        'Consider using a hash map/dictionary for O(1) lookups',
        'Evaluate if the nested iteration is necessary',
        'Use more efficient algorithms or data structures',
        'Profile the code to identify actual bottlenecks'
      ]
    });

    // Configuration patterns
    this.addPattern({
      id: 'config-missing-env',
      name: 'Missing Environment Variable',
      category: Category.Configuration,
      patterns: [
        /environment variable .+ is not set/i,
        /undefined.*?process\.env/,
        /ENOENT.*?\.env/
      ],
      severity: 'medium',
      suggestions: [
        'Create a .env file with required variables',
        'Check .env.example for required variables',
        'Set the environment variable in your shell',
        'Use a default value for optional variables'
      ]
    });

    // Test patterns
    this.addPattern({
      id: 'test-timeout',
      name: 'Test Timeout',
      category: Category.Test,
      patterns: [
        /test.* timed? out/i,
        /Exceeded timeout of/,
        /Test timeout of/
      ],
      severity: 'medium',
      suggestions: [
        'Increase test timeout in configuration',
        'Check for infinite loops or blocking operations',
        'Mock slow external dependencies',
        'Use async/await properly in async tests'
      ]
    });

    // Build patterns
    this.addPattern({
      id: 'build-out-of-memory',
      name: 'Out of Memory During Build',
      category: Category.Build,
      patterns: [
        /JavaScript heap out of memory/,
        /FATAL ERROR.*?Ineffective mark-compacts/,
        /Out of memory/i
      ],
      severity: 'high',
      suggestions: [
        'Increase Node.js memory: `NODE_OPTIONS=--max_old_space_size=4096`',
        'Check for memory leaks in your code',
        'Consider building in smaller chunks',
        'Upgrade to a machine with more RAM'
      ]
    });
  }

  /**
   * Add a failure pattern to the knowledge base
   *
   * Organizes patterns by category for efficient retrieval and matching.
   *
   * @param {FailurePattern} pattern - The failure pattern to add to the knowledge base
   * @private
   */
  private addPattern(pattern: FailurePattern): void {
    const patterns = this.patterns.get(pattern.category) || [];
    patterns.push(pattern);
    this.patterns.set(pattern.category, patterns);
  }

  /**
   * Find all failure patterns that match the given error text
   *
   * Searches through all patterns (or patterns in a specific category) and returns
   * those that match the provided error text using regex pattern matching.
   *
   * @param {string} errorText - The error output text to analyze
   * @param {Category} [category] - Optional category to filter patterns by
   * @returns {FailurePattern[]} Array of matching failure patterns, sorted by severity (high first)
   *
   * @example
   * ```typescript
   * const patterns = knowledgeBase.findMatchingPatterns(
   *   "cannot find package 'lodash'",
   *   Category.Dependencies
   * );
   * // Returns patterns related to dependency issues
   * ```
   */
  findMatchingPatterns(errorText: string, category?: Category): FailurePattern[] {
    const matches: FailurePattern[] = [];

    const categoriesToSearch = category
      ? [category]
      : Array.from(this.patterns.keys());

    for (const cat of categoriesToSearch) {
      const patterns = this.patterns.get(cat) || [];

      for (const pattern of patterns) {
        if (this.matchesPattern(errorText, pattern)) {
          matches.push(pattern);
        }
      }
    }

    // Sort by severity (high > medium > low)
    const severityOrder = { high: 0, medium: 1, low: 2 };
    matches.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return matches;
  }

  /**
   * Check if error text matches any of a pattern's regex patterns
   *
   * Tests the provided text against all regex patterns in the failure pattern,
   * returning true if any pattern matches.
   *
   * @param {string} text - The error text to test against pattern regexes
   * @param {FailurePattern} pattern - The failure pattern containing regex patterns to match
   * @returns {boolean} True if any regex pattern matches the text
   * @private
   */
  private matchesPattern(text: string, pattern: FailurePattern): boolean {
    return pattern.patterns.some(regex => regex.test(text));
  }

  /**
   * Get all failure patterns for a specific category
   *
   * Returns an array of all failure patterns that belong to the specified category.
   * Useful for filtering patterns by type (security, performance, etc.).
   *
   * @param {Category} category - The category to filter patterns by
   * @returns {FailurePattern[]} Array of failure patterns in the specified category
   *
   * @example
   * ```typescript
   * const securityPatterns = knowledgeBase.getPatternsByCategory(Category.Security);
   * // Returns all security-related failure patterns
   * ```
   */
  getPatternsByCategory(category: Category): FailurePattern[] {
    return this.patterns.get(category) || [];
  }

  /**
   * Get a specific failure pattern by its unique identifier
   *
   * Searches through all patterns across all categories to find the pattern
   * with the specified ID.
   *
   * @param {string} id - The unique identifier of the pattern to retrieve
   * @returns {FailurePattern | undefined} The failure pattern if found, undefined otherwise
   *
   * @example
   * ```typescript
   * const pattern = knowledgeBase.getPatternById('go-missing-dep');
   * if (pattern) {
   *   console.log('Found pattern:', pattern.name);
   * }
   * ```
   */
  getPatternById(id: string): FailurePattern | undefined {
    for (const patterns of this.patterns.values()) {
      const pattern = patterns.find(p => p.id === id);
      if (pattern) return pattern;
    }
    return undefined;
  }

  /**
   * Get statistics about the knowledge base contents
   *
   * Provides an overview of the total number of patterns and their distribution
   * across different categories.
   *
   * @returns {{ totalPatterns: number; byCategory: Record<string, number> }}
   * Object containing total pattern count and breakdown by category
   *
   * @example
   * ```typescript
   * const stats = knowledgeBase.getStats();
   * console.log(`Total patterns: ${stats.totalPatterns}`);
   * console.log('By category:', stats.byCategory);
   * // Output: Total patterns: 15, By category: { security: 2, performance: 1, ... }
   * ```
   */
  getStats(): { totalPatterns: number; byCategory: Record<string, number> } {
    const byCategory: Record<string, number> = {};
    let totalPatterns = 0;

    for (const [category, patterns] of this.patterns.entries()) {
      byCategory[category] = patterns.length;
      totalPatterns += patterns.length;
    }

    return { totalPatterns, byCategory };
  }
}
