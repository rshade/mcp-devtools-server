# Smart Suggestions

AI-powered command analysis and failure pattern recognition with intelligent recommendations.

## Overview

The Smart Suggestions system provides AI-powered analysis of command execution results, automatically detecting failure patterns and generating actionable recommendations. It combines multiple analysis engines including failure pattern matching, contextual awareness, and MCP server recommendations.

## Available Tools

### analyze_command

Execute a command with intelligent failure analysis and smart suggestions.

**Parameters:**

- `command` (required): Command to execute and analyze
- `args` (optional): Additional command arguments
- `directory` (optional): Working directory for command execution
- `timeout` (optional): Command timeout in milliseconds
- `context` (optional): Additional context for better suggestions
  - `tool`: The tool being used (e.g., "go test", "npm test")
  - `language`: Programming language (e.g., "go", "javascript", "python")
  - `projectType`: Project type (e.g., "go", "nodejs", "python")

**Returns:**

```json
{
  "success": true/false,
  "command": "command that was executed",
  "executionResult": {
    "stdout": "...",
    "stderr": "...",
    "exitCode": 0,
    "duration": 1234
  },
  "analysis": {
    "failureDetected": true/false,
    "patterns": [...],
    "errorType": "build|test|lint|dependency|...",
    "errorSummary": "Human-readable summary",
    "affectedFiles": ["file1.go", "file2.go"],
    "suggestedActions": ["action1", "action2"],
    "confidence": 0.85
  },
  "suggestions": [
    {
      "title": "Suggestion title",
      "description": "Detailed description",
      "actions": ["step1", "step2"],
      "priority": "high|medium|low",
      "category": "security|performance|test|...",
      "confidence": 0.9,
      "relatedFiles": ["file.go"]
    }
  ],
  "summary": "Failure Analysis: ... | Matched 2 pattern(s) | Confidence: 85%",
  "duration": 1500
}
```

**Usage Examples:**

```bash
# Analyze a failing test command
analyze_command({
  "command": "go test",
  "args": ["./..."],
  "context": {
    "language": "go",
    "projectType": "go"
  }
})

# Analyze a build with custom timeout
analyze_command({
  "command": "npm run build",
  "timeout": 60000,
  "context": {
    "language": "javascript",
    "projectType": "nodejs"
  }
})
```

**Features:**

- **Intelligent Caching**: Results are cached for 5 minutes to improve performance on repeated executions
- **Pattern Matching**: Matches against 15+ built-in failure patterns across categories:
  - Build errors (missing dependencies, compilation failures)
  - Test failures (race conditions, assertion failures)
  - Security issues (data races, vulnerabilities)
  - Performance issues (timeouts, slowness)
  - Configuration issues (missing env vars, invalid config)
- **Context-Aware**: Provides language and project-specific suggestions
- **Confidence Scoring**: Each suggestion includes a confidence score (0.0-1.0)
- **File Detection**: Automatically extracts affected file paths from error output

### analyze_result

Analyze an already-executed command result without re-running it.

**Parameters:**

- `command` (required): Command that was executed
- `exitCode` (required): Exit code from command execution
- `stdout` (optional): Standard output from command
- `stderr` (optional): Standard error from command
- `duration` (optional): Execution duration in milliseconds
- `context` (optional): Additional context (same as analyze_command)

**Returns:**

Same analysis structure as `analyze_command` but without `executionResult`.

**Usage Examples:**

```bash
# Analyze a pre-executed command
analyze_result({
  "command": "npm test",
  "exitCode": 1,
  "stderr": "Test failed: expected 2 but got 3",
  "context": {
    "language": "javascript",
    "projectType": "nodejs"
  }
})

# Analyze historical failures
analyze_result({
  "command": "go build",
  "exitCode": 2,
  "stdout": "",
  "stderr": "undefined: missing import",
  "duration": 2340
})
```

**Use Cases:**

- Post-mortem analysis of failed builds from CI/CD logs
- Analyzing command history without re-execution
- Batch analysis of multiple command results
- Integration with external monitoring systems

### get_knowledge_base_stats

Get statistics about the failure pattern knowledge base.

**Parameters:**

- `category` (optional): Filter by category (security, performance, test, build, etc.)

