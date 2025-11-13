import { z } from "zod";
import * as path from "path";
import * as fs from "fs/promises";
import * as dotenv from "dotenv";
import { logger } from "../utils/logger.js";

/**
 * Constants
 */
const MASKED_VALUE = "***MASKED***";
const JSON_INDENT = 2;
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1MB

/**
 * Schema for dotenv_environment tool arguments
 */
export const DotenvEnvironmentArgsSchema = z.object({
  file: z
    .string()
    .optional()
    .describe("Path to .env file (default: .env)"),
  mask: z
    .boolean()
    .optional()
    .default(true)
    .describe("Mask sensitive values (default: true)"),
  maskPatterns: z
    .array(z.string())
    .optional()
    .describe(
      "Custom patterns to mask (in addition to defaults: PASSWORD, SECRET, TOKEN, KEY, API_KEY, PRIVATE, CREDENTIALS, AUTH)"
    ),
  includeProcessEnv: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include process.env variables (default: false)"),
  directory: z
    .string()
    .optional()
    .describe("Working directory (default: current directory)"),
});

/**
 * Type for dotenv_environment tool arguments
 */
export type DotenvEnvironmentArgs = z.infer<typeof DotenvEnvironmentArgsSchema>;

/**
 * Environment variable with masking metadata
 */
interface EnvVariable {
  key: string;
  value: string;
  masked: boolean;
  source: "file" | "process";
}

/**
 * Result from loading environment variables
 */
interface EnvResult {
  variables: EnvVariable[];
  warnings: string[];
  filePath?: string;
  fileExists: boolean;
}

/**
 * Default patterns for masking sensitive values
 */
const DEFAULT_MASK_PATTERNS = [
  "PASSWORD",
  "SECRET",
  "TOKEN",
  "KEY",
  "API_KEY",
  "PRIVATE",
  "CREDENTIALS",
  "AUTH",
];

/**
 * EnvTools class provides environment variable management tools
 */
export class EnvTools {
  /**
   * Loads and parses environment variables from .env files
   *
   * @param args - Tool arguments (raw, will be parsed by Zod schema)
   * @returns Environment variable information
   */
  static async dotenvEnvironment(args: unknown): Promise<string> {
    // Parse and validate args with Zod schema (applies defaults)
    const validatedArgs = DotenvEnvironmentArgsSchema.parse(args);

    const workingDir = path.resolve(validatedArgs.directory || process.cwd());
    const envFile = validatedArgs.file || ".env";
    const filePath = path.resolve(workingDir, envFile);

    // Security: Prevent directory traversal attacks
    if (!filePath.startsWith(workingDir)) {
      const error = "Invalid file path: directory traversal not allowed";
      logger.error(error);
      return JSON.stringify(
        {
          success: false,
          error,
          suggestion:
            "Ensure the file path stays within the working directory",
          filePath,
        },
        null,
        JSON_INDENT
      );
    }

    const mask = validatedArgs.mask;
    const maskPatterns = [
      ...DEFAULT_MASK_PATTERNS,
      ...(validatedArgs.maskPatterns || []),
    ];
    const includeProcessEnv = validatedArgs.includeProcessEnv;

    logger.info(
      `Loading environment variables from: ${filePath} (mask: ${mask})`
    );

    const result: EnvResult = {
      variables: [],
      warnings: [],
      filePath,
      fileExists: false,
    };

    // Check if file exists
    try {
      await fs.access(filePath);
      result.fileExists = true;
    } catch (error) {
      result.fileExists = false;
      const errorMsg = `Environment file not found: ${filePath}`;
      logger.debug(`File access failed: ${error instanceof Error ? error.message : String(error)}`);
      logger.warn(errorMsg);
      return JSON.stringify(
        {
          success: false,
          error: errorMsg,
          suggestion: `Create ${envFile} file or specify a different file with the 'file' parameter`,
          filePath,
        },
        null,
        JSON_INDENT
      );
    }

    // Check file size before reading
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > MAX_FILE_SIZE_BYTES) {
        const error = `File too large: ${stats.size} bytes (max: ${MAX_FILE_SIZE_BYTES} bytes)`;
        logger.error(error);
        return JSON.stringify(
          {
            success: false,
            error,
            suggestion: "Reduce file size or increase MAX_FILE_SIZE_BYTES limit",
            filePath,
          },
          null,
          JSON_INDENT
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to stat file: ${errorMsg}`);
      return JSON.stringify(
        {
          success: false,
          error: `Failed to check file size: ${errorMsg}`,
          filePath,
        },
        null,
        JSON_INDENT
      );
    }

    // Read file content
    let fileContent: string;
    try {
      fileContent = await fs.readFile(filePath, "utf-8");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to read file: ${errorMsg}`);
      return JSON.stringify(
        {
          success: false,
          error: `Failed to read environment file: ${errorMsg}`,
          suggestion: "Check file permissions and ensure the file is readable",
          filePath,
        },
        null,
        JSON_INDENT
      );
    }

