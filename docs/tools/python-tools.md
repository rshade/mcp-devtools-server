# Python Tools

Comprehensive Python development toolchain with 14 tools covering testing, linting, security, building, and profiling.

## Overview

The Python tools provide first-class support for modern Python development (2025 stack) with:

- **Modern tooling**: uv (ultra-fast package manager), ruff (unified linter/formatter), pyright (type checking)
- **Auto-detection**: Package manager, virtual environments, Python version
- **14 total tools**: 7 core development tools + 7 advanced/security tools
- **Smart suggestions**: Context-aware error messages and installation guidance
- **Caching**: 3-5x performance improvements with file-based invalidation

## Modern Python Stack

- **uv** - 10-100x faster package manager (replaces pip in most cases)
- **ruff** - All-in-one linter/formatter (replaces flake8, black, isort, pyupgrade)
- **pyright** - Static type checker (faster than mypy, better editor integration)
- **pytest** - Industry-standard testing framework with coverage and benchmarking

## Available Tools

### Core Development Tools (Phase 1)

#### python_project_info

Analyze Python project structure, dependencies, and configuration.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory (defaults to project root) |

**Returns:**

```typescript
{
  hasPyprojectToml: boolean;
  hasSetupPy: boolean;
  hasRequirementsTxt: boolean;
  pythonVersion?: string;
  pythonVersionInfo?: PythonVersionInfo;
  packageManager?: string;
  projectName?: string;
  projectVersion?: string;
  virtualEnv?: string;
  installedPackages?: number;
  hasTests: boolean;
  testFiles: string[];
  upgradeRecommendation?: string;
  dependencies: string[];
}
```

**Usage:**

```json
{
  "tool": "python_project_info",
  "arguments": {}
}
```

---

#### python_test

Run tests with pytest, supporting coverage, markers, and parallel execution.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `testPath` | string | No | Specific test file or directory |
| `pattern` | string | No | Test pattern using -k flag (e.g., "test_foo") |
| `coverage` | boolean | No | Enable coverage reporting |
| `verbose` | boolean | No | Enable verbose output |
| `markers` | string | No | Run tests matching mark expression (-m) |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout in milliseconds |

**Usage:**

```json
{
  "tool": "python_test",
  "arguments": {
    "coverage": true,
    "verbose": true
  }
}
```

---

#### python_lint

Lint Python code using ruff with auto-fix support.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `fix` | boolean | No | Automatically fix issues |
| `check` | boolean | No | Check only, don't modify files |
| `files` | string[] | No | Specific files to lint |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout in milliseconds |

**Usage:**

```json
{
  "tool": "python_lint",
  "arguments": {
    "fix": true
  }
}
```

---

#### python_format

Format Python code using ruff format.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `check` | boolean | No | Check without modifying |
| `files` | string[] | No | Specific files to format |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout in milliseconds |

**Usage:**

```json
{
  "tool": "python_format",
  "arguments": {
    "check": false
  }
}
```

---

#### python_check_types

Check Python types using pyright with strictness levels.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `files` | string[] | No | Specific files to check |
| `watch` | boolean | No | Watch mode |
| `verbose` | boolean | No | Enable verbose output |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout in milliseconds |

**Usage:**

```json
{
  "tool": "python_check_types",
  "arguments": {
    "verbose": true
  }
}
```

---

#### python_install_deps

Install dependencies using uv, poetry, pipenv, or pip (auto-detected).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `packageManager` | enum | No | Package manager (auto, uv, poetry, pipenv, pip) |
| `dev` | boolean | No | Install development dependencies |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout in milliseconds |

**Usage:**

```json
{
  "tool": "python_install_deps",
  "arguments": {
    "dev": true
  }
}
```

---

#### python_version

Get version information for Python tools with caching.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `tool` | enum | No | Tool to check (python, pip, uv, poetry, pyright, ruff, pytest, all) |

**Usage:**

```json
{
  "tool": "python_version",
  "arguments": {
    "tool": "all"
  }
}
```

---

### Advanced Tools (Phase 2 & 3)

#### python_security

Scan for vulnerabilities using bandit (code) and pip-audit (dependencies).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `tool` | enum | No | Security tool (bandit, pip-audit, both) - default: both |
| `severity` | enum | No | Minimum severity (low, medium, high, all) - default: all |
| `format` | enum | No | Output format (text, json, sarif) - default: text |
| `fix` | boolean | No | Fix vulnerabilities automatically |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout (default: 60000ms) |

**Usage:**

```json
{
  "tool": "python_security",
  "arguments": {
    "tool": "both",
    "severity": "high",
    "format": "json"
  }
}
```

---

#### python_build

Build Python packages (wheels and sdists) using modern `python -m build`.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `sdist` | boolean | No | Build source distribution (default: true) |
| `wheel` | boolean | No | Build wheel (default: true) |
| `outdir` | string | No | Output directory (default: dist/) |
| `noBuildIsolation` | boolean | No | Disable build isolation |
| `skipDependencyCheck` | boolean | No | Skip dependency checks |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout (default: 300000ms) |

**Usage:**

