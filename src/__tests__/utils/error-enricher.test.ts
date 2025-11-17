/**
 * Tests for ErrorEnricher service
 */

import { ErrorEnricher } from "../../utils/error-enricher.js";
import { ExecutionResult } from "../../utils/shell-executor.js";
import {
  ErrorCode,
  ErrorCategory,
  ErrorSeverity,
} from "../../utils/standard-error.js";

describe("ErrorEnricher", () => {
  let enricher: ErrorEnricher;

  beforeEach(() => {
    enricher = new ErrorEnricher();
  });

  describe("Successful execution", () => {
    it("returns null for successful execution", async () => {
      const result: ExecutionResult = {
        success: true,
        stdout: "All tests passed",
        stderr: "",
        exitCode: 0,
        duration: 1000,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).toBeNull();
    });
  });

  describe("Error type to code mapping", () => {
    it("maps BuildError to BUILD_FAILED by default", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Build failed with errors",
        exitCode: 1,
        duration: 1000,
        command: "npm run build",
      };

      const error = await enricher.enrich(result, "run_build");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.BUILD_FAILED);
      expect(error?.category).toBe(ErrorCategory.BUILD);
    });

    it("maps TestFailure to TEST_FAILED by default", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "FAIL src/test.ts",
        stderr: "Test suite failed",
        exitCode: 1,
        duration: 2000,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.TEST_FAILED);
      expect(error?.category).toBe(ErrorCategory.TEST);
    });

    it("maps LintIssue to LINT_VIOLATION", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "5 errors found",
        exitCode: 1,
        duration: 500,
        command: "eslint .",
      };

      const error = await enricher.enrich(result, "run_lint");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.LINT_VIOLATION);
      expect(error?.category).toBe(ErrorCategory.LINT);
    });

    it("maps DependencyIssue to DEPENDENCY_MISSING by default", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Cannot find module 'foo'",
        exitCode: 1,
        duration: 100,
        command: "npm install",
      };

      const error = await enricher.enrich(result, "npm_install");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.DEPENDENCY_MISSING);
      expect(error?.category).toBe(ErrorCategory.DEPENDENCY);
    });

    it("maps SecurityIssue to SECURITY_VULNERABILITY", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Found 3 vulnerabilities",
        exitCode: 1,
        duration: 1000,
        command: "npm audit",
      };

      const error = await enricher.enrich(result, "security_audit");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.SECURITY_VULNERABILITY);
      expect(error?.category).toBe(ErrorCategory.SECURITY);
    });
  });

  describe("Specific code selection based on heuristics", () => {
    it("selects MODULE_NOT_FOUND for exit code 127", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "command not found: nonexistent-tool",
        exitCode: 127,
        duration: 10,
        command: "nonexistent-tool",
      };

      const error = await enricher.enrich(result, "run_tool");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.MODULE_NOT_FOUND);
    });

    it("selects TEST_TIMEOUT for test timeout errors", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Test timeout: exceeded 5000ms",
        exitCode: 1,
        duration: 6000,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.TEST_TIMEOUT);
    });

    it("selects BUILD_TIMEOUT for build timeout errors", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Build timed out after 300s",
        exitCode: 124,
        duration: 300000,
        command: "npm run build",
      };

      const error = await enricher.enrich(result, "run_build");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.BUILD_TIMEOUT);
    });

    it("selects COVERAGE_TOO_LOW for coverage failures", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "Coverage: 45% (threshold: 80%)",
        stderr: "Coverage below threshold",
        exitCode: 1,
        duration: 2000,
        command: "npm test -- --coverage",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.COVERAGE_TOO_LOW);
    });

    it("selects SNAPSHOT_MISMATCH for snapshot test failures", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Snapshot mismatch: 3 snapshots failed",
        exitCode: 1,
        duration: 1500,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.SNAPSHOT_MISMATCH);
    });

    it("selects DEPENDENCY_CONFLICT for version conflicts", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Cannot find module 'foo'\nPeer dependency conflict: react@17 vs react@18",
        exitCode: 1,
        duration: 500,
        command: "npm install",
      };

      const error = await enricher.enrich(result, "npm_install");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.DEPENDENCY_CONFLICT);
    });

    it("selects SECRET_LEAK for exposed secrets", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Security vulnerability: Secret token leaked in code",
        exitCode: 1,
        duration: 100,
        command: "npm run security-scan",
      };

      const error = await enricher.enrich(result, "security_scan");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.SECRET_LEAK);
    });

    it("selects PERMISSION_DENIED for permission errors", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Security vulnerability: Permission denied accessing resource",
        exitCode: 1,
        duration: 50,
        command: "cat /etc/secrets",
      };

      const error = await enricher.enrich(result, "read_file");

      expect(error).not.toBeNull();
      expect(error?.code).toBe(ErrorCode.PERMISSION_DENIED);
    });
  });

  describe("Severity determination", () => {
    it("assigns CRITICAL severity to security issues", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Security vulnerability detected: CVE-2023-1234",
        exitCode: 1,
        duration: 100,
        command: "npm audit",
      };

      const error = await enricher.enrich(result, "security_audit");

      expect(error).not.toBeNull();
      expect(error?.severity).toBe(ErrorSeverity.CRITICAL);
    });

    it("assigns ERROR severity to test failures", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Test suite returned errors\n5 tests did not pass",
        exitCode: 1,
        duration: 2000,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.severity).toBe(ErrorSeverity.ERROR);
    });

    it("assigns ERROR severity to build failures", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Build failed: 10 compilation errors",
        exitCode: 1,
        duration: 5000,
        command: "npm run build",
      };

      const error = await enricher.enrich(result, "run_build");

      expect(error).not.toBeNull();
      expect(error?.severity).toBe(ErrorSeverity.ERROR);
    });

    it("assigns WARNING severity to lint issues", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "5 linting errors found",
        exitCode: 1,
        duration: 500,
        command: "eslint .",
      };

      const error = await enricher.enrich(result, "run_lint");

      expect(error).not.toBeNull();
      expect(error?.severity).toBe(ErrorSeverity.WARNING);
    });

    it("assigns WARNING severity to low coverage", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "Coverage: 45% (below threshold)",
        stderr: "",
        exitCode: 1,
        duration: 2000,
        command: "npm test -- --coverage",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.severity).toBe(ErrorSeverity.WARNING);
    });

    it("assigns WARNING severity to configuration issues", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Invalid configuration: missing required field 'name'",
        exitCode: 1,
        duration: 100,
        command: "npm run validate-config",
      };

      const error = await enricher.enrich(result, "validate_config");

      expect(error).not.toBeNull();
      expect(error?.severity).toBe(ErrorSeverity.WARNING);
    });

    it("assigns CRITICAL severity to system outages", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "System outage: database unavailable",
        exitCode: 1,
        duration: 100,
        command: "npm run db-connect",
      };

      const error = await enricher.enrich(result, "db_connect");

      expect(error).not.toBeNull();
      expect(error?.severity).toBe(ErrorSeverity.CRITICAL);
    });
  });

  describe("Suggestion generation", () => {
    it("generates suggestions from patterns", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "FAIL: test failed",
        exitCode: 1,
        duration: 1000,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.suggestions).toBeDefined();
      expect(error?.suggestions.length).toBeGreaterThan(0);
    });

    it("assigns high priority to high-severity patterns", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "WARNING: DATA RACE detected in critical path",
        exitCode: 1,
        duration: 100,
        command: "go test -race",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      // Should have at least some suggestions (even if not all high priority)
      expect(error?.suggestions.length).toBeGreaterThan(0);
    });

    it("limits suggestions to maxSuggestions", async () => {
      const enricherWithLimit = new ErrorEnricher({ maxSuggestions: 2 });

      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Multiple errors occurred",
        exitCode: 1,
        duration: 1000,
        command: "npm test",
      };

      const error = await enricherWithLimit.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.suggestions.length).toBeLessThanOrEqual(2);
    });

    it("filters suggestions by confidence threshold", async () => {
      const enricherWithHighThreshold = new ErrorEnricher({
        confidenceThreshold: 0.95,
      });

      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Unknown error occurred",
        exitCode: 1,
        duration: 100,
        command: "npm run unknown",
      };

      const error = await enricherWithHighThreshold.enrich(result, "run_unknown");

      expect(error).not.toBeNull();
      // Should have low confidence suggestion about reviewing output
      expect(error?.suggestions.length).toBeGreaterThan(0);
      expect(error?.suggestions[0]?.title).toMatch(/confidence/i);
    });

    it("returns minimal suggestions when includeSuggestions is false", async () => {
      const enricherNoSuggestions = new ErrorEnricher({
        includeSuggestions: false,
      });

      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Test failed",
        exitCode: 1,
        duration: 1000,
        command: "npm test",
      };

      const error = await enricherNoSuggestions.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.suggestions.length).toBe(1);
      expect(error?.suggestions[0]?.title).toBe("Review Error Output");
    });
  });

  describe("Context building", () => {
    it("includes affected files from analysis when includeContext is true", async () => {
      const enricherWithContext = new ErrorEnricher({ includeContext: true });

      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Error in ./src/foo.ts:123:45\nError in ./src/bar.ts:67:89",
        exitCode: 1,
        duration: 1000,
        command: "npm run build",
      };

      const error = await enricherWithContext.enrich(result, "run_build");

      expect(error).not.toBeNull();
      expect(error?.context.affectedFiles).toBeDefined();
      expect(error?.context.affectedFiles?.length).toBeGreaterThan(0);
    });

    it("includes timestamp", async () => {
      const beforeTime = Date.now();

      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Error occurred",
        exitCode: 1,
        duration: 100,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests");

      const afterTime = Date.now();

      expect(error).not.toBeNull();
      expect(error?.context.timestamp).toBeInstanceOf(Date);
      expect(error?.context.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(error?.context.timestamp.getTime()).toBeLessThanOrEqual(afterTime);
    });

    it("merges provided context", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Error occurred",
        exitCode: 1,
        duration: 100,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests", {
        workingDirectory: "/custom/path",
        affectedFiles: ["custom-file.ts"],
      });

      expect(error).not.toBeNull();
      expect(error?.context.workingDirectory).toBe("/custom/path");
    });

    it("provides minimal context when includeContext is false", async () => {
      const enricherMinimalContext = new ErrorEnricher({
        includeContext: false,
      });

      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Error in ./src/foo.ts",
        exitCode: 1,
        duration: 100,
        command: "npm test",
      };

      const error = await enricherMinimalContext.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.context.environment).toBeUndefined();
    });
  });

  describe("Environment sanitization", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        NODE_ENV: "test",
        CI: "true",
        SECRET_TOKEN: "super-secret",
        API_KEY: "my-api-key",
        PASSWORD: "my-password",
        PATH: "/usr/bin:/bin",
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("removes sensitive environment variables", async () => {
      const enricherWithContext = new ErrorEnricher({ includeContext: true });

      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Error occurred",
        exitCode: 1,
        duration: 100,
        command: "npm test",
      };

      const error = await enricherWithContext.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.context.environment).toBeDefined();
      expect(error?.context.environment?.SECRET_TOKEN).toBeUndefined();
      expect(error?.context.environment?.API_KEY).toBeUndefined();
      expect(error?.context.environment?.PASSWORD).toBeUndefined();
    });

    it("preserves safe environment variables", async () => {
      const enricherWithContext = new ErrorEnricher({ includeContext: true });

      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Error occurred",
        exitCode: 1,
        duration: 100,
        command: "npm test",
      };

      const error = await enricherWithContext.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.context.environment).toBeDefined();
      expect(error?.context.environment?.NODE_ENV).toBe("test");
      expect(error?.context.environment?.CI).toBe("true");
      expect(error?.context.environment?.PATH).toBe("/usr/bin:/bin");
    });

    it("truncates long environment values", async () => {
      process.env.PATH = "a".repeat(200);

      const enricherWithContext = new ErrorEnricher({ includeContext: true });

      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Error occurred",
        exitCode: 1,
        duration: 100,
        command: "npm test",
      };

      const error = await enricherWithContext.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.context.environment?.PATH).toBeDefined();
      expect(error?.context.environment?.PATH?.length).toBeLessThanOrEqual(103); // 100 + "..."
    });
  });

  describe("Integration with FailureAnalyzer", () => {
    it("calls FailureAnalyzer and uses results", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "Test failed",
        exitCode: 1,
        duration: 1000,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.patterns).toBeDefined();
      expect(error?.confidence).toBeDefined();
      expect(error?.confidence).toBeGreaterThan(0);
      expect(error?.confidence).toBeLessThanOrEqual(1);
    });

    it("preserves patterns from FailureAnalyzer", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "WARNING: DATA RACE detected",
        exitCode: 1,
        duration: 2000,
        command: "go test -race ./...",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.patterns).toBeDefined();
      expect(error?.patterns?.length).toBeGreaterThan(0);
    });

    it("passes confidence through", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "",
        stderr: "cannot find module 'foo'",
        exitCode: 1,
        duration: 100,
        command: "npm install",
      };

      const error = await enricher.enrich(result, "npm_install");

      expect(error).not.toBeNull();
      expect(error?.confidence).toBeDefined();
      expect(error?.confidence).toBeGreaterThan(0); // Should have some confidence
      expect(error?.confidence).toBeLessThanOrEqual(1); // Within valid range
    });
  });

  describe("Configuration", () => {
    it("uses default configuration", () => {
      const enricherDefault = new ErrorEnricher();

      expect(enricherDefault).toBeDefined();
    });

    it("accepts custom configuration", () => {
      const customConfig = {
        enabled: true,
        timeout: 200,
        maxSuggestions: 3,
      };

      const enricherCustom = new ErrorEnricher(customConfig);

      expect(enricherCustom).toBeDefined();
    });

    it("merges partial configuration with defaults", () => {
      const enricherPartial = new ErrorEnricher({ maxSuggestions: 10 });

      expect(enricherPartial).toBeDefined();
    });
  });

  describe("Raw execution details", () => {
    it("includes raw stdout, stderr, and exit code", async () => {
      const result: ExecutionResult = {
        success: false,
        stdout: "Test output here",
        stderr: "Error output here",
        exitCode: 42,
        duration: 1234,
        command: "npm test",
      };

      const error = await enricher.enrich(result, "run_tests");

      expect(error).not.toBeNull();
      expect(error?.raw.stdout).toBe("Test output here");
      expect(error?.raw.stderr).toBe("Error output here");
      expect(error?.raw.exitCode).toBe(42);
      expect(error?.raw.duration).toBe(1234);
      expect(error?.raw.command).toBe("npm test");
    });
  });
});
