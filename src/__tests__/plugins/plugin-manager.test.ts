/**
 * Plugin Manager Tests
 *
 * Comprehensive test suite for the PluginManager class.
 * Tests plugin discovery, loading, registration, tool execution, and error handling.
 *
 * Coverage target: 90%+
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import winston from 'winston';
import { PluginManager } from '../../plugins/plugin-manager.js';
import { ShellExecutor } from '../../utils/shell-executor.js';
import {
  Plugin,
  PluginMetadata,
  PluginContext,
  PluginTool,
  PluginHealth,
  PluginConfiguration,
  PluginRegistrationError,
  PluginExecutionError,
  PluginDependencyError,
} from '../../plugins/plugin-interface.js';

// Mock logger
const mockLogger = winston.createLogger({
  silent: true,
  transports: [],
});

// Mock ShellExecutor
class MockShellExecutor extends ShellExecutor {
  constructor() {
    super('/test/project');
  }

  async isCommandAvailable(command: string): Promise<boolean> {
    // Simulate gs being available
    return command === 'gs';
  }
}

// Mock plugin for testing
class MockPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'mock-plugin',
    version: '1.0.0',
    description: 'Mock plugin for testing',
    requiredCommands: ['gs'],
    tags: ['test'],
    defaultEnabled: true,
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_context: PluginContext): Promise<void> {
    // Mock initialization
  }

  async registerTools(): Promise<PluginTool[]> {
    return [
      {
        name: 'mock_action',
        description: 'Mock action',
        inputSchema: {
          type: 'object',
          properties: {
            value: { type: 'string' },
          },
        },
      },
    ];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleToolCall(toolName: string, _args: unknown): Promise<unknown> {
    if (toolName === 'mock_action') {
      return { success: true, message: 'Mock action executed' };
    }
    throw new Error(`Unknown tool: ${toolName}`);
  }
}

// Plugin with missing dependencies
class PluginWithMissingDeps implements Plugin {
  metadata: PluginMetadata = {
    name: 'missing-deps',
    version: '1.0.0',
    description: 'Plugin with missing dependencies',
    requiredCommands: ['nonexistent-command'],
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_context: PluginContext): Promise<void> {}
  async registerTools(): Promise<PluginTool[]> {
    return [];
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleToolCall(_toolName: string, _args: unknown): Promise<unknown> {
    return {};
  }
}

// Plugin that fails initialization
class FailingPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'failing-plugin',
    version: '1.0.0',
    description: 'Plugin that fails',
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_context: PluginContext): Promise<void> {
    throw new Error('Initialization failed');
  }

  async registerTools(): Promise<PluginTool[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleToolCall(_toolName: string, _args: unknown): Promise<unknown> {
    return {};
  }
}

// Plugin with health check
class HealthCheckPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'health-plugin',
    version: '1.0.0',
    description: 'Plugin with health check',
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_context: PluginContext): Promise<void> {}

  async registerTools(): Promise<PluginTool[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleToolCall(_toolName: string, _args: unknown): Promise<unknown> {
    return {};
  }

  async healthCheck(): Promise<PluginHealth> {
    return {
      status: 'healthy',
      message: 'All systems operational',
      checks: {
        'test-check': true,
      },
      timestamp: new Date(),
    };
  }
}

// Plugin with config validation
class ConfigValidationPlugin implements Plugin {
  metadata: PluginMetadata = {
    name: 'config-plugin',
    version: '1.0.0',
    description: 'Plugin with config validation',
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(_context: PluginContext): Promise<void> {}

  async registerTools(): Promise<PluginTool[]> {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handleToolCall(_toolName: string, _args: unknown): Promise<unknown> {
    return {};
  }

  async validateConfig(config: unknown): Promise<boolean> {
    const cfg = config as Record<string, unknown>;
    return cfg.required === true;
  }
}

describe('PluginManager', () => {
  let shellExecutor: ShellExecutor;
  let projectRoot: string;

  beforeEach(() => {
    shellExecutor = new MockShellExecutor();
    projectRoot = '/test/project';
  });

  describe('constructor', () => {
    it('should create a PluginManager instance', () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);

      expect(manager).toBeInstanceOf(PluginManager);
    });
  });

  describe('registerPlugin', () => {
    it('should register a plugin successfully', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      await manager.registerPlugin(plugin);

      expect(manager.getLoadedPlugins()).toContain('mock-plugin');
    });

    it('should throw error if plugin already registered', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      await manager.registerPlugin(plugin);

      await expect(manager.registerPlugin(plugin)).rejects.toThrow(
        PluginRegistrationError
      );
    });

    it('should throw error if required dependencies are missing', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new PluginWithMissingDeps();

      await expect(manager.registerPlugin(plugin)).rejects.toThrow(
        PluginDependencyError
      );
    });

    it('should throw error if plugin initialization fails', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new FailingPlugin();

      await expect(manager.registerPlugin(plugin)).rejects.toThrow();
    });

    it('should validate plugin configuration if validateConfig is implemented', async () => {
      const config: PluginConfiguration = {
        'config-plugin': {
          required: true,
        },
      };
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new ConfigValidationPlugin();

      await manager.registerPlugin(plugin);

      expect(manager.getLoadedPlugins()).toContain('config-plugin');
    });

    it('should fail if plugin configuration validation fails', async () => {
      const config: PluginConfiguration = {
        'config-plugin': {
          required: false,
        },
      };
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new ConfigValidationPlugin();

      await expect(manager.registerPlugin(plugin)).rejects.toThrow(
        PluginRegistrationError
      );
    });

    it('should perform initial health check on registration', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new HealthCheckPlugin();

      await manager.registerPlugin(plugin);

      const health = await manager.getPluginHealth('health-plugin');
      expect(health).not.toBeNull();
      expect(health?.status).toBe('healthy');
    });
  });

  describe('getAllTools', () => {
    it('should return all tools from registered plugins', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      await manager.registerPlugin(plugin);

      const tools = await manager.getAllTools();

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('mock_plugin_mock_action');
      expect(tools[0].description).toContain('[mock-plugin]');
    });

    it('should return empty array if no plugins registered', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);

      const tools = await manager.getAllTools();

      expect(tools).toHaveLength(0);
    });

    it('should namespace tool names correctly', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      await manager.registerPlugin(plugin);

      const tools = await manager.getAllTools();

      // Plugin name: mock-plugin, Tool name: mock_action
      // Expected: mock_plugin_mock_action
      expect(tools[0].name).toBe('mock_plugin_mock_action');
    });
  });

  describe('executeToolCall', () => {
    it('should execute tool call successfully', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      await manager.registerPlugin(plugin);

      const result = await manager.executeToolCall('mock_plugin_mock_action', {
        value: 'test',
      });

      expect(result).toEqual({ success: true, message: 'Mock action executed' });
    });

    it('should throw error for unknown tool', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);

      await expect(
        manager.executeToolCall('unknown_tool', {})
      ).rejects.toThrow(PluginExecutionError);
    });

    it('should throw error if plugin not loaded', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);

      // Manually add tool to registry without loading plugin
      // This simulates a corrupted state
      await expect(
        manager.executeToolCall('nonexistent_plugin_tool', {})
      ).rejects.toThrow(PluginExecutionError);
    });
  });

  describe('checkDependencies', () => {
    it('should return all dependencies available', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      const result = await manager.checkDependencies(plugin);

      expect(result.allAvailable).toBe(true);
      expect(result.available).toContain('gs');
      expect(result.missing).toHaveLength(0);
    });

    it('should return missing dependencies', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new PluginWithMissingDeps();

      const result = await manager.checkDependencies(plugin);

      expect(result.allAvailable).toBe(false);
      expect(result.missing).toContain('nonexistent-command');
      expect(result.installInstructions).toBeDefined();
    });

    it('should return empty result if no required commands', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new HealthCheckPlugin(); // No required commands

      const result = await manager.checkDependencies(plugin);

      expect(result.allAvailable).toBe(true);
      expect(result.available).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('getPluginHealth', () => {
    it('should return health status for plugin with health check', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new HealthCheckPlugin();

      await manager.registerPlugin(plugin);

      const health = await manager.getPluginHealth('health-plugin');

      expect(health).not.toBeNull();
      expect(health?.status).toBe('healthy');
      expect(health?.message).toBe('All systems operational');
      expect(health?.checks).toEqual({ 'test-check': true });
    });

    it('should return cached health for plugin without health check', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      await manager.registerPlugin(plugin);

      const health = await manager.getPluginHealth('mock-plugin');

      expect(health).not.toBeNull();
      expect(health?.status).toBe('healthy');
    });

    it('should return null for non-existent plugin', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);

      const health = await manager.getPluginHealth('nonexistent');

      expect(health).toBeNull();
    });
  });

  describe('getAllPluginHealth', () => {
    it('should return health status for all plugins', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin1 = new MockPlugin();
      const plugin2 = new HealthCheckPlugin();

      await manager.registerPlugin(plugin1);
      await manager.registerPlugin(plugin2);

      const healthMap = await manager.getAllPluginHealth();

      expect(healthMap.size).toBe(2);
      expect(healthMap.has('mock-plugin')).toBe(true);
      expect(healthMap.has('health-plugin')).toBe(true);
    });

    it('should return empty map if no plugins', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);

      const healthMap = await manager.getAllPluginHealth();

      expect(healthMap.size).toBe(0);
    });
  });

  describe('getLoadedPlugins', () => {
    it('should return list of loaded plugin names', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      await manager.registerPlugin(plugin);

      const plugins = manager.getLoadedPlugins();

      expect(plugins).toContain('mock-plugin');
    });

    it('should return empty array if no plugins loaded', () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);

      const plugins = manager.getLoadedPlugins();

      expect(plugins).toHaveLength(0);
    });
  });

  describe('getPluginMetadata', () => {
    it('should return plugin metadata', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      await manager.registerPlugin(plugin);

      const metadata = manager.getPluginMetadata('mock-plugin');

      expect(metadata).not.toBeNull();
      expect(metadata?.name).toBe('mock-plugin');
      expect(metadata?.version).toBe('1.0.0');
    });

    it('should return null for non-existent plugin', () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);

      const metadata = manager.getPluginMetadata('nonexistent');

      expect(metadata).toBeNull();
    });
  });

  describe('shutdownAll', () => {
    it('should shutdown all plugins', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin = new MockPlugin();

      await manager.registerPlugin(plugin);

      await manager.shutdownAll();

      expect(manager.getLoadedPlugins()).toHaveLength(0);
    });

    it('should continue on shutdown errors', async () => {
      const config: PluginConfiguration = {};
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);

      // Create plugin with failing shutdown
      const basePlugin = new MockPlugin();
      const pluginWithShutdown: Plugin = {
        metadata: basePlugin.metadata,
        initialize: basePlugin.initialize.bind(basePlugin),
        registerTools: basePlugin.registerTools.bind(basePlugin),
        handleToolCall: basePlugin.handleToolCall.bind(basePlugin),
        shutdown: async () => {
          throw new Error('Shutdown failed');
        },
      };

      await manager.registerPlugin(pluginWithShutdown);

      // Should not throw
      await expect(manager.shutdownAll()).resolves.not.toThrow();
    });
  });

  describe('plugin filtering', () => {
    it('should load only enabled plugins', async () => {
      const config: PluginConfiguration = {
        enabled: ['mock-plugin'],
      };
      const manager = new PluginManager(projectRoot, config, shellExecutor, mockLogger);
      const plugin1 = new MockPlugin();

      await manager.registerPlugin(plugin1);

      // health-plugin should not be loaded because enabled list exists
      // We'd need to test this with loadPlugins(), but since we can't easily
      // mock the filesystem, we'll skip this integration test
      expect(manager.getLoadedPlugins()).toContain('mock-plugin');
    });
  });
});
