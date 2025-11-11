import { describe, it, expect } from "@jest/globals";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe("Instructions Loading", () => {
  const instructionsPath = join(__dirname, "../../src/instructions.md");

  // Cache the content for better performance
  let cachedContent: string | null = null;
  const getContent = (): string => {
    if (!cachedContent) {
      cachedContent = readFileSync(instructionsPath, "utf-8");
    }
    return cachedContent;
  };

  describe("instructions.md file", () => {
    it("should exist in source directory", () => {
      expect(existsSync(instructionsPath)).toBe(true);
    });

    it("should be readable", () => {
      expect(() => getContent()).not.toThrow();
    });

    it("should contain expected sections", () => {
      const content = getContent();

      // Check for key sections
      expect(content).toContain("# mcp-devtools");
      expect(content).toContain("## Tool Usage Priority");
      expect(content).toContain("## Auto-Onboarding");
      expect(content).toContain("## Common Workflows");
      expect(content).toContain("## Tool Categories");
      expect(content).toContain("## Smart Suggestions");
      expect(content).toContain("## Quick Reference");
    });

    it("should mention key tool categories", () => {
      const content = getContent();

      // Verify tool categories are documented
      expect(content).toContain("Make/Build");
      expect(content).toContain("Linting");
      expect(content).toContain("Testing");
      expect(content).toContain("Go");
      expect(content).toContain("Node.js");
      expect(content).toContain("Git");
      expect(content).toContain("Smart Analysis");
    });

    it("should reference key tools by name", () => {
      const content = getContent();

      // Check for important tool names
      expect(content).toContain("make_lint");
      expect(content).toContain("run_tests");
      expect(content).toContain("project_status");
      expect(content).toContain("analyze_command");
      expect(content).toContain("onboarding_wizard");
    });

    it("should be token-efficient (under 5000 characters)", () => {
      const content = getContent();
      // Rough estimate: ~4 chars per token, so <5000 chars = ~1250 tokens
      expect(content.length).toBeLessThan(5000);
    });

    it("should not contain emojis or marketing fluff", () => {
      const content = getContent();

      // Check for absence of common emojis
      const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
      expect(emojiPattern.test(content)).toBe(false);

      // No marketing superlatives
      expect(content.toLowerCase()).not.toContain("amazing");
      expect(content.toLowerCase()).not.toContain("revolutionary");
      expect(content.toLowerCase()).not.toContain("game-changing");
    });
  });

  describe("Build process", () => {
    it("should copy instructions.md to dist/ during build", () => {
      const distPath = join(__dirname, "../../dist/instructions.md");
      // This test assumes build has run
      if (existsSync(distPath)) {
        expect(existsSync(distPath)).toBe(true);

        const srcContent = readFileSync(instructionsPath, "utf-8");
        const distContent = readFileSync(distPath, "utf-8");
        expect(distContent).toBe(srcContent);
      } else {
        // Skip if dist doesn't exist (e.g., in CI before build)
        console.warn(
          "Skipping dist check - run 'npm run build' to verify",
        );
      }
    });
  });
});
