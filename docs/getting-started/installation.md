# Installation

Get started with MCP DevTools Server in minutes.

## Prerequisites

Before installing, ensure you have:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Claude Desktop** (for MCP integration) or another MCP-compatible client

Check your versions:

```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

## Quick Install

The easiest way to use MCP DevTools Server is via `npx` - no installation required:

```bash
npx -y @rshade/mcp-devtools-server
```

This will:

1. Download the latest version
2. Start the MCP server
3. Wait for MCP client connections

## Claude Desktop Setup

### Step 1: Locate Configuration File

Find your Claude Desktop configuration file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Step 2: Add MCP Server Configuration

Edit the configuration file and add the MCP DevTools Server:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "npx",
      "args": ["-y", "@rshade/mcp-devtools-server"]
    }
  }
}
```

::: tip Multiple MCP Servers
You can configure multiple MCP servers. Each server needs a unique name (like "devtools").
:::

### Step 3: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Restart the application
3. Wait for MCP servers to initialize

### Step 4: Verify Installation

1. Open Claude Desktop
2. Start a new conversation
3. Look for available tools (the tool icon in the input area)
4. You should see 40+ tools from MCP DevTools Server:
   - `go_build`, `go_test`, `go_fmt`, etc.
   - `make_lint`, `make_test`, `make_build`, etc.
   - `lint_eslint`, `lint_markdownlint`, etc.
   - `analyze_command`, `recommend_mcp_servers`, etc.

::: details Troubleshooting: Tools Not Appearing

If tools don't appear:

1. Check Claude Desktop logs:
   - **macOS**: `~/Library/Logs/Claude/mcp*.log`
   - **Windows**: `%APPDATA%\Claude\logs\mcp*.log`
   - **Linux**: `~/.config/Claude/logs/mcp*.log`

2. Verify your configuration syntax (JSON must be valid)

3. Ensure Node.js is in your system PATH

4. Try running `npx @rshade/mcp-devtools-server` manually to check for errors

:::

## Project-Specific Installation

For projects that use MCP DevTools Server extensively, you can install it locally:

### Install as Dev Dependency

```bash
npm install --save-dev @rshade/mcp-devtools-server
```

### Update Claude Desktop Config

```json
{
  "mcpServers": {
    "devtools": {
      "command": "node",
      "args": ["./node_modules/@rshade/mcp-devtools-server/dist/index.js"],
      "cwd": "/absolute/path/to/your/project"
    }
  }
}
```

::: warning Working Directory
When using local installation, set `cwd` to your project's absolute path.
:::

## Alternative: Global Installation

Install globally for system-wide availability:

```bash
npm install -g @rshade/mcp-devtools-server
```

Update Claude Desktop config:

```json
{
  "mcpServers": {
    "devtools": {
      "command": "mcp-devtools-server"
    }
  }
}
```

## Configuration File

Create a `.mcp-devtools.json` file in your project root to customize behavior:

```json
{
  "lintTools": {
    "enabled": true,
    "eslint": {
      "enabled": true,
      "configFile": ".eslintrc.json"
    },
    "markdownlint": {
      "enabled": true,
      "configFile": ".markdownlint.json"
    }
  },
  "testTools": {
    "enabled": true,
    "defaultFramework": "jest"
  },
  "goTools": {
    "enabled": true,
    "testFlags": ["-v", "-race"],
    "buildFlags": ["-trimpath"]
  },
  "caching": {
    "enabled": true,
    "maxSize": 100,
    "ttl": 300000,
    "checkInterval": 60000
  }
}
```

::: tip Auto-Generate Configuration
Use the [Onboarding Wizard](/guides/onboarding-wizard) to automatically generate optimized configuration:

```bash
# In Claude Desktop
# Tool: onboarding_wizard
# Args: { "directory": ".", "dryRun": false }
```

:::

## Verification Checklist

After installation, verify everything works:

- [ ] Node.js version >= 18.0.0
- [ ] npm version >= 9.0.0
- [ ] Claude Desktop config file updated
- [ ] Claude Desktop restarted
- [ ] Tools appear in Claude Desktop
- [ ] Sample tool execution works (try `detect_project`)

## Next Steps

Now that you've installed MCP DevTools Server:

1. **[Quick Start Guide](/getting-started/quick-start)** - Run your first commands
2. **[Configuration Guide](/getting-started/configuration)** - Customize for your project
3. **[Onboarding Wizard](/guides/onboarding-wizard)** - Auto-configure your project
4. **[Tools Overview](/tools/overview)** - Explore all available tools

## Updating

### Update via npx

If using npx, you'll always get the latest version. No update needed!

### Update Local Installation

```bash
npm update @rshade/mcp-devtools-server
```

### Update Global Installation

```bash
npm update -g @rshade/mcp-devtools-server
```

### Check Current Version

```bash
npx @rshade/mcp-devtools-server --version
```

## Uninstallation

### Remove from Claude Desktop

Edit `claude_desktop_config.json` and remove the `devtools` entry:

```json
{
  "mcpServers": {
    // Remove or comment out:
    // "devtools": { ... }
  }
}
```

### Remove Local Installation

```bash
npm uninstall @rshade/mcp-devtools-server
```

### Remove Global Installation

```bash
npm uninstall -g @rshade/mcp-devtools-server
```

## System Requirements

### Supported Platforms

- **macOS** - 10.15 (Catalina) or later
- **Windows** - Windows 10 or later
- **Linux** - Ubuntu 20.04+, Debian 10+, Fedora 35+, or equivalent

### Supported Architectures

- **x64** (Intel/AMD 64-bit)
- **arm64** (Apple Silicon, ARM 64-bit)

### Required Tools (Optional)

MCP DevTools Server provides tools for various development workflows. Install what you need:

- **Go Development**: Go 1.19+ (`go version`)
- **Node.js Development**: npm/yarn/pnpm
- **Python Development**: Python 3.8+ (`python --version`)
- **Make Support**: GNU Make 3.8+ (`make --version`)
- **Git Support**: Git 2.25+ (`git --version`)
- **GitHub Actions**: actionlint (`actionlint -version`)

::: info Tool Detection
MCP DevTools Server automatically detects available tools. Missing tools simply won't have their features available - the server will still work for supported tools.
:::

## Getting Help

If you encounter issues:

1. Check [Troubleshooting Guide](/getting-started/troubleshooting)
2. Search [GitHub Issues](https://github.com/rshade/mcp-devtools-server/issues)
3. Open a [new issue](https://github.com/rshade/mcp-devtools-server/issues/new)
4. Join [GitHub Discussions](https://github.com/rshade/mcp-devtools-server/discussions)
