# Make Tools

Execute Makefile targets with intelligent failure analysis and suggestions.

## Overview

Make tools provide a standardized interface for executing common Makefile targets like lint, test, build, clean, and depend. These tools integrate with the MCP DevTools intelligent caching and failure analysis systems.

## Available Tools

### make_lint

Run `make lint` to check code quality and style.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the make command |
| `target` | string | No | Specific make target (default: `lint`) |
| `args` | string[] | No | Additional arguments to pass to make |
| `parallel` | number | No | Number of parallel jobs (1-16, `-j` flag) |

**Returns:**

```typescript
{
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  target: string;
  suggestions?: string[];
}
```

### make_test

Run `make test` to execute test suites.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the make command |
| `target` | string | No | Specific make target (default: `test`) |
| `args` | string[] | No | Additional arguments (e.g., test patterns) |
| `parallel` | number | No | Number of parallel jobs (1-16) |

### make_depend

Run `make depend` or equivalent to install dependencies.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the make command |
| `target` | string | No | Specific make target (default: `depend`) |
| `args` | string[] | No | Additional arguments |
| `parallel` | number | No | Number of parallel jobs (1-16) |

### make_build

Run `make build` or `make all` to build the project.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the make command |
| `target` | string | No | Specific make target (default: `build`) |
| `args` | string[] | No | Additional arguments |
| `parallel` | number | No | Number of parallel jobs (1-16) |

### make_clean

Run `make clean` to remove build artifacts.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the make command |
| `target` | string | No | Specific make target (default: `clean`) |
| `args` | string[] | No | Additional arguments |
| `parallel` | number | No | Number of parallel jobs (1-16) |

### make_status

Analyze Makefile and available targets.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory to analyze |

**Returns:**

```typescript
{
  hasMakefile: boolean;
  availableTargets: string[];
  recommendedTargets: string[];
  projectContext: string;
  makefileLocation?: string;
}
```

## Usage Examples

### Basic Linting

Run default lint target:

```json
{
  "tool": "make_lint",
  "arguments": {}
}
```

### Custom Lint Target

Run a custom linting target:

```json
{
  "tool": "make_lint",
  "arguments": {
    "target": "lint-all"
  }
}
```

### Parallel Build

Build with parallel jobs for faster execution:

```json
{
  "tool": "make_build",
  "arguments": {
    "parallel": 4
  }
}
```

### Test with Pattern

Run tests matching a specific pattern:

```json
{
  "tool": "make_test",
  "arguments": {
    "args": ["TESTS=integration/*"]
  }
}
```

### Custom Directory

Execute make in a specific directory:

```json
{
  "tool": "make_build",
  "arguments": {
    "directory": "./backend"
  }
}
```

### Check Makefile Status

Discover available targets:

```json
{
  "tool": "make_status",
  "arguments": {
    "directory": "."
  }
}
```

**Example Output:**

```json
{
  "hasMakefile": true,
  "availableTargets": [
    "lint",
    "test",
    "build",
    "clean",
    "install",
    "help"
  ],
  "recommendedTargets": ["lint", "test", "build"],
  "projectContext": "Node.js project with TypeScript",
  "makefileLocation": "/path/to/project/Makefile"
}
```

## Common Issues and Solutions

### Makefile Not Found

**Error:** "No Makefile found"

**Solution:**
- Ensure `Makefile` exists in the project root
- Check spelling (case-sensitive on Unix systems)
- Use `directory` parameter to specify correct location

### Target Not Found

**Error:** "make: *** No rule to make target 'lint'"

**Solution:**
- Run `make_status` to see available targets
- Check Makefile for correct target name
- Add missing target to Makefile

### Parallel Job Issues

**Error:** "make: *** [target] Error 1" with parallel jobs

**Solution:**
- Some targets don't support parallel execution
- Reduce `parallel` value or omit it
- Ensure Makefile targets have proper dependencies

### Permission Denied

**Error:** "make: Permission denied"

**Solution:**

```bash
# Fix execute permissions
chmod +x Makefile

# Or run with appropriate permissions
```

## Integration Patterns

### CI/CD Integration

Integrate make tools into your CI pipeline:

**.github/workflows/ci.yml:**

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run linting
        run: make lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: make test

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build project
        run: make build
```

### Pre-commit Hook

Run make lint before committing:

**.husky/pre-commit:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run linting
make lint || exit 1
```

### MCP Configuration

Configure make tools in `.mcp-devtools.json`:

```json
{
  "tools": {
    "make": {
      "enabled": true,
      "defaultParallel": 4,
      "timeout": 300000
    }
  },
  "workflows": {
    "pre-commit": ["make_lint"],
    "pre-push": ["make_test", "make_build"]
  }
}
```

## Best Practices

1. **Use Parallel Jobs** - Speed up builds with `-j` flag (be cautious with I/O-heavy tasks)
2. **Define Standard Targets** - Use conventional target names (lint, test, build, clean)
3. **Add Help Target** - Include a `help` target listing all available targets
4. **Handle Failures Gracefully** - Make tools provide intelligent suggestions on failure
5. **Set Timeouts** - Prevent hanging builds with appropriate timeout values (default: 5 minutes)

## Makefile Best Practices

### Standard Target Structure

```makefile
.PHONY: help lint test build clean depend

help:  ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

lint:  ## Run linting checks
	npm run lint
	npm run lint:md
	npm run lint:yaml

test:  ## Run test suite
	npm test

build:  ## Build the project
	npm run build

clean:  ## Remove build artifacts
	rm -rf dist/ coverage/ .nyc_output/

depend:  ## Install dependencies
	npm install

.DEFAULT_GOAL := help
```

### Parallel-Safe Targets

```makefile
.PHONY: test-all

# Targets can run in parallel
test-unit test-integration test-e2e: install
	npm run $@

# Aggregate target
test-all: test-unit test-integration test-e2e
```

## Performance Considerations

- **Parallel Execution**: `-j4` can reduce build times by 2-4x
- **Target Dependencies**: Properly defined dependencies prevent redundant work
- **Timeout**: Default 5-minute timeout; adjust for long-running builds
- **Caching**: Make tools don't cache results (use native Make caching)

## Related Tools

- [**test-tools**](/tools/test-tools) - Framework-specific test execution
- [**lint-tools**](/tools/lint-tools) - Language-specific linting tools
- [**git-tools**](/tools/git-tools) - Git workflow integration
- [**smart-suggestions**](/tools/smart-suggestions) - AI-powered failure analysis

## External Resources

- [GNU Make Manual](https://www.gnu.org/software/make/manual/)
- [Make Best Practices](https://makefiletutorial.com/)
- [Managing Projects with GNU Make](http://oreilly.com/catalog/make3/book/)
