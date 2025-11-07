# Project-Specific Claude Code Configuration

## Custom Slash Commands

### Implementation Agents

#### /implement-python-tool [issue-number]

Launches a Haiku-powered agent to implement Python tools from Epic #131.

**Usage:**
```bash
/implement-python-tool 132
```

This implements the tool specified in GitHub issue #132 (python_project_info) following the Go tools pattern with cache optimization built in.

**What it does:**
1. Reads the GitHub issue
2. Studies Go tools patterns and cache implementation
3. Implements the tool with caching
4. Creates comprehensive tests (85-90%+ coverage)
5. Integrates with index.ts and shell-executor.ts
6. Runs quality gates (make lint, make test, make build)
7. Updates documentation
8. Generates PR_MESSAGE.md

**Agent Details:**
- **Model:** Haiku (cost-efficient, 95% cheaper than Sonnet)
- **Pattern:** Follows Go tools architecture exactly
- **Caching:** Required from the start, not optional
- **Quality:** Enforces 85-90%+ test coverage
- **Timeline:** 1.5-3 hours per tool

**Available Issues:**
- Phase 1 (Core): #132-137
- Phase 2 (Advanced): #138-141
- Phase 3 (Specialized): #142-144

See `.claude/agents/python-implementation.md` for the full agent implementation guide.

## Custom Agents

### python-implementation

Specialized agent for implementing Python language support tools.

**Location:** `.claude/agents/python-implementation.md`

**Purpose:** Autonomously implement Python tools following established patterns with cache optimization, comprehensive testing, and quality gate enforcement.

**Key Features:**
- 7-phase implementation workflow
- Cache optimization patterns (TTL: 5min to 2hr based on operation expense)
- Test isolation with CacheManager.resetInstance()
- Quality gate enforcement (lint, test, build)
- Documentation generation

## Python Tool Implementation Epic

**Epic #131:** Python Language Support with Modern Tooling

All 13 Python tool issues include cache optimization from the start:

| Phase | Issues | Tools |
|-------|--------|-------|
| 1 - Core | #132-137 | project_info, test, lint/format, check_types, install_deps, version |
| 2 - Advanced | #138-141 | security, build, venv, benchmark |
| 3 - Specialized | #142-144 | update_deps, compatibility, profile |

Each tool follows:
- Go tools pattern (src/tools/go-tools.ts)
- Cache manager integration (src/utils/cache-manager.ts)
- File-based invalidation (ChecksumTracker)
- 85-90%+ test coverage target

## Cost Savings

Using Haiku for implementation:
- Per tool: $0.10-0.25 (vs $2-5 with Sonnet)
- 13 tools: $1.30-3.25 total (vs $26-65 with Sonnet)
- **Savings: ~95% while maintaining quality**

#### /quick-fix [issue-number]

Launches a Haiku-powered agent for fast bug fixes and minor improvements.

**Model:** Haiku (cost-efficient)
**Best for:** Simple fixes (<1 hour), linting errors, test failures, docs
**Timeline:** 30-60 minutes

**Usage:**
```bash
/quick-fix 145
```

**What it does:**
1. Analyzes issue scope
2. Implements targeted fix (<50 lines)
3. Adds/updates tests
4. Runs quality gates
5. Generates commit message

### Issue Management Agents

#### /triage-issues [filter]

Launches a Haiku-powered agent to categorize and prioritize GitHub issues.

**Model:** Haiku (cost-efficient)
**Filters:** all (default), unlabeled, stale, P1
**Timeline:** 5-10 minutes per issue

**Usage:**
```bash
/triage-issues unlabeled
```

**What it does:**
1. Lists issues based on filter
2. Analyzes each issue
3. Assigns labels and priorities
4. Links related issues
5. Generates triage report

### Review and Fix Agents

#### /review-pr [pr-number] [--fix]

Launches a Sonnet-powered agent for comprehensive code review.

**Model:** Sonnet (deep reasoning)
**Timeline:** 30-60 minutes for review, +30-60 for fixes
**Dimensions:** Correctness, Security, Performance, Maintainability, Best Practices

**Usage:**
```bash
/review-pr 42           # Review only
/review-pr 42 --fix     # Review + implement fixes
```

**What it does:**
1. Gathers PR context (diff, files, checks)
2. Analyzes across 5 dimensions
3. Categorizes issues by severity
4. Generates comprehensive review
5. Implements fixes (if --fix flag)
6. Runs quality gates

## Custom Agents Summary

| Agent | Model | Cost | Use Case | Timeline |
|-------|-------|------|----------|----------|
| python-implementation | Haiku | $ | Implement Python tools | 1.5-3 hours |
| quick-fix | Haiku | $ | Fast bug fixes | 30-60 min |
| issue-triage | Haiku | $ | Categorize issues | 5-10 min/issue |
| code-review-fix | Sonnet | $$$ | Deep code review | 30-60 min + fixes |

**Cost Guide:**
- $ = Haiku (~$0.10-0.25 per task)
- $$$ = Sonnet (~$2-5 per task)

## Quick Start

**Implement a Python tool:**
```bash
/implement-python-tool 132
```

**Triage open issues:**
```bash
/triage-issues unlabeled
```

**Quick bug fix:**
```bash
/quick-fix 145
```

**Review a PR:**
```bash
/review-pr 42
```

**Review and fix a PR:**
```bash
/review-pr 42 --fix
```
