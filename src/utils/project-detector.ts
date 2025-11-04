import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import winston from 'winston';
import { getCacheManager } from './cache-manager.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.simple(),
  transports: [new winston.transports.Console()]
});

export interface ProjectInfo {
  type: ProjectType;
  language: string;
  framework?: string;
  buildSystem: BuildSystem;
  hasTests: boolean;
  testFramework?: string;
  lintingTools: string[];
  configFiles: ConfigFile[];
  makeTargets?: string[];
  packageManager?: string;
}

export enum ProjectType {
  NodeJS = 'nodejs',
  Python = 'python',
  Go = 'go',
  Rust = 'rust',
  Java = 'java',
  DotNet = 'dotnet',
  Mixed = 'mixed',
  Unknown = 'unknown'
}

export enum BuildSystem {
  Make = 'make',
  NPM = 'npm',
  Yarn = 'yarn',
  PNPM = 'pnpm',
  Pip = 'pip',
  Poetry = 'poetry',
  Go = 'go',
  Cargo = 'cargo',
  Maven = 'maven',
  Gradle = 'gradle',
  DotNet = 'dotnet',
  Unknown = 'unknown'
}

export interface ConfigFile {
  name: string;
  path: string;
  type: 'makefile' | 'package' | 'config' | 'lint' | 'test' | 'build';
}

