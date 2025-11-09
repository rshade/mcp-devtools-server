import winston from "winston";
import { ProjectProfile, MCPDevToolsConfig } from "./onboarding-wizard.js";
import { ProjectType, BuildSystem } from "./project-detector.js";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.simple(),
  transports: [new winston.transports.Console()],
});

/**
 * ConfigGenerator creates intelligent .mcp-devtools.json configurations
 * based on detected project characteristics
 */
export class ConfigGenerator {
  /**
   * Generate a complete MCP DevTools configuration from a project profile
   */
  generateConfig(profile: ProjectProfile): MCPDevToolsConfig {
    logger.info(`Generating configuration for ${profile.projectType} project`);

    const config: MCPDevToolsConfig = {
      $schema: "./.mcp-devtools.schema.json",
    };

    // Core configuration
    config.commands = this.generateCommands(profile);
    config.linters = this.generateLinters(profile);
    config.testRunner = this.generateTestRunner(profile);
    config.timeout = this.generateTimeout(profile);
    config.projectType = profile.projectType;
    config.buildSystem = profile.buildSystem;

    // Path configuration
    config.excludePaths = this.generateExcludePaths(profile);

    // Environment variables
    const env = this.generateEnvironment(profile);
    if (Object.keys(env).length > 0) {
      config.environment = env;
    }

    // Parallel execution settings
    config.parallel = this.generateParallelSettings(profile);

    // Security settings
    config.security = this.generateSecuritySettings(profile);

    // Make targets (if available)
    if (
      profile.projectInfo.makeTargets &&
      profile.projectInfo.makeTargets.length > 0
    ) {
      config.makeTargets = profile.projectInfo.makeTargets;
    }

    // Language-specific configurations
    switch (profile.projectType) {
      case ProjectType.Go:
        config.golang = this.generateGoConfig(profile);
        break;
      // Future: Add Node, Python, Rust specific configs
    }

    // File validation
    config.fileValidation = this.generateFileValidationConfig(profile);

    return config;
  }

  /**
   * Generate command mappings based on project type and build system
   */
  private generateCommands(profile: ProjectProfile): Record<string, string> {
    const commands: Record<string, string> = {};

    // If Makefile exists, prefer make commands
    if (
      profile.buildSystem === BuildSystem.Make &&
      profile.projectInfo.makeTargets
    ) {
      const targets = profile.projectInfo.makeTargets;

      if (targets.includes("lint")) commands.lint = "make lint";
      if (targets.includes("test")) commands.test = "make test";
      if (targets.includes("build")) commands.build = "make build";
      if (targets.includes("clean")) commands.clean = "make clean";
      if (targets.includes("depend") || targets.includes("deps")) {
        commands.depend = targets.includes("depend")
          ? "make depend"
          : "make deps";
      }

      // If make has all standard targets, we're done
      if (Object.keys(commands).length >= 4) {
        return commands;
      }
    }

    // Otherwise, generate commands based on project type
    switch (profile.projectType) {
      case ProjectType.NodeJS:
        return this.generateNodeCommands(profile);
      case ProjectType.Go:
        return this.generateGoCommands(profile);
      case ProjectType.Python:
        return this.generatePythonCommands(profile);
      case ProjectType.Rust:
        return this.generateRustCommands(profile);
      case ProjectType.Java:
        return this.generateJavaCommands(profile);
      default:
        return this.generateDefaultCommands(profile);
    }
  }

  private generateNodeCommands(
    profile: ProjectProfile,
  ): Record<string, string> {
    const pm =
      profile.buildSystem === BuildSystem.NPM
        ? "npm"
        : profile.buildSystem === BuildSystem.Yarn
          ? "yarn"
          : profile.buildSystem === BuildSystem.PNPM
            ? "pnpm"
            : "npm";

    // Check for make targets
    const hasMakeClean =
      profile.projectInfo.makeTargets?.includes("clean") || false;

    return {
      lint: `${pm} run lint`,
      test: `${pm} test`,
      build: `${pm} run build`,
      clean: hasMakeClean ? "make clean" : "rm -rf dist build",
      depend: pm === "npm" ? "npm install" : `${pm} install`,
    };
  }

