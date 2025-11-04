/**
 * MCP Recommendations
 *
 * Provides intelligent recommendations for best-practice MCP servers
 * based on project context, detected issues, and common use cases.
 */

import { ProjectType } from './project-detector.js';

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

export enum MCPCategory {
  Development = 'development',
  Testing = 'testing',
  Documentation = 'documentation',
  AI = 'ai',
  Database = 'database',
  FileSystem = 'filesystem',
  Web = 'web',
  Productivity = 'productivity'
}

export class MCPRecommendations {
  private recommendations: MCPServerRecommendation[] = [];

  constructor() {
    this.initializeRecommendations();
  }

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

  private addRecommendation(recommendation: MCPServerRecommendation): void {
    this.recommendations.push(recommendation);
  }

  /**
   * Get all recommendations
   */
  getAllRecommendations(): MCPServerRecommendation[] {
    return this.recommendations;
  }

  /**
   * Get recommendations by category
   */
  getRecommendationsByCategory(category: MCPCategory): MCPServerRecommendation[] {
    return this.recommendations.filter(r => r.categories.includes(category));
  }

  /**
   * Get recommendations by priority
   */
  getRecommendationsByPriority(priority: 'high' | 'medium' | 'low'): MCPServerRecommendation[] {
    return this.recommendations.filter(r => r.priority === priority);
  }

  /**
   * Get contextual recommendations based on project type and issues
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
   * Get recommendations for specific use cases
   */
  getRecommendationsForUseCase(useCase: string): MCPServerRecommendation[] {
    return this.recommendations.filter(r =>
      r.useCases.some(uc => uc.toLowerCase().includes(useCase.toLowerCase()))
    );
  }

  /**
   * Sort recommendations by priority
   */
  private sortByPriority(recommendations: MCPServerRecommendation[]): MCPServerRecommendation[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  /**
   * Generate .mcp.json configuration snippet
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
   * Get statistics about available recommendations
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
