/**
 * MCP Recommendations
 *
 * Provides intelligent recommendations for best-practice MCP servers
 * based on project context, detected issues, and common use cases.
 */

import { ProjectType } from './project-detector.js';

/**
 * Recommendation for an MCP server with configuration and usage details
 * @property {string} name - Human-readable name of the MCP server
 * @property {string} package - NPM package name or installation command
 * @property {string} description - Detailed description of the server's capabilities
 * @property {string[]} useCases - Specific scenarios where this server is most beneficial
 * @property {string[]} benefits - Key benefits and advantages of using this server
 * @property {Record<string, unknown>} configExample - Example .mcp.json configuration snippet
 * @property {'high' | 'medium' | 'low'} priority - Recommendation priority level
 * @property {MCPCategory[]} categories - Categories this server belongs to
 */
export interface MCPServerRecommendation {
  name: string;
  package: string;
  description: string;
  useCases: string[];
  benefits: string[];
  configExample: Record<string, unknown>;
  priority: 'high' | 'medium' | 'low';
  categories: MCPCategory[];
}

/**
 * Categories for classifying MCP server capabilities and use cases
 */
export enum MCPCategory {
  /** General development tools and utilities */
  Development = 'development',
  /** Testing frameworks and quality assurance tools */
  Testing = 'testing',
  /** Documentation generation and API reference tools */
  Documentation = 'documentation',
  /** AI-powered assistants and reasoning tools */
  AI = 'ai',
  /** Database access and management tools */
  Database = 'database',
  /** File system operations and management */
  FileSystem = 'filesystem',
  /** Web development and HTTP-related tools */
  Web = 'web',
  /** Productivity enhancement and workflow tools */
  Productivity = 'productivity'
}

/**
 * Recommendation engine for MCP servers
 *
 * Provides intelligent, context-aware recommendations for Model Context Protocol (MCP)
 * servers that enhance development workflows. Maintains a curated catalog of MCP servers
 * with configuration examples, use cases, and contextual matching logic.
 */
export class MCPRecommendations {
  private recommendations: MCPServerRecommendation[] = [];

  /**
   * Creates a new MCPRecommendations instance and initializes the server catalog
   *
   * @example
   * ```typescript
   * const recommendations = new MCPRecommendations();
   * const all = recommendations.getAllRecommendations();
   * console.log(`${all.length} MCP servers available`);
   * ```
   */
  constructor() {
    this.initializeRecommendations();
  }

  /**
   * Initialize the catalog of recommended MCP servers
   *
   * Populates the recommendations database with curated MCP servers including:
   * - AI/Productivity: Sequential Thinking, Context7, Memory
   * - Testing: Playwright
   * - Database: PostgreSQL, SQLite
   * - File System: Filesystem
   * - Development: Git
   * - Web: Fetch
   *
   * Each recommendation includes configuration examples, use cases, and benefits.
   *
   * @private
   */
  private initializeRecommendations(): void {
    // Core AI/Productivity MCPs
    this.addRecommendation({
      name: 'Sequential Thinking',
      package: '@modelcontextprotocol/server-sequential-thinking',
      description: 'Advanced reasoning and problem-solving through structured, step-by-step thinking. Improves code quality and decision-making.',
      useCases: [
        'Complex problem solving and debugging',
        'Architecture and design decisions',
        'Code review and refactoring planning',
        'Multi-step task decomposition'
      ],
      benefits: [
        'Better reasoning through structured thinking',
        'Reduced errors in complex tasks',
        'Clearer documentation of thought process',
        'Improved code quality'
      ],
      configExample: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sequential-thinking']
      },
      priority: 'high',
      categories: [MCPCategory.AI, MCPCategory.Development, MCPCategory.Productivity]
    });

    this.addRecommendation({
      name: 'Context7',
      package: 'context7',
      description: 'Access to up-to-date documentation for libraries and frameworks. Essential for working with latest APIs and best practices.',
      useCases: [
        'Learning new libraries and frameworks',
        'Finding up-to-date API documentation',
        'Discovering best practices',
        'Code examples and usage patterns'
      ],
      benefits: [
        'Always current documentation',
        'Reduces time searching for docs',
        'Better code with framework best practices',
        'Quick access to examples'
      ],
      configExample: {
        command: 'npx',
        args: ['context7-mcp']
      },
      priority: 'high',
      categories: [MCPCategory.Documentation, MCPCategory.Development]
    });

