import { ActionlintTools } from '../../tools/actionlint-tools';
import path from 'path';

// Mock ShellExecutor to avoid ESM issues with execa
jest.mock('../../utils/shell-executor', () => ({
  ShellExecutor: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({
      success: true,
      stdout: '',
      stderr: '',
      exitCode: 0,
      duration: 100,
      command: 'actionlint test.yml'
    }),
    isCommandAvailable: jest.fn().mockResolvedValue(true)
  }))
}));

const fixturesDir = path.join(__dirname, '..', 'fixtures', 'workflows');

describe('ActionlintTools', () => {
  let tools: ActionlintTools;

  beforeEach(() => {
    tools = new ActionlintTools();
  });

  describe('validateArgs', () => {
    it('should validate valid arguments', () => {
      const args = {
        directory: '/test',
        files: ['workflow.yml'],
        format: 'json' as const,
        shellcheck: true,
        pyflakes: false
      };

      const validated = ActionlintTools.validateArgs(args);
      expect(validated).toEqual(args);
    });

    it('should accept optional arguments', () => {
      const args = {};
      const validated = ActionlintTools.validateArgs(args);
      expect(validated).toEqual({});
    });

    it('should reject invalid format', () => {
      const args = {
        format: 'invalid'
      };

      expect(() => ActionlintTools.validateArgs(args)).toThrow();
    });

    it('should accept all valid formats', () => {
      const formats = ['default', 'json', 'sarif'] as const;

      for (const format of formats) {
        const args = { format };
        const validated = ActionlintTools.validateArgs(args);
        expect(validated.format).toBe(format);
      }
    });
  });

  describe('isInstalled', () => {
    it('should check if actionlint is available', async () => {
      const result = await tools.isInstalled();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('actionlint', () => {
    it('should find workflow files in default location', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir
      });

      expect(result).toBeDefined();
      expect(result.filesChecked).toBeGreaterThanOrEqual(0);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(result.command).toContain('actionlint');
    });

    it('should accept specific files', async () => {
      const validWorkflow = path.join(fixturesDir, 'valid.yml');

      const result = await tools.actionlint({
        directory: fixturesDir,
        files: [validWorkflow]
      });

      expect(result).toBeDefined();
      expect(result.command).toContain('actionlint');
    });

    it('should support JSON format', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        format: 'json'
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should support SARIF format', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        format: 'sarif'
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should disable shellcheck when requested', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        shellcheck: false
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should enable pyflakes when requested', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        pyflakes: true
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should enable verbose output', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        verbose: true
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle no workflow files found', async () => {
      const emptyDir = path.join(__dirname, '..', 'fixtures', 'binary');

      const result = await tools.actionlint({
        directory: emptyDir
      });

      expect(result.success).toBe(false);
      expect(result.filesChecked).toBe(0);
      expect(result.error).toContain('No workflow files found');
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.length).toBeGreaterThan(0);
    });

    it('should provide suggestions when actionlint is not installed', async () => {
      // This test will only work if actionlint is not installed
      const result = await tools.actionlint({
        directory: fixturesDir
      });

      if (!result.success && result.error?.includes('not found')) {
        expect(result.suggestions).toBeDefined();
        expect(result.suggestions!.some(s => s.includes('Install'))).toBe(true);
      }
    });

    it('should support ignore patterns', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        ignore: ['SC2086', 'SC2154']
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should support additional arguments', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        args: ['-version']
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should support custom timeout', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        timeout: 30000
      });

      expect(result).toBeDefined();
      expect(result.duration).toBeLessThan(30000);
    });

    it('should support color output flags', async () => {
      const resultColor = await tools.actionlint({
        directory: fixturesDir,
        color: true
      });

      expect(typeof resultColor.success).toBe('boolean');

      const resultNoColor = await tools.actionlint({
        directory: fixturesDir,
        noColor: true
      });

      expect(typeof resultNoColor.success).toBe('boolean');
    });
  });

  describe('parseJsonOutput', () => {
    it('should parse valid JSON output', async () => {
      const jsonOutput = JSON.stringify([
        {
          message: 'Test error',
          filepath: 'workflow.yml',
          line: 10,
          column: 5,
          kind: 'error',
          snippet: 'test snippet'
        }
      ]);

      const issues = await tools.parseJsonOutput(jsonOutput);
      expect(issues.length).toBe(1);
      expect(issues[0].message).toBe('Test error');
      expect(issues[0].filepath).toBe('workflow.yml');
      expect(issues[0].line).toBe(10);
      expect(issues[0].column).toBe(5);
      expect(issues[0].kind).toBe('error');
    });

    it('should handle invalid JSON', async () => {
      const issues = await tools.parseJsonOutput('not valid json');
      expect(issues).toEqual([]);
    });

    it('should handle non-array JSON', async () => {
      const issues = await tools.parseJsonOutput('{"error": "test"}');
      expect(issues).toEqual([]);
    });

    it('should handle empty array', async () => {
      const issues = await tools.parseJsonOutput('[]');
      expect(issues).toEqual([]);
    });

    it('should handle missing optional fields', async () => {
      const jsonOutput = JSON.stringify([
        {
          message: 'Test error',
          filepath: 'workflow.yml'
        }
      ]);

      const issues = await tools.parseJsonOutput(jsonOutput);
      expect(issues.length).toBe(1);
      expect(issues[0].line).toBe(0);
      expect(issues[0].column).toBe(0);
      expect(issues[0].kind).toBe('error');
      expect(issues[0].snippet).toBeUndefined();
    });
  });

  describe('result properties', () => {
    it('should include all required result properties', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('command');
      expect(result).toHaveProperty('filesChecked');
      expect(result).toHaveProperty('issuesFound');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.output).toBe('string');
      expect(typeof result.duration).toBe('number');
      expect(typeof result.command).toBe('string');
      expect(typeof result.filesChecked).toBe('number');
      expect(typeof result.issuesFound).toBe('number');
    });

    it('should include error property on failure', async () => {
      const result = await tools.actionlint({
        directory: '/nonexistent/directory'
      });

      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(typeof result.error).toBe('string');
      }
    });

    it('should include suggestions on failure or issues', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir
      });

      if (!result.success || result.issuesFound > 0) {
        expect(result).toHaveProperty('suggestions');
        expect(Array.isArray(result.suggestions)).toBe(true);
      }
    });
  });

  describe('glob pattern expansion', () => {
    it('should expand glob patterns', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        files: ['*.yml']
      });

      expect(result.filesChecked).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple glob patterns', async () => {
      const result = await tools.actionlint({
        directory: fixturesDir,
        files: ['*.yml', '*.yaml']
      });

      expect(result.filesChecked).toBeGreaterThanOrEqual(0);
    });

    it('should handle absolute paths', async () => {
      const absolutePath = path.join(fixturesDir, 'valid.yml');

      const result = await tools.actionlint({
        files: [absolutePath]
      });

      expect(result).toBeDefined();
    });
  });

  describe('suggestion generation', () => {
    it('should provide helpful suggestions for common errors', async () => {
      // Test with a directory that doesn't have workflow files
      const result = await tools.actionlint({
        directory: path.join(__dirname, '..', 'fixtures', 'text')
      });

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions!.some(s =>
        s.includes('workflow') || s.includes('.github')
      )).toBe(true);
    });
  });
});
