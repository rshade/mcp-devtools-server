# Actionlint Tools

Validate GitHub Actions workflow files for syntax errors, parameter issues, and best practices.

## Overview

The `actionlint` tool validates GitHub Actions workflow files (`.github/workflows/*.yml`) to catch errors before pushing to GitHub. It checks:

- YAML syntax errors
- Action parameter validation
- Invalid workflow syntax
- shellcheck integration for `run:` blocks
- pyflakes support for Python scripts

## Available Tools

### actionlint

Validate GitHub Actions workflow files with comprehensive error checking.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory (defaults to project root) |
| `files` | string[] | No | Specific workflow files to lint (glob patterns supported) |
| `format` | enum | No | Output format: `default`, `json`, or `sarif` |
| `shellcheck` | boolean | No | Enable shellcheck integration (default: true) |
| `pyflakes` | boolean | No | Enable pyflakes for Python scripts (default: false) |
| `verbose` | boolean | No | Enable verbose output |
| `color` | boolean | No | Enable colored output |
| `noColor` | boolean | No | Disable colored output |
| `ignore` | string[] | No | Ignore rules by glob pattern |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout in milliseconds (default: 60000) |

**Returns:**

```typescript
{
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  command: string;
  filesChecked: number;
  issuesFound: number;
  suggestions?: string[];
}
```

## Usage Examples

### Basic Validation

Validate all workflow files in `.github/workflows/`:

```json
{
  "tool": "actionlint",
  "arguments": {}
}
```

### Validate Specific Files

Check only specific workflow files:

```json
{
  "tool": "actionlint",
  "arguments": {
    "files": [".github/workflows/ci.yml", ".github/workflows/release.yml"]
  }
}
```

### JSON Output Format

Get structured JSON output for programmatic processing:

```json
{
  "tool": "actionlint",
  "arguments": {
    "format": "json"
  }
}
```

### With shellcheck Integration

Validate shell scripts in `run:` blocks (enabled by default):

```json
{
  "tool": "actionlint",
  "arguments": {
    "shellcheck": true,
    "verbose": true
  }
}
```

### Disable shellcheck

Skip shellcheck validation for shell scripts:

```json
{
  "tool": "actionlint",
  "arguments": {
    "shellcheck": false
  }
}
```

### With Python Validation

Enable pyflakes for Python scripts in workflows:

```json
{
  "tool": "actionlint",
  "arguments": {
    "pyflakes": true
  }
}
```

### SARIF Output

Generate SARIF output for GitHub Code Scanning:

```json
{
  "tool": "actionlint",
  "arguments": {
    "format": "sarif"
  }
}
```

## Common Issues and Solutions

### No Workflow Files Found

**Error:** "No workflow files found"

**Solution:**
- Ensure workflow files exist in `.github/workflows/`
- Files must have `.yml` or `.yaml` extension
- Check that the directory parameter points to the correct location

### shellcheck Not Found

**Error:** "shellcheck command not found"

**Solution:**

```bash
# macOS
brew install shellcheck

# Ubuntu/Debian
sudo apt-get install shellcheck

# Or disable shellcheck
{
  "shellcheck": false
}
```

### pyflakes Not Found

**Error:** "pyflakes command not found"

**Solution:**

```bash
# Install pyflakes
pip install pyflakes

# Or omit pyflakes option (disabled by default)
```

## Integration Patterns

### CI/CD Integration

Add actionlint to your CI pipeline:

**.github/workflows/ci.yml:**

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint-workflows:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate workflows
        run: |
          npm install -g mcp-devtools-server
          mcp-devtools actionlint
```

### Pre-commit Hook

Validate workflows before committing:

**.husky/pre-commit:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Validate GitHub Actions workflows
mcp-devtools actionlint
```

### MCP Configuration

Configure actionlint in `.mcp-devtools.json`:

```json
{
  "tools": {
    "actionlint": {
      "enabled": true,
      "shellcheck": true,
      "pyflakes": false,
      "format": "default"
    }
  }
}
```

## Best Practices

1. **Run Early and Often** - Validate workflows before pushing to GitHub
2. **Enable shellcheck** - Catch shell script errors in `run:` blocks
3. **Use JSON Format** - For programmatic parsing and integration
4. **Check All Workflows** - Don't skip workflow files in subdirectories
5. **Fix Issues Immediately** - Don't let workflow errors accumulate

## Performance Considerations

- **File Discovery**: Glob patterns are resolved before validation
- **shellcheck Integration**: Adds ~100-500ms per workflow file with shell scripts
- **Timeout**: Default 60s timeout is usually sufficient for most projects
- **Caching**: Actionlint results are not cached (workflows change frequently)

## Related Tools

- [**lint-tools**](/tools/lint-tools) - General linting tools (ESLint, markdownlint)
- [**git-tools**](/tools/git-tools) - Git workflow and code review tools
- [**smart-suggestions**](/tools/smart-suggestions) - AI-powered failure analysis

## External Resources

- [actionlint Documentation](https://github.com/rhysd/actionlint)
- [GitHub Actions Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [shellcheck Documentation](https://www.shellcheck.net/)