```json
{
  "tool": "python_build",
  "arguments": {
    "wheel": true,
    "sdist": false,
    "outdir": "dist/"
  }
}
```

---

#### python_venv

Manage Python virtual environments (create, delete, info, list).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `action` | enum | No | Action (create, delete, info, list) - default: info |
| `venvPath` | string | No | Path to virtual environment (default: .venv) |
| `python` | string | No | Python interpreter to use |
| `systemSitePackages` | boolean | No | Give access to system site-packages |
| `clear` | boolean | No | Delete venv contents if it exists |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout in milliseconds |

**Usage:**

```json
{
  "tool": "python_venv",
  "arguments": {
    "action": "create",
    "venvPath": ".venv"
  }
}
```

**Features:**
- Prefers `uv venv` (100x faster) with fallback to `python -m venv`
- Cross-platform support (Windows/Unix paths)
- Info action shows Python and pip paths

---

#### python_benchmark

Run performance benchmarks using pytest-benchmark.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `benchmarks` | string | No | Benchmark pattern (e.g., "test_benchmark_") |
| `compare` | string | No | Compare against saved baseline |
| `save` | string | No | Save results to baseline |
| `json` | boolean | No | Output results as JSON |
| `warmup` | number | No | Number of warmup iterations |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout (default: 300000ms) |

**Usage:**

```json
{
  "tool": "python_benchmark",
  "arguments": {
    "save": "baseline",
    "warmup": 5
  }
}
```

---

#### python_update_deps

Check for outdated packages and update dependencies safely.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `mode` | enum | No | Update mode (check, update-patch, update-minor, update-major) |
| `packages` | string[] | No | Specific packages to update |
| `dryRun` | boolean | No | Dry run mode (default: false) |
| `interactive` | boolean | No | Interactive mode |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout (default: 120000ms) |

**Usage:**

```json
{
  "tool": "python_update_deps",
  "arguments": {
    "mode": "check"
  }
}
```

---

#### python_compatibility

Check Python version compatibility using vermin and suggest syntax upgrades.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `targetVersion` | string | No | Target Python version (e.g., "3.9") |
| `suggest` | boolean | No | Suggest syntax upgrades with pyupgrade |
| `files` | string[] | No | Specific files to check |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout (default: 60000ms) |

**Usage:**

```json
{
  "tool": "python_compatibility",
  "arguments": {
    "targetVersion": "3.9",
    "suggest": true
  }
}
```

---

#### python_profile

Profile Python code performance using cProfile, py-spy, or memray.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `directory` | string | No | Working directory |
| `command` | string | **Yes** | Python script to profile |
| `profiler` | enum | No | Profiler (cprofile, pyspy, memray) - default: cprofile |
| `topN` | number | No | Show top N functions (default: 20) |
| `outputFile` | string | No | Save profile to file |
| `format` | enum | No | Output format (text, json, flamegraph) |
| `args` | string[] | No | Additional arguments |
| `timeout` | number | No | Command timeout (default: 300000ms) |

**Usage:**

```json
{
  "tool": "python_profile",
  "arguments": {
    "command": "script.py",
    "profiler": "cprofile",
    "topN": 10
  }
}
```

**Profilers:**
- **cProfile**: Built-in Python profiler (no installation required)
- **py-spy**: Sampling profiler with flamegraph support
- **memray**: Memory profiling and leak detection

---

## Common Workflows

### Development Workflow

```bash
# 1. Check project info
python_project_info

# 2. Install dependencies
python_install_deps { "dev": true }

# 3. Run tests with coverage
python_test { "coverage": true }

# 4. Lint and format code
python_lint { "fix": true }
python_format

# 5. Type check
python_check_types
```

### Security Audit

```bash
# Scan for vulnerabilities
python_security { "tool": "both", "severity": "all" }

# Fix pip-audit vulnerabilities
python_security { "tool": "pip-audit", "fix": true }
```

### Package Building

```bash
# Build wheel and sdist
python_build { "wheel": true, "sdist": true }

# Build wheel only (faster)
python_build { "wheel": true, "sdist": false }
```

### Performance Analysis

```bash
# Run benchmarks
python_benchmark { "save": "baseline" }

# Profile code
python_profile {
  "command": "main.py",
  "profiler": "cprofile",
  "topN": 20
}
```

## Error Handling

All Python tools provide:

- **Missing tool detection** with installation instructions
- **Version compatibility checks** with upgrade recommendations (Python ≤3.9)
- **Virtual environment guidance** when needed
- **Package manager detection** (uv → poetry → pipenv → pip)
- **Actionable suggestions** for common errors

## Tips

- **Use uv for speed**: 10-100x faster than pip for most operations
- **Python version**: Upgrade to Python 3.11+ for better performance and features
- **Virtual environments**: Always use virtual environments (`.venv`)
- **Ruff is fast**: Single tool replaces 4-5 legacy formatters/linters
- **Type checking**: pyright is faster than mypy with better IDE integration

## Related

- [Tools Overview](./overview.md) - Complete list of all available tools
- [Smart Suggestions](./smart-suggestions.md) - AI-powered error analysis
- [Onboarding Tools](./onboarding-tools.md) - Zero-config project setup
