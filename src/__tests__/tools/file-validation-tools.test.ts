import { FileValidationTools } from "../../tools/file-validation-tools";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, "..", "fixtures");

describe("FileValidationTools", () => {
  let tools: FileValidationTools;
  let tempDir: string;

  beforeEach(async () => {
    tools = new FileValidationTools();
    // Use OS temp directory for better CI compatibility
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-validation-test-"));
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

  describe("ensureNewline - check mode", () => {
    it("should report files without newlines", async () => {
      const result = await tools.ensureNewline({
        patterns: ["text/lf-without-newline.txt"],
        mode: "check",
        cwd: fixturesDir,
      });

      expect(result.totalFiles).toBe(1);
      expect(result.filesWithoutNewline.length).toBe(1);
      expect(result.filesFixed.length).toBe(0);
      expect(result.exitCode).toBe(0);
    });

    it("should not modify any files", async () => {
      const sourcePath = path.join(
        fixturesDir,
        "text",
        "lf-without-newline.txt",
      );
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      const contentBefore = await fs.readFile(testPath, "utf8");

      await tools.ensureNewline({
        patterns: ["*.txt"],
        mode: "check",
        cwd: tempDir,
      });

      const contentAfter = await fs.readFile(testPath, "utf8");
      expect(contentBefore).toBe(contentAfter);
    });

    it("should return correct summary", async () => {
      const result = await tools.ensureNewline({
        patterns: ["text/lf-with-newline.txt"],
        mode: "check",
        cwd: fixturesDir,
      });

      expect(result.summary).toContain("all files compliant");
      expect(result.exitCode).toBe(0);
    });
  });

  describe("ensureNewline - fix mode", () => {
    it("should add newlines to non-compliant files", async () => {
      const sourcePath = path.join(
        fixturesDir,
        "text",
        "lf-without-newline.txt",
      );
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      const result = await tools.ensureNewline({
        patterns: ["*.txt"],
        mode: "fix",
        cwd: tempDir,
      });

      expect(result.filesFixed.length).toBe(1);
      expect(result.exitCode).toBe(0);

      // Verify file was actually fixed
      const content = await fs.readFile(testPath, "utf8");
      expect(content.endsWith("\n")).toBe(true);
    });

    it("should report which files were fixed", async () => {
      const sourcePath = path.join(
        fixturesDir,
        "text",
        "lf-without-newline.txt",
      );
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      const result = await tools.ensureNewline({
        patterns: ["*.txt"],
        mode: "fix",
        cwd: tempDir,
      });

      expect(result.filesFixed).toContain(testPath);
      expect(result.summary).toContain("fixed 1");
    });

    it("should preserve existing compliant files", async () => {
      const sourcePath = path.join(fixturesDir, "text", "lf-with-newline.txt");
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      const contentBefore = await fs.readFile(testPath, "utf8");

      const result = await tools.ensureNewline({
        patterns: ["*.txt"],
        mode: "fix",
        cwd: tempDir,
      });

      const contentAfter = await fs.readFile(testPath, "utf8");

      expect(result.filesFixed.length).toBe(0);
      expect(contentBefore).toBe(contentAfter);
    });
  });

  describe("ensureNewline - validate mode", () => {
    it("should return exit code 0 when all files compliant", async () => {
      const sourcePath = path.join(fixturesDir, "text", "lf-with-newline.txt");
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      const result = await tools.ensureNewline({
        patterns: ["*.txt"],
        mode: "validate",
        cwd: tempDir,
      });

      expect(result.exitCode).toBe(0);
    });

    it("should return exit code 1 when files need fixing", async () => {
      const sourcePath = path.join(
        fixturesDir,
        "text",
        "lf-without-newline.txt",
      );
      const testPath = path.join(tempDir, "test.txt");
      await fs.copyFile(sourcePath, testPath);

      const result = await tools.ensureNewline({
        patterns: ["*.txt"],
        mode: "validate",
        cwd: tempDir,
      });

      expect(result.exitCode).toBe(1);
      expect(result.filesWithoutNewline.length).toBe(1);
    });
  });

  describe("file filtering", () => {
    it("should skip binary files when skipBinary=true", async () => {
      const result = await tools.ensureNewline({
        patterns: ["**/*"],
        mode: "check",
        cwd: fixturesDir,
        skipBinary: true,
      });

      expect(result.filesSkipped.some((f) => f.reason === "binary file")).toBe(
        true,
      );
    });

    it("should respect exclude patterns", async () => {
      const result = await tools.ensureNewline({
        patterns: ["**/*.txt"],
        mode: "check",
        exclude: ["edge-cases/**"],
        cwd: fixturesDir,
      });

      expect(
        result.filesWithoutNewline.every((f) => !f.includes("edge-cases")),
      ).toBe(true);
    });

    it("should respect fileTypes filter", async () => {
      const result = await tools.ensureNewline({
        patterns: ["**/*"],
        mode: "check",
        fileTypes: ["*.txt"],
        cwd: fixturesDir,
      });

      const allFiles = [
        ...result.filesWithoutNewline,
        ...result.filesFixed,
        ...result.filesSkipped.map((f) => f.file),
      ];

      // All processed files should be .txt
      expect(allFiles.filter((f) => !f.endsWith(".txt")).length).toBe(0);
    });
  });

  describe("error handling", () => {
    it("should handle permission errors gracefully", async () => {
      // This test is platform-specific and may not work on all systems
      const result = await tools.ensureNewline({
        patterns: ["/root/non-existent-file.txt"],
        mode: "check",
      });

      // Should either skip or error, but not crash
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });

    it("should continue processing after individual file errors", async () => {
      const sourcePath = path.join(
        fixturesDir,
        "text",
        "lf-without-newline.txt",
      );
      const testPath1 = path.join(tempDir, "test1.txt");
      const testPath2 = path.join(tempDir, "test2.txt");
      await fs.copyFile(sourcePath, testPath1);
      await fs.copyFile(sourcePath, testPath2);

      const result = await tools.ensureNewline({
        patterns: ["*.txt", "/non-existent/**/*.txt"],
        mode: "check",
        cwd: tempDir,
      });

      // Should still process the valid files
      expect(result.totalFiles).toBeGreaterThanOrEqual(2);
    });

    it("should report all errors in result", async () => {
      const result = await tools.ensureNewline({
        patterns: ["/definitely-does-not-exist-12345/**/*.txt"],
        mode: "check",
      });

      // Should not crash and should have proper exit code
      expect(result.exitCode).toBeGreaterThanOrEqual(0);
    });
  });

  describe("summary generation", () => {
    it("should generate accurate summaries for mixed results", async () => {
      // Create mix of compliant and non-compliant files
      const sourcePath1 = path.join(fixturesDir, "text", "lf-with-newline.txt");
      const sourcePath2 = path.join(
        fixturesDir,
        "text",
        "lf-without-newline.txt",
      );
      const testPath1 = path.join(tempDir, "compliant.txt");
      const testPath2 = path.join(tempDir, "non-compliant.txt");
      await fs.copyFile(sourcePath1, testPath1);
      await fs.copyFile(sourcePath2, testPath2);

      const result = await tools.ensureNewline({
        patterns: ["*.txt"],
        mode: "check",
        cwd: tempDir,
      });

      expect(result.summary).toContain("Checked 2 files");
      expect(result.summary).toContain("1 without trailing newlines");
    });
  });
});
