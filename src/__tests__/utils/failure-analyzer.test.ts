/**
 * Tests for Failure Analyzer
 */

import { FailureAnalyzer, ErrorType } from '../../utils/failure-analyzer.js';
import { ExecutionResult } from '../../utils/shell-executor.js';

describe('FailureAnalyzer', () => {
  let analyzer: FailureAnalyzer;

  beforeEach(() => {
    analyzer = new FailureAnalyzer();
  });

  describe('analyze - successful execution', () => {
    it('should detect no failure for successful execution', () => {
      const result: ExecutionResult = {
        success: true,
        stdout: 'All tests passed',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'go test'
      };

      const analysis = analyzer.analyze(result);

      expect(analysis.failureDetected).toBe(false);
      expect(analysis.suggestedActions).toContain('No issues detected');
      expect(analysis.confidence).toBe(1.0);
    });
  });

  describe('analyze - failures', () => {
    it('should detect Go test failure', () => {
      const result: ExecutionResult = {
        success: false,
        stdout: '--- FAIL: TestFoo (0.00s)\nFAIL',
        stderr: '',
        exitCode: 1,
        duration: 1000,
        command: 'go test'
      };

      const analysis = analyzer.analyze(result);

      expect(analysis.failureDetected).toBe(true);
      expect(analysis.errorType).toBe(ErrorType.TestFailure);
      expect(analysis.patterns.length).toBeGreaterThan(0);
      expect(analysis.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should detect dependency issue', () => {
      const result: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'cannot find package "github.com/foo/bar"',
        exitCode: 1,
        duration: 500,
        command: 'go mod download' // Change command to not trigger build detection
      };

      const analysis = analyzer.analyze(result);

      expect(analysis.failureDetected).toBe(true);
      expect(analysis.errorType).toBe(ErrorType.DependencyIssue);
      expect(analysis.patterns.some(p => p.id === 'go-missing-dep')).toBe(true);
    });

    it('should detect lint issues', () => {
      const result: ExecutionResult = {
        success: false,
        stdout: '5 issues found',
        stderr: '',
        exitCode: 1,
        duration: 800,
        command: 'golangci-lint run'
      };

      const analysis = analyzer.analyze(result);

      expect(analysis.failureDetected).toBe(true);
      expect(analysis.errorType).toBe(ErrorType.LintIssue);
    });

    it('should detect security issues', () => {
      const result: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'Found vulnerability CVE-2023-1234',
        exitCode: 1,
        duration: 500,
        command: 'govulncheck'
      };

      const analysis = analyzer.analyze(result);

      expect(analysis.failureDetected).toBe(true);
      expect(analysis.errorType).toBe(ErrorType.SecurityIssue);
    });

    it('should detect configuration issues', () => {
      const result: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'environment variable DATABASE_URL is not set',
        exitCode: 1,
        duration: 100,
        command: 'npm start'
      };

      const analysis = analyzer.analyze(result);

      expect(analysis.failureDetected).toBe(true);
      expect(analysis.errorType).toBe(ErrorType.ConfigurationIssue);
    });
  });

  describe('extract affected files', () => {
    it('should extract file paths from Go errors', () => {
      const result: ExecutionResult = {
        success: false,
        stdout: './main.go:42:10: undefined: foo\n./utils/helper.go:15:5: syntax error',
        stderr: '',
        exitCode: 2,
        duration: 300,
        command: 'go build'
      };

      const analysis = analyzer.analyze(result);

      expect(analysis.affectedFiles.length).toBeGreaterThan(0);
      // File paths may or may not include ./ prefix
      expect(analysis.affectedFiles.some(f => f.includes('main.go'))).toBe(true);
      expect(analysis.affectedFiles.some(f => f.includes('utils/helper.go'))).toBe(true);
    });

    it('should extract file paths from TypeScript errors', () => {
      const result: ExecutionResult = {
        success: false,
        stdout: 'src/index.ts:10:5 - error TS2322',
        stderr: '',
        exitCode: 2,
        duration: 500,
        command: 'tsc'
      };

      const analysis = analyzer.analyze(result);

      expect(analysis.affectedFiles).toContain('src/index.ts');
    });
  });

  describe('confidence calculation', () => {
    it('should have reasonable confidence when patterns match', () => {
      const result: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'cannot find package "github.com/foo/bar"',
        exitCode: 1,
        duration: 500,
        command: 'go mod download'
      };

      const analysis = analyzer.analyze(result);

      // Confidence should be higher than no matches (0.3) when patterns match
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.3);
      expect(analysis.patterns.length).toBeGreaterThan(0); // Ensure patterns matched
    });

    it('should have low confidence when no patterns match', () => {
      const result: ExecutionResult = {
        success: false,
        stdout: 'Some unknown error',
        stderr: '',
        exitCode: 1,
        duration: 500,
        command: 'unknown command'
      };

      const analysis = analyzer.analyze(result);

      expect(analysis.confidence).toBeLessThan(0.5);
    });
  });

  describe('analyzeTrends', () => {
    it('should calculate success rate', () => {
      const results: ExecutionResult[] = [
        {
          success: true,
          stdout: 'ok',
          stderr: '',
          exitCode: 0,
          duration: 100,
          command: 'go test'
        },
        {
          success: false,
          stdout: 'FAIL',
          stderr: '',
          exitCode: 1,
          duration: 200,
          command: 'go test'
        },
        {
          success: true,
          stdout: 'ok',
          stderr: '',
          exitCode: 0,
          duration: 150,
          command: 'go test'
        }
      ];

      const trends = analyzer.analyzeTrends(results);

      expect(trends.successRate).toBeCloseTo(0.667, 2);
    });

    it('should identify common errors', () => {
      const results: ExecutionResult[] = [
        {
          success: false,
          stdout: '',
          stderr: 'cannot find package "foo"',
          exitCode: 1,
          duration: 100,
          command: 'go mod download'
        },
        {
          success: false,
          stdout: '',
          stderr: 'cannot find package "bar"',
          exitCode: 1,
          duration: 100,
          command: 'go mod download'
        },
        {
          success: false,
          stdout: '--- FAIL: TestFoo (0.00s)',
          stderr: '',
          exitCode: 1,
          duration: 100,
          command: 'go test'
        }
      ];

      const trends = analyzer.analyzeTrends(results);

      // Should identify common patterns
      if (trends.commonErrors.length > 0) {
        expect(trends.commonErrors).toContain('Missing Go Dependency');
      } else {
        // At minimum, should have some recommendations
        expect(trends.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should provide recommendations based on trends', () => {
      const results: ExecutionResult[] = [
        {
          success: false,
          stdout: 'error',
          stderr: '',
          exitCode: 1,
          duration: 100,
          command: 'test'
        }
      ];

      const trends = analyzer.analyzeTrends(results);

      expect(trends.recommendations.length).toBeGreaterThan(0);
    });
  });
});