**Returns:**

```json
{
  "totalPatterns": 15,
  "byCategory": {
    "build": 4,
    "test": 5,
    "security": 3,
    "performance": 2,
    "general": 1
  }
}
```

**Usage Examples:**

```bash
# Get all pattern statistics
get_knowledge_base_stats({})

# Get security-specific patterns
get_knowledge_base_stats({
  "category": "security"
})
```

**Built-in Pattern Categories:**

- **Build**: Missing dependencies, undefined references, compilation errors
- **Test**: Test failures, race conditions, timeout issues
- **Security**: Data races, security vulnerabilities, unsafe practices
- **Performance**: Slow execution, memory issues, bottlenecks
- **Dependency**: Package resolution failures, version conflicts
- **Configuration**: Missing environment variables, invalid config files
- **Lint**: Code style violations, static analysis warnings

### recommend_mcp_servers

Get intelligent MCP server recommendations based on project context.

**Parameters:**

- `category` (optional): Filter by category (development, testing, documentation, ai, database, filesystem, web, productivity)
- `priority` (optional): Filter by priority level (high, medium, low)
- `useCase` (optional): Specific use case (e.g., "testing", "database", "API")
- `includeConfig` (optional): Include .mcp.json configuration example (default: false)

**Returns:**

```json
{
  "recommendations": [
    {
      "name": "Sequential Thinking",
      "package": "@modelcontextprotocol/server-sequential-thinking",
      "description": "Advanced reasoning and problem-solving...",
      "useCases": ["Complex problem solving", "..."],
      "benefits": ["Better reasoning", "..."],
      "configExample": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
      },
      "priority": "high",
      "categories": ["ai", "development", "productivity"]
    }
  ],
  "totalRecommendations": 3,
  "mcpConfig": {
    "mcpServers": {
      "sequential-thinking": {...},
      "context7": {...}
    }
  }
}
```

**Usage Examples:**

```bash
# Get contextual recommendations for current project
recommend_mcp_servers({})

# Get testing-focused recommendations with config
recommend_mcp_servers({
  "category": "testing",
  "includeConfig": true
})

# Get high-priority recommendations
recommend_mcp_servers({
  "priority": "high"
})

# Get recommendations for specific use case
recommend_mcp_servers({
  "useCase": "database"
})
```

**Recommended MCP Servers:**

1. **Sequential Thinking** (High Priority)
   - Advanced reasoning through structured thinking
   - Use cases: Complex problem solving, architecture decisions, code review
   - Categories: AI, Development, Productivity

2. **Context7** (High Priority)
   - Up-to-date library and framework documentation
   - Use cases: Learning new libraries, API documentation, best practices
   - Categories: Documentation, Development

3. **Git** (High Priority)
   - Advanced Git operations and repository analysis
   - Use cases: History analysis, branch management, code review
   - Categories: Development, Productivity

4. **Playwright** (Medium Priority)
   - Browser automation and E2E testing
   - Use cases: Web testing, UI testing, cross-browser testing
   - Categories: Testing, Web

5. **PostgreSQL** (Medium Priority)
   - Direct PostgreSQL database access
   - Use cases: Schema exploration, query development, data analysis
   - Categories: Database, Development

6. **Memory** (Medium Priority)
   - Persistent knowledge graph
   - Use cases: Project knowledge retention, context building
   - Categories: Productivity, AI

7. **Filesystem** (Medium Priority)
   - Enhanced file system operations
   - Use cases: Bulk operations, pattern matching, file organization
   - Categories: FileSystem, Development

8. **Fetch** (Medium Priority)
   - HTTP request capabilities
   - Use cases: API testing, web development, data collection
   - Categories: Web, Development

9. **SQLite** (Low Priority)
   - SQLite database operations
   - Use cases: Local data storage, prototyping, testing
   - Categories: Database, Development

### get_performance_metrics

Get performance metrics for the smart suggestions system and caching.

**Parameters:**

- `namespace` (optional): Specific cache namespace to query (e.g., "smartSuggestions", "projectDetection")

**Returns:**

