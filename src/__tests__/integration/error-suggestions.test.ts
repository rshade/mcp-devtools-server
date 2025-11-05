/**
 * Integration Tests for Error Suggestions
 *
 * Tests the integration of KnowledgeBase patterns with PlatformDetector
 * to ensure platform-specific suggestions work end-to-end.
 */

import { KnowledgeBase, Category } from '../../utils/knowledge-base.js';
import { PlatformDetector, PackageManager } from '../../utils/platform-detector.js';
import { SuggestionEngine } from '../../utils/suggestion-engine.js';
import { ExecutionResult } from '../../utils/shell-executor.js';

describe('Error Suggestions Integration', () => {
  let knowledgeBase: KnowledgeBase;
  let platformDetector: PlatformDetector;
  let suggestionEngine: SuggestionEngine;

  beforeEach(() => {
    knowledgeBase = new KnowledgeBase();
    platformDetector = new PlatformDetector();
    suggestionEngine = new SuggestionEngine();
    platformDetector.clearCache();
  });

  describe('Pattern + Platform Detection Integration', () => {
    it('should detect command not found and provide platform-specific install commands', () => {
      const errorText = 'make: command not found';
      const patterns = knowledgeBase.findMatchingPatterns(errorText);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].id).toBe('cmd-not-found-make');

      // Verify pattern provides multi-platform suggestions
      const suggestions = patterns[0].suggestions;
      expect(suggestions.some(s => s.includes('Ubuntu/Debian'))).toBe(true);
      expect(suggestions.some(s => s.includes('macOS'))).toBe(true);
      expect(suggestions.some(s => s.includes('Windows'))).toBe(true);
    });

    it('should generate platform-specific install command via detector', () => {
      const info = platformDetector.detect();
      const installCmd = platformDetector.getInstallCommand('make', 'build-essential');

      expect(installCmd).toBeTruthy();
      expect(typeof installCmd).toBe('string');

      // Verify command matches detected platform
      if (info.packageManager === PackageManager.Apt) {
        expect(installCmd).toContain('apt install');
      } else if (info.packageManager === PackageManager.Brew) {
        expect(installCmd).toContain('brew install');
      } else if (info.packageManager === PackageManager.Choco) {
        expect(installCmd).toContain('choco install');
      }
    });

    it('should handle go command not found with correct pattern specificity', () => {
      // Test cases that SHOULD match
      const shouldMatch = [
        'go: command not found',
        'bash: go: command not found',
        'sh: go: command not found',
        "'go' is not recognized as an internal or external command"
      ];

      shouldMatch.forEach(errorText => {
        const patterns = knowledgeBase.findMatchingPatterns(errorText);
        expect(patterns.some(p => p.id === 'cmd-not-found-go')).toBe(true);
      });

      // Test cases that SHOULD NOT match (false positives)
      const shouldNotMatch = [
        'Something has to go wrong',
        'Let it go and continue',
        'The program will go ahead'
      ];

      shouldNotMatch.forEach(errorText => {
        const patterns = knowledgeBase.findMatchingPatterns(errorText);
        expect(patterns.some(p => p.id === 'cmd-not-found-go')).toBe(false);
      });
    });

    it('should handle ENOENT errors correctly excluding node_modules', () => {
      // Should match: general file not found
      const generalFileError = "Error: ENOENT: no such file or directory, open '/path/to/file.txt'";
      const patterns1 = knowledgeBase.findMatchingPatterns(generalFileError);
      expect(patterns1.some(p => p.id === 'file-not-found')).toBe(true);

      // Should NOT match: node_modules errors (handled by js-module-not-found)
      const nodeModulesError = "Error: ENOENT: no such file or directory, open 'node_modules/package/index.js'";
      const patterns2 = knowledgeBase.findMatchingPatterns(nodeModulesError);
      expect(patterns2.some(p => p.id === 'file-not-found')).toBe(false);

      // Should match: nested paths that aren't node_modules
      const nestedFileError = "Error: ENOENT: no such file or directory, open '/app/src/config/settings.json'";
      const patterns3 = knowledgeBase.findMatchingPatterns(nestedFileError);
      expect(patterns3.some(p => p.id === 'file-not-found')).toBe(true);
    });
  });

  describe('SuggestionEngine Integration', () => {
    it('should generate suggestions for command not found errors', async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'golangci-lint: command not found',
        exitCode: 127,
        duration: 100,
        command: 'golangci-lint run'
      };

      const suggestions = await suggestionEngine.generateSuggestions(result);

      expect(suggestions.success).toBe(false);
      expect(suggestions.analysis.failureDetected).toBe(true);
      expect(suggestions.analysis.errorType).toBe('configuration');
      expect(suggestions.suggestions.length).toBeGreaterThan(0);

      // Should have high-priority suggestions
      const highPriority = suggestions.suggestions.filter(s => s.priority === 'high');
      expect(highPriority.length).toBeGreaterThan(0);

      // Should include actionable steps
      const hasInstallCommand = suggestions.suggestions.some(s =>
        s.actions.some(a => a.includes('go install') || a.includes('brew install'))
      );
      expect(hasInstallCommand).toBe(true);
    });

    it('should generate suggestions for permission denied errors', async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'Error: EACCES: permission denied, access \'/usr/local/bin/tool\'',
        exitCode: 1,
        duration: 50,
        command: 'install-tool'
      };

      const suggestions = await suggestionEngine.generateSuggestions(result);

      expect(suggestions.analysis.failureDetected).toBe(true);
      expect(suggestions.suggestions.length).toBeGreaterThan(0);

      // Should suggest chmod or permission fixes
      const hasPermissionFix = suggestions.suggestions.some(s =>
        s.actions.some(a => a.includes('chmod') || a.includes('permission'))
      );
      expect(hasPermissionFix).toBe(true);
    });

    it('should generate suggestions for network timeout errors', async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'Error: connect ETIMEDOUT 192.168.1.1:3000',
        exitCode: 1,
        duration: 30000,
        command: 'fetch-data'
      };

      const suggestions = await suggestionEngine.generateSuggestions(result);

      expect(suggestions.analysis.failureDetected).toBe(true);

      // Should suggest network troubleshooting
      const hasNetworkTips = suggestions.suggestions.some(s =>
        s.actions.some(a =>
          a.includes('network') || a.includes('firewall') || a.includes('connectivity')
        )
      );
      expect(hasNetworkTips).toBe(true);
    });

    it('should handle successful executions without false positives', async () => {
      const result: ExecutionResult = {
        success: true,
        stdout: 'Build successful',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'npm run build'
      };

      const suggestions = await suggestionEngine.generateSuggestions(result);

      expect(suggestions.success).toBe(true);
      expect(suggestions.analysis.failureDetected).toBe(false);
      expect(suggestions.suggestions[0].title).toContain('All checks passed');
    });
  });

  describe('Multi-Pattern Matching', () => {
    it('should prioritize by severity when multiple patterns match', () => {
      // Error that matches both test timeout (medium) and hardcoded secrets (high)
      const errorText = 'test timed out after 5000ms\npassword = "secret123"';
      const patterns = knowledgeBase.findMatchingPatterns(errorText);

      expect(patterns.length).toBeGreaterThan(1);

      // High severity should come first
      expect(patterns[0].severity).toBe('high');
    });

    it('should match multiple network error patterns', () => {
      const errors = [
        'Error: connect ETIMEDOUT',
        'Error: connect ECONNREFUSED 127.0.0.1:3000',
        'Error: getaddrinfo ENOTFOUND example.com',
        'Error: certificate verify failed'
      ];

      errors.forEach(errorText => {
        const patterns = knowledgeBase.findMatchingPatterns(errorText);
        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns[0].category).toBe(Category.Configuration);
      });
    });
  });

  describe('Platform Detection Caching', () => {
    it('should cache platform detection results', () => {
      const info1 = platformDetector.detect();
      const info2 = platformDetector.detect();

      // Should return same cached object
      expect(info1).toBe(info2);
    });

    it('should allow cache clearing', () => {
      const info1 = platformDetector.detect();
      platformDetector.clearCache();
      const info2 = platformDetector.detect();

      // Should be different object references after clear
      expect(info1).not.toBe(info2);

      // But same values
      expect(info1.platform).toBe(info2.platform);
      expect(info1.packageManager).toBe(info2.packageManager);
    });
  });

  describe('Error Pattern Coverage', () => {
    it('should have comprehensive command-not-found coverage', () => {
      const commands = [
        'make',
        'golangci-lint',
        'actionlint',
        'docker',
        'npm',
        'go',
        'python3',
        'git',
        'markdownlint',
        'yamllint',
        'cargo'
      ];

      commands.forEach(cmd => {
        const errorText = `${cmd}: command not found`;
        const patterns = knowledgeBase.findMatchingPatterns(errorText);

        expect(patterns.length).toBeGreaterThan(0);
        expect(patterns[0].id).toContain('cmd-not-found');
        expect(patterns[0].severity).toBe('high');
      });
    });

    it('should provide documentation links in suggestions', () => {
      const errorText = 'make: command not found';
      const patterns = knowledgeBase.findMatchingPatterns(errorText);

      expect(patterns.length).toBeGreaterThan(0);

      const hasDocLink = patterns[0].suggestions.some(s =>
        s.includes('http://') || s.includes('https://')
      );
      expect(hasDocLink).toBe(true);
    });
  });

  describe('Real-World Error Scenarios', () => {
    it('should handle Docker daemon not running', () => {
      const errorText = 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock';
      const patterns = knowledgeBase.findMatchingPatterns(errorText);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].id).toBe('cmd-not-found-docker');
      expect(patterns[0].suggestions.some(s => s.includes('systemctl start docker'))).toBe(true);
    });

    it('should handle npm permission errors', () => {
      const errorText = 'npm ERR! code EACCES\nnpm ERR! errno -13\nnpm ERR! Error: EACCES: permission denied';
      const patterns = knowledgeBase.findMatchingPatterns(errorText);

      expect(patterns.some(p => p.id === 'permission-denied-npm')).toBe(true);

      const npmPattern = patterns.find(p => p.id === 'permission-denied-npm');
      expect(npmPattern?.suggestions.some(s => s.includes('nvm'))).toBe(true);
      expect(npmPattern?.suggestions.some(s => s.includes('DO NOT use sudo'))).toBe(true);
    });

    it('should handle disk space full errors', () => {
      const errorText = 'Error: ENOSPC: no space left on device, write';
      const patterns = knowledgeBase.findMatchingPatterns(errorText);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].id).toBe('disk-space-full');
      expect(patterns[0].severity).toBe('high');
      expect(patterns[0].suggestions.some(s => s.includes('df -h'))).toBe(true);
    });

    it('should handle port already in use', () => {
      const errorText = 'Error: listen EADDRINUSE: address already in use :::3000';
      const patterns = knowledgeBase.findMatchingPatterns(errorText);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].id).toBe('port-in-use');
      expect(patterns[0].suggestions.some(s => s.includes('lsof'))).toBe(true);
    });
  });
});
