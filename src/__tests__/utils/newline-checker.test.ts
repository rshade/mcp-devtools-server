import { NewlineChecker } from "../../utils/newline-checker";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, "..", "fixtures");

describe("NewlineChecker", () => {
  let checker: NewlineChecker;

  beforeEach(() => {
    checker = new NewlineChecker();
  });

  describe("check", () => {
    it("should detect missing newlines in LF files", async () => {
      const filePath = path.join(fixturesDir, "text", "lf-without-newline.txt");
      const result = await checker.check(filePath);

      expect(result.hasTrailingNewline).toBe(false);
      expect(result.isBinary).toBe(false);
      expect(result.lineEnding).toBe("\n");
    });

    it("should detect existing newlines in LF files", async () => {
      const filePath = path.join(fixturesDir, "text", "lf-with-newline.txt");
      const result = await checker.check(filePath);

      expect(result.hasTrailingNewline).toBe(true);
      expect(result.isBinary).toBe(false);
      expect(result.lineEnding).toBe("\n");
    });

    it("should detect missing newlines in CRLF files", async () => {
      const filePath = path.join(
        fixturesDir,
        "text",
        "crlf-without-newline.txt",
      );
      const result = await checker.check(filePath);

      expect(result.hasTrailingNewline).toBe(false);
      expect(result.isBinary).toBe(false);
      expect(result.lineEnding).toBe("\r\n");
    });

    it("should detect existing newlines in CRLF files", async () => {
      const filePath = path.join(fixturesDir, "text", "crlf-with-newline.txt");
      const result = await checker.check(filePath);

      expect(result.hasTrailingNewline).toBe(true);
      expect(result.isBinary).toBe(false);
      expect(result.lineEnding).toBe("\r\n");
    });

    it("should handle empty files", async () => {
      const filePath = path.join(fixturesDir, "text", "empty.txt");
      const result = await checker.check(filePath);

      expect(result.hasTrailingNewline).toBe(true);
      expect(result.isBinary).toBe(false);
      expect(result.fileSize).toBe(0);
    });

    it("should detect binary files", async () => {
      const filePath = path.join(fixturesDir, "binary", "test.bin");
      const result = await checker.check(filePath);

      expect(result.isBinary).toBe(true);
      expect(result.hasTrailingNewline).toBe(true); // Skips binary files
    });

    it("should handle files with only newline", async () => {
      const filePath = path.join(fixturesDir, "edge-cases", "only-newline.txt");
      const result = await checker.check(filePath);

      expect(result.hasTrailingNewline).toBe(true);
      expect(result.isBinary).toBe(false);
    });

    it("should detect line endings in mixed files", async () => {
      const filePath = path.join(fixturesDir, "text", "mixed-line-endings.txt");
      const result = await checker.check(filePath);

      expect(result.hasTrailingNewline).toBe(true);
      expect(result.isBinary).toBe(false);
      // Should detect predominant line ending (2 CRLF vs 2 LF)
      expect(result.lineEnding).toMatch(/\n|\r\n/);
    });
  });

  describe("fix", () => {
    let tempDir: string;

    beforeEach(async () => {
      // Use OS temp directory for better CI compatibility
      tempDir = await fs.mkdtemp(
        path.join(os.tmpdir(), "newline-checker-test-"),
      );
    });

    afterEach(async () => {
      // Clean up temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        // Ignore cleanup errors
        console.warn("Failed to clean up temp directory:", error);
      }
    });

    it("should add LF newline to Unix-style files", async () => {
      const sourcePath = path.join(
        fixturesDir,
        "text",
        "lf-without-newline.txt",
      );
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      const fixed = await checker.fix(testPath, "\n");

      expect(fixed).toBe(true);

      const checkResult = await checker.check(testPath);
      expect(checkResult.hasTrailingNewline).toBe(true);
    });

    it("should add CRLF newline to Windows-style files", async () => {
      const sourcePath = path.join(
        fixturesDir,
        "text",
        "crlf-without-newline.txt",
      );
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      const fixed = await checker.fix(testPath, "\r\n");

      expect(fixed).toBe(true);

      const checkResult = await checker.check(testPath);
      expect(checkResult.hasTrailingNewline).toBe(true);
    });

    it("should not modify files that already have newlines", async () => {
      const sourcePath = path.join(fixturesDir, "text", "lf-with-newline.txt");
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      const contentBefore = await fs.readFile(testPath, "utf8");
      const fixed = await checker.fix(testPath, "\n");
      const contentAfter = await fs.readFile(testPath, "utf8");

      expect(fixed).toBe(false);
      expect(contentBefore).toBe(contentAfter);
    });

    it("should skip binary files", async () => {
      const sourcePath = path.join(fixturesDir, "binary", "test.bin");
      const testPath = path.join(tempDir, "test.bin");

      // Ensure source file exists before copying
      await fs.access(sourcePath);
      await fs.copyFile(sourcePath, testPath);

      // Verify the file was copied
      await fs.access(testPath);

      const contentBefore = await fs.readFile(testPath);
      const fixed = await checker.fix(testPath);
      const contentAfter = await fs.readFile(testPath);

      expect(fixed).toBe(false);
      expect(Buffer.compare(contentBefore, contentAfter)).toBe(0);
    });

    it("should use detected line ending style", async () => {
      const sourcePath = path.join(
        fixturesDir,
        "text",
        "crlf-without-newline.txt",
      );
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      // Fix without specifying line ending - should detect CRLF
      await checker.fix(testPath);

      const content = await fs.readFile(testPath);
      // Check last two bytes for CRLF
      expect(content[content.length - 2]).toBe(0x0d); // CR
      expect(content[content.length - 1]).toBe(0x0a); // LF
    });
  });
});
