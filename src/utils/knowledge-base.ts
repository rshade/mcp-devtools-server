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

    // Rust-specific patterns
    this.addPattern({
      id: 'rust-borrow-checker',
      name: 'Rust Borrow Checker Violation',
      category: Category.Build,
      patterns: [
        /cannot borrow.*as mutable/i,
        /cannot move out of.*because it is borrowed/i,
        /borrow of moved value/i,
        /value borrowed here after move/i
      ],
      severity: 'high',
      suggestions: [
        'Review Rust ownership rules and borrowing principles',
        'Consider using Rc<RefCell<T>> for shared mutability',
        'Use .clone() if copying is acceptable for your use case',
        'Restructure code to avoid conflicting borrows',
        'Read: https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html'
      ],
      context: 'Rust borrow checker enforces memory safety at compile time'
    });

    this.addPattern({
      id: 'rust-lifetime-error',
      name: 'Rust Lifetime Error',
      category: Category.Build,
      patterns: [
        /lifetime.*may not live long enough/i,
        /expected lifetime parameter/i,
        /borrowed value does not live long enough/i,
        /missing lifetime specifier/i
      ],
      severity: 'high',
      suggestions: [
        'Add explicit lifetime annotations to function signatures',
        'Ensure borrowed values outlive their usage',
        'Consider using \'static lifetime for constants',
        'Restructure to avoid complex lifetime relationships',
        'Read: https://doc.rust-lang.org/book/ch10-03-lifetime-syntax.html'
      ],
      context: 'Lifetimes ensure references are valid for their entire use'
    });

    this.addPattern({
      id: 'rust-async-error',
      name: 'Rust Async/Await Error',
      category: Category.Build,
      patterns: [
        /expected opaque type.*`impl Future`/i,
        /await.*is only allowed inside `async`/i,
        /trait.*is not implemented for.*Future/i
      ],
      severity: 'medium',
      suggestions: [
        'Mark function as `async fn` to use await',
        'Ensure async runtime is properly initialized (tokio, async-std)',
        'Use .await on Future types',
        'Check that all async dependencies are compatible',
        'Read: https://rust-lang.github.io/async-book/'
      ],
      context: 'Async Rust requires explicit async/await syntax'
    });

    this.addPattern({
      id: 'rust-cargo-dependency',
      name: 'Rust Missing Dependency',
      category: Category.Dependencies,
      patterns: [
        /no crate named ['`](.+?)['`]/i,
        /failed to resolve.*crate/i,
        /could not find.*in.*registry/i
      ],
      severity: 'high',
      suggestions: [
        'Add dependency to Cargo.toml: `cargo add <crate-name>`',
        'Run `cargo update` to refresh dependencies',
        'Check crate name spelling on https://crates.io',
        'Verify version compatibility in Cargo.toml'
      ]
    });

    // Java-specific patterns
    this.addPattern({
      id: 'java-null-pointer',
      name: 'Java NullPointerException',
      category: Category.Build,
      patterns: [
        /NullPointerException/,
        /java\.lang\.NullPointerException/
      ],
      severity: 'high',
      suggestions: [
        'Add null checks before dereferencing objects',
        'Use Optional<T> for values that may be absent',
        'Enable compiler null safety warnings',
        'Consider using @NonNull annotations',
        'Review method signatures for nullable return values'
      ],
      context: 'NullPointerException is the most common Java runtime error'
    });

    this.addPattern({
      id: 'java-class-not-found',
      name: 'Java ClassNotFoundException',
      category: Category.Dependencies,
      patterns: [
        /ClassNotFoundException/,
        /NoClassDefFoundError/,
        /java\.lang\.ClassNotFoundException/
      ],
      severity: 'high',
      suggestions: [
        'Verify all dependencies are in classpath',
        'Check Maven/Gradle dependencies are downloaded',
        'Run `mvn clean install` or `gradle clean build`',
        'Ensure package names match directory structure',
        'Check for typos in import statements'
      ]
    });

    this.addPattern({
      id: 'java-compilation-error',
      name: 'Java Compilation Error',
      category: Category.Build,
      patterns: [
        /error: cannot find symbol/i,
        /error: incompatible types/i,
        /error: method .+ cannot be applied/i,
        /compilation failed/i
      ],
      severity: 'high',
      suggestions: [
        'Check for typos in class, method, or variable names',
        'Verify all imports are present and correct',
        'Ensure method signatures match their calls',
        'Check for type mismatches in assignments',
        'Run IDE code analysis for detailed error hints'
      ]
    });

    this.addPattern({
      id: 'java-maven-dependency',
      name: 'Maven Dependency Issue',
      category: Category.Dependencies,
      patterns: [
        /Could not resolve dependencies/i,
        /Failed to execute goal.*dependency/i,
        /artifact .+ not found/i
      ],
      severity: 'high',
      suggestions: [
        'Run `mvn clean install -U` to force update dependencies',
        'Check pom.xml for correct dependency versions',
        'Verify Maven repository accessibility',
        'Clear local Maven repository: ~/.m2/repository',
        'Check for dependency conflicts with `mvn dependency:tree`'
      ]
    });

    // C++-specific patterns
    this.addPattern({
      id: 'cpp-segfault',
      name: 'C++ Segmentation Fault',
      category: Category.Security,
      patterns: [
        /segmentation fault/i,
        /SIGSEGV/,
        /core dumped/i
      ],
      severity: 'high',
      suggestions: [
        'Check for null pointer dereferences',
        'Verify array bounds are not exceeded',
        'Use AddressSanitizer: compile with -fsanitize=address',
        'Run with debugger (gdb/lldb) to find crash location',
        'Check for use-after-free and double-free errors'
      ],
      context: 'Segfaults indicate memory access violations'
    });

    this.addPattern({
      id: 'cpp-linker-error',
      name: 'C++ Linker Error',
      category: Category.Build,
      patterns: [
        /undefined reference to/i,
        /ld returned \d+ exit status/,
        /cannot find -l(.+)/,
        /multiple definition of/i
      ],
      severity: 'high',
      suggestions: [
        'Ensure all source files are included in build',
        'Check library paths and link order',
        'Verify function definitions match declarations',
        'Add missing library flags to linker: -l<libname>',
        'Check for duplicate symbol definitions across files'
      ]
    });

    this.addPattern({
      id: 'cpp-memory-leak',
      name: 'C++ Memory Leak',
      category: Category.Performance,
      patterns: [
        /memory leak/i,
        /heap-use-after-free/i,
        /heap-buffer-overflow/i
      ],
      severity: 'high',
      suggestions: [
        'Use smart pointers (unique_ptr, shared_ptr) instead of raw pointers',
        'Ensure every new has a corresponding delete',
        'Run with Valgrind: `valgrind --leak-check=full ./program`',
        'Use AddressSanitizer: compile with -fsanitize=address',
        'Follow RAII principles for resource management'
      ],
      context: 'Memory leaks can lead to performance degradation'
    });

    this.addPattern({
      id: 'cpp-compilation-error',
      name: 'C++ Compilation Error',
      category: Category.Build,
      patterns: [
        /error: ['`](.+)['`] was not declared in this scope/i,
        /error: no matching function for call to/i,
        /error: expected .+ before/i,
        /error: invalid use of/i
      ],
      severity: 'high',
      suggestions: [
        'Check for missing #include directives',
        'Verify namespace declarations and using statements',
        'Ensure template specializations are defined',
        'Check for typos in function/variable names',
        'Verify compiler version supports C++ standard used (C++11/14/17/20)'
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
