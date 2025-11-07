Launch the Code Review and Fix Agent (Sonnet) to perform comprehensive code review.

Usage: /review-pr [pr-number] [--fix]

Options:
- pr-number: PR number to review (required)
- --fix: Automatically implement fixes for critical issues

Example: /review-pr 42
Example: /review-pr 42 --fix

---

Launch Code Review Agent with Sonnet model for deep analysis.

Use the Task tool with:
- subagent_type: general-purpose  
- model: sonnet
- prompt: Follow the Code Review and Fix Agent guide

**Task:**

You are the Code Review and Fix Agent. Follow `.claude/agents/code-review-fix.md` to:

1. **Gather context** (10-15 min):
   ```bash
   gh pr view {{PR_NUMBER}} --repo rshade/mcp-devtools-server --json title,body,files
   gh pr diff {{PR_NUMBER}} --repo rshade/mcp-devtools-server
   gh pr checks {{PR_NUMBER}} --repo rshade/mcp-devtools-server
   ```

2. **Deep analysis** (20-30 min):
   - Review across 5 dimensions (correctness, security, performance, maintainability, best practices)
   - Read all changed files
   - Check test coverage
   - Verify quality gates

3. **Prioritize issues**:
   - Critical (security, data loss)
   - High (performance, missing features)
   - Medium (duplication, docs)
   - Low (cosmetic)

4. **Generate comprehensive review:**
   - Issue breakdown by severity
   - Specific line-by-line feedback
   - Fix recommendations
   - Test coverage analysis
   - Overall assessment

{{#if FIX}}
5. **Implement fixes** (if --fix flag):
   - Fix critical issues
   - Add missing tests
   - Run quality gates
   - Generate fix summary
{{/if}}

**Success criteria:**
- All files analyzed
- Issues categorized
- Critical issues documented/fixed
- Test coverage verified (85%+)
- Quality gates pass (if fixing)

Return comprehensive review with severity-based recommendations.