  private generateGoCommands(profile: ProjectProfile): Record<string, string> {
    const useMake = profile.buildSystem === BuildSystem.Make;
    const hasGoMod = profile.projectInfo.configFiles.some(
      (f) => f.name === "go.mod",
    );

    return {
      lint:
        useMake && profile.projectInfo.makeTargets?.includes("lint")
          ? "make lint"
          : "golangci-lint run",
      test:
        useMake && profile.projectInfo.makeTargets?.includes("test")
          ? "make test"
          : "go test -v -cover ./...",
      build:
        useMake && profile.projectInfo.makeTargets?.includes("build")
          ? "make build"
          : "go build ./...",
      clean:
        useMake && profile.projectInfo.makeTargets?.includes("clean")
          ? "make clean"
          : "go clean",
      depend: hasGoMod ? "go mod download" : "go get -d ./...",
    };
  }

  private generatePythonCommands(
    profile: ProjectProfile,
  ): Record<string, string> {
    const usePoetry = profile.buildSystem === BuildSystem.Poetry;
    const useMake = profile.buildSystem === BuildSystem.Make;

    return {
      lint:
        useMake && profile.projectInfo.makeTargets?.includes("lint")
          ? "make lint"
          : "flake8",
      test:
        useMake && profile.projectInfo.makeTargets?.includes("test")
          ? "make test"
          : "pytest",
      build: usePoetry ? "poetry build" : "python setup.py build",
      clean: "rm -rf build dist *.egg-info __pycache__",
      depend: usePoetry ? "poetry install" : "pip install -r requirements.txt",
    };
  }

  private generateRustCommands(
    profile: ProjectProfile,
  ): Record<string, string> {
    const useMake = profile.buildSystem === BuildSystem.Make;

    return {
      lint:
        useMake && profile.projectInfo.makeTargets?.includes("lint")
          ? "make lint"
          : "cargo clippy",
      test:
        useMake && profile.projectInfo.makeTargets?.includes("test")
          ? "make test"
          : "cargo test",
      build:
        useMake && profile.projectInfo.makeTargets?.includes("build")
          ? "make build"
          : "cargo build",
      clean: "cargo clean",
      depend: "cargo fetch",
    };
  }

  private generateJavaCommands(
    profile: ProjectProfile,
  ): Record<string, string> {
    const useMaven = profile.buildSystem === BuildSystem.Maven;
    const useGradle = profile.buildSystem === BuildSystem.Gradle;

    if (useMaven) {
      return {
        lint: "mvn checkstyle:check",
        test: "mvn test",
        build: "mvn package",
        clean: "mvn clean",
        depend: "mvn dependency:resolve",
      };
    }

    if (useGradle) {
      return {
        lint: "./gradlew check",
        test: "./gradlew test",
        build: "./gradlew build",
        clean: "./gradlew clean",
        depend: "./gradlew dependencies",
      };
    }

    return this.generateDefaultCommands(profile);
  }

  private generateDefaultCommands(
    profile: ProjectProfile,
  ): Record<string, string> {
    // Unused parameter - stub implementation for future enhancement
    void profile;
    return {
      lint: 'echo "No lint command configured"',
      test: 'echo "No test command configured"',
      build: 'echo "No build command configured"',
      clean: 'echo "No clean command configured"',
      depend: 'echo "No dependency command configured"',
    };
  }

  /**
   * Generate linters list based on detected tools
   */
  private generateLinters(profile: ProjectProfile): string[] {
    const linters = new Set<string>();

    // Add detected linters
    for (const tool of profile.projectInfo.lintingTools) {
      linters.add(tool);
    }

    // Add recommended linters based on project type
    switch (profile.projectType) {
      case ProjectType.NodeJS:
        linters.add("eslint");
        linters.add("markdownlint");
        break;
      case ProjectType.Go:
        linters.add("golangci-lint");
        break;
      case ProjectType.Python:
        linters.add("flake8");
        break;
      case ProjectType.Rust:
        linters.add("clippy");
        break;
    }

    // Always include markdownlint and yamllint for documentation
    linters.add("markdownlint");
    linters.add("yamllint");

    return Array.from(linters).sort();
  }

