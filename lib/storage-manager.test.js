/**
 * Unit tests for storage-manager.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Chrome storage API
const mockStorage = {
  local: {
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn()
  }
};

// Mock Web Crypto API
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      generateKey: vi.fn(),
      exportKey: vi.fn(),
      importKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn()
    },
    getRandomValues: vi.fn((arr) => {
      // Fill with pseudo-random values for testing
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    })
  },
  writable: true,
  configurable: true
});

global.chrome = {
  storage: mockStorage
};

// Mock TextEncoder/TextDecoder
global.TextEncoder = class {
  encode(str) {
    return new Uint8Array([...str].map(c => c.charCodeAt(0)));
  }
};

global.TextDecoder = class {
  decode(arr) {
    // Handle ArrayBuffer or TypedArray
    const uint8Array = arr instanceof ArrayBuffer 
      ? new Uint8Array(arr)
      : arr;
    return String.fromCharCode(...uint8Array);
  }
};

// Import the module after mocking
const {
  saveCredentials,
  getCredentials,
  clearCredentials,
  getConfig,
  saveConfig
} = await import('./storage-manager.js');

describe('Storage Manager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('saveCredentials', () => {
    beforeEach(() => {
      // Setup crypto mocks for encryption
      const mockKey = { type: 'secret' };
      const mockEncrypted = new Uint8Array([1, 2, 3, 4]);
      const mockExportedKey = new Uint8Array([5, 6, 7, 8]);
      
      crypto.subtle.generateKey.mockResolvedValue(mockKey);
      crypto.subtle.exportKey.mockResolvedValue(mockExportedKey.buffer);
      crypto.subtle.importKey.mockResolvedValue(mockKey);
      crypto.subtle.encrypt.mockResolvedValue(mockEncrypted.buffer);
      crypto.subtle.decrypt.mockImplementation(() => {
        const data = JSON.stringify({
          provider: 'bedrock',
          credentials: { accessKey: 'test', secretKey: 'test', region: 'us-east-1' },
          timestamp: Date.now()
        });
        return Promise.resolve(new TextEncoder().encode(data).buffer);
      });
      
      mockStorage.local.get.mockResolvedValue({});
    });

    it('should save Bedrock credentials with encryption', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      const credentials = {
        accessKey: 'test-access-key',
        secretKey: 'test-secret-key',
        region: 'us-east-1'
      };

      await saveCredentials('bedrock', credentials);

      // Should generate/retrieve encryption key
      expect(crypto.subtle.generateKey).toHaveBeenCalled();
      
      // Should encrypt the credentials
      expect(crypto.subtle.encrypt).toHaveBeenCalled();
      
      // Should store encrypted data
      expect(mockStorage.local.set).toHaveBeenCalled();
      
      // Find the call that stored credentials (not the encryption key)
      const credentialsCall = mockStorage.local.set.mock.calls.find(
        call => call[0].llm_credentials
      );
      expect(credentialsCall).toBeDefined();
      expect(credentialsCall[0].llm_credentials).toHaveProperty('encrypted');
      expect(credentialsCall[0].llm_credentials).toHaveProperty('iv');
    });

    it('should save Gemini credentials successfully', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      const credentials = {
        apiKey: 'test-api-key'
      };

      await saveCredentials('gemini', credentials);

      // Should be called twice: once for encryption key, once for credentials
      expect(mockStorage.local.set).toHaveBeenCalled();
      
      // Find the call that stored credentials (not the encryption key)
      const credentialsCall = mockStorage.local.set.mock.calls.find(
        call => call[0].llm_credentials
      );
      expect(credentialsCall).toBeDefined();
      expect(credentialsCall[0].llm_credentials).toHaveProperty('encrypted');
      expect(credentialsCall[0].llm_credentials).toHaveProperty('iv');
    });

    it('should save Local LLM credentials successfully', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      const credentials = {
        endpoint: 'http://localhost:11434/v1/chat/completions',
        apiKey: 'optional-key'
      };

      await saveCredentials('local', credentials);

      // Should be called for encryption key and credentials
      expect(mockStorage.local.set).toHaveBeenCalled();
      
      // Find the call that stored credentials
      const credentialsCall = mockStorage.local.set.mock.calls.find(
        call => call[0].llm_credentials
      );
      expect(credentialsCall).toBeDefined();
      expect(credentialsCall[0].llm_credentials).toHaveProperty('encrypted');
      expect(credentialsCall[0].llm_credentials).toHaveProperty('iv');
    });

    it('should throw error for missing provider', async () => {
      await expect(saveCredentials(null, {})).rejects.toThrow('Provider and credentials are required');
    });

    it('should throw error for missing credentials', async () => {
      await expect(saveCredentials('bedrock', null)).rejects.toThrow('Provider and credentials are required');
    });

    it('should throw error for invalid provider', async () => {
      await expect(saveCredentials('invalid', {})).rejects.toThrow('Invalid provider');
    });

    it('should throw error for incomplete Bedrock credentials', async () => {
      const credentials = {
        accessKey: 'test-key'
        // missing secretKey and region
      };

      await expect(saveCredentials('bedrock', credentials)).rejects.toThrow('Bedrock requires accessKey, secretKey, and region');
    });

    it('should throw error for missing Gemini API key', async () => {
      await expect(saveCredentials('gemini', {})).rejects.toThrow('Gemini requires apiKey');
    });

    it('should throw error for missing Local LLM endpoint', async () => {
      await expect(saveCredentials('local', {})).rejects.toThrow('Local LLM requires endpoint');
    });

    it('should throw error for invalid Local LLM endpoint URL', async () => {
      const credentials = {
        endpoint: 'not-a-valid-url'
      };

      await expect(saveCredentials('local', credentials)).rejects.toThrow('Invalid endpoint');
    });

    it('should reject non-HTTPS endpoints for Local LLM (except localhost)', async () => {
      const credentials = {
        endpoint: 'http://example.com/api'
      };

      await expect(saveCredentials('local', credentials)).rejects.toThrow('Only HTTPS connections are allowed');
    });

    it('should allow HTTP for localhost endpoints', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      const credentials = {
        endpoint: 'http://localhost:11434/v1/chat/completions'
      };

      await expect(saveCredentials('local', credentials)).resolves.not.toThrow();
    });

    it('should allow HTTP for 127.0.0.1 endpoints', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      const credentials = {
        endpoint: 'http://127.0.0.1:8080/api'
      };

      await expect(saveCredentials('local', credentials)).resolves.not.toThrow();
    });

    it('should allow HTTPS for any endpoint', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      const credentials = {
        endpoint: 'https://api.example.com/v1/chat'
      };

      await expect(saveCredentials('local', credentials)).resolves.not.toThrow();
    });

    it('should handle storage API errors', async () => {
      mockStorage.local.set.mockRejectedValue(new Error('Storage quota exceeded'));

      const credentials = {
        apiKey: 'test-key'
      };

      await expect(saveCredentials('gemini', credentials)).rejects.toThrow('Failed to save credentials');
    });
  });

  describe('getCredentials', () => {
    it('should retrieve and decrypt stored credentials successfully', async () => {
      const storedData = {
        provider: 'gemini',
        credentials: { apiKey: 'test-key' },
        timestamp: Date.now()
      };

      // Mock encrypted data as it would be stored
      const encryptedData = {
        encrypted: [1, 2, 3, 4],
        iv: [5, 6, 7, 8]
      };

      // Mock storage retrieval
      mockStorage.local.get.mockImplementation((key) => {
        if (key === 'llm_credentials') {
          return Promise.resolve({ llm_credentials: encryptedData });
        }
        if (key === 'llm_encryption_key') {
          return Promise.resolve({ llm_encryption_key: [9, 10, 11, 12] });
        }
        return Promise.resolve({
          llm_credentials: encryptedData,
          llm_encryption_key: [9, 10, 11, 12]
        });
      });

      // Mock key import
      const mockKey = { type: 'secret' };
      crypto.subtle.importKey.mockResolvedValue(mockKey);

      // Mock decryption to return the stored data
      const dataString = JSON.stringify(storedData);
      const dataArray = new Uint8Array([...dataString].map(c => c.charCodeAt(0)));
      crypto.subtle.decrypt.mockResolvedValue(dataArray.buffer);

      const result = await getCredentials();

      expect(mockStorage.local.get).toHaveBeenCalled();
      expect(crypto.subtle.decrypt).toHaveBeenCalled();
      expect(result).toEqual(storedData);
    });

    it('should return null when no credentials are stored', async () => {
      mockStorage.local.get.mockResolvedValue({});

      const result = await getCredentials();

      expect(result).toBeNull();
    });

    it('should handle storage API errors', async () => {
      mockStorage.local.get.mockRejectedValue(new Error('Storage access denied'));

      await expect(getCredentials()).rejects.toThrow('Failed to retrieve credentials');
    });
  });

  describe('clearCredentials', () => {
    it('should clear stored credentials and encryption key', async () => {
      mockStorage.local.remove.mockResolvedValue(undefined);

      await clearCredentials();

      expect(mockStorage.local.remove).toHaveBeenCalledWith([
        'llm_credentials',
        'llm_encryption_key'
      ]);
    });

    it('should handle storage API errors', async () => {
      mockStorage.local.remove.mockRejectedValue(new Error('Storage access denied'));

      await expect(clearCredentials()).rejects.toThrow('Failed to clear credentials');
    });
  });

  describe('getConfig', () => {
    it('should retrieve stored configuration successfully', async () => {
      const storedConfig = {
        provider: 'bedrock',
        configured: true
      };

      mockStorage.local.get.mockResolvedValue({
        llm_config: storedConfig
      });

      const result = await getConfig();

      expect(mockStorage.local.get).toHaveBeenCalledWith('llm_config');
      expect(result).toEqual(storedConfig);
    });

    it('should return default config when none is stored', async () => {
      mockStorage.local.get.mockResolvedValue({});

      const result = await getConfig();

      expect(result).toEqual({
        provider: null,
        configured: false
      });
    });

    it('should handle storage API errors', async () => {
      mockStorage.local.get.mockRejectedValue(new Error('Storage access denied'));

      await expect(getConfig()).rejects.toThrow('Failed to retrieve configuration');
    });
  });

  describe('saveConfig', () => {
    it('should save configuration successfully', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      const config = {
        provider: 'gemini',
        configured: true
      };

      await saveConfig(config);

      expect(mockStorage.local.set).toHaveBeenCalledWith({
        llm_config: config
      });
    });

    it('should throw error for missing config', async () => {
      await expect(saveConfig(null)).rejects.toThrow('Configuration is required');
    });

    it('should handle storage API errors', async () => {
      mockStorage.local.set.mockRejectedValue(new Error('Storage quota exceeded'));

      const config = {
        provider: 'gemini',
        configured: true
      };

      await expect(saveConfig(config)).rejects.toThrow('Failed to save configuration');
    });
  });

  describe('credential save/retrieve cycle', () => {
    it('should successfully save and retrieve credentials', async () => {
      const credentials = {
        accessKey: 'test-access',
        secretKey: 'test-secret',
        region: 'us-west-2'
      };

      // Mock save
      mockStorage.local.set.mockResolvedValue(undefined);
      mockStorage.local.get.mockResolvedValue({});
      
      await saveCredentials('bedrock', credentials);

      // Find the encrypted credentials that were saved
      const credentialsCall = mockStorage.local.set.mock.calls.find(
        call => call[0].llm_credentials
      );
      const savedEncryptedData = credentialsCall[0].llm_credentials;

      // Mock retrieve with the encrypted data
      mockStorage.local.get.mockResolvedValue({
        llm_credentials: savedEncryptedData,
        llm_encryption_key: [9, 10, 11, 12]
      });

      // Mock key import
      const mockKey = { type: 'secret' };
      crypto.subtle.importKey.mockResolvedValue(mockKey);

      // Mock decryption to return the original data
      const originalData = {
        provider: 'bedrock',
        credentials,
        timestamp: Date.now()
      };
      const dataString = JSON.stringify(originalData);
      const dataArray = new Uint8Array([...dataString].map(c => c.charCodeAt(0)));
      crypto.subtle.decrypt.mockResolvedValue(dataArray.buffer);

      const retrieved = await getCredentials();

      expect(retrieved.provider).toBe('bedrock');
      expect(retrieved.credentials).toEqual(credentials);
      expect(retrieved.timestamp).toBeDefined();
    });
  });

  describe('configuration persistence', () => {
    it('should successfully save and retrieve configuration', async () => {
      const config = {
        provider: 'local',
        configured: true,
        lastUsed: Date.now()
      };

      // Mock save
      mockStorage.local.set.mockResolvedValue(undefined);
      await saveConfig(config);

      // Mock retrieve
      mockStorage.local.get.mockResolvedValue({
        llm_config: config
      });

      const retrieved = await getConfig();

      expect(retrieved).toEqual(config);
    });
  });

  describe('Security: Credential Encryption', () => {
    beforeEach(() => {
      // Reset mocks for encryption tests
      mockStorage.local.get.mockResolvedValue({});
      mockStorage.local.set.mockResolvedValue(undefined);
    });

    it('should encrypt credentials before storing', async () => {
      const credentials = {
        apiKey: 'super-secret-key-12345'
      };

      await saveCredentials('gemini', credentials);

      // Verify encryption was called
      expect(crypto.subtle.encrypt).toHaveBeenCalled();
      
      // Find the call that stored credentials
      const credentialsCall = mockStorage.local.set.mock.calls.find(
        call => call[0].llm_credentials
      );
      
      // Verify stored data is encrypted (not plain text)
      const storedData = credentialsCall[0].llm_credentials;
      expect(storedData).toHaveProperty('encrypted');
      expect(storedData).toHaveProperty('iv');
      expect(Array.isArray(storedData.encrypted)).toBe(true);
      expect(Array.isArray(storedData.iv)).toBe(true);
    });

    it('should decrypt credentials when retrieving', async () => {
      const originalData = {
        provider: 'bedrock',
        credentials: {
          accessKey: 'AKIAIOSFODNN7EXAMPLE',
          secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
          region: 'us-west-2'
        },
        timestamp: Date.now()
      };

      mockStorage.local.get.mockResolvedValue({
        llm_credentials: {
          encrypted: [1, 2, 3, 4],
          iv: [5, 6, 7, 8]
        },
        llm_encryption_key: [9, 10, 11, 12]
      });

      const mockKey = { type: 'secret' };
      crypto.subtle.importKey.mockResolvedValue(mockKey);

      const dataString = JSON.stringify(originalData);
      const dataArray = new Uint8Array([...dataString].map(c => c.charCodeAt(0)));
      crypto.subtle.decrypt.mockResolvedValue(dataArray.buffer);

      const result = await getCredentials();

      // Verify decryption was called
      expect(crypto.subtle.decrypt).toHaveBeenCalled();
      
      // Verify decrypted data matches original
      expect(result.provider).toBe(originalData.provider);
      expect(result.credentials).toEqual(originalData.credentials);
    });

    it('should generate unique encryption key on first use', async () => {
      mockStorage.local.get.mockResolvedValue({});
      mockStorage.local.set.mockResolvedValue(undefined);

      const mockKey = { type: 'secret' };
      const mockExportedKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
      
      crypto.subtle.generateKey.mockResolvedValue(mockKey);
      crypto.subtle.exportKey.mockResolvedValue(mockExportedKey.buffer);

      const credentials = { apiKey: 'test' };
      await saveCredentials('gemini', credentials);

      // Verify key generation
      expect(crypto.subtle.generateKey).toHaveBeenCalledWith(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // Verify key was stored
      expect(mockStorage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          llm_encryption_key: expect.any(Array)
        })
      );
    });

    it('should reuse existing encryption key', async () => {
      const existingKey = [1, 2, 3, 4, 5, 6, 7, 8];
      
      mockStorage.local.get.mockResolvedValue({
        llm_encryption_key: existingKey
      });
      mockStorage.local.set.mockResolvedValue(undefined);

      const mockKey = { type: 'secret' };
      crypto.subtle.importKey.mockResolvedValue(mockKey);

      const credentials = { apiKey: 'test' };
      await saveCredentials('gemini', credentials);

      // Should import existing key, not generate new one
      expect(crypto.subtle.importKey).toHaveBeenCalled();
      expect(crypto.subtle.generateKey).not.toHaveBeenCalled();
    });
  });

  describe('Security: HTTPS Validation', () => {
    it('should reject HTTP endpoints for remote servers', async () => {
      const credentials = {
        endpoint: 'http://api.example.com/v1/chat'
      };

      await expect(saveCredentials('local', credentials)).rejects.toThrow('Only HTTPS connections are allowed');
    });

    it('should accept HTTPS endpoints', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      const credentials = {
        endpoint: 'https://api.example.com/v1/chat'
      };

      await expect(saveCredentials('local', credentials)).resolves.not.toThrow();
    });

    it('should allow localhost with HTTP', async () => {
      mockStorage.local.set.mockResolvedValue(undefined);

      const localhostUrls = [
        'http://localhost:8080/api',
        'http://127.0.0.1:11434/v1/chat',
        'http://[::1]:3000/api'
      ];

      for (const url of localhostUrls) {
        const credentials = { endpoint: url };
        await expect(saveCredentials('local', credentials)).resolves.not.toThrow();
      }
    });

    it('should require HTTPS for non-localhost domains', async () => {
      const insecureUrls = [
        'http://192.168.1.100:8080/api',
        'http://example.com/api',
        'http://api.myserver.local/v1/chat'
      ];

      for (const url of insecureUrls) {
        const credentials = { endpoint: url };
        await expect(saveCredentials('local', credentials)).rejects.toThrow('Only HTTPS connections are allowed');
      }
    });
  });
});