    // Parse .env file content
    let parsed: Record<string, string>;
    try {
      parsed = dotenv.parse(fileContent);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to parse .env file: ${errorMsg}`);
      return JSON.stringify(
        {
          success: false,
          error: `Failed to parse environment file: ${errorMsg}`,
          suggestion: "Ensure the .env file follows the correct format (KEY=value)",
          filePath,
        },
        null,
        JSON_INDENT
      );
    }

    // Check if file is empty
    if (Object.keys(parsed).length === 0) {
      result.warnings.push(`Environment file is empty: ${filePath}`);
    }

    // Add variables from file
    try {
      for (const [key, value] of Object.entries(parsed)) {
        const shouldMask = mask && this.shouldMaskValue(key, maskPatterns);
        result.variables.push({
          key,
          value: shouldMask ? MASKED_VALUE : String(value),
          masked: shouldMask,
          source: "file",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to process parsed variables: ${errorMsg}`);
      return JSON.stringify(
        {
          success: false,
          error: `Failed to process environment variables: ${errorMsg}`,
          filePath,
        },
        null,
        JSON_INDENT
      );
    }

    // Optionally include process.env
    if (includeProcessEnv) {
      try {
        for (const [key, value] of Object.entries(process.env)) {
          // Skip if already in file
          if (parsed[key] !== undefined) continue;

          const shouldMask = mask && this.shouldMaskValue(key, maskPatterns);
          result.variables.push({
            key,
            value: shouldMask ? MASKED_VALUE : value || "",
            masked: shouldMask,
            source: "process",
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to process process.env: ${errorMsg}`);
        // Non-fatal - continue with file variables
        result.warnings.push(`Failed to include process.env variables: ${errorMsg}`);
      }
    }

    // Add common warnings
    this.addCommonWarnings(result, parsed);

    return this.formatResult(result, mask);
  }

  /**
   * Determines if a value should be masked based on patterns
   *
   * Checks if the environment variable key contains any of the mask patterns
   * (case-insensitive). Used to protect sensitive data like passwords and API keys.
   *
   * @param key - Environment variable key to check
   * @param maskPatterns - Array of pattern strings to match against the key
   * @returns true if the value should be masked, false otherwise
   *
   * @example
   * shouldMaskValue("API_KEY", ["KEY"]) // returns true
   * shouldMaskValue("USERNAME", ["KEY"]) // returns false
   */
  private static shouldMaskValue(
    key: string,
    maskPatterns: string[]
  ): boolean {
    const upperKey = key.toUpperCase();
    return maskPatterns.some((pattern) =>
      upperKey.includes(pattern.toUpperCase())
    );
  }

  /**
   * Adds common warnings based on environment variables
   *
   * Checks for missing common variables (NODE_ENV, DATABASE_URL, etc.) and adds
   * helpful warnings. Also includes a security reminder about .gitignore.
   *
   * @param result - Result object to add warnings to
   * @param parsed - Parsed environment variables from the .env file
   *
   * @example
   * // If NODE_ENV is missing, adds warning:
   * // "NODE_ENV is not set. Consider setting it to 'development', 'production', or 'test'"
   */
  private static addCommonWarnings(
    result: EnvResult,
    parsed: Record<string, string>
  ): void {
    // Check for NODE_ENV
    if (!parsed.NODE_ENV && !process.env.NODE_ENV) {
      result.warnings.push(
        "NODE_ENV is not set. Consider setting it to 'development', 'production', or 'test'"
      );
    }

    // Check for common required variables (informational only - may not apply to all projects)
    const commonVars = [
      "DATABASE_URL",
      "API_URL",
      "PORT",
      "HOST",
    ];
    const missingCommonVars = commonVars.filter(
      (v) => !parsed[v] && !process.env[v]
    );
    if (missingCommonVars.length > 0) {
      result.warnings.push(
        `Consider setting these common variables (if applicable): ${missingCommonVars.join(", ")}`
      );
    }

    // Security warning
    result.warnings.push(
      "SECURITY: Never commit .env files to version control. Ensure .env is in .gitignore"
    );
  }

  /**
   * Formats the result into a JSON string with structured output
   *
   * Converts the EnvResult into a user-friendly JSON format with metadata
   * about variables, masking status, and warnings. Uses Object.create(null)
   * for the variables object to avoid prototype pollution.
   *
   * @param result - Result object containing variables and warnings
   * @param mask - Whether masking is enabled
   * @returns Formatted JSON string with indentation
   *
   * @example
   * // Returns JSON like:
   * // {
   * //   "success": true,
   * //   "totalVariables": 2,
   * //   "variables": { "API_KEY": { "value": "***MASKED***", "masked": true, "source": "file" } },
   * //   ...
   * // }
   */
  private static formatResult(result: EnvResult, mask: boolean): string {
    // Use Object.create(null) to avoid prototype pollution
    const variables = Object.create(null) as Record<
      string,
      { value: string; masked: boolean; source: string }
    >;

    result.variables.forEach((v) => {
      variables[v.key] = {
        value: v.value,
        masked: v.masked,
        source: v.source,
      };
    });

    const output = {
      success: true,
      filePath: result.filePath,
      fileExists: result.fileExists,
      totalVariables: result.variables.length,
      maskedVariables: result.variables.filter((v) => v.masked).length,
      maskingEnabled: mask,
      variables,
      warnings: result.warnings.length > 0 ? result.warnings : undefined,
    };

    return JSON.stringify(output, null, JSON_INDENT);
  }
}
