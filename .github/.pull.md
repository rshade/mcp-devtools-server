# Pull Request

## Summary

<!-- Provide a brief summary of your changes -->

## Type of Change

<!-- Check the relevant boxes -->

- [ ] 🚀 **Go language enhancement** (highest priority)
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🧹 Code refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test coverage improvement
- [ ] 🔒 Security enhancement

## Related Issues

<!-- Link to related issues using "Fixes #123" or "Addresses #456" -->

- Fixes #
- Addresses #
- Related to #

## Changes Made

<!-- Describe the specific changes in detail -->

### New Features
- 

### Bug Fixes
- 

### Documentation
- 

### Tests
- 

## Go Language Support Impact

<!-- If this affects Go tooling, please describe the impact -->

- [ ] Adds new Go tool: `go_*`
- [ ] Improves existing Go tool functionality
- [ ] Updates Go-specific configuration options
- [ ] Enhances Go project detection
- [ ] Improves Go error handling and suggestions
- [ ] N/A - Does not affect Go support

## Testing

<!-- Describe the tests you ran and provide evidence of testing -->

### Automated Tests
- [ ] All existing tests pass
- [ ] Added new unit tests for changes
- [ ] Added integration tests
- [ ] Manual testing performed

### Manual Testing
```bash
# Commands used for manual testing:

```

### Test Results
<!-- Include relevant test output or screenshots -->

## Configuration Changes

<!-- If this changes configuration options or schemas -->

- [ ] Updated `.mcp-devtools.schema.json`
- [ ] Updated example configurations
- [ ] Documented new configuration options
- [ ] Backward compatible with existing configs

## Performance Impact

<!-- Describe any performance implications -->

- [ ] No performance impact
- [ ] Performance improvement (describe below)
- [ ] Potential performance regression (explain mitigation)

**Performance Details:**
<!-- Benchmark results, profiling data, etc. -->

## Security Considerations

- [ ] No security implications
- [ ] Security enhancement (describe below)
- [ ] Potential security impact (explain mitigation)

**Security Details:**
<!-- Explain any security-related changes -->

## Breaking Changes

<!-- List any breaking changes and migration steps -->

- [ ] No breaking changes
- [ ] Breaking changes (list below)

**Breaking Changes:**
1. 
2. 

**Migration Steps:**
1. 
2. 

## Documentation

- [ ] Updated README.md
- [ ] Updated CLAUDE.md
- [ ] Updated API documentation
- [ ] Added usage examples
- [ ] Updated configuration documentation

## Checklist

<!-- Ensure all items are completed before submitting -->

### Code Quality
- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Code is properly commented
- [ ] No debugging code left in
- [ ] Error handling is comprehensive

### Testing
- [ ] All tests pass locally
- [ ] Added tests for new functionality
- [ ] Tested on multiple platforms (if applicable)
- [ ] Edge cases are handled and tested

### Security
- [ ] No secrets or sensitive data in code
- [ ] Input validation is proper
- [ ] Security implications considered
- [ ] Following security best practices

### Documentation
- [ ] Code is self-documenting with clear variable/function names
- [ ] Complex logic is commented
- [ ] README updated if needed
- [ ] Examples provided for new features

### Go Support (if applicable)
- [ ] Go tools are properly allowlisted in shell-executor.ts
- [ ] Go-specific error handling implemented
- [ ] Works with both Go modules and GOPATH projects
- [ ] Proper Go version compatibility

## Additional Notes

<!-- Any additional information, context, or concerns -->

---

**Reviewer Guidelines:**
- Verify security implications of shell command changes
- Check for proper error handling and user experience
- Ensure documentation is updated appropriately
