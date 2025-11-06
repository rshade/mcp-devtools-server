import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MakeTools } from '../../tools/make-tools';
import { ShellExecutor } from '../../utils/shell-executor';
import { ProjectDetector } from '../../utils/project-detector';

// Mock type for jest.fn()
type MockFn = ReturnType<typeof jest.fn>;

describe('MakeTools', () => {
  let tools: MakeTools;
  let mockExecute: MockFn;
  let mockDetectProject: MockFn;
  let mockGetProjectContext: MockFn;

  beforeEach(() => {
    // Create mock executor
    const mockExecutor = {
      execute: jest.fn(),
      isCommandAvailable: jest.fn(() => Promise.resolve(true))
    } as unknown as ShellExecutor;

    // Create mock detector
    const mockDetector = {
      detectProject: jest.fn(),
      getProjectContext: jest.fn()
    } as unknown as ProjectDetector;

    tools = new MakeTools();

    // Replace executor and detector with mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tools as any).executor = mockExecutor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tools as any).detector = mockDetector;

    mockExecute = mockExecutor.execute as MockFn;
    mockDetectProject = mockDetector.detectProject as MockFn;
    mockGetProjectContext = mockDetector.getProjectContext as MockFn;
  });

  describe('Schema Validation', () => {
    describe('validateArgs', () => {
      it('should validate valid arguments', () => {
        const args = {
          directory: '/test',
          target: 'build',
          args: ['--verbose'],
          parallel: 4
        };
        const validated = MakeTools.validateArgs(args);
        expect(validated).toEqual(args);
      });

      it('should accept optional arguments', () => {
        const args = {};
        const validated = MakeTools.validateArgs(args);
        expect(validated).toEqual({});
      });

      it('should reject invalid parallel value (too low)', () => {
        const args = { parallel: 0 };
        expect(() => MakeTools.validateArgs(args)).toThrow();
      });

      it('should reject invalid parallel value (too high)', () => {
        const args = { parallel: 17 };
        expect(() => MakeTools.validateArgs(args)).toThrow();
      });

      it('should accept valid parallel range', () => {
        const args = { parallel: 8 };
        const validated = MakeTools.validateArgs(args);
        expect(validated.parallel).toBe(8);
      });

      it('should validate args array type', () => {
        const args = { args: ['--foo', '--bar'] };
        const validated = MakeTools.validateArgs(args);
        expect(validated.args).toEqual(['--foo', '--bar']);
      });
    });

    describe('validateStatusArgs', () => {
      it('should validate valid status arguments', () => {
        const args = { directory: '/test/path' };
        const validated = MakeTools.validateStatusArgs(args);
        expect(validated).toEqual(args);
      });

      it('should accept empty arguments', () => {
        const args = {};
        const validated = MakeTools.validateStatusArgs(args);
        expect(validated).toEqual({});
      });

      it('should reject invalid types', () => {
        const args = { directory: 123 };
        expect(() => MakeTools.validateStatusArgs(args)).toThrow();
      });
    });
  });

  describe('makeLint', () => {
    it('should execute lint target with default settings', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: 'Linting complete',
        stderr: '',
        exitCode: 0,
        duration: 1000
      });

      const result = await tools.makeLint({});

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['lint']
      }));
      expect(result.success).toBe(true);
      expect(result.target).toBe('lint');
      expect(result.output).toContain('Linting complete');
    });

    it('should use custom target when provided', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: 'Custom lint complete',
        stderr: '',
        exitCode: 0,
        duration: 500
      });

      await tools.makeLint({ target: 'lint-go' });

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['lint-go']
      }));
    });

    it('should pass directory to executor', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100
      });

      await tools.makeLint({ directory: '/test/dir' });

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        cwd: '/test/dir'
      }));
    });

    it('should handle lint failure with suggestions', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: "make: *** No rule to make target 'lint'",
        exitCode: 2,
        duration: 50
      });

      const result = await tools.makeLint({});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it('should add parallel flag when specified', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100
      });

      await tools.makeLint({ parallel: 4 });

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['lint', '-j4']
      }));
    });

    it('should add additional arguments', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100
      });

      await tools.makeLint({ args: ['--verbose', '--fix'] });

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['lint', '--verbose', '--fix']
      }));
    });
  });

  describe('makeTest', () => {
    it('should execute test target', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: 'All tests passed',
        stderr: '',
        exitCode: 0,
        duration: 5000
      });

      const result = await tools.makeTest({});

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['test']
      }));
      expect(result.success).toBe(true);
      expect(result.target).toBe('test');
    });

    it('should use custom test target', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100
      });

      await tools.makeTest({ target: 'test-unit' });

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['test-unit']
      }));
    });

    it('should handle test failures', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: 'FAIL: TestFoo',
        stderr: 'Tests failed',
        exitCode: 1,
        duration: 2000
      });

      const result = await tools.makeTest({});

      expect(result.success).toBe(false);
      expect(result.output).toContain('FAIL: TestFoo');
      expect(result.error).toBeDefined();
    });

    it('should include stderr in output formatting', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: 'Tests passed',
        stderr: 'Warning: deprecated API',
        exitCode: 0,
        duration: 1000
      });

      const result = await tools.makeTest({});

      expect(result.output).toContain('Tests passed');
      expect(result.output).toContain('--- stderr ---');
      expect(result.output).toContain('Warning: deprecated API');
    });
  });

  describe('makeBuild', () => {
    it('should execute build target', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: 'Build successful',
        stderr: '',
        exitCode: 0,
        duration: 3000
      });

      const result = await tools.makeBuild({});

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['build']
      }));
      expect(result.success).toBe(true);
      expect(result.target).toBe('build');
    });

    it('should handle build failures with suggestions', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'error: undefined reference to main',
        exitCode: 2,
        duration: 500
      });

      const result = await tools.makeBuild({});

      expect(result.success).toBe(false);
      expect(result.suggestions).toBeDefined();
    });

    it('should support parallel builds', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 1500
      });

      await tools.makeBuild({ parallel: 8 });

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['build', '-j8']
      }));
    });
  });

  describe('makeClean', () => {
    it('should execute clean target', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: 'Cleaned build artifacts',
        stderr: '',
        exitCode: 0,
        duration: 200
      });

      const result = await tools.makeClean({});

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['clean']
      }));
      expect(result.success).toBe(true);
      expect(result.target).toBe('clean');
    });

    it('should handle permission errors', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'rm: cannot remove file: Permission denied',
        exitCode: 1,
        duration: 100
      });

      const result = await tools.makeClean({});

      expect(result.success).toBe(false);
      expect(result.suggestions).toContain('Check file permissions in the project directory');
    });
  });

  describe('makeDepend', () => {
    it('should execute depend target', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: 'Dependencies installed',
        stderr: '',
        exitCode: 0,
        duration: 10000
      });

      const result = await tools.makeDepend({});

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['depend']
      }));
      expect(result.success).toBe(true);
      expect(result.target).toBe('depend');
    });

    it('should use custom dependency target', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100
      });

      await tools.makeDepend({ target: 'install' });

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['install']
      }));
    });
  });

  describe('getProjectStatus', () => {
    it('should return status when Makefile exists', async () => {
      mockDetectProject.mockResolvedValue({
        languages: ['typescript'],
        configFiles: [
          { type: 'makefile', path: '/project/Makefile' }
        ],
        makeTargets: ['build', 'test', 'lint', 'clean']
      });
      mockGetProjectContext.mockResolvedValue('TypeScript project with Makefile');

      const result = await tools.getProjectStatus();

      expect(result.hasMakefile).toBe(true);
      expect(result.availableTargets).toEqual(['build', 'test', 'lint', 'clean']);
      expect(result.makefileLocation).toBe('/project/Makefile');
      expect(result.recommendedTargets).toContain('build');
      expect(result.recommendedTargets).toContain('test');
      expect(result.projectContext).toBe('TypeScript project with Makefile');
    });

    it('should return status when Makefile does not exist', async () => {
      mockDetectProject.mockResolvedValue({
        languages: ['go'],
        configFiles: [],
        makeTargets: []
      });
      mockGetProjectContext.mockResolvedValue('Go project without Makefile');

      const result = await tools.getProjectStatus();

      expect(result.hasMakefile).toBe(false);
      expect(result.availableTargets).toEqual([]);
      expect(result.makefileLocation).toBeUndefined();
    });

    it('should handle project detection errors', async () => {
      mockDetectProject.mockRejectedValue(new Error('Directory not found'));
      mockGetProjectContext.mockRejectedValue(new Error('Directory not found'));

      const result = await tools.getProjectStatus();

      expect(result.hasMakefile).toBe(false);
      expect(result.projectContext).toContain('Error detecting project');
    });

    it('should recommend common targets', async () => {
      mockDetectProject.mockResolvedValue({
        languages: [],
        configFiles: [{ type: 'makefile', path: '/Makefile' }],
        makeTargets: ['all', 'build', 'test', 'lint', 'clean', 'install', 'custom-target']
      });
      mockGetProjectContext.mockResolvedValue('Project');

      const result = await tools.getProjectStatus();

      expect(result.recommendedTargets).toContain('build');
      expect(result.recommendedTargets).toContain('test');
      expect(result.recommendedTargets).toContain('lint');
      expect(result.recommendedTargets).toContain('clean');
      expect(result.recommendedTargets).toContain('install');
      expect(result.recommendedTargets).toContain('all');
    });

    it('should recommend targets with common patterns', async () => {
      mockDetectProject.mockResolvedValue({
        languages: [],
        configFiles: [{ type: 'makefile', path: '/Makefile' }],
        makeTargets: ['test-unit', 'test-integration', 'lint-go', 'build-prod']
      });
      mockGetProjectContext.mockResolvedValue('Project');

      const result = await tools.getProjectStatus();

      expect(result.recommendedTargets).toContain('test-unit');
      expect(result.recommendedTargets).toContain('test-integration');
      expect(result.recommendedTargets).toContain('lint-go');
      expect(result.recommendedTargets).toContain('build-prod');
    });

    it('should limit recommended targets to 10', async () => {
      const manyTargets = Array.from({ length: 20 }, (_, i) => `target-${i}`);
      mockDetectProject.mockResolvedValue({
        languages: [],
        configFiles: [{ type: 'makefile', path: '/Makefile' }],
        makeTargets: manyTargets
      });
      mockGetProjectContext.mockResolvedValue('Project');

      const result = await tools.getProjectStatus();

      expect(result.recommendedTargets.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Error Handling and Suggestions', () => {
    it('should suggest checking Makefile when file not found', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'No such file or directory',
        exitCode: 2,
        duration: 10
      });

      const result = await tools.makeBuild({});

      expect(result.suggestions).toContain('Check if Makefile exists in the current directory');
      expect(result.suggestions).toContain('Try running from the project root directory');
    });

    it('should suggest available targets when target not found', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: "make: *** No rule to make target 'foo'",
        exitCode: 2,
        duration: 10
      });

      mockDetectProject.mockResolvedValue({
        languages: [],
        configFiles: [{ type: 'makefile', path: '/Makefile' }],
        makeTargets: ['build', 'test', 'lint']
      });
      mockGetProjectContext.mockResolvedValue('Project');

      const result = await tools.makeBuild({ target: 'foo' });

      expect(result.suggestions?.some(s => s.includes('Available targets'))).toBe(true);
    });

    it('should suggest installing make when not found', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'make: command not found',
        exitCode: 127,
        duration: 10
      });

      const result = await tools.makeBuild({});

      expect(result.suggestions).toContain('Make is not installed or not in PATH');
      expect(result.suggestions).toContain('Install make using your system package manager');
    });

    it('should provide default suggestions for generic errors', async () => {
      mockExecute.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Unknown error occurred',
        exitCode: 1,
        duration: 100
      });

      const result = await tools.makeBuild({});

      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it('should handle exceptions during execution', async () => {
      mockExecute.mockRejectedValue(new Error('Execution failed'));

      const result = await tools.makeBuild({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution failed');
      expect(result.suggestions).toContain('Check if Makefile exists and target is defined');
    });
  });

  describe('Output Formatting', () => {
    it('should format stdout only', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: 'Build output',
        stderr: '',
        exitCode: 0,
        duration: 1000
      });

      const result = await tools.makeBuild({});

      expect(result.output).toBe('Build output');
      expect(result.output).not.toContain('stderr');
    });

    it('should format stderr only', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: 'Warning messages',
        exitCode: 0,
        duration: 1000
      });

      const result = await tools.makeBuild({});

      // When only stderr is present (no stdout), the separator is not added
      expect(result.output).toBe('Warning messages');
      expect(result.output).not.toContain('--- stderr ---');
    });

    it('should format both stdout and stderr', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: 'Standard output',
        stderr: 'Error output',
        exitCode: 0,
        duration: 1000
      });

      const result = await tools.makeBuild({});

      expect(result.output).toContain('Standard output');
      expect(result.output).toContain('--- stderr ---');
      expect(result.output).toContain('Error output');
    });

    it('should provide default message when no output', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 1234
      });

      const result = await tools.makeBuild({});

      expect(result.output).toContain('Command completed successfully');
      expect(result.output).toContain('1234ms');
    });
  });

  describe('Command Execution Options', () => {
    it('should set correct timeout', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100
      });

      await tools.makeBuild({});

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        timeout: 300000 // 5 minutes
      }));
    });

    it('should combine parallel and additional args', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 100
      });

      await tools.makeBuild({ parallel: 4, args: ['--verbose'] });

      expect(mockExecute).toHaveBeenCalledWith('make', expect.objectContaining({
        args: ['build', '-j4', '--verbose']
      }));
    });
  });

  describe('Duration Tracking', () => {
    it('should include duration in response', async () => {
      mockExecute.mockResolvedValue({
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0,
        duration: 5432
      });

      const result = await tools.makeBuild({});

      expect(result.duration).toBe(5432);
    });

    it('should set duration to 0 on exception', async () => {
      mockExecute.mockRejectedValue(new Error('Failed'));

      const result = await tools.makeBuild({});

      expect(result.duration).toBe(0);
    });
  });
});
