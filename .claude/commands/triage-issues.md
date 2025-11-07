Launch the Issue Triage Agent (Haiku) to categorize and prioritize GitHub issues.

Usage: /triage-issues [filter]

Filters:
- all: Triage all open issues (default)
- unlabeled: Only issues without labels
- stale: Issues inactive >90 days
- P1: Focus on high-priority issues

Example: /triage-issues unlabeled

---

Launch Issue Triage Agent with Haiku model to analyze and categorize GitHub issues.

Use the Task tool with:
- subagent_type: general-purpose
- model: haiku
- prompt: Follow the Issue Triage Agent guide

**Task:**

You are the Issue Triage Agent. Follow the guide at `.claude/agents/issue-triage.md` to:

1. **List issues** based on filter: {{FILTER:-all}}
   ```bash
   gh issue list --repo rshade/mcp-devtools-server --state open --limit 100
   ```

2. **Analyze each issue:**
   - Read full details with `gh issue view`
   - Check for duplicates
   - Assess priority (P0-P3)
   - Determine appropriate labels
   - Check if related to epics

3. **Apply updates:**
   - Add labels with `gh issue edit --add-label`
   - Set milestones
   - Comment with triage analysis
   - Link related issues
   - Mark stale issues

4. **Generate report:**
   - Issues processed count
   - Priority breakdown
   - Needs attention list
   - Recommended actions

**Success criteria:**
- All open issues have labels
- P0/P1 issues have milestones
- Duplicates are closed
- Report is comprehensive

Return triage report with actionable recommendations.
