/**
 * git-spice Plugin Tests
 *
 * Comprehensive test suite for the GitSpicePlugin.
 * Tests all 6 Tier 1 tools, error handling, and suggestion generation.
 *
 * Coverage target: 85%+
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import winston from "winston";
import { GitSpicePlugin } from "../../plugins/git-spice-plugin.js";
import { PluginContext } from "../../plugins/plugin-interface.js";
import { ShellExecutor, ExecutionResult } from "../../utils/shell-executor.js";

// Mock logger
const mockLogger = winston.createLogger({
  silent: true,
  transports: [],
});

// Mock ShellExecutor
class MockShellExecutor extends ShellExecutor {
  private mockResults: Map<string, ExecutionResult> = new Map();

  constructor() {
    super("/test/project");
  }

  setMockResult(command: string, result: ExecutionResult): void {
    this.mockResults.set(command, result);
  }

  async execute(command: string): Promise<ExecutionResult> {
    const result = this.mockResults.get(command);
    if (result) {
      return result;
    }

    // Default success result
    return {
      success: true,
      stdout: "",
      stderr: "",
      exitCode: 0,
      duration: 10,
      command,
    };
  }

  async isCommandAvailable(command: string): Promise<boolean> {
    return command === "gs";
  }
}

describe("GitSpicePlugin", () => {
  let plugin: GitSpicePlugin;
  let shellExecutor: MockShellExecutor;
  let context: PluginContext;

  beforeEach(() => {
    plugin = new GitSpicePlugin();
    shellExecutor = new MockShellExecutor();

    context = {
      config: {},
      projectRoot: "/test/project",
      shellExecutor,
      logger: mockLogger,
      utils: {
        isCommandAvailable: async (cmd) => cmd === "gs",
        resolvePath: (p) => `/test/project/${p}`,
        fileExists: async () => true,
        readFile: async () => "",
      },
    };
  });

  describe("metadata", () => {
    it("should have correct plugin metadata", () => {
      expect(plugin.metadata.name).toBe("git-spice");
      expect(plugin.metadata.version).toBe("1.0.0");
      expect(plugin.metadata.requiredCommands).toContain("gs");
      expect(plugin.metadata.tags).toContain("git");
    });
  });

  describe("initialize", () => {
    it("should initialize successfully when gs is available", async () => {
      await expect(plugin.initialize(context)).resolves.not.toThrow();
    });

    it("should throw error when gs is not available", async () => {
      const badContext = {
        ...context,
        utils: {
          ...context.utils,
          isCommandAvailable: async () => false,
        },
      };

      await expect(plugin.initialize(badContext)).rejects.toThrow(
        "git-spice (gs) command not found",
      );
    });
  });

  describe("registerTools", () => {
    it("should register 6 Tier 1 tools", async () => {
      const tools = await plugin.registerTools();

      expect(tools).toHaveLength(6);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain("branch_create");
      expect(toolNames).toContain("branch_checkout");
      expect(toolNames).toContain("stack_submit");
      expect(toolNames).toContain("stack_restack");
      expect(toolNames).toContain("log_short");
      expect(toolNames).toContain("repo_sync");
    });

    it("should have valid input schemas for all tools", async () => {
      const tools = await plugin.registerTools();

      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.inputSchema.properties).toBeDefined();
      }
    });

    it("should have examples for all tools", async () => {
      const tools = await plugin.registerTools();

      for (const tool of tools) {
        expect(tool.examples).toBeDefined();
        expect(tool.examples!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("healthCheck", () => {
    beforeEach(async () => {
      await plugin.initialize(context);
    });

    it("should return healthy status when all checks pass", async () => {
      shellExecutor.setMockResult("git rev-parse --git-dir", {
        success: true,
        stdout: ".git",
        stderr: "",
        exitCode: 0,
        duration: 10,
        command: "git rev-parse --git-dir",
      });

      const health = await plugin.healthCheck!();

      expect(health.status).toBe("healthy");
      expect(health.checks!["gs-available"]).toBe(true);
      expect(health.checks!["git-repository"]).toBe(true);
    });

    it("should return degraded status when git check fails", async () => {
      shellExecutor.setMockResult("git rev-parse --git-dir", {
        success: false,
        stdout: "",
        stderr: "Not a git repository",
        exitCode: 128,
        duration: 10,
        command: "git rev-parse --git-dir",
      });

      const health = await plugin.healthCheck!();

      expect(health.status).toBe("degraded");
      expect(health.checks!["git-repository"]).toBe(false);
    });
  });

  describe("branch_create", () => {
    beforeEach(async () => {
      await plugin.initialize(context);
    });

    it("should create branch successfully", async () => {
      shellExecutor.setMockResult("gs branch create 'feature/test'", {
        success: true,
        stdout: "Created branch feature/test",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "gs branch create feature/test",
      });

      const result = await plugin.handleToolCall("branch_create", {
        name: "feature/test",
      });

      expect(result).toMatchObject({
        success: true,
        branch: "feature/test",
      });
    });

    it("should create branch with base", async () => {
      shellExecutor.setMockResult(
        "gs branch create --base 'main' 'feature/test'",
        {
          success: true,
          stdout: "Created branch feature/test",
          stderr: "",
          exitCode: 0,
          duration: 100,
          command: "gs branch create --base main feature/test",
        },
      );

      const result = await plugin.handleToolCall("branch_create", {
        name: "feature/test",
        base: "main",
      });

      expect(result).toMatchObject({
        success: true,
        branch: "feature/test",
        base: "main",
      });
    });

    it("should handle branch creation failure", async () => {
      shellExecutor.setMockResult("gs branch create 'existing'", {
        success: false,
        stdout: "",
        stderr: "branch already exists",
        exitCode: 1,
        duration: 50,
        command: "gs branch create 'existing'",
      });

      const result = await plugin.handleToolCall("branch_create", {
        name: "existing",
      });

      expect(result).toMatchObject({
        success: false,
        branch: "existing",
      });
      expect((result as { suggestions?: string[] }).suggestions).toBeDefined();
    });

    it('should provide suggestions for "not initialized" error', async () => {
      shellExecutor.setMockResult("gs branch create 'test'", {
        success: false,
        stdout: "",
        stderr: "git-spice not initialized",
        exitCode: 1,
        duration: 50,
        command: "gs branch create 'test'",
      });

      const result = await plugin.handleToolCall("branch_create", {
        name: "test",
      });

      const suggestions =
        (result as { suggestions?: string[] }).suggestions || [];
      expect(suggestions.some((s) => s.includes("gs repo init"))).toBe(true);
    });
  });

  describe("branch_checkout", () => {
    beforeEach(async () => {
      await plugin.initialize(context);
    });

    it("should checkout branch successfully", async () => {
      shellExecutor.setMockResult("gs branch checkout 'feature/existing'", {
        success: true,
        stdout: "Checked out feature/existing",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "gs branch checkout feature/existing",
      });

      const result = await plugin.handleToolCall("branch_checkout", {
        name: "feature/existing",
      });

      expect(result).toMatchObject({
        success: true,
        branch: "feature/existing",
      });
    });

    it("should handle checkout of non-existent branch", async () => {
      shellExecutor.setMockResult("gs branch checkout 'nonexistent'", {
        success: false,
        stdout: "",
        stderr: "branch does not exist",
        exitCode: 1,
        duration: 50,
        command: "gs branch checkout 'nonexistent'",
      });

      const result = await plugin.handleToolCall("branch_checkout", {
        name: "nonexistent",
      });

      expect(result).toMatchObject({
        success: false,
        branch: "nonexistent",
      });

      const suggestions =
        (result as { suggestions?: string[] }).suggestions || [];
      expect(suggestions.some((s) => s.includes("does not exist"))).toBe(true);
    });
  });

  describe("stack_submit", () => {
    beforeEach(async () => {
      await plugin.initialize(context);
    });

    it("should submit stack successfully", async () => {
      shellExecutor.setMockResult("gs stack submit", {
        success: true,
        stdout: "Created PR: https://github.com/user/repo/pull/123",
        stderr: "",
        exitCode: 0,
        duration: 2000,
        command: "gs stack submit",
      });

      const result = await plugin.handleToolCall("stack_submit", {});

      expect(result).toMatchObject({
        success: true,
      });
      expect((result as { prs?: unknown[] }).prs).toBeDefined();
    });

    it("should submit stack as draft", async () => {
      shellExecutor.setMockResult("gs stack submit --draft", {
        success: true,
        stdout: "Created draft PR",
        stderr: "",
        exitCode: 0,
        duration: 2000,
        command: "gs stack submit --draft",
      });

      const result = await plugin.handleToolCall("stack_submit", {
        draft: true,
      });

      expect(result).toMatchObject({
        success: true,
      });
    });

    it("should handle authentication errors", async () => {
      shellExecutor.setMockResult("gs stack submit", {
        success: false,
        stdout: "",
        stderr: "authentication failed",
        exitCode: 1,
        duration: 100,
        command: "gs stack submit",
      });

      const result = await plugin.handleToolCall("stack_submit", {});

      const suggestions =
        (result as { suggestions?: string[] }).suggestions || [];
      expect(suggestions.some((s) => s.includes("gh auth login"))).toBe(true);
    });
  });

  describe("stack_restack", () => {
    beforeEach(async () => {
      await plugin.initialize(context);
    });

    it("should restack successfully", async () => {
      shellExecutor.setMockResult("gs stack restack", {
        success: true,
        stdout: "Restacked 3 branches",
        stderr: "",
        exitCode: 0,
        duration: 1000,
        command: "gs stack restack",
      });

      const result = await plugin.handleToolCall("stack_restack", {});

      expect(result).toMatchObject({
        success: true,
        restacked: 1,
      });
    });

    it("should handle restack conflicts", async () => {
      shellExecutor.setMockResult("gs stack restack", {
        success: false,
        stdout: "",
        stderr: "conflict detected",
        exitCode: 1,
        duration: 500,
        command: "gs stack restack",
      });

      const result = await plugin.handleToolCall("stack_restack", {});

      const suggestions =
        (result as { suggestions?: string[] }).suggestions || [];
      expect(suggestions.some((s) => s.includes("--continue"))).toBe(true);
    });
  });

  describe("log_short", () => {
    beforeEach(async () => {
      await plugin.initialize(context);
    });

    it("should display stack log", async () => {
      const logOutput = `* feature/b
│ * feature/a
└─ main`;

      shellExecutor.setMockResult("gs log short", {
        success: true,
        stdout: logOutput,
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "gs log short",
      });

      const result = await plugin.handleToolCall("log_short", {});

      expect(result).toMatchObject({
        success: true,
        output: logOutput,
      });
      expect((result as { branches?: string[] }).branches).toBeDefined();
    });

    it("should handle empty stack", async () => {
      shellExecutor.setMockResult("gs log short", {
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 50,
        command: "gs log short",
      });

      const result = await plugin.handleToolCall("log_short", {});

      expect(result).toMatchObject({
        success: true,
        output: "",
      });
    });
  });

  describe("repo_sync", () => {
    beforeEach(async () => {
      await plugin.initialize(context);
    });

    it("should sync repository successfully", async () => {
      shellExecutor.setMockResult("gs repo sync", {
        success: true,
        stdout: "Deleted branch feature/old",
        stderr: "",
        exitCode: 0,
        duration: 1500,
        command: "gs repo sync",
      });

      const result = await plugin.handleToolCall("repo_sync", {});

      expect(result).toMatchObject({
        success: true,
        synced: true,
      });
      expect((result as { deleted?: string[] }).deleted).toBeDefined();
    });

    it("should handle sync with no deletions", async () => {
      shellExecutor.setMockResult("gs repo sync", {
        success: true,
        stdout: "Repository synced",
        stderr: "",
        exitCode: 0,
        duration: 1000,
        command: "gs repo sync",
      });

      const result = await plugin.handleToolCall("repo_sync", {});

      expect(result).toMatchObject({
        success: true,
        synced: true,
      });
    });

    it("should handle network errors", async () => {
      shellExecutor.setMockResult("gs repo sync", {
        success: false,
        stdout: "",
        stderr: "network error",
        exitCode: 1,
        duration: 100,
        command: "gs repo sync",
      });

      const result = await plugin.handleToolCall("repo_sync", {});

      const suggestions =
        (result as { suggestions?: string[] }).suggestions || [];
      expect(suggestions.some((s) => s.includes("internet connection"))).toBe(
        true,
      );
    });
  });

  describe("handleToolCall", () => {
    beforeEach(async () => {
      await plugin.initialize(context);
    });

    it("should throw error for unknown tool", async () => {
      await expect(plugin.handleToolCall("unknown_tool", {})).rejects.toThrow(
        "Unknown tool",
      );
    });
  });

  describe("input validation", () => {
    beforeEach(async () => {
      await plugin.initialize(context);
    });

    it("should reject invalid branch_create args", async () => {
      await expect(
        plugin.handleToolCall("branch_create", {}),
      ).rejects.toThrow();
    });

    it("should reject invalid branch_checkout args", async () => {
      await expect(
        plugin.handleToolCall("branch_checkout", {}),
      ).rejects.toThrow();
    });

    it("should accept empty args for tools that do not require them", async () => {
      shellExecutor.setMockResult("gs stack restack", {
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "gs stack restack",
      });

      await expect(
        plugin.handleToolCall("stack_restack", {}),
      ).resolves.not.toThrow();
    });
  });
});
