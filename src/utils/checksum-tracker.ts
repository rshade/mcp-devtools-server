import { createHash } from 'crypto';
import { readFile, stat } from 'fs/promises';
import { logger } from './logger.js';
import { getCacheManager } from './cache-manager.js';

/**
 * File checksum information
 */
export interface FileChecksum {
  path: string;
  checksum: string;
  mtime: number;
  size: number;
}

/**
 * File change callback signature
 */
export type FileChangeCallback = (filePath: string) => void | Promise<void>;

/**
 * Checksum tracker configuration
 */
export interface ChecksumTrackerConfig {
  algorithm: 'sha256' | 'md5';
  watchIntervalMs?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ChecksumTrackerConfig = {
  algorithm: 'sha256',
  watchIntervalMs: 5000, // Check files every 5 seconds
};

/**
 * ChecksumTracker - File-based cache invalidation
 *
 * Tracks file checksums to detect changes and invalidate caches.
 * Uses mtime + size as fast check before expensive checksum calculation.
 *
 * Usage:
 *   const tracker = new ChecksumTracker();
 *   await tracker.track('package.json', () => {
 *     cacheManager.invalidate('project-detection');
 *   });
 */
export class ChecksumTracker {
  private checksums: Map<string, FileChecksum>;
  private callbacks: Map<string, FileChangeCallback[]>;
  private config: ChecksumTrackerConfig;
  private watchTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ChecksumTrackerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.checksums = new Map();
    this.callbacks = new Map();

    logger.debug('ChecksumTracker: Initialized', this.config);
  }

  /**
   * Track a file for changes
   * @param filePath - Absolute path to file
   * @param callback - Function to call when file changes
   */
  public async track(
    filePath: string,
    callback: FileChangeCallback
  ): Promise<void> {
    try {
      // Calculate initial checksum
      const checksum = await this.calculateChecksum(filePath);
      this.checksums.set(filePath, checksum);

      // Register callback
      const existingCallbacks = this.callbacks.get(filePath) || [];
      existingCallbacks.push(callback);
      this.callbacks.set(filePath, existingCallbacks);

      logger.debug(`ChecksumTracker: Tracking ${filePath}`, {
        checksum: checksum.checksum,
        mtime: checksum.mtime,
        size: checksum.size,
      });
    } catch (error) {
      logger.warn(`ChecksumTracker: Failed to track ${filePath}`, { error });
    }
  }

  /**
   * Stop tracking a file
   */
  public untrack(filePath: string): void {
    this.checksums.delete(filePath);
    this.callbacks.delete(filePath);
    logger.debug(`ChecksumTracker: Stopped tracking ${filePath}`);
  }

  /**
   * Check if a file has changed since last check
   * @returns true if file changed, false otherwise
   */
  public async hasChanged(filePath: string): Promise<boolean> {
    const oldChecksum = this.checksums.get(filePath);
    if (!oldChecksum) {
      // File not tracked, consider it "changed" to trigger initial caching
      return true;
    }

    try {
      const newChecksum = await this.calculateChecksum(filePath);

      // Fast check: compare mtime and size first
      if (
        newChecksum.mtime === oldChecksum.mtime &&
        newChecksum.size === oldChecksum.size
      ) {
        return false; // File hasn't changed
      }

      // Slow check: compare checksums
      if (newChecksum.checksum !== oldChecksum.checksum) {
        this.checksums.set(filePath, newChecksum);
        logger.info(`ChecksumTracker: File changed ${filePath}`, {
          oldChecksum: oldChecksum.checksum,
          newChecksum: newChecksum.checksum,
        });
        return true;
      }

      // Mtime/size changed but checksum same (touch, etc.)
      this.checksums.set(filePath, newChecksum);
      return false;
    } catch (error) {
      logger.warn(`ChecksumTracker: Failed to check ${filePath}`, { error });
      return false;
    }
  }

  /**
   * Calculate checksum for a file
   */
  private async calculateChecksum(filePath: string): Promise<FileChecksum> {
    const [content, stats] = await Promise.all([
      readFile(filePath),
      stat(filePath),
    ]);

    const hash = createHash(this.config.algorithm);
    hash.update(content);
    const checksum = hash.digest('hex');

    return {
      path: filePath,
      checksum,
      mtime: stats.mtimeMs,
      size: stats.size,
    };
  }

  /**
   * Check all tracked files for changes and trigger callbacks
   */
  public async checkAll(): Promise<void> {
    const filePaths = Array.from(this.checksums.keys());

    await Promise.all(
      filePaths.map(async (filePath) => {
        const changed = await this.hasChanged(filePath);
        if (changed) {
          await this.triggerCallbacks(filePath);
        }
      })
    );
  }

  /**
   * Trigger all callbacks for a file
   */
  private async triggerCallbacks(filePath: string): Promise<void> {
    const callbacks = this.callbacks.get(filePath);
    if (!callbacks || callbacks.length === 0) {
      return;
    }

    logger.info(`ChecksumTracker: Triggering ${callbacks.length} callbacks for ${filePath}`);

    await Promise.all(
      callbacks.map(async (callback) => {
        try {
          await callback(filePath);
        } catch (error) {
          logger.error(`ChecksumTracker: Callback failed for ${filePath}`, { error });
        }
      })
    );
  }

  /**
   * Start automatic file watching
   */
  public startWatching(): void {
    if (this.watchTimer) {
      logger.warn('ChecksumTracker: Already watching files');
      return;
    }

    this.watchTimer = setInterval(() => {
      this.checkAll().catch((error) => {
        logger.error('ChecksumTracker: Error during automatic check', { error });
      });
    }, this.config.watchIntervalMs);

    logger.info(`ChecksumTracker: Started watching (interval: ${this.config.watchIntervalMs}ms)`);
  }

  /**
   * Stop automatic file watching
   */
  public stopWatching(): void {
    if (this.watchTimer) {
      clearInterval(this.watchTimer);
      this.watchTimer = null;
      logger.info('ChecksumTracker: Stopped watching');
    }
  }

  /**
   * Get all tracked files
   */
  public getTrackedFiles(): string[] {
    return Array.from(this.checksums.keys());
  }

  /**
   * Get checksum info for a file
   */
  public getChecksum(filePath: string): FileChecksum | undefined {
    return this.checksums.get(filePath);
  }

  /**
   * Clear all tracked files
   */
  public clear(): void {
    this.stopWatching();
    this.checksums.clear();
    this.callbacks.clear();
    logger.debug('ChecksumTracker: Cleared all tracked files');
  }
}

/**
 * Create a configured checksum tracker for common dev files
 */
export function createDevFileTracker(): ChecksumTracker {
  const tracker = new ChecksumTracker();
  const cacheManager = getCacheManager();

  // Common files that should trigger cache invalidation
  const fileToNamespaceMap: Record<string, string[]> = {
    'package.json': ['projectDetection'],
    'package-lock.json': ['projectDetection'],
    'go.mod': ['projectDetection', 'goModules'],
    'go.sum': ['goModules'],
    'Makefile': ['projectDetection'],
    '.git/HEAD': ['gitOperations'],
  };

  Object.entries(fileToNamespaceMap).forEach(([file, namespaces]) => {
    tracker.track(file, () => {
      namespaces.forEach((namespace) => {
        cacheManager.invalidate(namespace);
        logger.info(`Cache invalidated: ${namespace} (${file} changed)`);
      });
    }).catch((error) => {
      logger.debug(`ChecksumTracker: Could not track ${file}`, { error });
    });
  });

  return tracker;
}
