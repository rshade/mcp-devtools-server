# Onboarding Tools

Automated project setup wizard for MCP DevTools configuration with intelligent project detection, validation, and rollback capabilities.

## Overview

Onboarding tools provide a guided setup experience for new projects, automatically detecting project characteristics, generating optimal configurations, and validating the complete setup. These tools help teams get started quickly with MCP DevTools while ensuring correct configuration.

Key features:
- **Automatic Project Detection** - Identifies language, framework, and build system
- **Configuration Generation** - Creates optimized `.mcp-devtools.json` config
- **Setup Validation** - Verifies tool availability and configuration correctness
- **Backup & Rollback** - Safe configuration changes with automatic backups
- **Interactive Mode** - Optional guided wizard for custom configuration

## Available Tools

### onboarding_wizard

Run the complete onboarding wizard to set up MCP DevTools.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory (defaults to current directory) |
| `interactive` | boolean | No | Enable interactive mode for custom configuration |
| `autoInstall` | boolean | No | Automatically install missing dependencies |
| `generateConfig` | boolean | No | Generate `.mcp-devtools.json` (default: true) |
| `validateSetup` | boolean | No | Validate setup after configuration (default: true) |
| `backupExisting` | boolean | No | Backup existing config before changes (default: true) |
| `dryRun` | boolean | No | Preview changes without writing files |
| `skipToolVerification` | boolean | No | Skip checking if tools are installed |

**Returns:**

```typescript
{
  success: boolean;
  message: string;
  profile: ProjectProfile;
  configPath?: string;
  backupPath?: string;
  validation?: ValidationResult;
  steps: StepResult[];
}
```

### detect_project

Analyze project characteristics and detect project type, language, and framework.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory to analyze |

**Returns:**

```typescript
{
  success: boolean;
  projectType: string;
  language: string;
  framework?: string;
  buildSystem: string;
  hasTests: boolean;
  testFramework?: string;
  lintingTools: string[];
  configFiles: string[];
  makeTargets?: string[];
  packageManager?: string;
}
```

### generate_config

Generate configuration preview without writing to file.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory to analyze |

**Returns:**

```typescript
{
  success: boolean;
  config: MCPDevToolsConfig;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}
```

### validate_setup

Validate existing MCP DevTools setup and configuration.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory to validate |
| `configPath` | string | No | Path to config file (default: `.mcp-devtools.json`) |

**Returns:**

```typescript
{
  success: boolean;
  validations: ValidationCheck[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  recommendations: string[];
  score: number;
}
```

### rollback_setup

Rollback to a previous configuration backup.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `backupPath` | string | Yes | Path to backup file to restore |
| `directory` | string | No | Working directory |

**Returns:**

```typescript
{
  success: boolean;
  message: string;
  error?: string;
}
```

## Usage Examples

### Quick Start Onboarding

Run the wizard with default settings:

```json
{
  "tool": "onboarding_wizard",
  "arguments": {}
}
```

This will:
1. Detect project characteristics
2. Generate `.mcp-devtools.json` configuration
3. Validate the setup
4. Backup existing configuration if present

### Interactive Setup

Run wizard in interactive mode for custom configuration:

```json
{
  "tool": "onboarding_wizard",
  "arguments": {
    "interactive": true
  }
}
```

### Dry Run Preview

Preview changes without modifying files:

```json
{
  "tool": "onboarding_wizard",
  "arguments": {
    "dryRun": true
  }
}
```

**Example Output:**

```
Onboarding Wizard (Dry Run)
===========================

Detected:
- Project Type: Node.js
- Language: TypeScript
- Framework: Express
- Build System: npm
- Test Framework: Jest
- Linting: ESLint, markdownlint

Generated Configuration:
{
  "version": "1.0",
  "tools": {
    "lint": { "enabled": true },
    "test": { "enabled": true, "coverage": true },
    "build": { "enabled": true }
  }
}

No files would be modified (dry run mode)
```

### Detect Project Only

Analyze project without generating configuration:

```json
{
  "tool": "detect_project",
  "arguments": {}
}
```

**Example Output:**