  /**
   * Generate test runner based on project type
   */
  private generateTestRunner(profile: ProjectProfile): string {
    if (profile.testFramework) {
      return profile.testFramework;
    }

    switch (profile.projectType) {
      case ProjectType.NodeJS:
        return profile.framework?.includes("Next") ||
          profile.framework?.includes("React")
          ? "jest"
          : "jest";
      case ProjectType.Python:
        return "pytest";
      case ProjectType.Go:
        return "go";
      case ProjectType.Rust:
        return "cargo";
      case ProjectType.Java:
        return profile.buildSystem === BuildSystem.Maven ? "maven" : "gradle";
      default:
        return "make";
    }
  }

  /**
   * Generate timeout based on project characteristics
   */
  private generateTimeout(profile: ProjectProfile): number {
    // Base timeout: 5 minutes (300000ms)
    let timeout = 300000;

    // Increase for certain project types
    if (profile.projectType === ProjectType.Go) {
      timeout = 600000; // 10 minutes for Go (can be slow with -race)
    }

    if (profile.projectType === ProjectType.Java) {
      timeout = 900000; // 15 minutes for Java (Maven/Gradle can be slow)
    }

    return timeout;
  }

  /**
   * Generate exclude paths based on project type
   */
  private generateExcludePaths(profile: ProjectProfile): string[] {
    const common = ["node_modules/**", "dist/**", "build/**", ".git/**"];

    const typeSpecific: Record<string, string[]> = {
      [ProjectType.NodeJS]: ["coverage/**", ".next/**", ".nuxt/**"],
      [ProjectType.Python]: [
        "__pycache__/**",
        "*.pyc",
        ".venv/**",
        "venv/**",
        ".pytest_cache/**",
      ],
      [ProjectType.Go]: ["vendor/**", "bin/**"],
      [ProjectType.Rust]: ["target/**"],
      [ProjectType.Java]: ["target/**", ".gradle/**", "out/**"],
    };

    const specific = typeSpecific[profile.projectType] || [];
    return [...common, ...specific];
  }

  /**
   * Generate environment variables
   */
  private generateEnvironment(profile: ProjectProfile): Record<string, string> {
    const env: Record<string, string> = {};

    if (profile.projectType === ProjectType.NodeJS) {
      env.NODE_ENV = "development";
    }

    if (profile.projectType === ProjectType.Python) {
      env.PYTHONPATH = ".";
    }

    return env;
  }

  /**
   * Generate parallel execution settings
   */
  private generateParallelSettings(profile: ProjectProfile): {
    makeJobs?: number;
    enableTestParallel?: boolean;
  } {
    const settings: { makeJobs?: number; enableTestParallel?: boolean } = {};

    // Enable parallel make by default
    if (profile.buildSystem === BuildSystem.Make) {
      settings.makeJobs = 4;
    }

    // Enable parallel tests for Node.js
    if (profile.projectType === ProjectType.NodeJS) {
      settings.enableTestParallel = true;
    }

    // Enable parallel tests for Go (unless using race detector)
    if (profile.projectType === ProjectType.Go) {
      settings.enableTestParallel = false; // Race detector doesn't work well with parallel
    }

    return settings;
  }

  /**
   * Generate security settings
   */
  private generateSecuritySettings(profile: ProjectProfile): {
    allowedCommands?: string[];
    restrictedPaths?: string[];
  } {
    // Unused parameter - stub implementation for future enhancement
    void profile;
    return {
      allowedCommands: [],
      restrictedPaths: ["/", "/etc", "/usr", "/bin", "/sbin", "/root"],
    };
  }

  /**
   * Generate Go-specific configuration
   */
  private generateGoConfig(profile: ProjectProfile): {
    goPath?: string;
    goModule?: boolean;
    testFlags?: string[];
    lintConfig?: string;
  } {
    const hasGoMod = profile.projectInfo.configFiles.some(
      (f) => f.name === "go.mod",
    );
    const hasLintConfig = profile.projectInfo.configFiles.some(
      (f) => f.name === ".golangci.yml" || f.name === ".golangci.yaml",
    );

    const config: {
      goPath?: string;
      goModule?: boolean;
      testFlags?: string[];
      lintConfig?: string;
    } = {
      goModule: hasGoMod,
      testFlags: ["-race", "-cover"],
    };

    if (hasLintConfig) {
      config.lintConfig = ".golangci.yml";
    }

    return config;
  }