export class ProjectDetector {
  private projectRoot: string;
  private cacheManager = getCacheManager();

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  async detectProject(): Promise<ProjectInfo> {
    // Generate cache key based on absolute project path
    const cacheKey = `project:${path.resolve(this.projectRoot)}`;

    // Try to get from cache
    const cached = this.cacheManager.get<ProjectInfo>('projectDetection', cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for project detection: ${this.projectRoot}`);
      return cached;
    }

    logger.info(`Detecting project in: ${this.projectRoot}`);
    logger.debug(`Cache MISS for project detection: ${this.projectRoot}`);

    const configFiles = await this.findConfigFiles();
    const projectType = this.detectProjectType(configFiles);
    const language = this.detectLanguage(projectType);
    const buildSystem = this.detectBuildSystem(configFiles);
    const hasTests = await this.detectTests();
    const testFramework = await this.detectTestFramework(projectType);
    const lintingTools = await this.detectLintingTools();
    const makeTargets = await this.extractMakeTargets();
    const packageManager = this.detectPackageManager(configFiles);
    const framework = await this.detectFramework(projectType, configFiles);

    const result: ProjectInfo = {
      type: projectType,
      language,
      framework,
      buildSystem,
      hasTests,
      testFramework,
      lintingTools,
      configFiles,
      makeTargets,
      packageManager
    };

    // Store in cache
    this.cacheManager.set('projectDetection', cacheKey, result);

    return result;
  }

  private async findConfigFiles(): Promise<ConfigFile[]> {
    const configFiles: ConfigFile[] = [];
    
    const patterns = [
      // Makefiles
      { pattern: '**/[Mm]akefile*', type: 'makefile' as const },
      { pattern: '**/*.mk', type: 'makefile' as const },
      
      // Package files
      { pattern: '**/package.json', type: 'package' as const },
      { pattern: '**/requirements.txt', type: 'package' as const },
      { pattern: '**/Pipfile', type: 'package' as const },
      { pattern: '**/pyproject.toml', type: 'package' as const },
      { pattern: '**/go.mod', type: 'package' as const },
      { pattern: '**/Cargo.toml', type: 'package' as const },
      { pattern: '**/pom.xml', type: 'package' as const },
      { pattern: '**/build.gradle*', type: 'package' as const },
      { pattern: '**/*.csproj', type: 'package' as const },
      { pattern: '**/*.sln', type: 'package' as const },
      
      // Lint configs
      { pattern: '**/.eslintrc*', type: 'lint' as const },
      { pattern: '**/eslint.config.*', type: 'lint' as const },
      { pattern: '**/.markdownlint*', type: 'lint' as const },
      { pattern: '**/.yamllint*', type: 'lint' as const },
      { pattern: '**/tslint.json', type: 'lint' as const },
      { pattern: '**/pyproject.toml', type: 'lint' as const },
      { pattern: '**/.flake8', type: 'lint' as const },
      { pattern: '**/clippy.toml', type: 'lint' as const },
      
      // Test configs
      { pattern: '**/jest.config.*', type: 'test' as const },
      { pattern: '**/vitest.config.*', type: 'test' as const },
      { pattern: '**/pytest.ini', type: 'test' as const },
      { pattern: '**/test*.toml', type: 'test' as const },
      
      // Build configs
      { pattern: '**/tsconfig.json', type: 'build' as const },
      { pattern: '**/webpack.config.*', type: 'build' as const },
      { pattern: '**/vite.config.*', type: 'build' as const },
      { pattern: '**/rollup.config.*', type: 'build' as const }
    ];

    for (const { pattern, type } of patterns) {
      try {
        const matches = await glob(pattern, {
          cwd: this.projectRoot,
          ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
        });
        
        for (const match of matches) {
          configFiles.push({
            name: path.basename(match),
            path: path.join(this.projectRoot, match),
            type
          });
        }
      } catch (error) {
        logger.warn(`Error searching for ${pattern}: ${error}`);
      }
    }

    return configFiles;
  }

  private detectProjectType(configFiles: ConfigFile[]): ProjectType {
    const indicators = {
      [ProjectType.NodeJS]: ['package.json', 'tsconfig.json', 'yarn.lock', 'package-lock.json'],
      [ProjectType.Python]: ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'],
      [ProjectType.Go]: ['go.mod', 'go.sum'],
      [ProjectType.Rust]: ['Cargo.toml', 'Cargo.lock'],
      [ProjectType.Java]: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
      [ProjectType.DotNet]: ['.csproj', '.sln', '.fsproj', '.vbproj']
    };

    const scores = Object.entries(indicators).map(([type, files]) => {
      const score = files.reduce((acc, file) => {
        return acc + (configFiles.some(cf => cf.name.includes(file)) ? 1 : 0);
      }, 0);
      return { type: type as ProjectType, score };
    });

    scores.sort((a, b) => b.score - a.score);
    
    if (scores[0].score === 0) return ProjectType.Unknown;
    if (scores[0].score === scores[1]?.score) return ProjectType.Mixed;
    
    return scores[0].type;
  }

  private detectLanguage(projectType: ProjectType): string {
    const typeToLanguage = {
      [ProjectType.NodeJS]: 'JavaScript/TypeScript',
      [ProjectType.Python]: 'Python',
      [ProjectType.Go]: 'Go',
      [ProjectType.Rust]: 'Rust',
      [ProjectType.Java]: 'Java',
      [ProjectType.DotNet]: 'C#/.NET',
      [ProjectType.Mixed]: 'Multiple',
      [ProjectType.Unknown]: 'Unknown'
    };

    return typeToLanguage[projectType];
  }

  private detectBuildSystem(configFiles: ConfigFile[]): BuildSystem {
    if (configFiles.some(cf => cf.type === 'makefile')) {
      return BuildSystem.Make;
    }
    
    const packageFile = configFiles.find(cf => cf.name === 'package.json');
    if (packageFile) {
      if (configFiles.some(cf => cf.name === 'pnpm-lock.yaml')) return BuildSystem.PNPM;
      if (configFiles.some(cf => cf.name === 'yarn.lock')) return BuildSystem.Yarn;
      return BuildSystem.NPM;
    }

    if (configFiles.some(cf => cf.name === 'pyproject.toml' && cf.type === 'package')) {
      return BuildSystem.Poetry;
    }
    if (configFiles.some(cf => cf.name === 'requirements.txt')) {
      return BuildSystem.Pip;
    }
    if (configFiles.some(cf => cf.name === 'go.mod')) {
      return BuildSystem.Go;
    }
    if (configFiles.some(cf => cf.name === 'Cargo.toml')) {
      return BuildSystem.Cargo;
    }
    if (configFiles.some(cf => cf.name === 'pom.xml')) {
      return BuildSystem.Maven;
    }
    if (configFiles.some(cf => cf.name.includes('build.gradle'))) {
      return BuildSystem.Gradle;
    }
    if (configFiles.some(cf => cf.name.includes('.csproj') || cf.name.includes('.sln'))) {
      return BuildSystem.DotNet;
    }

    return BuildSystem.Unknown;
  }

  private async detectTests(): Promise<boolean> {
    const testPatterns = [
      '**/test/**',
      '**/tests/**',
      '**/__tests__/**',
      '**/*.test.*',
      '**/*.spec.*'
    ];

    for (const pattern of testPatterns) {
      try {
        const matches = await glob(pattern, {
          cwd: this.projectRoot,
          ignore: ['**/node_modules/**']
        });
        if (matches.length > 0) return true;
      } catch {
        // Continue checking other patterns
      }
    }

    return false;
  }

  private async detectTestFramework(projectType: ProjectType): Promise<string | undefined> {
    const frameworks = {
      [ProjectType.NodeJS]: ['jest', 'vitest', 'mocha', 'jasmine'],
      [ProjectType.Python]: ['pytest', 'unittest', 'nose'],
      [ProjectType.Go]: ['testing'],
      [ProjectType.Rust]: ['cargo test'],
      [ProjectType.Java]: ['junit', 'testng'],
      [ProjectType.DotNet]: ['xunit', 'nunit', 'mstest']
    };

    const candidates = frameworks[projectType as keyof typeof frameworks] || [];
    
    for (const framework of candidates) {
      try {
        // Check for framework-specific config files or dependencies
        // const patterns = [
        //   `**/${framework}.config.*`,
        //   `**/package.json`, // Will check dependencies separately
        //   `**/pyproject.toml`,
        //   `**/Cargo.toml`
        // ];
        
        // For now, return the first likely candidate
        // This could be enhanced to actually parse config files
        return framework;
      } catch {
        continue;
      }
    }

    return undefined;
  }

  private async detectLintingTools(): Promise<string[]> {
    const tools: string[] = [];
    
    const toolPatterns = {
      'eslint': ['**/.eslintrc*', '**/eslint.config.*'],
      'markdownlint': ['**/.markdownlint*'],
      'yamllint': ['**/.yamllint*'],
      'flake8': ['**/.flake8', '**/setup.cfg'],
      'black': ['**/pyproject.toml'],
      'clippy': ['**/clippy.toml'],
      'rustfmt': ['**/rustfmt.toml']
    };

    for (const [tool, patterns] of Object.entries(toolPatterns)) {
      for (const pattern of patterns) {
        try {
          const matches = await glob(pattern, { cwd: this.projectRoot });
          if (matches.length > 0) {
            tools.push(tool);
            break;
          }
        } catch {
          continue;
        }
      }
    }

    return tools;
  }

  private async extractMakeTargets(): Promise<string[] | undefined> {
    try {
      const makefilePaths = await glob('**/[Mm]akefile*', {
        cwd: this.projectRoot,
        ignore: ['**/node_modules/**']
      });

      if (makefilePaths.length === 0) return undefined;

      const targets: Set<string> = new Set();
      
      for (const makefilePath of makefilePaths) {
        try {
          const content = await fs.readFile(
            path.join(this.projectRoot, makefilePath),
            'utf8'
          );
          
          // Extract targets (lines that start with identifier followed by colon)
          const targetRegex = /^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/gm;
          let match;
          
          while ((match = targetRegex.exec(content)) !== null) {
            const target = match[1];
            if (!target.startsWith('.') && target !== 'PHONY') {
              targets.add(target);
            }
          }
        } catch (error) {
          logger.warn(`Could not read makefile ${makefilePath}: ${error}`);
        }
      }

      return Array.from(targets).sort();
    } catch {
      return undefined;
    }
  }

  private detectPackageManager(configFiles: ConfigFile[]): string | undefined {
    if (configFiles.some(cf => cf.name === 'pnpm-lock.yaml')) return 'pnpm';
    if (configFiles.some(cf => cf.name === 'yarn.lock')) return 'yarn';
    if (configFiles.some(cf => cf.name === 'package-lock.json')) return 'npm';
    if (configFiles.some(cf => cf.name === 'package.json')) return 'npm';
    
    return undefined;
  }

  private async detectFramework(projectType: ProjectType, configFiles: ConfigFile[]): Promise<string | undefined> {
    if (projectType === ProjectType.NodeJS) {
      // Check package.json for framework dependencies
      const packageJsonFile = configFiles.find(cf => cf.name === 'package.json');
      if (packageJsonFile) {
        try {
          const content = await fs.readFile(packageJsonFile.path, 'utf8');
          const packageJson = JSON.parse(content);
          const allDeps = {
            ...packageJson.dependencies,
            ...packageJson.devDependencies
          };
          
          // Framework detection based on dependencies
          if (allDeps.react) return 'React';
          if (allDeps.vue) return 'Vue';
          if (allDeps.angular || allDeps['@angular/core']) return 'Angular';
          if (allDeps.next) return 'Next.js';
          if (allDeps.nuxt) return 'Nuxt.js';
          if (allDeps.express) return 'Express';
          if (allDeps.fastify) return 'Fastify';
          if (allDeps.nest || allDeps['@nestjs/core']) return 'NestJS';
        } catch {
          // Could not parse package.json
        }
      }
    }
    
    return undefined;
  }

  async getProjectContext(): Promise<string> {
    const info = await this.detectProject();
    
    return `Project Context:
Type: ${info.type}
Language: ${info.language}
${info.framework ? `Framework: ${info.framework}` : ''}
Build System: ${info.buildSystem}
${info.packageManager ? `Package Manager: ${info.packageManager}` : ''}
Has Tests: ${info.hasTests}
${info.testFramework ? `Test Framework: ${info.testFramework}` : ''}
Linting Tools: ${info.lintingTools.join(', ') || 'None detected'}
${info.makeTargets ? `Make Targets: ${info.makeTargets.join(', ')}` : ''}
Config Files: ${info.configFiles.length} found`;
  }
}