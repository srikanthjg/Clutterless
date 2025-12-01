import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Integration Test: Configuration Flows for All Providers
 * 
 * Tests the configuration and validation flows for:
 * 1. AWS Bedrock configuration and validation
 * 2. Google Gemini configuration and validation
 * 3. Local LLM configuration and validation
 * 4. Switching between providers
 * 5. Invalid credential handling
 * 
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.8
 */

describe('Configuration Integration Tests', () => {
  let mockChrome;
  let storedConfig;

  beforeEach(() => {
    storedConfig = null;

    mockChrome = {
      storage: {
        local: {
          get: vi.fn().mockImplementation(() => {
            return Promise.resolve(storedConfig ? { config: storedConfig } : {});
          }),
          set: vi.fn().mockImplementation((data) => {
            if (data.config) {
              storedConfig = data.config;
            }
            return Promise.resolve();
          })
        }
      },
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn()
        }
      }
    };

    global.chrome = mockChrome;
    global.fetch = vi.fn();
  });

  describe('AWS Bedrock Configuration', () => {
    it('should save valid Bedrock credentials', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const bedrockConfig = {
        provider: 'bedrock',
        credentials: {
          accessKey: 'AKIAIOSFODNN7EXAMPLE',
          secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          region: 'us-east-1'
        }
      };

      const result = await saveConfig(bedrockConfig);

      expect(result.success).toBe(true);
      expect(storedConfig.provider).toBe('bedrock');
      expect(storedConfig.credentials.accessKey).toBe('AKIAIOSFODNN7EXAMPLE');
      expect(storedConfig.credentials.region).toBe('us-east-1');
      expect(storedConfig.configured).toBe(true);
    });

    it('should validate Bedrock credentials format', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const invalidConfig = {
        provider: 'bedrock',
        credentials: {
          accessKey: 'invalid',
          secretKey: 'short',
          region: 'us-east-1'
        }
      };

      const result = await saveConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should reject Bedrock config with missing credentials', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const incompleteConfig = {
        provider: 'bedrock',
        credentials: {
          accessKey: 'AKIAIOSFODNN7EXAMPLE'
          // Missing secretKey and region
        }
      };

      const result = await saveConfig(incompleteConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Google Gemini Configuration', () => {
    it('should save valid Gemini API key', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const geminiConfig = {
        provider: 'gemini',
        credentials: {
          apiKey: 'AIzaSyDemoKey1234567890abcdefghijklmnop'
        }
      };

      const result = await saveConfig(geminiConfig);

      expect(result.success).toBe(true);
      expect(storedConfig.provider).toBe('gemini');
      expect(storedConfig.credentials.apiKey).toBe('AIzaSyDemoKey1234567890abcdefghijklmnop');
      expect(storedConfig.configured).toBe(true);
    });

    it('should validate Gemini API key format', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const invalidConfig = {
        provider: 'gemini',
        credentials: {
          apiKey: 'invalid-key'
        }
      };

      const result = await saveConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('invalid');
    });

    it('should reject empty Gemini API key', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const emptyConfig = {
        provider: 'gemini',
        credentials: {
          apiKey: ''
        }
      };

      const result = await saveConfig(emptyConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Local LLM Configuration', () => {
    it('should save valid local LLM endpoint', async () => {
      const { saveConfig } = await import('../../background/background.js');

      // Mock successful endpoint validation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      const localConfig = {
        provider: 'local',
        credentials: {
          endpoint: 'http://localhost:11434/v1/chat/completions',
          apiKey: 'optional-key'
        }
      };

      const result = await saveConfig(localConfig);

      expect(result.success).toBe(true);
      expect(storedConfig.provider).toBe('local');
      expect(storedConfig.credentials.endpoint).toBe('http://localhost:11434/v1/chat/completions');
      expect(storedConfig.configured).toBe(true);
    });

    it('should validate local LLM endpoint is reachable', async () => {
      const { saveConfig } = await import('../../background/background.js');

      // Mock unreachable endpoint
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const localConfig = {
        provider: 'local',
        credentials: {
          endpoint: 'http://localhost:9999/v1/chat/completions'
        }
      };

      const result = await saveConfig(localConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('reachable');
    });

    it('should accept local LLM without API key', async () => {
      const { saveConfig } = await import('../../background/background.js');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      const localConfig = {
        provider: 'local',
        credentials: {
          endpoint: 'http://localhost:11434/v1/chat/completions'
          // No API key
        }
      };

      const result = await saveConfig(localConfig);

      expect(result.success).toBe(true);
      expect(storedConfig.credentials.apiKey).toBeUndefined();
    });

    it('should validate local LLM endpoint URL format', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const invalidConfig = {
        provider: 'local',
        credentials: {
          endpoint: 'not-a-valid-url'
        }
      };

      const result = await saveConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('URL');
    });

    it('should support HTTPS endpoints for local LLM', async () => {
      const { saveConfig } = await import('../../background/background.js');

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      const httpsConfig = {
        provider: 'local',
        credentials: {
          endpoint: 'https://my-llm-server.local:8443/v1/chat/completions'
        }
      };

      const result = await saveConfig(httpsConfig);

      expect(result.success).toBe(true);
      expect(storedConfig.credentials.endpoint).toContain('https://');
    });
  });

  describe('Provider Switching', () => {
    it('should switch from Bedrock to Gemini', async () => {
      const { saveConfig, getConfig } = await import('../../background/background.js');

      // First configure Bedrock
      await saveConfig({
        provider: 'bedrock',
        credentials: {
          accessKey: 'AKIAIOSFODNN7EXAMPLE',
          secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          region: 'us-east-1'
        }
      });

      let config = await getConfig();
      expect(config.provider).toBe('bedrock');

      // Switch to Gemini
      await saveConfig({
        provider: 'gemini',
        credentials: {
          apiKey: 'AIzaSyDemoKey1234567890abcdefghijklmnop'
        }
      });

      config = await getConfig();
      expect(config.provider).toBe('gemini');
      expect(config.credentials.apiKey).toBeDefined();
      expect(config.credentials.accessKey).toBeUndefined();
    });

    it('should switch from Gemini to Local LLM', async () => {
      const { saveConfig, getConfig } = await import('../../background/background.js');

      // Configure Gemini
      await saveConfig({
        provider: 'gemini',
        credentials: {
          apiKey: 'AIzaSyDemoKey1234567890abcdefghijklmnop'
        }
      });

      // Switch to Local LLM
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' })
      });

      await saveConfig({
        provider: 'local',
        credentials: {
          endpoint: 'http://localhost:11434/v1/chat/completions'
        }
      });

      const config = await getConfig();
      expect(config.provider).toBe('local');
      expect(config.credentials.endpoint).toBeDefined();
      expect(config.credentials.apiKey).toBeUndefined();
    });

    it('should preserve configuration when switching fails', async () => {
      const { saveConfig, getConfig } = await import('../../background/background.js');

      // Configure valid Gemini
      await saveConfig({
        provider: 'gemini',
        credentials: {
          apiKey: 'AIzaSyDemoKey1234567890abcdefghijklmnop'
        }
      });

      const originalConfig = await getConfig();

      // Try to switch to invalid Bedrock config
      const result = await saveConfig({
        provider: 'bedrock',
        credentials: {
          accessKey: 'invalid'
        }
      });

      expect(result.success).toBe(false);

      // Verify original config is preserved
      const currentConfig = await getConfig();
      expect(currentConfig.provider).toBe(originalConfig.provider);
      expect(currentConfig.credentials.apiKey).toBe(originalConfig.credentials.apiKey);
    });
  });

  describe('Invalid Credential Handling', () => {
    it('should display clear error for invalid Bedrock credentials', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const invalidConfig = {
        provider: 'bedrock',
        credentials: {
          accessKey: 'INVALID',
          secretKey: 'INVALID',
          region: 'invalid-region'
        }
      };

      const result = await saveConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.length).toBeGreaterThan(0);
    });

    it('should display clear error for invalid Gemini API key', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const invalidConfig = {
        provider: 'gemini',
        credentials: {
          apiKey: 'xyz'
        }
      };

      const result = await saveConfig(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should display clear error for unreachable local LLM', async () => {
      const { saveConfig } = await import('../../background/background.js');

      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const unreachableConfig = {
        provider: 'local',
        credentials: {
          endpoint: 'http://localhost:9999/v1/chat/completions'
        }
      };

      const result = await saveConfig(unreachableConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('reachable');
    });

    it('should prevent saving when validation fails', async () => {
      const { saveConfig } = await import('../../background/background.js');

      const invalidConfig = {
        provider: 'gemini',
        credentials: {
          apiKey: ''
        }
      };

      await saveConfig(invalidConfig);

      // Verify nothing was saved
      expect(storedConfig).toBeNull();
    });
  });

  describe('Configuration Retrieval', () => {
    it('should retrieve saved configuration', async () => {
      const { saveConfig, getConfig } = await import('../../background/background.js');

      const testConfig = {
        provider: 'gemini',
        credentials: {
          apiKey: 'AIzaSyDemoKey1234567890abcdefghijklmnop'
        }
      };

      await saveConfig(testConfig);
      const retrieved = await getConfig();

      expect(retrieved.provider).toBe('gemini');
      expect(retrieved.credentials.apiKey).toBe('AIzaSyDemoKey1234567890abcdefghijklmnop');
      expect(retrieved.configured).toBe(true);
    });

    it('should return unconfigured status when no config exists', async () => {
      const { getConfig } = await import('../../background/background.js');

      const config = await getConfig();

      expect(config.configured).toBe(false);
    });
  });
});
