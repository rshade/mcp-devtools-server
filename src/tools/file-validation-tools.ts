import { NewlineChecker } from '../utils/newline-checker.js';
import { FileScanner } from '../utils/file-scanner.js';

export interface EnsureNewlineParams {
  // File patterns to check (glob syntax)
  patterns: string[];

  // Operation mode
  mode: 'check' | 'fix' | 'validate';

  // Exclude patterns (e.g., ['node_modules/**', '*.min.js'])
  exclude?: string[];

  // File types to process (e.g., ['*.ts', '*.js', '*.go', '*.md'])
  fileTypes?: string[];

  // Working directory (defaults to project root)
  cwd?: string;

  // Skip binary files automatically
  skipBinary?: boolean;  // default: true

  // Maximum file size to process (in MB)
  maxFileSizeMB?: number;  // default: 10
}

export interface EnsureNewlineResult {
  // Files checked
  totalFiles: number;

  // Files that lacked trailing newlines
  filesWithoutNewline: string[];

  // Files successfully fixed (if mode='fix')
  filesFixed: string[];

  // Files skipped (binary, too large, etc.)
  filesSkipped: Array<{file: string; reason: string}>;

  // Errors encountered
  errors: Array<{file: string; error: string}>;

  // Summary message
  summary: string;

  // Exit code (0=success, 1=validation failed, 2=errors occurred)
  exitCode: number;
}

/**
 * File validation tools for MCP server.
 * Provides POSIX newline compliance checking and fixing.
 */
export class FileValidationTools {
  private newlineChecker: NewlineChecker;
  private fileScanner: FileScanner;

  constructor() {
    this.newlineChecker = new NewlineChecker();
    this.fileScanner = new FileScanner();
  }

  /**
   * Ensure files have POSIX-compliant trailing newlines.
   *
   * @param params - Tool parameters
   * @returns Result with files checked, fixed, and any errors
   */
  async ensureNewline(params: EnsureNewlineParams): Promise<EnsureNewlineResult> {
    const {
      patterns,
      mode,
      exclude,
      fileTypes,
      cwd,
      skipBinary = true,
      maxFileSizeMB = 10
    } = params;

    const result: EnsureNewlineResult = {
      totalFiles: 0,
      filesWithoutNewline: [],
      filesFixed: [],
      filesSkipped: [],
      errors: [],
      summary: '',
      exitCode: 0
    };

    try {
      // Scan for files
      const files = await this.fileScanner.scan({
        patterns,
        exclude,
        fileTypes,
        cwd
      });

      result.totalFiles = files.length;

      // Process each file
      for (const file of files) {
        try {
          const checkResult = await this.newlineChecker.check(file);

          // Skip binary files
          if (skipBinary && checkResult.isBinary) {
            result.filesSkipped.push({ file, reason: 'binary file' });
            continue;
          }

          // Skip oversized files
          const fileSizeMB = checkResult.fileSize / (1024 * 1024);
          if (fileSizeMB > maxFileSizeMB) {
            result.filesSkipped.push({ file, reason: `exceeds ${maxFileSizeMB}MB limit` });
            continue;
          }

          // Check for trailing newline
          if (!checkResult.hasTrailingNewline) {
            result.filesWithoutNewline.push(file);

            // Fix if requested
            if (mode === 'fix') {
              const fixed = await this.newlineChecker.fix(file, checkResult.lineEnding || '\n');
              if (fixed) {
                result.filesFixed.push(file);
              }
            }
          }
        } catch (error) {
          result.errors.push({
            file,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      // Generate summary
      result.summary = this.generateSummary(result, mode);

      // Set exit code
      if (result.errors.length > 0) {
        result.exitCode = 2;
      } else if (mode === 'validate' && result.filesWithoutNewline.length > 0) {
        result.exitCode = 1;
      }

    } catch (error) {
      result.errors.push({
        file: 'scanner',
        error: error instanceof Error ? error.message : String(error)
      });
      result.exitCode = 2;
      result.summary = `Failed to scan files: ${error}`;
    }

    return result;
  }

  /**
   * Generate human-readable summary of results.
   *
   * @param result - Current result object
   * @param mode - Operation mode
   * @returns Summary string
   */
  private generateSummary(result: EnsureNewlineResult, mode: string): string {
    const parts: string[] = [];

    parts.push(`Checked ${result.totalFiles} files`);

    if (result.filesWithoutNewline.length > 0) {
      parts.push(`found ${result.filesWithoutNewline.length} without trailing newlines`);

      if (mode === 'fix') {
        parts.push(`fixed ${result.filesFixed.length}`);
      }
    } else {
      parts.push('all files compliant');
    }

    if (result.filesSkipped.length > 0) {
      parts.push(`skipped ${result.filesSkipped.length}`);
    }

    if (result.errors.length > 0) {
      parts.push(`${result.errors.length} errors`);
    }

    return parts.join(', ') + '.';
  }
}
