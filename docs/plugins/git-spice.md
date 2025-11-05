# git-spice Plugin User Guide

Manage stacked Git branches efficiently with the git-spice plugin for MCP DevTools.

## Overview

**git-spice** is a tool for managing stacked Git branches, making it easy to create, manage, and submit stacks of related changes for code review.

- **Repository**: https://github.com/abhinav/git-spice
- **Documentation**: https://abhinav.github.io/git-spice/
- **Plugin Version**: 1.0.0

## Installation

### 1. Install git-spice CLI

**macOS (Homebrew)**:

```bash
brew install abhinav/tap/git-spice
```

**Linux/macOS (curl)**:

```bash
curl -fsSL https://abhinav.github.io/git-spice/install.sh | sh
```

**Go**:

```bash
go install go.abhg.dev/gs@latest
```

For other installation methods, see: https://abhinav.github.io/git-spice/install/

### 2. Initialize git-spice in your repository

```bash
cd your-project
gs repo init
```

### 3. Configure the plugin

Create or update `.mcp-devtools.json`:

```json
{
  "plugins": {
    "enabled": ["git-spice"],
    "git-spice": {
      "defaultBranch": "main",
      "autoRestack": false,
      "jsonOutput": true,
      "timeout": 60000
    }
  }
}
```

## Configuration

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultBranch` | string | `"main"` | Default base branch for stacks |
| `autoRestack` | boolean | `false` | Automatically restack on changes |
| `jsonOutput` | boolean | `true` | Use JSON output when available |
| `timeout` | number | `60000` | Command timeout in milliseconds |

## Available Tools

### 1. `git_spice_branch_create`

Create a new stacked branch.

**Parameters**:
- `name` (required): Branch name
- `message` (optional): Initial commit message
- `base` (optional): Base branch to stack on

**Examples**:

```typescript
// Simple branch creation
{
  "name": "feature/new-feature"
}

// With base branch
{
  "name": "feature/another",
  "base": "develop"
}

// With initial commit
{
  "name": "feature/documented",
  "message": "Initial implementation"
}
```

**CLI Equivalent**:
```bash
gs branch create [--base BASE] [--message MSG] NAME
```

### 2. `git_spice_branch_checkout`

Checkout an existing branch.

**Parameters**:
- `name` (required): Branch name to checkout

**Example**:

```typescript
{
  "name": "feature/existing"
}
```

**CLI Equivalent**:
```bash
gs branch checkout NAME
```

### 3. `git_spice_stack_submit`

Submit entire stack as pull requests.

**Parameters**:
- `draft` (optional): Create draft PRs
- `fill` (optional): Auto-fill PR templates

**Examples**:

```typescript
// Submit as regular PRs
{}

// Submit as draft PRs
{
  "draft": true
}

