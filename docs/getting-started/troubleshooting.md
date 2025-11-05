# Troubleshooting

Common issues and solutions for MCP DevTools Server.

## Tools Not Appearing in Claude Desktop

### Check Logs

View Claude Desktop logs:

- **macOS**: `~/Library/Logs/Claude/mcp*.log`
- **Windows**: `%APPDATA%\Claude\logs\mcp*.log`
- **Linux**: `~/.config/Claude/logs/mcp*.log`

### Verify Configuration

Ensure `claude_desktop_config.json` has valid JSON syntax:

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

### Restart Claude Desktop

1. Quit completely
2. Wait 5 seconds
3. Restart

## Command Timeouts

Increase timeout in `.mcp-devtools.json`:

```json
{
  "commandTimeout": 120000
}
```

## Permission Errors

Ensure tools are in system PATH:

```bash
echo $PATH
which go
which npm
```

::: tip
Coming Soon: Comprehensive troubleshooting guide
:::
