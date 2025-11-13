import { z } from "zod";
import { ShellExecutor, ExecutionResult } from "../utils/shell-executor.js";
import winston from "winston";

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Schema for jq_query arguments
export const JQQueryArgsSchema = z.object({
  input: z.any().describe("JSON string or already-parsed object/array"),
  filter: z.string().describe('jq filter expression (e.g., ".[] | .name")'),
  compact: z
    .boolean()
    .optional()
    .describe("Compact output (default: false)"),
  raw_output: z
    .boolean()
    .optional()
    .describe("Raw strings without JSON quotes (default: false)"),
  sort_keys: z
    .boolean()
    .optional()
    .describe("Sort object keys (default: false)"),
});

export type JQQueryArgs = z.infer<typeof JQQueryArgsSchema>;

export interface JQQueryResult {
  success: boolean;
  result: unknown;
  result_json: string;
  filter: string;
  error?: string;
  input_type: "string" | "object";
}

export class JQTools {
  private executor: ShellExecutor;
  private projectRoot: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.executor = new ShellExecutor(this.projectRoot);
  }

  /**
   * Validate and parse jq_query arguments
   */
  static validateQueryArgs(args: unknown): JQQueryArgs {
    return JQQueryArgsSchema.parse(args);
  }

  /**
   * Process JSON data using jq filter syntax.
   *
   * This tool provides the full power of jq for JSON processing without
   * requiring user approval for each query. Perfect for parsing API responses,
   * extracting fields, filtering arrays, and transforming data structures.
   *
   * @param params - Query configuration with input and filter
   * @returns Processed JSON result
   *
   * @example
   * ```typescript
   * // Extract field from object
   * const result = await jq_query({
   *   input: '{"name": "test", "id": 123}',
   *   filter: '.name'
   * });
   * console.log(result.result);  // "test"
   * ```
   *
   * @example
   * ```typescript
   * // Filter array
   * const result = await jq_query({
   *   input: [{status: "active", id: 1}, {status: "inactive", id: 2}],
   *   filter: '.[] | select(.status == "active") | .id'
   * });
   * console.log(result.result);  // 1
   * ```
   *
   * @example
   * ```typescript
   * // Transform structure
   * const result = await jq_query({
   *   input: apiResponse,
   *   filter: '.[] | {name: .user.name, id: .id}',
   *   compact: true
   * });
   * ```
   */
  async queryJSON(params: JQQueryArgs): Promise<JQQueryResult> {
    // 1. Validate jq is available
    const jqAvailable = await this.checkJQAvailable();
    if (!jqAvailable) {
      return {
        success: false,
        result: null,
        result_json: "",
        filter: params.filter,
        error:
          "jq is not installed. Install with: brew install jq (macOS) or apt-get install jq (Linux)",
        input_type: "string",
      };
    }

    // 2. Normalize input to JSON string
    let inputJSON: string;
    let inputType: "string" | "object";

    if (typeof params.input === "string") {
      inputType = "string";
      // Validate JSON
      try {
        JSON.parse(params.input);
        inputJSON = params.input;
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        return {
          success: false,
          result: null,
          result_json: "",
          filter: params.filter,
          error: `Invalid JSON input: ${error}`,
          input_type: inputType,
        };
      }
    } else {
      inputType = "object";
      inputJSON = JSON.stringify(params.input);
    }

    // 3. Build jq command arguments
    const args: string[] = [];

    if (params.compact) {
      args.push("-c"); // Compact output
    }
    if (params.raw_output) {
      args.push("-r"); // Raw output
    }
    if (params.sort_keys) {
      args.push("-S"); // Sort keys
    }

    args.push(params.filter);

    // 4. Execute jq with JSON as stdin
    logger.info(`Executing jq with filter: ${params.filter}`);

    const result = await this.executeJQ(args, inputJSON);

    if (!result.success) {
      return {
        success: false,
        result: null,
        result_json: "",
        filter: params.filter,
        error: `jq error: ${result.stderr || result.error}`,
        input_type: inputType,
      };
    }

    // 5. Parse result
    let parsedResult: unknown;
    const output = result.stdout.trim();

    // Handle empty output
    if (output === "") {
      return {
        success: true,
        result: params.raw_output ? "" : null,
        result_json: "",
        filter: params.filter,
        input_type: inputType,
      };
    }

    // Try to parse as JSON unless raw_output was requested
    if (params.raw_output) {
      // Raw output - use as-is
      parsedResult = output;
    } else {
      try {
        // Try to parse as JSON
        parsedResult = JSON.parse(output);
      } catch {
        // If parse fails, it might be a raw string or number from jq
        // This can happen with filters like '.name' on a string field
        parsedResult = output;
      }
    }

    return {
      success: true,
      result: parsedResult,
      result_json: output,
      filter: params.filter,
      input_type: inputType,
    };
  }

  /**
   * Execute jq command with stdin input
   */
  private async executeJQ(
    args: string[],
    stdin: string,
  ): Promise<ExecutionResult> {
    const { execa } = await import("execa");

    try {
      const result = await execa("jq", args, {
        input: stdin,
        reject: false,
        all: true,
      });

      return {
        success: result.exitCode === 0,
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.exitCode ?? -1,
        duration: 0,
        command: `jq ${args.join(" ")}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        stdout: "",
        stderr: errorMessage,
        exitCode: -1,
        duration: 0,
        command: `jq ${args.join(" ")}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Check if jq is available in the system
   */
  private async checkJQAvailable(): Promise<boolean> {
    return await this.executor.isCommandAvailable("jq");
  }
}
