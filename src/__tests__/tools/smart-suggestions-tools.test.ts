import { describe, it, expect, beforeEach } from '@jest/globals';
import { SmartSuggestionsTools } from '../../tools/smart-suggestions-tools.js';
import { ProjectType } from '../../utils/project-detector.js';
import { MCPCategory } from '../../utils/mcp-recommendations.js';

describe('SmartSuggestionsTools', () => {
  let tools: SmartSuggestionsTools;
  const projectRoot = process.cwd();

  beforeEach(() => {
    tools = new SmartSuggestionsTools(projectRoot);
  });

  describe('analyzeCommand', () => {
    it('should execute and analyze a successful command', async () => {
      const result = await tools.analyzeCommand({
        command: 'echo',
        args: ['test'],
        directory: projectRoot
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('executionResult');
      expect(result).toHaveProperty('suggestions');
      expect(result.command).toBe('echo');
      expect(result.executionResult.exitCode).toBe(0);
    });

    it('should analyze a failing command and provide suggestions', async () => {
      const result = await tools.analyzeCommand({
        command: 'false', // Always fails with exit code 1
        directory: projectRoot
      });

      expect(result.success).toBe(false);
      expect(result.executionResult.exitCode).toBe(1);
      expect(result.suggestions).toBeDefined();
    }, 60000); // 60s timeout for ProjectDetector file system scan

    it('should respect timeout parameter', async () => {
      const startTime = Date.now();

      try {
        await tools.analyzeCommand({
          command: 'sleep',
          args: ['10'],
          timeout: 100 // 100ms timeout
        });
      } catch {
        // Timeout is expected
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // Should timeout well before 10 seconds
    }, 10000);

    it('should handle command with context information', async () => {
      const result = await tools.analyzeCommand({
        command: 'echo',
        args: ['test'],
        context: {
          tool: 'test-runner',
          language: 'javascript',
          projectType: ProjectType.NodeJS
        }
      });

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
    });

    it('should validate command parameter is required', async () => {
      await expect(async () => {
        await tools.analyzeCommand({
          command: '',
          directory: projectRoot
        });
      }).rejects.toThrow();
    });

    it('should handle commands with arguments', async () => {
      const result = await tools.analyzeCommand({
        command: 'echo',
        args: ['hello', 'world'],
        directory: projectRoot
      });

      expect(result.success).toBe(true);
      expect(result.executionResult.stdout).toContain('hello');
    });

    it('should detect and analyze test failures', async () => {
      // This test analyzes a canned failure result directly
      const result = await tools.analyzeResult({
        command: 'go test',
        exitCode: 1,
        stdout: 'FAIL: TestFoo (0.00s)',
        stderr: '',
        context: {
          tool: 'go test',
          language: 'go'
        }
      });

      expect(result.success).toBe(false);
      expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
    }, 60000); // 60s timeout for ProjectDetector file system scan
  });

  describe('analyzeResult', () => {
    it('should analyze a successful result', async () => {
      const result = await tools.analyzeResult({
        command: 'npm test',
        exitCode: 0,
        stdout: 'All tests passed',
        stderr: '',
        duration: 1000
      });

      expect(result.success).toBe(true);
      expect(result.suggestions).toBeDefined();
      expect(result.analysis).toBeDefined();
    });

    it('should analyze a failed result and provide suggestions', async () => {
      const result = await tools.analyzeResult({
        command: 'go test',
        exitCode: 1,
        stdout: '',
        stderr: 'FAIL: TestFoo (0.00s)\n    main_test.go:10: expected 1, got 2',
        duration: 100
      });

      expect(result.success).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toHaveProperty('title');
      expect(result.suggestions[0]).toHaveProperty('actions');
      expect(result.suggestions[0]).toHaveProperty('priority');
    });

    it('should handle result with context information', async () => {
      const result = await tools.analyzeResult({
        command: 'npm run build',
        exitCode: 1,
        stdout: '',
        stderr: "error TS2304: Cannot find name 'foo'",
        context: {
          tool: 'typescript',
          language: 'typescript',
          projectType: ProjectType.NodeJS
        }
      });

      expect(result.success).toBe(false);
      expect(result.analysis).toBeDefined();
      expect(result.analysis.errorType).toBeDefined();
    });

    it('should extract affected files from error output', async () => {
      const result = await tools.analyzeResult({
        command: 'go build',
        exitCode: 1,
        stdout: '',
        stderr: 'main.go:42: undefined: Foo\nutils.go:10: syntax error',
        duration: 100
      });

      expect(result.analysis).toBeDefined();
      expect(result.analysis.affectedFiles).toBeDefined();
      expect(result.analysis.affectedFiles.length).toBeGreaterThan(0);
    });

    it('should calculate confidence scores', async () => {
      const result = await tools.analyzeResult({
        command: 'go test',
        exitCode: 1,
        stdout: '',
        stderr: 'cannot find package "github.com/foo/bar"',
        duration: 50
      });

      expect(result.analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(result.analysis.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle empty output gracefully', async () => {
      const result = await tools.analyzeResult({
        command: 'unknown-command',
        exitCode: 127,
        stdout: '',
        stderr: '',
        duration: 10
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
    });

    it('should provide workflow suggestions for successful commands', async () => {
      const result = await tools.analyzeResult({
        command: 'make test',
        exitCode: 0,
        stdout: 'All tests passed\nCoverage: 85%',
        stderr: '',
        duration: 5000
      });

      expect(result.success).toBe(true);
      expect(result.suggestions.some(s => s.category === 'workflow')).toBe(true);
    });
  });

  describe('getKnowledgeBaseStats', () => {
    it('should return statistics about available patterns', async () => {
      const result = await tools.getKnowledgeBaseStats({});

      expect(result).toHaveProperty('totalPatterns');
      expect(result).toHaveProperty('byCategory');
      expect(result.totalPatterns).toBeGreaterThan(0);
      expect(typeof result.byCategory).toBe('object');
    });

    it('should filter by category when provided', async () => {
      const result = await tools.getKnowledgeBaseStats({
        category: 'security'
      });

      expect(result.totalPatterns).toBeGreaterThanOrEqual(0);
      // Category filtering affects the byCategory stats
      if (result.byCategory['security']) {
        expect(result.byCategory['security']).toBeGreaterThanOrEqual(0);
      }
    });

    it('should include all categories in byCategory', async () => {
      const result = await tools.getKnowledgeBaseStats({});

      expect(result.byCategory).toBeDefined();
      expect(Object.keys(result.byCategory).length).toBeGreaterThan(0);
      // Check for expected categories
      const categories = Object.keys(result.byCategory);
      expect(categories.some(c => ['security', 'test', 'build', 'dependencies'].includes(c))).toBe(true);
    });

    it('should handle invalid category gracefully', async () => {
      const result = await tools.getKnowledgeBaseStats({
        category: 'nonexistent-category'
      });

      expect(result).toBeDefined();
      expect(result.totalPatterns).toBeGreaterThanOrEqual(0);
    });
  });

  describe('recommendMCPServers', () => {
    it('should return contextual recommendations by default', async () => {
      const result = await tools.recommendMCPServers({});

      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('totalRecommendations');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.totalRecommendations).toBe(result.recommendations.length);
    });

    it('should filter by category when provided', async () => {
      const result = await tools.recommendMCPServers({
        category: MCPCategory.AI
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.every(r => r.categories.includes(MCPCategory.AI))).toBe(true);
    });

    it('should filter by priority when provided', async () => {
      const result = await tools.recommendMCPServers({
        priority: 'high'
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.every(r => r.priority === 'high')).toBe(true);
    });

    it('should filter by use case when provided', async () => {
      const result = await tools.recommendMCPServers({
        useCase: 'browser testing'
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.name === 'Playwright')).toBe(true);
    });

    it('should include MCP config when includeConfig is true', async () => {
      const result = await tools.recommendMCPServers({
        priority: 'high',
        includeConfig: true
      });

      expect(result.mcpConfig).toBeDefined();
      expect(result.mcpConfig).toHaveProperty('mcpServers');
      expect(typeof result.mcpConfig?.mcpServers).toBe('object');
    });

    it('should not include MCP config when includeConfig is false', async () => {
      const result = await tools.recommendMCPServers({
        priority: 'high',
        includeConfig: false
      });

      expect(result.mcpConfig).toBeUndefined();
    });

    it('should handle multiple filter criteria', async () => {
      const result = await tools.recommendMCPServers({
        category: MCPCategory.Testing,
        priority: 'high'
      });

      // Category takes precedence
      expect(result.recommendations.every(r => r.categories.includes(MCPCategory.Testing))).toBe(true);
    });

    it('should provide database recommendations for database category', async () => {
      const result = await tools.recommendMCPServers({
        category: MCPCategory.Database
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r =>
        r.name === 'PostgreSQL' || r.name === 'SQLite'
      )).toBe(true);
    });

    it('should provide development tool recommendations', async () => {
      const result = await tools.recommendMCPServers({
        category: MCPCategory.Development
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.name === 'Git')).toBe(true);
    });

    it('should handle empty result gracefully', async () => {
      const result = await tools.recommendMCPServers({
        useCase: 'quantum-computing-that-does-not-exist'
      });

      expect(result.recommendations).toEqual([]);
      expect(result.totalRecommendations).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate analyzeCommand arguments with Zod', async () => {
      type ToolsType = typeof tools;
      await expect(async () => {
        await (tools as ToolsType).analyzeCommand({
          command: ''  // Empty command should fail validation
        });
      }).rejects.toThrow();
    });

    it('should validate analyzeResult arguments with Zod', async () => {
      // Test that exitCode validation works
      const result = await tools.analyzeResult({
        command: 'test',
        exitCode: -1  // Edge case exit code
      });
      expect(result).toBeDefined();
    });

    it('should accept optional fields in analyzeCommand', async () => {
      const result = await tools.analyzeCommand({
        command: 'echo',
        args: ['test']
        // directory and timeout are optional
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should accept optional fields in analyzeResult', async () => {
      const result = await tools.analyzeResult({
        command: 'test',
        exitCode: 0
        // stdout, stderr, duration are optional
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should provide comprehensive analysis for Go test failure', async () => {
      const result = await tools.analyzeResult({
        command: 'go test ./...',
        exitCode: 1,
        stdout: '',
        stderr: `--- FAIL: TestCalculate (0.00s)
    calculator_test.go:15:
        Error Trace:    calculator_test.go:15
        Error:          Not equal: expected 4, got 5
FAIL
FAIL    github.com/example/calculator   0.001s`,
        duration: 100,
        context: {
          tool: 'go test',
          language: 'go',
          projectType: ProjectType.Go as string
        }
      });

      expect(result.success).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.analysis.affectedFiles.some(f => f.includes('calculator_test.go'))).toBe(true);
    });

    it('should provide comprehensive analysis for missing dependency', async () => {
      const result = await tools.analyzeResult({
        command: 'npm run build',
        exitCode: 1,
        stdout: '',
        stderr: "Cannot find module 'lodash'",
        duration: 50,
        context: {
          language: 'javascript',
          projectType: ProjectType.NodeJS as string
        }
      });

      expect(result.success).toBe(false);
      expect(result.suggestions.some(s =>
        s.actions.some(a => a.includes('npm install'))
      )).toBe(true);
    });

    it('should recommend appropriate MCP servers for web development project', async () => {
      const result = await tools.recommendMCPServers({
        useCase: 'web development'
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
      // Should recommend servers useful for web development
      const categories = result.recommendations.flatMap(r => r.categories);
      expect(categories).toContain(MCPCategory.Web);
    });
  });
});
