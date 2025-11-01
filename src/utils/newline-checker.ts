import { promises as fs } from 'fs';

export interface NewlineCheckResult {
  hasTrailingNewline: boolean;
  lineEnding: '\n' | '\r\n' | null;
  isBinary: boolean;
  fileSize: number;
}

/**
 * Utility for checking and fixing POSIX newline compliance in text files.
 * Pure Node.js implementation using Buffer operations - no external commands.
 */
export class NewlineChecker {
  private readonly maxBinarySampleSize = 8192; // First 8KB for binary detection

  /**
   * Check if file ends with newline using Node.js Buffer operations.
   * NO external commands like tail/od - pure Node.js implementation.
   *
   * @param filePath - Absolute path to file to check
   * @returns Check result with newline status, line ending type, and file metadata
   * @throws Error if file cannot be read
   */
  async check(filePath: string): Promise<NewlineCheckResult> {
    const stats = await fs.stat(filePath);

    // Empty files are compliant
    if (stats.size === 0) {
      return {
        hasTrailingNewline: true,
        lineEnding: null,
        isBinary: false,
        fileSize: 0
      };
    }

    // Read first chunk for binary detection
    const handle = await fs.open(filePath, 'r');
    try {
      const sampleSize = Math.min(this.maxBinarySampleSize, stats.size);
      const buffer = Buffer.allocUnsafe(sampleSize);
      await handle.read(buffer, 0, sampleSize, 0);

      if (this.isBinaryContent(buffer)) {
        return {
          hasTrailingNewline: true, // Skip binary files
          lineEnding: null,
          isBinary: true,
          fileSize: stats.size
        };
      }

      // Read last few bytes to check for newline
      const endBufferSize = Math.min(2, stats.size);
      const endBuffer = Buffer.allocUnsafe(endBufferSize);
      await handle.read(endBuffer, 0, endBufferSize, stats.size - endBufferSize);

      const lastByte = endBuffer[endBuffer.length - 1];
      const hasNewline = lastByte === 0x0a; // LF

      // Detect line ending style
      let lineEnding: '\n' | '\r\n' | null = null;
      if (hasNewline) {
        const secondLastByte = endBuffer.length > 1 ? endBuffer[endBuffer.length - 2] : 0;
        lineEnding = (secondLastByte === 0x0d) ? '\r\n' : '\n';
      } else {
        // Detect from file content
        lineEnding = await this.detectLineEnding(filePath);
      }

      return {
        hasTrailingNewline: hasNewline,
        lineEnding,
        isBinary: false,
        fileSize: stats.size
      };
    } finally {
      await handle.close();
    }
  }

  /**
   * Add trailing newline to file if missing.
   * Preserves existing line ending style (LF vs CRLF).
   *
   * @param filePath - Absolute path to file to fix
   * @param lineEnding - Line ending to use (defaults to '\n')
   * @returns True if newline was added, false if no fix needed
   * @throws Error if file cannot be modified
   */
  async fix(filePath: string, lineEnding: '\n' | '\r\n' = '\n'): Promise<boolean> {
    const checkResult = await this.check(filePath);

    if (checkResult.isBinary || checkResult.hasTrailingNewline) {
      return false; // No fix needed
    }

    // Use the detected line ending or default
    const eol = checkResult.lineEnding || lineEnding;

    // Append newline using file descriptor for efficiency
    const handle = await fs.open(filePath, 'a');
    try {
      await handle.write(eol);
      return true;
    } finally {
      await handle.close();
    }
  }

  /**
   * Detect line ending style from file content.
   * Samples the file to determine predominant style.
   *
   * @param filePath - Absolute path to file
   * @returns Detected line ending ('\n' or '\r\n')
   */
  private async detectLineEnding(filePath: string): Promise<'\n' | '\r\n'> {
    const handle = await fs.open(filePath, 'r');
    try {
      const stats = await fs.stat(filePath);
      const sampleSize = Math.min(8192, stats.size);
      const buffer = Buffer.allocUnsafe(sampleSize);
      await handle.read(buffer, 0, sampleSize, 0);

      const content = buffer.toString('utf8');
      const crlfCount = (content.match(/\r\n/g) || []).length;
      const lfCount = (content.match(/(?<!\r)\n/g) || []).length;

      return crlfCount > lfCount ? '\r\n' : '\n';
    } finally {
      await handle.close();
    }
  }

  /**
   * Detect binary files using null byte heuristic.
   * More sophisticated than simple null check.
   *
   * @param buffer - Buffer containing file content sample
   * @returns True if content appears to be binary
   */
  private isBinaryContent(buffer: Buffer): boolean {
    // Check for null bytes (strong indicator of binary)
    if (buffer.includes(0x00)) {
      return true;
    }

    // Check for high ratio of non-printable characters
    let nonPrintable = 0;
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];
      // Non-printable: not tab, not newline, not carriage return, not printable ASCII
      if (byte !== 0x09 && byte !== 0x0a && byte !== 0x0d && (byte < 0x20 || byte > 0x7e)) {
        nonPrintable++;
      }
    }

    // If >30% non-printable, consider binary
    return (nonPrintable / buffer.length) > 0.3;
  }
}
