# Lint Tools

Multi-language linting support with automatic fixes, issue detection, and intelligent suggestions.

## Overview

Lint tools provide a unified interface for code quality checking across multiple languages and file types. These tools automatically detect appropriate linters based on project structure and provide actionable feedback when issues are found.

Supported linters:
- **ESLint** - JavaScript/TypeScript code quality and style
- **markdownlint** - Markdown documentation formatting
- **yamllint** - YAML file syntax and style (via js-yaml-cli)
- **commitlint** - Conventional commit message validation

## Available Tools

### markdownlint

Validate and fix Markdown documentation files.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the lint command |
| `files` | string[] | No | Specific files to lint (glob patterns supported) |
| `fix` | boolean | No | Automatically fix issues where possible |
| `args` | string[] | No | Additional arguments to pass to markdownlint |
| `severity` | enum | No | Minimum severity level: `error`, `warn`, or `info` |

**Returns:**

```typescript
{
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  tool: string;
  filesChecked: number;
  issuesFound: number;
  issuesFixed?: number;
  suggestions?: string[];
}
```

### yamllint

Validate YAML file syntax and formatting using js-yaml-cli.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the lint command |
| `files` | string[] | No | Specific files to lint (glob patterns supported) |
| `args` | string[] | No | Additional arguments to pass to js-yaml-cli |
| `severity` | enum | No | Minimum severity level: `error`, `warn`, or `info` |

**Note:** The `fix` parameter is not supported for YAML linting.

**Returns:** Same structure as `markdownlint`.

### commitlint

Validate commit messages against conventional commit format.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the lint command |
| `message` | string | No | Specific commit message to validate |
| `args` | string[] | No | Additional arguments to pass to commitlint |
| `severity` | enum | No | Minimum severity level: `error`, `warn`, or `info` |

**Note:** By default, validates the last commit (HEAD~1).

**Returns:** Same structure as `markdownlint`.

### eslint

Validate and fix JavaScript/TypeScript code quality and style.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the lint command |
| `files` | string[] | No | Specific files to lint (glob patterns supported) |
| `fix` | boolean | No | Automatically fix issues where possible |
| `args` | string[] | No | Additional arguments to pass to ESLint |
| `severity` | enum | No | Minimum severity level: `error`, `warn`, or `info` |

**File Extensions Checked:** `.js`, `.jsx`, `.ts`, `.tsx`, `.mjs`, `.cjs`

**Returns:** Same structure as `markdownlint`.

### lint_all

Run all available linters based on detected project type.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory for the lint command |
| `files` | string[] | No | Specific files to lint (glob patterns supported) |
| `fix` | boolean | No | Automatically fix issues where possible |
| `args` | string[] | No | Additional arguments to pass to linters |
| `severity` | enum | No | Minimum severity level: `error`, `warn`, or `info` |

**Returns:**

```typescript
{
  overallSuccess: boolean;
  results: LintResult[];
  totalIssues: number;
  totalFixed: number;
  recommendations: string[];
}
```

## Usage Examples

### Basic Markdown Linting

Check all Markdown files in the project:

```json
{
  "tool": "markdownlint",
  "arguments": {}
}
```

### Auto-fix Markdown Issues

Automatically fix formatting issues:

```json
{
  "tool": "markdownlint",
  "arguments": {
    "fix": true
  }
}
```

### Lint Specific Files

Check only specific Markdown files:

```json
{
  "tool": "markdownlint",
  "arguments": {
    "files": ["README.md", "docs/**/*.md"]
  }
}
```

### YAML Validation

Validate all YAML files (workflows, configs):

```json
{
  "tool": "yamllint",
  "arguments": {}
}
```

### Validate Commit Message

Check the last commit message:

```json
{
  "tool": "commitlint",
  "arguments": {}
}
```

### Validate Custom Message

Check a specific commit message:

```json
{
  "tool": "commitlint",
  "arguments": {
    "message": "feat(api): add user authentication"
  }
}
```

### ESLint with Auto-fix

Fix JavaScript/TypeScript code issues:

```json
{
  "tool": "eslint",
  "arguments": {
    "fix": true
  }
}
```

### Lint Specific JS Files

Check only source files:

```json
{
  "tool": "eslint",
  "arguments": {
    "files": ["src/**/*.ts", "!src/**/*.test.ts"]
  }
}
```

### Run All Linters

Execute all available linters:

```json
{
  "tool": "lint_all",
  "arguments": {
    "fix": true
  }
}
```

## Common Issues and Solutions

### Linter Not Installed

**Error:** "command not found" or "ENOENT"

**Solution:**

```bash
# Install markdownlint
npm install -g markdownlint-cli

# Install js-yaml-cli (for YAML linting)
npm install -g js-yaml-cli

# Install ESLint
npm install --save-dev eslint

# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

### No Configuration File

**Error:** "No ESLint configuration found"

**Solution for ESLint:**

```bash
# Initialize ESLint configuration
npx eslint --init