    // Testing MCPs
    this.addRecommendation({
      name: 'Playwright',
      package: '@modelcontextprotocol/server-playwright',
      description: 'Browser automation and end-to-end testing. Enables automated testing of web applications.',
      useCases: [
        'End-to-end testing of web applications',
        'Browser testing and automation',
        'UI testing and screenshots',
        'Cross-browser compatibility testing',
        'Web development testing'
      ],
      benefits: [
        'Automated browser testing',
        'Visual regression testing',
        'Cross-browser support',
        'Fast and reliable tests'
      ],
      configExample: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-playwright']
      },
      priority: 'medium',
      categories: [MCPCategory.Testing, MCPCategory.Web]
    });

    // Database MCPs
    this.addRecommendation({
      name: 'PostgreSQL',
      package: '@modelcontextprotocol/server-postgres',
      description: 'Direct PostgreSQL database access for queries, schema inspection, and data management.',
      useCases: [
        'Database schema exploration',
        'Query development and testing',
        'Data analysis and reporting',
        'Database migration planning'
      ],
      benefits: [
        'Direct database access',
        'Schema introspection',
        'Query optimization',
        'Data exploration'
      ],
      configExample: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-postgres'],
        env: {
          POSTGRES_CONNECTION: 'postgresql://user:pass@localhost/db'
        }
      },
      priority: 'medium',
      categories: [MCPCategory.Database, MCPCategory.Development]
    });

    this.addRecommendation({
      name: 'SQLite',
      package: '@modelcontextprotocol/server-sqlite',
      description: 'SQLite database operations for local data storage and analysis.',
      useCases: [
        'Local data storage and analysis',
        'Embedded database applications',
        'Data exploration and prototyping',
        'Testing database logic'
      ],
      benefits: [
        'Zero-configuration database',
        'Fast local queries',
        'Perfect for prototyping',
        'No external dependencies'
      ],
      configExample: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-sqlite', '/path/to/database.db']
      },
      priority: 'low',
      categories: [MCPCategory.Database, MCPCategory.Development]
    });

    // File System MCPs
    this.addRecommendation({
      name: 'Filesystem',
      package: '@modelcontextprotocol/server-filesystem',
      description: 'Enhanced file system operations with pattern matching and bulk operations.',
      useCases: [
        'Bulk file operations',
        'Pattern-based file searches',
        'File organization and cleanup',
        'Large codebase navigation'
      ],
      benefits: [
        'Powerful file operations',
        'Pattern matching support',
        'Safe file manipulation',
        'Better than basic file tools'
      ],
      configExample: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem', '/allowed/path']
      },
      priority: 'medium',
      categories: [MCPCategory.FileSystem, MCPCategory.Development]
    });

    // Git MCPs
    this.addRecommendation({
      name: 'Git',
      package: '@modelcontextprotocol/server-git',
      description: 'Advanced Git operations including commit management, branch operations, and repository analysis.',
      useCases: [
        'Repository history analysis',
        'Branch and commit management',
        'Code review workflows',
        'Git repository operations'
      ],
      benefits: [
        'Comprehensive Git integration',
        'History analysis',
        'Automated workflows',
        'Better version control'
      ],
      configExample: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-git']
      },
      priority: 'high',
      categories: [MCPCategory.Development, MCPCategory.Productivity]
    });

    // Memory/Knowledge MCPs
    this.addRecommendation({
      name: 'Memory',
      package: '@modelcontextprotocol/server-memory',
      description: 'Persistent knowledge graph for storing and retrieving information across sessions.',
      useCases: [
        'Project-specific knowledge retention',
        'Storing decisions and rationale',
        'Building project context over time',
        'Team knowledge sharing'
      ],
      benefits: [
        'Persistent knowledge',
        'Context retention',
        'Better continuity',
        'Reduced re-explanation'
      ],
      configExample: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory']
      },
      priority: 'medium',
      categories: [MCPCategory.Productivity, MCPCategory.AI]
    });

    // Web/API MCPs
    this.addRecommendation({
      name: 'Fetch',
      package: '@modelcontextprotocol/server-fetch',
      description: 'HTTP request capabilities for interacting with web APIs and services.',
      useCases: [
        'API testing and integration',
        'Web development and API integration',
        'Web scraping and data collection',
        'External service integration',
        'API documentation exploration'
      ],
      benefits: [
        'HTTP request support',
        'API testing',
        'Web data access',
        'Service integration'
      ],
      configExample: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-fetch']
      },
      priority: 'medium',
      categories: [MCPCategory.Web, MCPCategory.Development]
    });
  }

  /**
   * Add an MCP server recommendation to the catalog
   *
   * @param {MCPServerRecommendation} recommendation - The recommendation to add
   * @private
   */
  private addRecommendation(recommendation: MCPServerRecommendation): void {
    this.recommendations.push(recommendation);
  }

  /**
   * Get all MCP server recommendations
   *
   * Returns the complete catalog of available MCP server recommendations
   * across all categories and priorities.
   *
   * @returns {MCPServerRecommendation[]} Array of all MCP server recommendations
   *
   * @example
   * ```typescript
   * const all = recommendations.getAllRecommendations();
   * console.log('Available servers:', all.map(r => r.name).join(', '));
   * ```
   */
  getAllRecommendations(): MCPServerRecommendation[] {
    return this.recommendations;
  }

  /**
   * Get MCP server recommendations filtered by category
   *
   * Returns all MCP server recommendations that belong to the specified category,
   * allowing users to find tools for specific use cases like testing, databases, etc.
   *
   * @param {MCPCategory} category - The category to filter by (AI, Testing, Database, etc.)
   * @returns {MCPServerRecommendation[]} Array of recommendations matching the category
   *
   * @example
   * ```typescript
   * const testingServers = recommendations.getRecommendationsByCategory(MCPCategory.Testing);
   * // Returns [Playwright, ...other testing servers]
   * ```
   */
  getRecommendationsByCategory(category: MCPCategory): MCPServerRecommendation[] {
    return this.recommendations.filter(r => r.categories.includes(category));
  }

  /**
   * Get MCP server recommendations filtered by priority level
   *
   * Returns recommendations matching a specific priority level, useful for
   * focusing on essential tools (high) vs. nice-to-have additions (low/medium).
   *
   * @param {'high' | 'medium' | 'low'} priority - The priority level to filter by
   * @returns {MCPServerRecommendation[]} Array of recommendations matching the priority
   *
   * @example
   * ```typescript
   * const essentialServers = recommendations.getRecommendationsByPriority('high');
   * // Returns [Sequential Thinking, Context7, Git]
   * ```
   */
  getRecommendationsByPriority(priority: 'high' | 'medium' | 'low'): MCPServerRecommendation[] {
    return this.recommendations.filter(r => r.priority === priority);
  }

  /**
   * Generate contextual MCP server recommendations based on project characteristics
   *
   * Analyzes project context (type, features, issues) and returns prioritized
   * recommendations for MCP servers that would be most beneficial.
   *
   * @param {{
   *   projectType?: ProjectType;
   *   hasTests?: boolean;
   *   hasDatabase?: boolean;
   *   hasWebInterface?: boolean;
   *   detectedIssues?: string[];
   * }} context - Project context for recommendations
   * @returns {MCPServerRecommendation[]} Prioritized array of relevant recommendations
   *
   * @example
   * ```typescript
   * const recs = recommendations.getContextualRecommendations({
   *   projectType: ProjectType.NodeJS,
   *   hasTests: true,
   *   hasDatabase: true,
   *   hasWebInterface: true
   * });
   * // Returns: [Context7, Sequential Thinking, Playwright, PostgreSQL, ...]
   * ```
   */
  getContextualRecommendations(context: {
    projectType?: ProjectType;
    hasTests?: boolean;
    hasDatabase?: boolean;
    hasWebInterface?: boolean;
    detectedIssues?: string[];
  }): MCPServerRecommendation[] {
    const recommended: MCPServerRecommendation[] = [];

    // Always recommend core AI/productivity tools
    recommended.push(
      ...this.recommendations.filter(r =>
        r.name === 'Sequential Thinking' || r.name === 'Context7'
      )
    );

    // Recommend Git for all projects
    const gitRec = this.recommendations.find(r => r.name === 'Git');
    if (gitRec) recommended.push(gitRec);

    // Testing recommendations
    if (context.hasTests) {
      const testingRecs = this.recommendations.filter(r => r.categories.includes(MCPCategory.Testing));
      recommended.push(...testingRecs);
    }

    // Additional web-specific testing for Node.js projects
    if (context.projectType === ProjectType.NodeJS && context.hasWebInterface) {
      const playwrightRec = this.recommendations.find(r => r.name === 'Playwright');
      if (playwrightRec && !recommended.includes(playwrightRec)) {
        recommended.push(playwrightRec);
      }
    }

    // Database recommendations
    if (context.hasDatabase) {
      const postgresRec = this.recommendations.find(r => r.name === 'PostgreSQL');
      const sqliteRec = this.recommendations.find(r => r.name === 'SQLite');
      if (postgresRec) recommended.push(postgresRec);
      if (sqliteRec) recommended.push(sqliteRec);
    }

    // File system for large projects
    if (context.projectType !== ProjectType.Unknown) {
      const fsRec = this.recommendations.find(r => r.name === 'Filesystem');
      if (fsRec) recommended.push(fsRec);
    }

    // Web/API projects
    if (context.hasWebInterface) {
      const fetchRec = this.recommendations.find(r => r.name === 'Fetch');
      if (fetchRec) recommended.push(fetchRec);
    }

    // Memory for complex projects
    if (context.projectType !== ProjectType.Unknown) {
      const memoryRec = this.recommendations.find(r => r.name === 'Memory');
      if (memoryRec) recommended.push(memoryRec);
    }

    // Remove duplicates and sort by priority
    const unique = Array.from(new Map(recommended.map(r => [r.name, r])).values());
    return this.sortByPriority(unique);
  }

  /**
   * Get recommendations matching a specific use case
   *
   * Searches through recommendation use cases to find servers that support
   * the specified use case (case-insensitive substring matching).
   *
   * @param {string} useCase - The use case to search for (e.g., "testing", "database", "API")
   * @returns {MCPServerRecommendation[]} Array of recommendations matching the use case
   *
   * @example
   * ```typescript
   * const testingTools = recommendations.getRecommendationsForUseCase('testing');
   * // Returns servers with "testing" in their use cases (Playwright, etc.)
   *
   * const dbTools = recommendations.getRecommendationsForUseCase('database');
   * // Returns [PostgreSQL, SQLite]
   * ```
   */
  getRecommendationsForUseCase(useCase: string): MCPServerRecommendation[] {
    return this.recommendations.filter(r =>
      r.useCases.some(uc => uc.toLowerCase().includes(useCase.toLowerCase()))
    );
  }

  /**
   * Sort recommendations by priority level
   *
   * Sorts recommendations with high priority first, followed by medium, then low.
   *
   * @param {MCPServerRecommendation[]} recommendations - Array of recommendations to sort
   * @returns {MCPServerRecommendation[]} Sorted array with high priority first
   * @private
   */
  private sortByPriority(recommendations: MCPServerRecommendation[]): MCPServerRecommendation[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Generate .mcp.json configuration snippet for recommended servers
   *
   * Creates a properly formatted .mcp.json configuration object that can be
   * directly used in Claude Desktop or other MCP-compatible applications.
   *
   * @param {MCPServerRecommendation[]} recommendations - Array of MCP server recommendations
   * @returns {Record<string, unknown>} .mcp.json configuration object with mcpServers key
   *
   * @example
   * ```typescript
   * const recommendations = recommendations.getContextualRecommendations(context);
   * const config = recommendations.generateMCPConfig(recommendations);
   * // Returns: { mcpServers: { "sequential-thinking": {...}, ... } }
   * ```
   */
  generateMCPConfig(recommendations: MCPServerRecommendation[]): Record<string, unknown> {
    const mcpServers: Record<string, unknown> = {};

    for (const rec of recommendations) {
      mcpServers[rec.name.toLowerCase().replace(/\s+/g, '-')] = rec.configExample;
    }

    return {
      mcpServers
    };
  }

  /**
   * Get statistics about the recommendation catalog
   *
   * Provides overview metrics including total count and distribution
   * across priorities and categories.
   *
   * @returns {{
   *   total: number;
   *   byPriority: Record<string, number>;
   *   byCategory: Record<string, number>;
   * }} Statistics about available recommendations
   *
   * @example
   * ```typescript
   * const stats = recommendations.getStats();
   * console.log(`Total: ${stats.total}`);
   * console.log('By priority:', stats.byPriority);
   * console.log('By category:', stats.byCategory);
   * // Output:
   * // Total: 9
   * // By priority: { high: 3, medium: 5, low: 1 }
   * // By category: { ai: 3, development: 5, testing: 2, ... }
   * ```
   */
  getStats(): {
    total: number;
    byPriority: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const byPriority: Record<string, number> = { high: 0, medium: 0, low: 0 };
    const byCategory: Record<string, number> = {};

    for (const rec of this.recommendations) {
      byPriority[rec.priority]++;
      for (const category of rec.categories) {
        byCategory[category] = (byCategory[category] || 0) + 1;
      }
    }

    return {
      total: this.recommendations.length,
      byPriority,
      byCategory
    };
  }
}
