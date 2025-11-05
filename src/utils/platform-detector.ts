/**
 * Platform Detector
 *
 * Detects the operating system platform and package manager
 * for providing platform-specific command suggestions.
 */

import { execSync } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Supported operating system platforms
 */
export enum Platform {
  /** Linux operating systems */
  Linux = 'linux',
  /** macOS (Darwin) operating systems */
  MacOS = 'darwin',
  /** Windows operating systems */
  Windows = 'win32',
  /** FreeBSD operating systems */
  FreeBSD = 'freebsd',
  /** Unknown or unsupported platform */
  Unknown = 'unknown'
}

/**
 * Supported package managers
 */
export enum PackageManager {
  /** Debian/Ubuntu apt package manager */
  Apt = 'apt',
  /** Red Hat/CentOS/Fedora yum package manager */
  Yum = 'yum',
  /** Fedora dnf package manager (modern yum replacement) */
  Dnf = 'dnf',
  /** Arch Linux pacman package manager */
  Pacman = 'pacman',
  /** macOS Homebrew package manager */
  Brew = 'brew',
  /** macOS MacPorts package manager */
  MacPorts = 'port',
  /** Windows Chocolatey package manager */
  Choco = 'choco',
  /** Windows Scoop package manager */
  Scoop = 'scoop',
  /** Windows winget package manager */
  Winget = 'winget',
  /** Alpine Linux apk package manager */
  Apk = 'apk',
  /** FreeBSD pkg package manager */
  Pkg = 'pkg',
  /** Unknown or no package manager detected */
  Unknown = 'unknown'
}

/**
 * Detected platform information
 * @property {Platform} platform - The operating system platform
 * @property {PackageManager} packageManager - The primary package manager available
 * @property {string} shell - The default shell (bash, zsh, powershell, etc.)
 * @property {string} arch - System architecture (x64, arm64, etc.)
 * @property {string} version - OS version string
 */
export interface PlatformInfo {
  platform: Platform;
  packageManager: PackageManager;
  shell: string;
  arch: string;
  version: string;
}

/**
 * Detects platform information for providing context-aware suggestions
 *
 * Identifies the operating system, available package manager, shell environment,
 * and system architecture to enable platform-specific command recommendations.
 */
export class PlatformDetector {
  private cachedInfo: PlatformInfo | null = null;

  /**
   * Detect complete platform information
   *
   * Results are cached after first detection to avoid repeated system calls.
   *
   * @returns {PlatformInfo} Complete platform information
   *
   * @example
   * ```typescript
   * const detector = new PlatformDetector();
   * const info = detector.detect();
   * console.log(`Platform: ${info.platform}`);
   * console.log(`Package Manager: ${info.packageManager}`);
   * ```
   */
  detect(): PlatformInfo {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    const platform = this.detectPlatform();
    const packageManager = this.detectPackageManager(platform);
    const shell = this.detectShell();
    const arch = os.arch();
    const version = os.release();

    this.cachedInfo = {
      platform,
      packageManager,
      shell,
      arch,
      version
    };

    return this.cachedInfo;
  }

  /**
   * Detect the operating system platform
   *
   * Maps Node.js os.platform() values to Platform enum.
   *
   * @returns {Platform} The detected platform
   * @private
   */
  private detectPlatform(): Platform {
    const nodePlatform = os.platform();

    switch (nodePlatform) {
      case 'linux':
        return Platform.Linux;
      case 'darwin':
        return Platform.MacOS;
      case 'win32':
        return Platform.Windows;
      case 'freebsd':
        return Platform.FreeBSD;
      default:
        return Platform.Unknown;
    }
  }

  /**
   * Detect the available package manager
   *
   * Checks for the presence of common package managers based on platform.
   * For Linux, checks distribution-specific files and commands.
   * Returns the first available package manager found.
   *
   * @param {Platform} platform - The detected platform
   * @returns {PackageManager} The detected package manager
   * @private
   */
  private detectPackageManager(platform: Platform): PackageManager {
    switch (platform) {
      case Platform.Linux:
        return this.detectLinuxPackageManager();
      case Platform.MacOS:
        return this.detectMacOSPackageManager();
      case Platform.Windows:
        return this.detectWindowsPackageManager();
      case Platform.FreeBSD:
        return this.commandExists('pkg') ? PackageManager.Pkg : PackageManager.Unknown;
      default:
        return PackageManager.Unknown;
    }
  }

  /**
   * Detect Linux package manager
   *
   * Checks for distribution-specific files and command availability:
   * - /etc/debian_version → apt
   * - /etc/redhat-release → yum/dnf
   * - /etc/arch-release → pacman
   * - /etc/alpine-release → apk
   *
   * @returns {PackageManager} The detected Linux package manager
   * @private
   */
  private detectLinuxPackageManager(): PackageManager {
    // Check for distribution-specific files
    if (this.fileExists('/etc/debian_version')) {
      return PackageManager.Apt;
    }

    if (this.fileExists('/etc/redhat-release') || this.fileExists('/etc/fedora-release')) {
      // Prefer dnf over yum on Fedora/newer RHEL
      if (this.commandExists('dnf')) {
        return PackageManager.Dnf;
      }
      if (this.commandExists('yum')) {
        return PackageManager.Yum;
      }
    }

    if (this.fileExists('/etc/arch-release')) {
      return PackageManager.Pacman;
    }

    if (this.fileExists('/etc/alpine-release')) {
      return PackageManager.Apk;
    }

    // Fallback: Check command availability
    if (this.commandExists('apt-get') || this.commandExists('apt')) {
      return PackageManager.Apt;
    }
    if (this.commandExists('dnf')) {
      return PackageManager.Dnf;
    }
    if (this.commandExists('yum')) {
      return PackageManager.Yum;
    }
    if (this.commandExists('pacman')) {
      return PackageManager.Pacman;
    }
    if (this.commandExists('apk')) {
      return PackageManager.Apk;
    }

    return PackageManager.Unknown;
  }

