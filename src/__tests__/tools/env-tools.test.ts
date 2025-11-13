import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { EnvTools, DotenvEnvironmentArgsSchema } from "../../tools/env-tools.js";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

describe("EnvTools", () => {
  let tempDir: string;

  // Create temp directory once for all tests
  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "env-tools-test-"));
  });

  // Clean up once after all tests
  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn("Failed to clean up temp directory:", error);
    }
  });

  describe("DotenvEnvironmentArgsSchema", () => {
    it("should validate with defaults", () => {
      const result = DotenvEnvironmentArgsSchema.parse({});
      expect(result.mask).toBe(true);
      expect(result.includeProcessEnv).toBe(false);
    });

    it("should accept all valid arguments", () => {
      const result = DotenvEnvironmentArgsSchema.parse({
        file: ".env.test",
        mask: false,
        maskPatterns: ["CUSTOM_SECRET"],
        includeProcessEnv: true,
        directory: "/tmp",
      });
      expect(result.file).toBe(".env.test");
      expect(result.mask).toBe(false);
      expect(result.maskPatterns).toEqual(["CUSTOM_SECRET"]);
      expect(result.includeProcessEnv).toBe(true);
      expect(result.directory).toBe("/tmp");
    });
  });

  describe("dotenvEnvironment", () => {
    it("should return error when .env file does not exist", async () => {
      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.nonexistent",
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("not found");
      expect(parsed.suggestion).toContain("Create");
    });

    it("should load and parse .env file", async () => {
      const envPath = path.join(tempDir, ".env.basic");
      await fs.writeFile(envPath, "NODE_ENV=test\nPORT=3000\nDB_URL=postgres://localhost/test\n");

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.basic",
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.totalVariables).toBe(3);
      expect(parsed.variables.NODE_ENV.value).toBe("test");
      expect(parsed.variables.PORT.value).toBe("3000");
      expect(parsed.variables.DB_URL.value).toBe("postgres://localhost/test");
    });

    it("should mask sensitive values by default", async () => {
      const envPath = path.join(tempDir, ".env.masked");
      await fs.writeFile(envPath, "API_KEY=secret123\nPASSWORD=mypass\nUSERNAME=john\n");

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.masked",
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.maskedVariables).toBe(2);
      expect(parsed.variables.API_KEY.value).toBe("***MASKED***");
      expect(parsed.variables.PASSWORD.value).toBe("***MASKED***");
      expect(parsed.variables.USERNAME.value).toBe("john");
    });

    it("should not mask values when mask is false", async () => {
      const envPath = path.join(tempDir, ".env.unmasked");
      await fs.writeFile(envPath, "API_KEY=secret123\nPASSWORD=mypass\n");

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.unmasked",
        mask: false,
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.maskedVariables).toBe(0);
      expect(parsed.variables.API_KEY.value).toBe("secret123");
      expect(parsed.variables.PASSWORD.value).toBe("mypass");
    });

    it("should support custom mask patterns", async () => {
      const envPath = path.join(tempDir, ".env.custom");
      await fs.writeFile(envPath, "MY_CUSTOM_SECRET=secret\nAPI_KEY=key123\nPUBLIC_VAR=public\n");

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.custom",
        maskPatterns: ["CUSTOM"],
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.maskedVariables).toBe(2);
      expect(parsed.variables.MY_CUSTOM_SECRET.masked).toBe(true);
      expect(parsed.variables.API_KEY.masked).toBe(true);
      expect(parsed.variables.PUBLIC_VAR.masked).toBe(false);
    });

    it("should warn when file is empty", async () => {
      const envPath = path.join(tempDir, ".env.empty");
      await fs.writeFile(envPath, "");

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.empty",
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.totalVariables).toBe(0);
      expect(parsed.warnings).toBeDefined();
      expect(parsed.warnings.some((w: string) => w.includes("empty"))).toBe(true);
    });

    it("should include common warnings", async () => {
      const envPath = path.join(tempDir, ".env.warnings");
      await fs.writeFile(envPath, "SOME_VAR=value\n");

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.warnings",
      });

      const parsed = JSON.parse(result);
      expect(parsed.warnings).toBeDefined();
      expect(parsed.warnings.length).toBeGreaterThan(0);
      expect(parsed.warnings.some((w: string) => w.includes("SECURITY"))).toBe(true);
    });

    it("should optionally include process.env", async () => {
      const envPath = path.join(tempDir, ".env.process");
      await fs.writeFile(envPath, "FROM_FILE=filevalue\n");
      process.env.TEST_ENV_VAR_FROM_PROC = "testvalue";

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.process",
        includeProcessEnv: true,
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.variables.FROM_FILE).toBeDefined();
      expect(parsed.variables.FROM_FILE.source).toBe("file");
      expect(parsed.variables.TEST_ENV_VAR_FROM_PROC).toBeDefined();
      expect(parsed.variables.TEST_ENV_VAR_FROM_PROC.source).toBe("process");

      delete process.env.TEST_ENV_VAR_FROM_PROC;
    });

    it("should mask all default sensitive patterns", async () => {
      const envPath = path.join(tempDir, ".env.patterns");
      await fs.writeFile(
        envPath,
        "DB_PASSWORD=pass\nAPI_SECRET=secret\nAUTH_TOKEN=token\nENCRYPTION_KEY=key\nPRIVATE_KEY=private\nCREDENTIALS=creds\nPUBLIC_VAR=public\n"
      );

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.patterns",
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.maskedVariables).toBe(6);
      expect(parsed.variables.PUBLIC_VAR.masked).toBe(false);
    });

    it("should prevent directory traversal attacks", async () => {
      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: "../../etc/passwd",
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("directory traversal");
    });

    // Edge case tests
    it("should handle quoted values", async () => {
      const envPath = path.join(tempDir, ".env.quoted");
      await fs.writeFile(envPath, 'VAR1="value with spaces"\nVAR2=\'single quotes\'\n');

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.quoted",
        mask: false,
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.variables.VAR1.value).toBe("value with spaces");
      expect(parsed.variables.VAR2.value).toBe("single quotes");
    });

    it("should handle unicode characters", async () => {
      const envPath = path.join(tempDir, ".env.unicode");
      await fs.writeFile(envPath, "GREETING=Hello 世界 🌍\n");

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.unicode",
        mask: false,
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.variables.GREETING.value).toBe("Hello 世界 🌍");
    });

    it("should handle empty values", async () => {
      const envPath = path.join(tempDir, ".env.emptyvals");
      await fs.writeFile(envPath, 'EMPTY_VAR=\nWHITESPACE_VAR="   "\n');

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.emptyvals",
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.variables.EMPTY_VAR.value).toBe("");
      // dotenv preserves whitespace when quoted
      expect(parsed.variables.WHITESPACE_VAR.value).toBe("   ");
    });

    it("should handle case-insensitive masking patterns", async () => {
      const envPath = path.join(tempDir, ".env.casetest");
      await fs.writeFile(envPath, "api_key=lowercase\nAPI_KEY=uppercase\nApi_Key=mixedcase\n");

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.casetest",
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(true);
      expect(parsed.maskedVariables).toBe(3);
      expect(parsed.variables.api_key.masked).toBe(true);
      expect(parsed.variables.API_KEY.masked).toBe(true);
      expect(parsed.variables.Api_Key.masked).toBe(true);
    });

    it("should reject files larger than 1MB", async () => {
      const envPath = path.join(tempDir, ".env.large");
      // Create a 2MB file
      const largeContent = "X=".concat("A".repeat(2 * 1024 * 1024));
      await fs.writeFile(envPath, largeContent);

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.large",
      });

      const parsed = JSON.parse(result);
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("File too large");
    });

    it("should not duplicate vars from process.env if in file", async () => {
      const envPath = path.join(tempDir, ".env.nodup");
      await fs.writeFile(envPath, "SHARED_VAR=fromfile\n");
      process.env.SHARED_VAR = "fromprocess";

      const result = await EnvTools.dotenvEnvironment({
        directory: tempDir,
        file: ".env.nodup",
        includeProcessEnv: true,
      });

      const parsed = JSON.parse(result);
      expect(parsed.variables.SHARED_VAR.value).toBe("fromfile");
      expect(parsed.variables.SHARED_VAR.source).toBe("file");

      delete process.env.SHARED_VAR;
    });
  });
});
