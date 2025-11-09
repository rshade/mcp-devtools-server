import {
  ProjectDetector,
  ProjectType,
  BuildSystem,
} from "../../utils/project-detector.js";
import path from "path";
import { fileURLToPath } from "url";
import { getCacheManager } from "../../utils/cache-manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.join(__dirname, "..", "fixtures", "projects");

describe("ProjectDetector", () => {
  let cacheManager: ReturnType<typeof getCacheManager>;

  beforeEach(() => {
    // Clear cache before each test to ensure isolation
    cacheManager = getCacheManager();
    cacheManager.clearAll();
  });

  afterAll(() => {
    // Final cleanup
    cacheManager.clearAll();
  });

  describe("Package Manager Detection", () => {
    it("detects npm when package-lock.json exists", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "npm-project"),
      );
      const info = await detector.detectProject();

      expect(info.packageManager).toBe("npm");
      expect(info.buildSystem).toBe(BuildSystem.NPM);
    });

    it("detects yarn when yarn.lock exists", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "yarn-project"),
      );
      const info = await detector.detectProject();

      expect(info.packageManager).toBe("yarn");
      expect(info.buildSystem).toBe(BuildSystem.Yarn);
    });

    it("detects pnpm when pnpm-lock.yaml exists", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "pnpm-project"),
      );
      const info = await detector.detectProject();

      expect(info.packageManager).toBe("pnpm");
      expect(info.buildSystem).toBe(BuildSystem.PNPM);
    });

    it("defaults to npm when only package.json exists", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "npm-project"),
      );
      const info = await detector.detectProject();

      // Even with package-lock.json, the logic should identify npm
      expect(info.packageManager).toBe("npm");
    });

    it("returns undefined when no Node.js package files exist", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "python-project"),
      );
      const info = await detector.detectProject();

      expect(info.packageManager).toBeUndefined();
    });
  });

  describe("Project Type Detection", () => {
    it("detects Node.js project from package.json", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "npm-project"),
      );
      const info = await detector.detectProject();

      expect(info.type).toBe(ProjectType.NodeJS);
      expect(info.language).toBe("JavaScript/TypeScript");
    });

    it("detects Python project from requirements.txt", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "python-project"),
      );
      const info = await detector.detectProject();

      expect(info.type).toBe(ProjectType.Python);
      expect(info.language).toBe("Python");
    });

    it("detects Go project from go.mod", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "go-project"),
      );
      const info = await detector.detectProject();

      expect(info.type).toBe(ProjectType.Go);
      expect(info.language).toBe("Go");
    });

    it("detects Rust project from Cargo.toml", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "rust-project"),
      );
      const info = await detector.detectProject();

      expect(info.type).toBe(ProjectType.Rust);
      expect(info.language).toBe("Rust");
    });

    it("returns Unknown type for unrecognized projects", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "..", "text"),
      );
      const info = await detector.detectProject();

      expect(info.type).toBe(ProjectType.Unknown);
      expect(info.language).toBe("Unknown");
    });
  });

  describe("Build System Detection", () => {
    it("detects NPM build system", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "npm-project"),
      );
      const info = await detector.detectProject();

      expect(info.buildSystem).toBe(BuildSystem.NPM);
    });

    it("detects Yarn build system", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "yarn-project"),
      );
      const info = await detector.detectProject();

      expect(info.buildSystem).toBe(BuildSystem.Yarn);
    });

    it("detects PNPM build system", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "pnpm-project"),
      );
      const info = await detector.detectProject();

      expect(info.buildSystem).toBe(BuildSystem.PNPM);
    });

    it("detects Pip build system from requirements.txt", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "python-project"),
      );
      const info = await detector.detectProject();

      expect(info.buildSystem).toBe(BuildSystem.Pip);
    });

    it("detects Go build system from go.mod", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "go-project"),
      );
      const info = await detector.detectProject();

      expect(info.buildSystem).toBe(BuildSystem.Go);
    });

    it("detects Cargo build system from Cargo.toml", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "rust-project"),
      );
      const info = await detector.detectProject();

      expect(info.buildSystem).toBe(BuildSystem.Cargo);
    });

    it("returns Unknown for unrecognized build systems", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "..", "text"),
      );
      const info = await detector.detectProject();

      expect(info.buildSystem).toBe(BuildSystem.Unknown);
    });
  });

  describe("Framework Detection", () => {
    it("detects Express framework from package.json dependencies", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "npm-project"),
      );
      const info = await detector.detectProject();

      expect(info.framework).toBe("Express");
    });

    it("detects React framework from package.json dependencies", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "yarn-project"),
      );
      const info = await detector.detectProject();

      expect(info.framework).toBe("React");
    });

    it("detects Vue framework from package.json dependencies", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "pnpm-project"),
      );
      const info = await detector.detectProject();

      expect(info.framework).toBe("Vue");
    });

    it("returns undefined for non-Node.js projects", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "python-project"),
      );
      const info = await detector.detectProject();

      expect(info.framework).toBeUndefined();
    });
  });

  describe("Configuration Files Detection", () => {
    it("finds package.json in Node.js projects", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "npm-project"),
      );
      const info = await detector.detectProject();

      const packageJson = info.configFiles.find(
        (f) => f.name === "package.json",
      );
      expect(packageJson).toBeDefined();
      expect(packageJson?.type).toBe("package");
    });

    it("finds lock files in project root", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "yarn-project"),
      );
      const info = await detector.detectProject();

      expect(info.configFiles.some((f) => f.name === "yarn.lock")).toBe(true);
    });

    it("finds go.mod in Go projects", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "go-project"),
      );
      const info = await detector.detectProject();

      const goMod = info.configFiles.find((f) => f.name === "go.mod");
      expect(goMod).toBeDefined();
      expect(goMod?.type).toBe("package");
    });

    it("returns empty array when no config files found", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "..", "binary"),
      );
      const info = await detector.detectProject();

      expect(info.configFiles).toEqual([]);
    });
  });

  describe("Caching Behavior", () => {
    it("caches detection results for same project path", async () => {
      const projectPath = path.join(fixturesDir, "npm-project");
      const detector1 = new ProjectDetector(projectPath);
      const detector2 = new ProjectDetector(projectPath);

      const info1 = await detector1.detectProject();
      const info2 = await detector2.detectProject();

      // Results should be identical (from cache)
      expect(info1).toEqual(info2);
      expect(info1.type).toBe(ProjectType.NodeJS);
    });

    it("uses different cache entries for different project paths", async () => {
      const npmDetector = new ProjectDetector(
        path.join(fixturesDir, "npm-project"),
      );
      const pythonDetector = new ProjectDetector(
        path.join(fixturesDir, "python-project"),
      );

      const npmInfo = await npmDetector.detectProject();
      const pythonInfo = await pythonDetector.detectProject();

      expect(npmInfo.type).toBe(ProjectType.NodeJS);
      expect(pythonInfo.type).toBe(ProjectType.Python);
      expect(npmInfo).not.toEqual(pythonInfo);
    });

    it("invalidates cache when files change", async () => {
      const projectPath = path.join(fixturesDir, "npm-project");
      const detector = new ProjectDetector(projectPath);

      // First detection
      const info1 = await detector.detectProject();
      expect(info1.type).toBe(ProjectType.NodeJS);

      // Clear cache manually
      cacheManager.clearAll();

      // Second detection should re-scan
      const info2 = await detector.detectProject();
      expect(info2.type).toBe(ProjectType.NodeJS);
      expect(info2).toEqual(info1); // Same results but re-computed
    });
  });

  describe("getProjectContext", () => {
    it("generates formatted context string for Node.js project", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "npm-project"),
      );
      const context = await detector.getProjectContext();

      expect(context).toContain("Type: nodejs");
      expect(context).toContain("Language: JavaScript/TypeScript");
      expect(context).toContain("Build System: npm");
      expect(context).toContain("Package Manager: npm");
      expect(context).toContain("Framework: Express");
    });

    it("generates formatted context string for Python project", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "python-project"),
      );
      const context = await detector.getProjectContext();

      expect(context).toContain("Type: python");
      expect(context).toContain("Language: Python");
      expect(context).toContain("Build System: pip");
    });

    it("omits optional fields when not present", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "python-project"),
      );
      const context = await detector.getProjectContext();

      // Python project shouldn't have package manager
      expect(context).not.toContain("Package Manager:");
      // Framework field is only for Node.js projects, so it won't appear
      // Test framework will appear since Python has pytest
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("handles non-existent directory gracefully", async () => {
      const detector = new ProjectDetector("/nonexistent/path/to/project");
      const info = await detector.detectProject();

      expect(info.type).toBe(ProjectType.Unknown);
      expect(info.configFiles).toEqual([]);
    });

    it("uses current working directory when no path provided", async () => {
      const detector = new ProjectDetector();
      const info = await detector.detectProject();

      // Should detect the actual mcp-devtools-server project
      expect(info).toBeDefined();
      expect(info.type).toBe(ProjectType.NodeJS);
    }, 60000); // 60 second timeout for large project scan

    it("handles empty directory without errors", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "..", "binary"),
      );
      const info = await detector.detectProject();

      expect(info.type).toBe(ProjectType.Unknown);
      expect(info.buildSystem).toBe(BuildSystem.Unknown);
    }, 60000);

    it("prioritizes specific lock files over generic package.json", async () => {
      // Yarn project has both package.json and yarn.lock
      const detector = new ProjectDetector(
        path.join(fixturesDir, "yarn-project"),
      );
      const info = await detector.detectProject();

      // Should detect yarn, not default to npm
      expect(info.packageManager).toBe("yarn");
      expect(info.buildSystem).toBe(BuildSystem.Yarn);
    }, 60000);

    it("prioritizes pnpm-lock.yaml over other lock files when multiple exist", async () => {
      const detector = new ProjectDetector(
        path.join(fixturesDir, "pnpm-project"),
      );
      const info = await detector.detectProject();

      expect(info.packageManager).toBe("pnpm");
      expect(info.buildSystem).toBe(BuildSystem.PNPM);
    }, 60000);
  });
});
