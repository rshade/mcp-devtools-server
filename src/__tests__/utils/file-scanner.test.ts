import { FileScanner } from "../../utils/file-scanner";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, "..", "fixtures");

describe("FileScanner", () => {
  let scanner: FileScanner;

  beforeEach(() => {
    scanner = new FileScanner();
  });

  describe("scan", () => {
    it("should find files matching single pattern", async () => {
      const files = await scanner.scan({
        patterns: ["**/*.txt"],
        cwd: fixturesDir,
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f) => f.endsWith(".txt"))).toBe(true);
    });

    it("should find files matching multiple patterns", async () => {
      const files = await scanner.scan({
        patterns: ["text/**/*.txt", "edge-cases/**/*.txt"],
        cwd: fixturesDir,
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f) => f.endsWith(".txt"))).toBe(true);
    });

    it("should exclude patterns correctly", async () => {
      const files = await scanner.scan({
        patterns: ["**/*.txt"],
        exclude: ["binary/**"],
        cwd: fixturesDir,
      });

      expect(files.every((f) => !f.includes("binary"))).toBe(true);
    });

    it("should filter by file types", async () => {
      const files = await scanner.scan({
        patterns: ["**/*"],
        fileTypes: ["*.txt"],
        cwd: fixturesDir,
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f) => f.endsWith(".txt"))).toBe(true);
    });

    it("should return absolute paths", async () => {
      const files = await scanner.scan({
        patterns: ["**/*.txt"],
        cwd: fixturesDir,
      });

      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f) => path.isAbsolute(f))).toBe(true);
    });

    it("should handle non-existent patterns gracefully", async () => {
      const files = await scanner.scan({
        patterns: ["non-existent-pattern-*.xyz"],
        cwd: fixturesDir,
      });

      expect(files).toEqual([]);
    });

    it("should deduplicate files from overlapping patterns", async () => {
      const files = await scanner.scan({
        patterns: ["**/*.txt", "text/**/*.txt"],
        cwd: fixturesDir,
      });

      const uniqueFiles = new Set(files);
      expect(files.length).toBe(uniqueFiles.size);
    });

    it("should return sorted file list", async () => {
      const files = await scanner.scan({
        patterns: ["**/*.txt"],
        cwd: fixturesDir,
      });

      const sortedFiles = [...files].sort();
      expect(files).toEqual(sortedFiles);
    });
  });
});
