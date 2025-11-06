import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TestTools } from '../../tools/test-tools';
import { ShellExecutor, ExecutionResult } from '../../utils/shell-executor';
import { ProjectDetector, ProjectType, BuildSystem } from '../../utils/project-detector';

// Mock type for jest.fn()
type MockFn = ReturnType<typeof jest.fn>;

describe('TestTools', () => {
  let tools: TestTools;
  let mockExecute: MockFn;
  let mockDetectProject: MockFn;

  beforeEach(() => {
    // Create mock executor
    const mockExecutor = {
      execute: jest.fn(),
      isCommandAvailable: jest.fn(() => Promise.resolve(true))
    } as unknown as ShellExecutor;

    // Create mock detector
    const mockDetector = {
      detectProject: jest.fn()
    } as unknown as ProjectDetector;

    tools = new TestTools('/test/project');
    // Replace executor and detector with mocks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tools as any).executor = mockExecutor;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tools as any).detector = mockDetector;

    mockExecute = mockExecutor.execute as MockFn;
    mockDetectProject = mockDetector.detectProject as MockFn;
  });

  describe('Schema Validation', () => {
    describe('validateArgs', () => {
      it('should validate valid test arguments', () => {
        const args = {
          directory: '/test',
          pattern: '*.test.ts',
          coverage: true,
          verbose: true,
          timeout: 5000
        };
        const validated = TestTools.validateArgs(args);
        expect(validated).toEqual(args);
      });

      it('should accept optional arguments', () => {
        const args = {};
        const validated = TestTools.validateArgs(args);
        expect(validated).toEqual({});
      });

      it('should accept args array', () => {
        const args = { args: ['--maxWorkers=2'] };
        const validated = TestTools.validateArgs(args);
        expect(validated.args).toEqual(['--maxWorkers=2']);
      });

      it('should reject invalid types', () => {
        const args = { coverage: 'invalid' };
        expect(() => TestTools.validateArgs(args)).toThrow();
      });
    });

    describe('validateStatusArgs', () => {
      it('should validate valid status arguments', () => {
        const args = { directory: '/test' };
        const validated = TestTools.validateStatusArgs(args);
        expect(validated).toEqual(args);
      });

      it('should accept empty arguments', () => {
        const args = {};
        const validated = TestTools.validateStatusArgs(args);
        expect(validated).toEqual({});
      });
    });
  });

  describe('makeTest', () => {
    it('should run make test successfully', async () => {
      const successResult: ExecutionResult = {
        success: true,
        stdout: 'Tests passed successfully\n10 tests, 10 passed',
        stderr: '',
        exitCode: 0,
        duration: 1500,
        command: 'make'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.makeTest({});

      expect(mockExecute).toHaveBeenCalledWith('make', {
        cwd: undefined,
        args: ['test'],
        timeout: 300000
      });
      expect(result.success).toBe(true);
      expect(result.runner).toBe('make');
      expect(result.duration).toBe(1500);
    });

    it('should pass additional args to make test', async () => {
      const successResult: ExecutionResult = {
        success: true,
        stdout: 'Tests passed',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'make'
      };
      mockExecute.mockResolvedValue(successResult);

      await tools.makeTest({ args: ['VERBOSE=1', 'COVERAGE=1'] });

      expect(mockExecute).toHaveBeenCalledWith('make', {
        cwd: undefined,
        args: ['test', 'VERBOSE=1', 'COVERAGE=1'],
        timeout: 300000
      });
    });

    it('should use custom timeout', async () => {
      const successResult: ExecutionResult = {
        success: true,
        stdout: 'Tests passed',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'make'
      };
      mockExecute.mockResolvedValue(successResult);

      await tools.makeTest({ timeout: 60000 });

      expect(mockExecute).toHaveBeenCalledWith('make', {
        cwd: undefined,
        args: ['test'],
        timeout: 60000
      });
    });

    it('should handle test failures', async () => {
      const failureResult: ExecutionResult = {
        success: false,
        stdout: '5 tests, 3 passed, 2 failed',
        stderr: 'Error: Test suite failed',
        exitCode: 1,
        duration: 2000,
        command: 'make',
        error: 'Test suite failed'
      };
      mockExecute.mockResolvedValue(failureResult);

      const result = await tools.makeTest({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test suite failed');
      expect(result.duration).toBe(2000);
    });
  });

  describe('runTests', () => {
    it('should run npm tests for NodeJS project', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.NPM,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const successResult: ExecutionResult = {
        success: true,
        stdout: 'Tests: 5 passed, 5 total',
        stderr: '',
        exitCode: 0,
        duration: 2000,
        command: 'npm'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({});

      expect(mockDetectProject).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledWith('npm', {
        cwd: undefined,
        args: ['test'],
        timeout: 300000
      });
      expect(result.runner).toBe('npm');
    });

    it('should run jest tests directly', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.Unknown,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const successResult: ExecutionResult = {
        success: true,
        stdout: 'Tests: 10 passed, 10 total',
        stderr: '',
        exitCode: 0,
        duration: 3000,
        command: 'jest'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({ pattern: 'user.test.ts', coverage: true });

      expect(mockExecute).toHaveBeenCalledWith('jest', {
        cwd: undefined,
        args: ['user.test.ts', '--coverage'],
        timeout: 300000
      });
      expect(result.runner).toBe('jest');
    });

    it('should run pytest tests for Python project', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.Python,
        buildSystem: BuildSystem.Pip,
        hasTests: true,
        testFramework: 'pytest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const successResult: ExecutionResult = {
        success: true,
        stdout: '15 passed in 2.5s',
        stderr: '',
        exitCode: 0,
        duration: 2500,
        command: 'pytest'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({ verbose: true });

      expect(mockExecute).toHaveBeenCalledWith('pytest', {
        cwd: undefined,
        args: ['-v'],
        timeout: 300000
      });
      expect(result.runner).toBe('pytest');
    });

    it('should run go tests for Go project', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.Go,
        buildSystem: BuildSystem.Go,
        hasTests: true,
        testFramework: 'go test',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const successResult: ExecutionResult = {
        success: true,
        stdout: 'PASS\ncoverage: 85.5% of statements',
        stderr: '',
        exitCode: 0,
        duration: 1800,
        command: 'go'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({ coverage: true, parallel: true });

      expect(mockExecute).toHaveBeenCalledWith('go', {
        cwd: undefined,
        args: ['test', '-cover', '-parallel', '4', './...'],
        timeout: 300000
      });
      expect(result.runner).toBe('go');
      expect(result.coverage?.percentage).toBe(85.5);
    });

    it('should run cargo tests for Rust project', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.Rust,
        buildSystem: BuildSystem.Cargo,
        hasTests: true,
        testFramework: 'cargo test',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const successResult: ExecutionResult = {
        success: true,
        stdout: 'test result: ok. 20 passed; 0 failed',
        stderr: '',
        exitCode: 0,
        duration: 2200,
        command: 'cargo'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({});

      expect(mockExecute).toHaveBeenCalledWith('cargo', {
        cwd: undefined,
        args: ['test'],
        timeout: 300000
      });
      expect(result.runner).toBe('cargo');
    });

    it('should prefer make test if available', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.NPM,
        hasTests: true,
        testFramework: 'jest',
        makeTargets: ['test', 'build', 'clean'],
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const successResult: ExecutionResult = {
        success: true,
        stdout: 'All tests passed',
        stderr: '',
        exitCode: 0,
        duration: 1500,
        command: 'make'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({});

      expect(result.runner).toBe('make');
    });

    it('should fall back to make for unsupported project type', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.Unknown,
        buildSystem: BuildSystem.Unknown,
        hasTests: false,
        configFiles: [],
        language: 'unknown',
        lintingTools: [],
        makeTargets: []
      });

      const failureResult: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'make: *** No rule to make target',
        exitCode: 2,
        duration: 10,
        command: 'make'
      };
      mockExecute.mockResolvedValue(failureResult);

      const result = await tools.runTests({});

      expect(result.success).toBe(false);
      expect(result.runner).toBe('make');
    });
  });

  describe('Jest Test Runner', () => {
    beforeEach(() => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.Unknown,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });
    });

    it('should parse jest test statistics', async () => {
      const jestOutput = `
Test Suites: 2 passed, 2 total
Tests: 2 failed, 8 passed, 10 total
Snapshots: 0 total
Time: 3.5s
      `;

      const successResult: ExecutionResult = {
        success: false,
        stdout: jestOutput,
        stderr: '',
        exitCode: 1,
        duration: 3500,
        command: 'jest'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({});

      expect(result.testsFailed).toBe(2);
      expect(result.testsPassed).toBe(8);
      expect(result.testsRun).toBe(10);
    });

    it('should parse jest coverage information', async () => {
      const jestOutput = `
------------|---------|----------|---------|---------|-------------------
File        | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
------------|---------|----------|---------|---------|-------------------
All files   |   92.5  |    85.2  |   90.1  |   92.5  |
      `;

      const successResult: ExecutionResult = {
        success: true,
        stdout: jestOutput,
        stderr: '',
        exitCode: 0,
        duration: 2000,
        command: 'jest'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({ coverage: true });

      expect(result.coverage?.percentage).toBe(92.5);
    });

    it('should enable watch mode', async () => {
      const successResult: ExecutionResult = {
        success: true,
        stdout: 'Watch mode enabled',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'jest'
      };
      mockExecute.mockResolvedValue(successResult);

      await tools.runTests({ watch: true });

      expect(mockExecute).toHaveBeenCalledWith('jest', expect.objectContaining({
        args: expect.arrayContaining(['--watch'])
      }));
    });

    it('should pass additional args to jest', async () => {
      const successResult: ExecutionResult = {
        success: true,
        stdout: 'Tests passed',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'jest'
      };
      mockExecute.mockResolvedValue(successResult);

      await tools.runTests({ args: ['--maxWorkers=2', '--bail'] });

      expect(mockExecute).toHaveBeenCalledWith('jest', expect.objectContaining({
        args: expect.arrayContaining(['--maxWorkers=2', '--bail'])
      }));
    });
  });

  describe('Pytest Test Runner', () => {
    beforeEach(() => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.Python,
        buildSystem: BuildSystem.Pip,
        hasTests: true,
        testFramework: 'pytest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });
    });

    it('should parse pytest test statistics', async () => {
      const pytestOutput = `
============================= test session starts ==============================
collected 25 items

tests/test_user.py ....                                                   [ 16%]
tests/test_api.py ..........                                              [ 56%]

======================== 15 passed 5 failed 5 skipped =========================
      `;

      const failureResult: ExecutionResult = {
        success: false,
        stdout: pytestOutput,
        stderr: '',
        exitCode: 1,
        duration: 4000,
        command: 'pytest'
      };
      mockExecute.mockResolvedValue(failureResult);

      const result = await tools.runTests({});

      expect(result.testsPassed).toBe(15);
      expect(result.testsFailed).toBe(5);
      expect(result.testsSkipped).toBe(5);
      expect(result.testsRun).toBe(25);
    });

    it('should parse pytest coverage', async () => {
      const pytestOutput = `
---------- coverage: platform linux, python 3.9.0 -----------
Name                      Stmts   Miss  Cover
---------------------------------------------
src/api.py                  100     12    88%
src/models.py               150      8    95%
---------------------------------------------
TOTAL                       250     20    92.0%
      `;

      const successResult: ExecutionResult = {
        success: true,
        stdout: pytestOutput,
        stderr: '',
        exitCode: 0,
        duration: 3000,
        command: 'pytest'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({ coverage: true });

      expect(result.coverage?.percentage).toBe(92.0);
    });

    it('should use pattern filter', async () => {
      const successResult: ExecutionResult = {
        success: true,
        stdout: '5 passed',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'pytest'
      };
      mockExecute.mockResolvedValue(successResult);

      await tools.runTests({ pattern: 'test_user' });

      expect(mockExecute).toHaveBeenCalledWith('pytest', expect.objectContaining({
        args: expect.arrayContaining(['-k', 'test_user'])
      }));
    });
  });

  describe('Go Test Runner', () => {
    beforeEach(() => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.Go,
        buildSystem: BuildSystem.Go,
        hasTests: true,
        testFramework: 'go test',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });
    });

    it('should parse go test success output', async () => {
      const goOutput = `PASS
ok      github.com/user/project/pkg    2.567s
      `;

      const successResult: ExecutionResult = {
        success: true,
        stdout: goOutput,
        stderr: '',
        exitCode: 0,
        duration: 2567,
        command: 'go'
      };
      mockExecute.mockResolvedValue(successResult);

      const result = await tools.runTests({});

      expect(result.testsPassed).toBe(1);
      expect(result.testsRun).toBe(1);
      expect(result.testsFailed).toBe(0);
    });

    it('should parse go test failure output', async () => {
      const goOutput = `
FAIL    github.com/user/project/pkg    1.234s
      `;

      const failureResult: ExecutionResult = {
        success: false,
        stdout: goOutput,
        stderr: '',
        exitCode: 1,
        duration: 1234,
        command: 'go'
      };
      mockExecute.mockResolvedValue(failureResult);

      const result = await tools.runTests({});

      expect(result.testsFailed).toBe(1);
      expect(result.testsRun).toBe(1);
    });

    it('should use run pattern', async () => {
      const successResult: ExecutionResult = {
        success: true,
        stdout: 'ok',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'go'
      };
      mockExecute.mockResolvedValue(successResult);

      await tools.runTests({ pattern: 'TestUser' });

      expect(mockExecute).toHaveBeenCalledWith('go', expect.objectContaining({
        args: expect.arrayContaining(['-run', 'TestUser'])
      }));
    });
  });

  describe('Cargo Test Runner', () => {
    beforeEach(() => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.Rust,
        buildSystem: BuildSystem.Cargo,
        hasTests: true,
        testFramework: 'cargo test',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });
    });

    it('should parse cargo test statistics', async () => {
      const cargoOutput = `
running 25 tests

test result: ok. 22 passed; 3 failed; 0 ignored; 0 measured; 0 filtered out
      `;

      const failureResult: ExecutionResult = {
        success: false,
        stdout: cargoOutput,
        stderr: '',
        exitCode: 1,
        duration: 5000,
        command: 'cargo'
      };
      mockExecute.mockResolvedValue(failureResult);

      const result = await tools.runTests({});

      expect(result.testsPassed).toBe(22);
      expect(result.testsFailed).toBe(3);
      expect(result.testsRun).toBe(25);
    });
  });

  describe('NPM Test Runner', () => {
    beforeEach(() => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.NPM,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });
    });

    it('should pass coverage flag to npm', async () => {
      const successResult: ExecutionResult = {
        success: true,
        stdout: 'Tests passed',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'npm'
      };
      mockExecute.mockResolvedValue(successResult);

      await tools.runTests({ coverage: true });

      expect(mockExecute).toHaveBeenCalledWith('npm', expect.objectContaining({
        args: expect.arrayContaining(['test', '--', '--coverage'])
      }));
    });

    it('should pass additional args to npm', async () => {
      const successResult: ExecutionResult = {
        success: true,
        stdout: 'Tests passed',
        stderr: '',
        exitCode: 0,
        duration: 1000,
        command: 'npm'
      };
      mockExecute.mockResolvedValue(successResult);

      await tools.runTests({ args: ['--maxWorkers=4'] });

      expect(mockExecute).toHaveBeenCalledWith('npm', expect.objectContaining({
        args: expect.arrayContaining(['test', '--', '--maxWorkers=4'])
      }));
    });
  });

  describe('getProjectTestStatus', () => {
    it('should return test status for project with tests', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.NPM,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [
          { name: 'jest.config.js', type: 'test', path: '/test/project/jest.config.js' },
          { name: 'package.json', type: 'package', path: '/test/project/package.json' }
        ],
        language: 'javascript',
        lintingTools: ['eslint']
      });

      // Note: Skipping glob mocking as ES modules don't allow direct property modification
      // This test validates the structure and error handling
      const status = await tools.getProjectTestStatus({});

      expect(status.hasTests).toBe(true);
      expect(status.testFramework).toBe('jest');
      expect(status.configFiles).toContain('jest.config.js');
      // testFiles may be empty if no actual test files exist in the test environment
      expect(Array.isArray(status.testFiles)).toBe(true);
      expect(Array.isArray(status.testDirectories)).toBe(true);
      expect(Array.isArray(status.recommendations)).toBe(true);
    });

    it('should return recommendations for project without tests', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.Python,
        buildSystem: BuildSystem.Pip,
        hasTests: false,
        configFiles: [],
        language: 'python',
        lintingTools: []
      });

      const status = await tools.getProjectTestStatus({});

      expect(status.hasTests).toBe(false);
      expect(status.testFiles).toEqual([]);
      expect(status.recommendations).toContain('No tests detected in this project');
      expect(status.recommendations).toContain('Consider setting up pytest for testing');
    });

    it('should handle errors gracefully', async () => {
      mockDetectProject.mockRejectedValue(new Error('Detection failed'));

      const status = await tools.getProjectTestStatus({});

      expect(status.hasTests).toBe(false);
      expect(status.testFiles).toEqual([]);
      expect(status.recommendations[0]).toContain('Error analyzing project');
    });
  });

  describe('Test Suggestions', () => {
    it('should suggest installing missing test runner', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.Unknown,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const failureResult: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'jest: command not found',
        exitCode: 127,
        duration: 100,
        command: 'jest',
        error: 'Command not found'
      };
      mockExecute.mockResolvedValue(failureResult);

      const result = await tools.runTests({});

      expect(result.suggestions).toContain('jest is not installed or not in PATH');
      expect(result.suggestions).toContain('Install Jest: npm install --save-dev jest');
    });

    it('should suggest checking configuration on config errors', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.Unknown,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const failureResult: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'Invalid configuration in jest.config.js',
        exitCode: 1,
        duration: 200,
        command: 'jest',
        error: 'Configuration error'
      };
      mockExecute.mockResolvedValue(failureResult);

      const result = await tools.runTests({});

      expect(result.suggestions).toContain('Check test configuration files');
    });

    it('should suggest checking test patterns when no tests found', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.Unknown,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const failureResult: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'No tests found',
        exitCode: 1,
        duration: 100,
        command: 'jest',
        error: 'No tests found'
      };
      mockExecute.mockResolvedValue(failureResult);

      const result = await tools.runTests({});

      expect(result.suggestions).toContain('No test files found');
      expect(result.suggestions).toContain('Check test file patterns and locations');
    });

    it('should suggest timeout increase on timeout errors', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.Unknown,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const failureResult: ExecutionResult = {
        success: false,
        stdout: '',
        stderr: 'Test execution timeout exceeded',
        exitCode: 124,
        duration: 300000,
        command: 'jest',
        error: 'Timeout'
      };
      mockExecute.mockResolvedValue(failureResult);

      const result = await tools.runTests({});

      expect(result.suggestions).toContain('Tests timed out');
      expect(result.suggestions).toContain('Consider increasing timeout or optimizing slow tests');
    });
  });

  describe('Test Output Formatting', () => {
    it('should combine stdout and stderr', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.NPM,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const result: ExecutionResult = {
        success: false,
        stdout: 'Test output line 1\nTest output line 2',
        stderr: 'Error: Test failed',
        exitCode: 1,
        duration: 1000,
        command: 'npm',
        error: 'Test failed'
      };
      mockExecute.mockResolvedValue(result);

      const testResult = await tools.runTests({});

      expect(testResult.output).toContain('Test output line 1');
      expect(testResult.output).toContain('Error: Test failed');
    });

    it('should filter out warnings from stderr', async () => {
      mockDetectProject.mockResolvedValue({
        type: ProjectType.NodeJS,
        buildSystem: BuildSystem.NPM,
        hasTests: true,
        testFramework: 'jest',
        configFiles: [],
        language: 'javascript',
        lintingTools: []
      });

      const result: ExecutionResult = {
        success: true,
        stdout: 'Tests passed',
        stderr: 'warning: deprecated API usage',
        exitCode: 0,
        duration: 1000,
        command: 'npm'
      };
      mockExecute.mockResolvedValue(result);

      const testResult = await tools.runTests({});

      expect(testResult.output).toBe('Tests passed');
      expect(testResult.output).not.toContain('warning');
    });
  });
});
