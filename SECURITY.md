# Security Policy

## Supported Versions

We release security updates for the following versions:

| Version | Supported          | Status                    |
| ------- | ------------------ | ------------------------- |
| 1.x.x   | :white_check_mark: | Active development        |
| < 1.0   | :x:                | No longer supported       |

## Reporting a Vulnerability

The MCP DevTools Server team takes security vulnerabilities seriously. We appreciate your efforts
to responsibly disclose your findings.

### How to Report

**Please DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report security issues through one of these channels:

1. **GitHub Security Advisories (Preferred):**
   - Navigate to [Security Advisories](https://github.com/rshade/mcp-devtools-server/security/advisories/new)
   - Click "New draft security advisory"
   - Fill out the form with vulnerability details

2. **Email:**
   - Send details to the project maintainers via GitHub
   - Use GPG encryption if possible (key available on request)

### What to Include

Please include the following information in your report:

- **Description:** Clear description of the vulnerability
- **Impact:** What could an attacker accomplish?
- **Affected versions:** Which versions are affected?
- **Reproduction steps:** Step-by-step instructions to reproduce
- **Proof of concept:** Code or commands demonstrating the issue
- **Suggested fix:** If you have ideas for remediation
- **Disclosure timeline:** Your preferred disclosure timeline

### Example Report

```text
Title: Command Injection in ShellExecutor

Description:
The ShellExecutor class does not properly sanitize arguments containing
shell metacharacters, allowing arbitrary command execution.

Impact:
An attacker could execute arbitrary system commands by passing specially
crafted arguments through the make_lint tool.

Affected Versions:
1.0.0 - 1.2.3

Reproduction Steps:
1. Call make_lint with args: ["'; rm -rf /; #"]
2. Observe that rm command executes

Proof of Concept:
await callTool('make_lint', { args: ["'; malicious_command; #"] });

Suggested Fix:
Implement stricter input validation using allowlist approach
```

## Response Timeline

We are committed to responding promptly to security reports:

- **Initial Response:** Within 48 hours of report
- **Status Updates:** Every 7 days until resolution
- **Fix Development:** Depends on severity (see below)
- **Public Disclosure:** After fix is released and deployed

### Severity Levels

| Severity | Response Time | Fix Timeline      |
| -------- | ------------- | ----------------- |
| Critical | < 24 hours    | 1-3 days          |
| High     | < 48 hours    | 1-2 weeks         |
| Medium   | < 72 hours    | 2-4 weeks         |
| Low      | < 1 week      | Best effort basis |

## Security Update Process

When a security vulnerability is confirmed:

1. **Acknowledgment:** We acknowledge receipt and validate the issue
2. **Assessment:** We assess severity and impact
3. **Fix Development:** We develop and test a fix
4. **Security Advisory:** We prepare a security advisory (if warranted)
5. **Patch Release:** We release a patch version
6. **Public Disclosure:** We publish the advisory after users can update
7. **Credit:** We credit the reporter (unless they prefer anonymity)

## Security Best Practices

The MCP DevTools Server implements multiple security layers:

### Command Execution Security

- **Allowlist Validation:** All commands validated against `ALLOWED_COMMANDS`
- **Argument Sanitization:** Shell metacharacters blocked or escaped
- **Path Validation:** Working directories restricted to project boundaries
- **Timeout Protection:** All operations have configurable timeouts
- **No Shell Expansion:** Direct execution without shell interpretation where possible

### Input Validation

- **Schema Validation:** All tool inputs validated using Zod schemas
- **Type Safety:** TypeScript strict mode enforces type correctness
- **Boundary Checks:** File paths, patterns, and arguments validated

### Secure Defaults

- **Minimal Permissions:** Run with least privilege necessary
- **Read-Only by Default:** Write operations require explicit flags
- **Safe Configuration:** Secure defaults in all configuration options
- **No Credential Storage:** Never store or log sensitive credentials

## Known Security Considerations

### Shell Command Execution

The core purpose of this server is executing shell commands on behalf of AI assistants. This inherently carries risk:

- **Mitigation:** Strict allowlist of permitted commands
- **Mitigation:** Argument validation and sanitization
- **Mitigation:** Working directory restrictions
- **User Responsibility:** Users must trust the AI assistant they're using
- **User Responsibility:** Review commands before execution in sensitive environments

### File System Access

The server can read and write files within project boundaries:

- **Mitigation:** Path traversal prevention
- **Mitigation:** Working directory validation
- **Mitigation:** Binary file detection and handling
- **User Responsibility:** Run server in appropriate directory context

### Dependency Security

We maintain secure dependencies through:

- **Automated Scanning:** GitHub Dependabot alerts
- **Regular Audits:** `npm audit` in CI/CD pipeline
- **Snyk Integration:** Additional vulnerability scanning
- **Rapid Updates:** Security patches applied within 48 hours

## Disclosure Policy

### Coordinated Disclosure

We follow responsible disclosure practices:

- **Private Notification:** Security issues disclosed privately first
- **Fix First:** We develop and release fixes before public disclosure
- **User Protection:** We give users time to update before public details
- **Credit:** We acknowledge security researchers appropriately

### Public Disclosure Timeline

- **Day 0:** Vulnerability reported privately
- **Day 1-2:** Initial response and acknowledgment
- **Day 3-14:** Fix development and testing
- **Day 15:** Patch release
- **Day 22:** Public advisory (7 days after patch)

We may adjust this timeline based on:

- Severity of the vulnerability
- Complexity of the fix
- Coordination with other projects
- Active exploitation in the wild

## Security Enhancements Roadmap

We are continuously improving security:

### Planned Enhancements

- **Audit Logging:** Log all command executions for review
- **Resource Limits:** CPU, memory, and I/O restrictions
- **Secrets Detection:** Prevent credential leakage in logs
- **Sandboxing:** Container-based isolation options
- **RBAC:** Role-based access control for enterprise deployments

### Security Testing

- **Static Analysis:** Regular SAST scans
- **Dependency Scanning:** Automated vulnerability detection
- **Penetration Testing:** Periodic security assessments
- **Fuzzing:** Input fuzzing for edge cases

## Security Contact

For security-related questions or concerns:

- **GitHub Security:** [Report Advisory](https://github.com/rshade/mcp-devtools-server/security/advisories/new)
- **General Questions:** [GitHub Discussions](https://github.com/rshade/mcp-devtools-server/discussions)

## Recognition

We maintain a [Security Hall of Fame](https://github.com/rshade/mcp-devtools-server/security/advisories)
to recognize security researchers who help improve the project's security.

Thank you for helping keep MCP DevTools Server secure!

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [TypeScript Security](https://www.typescriptlang.org/docs/handbook/security.html)

---

**Last Updated:** 2025-11-03
**Version:** 1.0
