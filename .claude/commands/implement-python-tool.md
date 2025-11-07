Implement a Python tool using a specialized Haiku-powered agent.

Usage: /implement-python-tool [issue-number]

This command launches a cost-efficient Haiku agent that implements a single Python tool from the Epic #131 following established patterns with cache optimization.

**Example:**
```
/implement-python-tool 132
```

Implements python_project_info from issue #132.

---

Launch the Python implementation agent with Haiku model for issue #{{ISSUE_NUMBER}}.

Use the Task tool with:
- subagent_type: general-purpose
- model: haiku
- prompt: Detailed implementation instructions below

**Task for Agent:**

You are implementing Python tool support for MCP DevTools Server. Your mission: Implement the tool specified in GitHub issue #{{ISSUE_NUMBER}} following the exact Go tools pattern with cache optimization built in.

**Phase 1: Research (Read these files)**
1. Read issue: `gh issue view {{ISSUE_NUMBER}} --repo rshade/mcp-devtools-server`
2. Read Go tools reference: `src/tools/go-tools.ts` (focus on structure)
3. Read cache patterns: `src/utils/cache-manager.ts` and `CACHING.md`
4. Read test patterns: `src/__tests__/tools/go-tools.test.ts`

**Phase 2: Implementation**

Create `src/tools/python-tools.ts` (or add to existing) following this structure:

```typescript
import { z } from 'zod';
import { ShellExecutor } from '../utils/shell-executor.js';
import { CacheManager } from '../utils/cache-manager.js';
import * as crypto from 'crypto';

// 1. Define Zod schema from issue
const PythonXxxSchema = z.object({
  directory: z.string().optional(),
  // ... parameters from issue
});

type PythonXxxArgs = z.infer<typeof PythonXxxSchema>;

interface PythonToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class PythonTools {
  constructor(private shellExecutor: ShellExecutor) {}
  
  // 2. Main tool method WITH CACHING
  async pythonXxx(args: PythonXxxArgs): Promise<PythonToolResult> {
    const validated = PythonXxxSchema.parse(args);
    const directory = validated.directory || process.cwd();
    
    // CACHE CHECK (required, not optional!)
    const cacheKey = this.generateXxxCacheKey(directory, validated);
    const cached = await CacheManager.getInstance().get('python_tools', cacheKey);
    if (cached) return cached as PythonToolResult;
    
    // Build command incrementally
    const cmd = ['tool-name'];
    // ... add args
    
    // Execute
    const result = await this.shellExecutor.executeCommand(
      cmd.join(' '),
      directory,
      { timeout: 60000 }
    );
    
    // Parse
    const parsed = this.parseXxxOutput(result);
    
    // CACHE RESULT (use TTL from issue)
    if (parsed.success) {
      await CacheManager.getInstance().set('python_tools', cacheKey, parsed, TTL);
    }
    
    return parsed;
  }
  
  // 3. Cache key generator
  private generateXxxCacheKey(dir: string, args: PythonXxxArgs): string {
    const params = { /* all parameters */ };
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(params))
      .digest('hex')
      .substring(0, 16);
    return `python:xxx:${dir}:${hash}`;
  }
  
  // 4. Output parser
  private parseXxxOutput(result: any): PythonToolResult {
    // Parse stdout/stderr from issue examples
    return { success: result.exitCode === 0, data: {} };
  }
  
  // 5. Static validator
  static validatePythonXxx(args: unknown) {
    return PythonXxxSchema.safeParse(args);
  }
}
```

**Phase 3: Testing**

Create `src/__tests__/tools/python-tools.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { PythonTools } from '../../tools/python-tools.js';
import { CacheManager } from '../../utils/cache-manager.js';

describe('PythonTools - pythonXxx', () => {
  let pythonTools: PythonTools;
  let mockShellExecutor: any;
  
  beforeEach(() => {
    CacheManager.resetInstance(); // CRITICAL!
    mockShellExecutor = createMockShellExecutor();
    pythonTools = new PythonTools(mockShellExecutor);
  });
  
  // Test all requirements from issue
  it('executes successfully', async () => { /* ... */ });
  it('caches results', async () => { /* verify callCount === 1 */ });
  it('handles errors', async () => { /* ... */ });
  // ... more tests from issue
});
```

**Phase 4: Integration**

1. Update `src/index.ts` - add tool handler and list entry
2. Update `src/utils/shell-executor.ts` - add commands to ALLOWED_COMMANDS

**Phase 5: Validation**

Run quality gates:
```bash
make lint   # MUST PASS
make test   # MUST PASS with 85-90%+ coverage
make build  # MUST PASS
```

Fix all errors until gates pass.

**Phase 6: Documentation**

1. Add JSDoc comments
2. Update README.md with usage examples
3. Generate PR_MESSAGE.md

**Phase 7: Report**

Report back:
- ✅ Implementation complete with cache optimization
- ✅ Tests pass (X% coverage)
- ✅ All quality gates passed
- ✅ Documentation updated
- ✅ Ready for PR

**Critical Requirements:**
- MUST include cache optimization (not optional)
- MUST have 85-90%+ test coverage
- MUST pass all quality gates
- MUST use ShellExecutor (never direct exec)
- MUST include CacheManager.resetInstance() in tests

**Cache TTL from issues:**
- Quick ops: 300s (5min)
- Moderate: 300s-600s
- Expensive: 1800s-3600s (30-60min)
- Checks: 7200s (2hr)

Good luck! Focus on correctness and following the patterns exactly.