```json
{
  "cache": {
    "enabled": true,
    "namespaces": [
      {
        "namespace": "smartSuggestions",
        "hits": 42,
        "misses": 15,
        "hitRate": 0.737,
        "size": 8,
        "maxSize": 100,
        "memoryMB": 0.5
      }
    ],
    "totalMemoryMB": 1.2
  },
  "patterns": {
    "totalPatterns": 15,
    "byCategory": {...}
  },
  "overall": {
    "cacheEffectiveness": "Good",
    "recommendations": [
      "Cache performance is optimal. No action needed."
    ]
  }
}
```

**Usage Examples:**

```bash
# Get all performance metrics
get_performance_metrics({})

# Get metrics for specific namespace
get_performance_metrics({
  "namespace": "smartSuggestions"
})
```

**Cache Effectiveness Ratings:**

- **Excellent**: >80% hit rate - Cache is working very well
- **Good**: 60-80% hit rate - Cache is effective
- **Fair**: 40-60% hit rate - Cache may need tuning
- **Poor**: 20-40% hit rate - Review cache configuration
- **No data yet**: <20% hit rate or insufficient samples

## Architecture

The Smart Suggestions system consists of four main components:

### 1. Failure Analyzer

**File**: `src/utils/failure-analyzer.ts`

Analyzes command execution results to detect failure patterns.

**Responsibilities:**

- Pattern matching against known failure types
- Error type classification (build, test, lint, security, etc.)
- File path extraction from error messages
- Confidence scoring
- Trend analysis across multiple executions

**Built-in Error Types:**

- `BuildError`: Compilation and build failures
- `TestFailure`: Test execution failures
- `LintIssue`: Code style violations
- `DependencyIssue`: Package resolution problems
- `ConfigurationIssue`: Configuration errors
- `SecurityIssue`: Security vulnerabilities
- `PerformanceIssue`: Performance problems
- `RuntimeError`: Runtime execution errors
- `Unknown`: Unclassified errors

### 2. Knowledge Base

**File**: `src/utils/knowledge-base.ts`

Database of failure patterns with regex matching and suggestions.

**Pattern Structure:**

```typescript
{
  name: "Go Test Failures",
  pattern: /FAIL|--- FAIL:/,
  category: "test",
  severity: "high",
  context: "Go tests have failed",
  suggestions: [
    "Run with -v for verbose output",
    "Use -run <TestName> to isolate failures"
  ]
}
```

**Features:**

- 15+ built-in patterns
- Multi-category matching
- Severity-based prioritization
- Regex-based pattern detection
- Contextual suggestions

### 3. Suggestion Engine

**File**: `src/utils/suggestion-engine.ts`

Core engine that generates intelligent suggestions.

**Responsibilities:**

- Orchestrates failure analysis and pattern matching
- Generates context-aware suggestions based on project type
- Provides workflow optimization recommendations
- Implements intelligent caching (5-minute TTL)
- Prioritizes suggestions by severity and confidence

**Context-Aware Features:**

- **Go Projects**: Test debugging tips, race detection flags
- **Node.js Projects**: Dependency resolution, npm cache clearing
- **Security Issues**: Secrets management best practices
- **Workflow Optimization**: Pre-commit hooks, CI/CD integration

### 4. MCP Recommendations

**File**: `src/utils/mcp-recommendations.ts`

Curated catalog of MCP servers with contextual matching.

**Responsibilities:**

- Maintain MCP server catalog (9 servers)
- Generate contextual recommendations based on project
- Provide .mcp.json configuration examples
- Filter by category, priority, and use case

## Integration Patterns

### Basic Usage

```typescript
import { SmartSuggestionsTools } from './tools/smart-suggestions-tools.js';

const tools = new SmartSuggestionsTools('/path/to/project');

// Execute and analyze
const result = await tools.analyzeCommand({
  command: 'go test',
  args: ['./...'],
  context: { language: 'go', projectType: 'go' }
});

if (!result.success) {
  for (const suggestion of result.suggestions) {
    console.log(`${suggestion.priority.toUpperCase()}: ${suggestion.title}`);
    console.log(`Actions: ${suggestion.actions.join(', ')}`);
  }
}
```

### Post-Mortem Analysis

