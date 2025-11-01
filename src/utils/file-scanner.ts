import { glob } from 'glob';
import path from 'path';

export interface FileScanOptions {
  patterns: string[];
  exclude?: string[];
  fileTypes?: string[];
  cwd?: string;
  maxFileSizeMB?: number;
}

/**
 * Utility for scanning filesystem for files matching patterns.
 * Uses glob library for cross-platform compatibility.
 */
export class FileScanner {
  /**
   * Scan filesystem for files matching patterns.
   *
   * @param options - Scan options including patterns, exclusions, and filters
   * @returns Array of absolute file paths sorted alphabetically
   * @throws Error if scan fails
   */
  async scan(options: FileScanOptions): Promise<string[]> {
    const {
      patterns,
      exclude = ['node_modules/**', 'dist/**', '.git/**'],
      fileTypes,
      cwd = process.cwd()
    } = options;

    const allFiles: Set<string> = new Set();

    for (const pattern of patterns) {
      const files = await glob(pattern, {
        cwd,
        ignore: exclude,
        absolute: true,
        nodir: true
      });

      for (const file of files) {
        // Apply file type filter if specified
        if (fileTypes && fileTypes.length > 0) {
          const matchesType = fileTypes.some(type => {
            const globPattern = type.startsWith('*') ? type : `*${type}`;
            return this.matchesPattern(file, globPattern);
          });
          if (!matchesType) continue;
        }

        allFiles.add(file);
      }
    }

    return Array.from(allFiles).sort();
  }

  /**
   * Check if a file path matches a pattern.
   *
   * @param filePath - Absolute file path
   * @param pattern - Pattern to match (e.g., '*.ts' or '.ts')
   * @returns True if file matches pattern
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    const ext = path.extname(filePath);
    if (pattern.startsWith('*.')) {
      return ext === pattern.substring(1);
    }
    return filePath.endsWith(pattern);
  }
}