  /**
   * Detect macOS package manager
   *
   * Checks for Homebrew and MacPorts, preferring Homebrew if both exist.
   *
   * @returns {PackageManager} The detected macOS package manager
   * @private
   */
  private detectMacOSPackageManager(): PackageManager {
    if (this.commandExists('brew')) {
      return PackageManager.Brew;
    }
    if (this.commandExists('port')) {
      return PackageManager.MacPorts;
    }
    return PackageManager.Unknown;
  }

  /**
   * Detect Windows package manager
   *
   * Checks for Chocolatey, Scoop, and winget (Windows Package Manager).
   *
   * @returns {PackageManager} The detected Windows package manager
   * @private
   */
  private detectWindowsPackageManager(): PackageManager {
    if (this.commandExists('choco')) {
      return PackageManager.Choco;
    }
    if (this.commandExists('scoop')) {
      return PackageManager.Scoop;
    }
    if (this.commandExists('winget')) {
      return PackageManager.Winget;
    }
    return PackageManager.Unknown;
  }

  /**
   * Detect the default shell
   *
   * Checks SHELL environment variable on Unix-like systems,
   * defaults to PowerShell on Windows.
   *
   * @returns {string} The detected shell (bash, zsh, fish, powershell, cmd, etc.)
   * @private
   */
  private detectShell(): string {
    // Check SHELL environment variable (Unix-like systems)
    const shellEnv = process.env.SHELL;
    if (shellEnv) {
      // Extract shell name from path (e.g., /bin/bash → bash)
      const shellName = shellEnv.split('/').pop() || shellEnv;
      return shellName;
    }

    // Windows default shells
    if (os.platform() === 'win32') {
      if (process.env.PSModulePath) {
        return 'powershell';
      }
      return 'cmd';
    }

    // Fallback
    return 'bash';
  }

  /**
   * Check if a file exists
   *
   * @param {string} path - File path to check
   * @returns {boolean} True if file exists, false otherwise
   * @private
   */
  private fileExists(path: string): boolean {
    try {
      return fs.existsSync(path);
    } catch {
      return false;
    }
  }

  /**
   * Check if a command exists in PATH
   *
   * Uses 'which' on Unix-like systems, 'where' on Windows.
   * Returns true if command is found, false otherwise.
   *
   * @param {string} command - Command name to check
   * @returns {boolean} True if command exists in PATH
   * @private
   */
  private commandExists(command: string): boolean {
    try {
      const checkCommand = os.platform() === 'win32'
        ? `where ${command}`
        : `which ${command}`;

      // Use configurable timeout (default 3 seconds) to prevent slow detection
      const timeout = process.env.PLATFORM_DETECT_TIMEOUT
        ? parseInt(process.env.PLATFORM_DETECT_TIMEOUT, 10)
        : 3000;

      execSync(checkCommand, {
        stdio: 'ignore',
        timeout
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get platform-specific install command for a tool
   *
   * Provides platform-appropriate installation commands based on detected
   * package manager and platform.
   *
   * @param {string} toolName - Name of the tool to install
   * @param {string} [packageName] - Package name if different from tool name
   * @returns {string} Platform-specific install command
   *
   * @example
   * ```typescript
   * const detector = new PlatformDetector();
   * const cmd = detector.getInstallCommand('make');
   * // On Ubuntu: "sudo apt install build-essential"
   * // On macOS: "brew install make"
   * ```
   */
  getInstallCommand(toolName: string, packageName?: string): string {
    const info = this.detect();
    const pkg = packageName || toolName;

    switch (info.packageManager) {
      case PackageManager.Apt:
        return `sudo apt install ${pkg}`;
      case PackageManager.Yum:
        return `sudo yum install ${pkg}`;
      case PackageManager.Dnf:
        return `sudo dnf install ${pkg}`;
      case PackageManager.Pacman:
        return `sudo pacman -S ${pkg}`;
      case PackageManager.Brew:
        return `brew install ${pkg}`;
      case PackageManager.MacPorts:
        return `sudo port install ${pkg}`;
      case PackageManager.Choco:
        return `choco install ${pkg}`;
      case PackageManager.Scoop:
        return `scoop install ${pkg}`;
      case PackageManager.Winget:
        return `winget install ${pkg}`;
      case PackageManager.Apk:
        return `apk add ${pkg}`;
      case PackageManager.Pkg:
        return `pkg install ${pkg}`;
      default:
        return `# Install ${toolName} for your platform`;
    }
  }

  /**
   * Clear cached platform information
   *
   * Forces re-detection on next detect() call.
   * Useful for testing or if platform changes.
   */
  clearCache(): void {
    this.cachedInfo = null;
  }
}
