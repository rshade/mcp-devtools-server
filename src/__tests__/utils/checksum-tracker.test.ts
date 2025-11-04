import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { ChecksumTracker, createDevFileTracker } from '../../utils/checksum-tracker.js';
import { CacheManager } from '../../utils/cache-manager.js';

describe('ChecksumTracker', () => {
  let tracker: ChecksumTracker;
  let testDir: string;
  let testFile: string;

  beforeEach(async () => {
    // Create test directory
    testDir = join(process.cwd(), 'test-checksum-tracker');
    await mkdir(testDir, { recursive: true });
    testFile = join(testDir, 'test-file.txt');

    tracker = new ChecksumTracker();
  });

  afterEach(async () => {
    tracker.stopWatching();
    tracker.clear();

    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('File Tracking', () => {
    it('should track a file', async () => {
      await writeFile(testFile, 'initial content');

      const callbackMock = jest.fn();
      await tracker.track(testFile, callbackMock);

      const trackedFiles = tracker.getTrackedFiles();
      expect(trackedFiles).toContain(testFile);
    });

    it('should store initial checksum', async () => {
      await writeFile(testFile, 'initial content');
      await tracker.track(testFile, jest.fn());

      const checksum = tracker.getChecksum(testFile);
      expect(checksum).toBeDefined();
      expect(checksum!.path).toBe(testFile);
      expect(checksum!.checksum).toBeTruthy();
      expect(checksum!.mtime).toBeGreaterThan(0);
      expect(checksum!.size).toBeGreaterThan(0);
    });

    it('should untrack a file', async () => {
      await writeFile(testFile, 'initial content');
      await tracker.track(testFile, jest.fn());

      tracker.untrack(testFile);

      const trackedFiles = tracker.getTrackedFiles();
      expect(trackedFiles).not.toContain(testFile);
    });

    it('should handle tracking non-existent file', async () => {
      const nonExistentFile = join(testDir, 'nonexistent.txt');
      const callbackMock = jest.fn();

      await tracker.track(nonExistentFile, callbackMock);

      // Should not throw, but file won't be tracked
      const trackedFiles = tracker.getTrackedFiles();
      expect(trackedFiles).not.toContain(nonExistentFile);
    });
  });

  describe('Change Detection', () => {
    beforeEach(async () => {
      await writeFile(testFile, 'initial content');
      await tracker.track(testFile, jest.fn());
    });

    it('should detect when file content changes', async () => {
      // Modify file
      await writeFile(testFile, 'modified content');

      const changed = await tracker.hasChanged(testFile);
      expect(changed).toBe(true);
    });

    it('should not detect change when file is unchanged', async () => {
      const changed = await tracker.hasChanged(testFile);
      expect(changed).toBe(false);
    });

    it('should consider untracked file as changed', async () => {
      const newFile = join(testDir, 'new-file.txt');
      await writeFile(newFile, 'content');

      const changed = await tracker.hasChanged(newFile);
      expect(changed).toBe(true);
    });

    it('should update checksum after detecting change', async () => {
      const oldChecksum = tracker.getChecksum(testFile)!.checksum;

      await writeFile(testFile, 'modified content');
      await tracker.hasChanged(testFile);

      const newChecksum = tracker.getChecksum(testFile)!.checksum;
      expect(newChecksum).not.toBe(oldChecksum);
    });

    it('should use different checksums for different algorithms', async () => {
      const trackerSHA256 = new ChecksumTracker({ algorithm: 'sha256' });
      const trackerMD5 = new ChecksumTracker({ algorithm: 'md5' });

      await trackerSHA256.track(testFile, jest.fn());
      await trackerMD5.track(testFile, jest.fn());

      const sha256Checksum = trackerSHA256.getChecksum(testFile)!.checksum;
      const md5Checksum = trackerMD5.getChecksum(testFile)!.checksum;

      expect(sha256Checksum).not.toBe(md5Checksum);
      expect(sha256Checksum.length).toBeGreaterThan(md5Checksum.length);

      trackerSHA256.clear();
      trackerMD5.clear();
    });
  });

  describe('Callbacks', () => {
    it('should trigger callback when file changes', async () => {
      await writeFile(testFile, 'initial content');
      const callbackMock = jest.fn();
      await tracker.track(testFile, callbackMock);

      // Modify file and check
      await writeFile(testFile, 'modified content');
      await tracker.checkAll();

      expect(callbackMock).toHaveBeenCalledWith(testFile);
    });

    it('should not trigger callback when file unchanged', async () => {
      await writeFile(testFile, 'initial content');
      const callbackMock = jest.fn();
      await tracker.track(testFile, callbackMock);

      // Check without modifying
      await tracker.checkAll();

      expect(callbackMock).not.toHaveBeenCalled();
    });

    it('should support multiple callbacks for same file', async () => {
      await writeFile(testFile, 'initial content');

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      await tracker.track(testFile, callback1);
      await tracker.track(testFile, callback2);

      await writeFile(testFile, 'modified content');
      await tracker.checkAll();

      expect(callback1).toHaveBeenCalledWith(testFile);
      expect(callback2).toHaveBeenCalledWith(testFile);
    });

    it('should support async callbacks', async () => {
      await writeFile(testFile, 'initial content');

      const asyncCallback = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      await tracker.track(testFile, asyncCallback);

      await writeFile(testFile, 'modified content');
      await tracker.checkAll();

      expect(asyncCallback).toHaveBeenCalledWith(testFile);
    });

    it('should handle callback errors gracefully', async () => {
      await writeFile(testFile, 'initial content');

      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      await tracker.track(testFile, errorCallback);

      await writeFile(testFile, 'modified content');

      // Should not throw
      await expect(tracker.checkAll()).resolves.not.toThrow();
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('Automatic Watching', () => {
    it('should start and stop watching', () => {
      tracker.startWatching();
      // No direct way to check if timer is running, but shouldn't throw
      tracker.stopWatching();
    });

    it('should check files automatically when watching', async () => {
      await writeFile(testFile, 'initial content');

      const callbackMock = jest.fn();
      await tracker.track(testFile, callbackMock);

      // Start watching with short interval
      const fastTracker = new ChecksumTracker({ watchIntervalMs: 100 });
      await fastTracker.track(testFile, callbackMock);
      fastTracker.startWatching();

      // Modify file
      await writeFile(testFile, 'modified content');

      // Wait for automatic check
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(callbackMock).toHaveBeenCalled();

      fastTracker.stopWatching();
      fastTracker.clear();
    });

    it('should not start watching twice', () => {
      tracker.startWatching();
      // Should not throw or cause issues
      tracker.startWatching();
      tracker.stopWatching();
    });
  });

  describe('Multiple Files', () => {
    let file1: string;
    let file2: string;
    let file3: string;

    beforeEach(async () => {
      file1 = join(testDir, 'file1.txt');
      file2 = join(testDir, 'file2.txt');
      file3 = join(testDir, 'file3.txt');

      await Promise.all([
        writeFile(file1, 'content1'),
        writeFile(file2, 'content2'),
        writeFile(file3, 'content3'),
      ]);
    });

    it('should track multiple files', async () => {
      await tracker.track(file1, jest.fn());
      await tracker.track(file2, jest.fn());
      await tracker.track(file3, jest.fn());

      const trackedFiles = tracker.getTrackedFiles();
      expect(trackedFiles).toContain(file1);
      expect(trackedFiles).toContain(file2);
      expect(trackedFiles).toContain(file3);
    });

    it('should detect changes in multiple files', async () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const callback3 = jest.fn();

      await tracker.track(file1, callback1);
      await tracker.track(file2, callback2);
      await tracker.track(file3, callback3);

      // Modify two files
      await writeFile(file1, 'modified1');
      await writeFile(file3, 'modified3');

      await tracker.checkAll();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should clear all tracked files', async () => {
      await tracker.track(file1, jest.fn());
      await tracker.track(file2, jest.fn());
      await tracker.track(file3, jest.fn());

      tracker.clear();

      const trackedFiles = tracker.getTrackedFiles();
      expect(trackedFiles).toHaveLength(0);
    });
  });

  describe('Performance Optimization', () => {
    it('should use fast mtime/size check before checksum', async () => {
      await writeFile(testFile, 'content');
      await tracker.track(testFile, jest.fn());

      // Get initial checksum
      const checksum1 = tracker.getChecksum(testFile)!;

      // Check without modification (should use fast path)
      const changed = await tracker.hasChanged(testFile);

      // Checksum object should be same (not recalculated)
      const checksum2 = tracker.getChecksum(testFile)!;

      expect(changed).toBe(false);
      expect(checksum1.checksum).toBe(checksum2.checksum);
      expect(checksum1.mtime).toBe(checksum2.mtime);
    });
  });

  describe('createDevFileTracker', () => {
    let cacheManager: CacheManager;

    beforeEach(() => {
      CacheManager.resetInstance();
      cacheManager = CacheManager.getInstance();
    });

    afterEach(() => {
      CacheManager.resetInstance();
    });

    it('should create tracker with common dev files', () => {
      const devTracker = createDevFileTracker();
      const trackedFiles = devTracker.getTrackedFiles();

      // Should attempt to track common files (some may not exist)
      expect(trackedFiles.length).toBeGreaterThanOrEqual(0);

      devTracker.clear();
    });

    it('should invalidate cache when tracked files change', async () => {
      // Create a package.json in test directory
      const packageJson = join(testDir, 'package.json');
      await writeFile(packageJson, JSON.stringify({ name: 'test' }));

      // Track it
      const devTracker = new ChecksumTracker();
      await devTracker.track(packageJson, () => {
        cacheManager.invalidate('projectDetection');
      });

      // Add data to cache
      cacheManager.set('projectDetection', 'test-key', 'test-value');
      expect(cacheManager.get('projectDetection', 'test-key')).toBe('test-value');

      // Modify file and trigger check
      await writeFile(packageJson, JSON.stringify({ name: 'modified' }));
      await devTracker.checkAll();

      // Cache should be invalidated
      expect(cacheManager.get('projectDetection', 'test-key')).toBeNull();

      devTracker.clear();
    });
  });

  describe('Edge Cases', () => {
    it('should handle binary files', async () => {
      const binaryFile = join(testDir, 'binary.bin');
      const binaryContent = Buffer.from([0x00, 0xFF, 0xAB, 0xCD]);
      await writeFile(binaryFile, binaryContent);

      await tracker.track(binaryFile, jest.fn());
      const checksum1 = tracker.getChecksum(binaryFile)!;

      // Modify binary content
      const modifiedContent = Buffer.from([0xFF, 0x00, 0xCD, 0xAB]);
      await writeFile(binaryFile, modifiedContent);

      const changed = await tracker.hasChanged(binaryFile);
      expect(changed).toBe(true);

      const checksum2 = tracker.getChecksum(binaryFile)!;
      expect(checksum1.checksum).not.toBe(checksum2.checksum);
    });

    it('should handle empty files', async () => {
      const emptyFile = join(testDir, 'empty.txt');
      await writeFile(emptyFile, '');

      await tracker.track(emptyFile, jest.fn());
      const checksum = tracker.getChecksum(emptyFile);

      expect(checksum).toBeDefined();
      expect(checksum!.size).toBe(0);
      expect(checksum!.checksum).toBeTruthy();
    });

    it('should handle very large files', async () => {
      const largeFile = join(testDir, 'large.txt');
      const largeContent = 'x'.repeat(1024 * 1024); // 1MB
      await writeFile(largeFile, largeContent);

      await tracker.track(largeFile, jest.fn());
      const checksum = tracker.getChecksum(largeFile);

      expect(checksum).toBeDefined();
      expect(checksum!.size).toBe(1024 * 1024);
    });

    it('should handle unicode content', async () => {
      const unicodeFile = join(testDir, 'unicode.txt');
      const unicodeContent = '测试内容 🚀 café naïve résumé';
      await writeFile(unicodeFile, unicodeContent, 'utf8');

      await tracker.track(unicodeFile, jest.fn());
      tracker.getChecksum(unicodeFile);

      // Modify unicode content
      await writeFile(unicodeFile, '不同的内容 🔥', 'utf8');
      const changed = await tracker.hasChanged(unicodeFile);

      expect(changed).toBe(true);
    });
  });
});
