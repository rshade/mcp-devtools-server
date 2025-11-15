import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { NodejsTools } from "../../tools/nodejs-tools.js";
import { CacheManager } from "../../utils/cache-manager.js";
import type { ExecutionResult } from "../../utils/shell-executor.js";

/**
 * Unit tests for nodejs_package_info tool
 * Tests package lookup, version display, and peer dependency detection
 */
describe("NodejsTools - Package Info (nodejs_package_info)", () => {
  let tools: NodejsTools;
  let projectRoot: string;

  beforeEach(() => {
    CacheManager.resetInstance();
    projectRoot = process.cwd();
    tools = new NodejsTools(projectRoot);
  });

  afterEach(() => {
    CacheManager.resetInstance();
  });

  describe("getPackageInfo - successful lookups", () => {
    type MockFn = ReturnType<typeof jest.fn>;
    let mockExecute: MockFn;

    beforeEach(() => {
      const mockPackageData = {
        name: "lru-cache",
        "dist-tags": {
          latest: "11.2.2",
          "v7.7-backport": "7.7.4",
        },
        versions: ["1.0.1", "7.0.0", "10.0.0", "11.0.0", "11.1.0", "11.2.2"],
        description: "Fast LRU cache implementation",
        license: "ISC",
        homepage: "https://github.com/isaacs/node-lru-cache#readme",
        keywords: ["lru", "cache", "mru"],
        repository: {
          type: "git",
          url: "https://github.com/isaacs/node-lru-cache",
        },
        time: {
          "11.2.2": "2024-01-15T10:00:00Z",
          "11.1.0": "2024-01-10T08:00:00Z",
          "11.0.0": "2024-01-05T12:00:00Z",
          "10.0.0": "2023-12-20T14:00:00Z",
          "7.0.0": "2021-06-01T10:00:00Z",
          "1.0.1": "2012-01-01T00:00:00Z",
        },
      };

      const mockExecutor = {
        execute: jest.fn(async () => ({
          success: true,
          stdout: JSON.stringify(mockPackageData),
          stderr: "",
          exitCode: 0,
          duration: 100,
          command: "npm view lru-cache --json",
        } satisfies ExecutionResult)),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tools as any).executor = mockExecutor;
      mockExecute = mockExecutor.execute as MockFn;
    });

    it("should fetch and display package info", async () => {
      const result = await tools.getPackageInfo({
        packageName: "lru-cache",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("lru-cache");
      expect(result.output).toContain("11.2.2");
      expect(result.output).toContain("Fast LRU cache implementation");
      expect(result.output).toContain("Latest Version: 11.2.2");
      expect(mockExecute).toHaveBeenCalledWith("npm", {
        cwd: projectRoot,
        args: ["view", "lru-cache", "--json"],
        timeout: 15000,
      });
    });

    it("should show latest version first", async () => {
      const result = await tools.getPackageInfo({
        packageName: "lru-cache",
        versionLimit: 5,
      });

      expect(result.success).toBe(true);
      // Check that latest version is mentioned
      expect(result.output).toContain("11.2.2");
      // Check that we have version list with marker
      expect(result.output).toContain("✓ (latest)");
      // Latest should appear before other versions in the output
      const latestIndex = result.output.indexOf("11.2.2");
      expect(latestIndex).toBeGreaterThan(0);
    });

    it("should respect versionLimit parameter", async () => {
      const result = await tools.getPackageInfo({
        packageName: "lru-cache",
        versionLimit: 3,
      });

      expect(result.success).toBe(true);
      // Count version lines (should be limited)
      const versionMatches = result.output.match(/\d+\.\d+\.\d+/g) || [];
      expect(versionMatches.length).toBeLessThanOrEqual(6); // 3 versions + some metadata
    });

    it("should include helpful installation suggestion", async () => {
      const result = await tools.getPackageInfo({
        packageName: "lru-cache",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("npm install lru-cache@11.2.2");
      expect(result.suggestions).toContain(
        "Use latest version to avoid audit issues: npm install lru-cache@11.2.2"
      );
    });

    it("should include license and keywords in output", async () => {
      const result = await tools.getPackageInfo({
        packageName: "lru-cache",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("License: ISC");
      expect(result.output).toContain("Keywords:");
    });
  });

  describe("getPackageInfo - error handling", () => {
    type MockFn = ReturnType<typeof jest.fn>;
    let mockExecute: MockFn;

    beforeEach(() => {
      const mockExecutor = {
        execute: jest.fn(),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tools as any).executor = mockExecutor;
      mockExecute = mockExecutor.execute as MockFn;
    });

    it("should handle package not found", async () => {
      mockExecute.mockResolvedValueOnce({
        success: false,
        stdout: "",
        stderr: "404 Not Found : nonexistent-package-xyz",
        exitCode: 1,
        duration: 100,
        error: "npm ERR! code E404",
        command: "npm view",
      } satisfies ExecutionResult);

      const result = await tools.getPackageInfo({
        packageName: "nonexistent-package-xyz",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to fetch package info");
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it("should handle invalid JSON response", async () => {
      mockExecute.mockResolvedValueOnce({
        success: true,
        stdout: "invalid json {",
        stderr: "",
        exitCode: 0,
        duration: 100,
        command: "npm view",
      } satisfies ExecutionResult);

      const result = await tools.getPackageInfo({
        packageName: "some-package",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to parse");
    });

    it("should handle npm registry errors", async () => {
      mockExecute.mockResolvedValueOnce({
        success: false,
        stdout: "",
        stderr: "npm ERR! Network timeout",
        exitCode: 1,
        duration: 100,
        error: "Network error",
        command: "npm view",
      } satisfies ExecutionResult);

      const result = await tools.getPackageInfo({
        packageName: "any-package",
      });

      expect(result.success).toBe(false);
      // Should suggest checking npm registry or network
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions?.length).toBeGreaterThan(0);
    });
  });

  describe("getPackageInfo - deprecation warnings", () => {
    beforeEach(() => {
      const mockDeprecatedPackage = {
        name: "old-package",
        "dist-tags": {
          latest: "1.0.0",
        },
        versions: ["1.0.0"],
        description: "Old package",
        deprecated: "This package is deprecated. Use new-package instead.",
        time: {
          "1.0.0": "2020-01-01T00:00:00Z",
        },
      };

      const mockExecutor = {
        execute: jest.fn(async () => ({
          success: true,
          stdout: JSON.stringify(mockDeprecatedPackage),
          stderr: "",
          exitCode: 0,
          duration: 100,
          command: "npm view old-package --json",
        } satisfies ExecutionResult)),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tools as any).executor = mockExecutor;
    });

    it("should show deprecation warning by default", async () => {
      const result = await tools.getPackageInfo({
        packageName: "old-package",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("DEPRECATION WARNING");
      expect(result.output).toContain(
        "This package is deprecated. Use new-package instead."
      );
    });

    it("should hide deprecation warning when includeDeprecations is false", async () => {
      const result = await tools.getPackageInfo({
        packageName: "old-package",
        includeDeprecations: false,
      });

      expect(result.success).toBe(true);
      expect(result.output).not.toContain("DEPRECATION WARNING");
    });
  });

  describe("getPackageInfo - staleness detection", () => {
    it("should warn when package is stale (no updates in 6+ months)", async () => {
      // Calculate a date 1 year ago
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const staleDate = oneYearAgo.toISOString();

      const mockStalePackage = {
        name: "stale-package",
        "dist-tags": { latest: "1.0.0" },
        versions: ["1.0.0"],
        description: "Package not updated in over a year",
        license: "MIT",
        time: { "1.0.0": staleDate },
      };

      const mockExecutor = {
        execute: jest.fn(async () => ({
          success: true,
          stdout: JSON.stringify(mockStalePackage),
          stderr: "",
          exitCode: 0,
          duration: 100,
          command: "npm view stale-package --json",
        } satisfies ExecutionResult)),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tools as any).executor = mockExecutor;

      const result = await tools.getPackageInfo({
        packageName: "stale-package",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("STALE PACKAGE");
      // Could be "X year ago" or "X days ago" depending on exact calculation
      expect(result.output).toMatch(/\d+\s+(year|day)s?\s+ago/);
      expect(result.suggestions).toBeDefined();
      const staleWarning = result.suggestions?.find((s) =>
        s.includes("stale") || s.includes("Verify this is the right choice")
      );
      expect(staleWarning).toBeDefined();
    });

    it("should not warn when package is recently updated", async () => {
      // Calculate a date 1 month ago (recent)
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const recentDate = oneMonthAgo.toISOString();

      const mockRecentPackage = {
        name: "recent-package",
        "dist-tags": { latest: "2.0.0" },
        versions: ["2.0.0", "1.0.0"],
        description: "Recently updated package",
        license: "MIT",
        time: {
          "2.0.0": recentDate,
          "1.0.0": "2023-01-01T00:00:00Z",
        },
      };

      const mockExecutor = {
        execute: jest.fn(async () => ({
          success: true,
          stdout: JSON.stringify(mockRecentPackage),
          stderr: "",
          exitCode: 0,
          duration: 100,
          command: "npm view recent-package --json",
        } satisfies ExecutionResult)),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tools as any).executor = mockExecutor;

      const result = await tools.getPackageInfo({
        packageName: "recent-package",
      });

      expect(result.success).toBe(true);
      expect(result.output).not.toContain("STALE PACKAGE");
      // Staleness warning should not be in suggestions
      const staleWarning = result.suggestions?.find((s) =>
        s.includes("stale") || s.includes("stale")
      );
      expect(staleWarning).toBeUndefined();
    });

    it("should calculate staleness in days for packages stale < 1 year", async () => {
      // Calculate a date 200 days ago
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 200);
      const staleDateString = staleDate.toISOString();

      const mockStalePackage = {
        name: "partially-stale",
        "dist-tags": { latest: "1.0.0" },
        versions: ["1.0.0"],
        description: "Stale but less than a year",
        time: { "1.0.0": staleDateString },
      };

      const mockExecutor = {
        execute: jest.fn(async () => ({
          success: true,
          stdout: JSON.stringify(mockStalePackage),
          stderr: "",
          exitCode: 0,
          duration: 100,
          command: "npm view partially-stale --json",
        } satisfies ExecutionResult)),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tools as any).executor = mockExecutor;

      const result = await tools.getPackageInfo({
        packageName: "partially-stale",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("STALE PACKAGE");
      expect(result.output).toMatch(/\d+ days ago/);
    });
  });

  describe("getPackageInfo - caching", () => {
    type MockFn = ReturnType<typeof jest.fn>;
    let mockExecute: MockFn;

    beforeEach(() => {
      const mockPackageData = {
        name: "test-package",
        "dist-tags": { latest: "1.0.0" },
        versions: ["1.0.0"],
        description: "Test",
        time: { "1.0.0": "2024-01-01T00:00:00Z" },
      };

      const mockExecutor = {
        execute: jest.fn(async () => ({
          success: true,
          stdout: JSON.stringify(mockPackageData),
          stderr: "",
          exitCode: 0,
          duration: 100,
          command: "npm view",
        } satisfies ExecutionResult)),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tools as any).executor = mockExecutor;
      mockExecute = mockExecutor.execute as MockFn;
    });

    it("should cache results for same package", async () => {
      const result1 = await tools.getPackageInfo({
        packageName: "test-package",
      });
      const result2 = await tools.getPackageInfo({
        packageName: "test-package",
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      // Execute should only be called once (cached)
      expect(mockExecute).toHaveBeenCalledTimes(1);
      // Results should be identical
      expect(result1.output).toBe(result2.output);
    });

    it("should not cache different packages", async () => {
      await tools.getPackageInfo({ packageName: "package-1" });
      await tools.getPackageInfo({ packageName: "package-2" });

      // Execute should be called twice for different packages
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });
  });

  describe("getPackageInfo - scoped packages", () => {
    type MockFn = ReturnType<typeof jest.fn>;
    let mockExecute: MockFn;

    beforeEach(() => {
      const mockScopedPackage = {
        name: "@types/node",
        "dist-tags": { latest: "20.10.0" },
        versions: ["20.10.0", "20.9.0"],
        description: "TypeScript definitions for Node.js",
        license: "MIT",
        time: {
          "20.10.0": "2024-01-15T10:00:00Z",
          "20.9.0": "2024-01-10T08:00:00Z",
        },
      };

      const mockExecutor = {
        execute: jest.fn(async () => ({
          success: true,
          stdout: JSON.stringify(mockScopedPackage),
          stderr: "",
          exitCode: 0,
          duration: 100,
          command: "npm view @types/node --json",
        } satisfies ExecutionResult)),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tools as any).executor = mockExecutor;
      mockExecute = mockExecutor.execute as MockFn;
    });

    it("should handle scoped packages correctly", async () => {
      const result = await tools.getPackageInfo({
        packageName: "@types/node",
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("@types/node");
      expect(result.output).toContain("20.10.0");
      expect(mockExecute).toHaveBeenCalledWith("npm", {
        cwd: projectRoot,
        args: ["view", "@types/node", "--json"],
        timeout: 15000,
      });
    });
  });

  describe("validatePackageInfoArgs", () => {
    it("should validate package name is required", () => {
      expect(() => {
        NodejsTools.validatePackageInfoArgs({});
      }).toThrow();
    });

    it("should accept valid args", () => {
      const args = NodejsTools.validatePackageInfoArgs({
        packageName: "lodash",
      });

      expect(args.packageName).toBe("lodash");
      expect(args.versionLimit).toBeUndefined();
    });

    it("should accept optional parameters", () => {
      const args = NodejsTools.validatePackageInfoArgs({
        packageName: "lodash",
        versionLimit: 10,
        includeDeprecations: false,
      });

      expect(args.packageName).toBe("lodash");
      expect(args.versionLimit).toBe(10);
      expect(args.includeDeprecations).toBe(false);
    });
  });
});