```json
{
  "success": true,
  "projectType": "NodeJS",
  "language": "TypeScript",
  "framework": "Express",
  "buildSystem": "npm",
  "hasTests": true,
  "testFramework": "jest",
  "lintingTools": ["eslint", "markdownlint"],
  "configFiles": [
    "package.json",
    "tsconfig.json",
    ".eslintrc.json",
    "jest.config.js"
  ],
  "packageManager": "npm"
}
```

### Generate Config Preview

Preview configuration without writing:

```json
{
  "tool": "generate_config",
  "arguments": {}
}
```

**Example Output:**

```json
{
  "success": true,
  "config": {
    "version": "1.0",
    "project": {
      "type": "nodejs",
      "language": "typescript"
    },
    "tools": {
      "lint": {
        "enabled": true,
        "runners": ["eslint", "markdownlint"]
      },
      "test": {
        "enabled": true,
        "runner": "jest",
        "coverage": true
      }
    }
  },
  "validation": {
    "valid": true,
    "errors": [],
    "warnings": ["Consider enabling yamllint for YAML validation"]
  }
}
```

### Validate Existing Setup

Check current configuration:

```json
{
  "tool": "validate_setup",
  "arguments": {}
}
```

**Example Output:**

```json
{
  "success": true,
  "validations": [
    {
      "category": "tools",
      "item": "eslint",
      "status": "pass",
      "message": "ESLint is installed and configured"
    },
    {
      "category": "tools",
      "item": "jest",
      "status": "pass",
      "message": "Jest is installed and configured"
    }
  ],
  "errors": [],
  "warnings": [
    {
      "category": "configuration",
      "message": "markdownlint not configured",
      "severity": "warning"
    }
  ],
  "recommendations": [
    "Add markdownlint to lint markdown files",
    "Consider enabling coverage thresholds in Jest"
  ],
  "score": 85
}
```

### Custom Config Path

Validate specific configuration file:

```json
{
  "tool": "validate_setup",
  "arguments": {
    "configPath": "config/.mcp-devtools.json"
  }
}
```

### Rollback Configuration

Restore previous configuration:

```json
{
  "tool": "rollback_setup",
  "arguments": {
    "backupPath": ".mcp-devtools.json.backup-2024-01-15-120000"
  }
}
```

### Skip Tool Verification

Generate config without checking if tools are installed:

```json
{
  "tool": "onboarding_wizard",
  "arguments": {
    "skipToolVerification": true
  }
}
```

Useful for:
- Generating config in CI environments
- Planning setup before installing tools
- Docker builds where tools are added later

## Common Issues and Solutions

### Project Type Not Detected

**Issue:** "Could not detect project type"

**Solution:**
- Ensure key files exist (package.json, go.mod, Cargo.toml, etc.)
- Check if you're in the correct directory
- Use `directory` parameter to specify project root
- Verify project follows standard structure

### Configuration Already Exists

**Issue:** "Configuration file already exists"

**Solution:**

The wizard automatically backs up existing configuration. To force regeneration:

```json
{
  "tool": "onboarding_wizard",
  "arguments": {
    "backupExisting": true
  }
}
```

### Validation Failures

**Issue:** Validation score is low or has errors

**Solution:**
1. Check validation errors: `validate_setup`
2. Install missing tools
3. Fix configuration issues
4. Re-run validation

**Example:**

```bash
# Install missing tools
npm install --save-dev eslint jest

# Validate again
# Should show improved score
```

### Missing Dependencies

**Issue:** "Tool not found" or "command not found"

**Solution with auto-install:**

```json
{
  "tool": "onboarding_wizard",
  "arguments": {
    "autoInstall": true
  }
}
```

**Manual solution:**

```bash
# Node.js
npm install

# Python
pip install -r requirements.txt

# Go
go mod download
```

### Backup File Conflicts

**Issue:** Multiple backup files exist

**Solution:**

Backups are timestamped (`.mcp-devtools.json.backup-YYYY-MM-DD-HHMMSS`). To clean up:

```bash
# List backups
ls -la .mcp-devtools.json.backup-*

# Remove old backups
rm .mcp-devtools.json.backup-2024-01-*
```

## Integration Patterns

### CI/CD Integration

Validate setup in CI pipeline:

**.github/workflows/ci.yml:**

