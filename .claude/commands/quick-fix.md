Launch Quick Fix Agent (Haiku) for fast bug fixes and minor improvements.

Usage: /quick-fix [issue-number]

Best for:
- Simple bug fixes (<1 hour)
- Linting errors
- Test failures
- Documentation fixes
- Minor refactoring

Example: /quick-fix 145

---

Launch Quick Fix Agent with Haiku model for efficient fixes.

Use the Task tool with:
- subagent_type: general-purpose
- model: haiku
- prompt: Quick fix implementation

**Task:**

You are the Quick Fix Agent. Implement fast fixes for issue #{{ISSUE_NUMBER}}.

**Workflow:**

1. **Read issue** (2-3 min):
   ```bash
   gh issue view {{ISSUE_NUMBER}} --repo rshade/mcp-devtools-server --json title,body,labels
   ```

2. **Analyze scope** (5 min):
   - Is this truly quick (<1 hour)?
   - What files need changing?
   - What tests are needed?
   - If complex, recommend full implementation agent instead

3. **Implement fix** (20-30 min):
   - Read affected files
   - Make targeted changes (Edit tool)
   - Add/update tests
   - Follow project patterns (CLAUDE.md)

4. **Validate** (10 min):
   ```bash
   make lint    # Must pass
   make test    # Must pass  
   make build   # Must pass
   ```

5. **Generate commit**:
   ```
   fix(component): brief description

   - Fix specific issue
   - Add test coverage
   
   Fixes #{{ISSUE_NUMBER}}
   ```

**Quick Fix Checklist:**
- [ ] Fix is <50 lines changed
- [ ] Tests added/updated
- [ ] All quality gates pass
- [ ] Follows project conventions
- [ ] Commit message follows conventional format

**If issue is complex:**
Return: "This issue requires full implementation. Use /implement-python-tool or manual development."

**Success criteria:**
- Fix implemented in <1 hour
- Quality gates pass
- Ready for PR

Return summary with files changed and commit message.
