import { describe, it, expect } from "@jest/globals";
import { SmartSuggestionsTools } from "../../tools/smart-suggestions-tools.js";
import { MCPCategory } from "../../utils/mcp-recommendations.js";

/**
 * Smart Suggestions Tools Tests
 *
 * This test suite focuses on validation and argument parsing
 * functionality to avoid timeouts from expensive initialization.
 *
 * Note: Full integration tests should be added in a separate file
 * with proper mocking of file system operations.
 */
describe("SmartSuggestionsTools - Validation", () => {
  describe("validateAnalyzeCommandArgs", () => {
    it("should validate valid arguments", () => {
      const args = {
        command: "echo",
        args: ["test"],
        directory: "/tmp",
        timeout: 5000,
      };

      const validated = SmartSuggestionsTools.validateAnalyzeCommandArgs(args);
      expect(validated.command).toBe("echo");
      expect(validated.args).toEqual(["test"]);
      expect(validated.directory).toBe("/tmp");
      expect(validated.timeout).toBe(5000);
    });

    it("should reject empty command", () => {
      const args = {
        command: "",
      };

      expect(() =>
        SmartSuggestionsTools.validateAnalyzeCommandArgs(args),
      ).toThrow();
    });

    it("should accept command with context", () => {
      const args = {
        command: "go test",
        context: {
          tool: "go",
          language: "go",
          projectType: "go",
        },
      };

      const validated = SmartSuggestionsTools.validateAnalyzeCommandArgs(args);
      expect(validated.context?.tool).toBe("go");
      expect(validated.context?.language).toBe("go");
    });

    it("should accept minimal arguments", () => {
      const args = {
        command: "echo",
      };

      const validated = SmartSuggestionsTools.validateAnalyzeCommandArgs(args);
      expect(validated.command).toBe("echo");
      expect(validated.args).toBeUndefined();
      expect(validated.directory).toBeUndefined();
    });
  });

  describe("validateAnalyzeResultArgs", () => {
    it("should validate successful result", () => {
      const args = {
        command: "npm test",
        exitCode: 0,
        stdout: "All tests passed",
        stderr: "",
        duration: 1000,
      };

      const validated = SmartSuggestionsTools.validateAnalyzeResultArgs(args);
      expect(validated.command).toBe("npm test");
      expect(validated.exitCode).toBe(0);
      expect(validated.stdout).toBe("All tests passed");
    });

    it("should validate failed result", () => {
      const args = {
        command: "go test",
        exitCode: 1,
        stderr: "FAIL: TestFoo",
        context: {
          tool: "go test",
          language: "go",
        },
      };

      const validated = SmartSuggestionsTools.validateAnalyzeResultArgs(args);
      expect(validated.command).toBe("go test");
      expect(validated.exitCode).toBe(1);
      expect(validated.context?.tool).toBe("go test");
    });

    it("should accept minimal arguments", () => {
      const args = {
        command: "test",
        exitCode: 0,
      };

      const validated = SmartSuggestionsTools.validateAnalyzeResultArgs(args);
      expect(validated.command).toBe("test");
      expect(validated.exitCode).toBe(0);
    });

    it("should accept negative exit codes", () => {
      const args = {
        command: "test",
        exitCode: -1,
      };

      const validated = SmartSuggestionsTools.validateAnalyzeResultArgs(args);
      expect(validated.exitCode).toBe(-1);
    });
  });

  describe("validateGetKnowledgeBaseStatsArgs", () => {
    it("should accept empty arguments", () => {
      const args = {};

      const validated =
        SmartSuggestionsTools.validateGetKnowledgeBaseStatsArgs(args);
      expect(validated).toEqual({});
    });

    it("should accept category filter", () => {
      const args = {
        category: "security",
      };

      const validated =
        SmartSuggestionsTools.validateGetKnowledgeBaseStatsArgs(args);
      expect(validated.category).toBe("security");
    });

    it("should accept different categories", () => {
      const categories = ["security", "performance", "test", "build"];

      for (const category of categories) {
        const args = { category };
        const validated =
          SmartSuggestionsTools.validateGetKnowledgeBaseStatsArgs(args);
        expect(validated.category).toBe(category);
      }
    });
  });

  describe("validateRecommendMCPServersArgs", () => {
    it("should accept empty arguments", () => {
      const args = {};

      const validated =
        SmartSuggestionsTools.validateRecommendMCPServersArgs(args);
      expect(validated).toEqual({});
    });

    it("should accept category filter", () => {
      const args = {
        category: MCPCategory.AI,
      };

      const validated =
        SmartSuggestionsTools.validateRecommendMCPServersArgs(args);
      expect(validated.category).toBe(MCPCategory.AI);
    });

    it("should accept priority filter", () => {
      const args = {
        priority: "high" as const,
      };

      const validated =
        SmartSuggestionsTools.validateRecommendMCPServersArgs(args);
      expect(validated.priority).toBe("high");
    });

    it("should accept useCase filter", () => {
      const args = {
        useCase: "browser testing",
      };

      const validated =
        SmartSuggestionsTools.validateRecommendMCPServersArgs(args);
      expect(validated.useCase).toBe("browser testing");
    });

    it("should accept includeConfig option", () => {
      const args = {
        includeConfig: true,
      };

      const validated =
        SmartSuggestionsTools.validateRecommendMCPServersArgs(args);
      expect(validated.includeConfig).toBe(true);
    });

    it("should accept all priority levels", () => {
      const priorities = ["high", "medium", "low"] as const;

      for (const priority of priorities) {
        const args = { priority };
        const validated =
          SmartSuggestionsTools.validateRecommendMCPServersArgs(args);
        expect(validated.priority).toBe(priority);
      }
    });

    it("should reject invalid priority", () => {
      const args = {
        priority: "invalid" as const,
      };

      expect(() =>
        SmartSuggestionsTools.validateRecommendMCPServersArgs(args),
      ).toThrow();
    });

    it("should accept multiple filters", () => {
      const args = {
        category: MCPCategory.Testing,
        priority: "high" as const,
        includeConfig: true,
      };

      const validated =
        SmartSuggestionsTools.validateRecommendMCPServersArgs(args);
      expect(validated.category).toBe(MCPCategory.Testing);
      expect(validated.priority).toBe("high");
      expect(validated.includeConfig).toBe(true);
    });
  });

  describe("validateGetPerformanceMetricsArgs", () => {
    it("should accept empty arguments", () => {
      const args = {};

      const validated =
        SmartSuggestionsTools.validateGetPerformanceMetricsArgs(args);
      expect(validated).toEqual({});
    });

    it("should accept namespace filter", () => {
      const args = {
        namespace: "smartSuggestions",
      };

      const validated =
        SmartSuggestionsTools.validateGetPerformanceMetricsArgs(args);
      expect(validated.namespace).toBe("smartSuggestions");
    });

    it("should accept different namespaces", () => {
      const namespaces = [
        "smartSuggestions",
        "projectDetection",
        "fileScanning",
      ];

      for (const namespace of namespaces) {
        const args = { namespace };
        const validated =
          SmartSuggestionsTools.validateGetPerformanceMetricsArgs(args);
        expect(validated.namespace).toBe(namespace);
      }
    });
  });
});
