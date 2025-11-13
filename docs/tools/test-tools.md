# Test Tools

Multi-framework test execution with coverage reporting, intelligent runner detection, and comprehensive test status analysis.

## Overview

Test tools provide a unified interface for running tests across multiple languages and frameworks. The system automatically detects the appropriate test runner based on project type and configuration.

Supported test runners:
- **Make** - Generic Makefile-based testing
- **npm/Jest** - Node.js JavaScript/TypeScript testing
- **pytest** - Python testing
- **Go test** - Go testing with coverage
- **Cargo** - Rust testing

## Available Tools

### make_test

Run tests using `make test` command.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the test command |
| `args` | string[] | No | Additional arguments to pass to make |
| `timeout` | number | No | Test timeout in milliseconds (default: 300000 / 5 min) |

**Returns:**

```typescript
{
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  runner: string;
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  coverage?: CoverageInfo;
  suggestions?: string[];
}
```

### run_tests

Automatically detect and run tests using the appropriate test framework.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the test command |
| `pattern` | string | No | Test file pattern or specific test to run |
| `args` | string[] | No | Additional arguments to pass to the test runner |
| `coverage` | boolean | No | Generate test coverage report |
| `watch` | boolean | No | Run tests in watch mode (where supported) |
| `parallel` | boolean | No | Run tests in parallel when supported |
| `timeout` | number | No | Test timeout in milliseconds (default: 300000) |
| `verbose` | boolean | No | Enable verbose output |

**Framework Detection Priority:**
1. Check for `make test` target first
2. Node.js projects: npm/Jest
3. Python projects: pytest
4. Go projects: go test
5. Rust projects: cargo test

**Returns:** Same structure as `make_test`.

### get_project_test_status

Analyze project test setup and provide recommendations.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory to analyze |

**Returns:**

```typescript
{
  hasTests: boolean;
  testFramework?: string;
  testFiles: string[];
  testDirectories: string[];
  configFiles: string[];
  recommendations: string[];
}
```

## Usage Examples

### Basic Test Execution

Run tests using auto-detected framework:

```json
{
  "tool": "run_tests",
  "arguments": {}
}
```

### Run Tests with Coverage

Generate coverage report:

```json
{
  "tool": "run_tests",
  "arguments": {
    "coverage": true
  }
}
```

### Run Specific Test Pattern

Execute tests matching a pattern:

```json
{
  "tool": "run_tests",
  "arguments": {
    "pattern": "UserAuth"
  }
}
```

**Framework-specific behavior:**
- **Jest/npm**: Matches test file names
- **pytest**: Uses `-k` pattern matching
- **Go**: Uses `-run` regex pattern
- **Cargo**: Matches test function names

### Parallel Test Execution

Run tests in parallel (where supported):

```json
{
  "tool": "run_tests",
  "arguments": {
    "parallel": true
  }
}
```

**Note:** Go tests use `-parallel 4` by default.

### Watch Mode

Run tests continuously on file changes:

```json
{
  "tool": "run_tests",
  "arguments": {
    "watch": true
  }
}
```

**Supported by:** Jest, npm test scripts with watch capability.

### Verbose Output

Get detailed test execution output:

```json
{
  "tool": "run_tests",
  "arguments": {
    "verbose": true
  }
}
```

### Make Test

Run tests via Makefile:

```json
{
  "tool": "make_test",
  "arguments": {}
}
```

### Custom Test Arguments

Pass framework-specific arguments:

```json
{
  "tool": "run_tests",
  "arguments": {
    "args": ["--maxWorkers=4", "--bail"]
  }
}
```

### Check Test Status

Analyze test setup:

```json
{
  "tool": "get_project_test_status",
  "arguments": {}
}
```

**Example Output:**

```json
{
  "hasTests": true,
  "testFramework": "jest",
  "testFiles": [
    "src/__tests__/auth.test.ts",
    "src/__tests__/api.test.ts",
    "src/utils/helpers.test.ts"
  ],
  "testDirectories": [
    "src/__tests__",
    "tests"
  ],
  "configFiles": ["jest.config.js"],
  "recommendations": [
    "Found 42 test files",
    "Using jest test framework",
    "Run tests regularly during development",
    "Consider setting up continuous integration"
  ]
}
```

## Framework-Specific Examples

### Jest (Node.js)

```json
{
  "tool": "run_tests",
  "arguments": {
    "coverage": true,
    "verbose": true,
    "args": ["--maxWorkers=2"]
  }
}
```

### pytest (Python)

```json
{
  "tool": "run_tests",
  "arguments": {
    "pattern": "test_authentication",
    "coverage": true,
    "verbose": true,
    "args": ["--tb=short"]
  }
}
```

### Go Test

```json
{
  "tool": "run_tests",
  "arguments": {
    "pattern": "TestUserService",
    "coverage": true,
    "parallel": true,
    "args": ["-race"]
  }
}
```

### Cargo (Rust)

```json
{
  "tool": "run_tests",
  "arguments": {
    "pattern": "test_auth",
    "verbose": true
  }
}
```

