import { MCPRecommendations, MCPCategory } from '../../utils/mcp-recommendations.js';
import { ProjectType } from '../../utils/project-detector.js';

describe('MCPRecommendations', () => {
  let recommendations: MCPRecommendations;

  beforeEach(() => {
    recommendations = new MCPRecommendations();
  });

  describe('getRecommendationsByCategory', () => {
    it('should return AI-related MCP servers for AI category', () => {
      const aiRecs = recommendations.getRecommendationsByCategory(MCPCategory.AI);

      expect(aiRecs.length).toBeGreaterThan(0);
      expect(aiRecs.every(r => r.categories.includes(MCPCategory.AI))).toBe(true);
      expect(aiRecs.some(r => r.name === 'Sequential Thinking')).toBe(true);
      expect(aiRecs.some(r => r.name === 'Memory')).toBe(true);
    });

    it('should return testing-related MCP servers for Testing category', () => {
      const testRecs = recommendations.getRecommendationsByCategory(MCPCategory.Testing);

      expect(testRecs.length).toBeGreaterThan(0);
      expect(testRecs.every(r => r.categories.includes(MCPCategory.Testing))).toBe(true);
      expect(testRecs.some(r => r.name === 'Playwright')).toBe(true);
    });

    it('should return database-related MCP servers for Database category', () => {
      const dbRecs = recommendations.getRecommendationsByCategory(MCPCategory.Database);

      expect(dbRecs.length).toBeGreaterThan(0);
      expect(dbRecs.every(r => r.categories.includes(MCPCategory.Database))).toBe(true);
      expect(dbRecs.some(r => r.name === 'PostgreSQL')).toBe(true);
      expect(dbRecs.some(r => r.name === 'SQLite')).toBe(true);
    });

    it('should return filesystem-related MCP servers for FileSystem category', () => {
      const fsRecs = recommendations.getRecommendationsByCategory(MCPCategory.FileSystem);

      expect(fsRecs.length).toBeGreaterThan(0);
      expect(fsRecs.every(r => r.categories.includes(MCPCategory.FileSystem))).toBe(true);
      expect(fsRecs.some(r => r.name === 'Filesystem')).toBe(true);
    });

    it('should return development-related MCP servers for Development category', () => {
      const devRecs = recommendations.getRecommendationsByCategory(MCPCategory.Development);

      expect(devRecs.length).toBeGreaterThan(0);
      expect(devRecs.every(r => r.categories.includes(MCPCategory.Development))).toBe(true);
      expect(devRecs.some(r => r.name === 'Git')).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const recs = recommendations.getRecommendationsByCategory('NonExistent' as MCPCategory);

      expect(recs).toEqual([]);
    });
  });

  describe('getRecommendationsByPriority', () => {
    it('should return high priority recommendations', () => {
      const highPriorityRecs = recommendations.getRecommendationsByPriority('high');

      expect(highPriorityRecs.length).toBeGreaterThan(0);
      expect(highPriorityRecs.every(r => r.priority === 'high')).toBe(true);
      expect(highPriorityRecs.some(r => r.name === 'Context7')).toBe(true);
      expect(highPriorityRecs.some(r => r.name === 'Sequential Thinking')).toBe(true);
    });

    it('should return medium priority recommendations', () => {
      const mediumPriorityRecs = recommendations.getRecommendationsByPriority('medium');

      expect(mediumPriorityRecs.length).toBeGreaterThan(0);
      expect(mediumPriorityRecs.every(r => r.priority === 'medium')).toBe(true);
    });

    it('should return low priority recommendations', () => {
      const lowPriorityRecs = recommendations.getRecommendationsByPriority('low');

      expect(lowPriorityRecs.length).toBeGreaterThan(0);
      expect(lowPriorityRecs.every(r => r.priority === 'low')).toBe(true);
    });
  });

  describe('getRecommendationsForUseCase', () => {
    it('should return recommendations for browser testing use case', () => {
      const browserRecs = recommendations.getRecommendationsForUseCase('browser testing');

      expect(browserRecs.length).toBeGreaterThan(0);
      expect(browserRecs.some(r => r.name === 'Playwright')).toBe(true);
    });

    it('should return recommendations for documentation use case', () => {
      const docRecs = recommendations.getRecommendationsForUseCase('documentation');

      expect(docRecs.length).toBeGreaterThan(0);
      expect(docRecs.some(r => r.name === 'Context7')).toBe(true);
    });

    it('should return recommendations for database use case', () => {
      const dbRecs = recommendations.getRecommendationsForUseCase('database');

      expect(dbRecs.length).toBeGreaterThan(0);
      expect(dbRecs.some(r => r.name === 'PostgreSQL' || r.name === 'SQLite')).toBe(true);
    });

    it('should return recommendations for problem solving use case', () => {
      const problemRecs = recommendations.getRecommendationsForUseCase('problem solving');

      expect(problemRecs.length).toBeGreaterThan(0);
      expect(problemRecs.some(r => r.name === 'Sequential Thinking')).toBe(true);
    });

    it('should perform case-insensitive matching', () => {
      const upperRecs = recommendations.getRecommendationsForUseCase('BROWSER TESTING');
      const lowerRecs = recommendations.getRecommendationsForUseCase('browser testing');

      expect(upperRecs.length).toEqual(lowerRecs.length);
      expect(upperRecs.map(r => r.name).sort()).toEqual(lowerRecs.map(r => r.name).sort());
    });

    it('should return empty array for non-matching use case', () => {
      const recs = recommendations.getRecommendationsForUseCase('quantum computing');

      expect(recs).toEqual([]);
    });
  });

  describe('getContextualRecommendations', () => {
    it('should recommend database servers for projects with databases', () => {
      const context = {
        projectType: ProjectType.NodeJS,
        hasTests: true,
        hasDatabase: true,
        hasWebInterface: false,
        detectedIssues: []
      };

      const recs = recommendations.getContextualRecommendations(context);

      expect(recs.some(r => r.name === 'PostgreSQL' || r.name === 'SQLite')).toBe(true);
    });

    it('should recommend testing servers for projects with tests', () => {
      const context = {
        projectType: ProjectType.NodeJS,
        hasTests: true,
        hasDatabase: false,
        hasWebInterface: false,
        detectedIssues: []
      };

      const recs = recommendations.getContextualRecommendations(context);

      expect(recs.some(r => r.categories.includes(MCPCategory.Testing))).toBe(true);
    });

    it('should recommend Playwright for web projects', () => {
      const context = {
        projectType: ProjectType.NodeJS,
        hasTests: true,
        hasDatabase: false,
        hasWebInterface: true,
        detectedIssues: []
      };

      const recs = recommendations.getContextualRecommendations(context);

      expect(recs.some(r => r.name === 'Playwright')).toBe(true);
    });

    it('should recommend Context7 for all projects', () => {
      const context = {
        projectType: ProjectType.Go,
        hasTests: false,
        hasDatabase: false,
        hasWebInterface: false,
        detectedIssues: []
      };

      const recs = recommendations.getContextualRecommendations(context);

      expect(recs.some(r => r.name === 'Context7')).toBe(true);
    });

    it('should recommend Sequential Thinking for all projects', () => {
      const context = {
        projectType: ProjectType.Python,
        hasTests: false,
        hasDatabase: false,
        hasWebInterface: false,
        detectedIssues: []
      };

      const recs = recommendations.getContextualRecommendations(context);

      expect(recs.some(r => r.name === 'Sequential Thinking')).toBe(true);
    });

    it('should prioritize high-priority recommendations', () => {
      const context = {
        projectType: ProjectType.NodeJS,
        hasTests: true,
        hasDatabase: true,
        hasWebInterface: true,
        detectedIssues: []
      };

      const recs = recommendations.getContextualRecommendations(context);

      // High priority recommendations should appear first
      const priorities = recs.map(r => r.priority);
      const firstHighIndex = priorities.indexOf('high');
      const firstMediumIndex = priorities.indexOf('medium');

      if (firstHighIndex !== -1 && firstMediumIndex !== -1) {
        expect(firstHighIndex).toBeLessThan(firstMediumIndex);
      }
    });

    it('should handle projects with no special features', () => {
      const context = {
        projectType: ProjectType.Unknown,
        hasTests: false,
        hasDatabase: false,
        hasWebInterface: false,
        detectedIssues: []
      };

      const recs = recommendations.getContextualRecommendations(context);

      // Should still get base recommendations
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some(r => r.name === 'Context7' || r.name === 'Sequential Thinking')).toBe(true);
    });
  });

  describe('generateMCPConfig', () => {
    it('should generate valid .mcp.json configuration for given recommendations', () => {
      const recs = recommendations.getRecommendationsByPriority('high');
      const config = recommendations.generateMCPConfig(recs);

      expect(config).toHaveProperty('mcpServers');
      expect(typeof config.mcpServers).toBe('object');
      type ConfigType = { mcpServers: Record<string, unknown> };
      expect(Object.keys((config as ConfigType).mcpServers).length).toBeGreaterThan(0);
    });

    it('should include all provided recommendations in config', () => {
      const recs = [
        recommendations.getRecommendationsByCategory(MCPCategory.AI)[0],
        recommendations.getRecommendationsByCategory(MCPCategory.Testing)[0]
      ];
      const config = recommendations.generateMCPConfig(recs);

      type ConfigType = { mcpServers: Record<string, unknown> };
      expect(Object.keys((config as ConfigType).mcpServers).length).toBe(2);
    });

    it('should use kebab-case for server names in config', () => {
      const recs = recommendations.getRecommendationsByPriority('high');
      const config = recommendations.generateMCPConfig(recs);

      type ConfigType = { mcpServers: Record<string, unknown> };
      Object.keys((config as ConfigType).mcpServers).forEach(key => {
        expect(key).toMatch(/^[a-z0-9-]+$/);
      });
    });

    it('should include command and args in config', () => {
      const recs = recommendations.getRecommendationsByPriority('high');
      const config = recommendations.generateMCPConfig(recs);

      type ConfigType = { mcpServers: Record<string, unknown> };
      type ServerConfig = Record<string, unknown>;
      Object.values((config as ConfigType).mcpServers as ServerConfig).forEach((serverConfig: unknown) => {
        expect(serverConfig).toHaveProperty('command');
        expect(serverConfig).toHaveProperty('args');
        const typedConfig = serverConfig as { args: unknown };
        expect(Array.isArray(typedConfig.args)).toBe(true);
      });
    });

    it('should handle empty recommendations array', () => {
      const config = recommendations.generateMCPConfig([]);

      expect(config).toHaveProperty('mcpServers');
      type ConfigType = { mcpServers: Record<string, unknown> };
      expect(Object.keys((config as ConfigType).mcpServers).length).toBe(0);
    });
  });

  describe('recommendation content validation', () => {
    it('should have valid package names for all recommendations', () => {
      const allRecs = recommendations.getRecommendationsByPriority('high')
        .concat(recommendations.getRecommendationsByPriority('medium'))
        .concat(recommendations.getRecommendationsByPriority('low'));

      allRecs.forEach(rec => {
        expect(rec.package).toBeTruthy();
        expect(typeof rec.package).toBe('string');
        expect(rec.package.length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty descriptions for all recommendations', () => {
      const allRecs = recommendations.getRecommendationsByPriority('high')
        .concat(recommendations.getRecommendationsByPriority('medium'))
        .concat(recommendations.getRecommendationsByPriority('low'));

      allRecs.forEach(rec => {
        expect(rec.description).toBeTruthy();
        expect(typeof rec.description).toBe('string');
        expect(rec.description.length).toBeGreaterThan(10);
      });
    });

    it('should have use cases for all recommendations', () => {
      const allRecs = recommendations.getRecommendationsByPriority('high')
        .concat(recommendations.getRecommendationsByPriority('medium'))
        .concat(recommendations.getRecommendationsByPriority('low'));

      allRecs.forEach(rec => {
        expect(Array.isArray(rec.useCases)).toBe(true);
        expect(rec.useCases.length).toBeGreaterThan(0);
      });
    });

    it('should have benefits for all recommendations', () => {
      const allRecs = recommendations.getRecommendationsByPriority('high')
        .concat(recommendations.getRecommendationsByPriority('medium'))
        .concat(recommendations.getRecommendationsByPriority('low'));

      allRecs.forEach(rec => {
        expect(Array.isArray(rec.benefits)).toBe(true);
        expect(rec.benefits.length).toBeGreaterThan(0);
      });
    });

    it('should have valid config examples for all recommendations', () => {
      const allRecs = recommendations.getRecommendationsByPriority('high')
        .concat(recommendations.getRecommendationsByPriority('medium'))
        .concat(recommendations.getRecommendationsByPriority('low'));

      allRecs.forEach(rec => {
        expect(typeof rec.configExample).toBe('object');
        expect(rec.configExample).toHaveProperty('command');
        expect(rec.configExample).toHaveProperty('args');
      });
    });

    it('should have at least one category for all recommendations', () => {
      const allRecs = recommendations.getRecommendationsByPriority('high')
        .concat(recommendations.getRecommendationsByPriority('medium'))
        .concat(recommendations.getRecommendationsByPriority('low'));

      allRecs.forEach(rec => {
        expect(Array.isArray(rec.categories)).toBe(true);
        expect(rec.categories.length).toBeGreaterThan(0);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should provide comprehensive recommendations for full-stack web application', () => {
      const context = {
        projectType: ProjectType.NodeJS,
        hasTests: true,
        hasDatabase: true,
        hasWebInterface: true,
        detectedIssues: ['test-failures', 'database-slow-query']
      };

      const recs = recommendations.getContextualRecommendations(context);

      expect(recs.length).toBeGreaterThanOrEqual(3);
      expect(recs.some(r => r.categories.includes(MCPCategory.Testing))).toBe(true);
      expect(recs.some(r => r.categories.includes(MCPCategory.Database))).toBe(true);
      expect(recs.some(r => r.categories.includes(MCPCategory.Web))).toBe(true);
    });

    it('should provide recommendations for CLI tool development', () => {
      const context = {
        projectType: ProjectType.Go,
        hasTests: true,
        hasDatabase: false,
        hasWebInterface: false,
        detectedIssues: []
      };

      const recs = recommendations.getContextualRecommendations(context);

      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some(r => r.categories.includes(MCPCategory.Development))).toBe(true);
    });

    it('should handle mixed category recommendations', () => {
      const aiRecs = recommendations.getRecommendationsByCategory(MCPCategory.AI);

      aiRecs.forEach(rec => {
        // Some AI servers may have multiple categories
        expect(rec.categories.includes(MCPCategory.AI)).toBe(true);
        expect(rec.categories.length).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
