/**
 * Tests for Knowledge Base
 */

import { KnowledgeBase, Category } from '../../utils/knowledge-base.js';

describe('KnowledgeBase', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  describe('findMatchingPatterns', () => {
    it('should find Go missing dependency pattern', () => {
      const errorText = 'cannot find package "github.com/foo/bar"';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('go-missing-dep');
      expect(matches[0].severity).toBe('high');
    });

    it('should find Go test failure pattern', () => {
      const errorText = '--- FAIL: TestFoo (0.00s)';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('go-test-fail');
    });

    it('should find race condition pattern', () => {
      const errorText = 'WARNING: DATA RACE';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('go-race-condition');
      expect(matches[0].category).toBe(Category.Security);
    });

    it('should find JavaScript module not found pattern', () => {
      const errorText = 'Cannot find module \'react\'';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('js-module-not-found');
    });

    it('should find TypeScript type error pattern', () => {
      const errorText = 'TS2345: Type \'string\' is not assignable to type \'number\'';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('js-typescript-error');
    });

    it('should find security pattern for hardcoded secrets', () => {
      const errorText = 'const password = "secret123"';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('sec-hardcoded-secrets');
      expect(matches[0].category).toBe(Category.Security);
    });

    it('should find configuration pattern for missing env', () => {
      const errorText = 'environment variable DATABASE_URL is not set';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('config-missing-env');
    });

    it('should return empty array for no matches', () => {
      const errorText = 'Some random text with no patterns';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches).toEqual([]);
    });

    it('should sort matches by severity', () => {
      // This error might match multiple patterns with different severities
      const errorText = 'test timed out and password = "secret"';
      const matches = kb.findMatchingPatterns(errorText);

      if (matches.length > 1) {
        // High severity should come before medium/low
        const severityOrder = matches.map(m => m.severity);
        expect(severityOrder).toEqual(severityOrder.slice().sort((a, b) => {
          const order = { high: 0, medium: 1, low: 2 };
          return order[a] - order[b];
        }));
      }
    });
  });

  describe('getPatternsByCategory', () => {
    it('should return patterns for security category', () => {
      const patterns = kb.getPatternsByCategory(Category.Security);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.category === Category.Security)).toBe(true);
    });

    it('should return patterns for dependencies category', () => {
      const patterns = kb.getPatternsByCategory(Category.Dependencies);

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.every(p => p.category === Category.Dependencies)).toBe(true);
    });

    it('should return empty array for category with no patterns', () => {
      // General category might not have specific patterns defined
      const patterns = kb.getPatternsByCategory(Category.General);

      expect(Array.isArray(patterns)).toBe(true);
    });
  });

  describe('getPatternById', () => {
    it('should return pattern by ID', () => {
      const pattern = kb.getPatternById('go-missing-dep');

      expect(pattern).toBeDefined();
      expect(pattern?.id).toBe('go-missing-dep');
      expect(pattern?.suggestions.length).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent ID', () => {
      const pattern = kb.getPatternById('non-existent-pattern');

      expect(pattern).toBeUndefined();
    });
  });

  describe('getStats', () => {
    it('should return statistics about patterns', () => {
      const stats = kb.getStats();

      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(Object.keys(stats.byCategory).length).toBeGreaterThan(0);

      // Verify total matches sum of categories
      const categorySum = Object.values(stats.byCategory).reduce((a, b) => a + b, 0);
      expect(categorySum).toBe(stats.totalPatterns);
    });

    it('should have patterns in multiple categories', () => {
      const stats = kb.getStats();

      expect(stats.byCategory[Category.Security]).toBeGreaterThan(0);
      expect(stats.byCategory[Category.Dependencies]).toBeGreaterThan(0);
      expect(stats.byCategory[Category.Test]).toBeGreaterThan(0);
    });
  });

  describe('pattern suggestions', () => {
    it('should provide actionable suggestions for each pattern', () => {
      // Check a few specific patterns
      const goMissingDep = kb.getPatternById('go-missing-dep');
      expect(goMissingDep?.suggestions.length).toBeGreaterThan(0);
      expect(goMissingDep?.suggestions.some(s => s.includes('go mod tidy'))).toBe(true);

      const jsModuleNotFound = kb.getPatternById('js-module-not-found');
      expect(jsModuleNotFound?.suggestions.length).toBeGreaterThan(0);
      expect(jsModuleNotFound?.suggestions.some(s => s.includes('npm install'))).toBe(true);
    });
  });

  describe('command not found patterns', () => {
    it('should detect make command not found', () => {
      const errorText = 'bash: make: command not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('cmd-not-found-make');
      expect(matches[0].category).toBe(Category.Configuration);
      expect(matches[0].suggestions.some(s => s.includes('apt install build-essential'))).toBe(true);
    });

    it('should detect golangci-lint not installed', () => {
      const errorText = 'golangci-lint: command not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('cmd-not-found-golangci-lint');
      expect(matches[0].suggestions.some(s => s.includes('go install'))).toBe(true);
    });

    it('should detect docker not installed', () => {
      const errorText = 'docker: command not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('cmd-not-found-docker');
      expect(matches[0].suggestions.some(s => s.includes('Docker Desktop'))).toBe(true);
    });

    it('should detect npm not installed', () => {
      const errorText = 'npm: command not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('cmd-not-found-npm');
      expect(matches[0].suggestions.some(s => s.includes('Node.js'))).toBe(true);
    });

    it('should detect go not installed', () => {
      const errorText = 'go: command not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('cmd-not-found-go');
      expect(matches[0].suggestions.some(s => s.includes('go.dev'))).toBe(true);
    });

    it('should detect python not installed', () => {
      const errorText = 'python3: command not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('cmd-not-found-python');
      expect(matches[0].suggestions.some(s => s.includes('python3'))).toBe(true);
    });

    it('should detect git not installed', () => {
      const errorText = 'git: command not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('cmd-not-found-git');
      expect(matches[0].suggestions.some(s => s.includes('git'))).toBe(true);
    });

    it('should detect actionlint not installed', () => {
      const errorText = 'actionlint: command not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('cmd-not-found-actionlint');
      expect(matches[0].suggestions.some(s => s.includes('actionlint'))).toBe(true);
    });

    it('should detect cargo not installed', () => {
      const errorText = 'cargo: command not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('cmd-not-found-cargo');
      expect(matches[0].suggestions.some(s => s.includes('rustup'))).toBe(true);
    });
  });

  describe('permission denied patterns', () => {
    it('should detect permission denied errors', () => {
      const errorText = 'Permission denied';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('permission-denied-file');
      expect(matches[0].severity).toBe('high');
      expect(matches[0].suggestions.some(s => s.includes('chmod'))).toBe(true);
    });

    it('should detect EACCES errors', () => {
      const errorText = 'Error: EACCES: permission denied, access \'/usr/local/bin\'';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('permission-denied-file');
    });

    it('should detect npm permission denied', () => {
      const errorText = 'npm ERR! code EACCES\nnpm ERR! errno -13';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches.some(m => m.id === 'permission-denied-npm')).toBe(true);
      const npmPattern = matches.find(m => m.id === 'permission-denied-npm');
      expect(npmPattern?.suggestions.some(s => s.includes('nvm'))).toBe(true);
    });
  });

  describe('network error patterns', () => {
    it('should detect network timeout', () => {
      const errorText = 'Error: connect ETIMEDOUT';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('network-timeout');
      expect(matches[0].category).toBe(Category.Configuration);
      expect(matches[0].suggestions.some(s => s.includes('network connectivity'))).toBe(true);
    });

    it('should detect connection refused', () => {
      const errorText = 'Error: connect ECONNREFUSED 127.0.0.1:3000';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('network-refused');
      expect(matches[0].suggestions.some(s => s.includes('service is running'))).toBe(true);
    });

    it('should detect DNS resolution errors', () => {
      const errorText = 'Error: getaddrinfo ENOTFOUND example.com';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('network-dns-error');
      expect(matches[0].suggestions.some(s => s.includes('DNS'))).toBe(true);
    });

    it('should detect SSL/TLS certificate errors', () => {
      const errorText = 'Error: certificate verify failed';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('network-ssl-error');
      expect(matches[0].category).toBe(Category.Security);
      expect(matches[0].suggestions.some(s => s.includes('certificate'))).toBe(true);
    });
  });

  describe('file and system error patterns', () => {
    it('should detect file not found errors', () => {
      const errorText = 'Error: ENOENT: no such file or directory, open \'/path/to/file\'';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('file-not-found');
      expect(matches[0].suggestions.some(s => s.includes('file path'))).toBe(true);
    });

    it('should detect config file missing', () => {
      const errorText = 'Error: config file not found';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('config-file-missing');
      expect(matches[0].suggestions.some(s => s.includes('configuration'))).toBe(true);
    });

    it('should detect disk space full', () => {
      const errorText = 'Error: ENOSPC: no space left on device';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('disk-space-full');
      expect(matches[0].severity).toBe('high');
      expect(matches[0].suggestions.some(s => s.includes('df -h'))).toBe(true);
    });

    it('should detect port already in use', () => {
      const errorText = 'Error: listen EADDRINUSE: address already in use :::3000';
      const matches = kb.findMatchingPatterns(errorText);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].id).toBe('port-in-use');
      expect(matches[0].suggestions.some(s => s.includes('lsof'))).toBe(true);
    });
  });

  describe('pattern coverage', () => {
    it('should have increased total patterns after enhancement', () => {
      const stats = kb.getStats();

      // Should have at least 30+ patterns now (15 original + 20+ new)
      expect(stats.totalPatterns).toBeGreaterThanOrEqual(35);
    });

    it('should have significant configuration category patterns', () => {
      const patterns = kb.getPatternsByCategory(Category.Configuration);

      // Configuration category should have the most patterns (command-not-found, permissions, network, etc.)
      expect(patterns.length).toBeGreaterThanOrEqual(20);
    });

    it('should provide platform-specific suggestions', () => {
      const makePattern = kb.getPatternById('cmd-not-found-make');

      expect(makePattern?.suggestions.some(s => s.includes('Ubuntu/Debian'))).toBe(true);
      expect(makePattern?.suggestions.some(s => s.includes('macOS'))).toBe(true);
      expect(makePattern?.suggestions.some(s => s.includes('Windows'))).toBe(true);
    });
  });
});
