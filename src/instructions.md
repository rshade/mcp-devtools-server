# mcp-devtools

Development tools MCP server: 50+ tools for make, linting, testing, Go, Node.js, Git workflows, analysis.

## Tool Usage Priority

ALWAYS prefer mcp-devtools tools over Bash for development tasks. Benefits: formatted output, error analysis,
caching, project awareness.

**Linting:** Use `make_lint`, `eslint`, `markdownlint`, `yamllint`, `actionlint`, `lint_all` instead of Bash
equivalents.

**Testing:** Use `make_test`, `run_tests`, `go_test`, `nodejs_test` instead of Bash.

**Building:** Use `make_build`, `go_build`, `nodejs_build` instead of Bash.

**Analysis:** Use `project_status`, `go_project_info`, `nodejs_project_info` instead of reading files manually.

**Environment:** Use `dotenv_environment` to load and analyze environment variables from .env files.

**Error Handling:** Use `analyze_command` to execute commands with automatic error analysis instead of raw Bash.

**Python:** Use `python_project_info`, `python_test`, `python_lint`, `python_format`, `python_check_types`,
`python_install_deps`, `python_version`, `python_security`, `python_build`, `python_venv`, `python_benchmark`,
`python_update_deps`, `python_compatibility`, and `python_profile` for Python workflows.

## Auto-Onboarding

On first interaction in a workspace, check for `.mcp-devtools.json`:

- If missing: Offer to run `onboarding_wizard` with `autoInstall: false, interactive: true`
- If exists: Proceed normally

## Common Workflows

**Before starting work:**

1. Run `project_status` for project overview and available tooling

**After code changes:**

1. Run `lint_all` to check all linters
2. Run `run_tests` to verify tests pass

**On command errors:**

- Use `analyze_command({command, args})` for execution + automatic analysis
- Or `analyze_result({command, exitCode, stderr})` for previous failures

**PR preparation:**

1. `code_review({base: "main"})` - Analyze for security, performance, maintainability
2. `generate_pr_message({type, scope})` - Generate conventional commit format

## Tool Categories

**Make/Build (5):** make_lint, make_test, make_build, make_clean, make_depend

**Linting (6):** markdownlint, yamllint, commitlint, eslint, actionlint, lint_all

**Testing (2):** run_tests, test_status

**Go (13):** go_test, go_build, go_fmt, go_lint, go_vet, go_mod_tidy, go_mod_download, staticcheck,
go_benchmark, go_generate, go_work, go_vulncheck, go_project_info

**Node.js (11):** nodejs_project_info, nodejs_test, nodejs_lint, nodejs_format, nodejs_check_types,
nodejs_install_deps, nodejs_version, nodejs_security, nodejs_build, nodejs_scripts, nodejs_benchmark

**Python (14):** python_project_info, python_test, python_lint, python_format, python_check_types,
python_install_deps, python_version, python_security, python_build, python_venv, python_benchmark,
python_update_deps, python_compatibility, python_profile

**Git (2):** code_review, generate_pr_message

**Smart Analysis (4):** analyze_command, analyze_result, get_knowledge_base_stats, recommend_mcp_servers

**File Validation (1):** ensure_newline

**Environment (1):** dotenv_environment

**Status (2):** project_status, test_status

**Onboarding (4):** onboarding_wizard, detect_project, generate_config, validate_setup

## Smart Suggestions

`analyze_command` and `analyze_result` provide AI-powered error analysis with pattern recognition,
context-aware suggestions, security detection, and actionable recommendations. Use when commands fail or
for proactive analysis.

## Quick Reference

| Task | Tool |
| ---- | ---- |
| Lint code | `lint_all` |
| Run tests | `run_tests` |
| Build project | `make_build` / `go_build` / `nodejs_build` |
| Check project | `project_status` |
| Setup project | `onboarding_wizard` |
| Analyze errors | `analyze_command` |
| Review code | `code_review` |
| Generate PR | `generate_pr_message` |
| Validate workflows | `actionlint` |
| Fix newlines | `ensure_newline` |
| Load env vars | `dotenv_environment` |
| Inspect Python project | `python_project_info` |
| Run pytest | `python_test` |
| Lint/format Python | `python_lint` / `python_format` |
| Type check Python | `python_check_types` |
| Security scan Python | `python_security` |
| Build/profile Python | `python_build` / `python_profile` |
