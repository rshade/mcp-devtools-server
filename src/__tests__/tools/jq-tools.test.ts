import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { JQTools } from "../../tools/jq-tools";
import { ShellExecutor } from "../../utils/shell-executor";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JQToolsWithPrivate = any;

describe("JQTools", () => {
  let jqTools: JQTools;
  let mockShellExecutor: ShellExecutor;

  beforeEach(() => {
    mockShellExecutor = new ShellExecutor();
    jqTools = new JQTools();
  });

  describe("Unit Tests (with mocking)", () => {
    describe("Input Handling", () => {
      it("accepts JSON string input", async () => {
        const mockExecuteJQ = jest
          .spyOn(jqTools as JQToolsWithPrivate, "executeJQ")
          .mockResolvedValue({
            success: true,
            stdout: '"test"',
            stderr: "",
            exitCode: 0,
            duration: 0,
            command: "jq .name",
          });

        const result = await jqTools.queryJSON({
          input: '{"name": "test", "id": 123}',
          filter: ".name",
        });

        expect(result.success).toBe(true);
        expect(result.input_type).toBe("string");
        expect(mockExecuteJQ).toHaveBeenCalledWith(
          [".name"],
          '{"name": "test", "id": 123}',
        );
      });

      it("accepts parsed object input", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: "123",
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq .id",
        });

        const result = await jqTools.queryJSON({
          input: { name: "test", id: 123 },
          filter: ".id",
        });

        expect(result.success).toBe(true);
        expect(result.input_type).toBe("object");
        expect(result.result).toBe(123);
      });

      it("accepts array input", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: "2",
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq .[1]",
        });

        const result = await jqTools.queryJSON({
          input: [1, 2, 3],
          filter: ".[1]",
        });

        expect(result.success).toBe(true);
        expect(result.result).toBe(2);
      });

      it("returns error for invalid JSON string", async () => {
        const result = await jqTools.queryJSON({
          input: "{invalid json",
          filter: ".",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid JSON input");
      });
    });

    describe("Output Formatting", () => {
      it("parses JSON output by default", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: '{\n  "a": 1,\n  "b": 2\n}',
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq .",
        });

        const result = await jqTools.queryJSON({
          input: { a: 1, b: 2 },
          filter: ".",
        });

        expect(result.success).toBe(true);
        expect(result.result).toEqual({ a: 1, b: 2 });
        expect(result.result_json).toContain("\n");
      });

      it("passes compact flag to jq", async () => {
        const mockExecuteJQ = jest
          .spyOn(jqTools as JQToolsWithPrivate, "executeJQ")
          .mockResolvedValue({
            success: true,
            stdout: '{"a":1,"b":2}',
            stderr: "",
            exitCode: 0,
            duration: 0,
            command: "jq -c .",
          });

        const result = await jqTools.queryJSON({
          input: { a: 1, b: 2 },
          filter: ".",
          compact: true,
        });

        expect(result.success).toBe(true);
        expect(mockExecuteJQ).toHaveBeenCalledWith(
          ["-c", "."],
          expect.any(String),
        );
      });

      it("returns raw strings when raw_output enabled", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: "test",
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq -r .name",
        });

        const result = await jqTools.queryJSON({
          input: { name: "test" },
          filter: ".name",
          raw_output: true,
        });

        expect(result.success).toBe(true);
        expect(result.result).toBe("test");
        expect(result.result_json).toBe("test");
      });

      it("passes sort_keys flag to jq", async () => {
        const mockExecuteJQ = jest
          .spyOn(jqTools as JQToolsWithPrivate, "executeJQ")
          .mockResolvedValue({
            success: true,
            stdout: '{"a":2,"m":3,"z":1}',
            stderr: "",
            exitCode: 0,
            duration: 0,
            command: "jq -S .",
          });

        await jqTools.queryJSON({
          input: { z: 1, a: 2, m: 3 },
          filter: ".",
          sort_keys: true,
        });

        expect(mockExecuteJQ).toHaveBeenCalledWith(
          ["-S", "."],
          expect.any(String),
        );
      });
    });

    describe("Edge Cases", () => {
      it("handles empty output with raw_output", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: "",
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq -r .value",
        });

        const result = await jqTools.queryJSON({
          input: { value: "" },
          filter: ".value",
          raw_output: true,
        });

        expect(result.success).toBe(true);
        expect(result.result).toBe("");
      });

      it("handles empty output without raw_output", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: "",
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq .nonexistent",
        });

        const result = await jqTools.queryJSON({
          input: {},
          filter: ".nonexistent",
        });

        expect(result.success).toBe(true);
        expect(result.result).toBe(null);
      });

      it("handles null values", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: "null",
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq .value",
        });

        const result = await jqTools.queryJSON({
          input: { value: null },
          filter: ".value",
        });

        expect(result.success).toBe(true);
        expect(result.result).toBe(null);
      });

      it("handles boolean values", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: "true",
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq .active",
        });

        const result = await jqTools.queryJSON({
          input: { active: true },
          filter: ".active",
        });

        expect(result.success).toBe(true);
        expect(result.result).toBe(true);
      });

      it("handles numeric values", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: "42",
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq .count",
        });

        const result = await jqTools.queryJSON({
          input: { count: 42 },
          filter: ".count",
        });

        expect(result.success).toBe(true);
        expect(result.result).toBe(42);
      });

      it("handles unparseable output as string", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: "not-valid-json",
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq .weird",
        });

        const result = await jqTools.queryJSON({
          input: {},
          filter: ".weird",
        });

        expect(result.success).toBe(true);
        expect(result.result).toBe("not-valid-json");
      });
    });

    describe("Error Handling", () => {
      it("returns error when jq execution fails", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: false,
          stdout: "",
          stderr: "parse error: Invalid numeric literal",
          exitCode: 1,
          duration: 0,
          command: "jq .name[[[",
          error: "jq failed",
        });

        const result = await jqTools.queryJSON({
          input: '{"name": "test"}',
          filter: ".name[[[",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("jq error");
      });

      it("returns error when jq not installed", async () => {
        jest
          .spyOn(mockShellExecutor, "isCommandAvailable")
          .mockResolvedValue(false);

        const jqToolsWithMock = new JQTools();
        (jqToolsWithMock as JQToolsWithPrivate).executor = mockShellExecutor;

        const result = await jqToolsWithMock.queryJSON({
          input: '{"name": "test"}',
          filter: ".name",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("jq is not installed");
        expect(result.error).toContain("brew install jq");
      });

      it("provides helpful error messages", async () => {
        const result = await jqTools.queryJSON({
          input: "{not valid json",
          filter: ".",
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain("Invalid JSON input");
      });
    });

    describe("Common Use Cases (mocked)", () => {
      it("transforms API response structure", async () => {
        jest.spyOn(jqTools as JQToolsWithPrivate, "executeJQ").mockResolvedValue({
          success: true,
          stdout: '{"users":[{"name":"alice","id":1},{"name":"bob","id":2}],"count":2}',
          stderr: "",
          exitCode: 0,
          duration: 0,
          command: "jq",
        });

        const apiResponse = {
          data: {
            users: [
              { user_name: "alice", user_id: 1 },
              { user_name: "bob", user_id: 2 },
            ],
          },
          meta: { total: 2 },
        };

        const result = await jqTools.queryJSON({
          input: apiResponse,
          filter:
            "{users: .data.users | map({name: .user_name, id: .user_id}), count: .meta.total}",
        });

        expect(result.success).toBe(true);
        expect(result.result).toEqual({
          users: [
            { name: "alice", id: 1 },
            { name: "bob", id: 2 },
          ],
          count: 2,
        });
      });
    });
  });

  describe("Integration Tests (actual jq execution)", () => {
    it("executes real jq for basic field extraction", async () => {
      const result = await jqTools.queryJSON({
        input: '{"name": "test", "id": 123}',
        filter: ".name",
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe("test");
      expect(result.input_type).toBe("string");
    });

    it("executes real jq for array filtering", async () => {
      const result = await jqTools.queryJSON({
        input: [
          { status: "active", id: 1 },
          { status: "inactive", id: 2 },
          { status: "active", id: 3 },
        ],
        filter: '[.[] | select(.status == "active")]',
      });

      expect(result.success).toBe(true);
      expect(Array.isArray(result.result)).toBe(true);
      const resultArray = result.result as Array<{ id: number; status: string }>;
      expect(resultArray.length).toBe(2);
      expect(resultArray[0].id).toBe(1);
      expect(resultArray[1].id).toBe(3);
    });

    it("handles real jq syntax errors", async () => {
      const result = await jqTools.queryJSON({
        input: '{"name": "test"}',
        filter: ".name[[[",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("jq error");
    });

    it("executes real jq with all output options", async () => {
      const result = await jqTools.queryJSON({
        input: { z: 1, a: 2, m: 3 },
        filter: ".",
        compact: true,
        sort_keys: true,
      });

      expect(result.success).toBe(true);
      expect(result.result_json).toBe('{"a":2,"m":3,"z":1}');
      const keys = Object.keys(result.result as Record<string, unknown>);
      expect(keys).toEqual(["a", "m", "z"]);
    });
  });
});
