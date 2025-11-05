/**
 * Tests for Platform Detector
 */

import { PlatformDetector, Platform, PackageManager } from '../../utils/platform-detector.js';

describe('PlatformDetector', () => {
  let detector: PlatformDetector;

  beforeEach(() => {
    detector = new PlatformDetector();
    detector.clearCache(); // Clear cache between tests
  });

  describe('detect', () => {
    it('should detect platform information', () => {
      const info = detector.detect();

      expect(info).toBeDefined();
      expect(info.platform).toBeDefined();
      expect(info.packageManager).toBeDefined();
      expect(info.shell).toBeDefined();
      expect(info.arch).toBeDefined();
      expect(info.version).toBeDefined();
    });

    it('should cache detection results', () => {
      const first = detector.detect();
      const second = detector.detect();

      // Should return the same object reference (cached)
      expect(first).toBe(second);
    });

    it('should clear cache when requested', () => {
      const first = detector.detect();
      detector.clearCache();
      const second = detector.detect();

      // After clearing cache, should be different object reference
      expect(first).not.toBe(second);
      // But should have same values
      expect(first.platform).toBe(second.platform);
    });

    it('should detect current platform', () => {
      const info = detector.detect();

      // Platform should be one of the known platforms
      expect(Object.values(Platform)).toContain(info.platform);
    });

    it('should detect architecture', () => {
      const info = detector.detect();

      // Architecture should be a non-empty string
      expect(info.arch).toBeTruthy();
      expect(typeof info.arch).toBe('string');
    });

    it('should detect OS version', () => {
      const info = detector.detect();

      // Version should be a non-empty string
      expect(info.version).toBeTruthy();
      expect(typeof info.version).toBe('string');
    });
  });

  describe('getInstallCommand', () => {
    it('should generate install command for tool', () => {
      const cmd = detector.getInstallCommand('make');

      expect(cmd).toBeTruthy();
      expect(typeof cmd).toBe('string');
      expect(cmd).toContain('make');
    });

    it('should support different package names', () => {
      const cmd = detector.getInstallCommand('go', 'golang-go');

      expect(cmd).toBeTruthy();
      // Should use the package name, not the tool name
      expect(cmd).toContain('golang-go');
    });

    it('should return different commands for different platforms', () => {
      const info = detector.detect();

      // Just verify it returns a command specific to the platform
      const cmd = detector.getInstallCommand('docker');

      expect(cmd).toBeTruthy();

      // Command should vary based on package manager
      if (info.packageManager === PackageManager.Apt) {
        expect(cmd).toContain('apt install');
      } else if (info.packageManager === PackageManager.Brew) {
        expect(cmd).toContain('brew install');
      } else if (info.packageManager === PackageManager.Choco) {
        expect(cmd).toContain('choco install');
      }
    });

    it('should return fallback for unknown package manager', () => {
      // This test might not apply on all systems, but test the fallback
      const cmd = detector.getInstallCommand('some-tool');

      expect(cmd).toBeTruthy();
      // Should contain the tool name
      expect(cmd.toLowerCase()).toContain('some-tool');
    });
  });

  describe('platform-specific behavior', () => {
    it('should detect appropriate package manager for Linux', () => {
      const info = detector.detect();

      if (info.platform === Platform.Linux) {
        // Should detect one of the Linux package managers
        const linuxPMs = [
          PackageManager.Apt,
          PackageManager.Yum,
          PackageManager.Dnf,
          PackageManager.Pacman,
          PackageManager.Apk
        ];
        expect(linuxPMs).toContain(info.packageManager);
      }
    });

    it('should detect appropriate package manager for macOS', () => {
      const info = detector.detect();

      if (info.platform === Platform.MacOS) {
        // Should detect Homebrew or MacPorts on macOS
        const macosPMs = [PackageManager.Brew, PackageManager.MacPorts, PackageManager.Unknown];
        expect(macosPMs).toContain(info.packageManager);
      }
    });

    it('should detect appropriate package manager for Windows', () => {
      const info = detector.detect();

      if (info.platform === Platform.Windows) {
        // Should detect one of the Windows package managers
        const windowsPMs = [
          PackageManager.Choco,
          PackageManager.Scoop,
          PackageManager.Winget,
          PackageManager.Unknown
        ];
        expect(windowsPMs).toContain(info.packageManager);
      }
    });

    it('should detect shell on current platform', () => {
      const info = detector.detect();

      expect(info.shell).toBeTruthy();

      // Common shells
      const commonShells = ['bash', 'zsh', 'fish', 'sh', 'powershell', 'cmd', 'pwsh'];
      const isCommonShell = commonShells.some(shell => info.shell.toLowerCase().includes(shell));

      // Shell should be one of the common ones
      expect(isCommonShell).toBe(true);
    });
  });

  describe('package manager detection', () => {
    it('should handle absence of package manager gracefully', () => {
      const info = detector.detect();

      // Package manager should be defined (even if Unknown)
      expect(info.packageManager).toBeDefined();
      expect(Object.values(PackageManager)).toContain(info.packageManager);
    });
  });

  describe('install command generation', () => {
    it('should generate command for common tools', () => {
      const tools = ['git', 'docker', 'make', 'python', 'node'];

      tools.forEach(tool => {
        const cmd = detector.getInstallCommand(tool);
        expect(cmd).toBeTruthy();
        expect(typeof cmd).toBe('string');
      });
    });

    it('should handle tools with special characters', () => {
      const cmd = detector.getInstallCommand('go-tool');

      expect(cmd).toBeTruthy();
      expect(cmd).toContain('go-tool');
    });
  });
});
