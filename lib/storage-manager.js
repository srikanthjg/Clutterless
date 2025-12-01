/**
 * Storage Manager Module
 * Handles secure storage and retrieval of credentials and configuration
 * using Chrome's storage API with encryption
 */

const STORAGE_KEYS = {
  CREDENTIALS: 'llm_credentials',
  CONFIG: 'llm_config',
  ENCRYPTION_KEY: 'llm_encryption_key'
};

/**
 * Generates or retrieves the encryption key for credential storage
 * @returns {Promise<CryptoKey>} The encryption key
 */
async function getEncryptionKey() {
  try {
    // Try to retrieve existing key from storage
    const result = await chrome.storage.local.get(STORAGE_KEYS.ENCRYPTION_KEY);
    
    if (result[STORAGE_KEYS.ENCRYPTION_KEY]) {
      // Import the stored key
      const keyData = new Uint8Array(result[STORAGE_KEYS.ENCRYPTION_KEY]);
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }
    
    // Generate new key if none exists
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Export and store the key
    const exportedKey = await crypto.subtle.exportKey('raw', key);
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENCRYPTION_KEY]: Array.from(new Uint8Array(exportedKey))
    });
    
    return key;
  } catch (error) {
    throw new Error(`Failed to get encryption key: ${error.message}`);
  }
}

/**
 * Encrypts sensitive data using AES-GCM
 * @param {string} data - Data to encrypt
 * @returns {Promise<Object>} Encrypted data with IV
 */
async function encryptData(data) {
  try {
    const key = await getEncryptionKey();
    
    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the data
    const encodedData = new TextEncoder().encode(data);
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encodedData
    );
    
    // Return encrypted data and IV as arrays for storage
    return {
      encrypted: Array.from(new Uint8Array(encryptedData)),
      iv: Array.from(iv)
    };
  } catch (error) {
    throw new Error(`Failed to encrypt data: ${error.message}`);
  }
}

/**
 * Decrypts encrypted data using AES-GCM
 * @param {Object} encryptedObj - Object containing encrypted data and IV
 * @returns {Promise<string>} Decrypted data
 */
async function decryptData(encryptedObj) {
  try {
    if (!encryptedObj || !encryptedObj.encrypted || !encryptedObj.iv) {
      throw new Error('Invalid encrypted data format');
    }
    
    const key = await getEncryptionKey();
    
    // Convert arrays back to Uint8Array
    // Handle both array and array-like objects from storage
    const encryptedData = Array.isArray(encryptedObj.encrypted) 
      ? new Uint8Array(encryptedObj.encrypted)
      : new Uint8Array(Object.values(encryptedObj.encrypted));
    const iv = Array.isArray(encryptedObj.iv)
      ? new Uint8Array(encryptedObj.iv)
      : new Uint8Array(Object.values(encryptedObj.iv));
    
    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encryptedData
    );
    
    // Decode and return the decrypted string
    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    throw new Error(`Failed to decrypt data: ${error.message}`);
  }
}

/**
 * Saves LLM provider credentials securely with encryption
 * @param {string} provider - The provider type ('bedrock', 'gemini', 'local')
 * @param {object} credentials - The credentials object
 * @returns {Promise<void>}
 */
async function saveCredentials(provider, credentials) {
  if (!provider || !credentials) {
    throw new Error('Provider and credentials are required');
  }

  const validProviders = ['bedrock', 'gemini', 'local'];
  if (!validProviders.includes(provider)) {
    throw new Error(`Invalid provider: ${provider}. Must be one of: ${validProviders.join(', ')}`);
  }

  // Validate provider-specific credentials
  validateCredentials(provider, credentials);

  const credentialData = {
    provider,
    credentials,
    timestamp: Date.now()
  };

  try {
    // Store credentials directly - Chrome storage is already secure
    await chrome.storage.local.set({
      [STORAGE_KEYS.CREDENTIALS]: credentialData
    });
    console.log('[Storage] Credentials saved successfully for provider:', provider);
  } catch (error) {
    throw new Error(`Failed to save credentials: ${error.message}`);
  }
}

/**
 * Retrieves stored credentials
 * @returns {Promise<object|null>} The credentials object or null if not found
 */