```yaml
name: CI
on: [push, pull_request]

jobs:
  validate-setup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install MCP DevTools
        run: npm install -g mcp-devtools-server

      - name: Validate setup
        run: |
          mcp-devtools validate-setup
```

### New Project Onboarding

Add onboarding to project initialization:

**scripts/init-project.sh:**

```bash
#!/bin/bash

# Clone or create project
git clone <repo-url> my-project
cd my-project

# Install dependencies
npm install

# Run MCP DevTools onboarding
npx mcp-devtools onboarding-wizard

# Verify setup
npx mcp-devtools validate-setup
```

### Docker Setup

Include onboarding in Docker builds:

**Dockerfile:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Run onboarding (skip tool verification in container)
RUN npx mcp-devtools onboarding-wizard --skipToolVerification

# Build project
RUN npm run build
```

### Team Standardization

Create team-wide configuration template:

**.mcp-devtools.template.json:**

```json
{
  "version": "1.0",
  "project": {
    "type": "nodejs",
    "language": "typescript"
  },
  "tools": {
    "lint": {
      "enabled": true,
      "runners": ["eslint", "markdownlint", "yamllint"]
    },
    "test": {
      "enabled": true,
      "coverage": true,
      "threshold": 80
    }
  }
}
```

**Setup script:**

```bash
#!/bin/bash
# setup-team-config.sh

# Copy template
cp .mcp-devtools.template.json .mcp-devtools.json

# Detect project-specific settings
mcp-devtools detect-project

# Validate
mcp-devtools validate-setup
```

## Best Practices

1. **Run Early** - Set up MCP DevTools when starting a new project
2. **Validate Regularly** - Check setup health periodically
3. **Keep Backups** - Don't delete backup files immediately
4. **Team Consistency** - Use same configuration across team
5. **Version Control** - Commit `.mcp-devtools.json` to git
6. **Document Customizations** - Add comments explaining non-standard settings
7. **Update Dependencies** - Keep tool versions current

### Configuration Best Practices

```json
{
  "version": "1.0",
  "project": {
    "type": "nodejs",
    "language": "typescript",
    "name": "my-project"
  },
  "tools": {
    "lint": {
      "enabled": true,
      "autoFix": true,
      "runners": ["eslint", "markdownlint"]
    },
    "test": {
      "enabled": true,
      "runner": "jest",
      "coverage": true,
      "threshold": 80
    },
    "build": {
      "enabled": true,
      "parallel": true
    }
  },
  "workflows": {
    "pre-commit": ["lint"],
    "pre-push": ["test", "build"]
  },
  "cache": {
    "enabled": true,
    "ttl": 300
  }
}
```

## Performance Considerations

- **Project Detection**: First run may take 1-2 seconds for file scanning
- **Config Generation**: Typically completes in <100ms
- **Validation**: Depends on number of tools to verify (1-5 seconds)
- **Backup**: File copy is nearly instantaneous
- **Rollback**: Restores configuration in <50ms

### Optimization Tips

1. **Skip Verification**: Use `skipToolVerification: true` in CI
2. **Dry Run First**: Preview changes before applying
3. **Cache Detection**: Project detection results are cached
4. **Parallel Validation**: Tools are validated concurrently

## Validation Scoring

The validation system scores your setup out of 100:

| Score | Rating | Description |
|-------|--------|-------------|
| 90-100 | Excellent | All tools configured and working |
| 75-89 | Good | Minor warnings, mostly functional |
| 60-74 | Fair | Some missing tools or config issues |
| 40-59 | Poor | Significant issues requiring attention |
| 0-39 | Critical | Major problems, setup not functional |

## Related Tools

- [**lint-tools**](/tools/lint-tools) - Linting configuration and execution
- [**test-tools**](/tools/test-tools) - Test setup and execution
- [**make-tools**](/tools/make-tools) - Makefile integration
- [**smart-suggestions**](/tools/smart-suggestions) - Setup recommendations

## External Resources

- [MCP DevTools Configuration Schema](https://github.com/rshade/mcp-devtools-server/blob/main/.mcp-devtools.schema.json)
- [Project Detection Logic](https://github.com/rshade/mcp-devtools-server/blob/main/src/utils/project-detector.ts)
- [Configuration Examples](https://github.com/rshade/mcp-devtools-server/tree/main/examples)