```typescript
// Analyze CI/CD failure logs
const analysis = await tools.analyzeResult({
  command: 'npm run build',
  exitCode: 1,
  stderr: ciJobLog,
  context: { language: 'javascript' }
});

console.log(analysis.summary);
console.log('Affected files:', analysis.analysis.affectedFiles);
```

### MCP Server Setup

```typescript
// Get recommendations for current project
const recommendations = await tools.recommendMCPServers({
  includeConfig: true
});

// Write to .mcp.json
fs.writeFileSync(
  '.mcp.json',
  JSON.stringify(recommendations.mcpConfig, null, 2)
);
```

## Best Practices

### 1. Provide Context

Always provide context information for better suggestions:

```typescript
// Good - with context
analyzeCommand({
  command: 'npm test',
  context: {
    language: 'javascript',
    projectType: 'nodejs',
    tool: 'jest'
  }
});

// Less optimal - without context
analyzeCommand({ command: 'npm test' });
```

### 2. Handle High-Priority Suggestions

Focus on high-priority suggestions first:

```typescript
const highPriority = result.suggestions.filter(s => s.priority === 'high');
for (const suggestion of highPriority) {
  // Handle critical issues first
}
```

### 3. Check Confidence Scores

Consider confidence scores when acting on suggestions:

```typescript
const confidentSuggestions = result.suggestions.filter(s => s.confidence > 0.7);
// Higher confidence = more likely to be relevant
```

### 4. Use Caching Effectively

The system automatically caches results for 5 minutes. For long-running processes, monitor cache performance:

```typescript
const metrics = await tools.getPerformanceMetrics({});
console.log('Cache hit rate:', metrics.cache.namespaces[0].hitRate);
```

### 5. Trend Analysis

For recurring issues, analyze trends:

```typescript
const history = [result1, result2, result3];
const trends = failureAnalyzer.analyzeTrends(history);
if (trends.successRate < 0.5) {
  console.log('Low success rate - review recent changes');
}
```

## Common Issues

### Low Confidence Scores

**Problem**: Suggestions have low confidence (<0.5)

**Solutions**:

- Provide more context (language, projectType, tool)
- Check if error output is truncated or incomplete
- Verify command output contains recognizable patterns
- Consider that low confidence may indicate a novel issue

### Cache Miss Rate High

**Problem**: Cache hit rate is low (<30%)

**Solutions**:

- Normal for varied command outputs
- Smart suggestions are context-specific
- Consider increasing TTL if outputs are stable
- Check that cache keys include all relevant parameters

### Pattern Not Matching

**Problem**: Known failure pattern not detected

**Solutions**:

- Check pattern regex in knowledge base
- Verify error output contains expected keywords
- Consider adding custom pattern to knowledge base
- Use analyze_result to test pattern matching

### MCP Recommendations Not Relevant

**Problem**: Recommended servers don't match needs

**Solutions**:

- Use category filter: `category: "testing"`
- Use use case filter: `useCase: "database"`
- Provide better project context
- Check project detection: `detect_project()`

## Performance Considerations

### Caching Strategy

- **TTL**: 5 minutes for suggestions (balance freshness vs. performance)
- **Cache Key**: Includes command, exit code, output hash, and context
- **Memory**: Typically <2MB for suggestions cache
- **Hit Rate**: Expected 30-50% (normal for varied outputs)

### Pattern Matching

- **Patterns**: 15 built-in patterns (low overhead)
- **Regex**: Compiled patterns for fast matching
- **Categories**: All categories searched for comprehensive detection
- **Execution**: <50ms for pattern matching

### Analysis Time

Typical execution times:

- `analyze_command`: Command execution time + 50-100ms analysis
- `analyze_result`: 20-50ms (no command execution)
- `get_knowledge_base_stats`: <1ms (cached)
- `recommend_mcp_servers`: <5ms (in-memory lookup)
- `get_performance_metrics`: <2ms (cached stats)

## Future Enhancements

Planned improvements:

1. **Custom Patterns**: User-defined failure patterns
2. **Learning System**: Pattern effectiveness tracking
3. **Integration Hooks**: Webhook notifications for failures
4. **Historical Analysis**: Long-term trend analysis across sessions
5. **Auto-Remediation**: Automatic fix application for common issues
6. **Team Sharing**: Shared knowledge base across team members