## Common Issues and Solutions

### No Tests Found

**Error:** "No test files found" or "No tests found"

**Solution:**
- Check test file naming conventions:
  - Node.js: `*.test.js`, `*.spec.js`, `__tests__/*.js`
  - Python: `test_*.py`, `*_test.py`
  - Go: `*_test.go`
  - Rust: `tests/` directory or `#[test]` modules
- Verify test files are not in ignored directories
- Run `get_project_test_status` to diagnose

### Test Framework Not Installed

**Error:** "command not found" or "jest: command not found"

**Solution:**

```bash
# Install Jest
npm install --save-dev jest

# Install pytest
pip install pytest

# Go and Cargo testing are built-in
```

### Test Configuration Missing

**Error:** "No configuration found"

**Solution for Jest:**

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ]
};
```

**Solution for pytest:**

Create `pytest.ini`:

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

### Tests Timeout

**Error:** "Tests timed out" or timeout exceeded

**Solution:**

```json
{
  "tool": "run_tests",
  "arguments": {
    "timeout": 600000
  }
}
```

Or increase timeout for specific tests in the test file.

### Coverage Not Generated

**Solution:**

Ensure coverage tools are installed:

```bash
# Jest coverage (built-in)
npm test -- --coverage

# pytest coverage
pip install pytest-cov
pytest --cov=.

# Go coverage (built-in)
go test -cover ./...
```

## Integration Patterns

### CI/CD Integration

Add testing to your CI pipeline:

**.github/workflows/ci.yml:**

```yaml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Run tests with coverage
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Pre-push Hook

Run tests before pushing:

**.husky/pre-push:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests before push
npm test || exit 1
```

### MCP Configuration

Configure test tools in `.mcp-devtools.json`:

```json
{
  "tools": {
    "test": {
      "enabled": true,
      "defaultRunner": "auto",
      "coverage": true,
      "parallel": true,
      "timeout": 300000
    }
  },
  "workflows": {
    "pre-push": ["run_tests"]
  }
}
```

### NPM Scripts

Add test commands to `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## Best Practices

1. **Run Tests Frequently** - Execute tests during development, not just in CI
2. **Use Coverage Reports** - Aim for 80%+ coverage on critical code
3. **Parallelize When Possible** - Speed up test execution with parallel runners
4. **Isolate Tests** - Ensure tests can run independently in any order
5. **Fast Unit Tests** - Keep unit tests under 100ms each
6. **Clear Test Names** - Use descriptive test names that explain what's being tested
7. **Mock External Dependencies** - Use mocks for databases, APIs, file system
8. **CI/CD Integration** - Run tests automatically on every commit/PR

### Test Organization

```
src/
├── __tests__/           # Test files
│   ├── unit/            # Fast unit tests
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
├── utils/
│   └── helpers.ts
└── services/
    └── auth.service.ts
```

### Writing Good Tests

```typescript
// Good: Clear test name and single assertion
test('should return user when authentication succeeds', async () => {
  const user = await authenticate('valid-token');
  expect(user.id).toBe(123);
});

// Bad: Vague name and multiple unrelated assertions
test('auth works', async () => {
  const user = await authenticate('token');
  expect(user).toBeDefined();
  expect(user.name).toBeTruthy();
  // ... 10 more assertions
});
```

## Performance Considerations

- **Test Discovery**: First run may take longer due to file scanning
- **Parallel Execution**: Can reduce test time by 2-4x
- **Watch Mode**: Only reruns affected tests on file changes
- **Coverage**: Adds 20-50% overhead to test execution
- **Timeouts**: Default 5 minutes; adjust for slow integration tests
- **Caching**: Test results are not cached between runs

### Optimization Tips

1. **Split Test Suites**: Separate fast unit tests from slow integration tests
2. **Mocking**: Mock slow external dependencies
3. **Test Parallelization**: Use `parallel: true` for independent tests
4. **Incremental Testing**: Run only changed tests in development
5. **CI Optimization**: Use matrix builds for parallel test execution

## Coverage Information

Test tools extract coverage information from test output:

**Jest:**
```
All files        |   85.5  |   75.2  |   90.1  |   85.5  |
```

**pytest:**
```
TOTAL            1234     123     90%
```

**Go:**
```
coverage: 87.5% of statements
```

**Parsed Coverage:**

```typescript
{
  percentage: 87.5,
  lines: 1234,
  linesCovered: 1080,
  branches: 456,
  branchesCovered: 380
}
```

## Related Tools

- [**make-tools**](/tools/make-tools) - Execute `make test` targets
- [**lint-tools**](/tools/lint-tools) - Code quality checking
- [**go-tools**](/tools/go-tools) - Go-specific test commands
- [**smart-suggestions**](/tools/smart-suggestions) - Test failure analysis

## External Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [pytest Documentation](https://docs.pytest.org/)
- [Go Testing Package](https://pkg.go.dev/testing)
- [Cargo Test Documentation](https://doc.rust-lang.org/cargo/commands/cargo-test.html)
- [Testing Best Practices](https://testingjavascript.com/)