  /**
   * Generate file validation configuration
   */
  private generateFileValidationConfig(profile: ProjectProfile): {
    newline?: {
      enabled?: boolean;
      autoFix?: boolean;
      exclude?: string[];
      fileTypes?: string[];
    };
  } {
    const fileTypes: string[] = ["*.md", "*.json", "*.yaml", "*.yml"];

    switch (profile.projectType) {
      case ProjectType.NodeJS:
        fileTypes.push("*.ts", "*.js", "*.tsx", "*.jsx", "*.mjs", "*.cjs");
        break;
      case ProjectType.Go:
        fileTypes.push("*.go");
        break;
      case ProjectType.Python:
        fileTypes.push("*.py");
        break;
      case ProjectType.Rust:
        fileTypes.push("*.rs", "*.toml");
        break;
      case ProjectType.Java:
        fileTypes.push("*.java", "*.xml");
        break;
    }

    return {
      newline: {
        enabled: true,
        autoFix: false,
        exclude: [
          "node_modules/**",
          "dist/**",
          "build/**",
          "*.min.js",
          "*.min.css",
          "vendor/**",
          "target/**",
        ],
        fileTypes,
      },
    };
  }

  /**
   * Merge generated config with existing config
   */
  mergeWithExisting(
    generated: MCPDevToolsConfig,
    existing: MCPDevToolsConfig,
  ): MCPDevToolsConfig {
    logger.info("Merging generated config with existing config");

    const merged: MCPDevToolsConfig = { ...generated };

    // Preserve user customizations in existing config
    if (existing.commands) {
      merged.commands = { ...generated.commands, ...existing.commands };
    }

    if (existing.linters) {
      // Combine linters, preferring existing
      const allLinters = new Set([
        ...(generated.linters || []),
        ...existing.linters,
      ]);
      merged.linters = Array.from(allLinters);
    }

    if (existing.timeout) {
      merged.timeout = existing.timeout;
    }

    if (existing.environment) {
      merged.environment = {
        ...generated.environment,
        ...existing.environment,
      };
    }

    if (existing.parallel) {
      merged.parallel = { ...generated.parallel, ...existing.parallel };
    }

    if (existing.security) {
      merged.security = { ...generated.security, ...existing.security };
    }

    if (existing.golang) {
      merged.golang = { ...generated.golang, ...existing.golang };
    }

    if (existing.fileValidation) {
      merged.fileValidation = {
        newline: {
          ...generated.fileValidation?.newline,
          ...existing.fileValidation.newline,
        },
      };
    }

    // Preserve any custom fields
    for (const [key, value] of Object.entries(existing)) {
      if (!(key in merged)) {
        (merged as Record<string, unknown>)[key] = value;
      }
    }

    return merged;
  }

  /**
   * Validate configuration against schema
   */
  validateConfig(config: MCPDevToolsConfig): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!config.commands || Object.keys(config.commands).length === 0) {
      warnings.push("No commands defined in configuration");
    }

    // Validate timeout
    if (config.timeout !== undefined) {
      if (config.timeout < 1000) {
        errors.push("Timeout must be at least 1000ms");
      }
      if (config.timeout > 3600000) {
        warnings.push("Timeout is very high (> 1 hour)");
      }
    }

    // Validate parallel settings
    if (config.parallel?.makeJobs !== undefined) {
      if (config.parallel.makeJobs < 1 || config.parallel.makeJobs > 32) {
        errors.push("makeJobs must be between 1 and 32");
      }
    }

    // Validate linters
    const validLinters = [
      "eslint",
      "markdownlint",
      "yamllint",
      "flake8",
      "black",
      "clippy",
      "rustfmt",
      "golangci-lint",
      "gofmt",
      "staticcheck",
    ];

    if (config.linters) {
      for (const linter of config.linters) {
        if (!validLinters.includes(linter)) {
          warnings.push(`Unknown linter: ${linter}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