# Or create .eslintrc.json manually
{
  "extends": "eslint:recommended",
  "env": {
    "node": true,
    "es6": true
  }
}
```

**Solution for commitlint:**

Create `commitlint.config.js`:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional']
};
```

### Invalid Commit Message

**Error:** "subject may not be empty" or "type may not be empty"

**Solution:**

Use conventional commit format:

```bash
# Valid format
type(scope): description

# Examples
feat(auth): add user login
fix(api): handle null response
docs(readme): update installation guide

# Valid types
feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert
```

### Markdownlint Rules

**Error:** "MD033/no-inline-html"

**Solution:**

Create `.markdownlint.json` to customize rules:

```json
{
  "default": true,
  "MD033": false,
  "MD013": {
    "line_length": 120,
    "code_blocks": false
  }
}
```

### YAML Parsing Errors

**Error:** "bad indentation" or "unexpected token"

**Solution:**
- Use consistent indentation (2 or 4 spaces, not tabs)
- Validate YAML syntax with proper nesting
- Quote strings containing special characters

## Integration Patterns

### CI/CD Integration

Add linting to your CI pipeline:

**.github/workflows/ci.yml:**

```yaml
name: CI
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run ESLint
        run: npm run lint

      - name: Run markdownlint
        run: npm run lint:md

      - name: Run yamllint
        run: npm run lint:yaml

      - name: Validate commit message
        run: npx commitlint --from HEAD~1
```

### Pre-commit Hook

Lint files before committing:

**.husky/pre-commit:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Lint staged files
npx lint-staged

# Validate commit message format
npx commitlint --edit $1
```

**package.json:**

```json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": ["eslint --fix"],
    "*.md": ["markdownlint --fix"],
    "*.{yml,yaml}": ["js-yaml-cli"]
  }
}
```

### MCP Configuration

Configure linting in `.mcp-devtools.json`:

```json
{
  "tools": {
    "lint": {
      "enabled": true,
      "eslint": {
        "autoFix": true
      },
      "markdownlint": {
        "autoFix": true,
        "config": ".markdownlint.json"
      },
      "yamllint": {
        "enabled": true
      },
      "commitlint": {
        "extends": ["@commitlint/config-conventional"]
      }
    }
  }
}
```

### NPM Scripts

Add lint commands to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint src/**/*.{js,ts}",
    "lint:fix": "eslint src/**/*.{js,ts} --fix",
    "lint:md": "markdownlint '**/*.md' --ignore node_modules",
    "lint:md:fix": "markdownlint '**/*.md' --ignore node_modules --fix",
    "lint:yaml": "js-yaml-cli **/*.{yml,yaml}",
    "lint:all": "npm run lint && npm run lint:md && npm run lint:yaml"
  }
}
```

## Best Practices

1. **Run Linters Early** - Lint before committing with pre-commit hooks
2. **Auto-fix When Possible** - Use `fix: true` to automatically correct issues
3. **Configure Rules** - Customize linting rules for your project's needs
4. **Fail Fast in CI** - Set up CI to fail on linting errors
5. **Document Exceptions** - Use inline comments to disable rules when necessary
6. **Keep Config Consistent** - Share linting configurations across team
7. **Regular Updates** - Keep linter dependencies up to date

### ESLint Best Practices

```javascript
// Disable rule for specific line
// eslint-disable-next-line no-console
console.log('Allowed console.log');

// Disable rule for block
/* eslint-disable no-console */
console.log('Debug info');
console.error('Error info');
/* eslint-enable no-console */
```

### Markdownlint Best Practices

```markdown
<!-- markdownlint-disable MD033 -->
<div>HTML is allowed here</div>
<!-- markdownlint-enable MD033 -->
```

## Performance Considerations

- **File Discovery**: Glob patterns are cached by FileScanner (5-minute TTL)
- **Parallel Execution**: Linters run sequentially when using `lint_all`
- **Large Projects**: Use `files` parameter to lint specific directories
- **Auto-fix**: Adds ~20-50% overhead but saves manual correction time
- **Excluded Directories**: `node_modules`, `dist`, `build`, `.git`, `coverage` are automatically excluded

### Optimization Tips

1. **Incremental Linting**: Only lint changed files in CI
2. **Cached Results**: Consider caching linter output in CI
3. **Parallel CI Jobs**: Run different linters in parallel jobs
4. **IDE Integration**: Use IDE plugins for real-time linting

## Related Tools

- [**make-tools**](/tools/make-tools) - Execute `make lint` targets
- [**test-tools**](/tools/test-tools) - Run test suites
- [**actionlint-tools**](/tools/actionlint-tools) - GitHub Actions workflow validation
- [**smart-suggestions**](/tools/smart-suggestions) - AI-powered failure analysis

## External Resources

- [ESLint Documentation](https://eslint.org/docs/latest/)
- [markdownlint Rules](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [js-yaml-cli](https://www.npmjs.com/package/js-yaml-cli)
- [commitlint Documentation](https://commitlint.js.org/)