// Submit with auto-fill
{
  "fill": true
}
```

**CLI Equivalent**:
```bash
gs stack submit [--draft] [--fill]
```

### 4. `git_spice_stack_restack`

Rebase stack on latest changes.

**Parameters**: None

**Example**:

```typescript
{}
```

**CLI Equivalent**:
```bash
gs stack restack
```

### 5. `git_spice_log_short`

View current stack visualization.

**Parameters**: None

**Example**:

```typescript
{}
```

**CLI Equivalent**:
```bash
gs log short
```

**Output Example**:

```
* feature/third-change
│ * feature/second-change
│ │ * feature/first-change
│ │ └─ main
```

### 6. `git_spice_repo_sync`

Sync with remote and cleanup merged branches.

**Parameters**: None

**Example**:

```typescript
{}
```

**CLI Equivalent**:
```bash
gs repo sync
```

## Workflows

### Creating a Stack

1. **Create first branch**:
   ```typescript
   git_spice_branch_create({ name: "feature/part-1" })
   ```

2. **Make changes and commit**:
   ```bash
   # Make your changes
   git add .
   git commit -m "Implement part 1"
   ```

3. **Create second branch (stacked on first)**:
   ```typescript
   git_spice_branch_create({
     name: "feature/part-2",
     base: "feature/part-1"
   })
   ```

4. **Continue stacking**:
   - Make more changes
   - Create more branches
   - Build your stack

5. **View the stack**:
   ```typescript
   git_spice_log_short({})
   ```

6. **Submit all as PRs**:
   ```typescript
   git_spice_stack_submit({ draft: false })
   ```

### Updating a Stack

1. **Checkout the branch to update**:
   ```typescript
   git_spice_branch_checkout({ name: "feature/part-1" })
   ```

2. **Make changes**:
   ```bash
   # Make your changes
   git add .
   git commit -m "Address review feedback"
   ```

3. **Restack dependent branches**:
   ```typescript
   git_spice_stack_restack({})
   ```

### Syncing with Remote

After merging PRs, clean up:

```typescript
git_spice_repo_sync({})
```

This will:
- Fetch latest changes
- Delete merged branches
- Update local state

## Troubleshooting

### Error: "git-spice not initialized"

**Solution**:
```bash
cd your-project
gs repo init
```

### Error: "branch already exists"

**Solutions**:
- Choose a different name
- Or checkout the existing branch: `git_spice_branch_checkout`

### Error: "authentication failed"

**Solution**:
```bash
# Authenticate with GitHub CLI
gh auth login
```

### Error: "merge conflicts"

When restacking encounters conflicts:

1. Resolve conflicts manually
2. Continue restack:
   ```bash
   gs stack restack --continue
   ```
3. Or abort:
   ```bash
   gs stack restack --abort
   ```

### Error: "no remote repository"

**Solution**:
```bash
git remote add origin <url>
```

## Best Practices

### 1. Keep Stacks Small

- **3-5 branches** per stack is ideal
- Each branch should be a **logical unit of work**
- Makes review easier and reduces conflicts

### 2. Use Descriptive Names

```typescript
// Good
{ "name": "feature/add-user-authentication" }
{ "name": "refactor/extract-auth-service" }

// Avoid
{ "name": "feature/stuff" }
{ "name": "fix" }
```

### 3. Write Clear Commit Messages

```bash
# Good
git commit -m "Add JWT token validation

- Implement token verification middleware
- Add expiration checking
- Include tests for edge cases"

# Avoid
git commit -m "updates"
```

### 4. Sync Regularly

Run `git_spice_repo_sync` frequently to:
- Stay up-to-date with main branch
- Clean up merged branches
- Avoid large rebases

### 5. Submit Drafts First

When working on large features:

```typescript
git_spice_stack_submit({ draft: true })
```

Benefits:
- Get early feedback
- CI/CD runs
- Doesn't notify reviewers yet

## Integration with MCP

### Claude Desktop

The git-spice tools are automatically available in Claude Desktop when the MCP DevTools server is configured.

**Example conversation**:

```
User: "Create a new feature branch for adding authentication"

Claude: I'll create a new branch for you.
[Uses git_spice_branch_create with name "feature/add-authentication"]

User: "Now create another branch for the auth service"

Claude: I'll stack that on top of the authentication branch.
[Uses git_spice_branch_create with base "feature/add-authentication"]
```

### CI/CD

git-spice tools can be used in automated workflows:

```yaml
# .github/workflows/stack-check.yml
name: Stack Health Check

on: [push]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check stack status
        run: |
          # MCP DevTools would call git_spice_log_short
          gs log short
```

## FAQ

**Q: Can I use git-spice with GitLab?**
A: Yes! git-spice supports both GitHub and GitLab workflows.

**Q: What if I don't want to use stacked PRs?**
A: You can still use individual tools like `branch_create` for convenience.

**Q: Does this replace git?**
A: No, git-spice builds on top of Git. You can still use regular git commands.

**Q: Can I mix git-spice with regular branches?**
A: Yes! git-spice branches are normal Git branches. You can use both workflows.

**Q: How do I uninstall?**
A: Just disable the plugin in `.mcp-devtools.json` or uninstall the `gs` CLI.

## Additional Resources

- **Official Docs**: https://abhinav.github.io/git-spice/
- **GitHub**: https://github.com/abhinav/git-spice
- **Issues**: Report bugs to MCP DevTools or git-spice repos
- **Community**: GitHub Discussions on either repository

## See Also

- [Plugin Development Guide](../plugin-development.md)
- [MCP DevTools Documentation](../../README.md)
- [git-spice Quick Start](https://abhinav.github.io/git-spice/quickstart/)