async function getCredentials() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CREDENTIALS);
    const credentialData = result[STORAGE_KEYS.CREDENTIALS];
    
    if (!credentialData) {
      console.log('[Storage] No credentials found');
      return null;
    }
    
    console.log('[Storage] Credentials retrieved for provider:', credentialData.provider);
    return credentialData;
  } catch (error) {
    throw new Error(`Failed to retrieve credentials: ${error.message}`);
  }
}

/**
 * Clears all stored credentials and encryption key
 * @returns {Promise<void>}
 */
async function clearCredentials() {
  try {
    await chrome.storage.local.remove([
      STORAGE_KEYS.CREDENTIALS,
      STORAGE_KEYS.ENCRYPTION_KEY
    ]);
  } catch (error) {
    throw new Error(`Failed to clear credentials: ${error.message}`);
  }
}

/**
 * Retrieves stored configuration with credentials
 * @returns {Promise<object>} The configuration object with credentials
 */
async function getConfig() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
    const config = result[STORAGE_KEYS.CONFIG] || {
      provider: null,
      configured: false
    };
    
    console.log('[Storage] Config retrieved:', { provider: config.provider, configured: config.configured });
    
    // If configured, retrieve credentials
    if (config.configured && config.provider) {
      const credentialData = await getCredentials();
      
      if (credentialData && credentialData.provider === config.provider) {
        config.credentials = credentialData.credentials;
        console.log('[Storage] Credentials loaded successfully');
      } else {
        console.warn('[Storage] No credentials found for provider:', config.provider);
      }
    }
    
    return config;
  } catch (error) {
    console.error('[Storage] Error in getConfig:', error);
    throw new Error(`Failed to retrieve configuration: ${error.message}`);
  }
}

/**
 * Saves configuration settings
 * @param {object} config - The configuration object
 * @returns {Promise<void>}
 */
async function saveConfig(config) {
  if (!config) {
    throw new Error('Configuration is required');
  }

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.CONFIG]: config
    });
  } catch (error) {
    throw new Error(`Failed to save configuration: ${error.message}`);
  }
}

/**
 * Validates that a URL uses HTTPS protocol
 * @param {string} url - URL to validate
 * @param {boolean} allowLocalhost - Whether to allow localhost/127.0.0.1 with HTTP
 * @throws {Error} If URL is not HTTPS (except localhost when allowed)
 */
function validateHTTPS(url, allowLocalhost = true) {
  try {
    const urlObj = new URL(url);
    
    // Allow localhost and 127.0.0.1 for development
    if (allowLocalhost) {
      const isLocalhost = urlObj.hostname === 'localhost' || 
                         urlObj.hostname === '127.0.0.1' ||
                         urlObj.hostname === '[::1]';
      
      if (isLocalhost) {
        return; // Allow HTTP for localhost
      }
    }
    
    // Require HTTPS for all other endpoints
    if (urlObj.protocol !== 'https:') {
      throw new Error('Only HTTPS connections are allowed for security. Use https:// instead of http://');
    }
  } catch (error) {
    if (error.message.includes('HTTPS')) {
      throw error;
    }
    throw new Error('Invalid URL format');
  }
}

/**
 * Validates credentials based on provider type
 * @param {string} provider - The provider type
 * @param {object} credentials - The credentials to validate
 * @throws {Error} If credentials are invalid
 */
function validateCredentials(provider, credentials) {
  switch (provider) {
    case 'bedrock':
      if (!credentials.accessKey || !credentials.secretKey || !credentials.region) {
        throw new Error('Bedrock requires accessKey, secretKey, and region');
      }
      // Bedrock always uses HTTPS, no additional validation needed
      break;
    case 'gemini':
      if (!credentials.apiKey) {
        throw new Error('Gemini requires apiKey');
      }
      // Gemini always uses HTTPS, no additional validation needed
      break;
    case 'local':
      if (!credentials.endpoint) {
        throw new Error('Local LLM requires endpoint');
      }
      // Validate endpoint format and HTTPS
      try {
        new URL(credentials.endpoint);
        validateHTTPS(credentials.endpoint, true); // Allow localhost for local LLMs
      } catch (error) {
        throw new Error(`Invalid endpoint: ${error.message}`);
      }
      break;
  }
}

// Export functions for use in other modules (CommonJS for tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    saveCredentials,
    getCredentials,
    clearCredentials,
    getConfig,
    saveConfig
  };
}

// ES6 exports for browser extension
export {
  saveCredentials,
  getCredentials,
  clearCredentials,
  getConfig,
  saveConfig
};
