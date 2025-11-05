# Security Notes

Important security considerations when using MCP DevTools Server documentation.

## Known Development Dependencies

### esbuild Vulnerability (GHSA-67mh-4wv8-2f99)

**Status**: Known, Low Risk, Development Only

**Affected**: VitePress 1.6.4 → Vite 5.4.21 → esbuild 0.21.5

**Severity**: Moderate (CVSS 5.3)

**Description**: esbuild's development server allows any website to send requests to the dev server and read responses due to permissive CORS (`Access-Control-Allow-Origin: *`).

**Risk Assessment**:

- ✅ **Development only** - Does not affect production builds
- ✅ **Documentation only** - No sensitive code or credentials in docs
- ✅ **Local dev server** - Only runs on developer machines
- ✅ **Short-lived** - Dev server only runs during documentation editing
- ❌ **Not exploitable in production** - GitHub Pages serves static files

**Mitigation**:

1. **Do not expose dev server** - Never run `npm run docs:dev` on public networks
2. **Use localhost only** - Dev server binds to 127.0.0.1 by default
3. **Production builds are safe** - `npm run docs:build` generates static files with no vulnerability
4. **Upgrade when available** - VitePress 2.0 (currently alpha) uses Vite 7.x with esbuild 0.25+

**Exploitation Conditions** (All must be true):

1. Developer runs `npm run docs:dev`
2. Developer visits a malicious website while dev server is running
3. Malicious site sends requests to `http://localhost:5173`
4. Attacker gains access to documentation source files

**Why This Is Low Risk**:

- Documentation contains no secrets, API keys, or sensitive business logic
- Documentation is public on GitHub anyway
- Dev server is only used by contributors during editing
- Production deployment (GitHub Pages) is unaffected

**Future Resolution**:

This will be resolved when VitePress 2.0 is released (currently in alpha). We'll upgrade once it's stable.

## Best Practices for Contributors

When working on documentation:

1. **Close dev server when not editing** - Run `Ctrl+C` to stop `npm run docs:dev`
2. **Don't commit secrets** - No API keys, credentials, or sensitive data in docs
3. **Use firewall** - Ensure localhost is not exposed to networks
4. **Keep dependencies updated** - Run `npm audit` periodically

## Production Security

The deployed documentation site on GitHub Pages:

- ✅ Serves static HTML/CSS/JS only
- ✅ No backend or API endpoints
- ✅ No user data collection
- ✅ HTTPS enforced by GitHub Pages
- ✅ No cookies or tracking (unless analytics added in future)
- ✅ Content Security Policy headers from GitHub

## Reporting Security Issues

For security concerns with MCP DevTools Server itself (not documentation), see:

- [Security Policy](https://github.com/rshade/mcp-devtools-server/blob/main/SECURITY.md)
- [GitHub Security Advisories](https://github.com/rshade/mcp-devtools-server/security/advisories/new)

For documentation security concerns, please open a GitHub issue.

## Dependency Security

We monitor dependencies using:

- `npm audit` - Automated vulnerability scanning
- GitHub Dependabot - Automatic security updates
- Renovate Bot - Dependency updates

Current audit status: 3 moderate (development only, low risk)
