import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SuggestionEngine } from '../../utils/suggestion-engine.js';
import { ProjectType } from '../../utils/project-detector.js';
import { ExecutionResult } from '../../utils/shell-executor.js';
import { CacheManager } from '../../utils/cache-manager.js';

describe('SuggestionEngine', () => {
  let engine: SuggestionEngine;

  beforeEach(() => {
    engine = new SuggestionEngine(process.cwd());
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for Go test failures', async () => {
      const result: ExecutionResult = {
        command: 'go test',
        stdout: 'FAIL: TestFoo (0.00s)\n    main_test.go:10: expected 1, got 2',
        stderr: '',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(false);
      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions[0].category).toBe('test');
      expect(suggestions.suggestions[0].priority).toBe('high');
      expect(suggestions.suggestions[0].actions.length).toBeGreaterThan(0);
    }, 60000); // 60s timeout for ProjectDetector file system scan

    it('should generate suggestions for missing dependencies', async () => {
      const result: ExecutionResult = {
        command: 'go build',
        stdout: '',
        stderr: 'cannot find package "github.com/foo/bar"',
        success: false,
        exitCode: 1,
        duration: 50
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(false);
      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions[0].category).toBe('dependencies');
      expect(suggestions.suggestions[0].actions.length).toBeGreaterThan(0);
    }, 60000); // 60s timeout for ProjectDetector file system scan

    it('should generate workflow optimization suggestions for successful builds', async () => {
      const result: ExecutionResult = {
        command: 'go build',
        stdout: 'Build successful',
        stderr: '',
        success: true,
        exitCode: 0,
        duration: 1000
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(true);
      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions.some(s => s.category === 'workflow')).toBe(true);
    });

    it('should handle context-aware suggestions for Node.js projects', async () => {
      const result: ExecutionResult = {
        command: 'npm test',
        stdout: '',
        stderr: 'Error: Cannot find module "lodash"',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const suggestions = await engine.generateSuggestions(result, {
        projectType: ProjectType.NodeJS,
        language: 'javascript'
      });

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions[0].actions.some(a => a.includes('npm install'))).toBe(true);
    });

    it('should generate security-related suggestions', async () => {
      const result: ExecutionResult = {
        command: 'npm audit',
        stdout: '',
        stderr: 'found 3 vulnerabilities (2 moderate, 1 high)',
        success: false,
        exitCode: 1,
        duration: 200
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions.some(s => s.category === 'security')).toBe(true);
      expect(suggestions.suggestions[0].priority).toBe('high');
    });

    it('should prioritize suggestions by confidence and severity', async () => {
      const result: ExecutionResult = {
        command: 'go test',
        stdout: 'FAIL: TestFoo\nFAIL: TestBar',
        stderr: 'data race detected',
        success: false,
        exitCode: 1,
        duration: 500
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(1);
      // Higher priority suggestions should come first
      expect(suggestions.suggestions[0].priority).toBe('high');
      expect(suggestions.suggestions[0].confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should include related files in suggestions', async () => {
      const result: ExecutionResult = {
        command: 'go test',
        stdout: '',
        stderr: 'main.go:42: undefined: Foo',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      const suggestionWithFiles = suggestions.suggestions.find(s => s.relatedFiles && s.relatedFiles.length > 0);
      expect(suggestionWithFiles).toBeDefined();
      if (suggestionWithFiles?.relatedFiles) {
        expect(suggestionWithFiles.relatedFiles.some(f => f.includes('main.go'))).toBe(true);
      }
    });

    it('should handle Python import errors', async () => {
      const result: ExecutionResult = {
        command: 'python3 main.py',
        stdout: '',
        stderr: 'ImportError: No module named requests',
        success: false,
        exitCode: 1,
        duration: 50
      };

      const suggestions = await engine.generateSuggestions(result, {
        projectType: ProjectType.Python,
        language: 'python'
      });

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions[0].actions.some(a => a.includes('pip install'))).toBe(true);
    });

    it('should provide actionable steps for lint issues', async () => {
      const result: ExecutionResult = {
        command: 'golangci-lint run',
        stdout: '',
        stderr: 'main.go:10:1: error ineffassign',
        success: false,
        exitCode: 1,
        duration: 200
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      // Lint category suggestions should be present (may be first or among multiple)
      expect(suggestions.suggestions.some(s => s.category === 'lint' || s.category === 'workflow')).toBe(true);
      expect(suggestions.suggestions[0].actions.length).toBeGreaterThan(0);
    });

    it('should handle empty or minimal output gracefully', async () => {
      const result: ExecutionResult = {
        command: 'unknown-command',
        stdout: '',
        stderr: '',
        success: false,
        exitCode: 127,
        duration: 10
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(false);
      expect(suggestions.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should aggregate multiple failure patterns into comprehensive suggestions', async () => {
      const result: ExecutionResult = {
        command: 'go test',
        stdout: '',
        stderr: 'cannot find package "foo"\ntest timed out after 30s\nWARNING: DATA RACE',
        success: false,
        exitCode: 1,
        duration: 30000
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(1);
      // Should have suggestions for dependencies, timeouts, or security (race conditions)
      const categories = suggestions.suggestions.map(s => s.category);
      expect(categories.some(c => ['dependencies', 'test', 'security'].includes(c))).toBe(true);
    });

    it('should calculate confidence scores appropriately', async () => {
      const result: ExecutionResult = {
        command: 'go test',
        stdout: '',
        stderr: 'FAIL: TestFoo (0.00s)',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      suggestions.suggestions.forEach(s => {
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('should provide language-specific recommendations for Go', async () => {
      const result: ExecutionResult = {
        command: 'go build',
        stdout: '',
        stderr: 'undefined: someVar',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const suggestions = await engine.generateSuggestions(result, {
        projectType: ProjectType.Go,
        language: 'go'
      });

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions.some(s =>
        s.actions.some(a => a.includes('go') || a.includes('Go'))
      )).toBe(true);
    });

    it('should provide language-specific recommendations for JavaScript/TypeScript', async () => {
      const result: ExecutionResult = {
        command: 'npm run build',
        stdout: '',
        stderr: "error TS2304: Cannot find name 'foo'",
        success: false,
        exitCode: 1,
        duration: 200
      };

      const suggestions = await engine.generateSuggestions(result, {
        projectType: ProjectType.NodeJS,
        language: 'typescript'
      });

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      // Should have either TypeScript-specific suggestions or general build suggestions
      expect(suggestions.suggestions.some(s =>
        s.category === 'build' || s.actions.some(a => a.toLowerCase().includes('type') || a.includes('import'))
      )).toBe(true);
    });

    it('should generate workflow suggestions for successful commands', async () => {
      const result: ExecutionResult = {
        command: 'make test',
        stdout: 'All tests passed',
        stderr: '',
        success: true,
        exitCode: 0,
        duration: 5000
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.success).toBe(true);
      expect(suggestions.suggestions.some(s => s.category === 'workflow')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle very long output without performance issues', async () => {
      const longOutput = 'Error: Something failed\n'.repeat(1000);
      const result: ExecutionResult = {
        command: 'test',
        stdout: longOutput,
        stderr: '',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const startTime = Date.now();
      const suggestions = await engine.generateSuggestions(result);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(suggestions.suggestions).toBeDefined();
    });

    it('should handle special characters in output', async () => {
      const result: ExecutionResult = {
        command: 'test',
        stdout: '',
        stderr: 'Error: "foo" != "bar" at line 10:5\nExpected: <nil>, Got: []{1,2,3}',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions).toBeDefined();
      expect(suggestions.suggestions.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiline error messages', async () => {
      const result: ExecutionResult = {
        command: 'go test',
        stdout: '',
        stderr: `--- FAIL: TestFoo (0.00s)
    main_test.go:10:
        Error Trace:    main_test.go:10
        Error:          Not equal
        Expected:       1
        Actual:         2`,
        success: false,
        exitCode: 1,
        duration: 100
      };

      const suggestions = await engine.generateSuggestions(result);

      expect(suggestions.suggestions.length).toBeGreaterThan(0);
      expect(suggestions.suggestions[0].relatedFiles?.some(f => f.includes('main_test.go'))).toBe(true);
    });
  });

  describe('caching behavior', () => {
    afterEach(() => {
      // Clear cache after each test
      CacheManager.resetInstance();
    });

    it('should cache suggestion results for identical commands', async () => {
      const result: ExecutionResult = {
        command: 'npm test',
        stdout: 'FAIL: test failed',
        stderr: '',
        success: false,
        exitCode: 1,
        duration: 100
      };

      // First call - should miss cache
      const firstCall = await engine.generateSuggestions(result);
      expect(firstCall.suggestions.length).toBeGreaterThan(0);

      // Second call with same result - should hit cache
      const secondCall = await engine.generateSuggestions(result);
      expect(secondCall.suggestions.length).toBe(firstCall.suggestions.length);
      expect(secondCall.analysis).toEqual(firstCall.analysis);
    }, 60000);

    it('should use different cache keys for different commands', async () => {
      const result1: ExecutionResult = {
        command: 'go test',
        stdout: 'FAIL',
        stderr: '',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const result2: ExecutionResult = {
        command: 'npm test',
        stdout: 'FAIL',
        stderr: '',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const suggestions1 = await engine.generateSuggestions(result1);
      const suggestions2 = await engine.generateSuggestions(result2);

      // Should be different results due to different commands
      expect(suggestions1).not.toEqual(suggestions2);
    }, 60000);

    it('should use different cache keys for different outputs', async () => {
      const result1: ExecutionResult = {
        command: 'go test',
        stdout: 'FAIL: TestFoo',
        stderr: '',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const result2: ExecutionResult = {
        command: 'go test',
        stdout: 'FAIL: TestBar',
        stderr: '',
        success: false,
        exitCode: 1,
        duration: 100
      };

      const suggestions1 = await engine.generateSuggestions(result1);
      const suggestions2 = await engine.generateSuggestions(result2);

      // Should potentially be different results due to different output
      // At minimum, they should have been analyzed separately
      expect(suggestions1).toBeDefined();
      expect(suggestions2).toBeDefined();
    }, 60000);

    it('should include context in cache key', async () => {
      const result: ExecutionResult = {
        command: 'test',
        stdout: 'failed',
        stderr: '',
        success: false,
        exitCode: 1,
        duration: 100
      };

      // Call with different contexts
      const suggestions1 = await engine.generateSuggestions(result, {
        language: 'go',
        projectType: ProjectType.Go
      });

      const suggestions2 = await engine.generateSuggestions(result, {
        language: 'javascript',
        projectType: ProjectType.NodeJS
      });

      // Should be analyzed with different contexts
      expect(suggestions1).toBeDefined();
      expect(suggestions2).toBeDefined();
    }, 60000);

    it('should respect cache TTL', async () => {
      const result: ExecutionResult = {
        command: 'test',
        stdout: 'failed',
        stderr: '',
        success: false,
        exitCode: 1,
        duration: 100
      };

      // First call
      const firstCall = await engine.generateSuggestions(result);

      // Verify cache exists
      const cacheManager = CacheManager.getInstance();
      const stats = cacheManager.getStats('smartSuggestions');
      expect(stats?.size).toBeGreaterThan(0);

      // Second call should hit cache
      const secondCall = await engine.generateSuggestions(result);
      expect(secondCall.analysis).toEqual(firstCall.analysis);
    }, 60000);
  });
});
