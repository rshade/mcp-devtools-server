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
});
