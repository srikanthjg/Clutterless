/**
 * Unit tests for error-logger.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logError,
  logWarning,
  logInfo,
  logDebug,
  logOperationStart,
  logOperationSuccess,
  logOperationFailure,
  sanitizeObject,
  isSensitiveField
} from './error-logger.js';

describe('Error Logger', () => {
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleInfoSpy;
  let consoleDebugSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('isSensitiveField', () => {
    it('should identify API key fields', () => {
      expect(isSensitiveField('apiKey')).toBe(true);
      expect(isSensitiveField('api_key')).toBe(true);
      expect(isSensitiveField('API_KEY')).toBe(true);
    });

    it('should identify access key fields', () => {
      expect(isSensitiveField('accessKey')).toBe(true);
      expect(isSensitiveField('access_key')).toBe(true);
    });

    it('should identify secret key fields', () => {
      expect(isSensitiveField('secretKey')).toBe(true);
      expect(isSensitiveField('secret_key')).toBe(true);
    });

    it('should identify password fields', () => {
      expect(isSensitiveField('password')).toBe(true);
      expect(isSensitiveField('userPassword')).toBe(true);
    });

    it('should identify token fields', () => {
      expect(isSensitiveField('token')).toBe(true);
      expect(isSensitiveField('authToken')).toBe(true);
      expect(isSensitiveField('bearer')).toBe(true);
    });

    it('should identify credential fields', () => {
      expect(isSensitiveField('credentials')).toBe(true);
      expect(isSensitiveField('userCredential')).toBe(true);
    });

    it('should not identify non-sensitive fields', () => {
      expect(isSensitiveField('username')).toBe(false);
      expect(isSensitiveField('email')).toBe(false);
      expect(isSensitiveField('provider')).toBe(false);
      expect(isSensitiveField('region')).toBe(false);
    });

    it('should handle null/undefined', () => {
      expect(isSensitiveField(null)).toBe(false);
      expect(isSensitiveField(undefined)).toBe(false);
    });
  });

  describe('sanitizeObject', () => {
    it('should redact sensitive fields', () => {
      const obj = {
        apiKey: 'secret123',
        username: 'user',
        password: 'pass123'
      };
      
      const sanitized = sanitizeObject(obj);
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.username).toBe('user');
      expect(sanitized.password).toBe('[REDACTED]');
    });

    it('should handle nested objects', () => {
      const obj = {
        config: {
          apiKey: 'secret123',
          region: 'us-east-1'
        },
        metadata: {
          count: 5
        }
      };
      
      const sanitized = sanitizeObject(obj);
      expect(sanitized.config.apiKey).toBe('[REDACTED]');
      expect(sanitized.config.region).toBe('us-east-1');
      expect(sanitized.metadata.count).toBe(5);
    });

    it('should handle arrays', () => {
      const obj = {
        items: [
          { apiKey: 'secret1', name: 'item1' },
          { apiKey: 'secret2', name: 'item2' }
        ]
      };
      
      const sanitized = sanitizeObject(obj);
      expect(sanitized.items[0].apiKey).toBe('[REDACTED]');
      expect(sanitized.items[0].name).toBe('item1');
      expect(sanitized.items[1].apiKey).toBe('[REDACTED]');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it('should handle primitives', () => {
      expect(sanitizeObject('string')).toBe('string');
      expect(sanitizeObject(123)).toBe(123);
      expect(sanitizeObject(true)).toBe(true);
    });

    it('should limit recursion depth', () => {
      const deepObj = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: 'too deep'
              }
            }
          }
        }
      };
      
      const sanitized = sanitizeObject(deepObj);
      expect(sanitized.level1.level2.level3.level4).toBe('[Max depth reached]');
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'testOperation',
        provider: 'bedrock',
        metadata: { count: 5 }
      };
      
      const logEntry = logError(error, context);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(logEntry.level).toBe('ERROR');
      expect(logEntry.context.operation).toBe('testOperation');
      expect(logEntry.context.provider).toBe('bedrock');
      expect(logEntry.timestamp).toBeDefined();
    });

    it('should sanitize sensitive data in context', () => {
      const error = new Error('Test error');
      const context = {
        operation: 'testOperation',
        metadata: {
          apiKey: 'secret123',
          region: 'us-east-1'
        }
      };
      
      const logEntry = logError(error, context);
      
      expect(logEntry.context.apiKey).toBe('[REDACTED]');
      expect(logEntry.context.region).toBe('us-east-1');
    });

    it('should include error stack trace', () => {
      const error = new Error('Test error');
      const logEntry = logError(error, { operation: 'test' });
      
      expect(logEntry.context.stack).toBeDefined();
      expect(logEntry.context.originalMessage).toBe('Test error');
    });

    it('should handle string errors', () => {
      const logEntry = logError('String error', { operation: 'test' });
      
      expect(logEntry.level).toBe('ERROR');
      expect(logEntry.context.originalMessage).toBe('String error');
    });
  });

  describe('logWarning', () => {
    it('should log warning with context', () => {
      const context = {
        operation: 'testOperation',
        provider: 'gemini'
      };
      
      const logEntry = logWarning('Test warning', context);
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(logEntry.level).toBe('WARN');
      expect(logEntry.message).toBe('Test warning');
      expect(logEntry.context.operation).toBe('testOperation');
    });

    it('should sanitize sensitive data', () => {
      const context = {
        operation: 'test',
        metadata: { apiKey: 'secret' }
      };
      
      const logEntry = logWarning('Warning', context);
      expect(logEntry.context.apiKey).toBe('[REDACTED]');
    });
  });

  describe('logInfo', () => {
    it('should log info with context', () => {
      const context = {
        operation: 'testOperation',
        metadata: { count: 10 }
      };
      
      const logEntry = logInfo('Test info', context);
      
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.message).toBe('Test info');
    });
  });

  describe('logDebug', () => {
    it('should log debug with context', () => {
      const context = {
        operation: 'testOperation',
        metadata: { debug: true }
      };
      
      const logEntry = logDebug('Test debug', context);
      
      expect(consoleDebugSpy).toHaveBeenCalled();
      expect(logEntry.level).toBe('DEBUG');
      expect(logEntry.message).toBe('Test debug');
    });
  });

  describe('logOperationStart', () => {
    it('should log operation start', () => {
      const metadata = { tabCount: 10 };
      const logEntry = logOperationStart('autoGroup', metadata);
      
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(logEntry.message).toContain('Starting operation');
      expect(logEntry.message).toContain('autoGroup');
      expect(logEntry.context.operation).toBe('autoGroup');
    });

    it('should sanitize metadata', () => {
      const metadata = { apiKey: 'secret', count: 5 };
      const logEntry = logOperationStart('test', metadata);
      
      expect(logEntry.context.apiKey).toBe('[REDACTED]');
      expect(logEntry.context.count).toBe(5);
    });
  });

  describe('logOperationSuccess', () => {
    it('should log operation success', () => {
      const result = { groupsCreated: 3 };
      const logEntry = logOperationSuccess('autoGroup', result);
      
      expect(consoleInfoSpy).toHaveBeenCalled();
      expect(logEntry.message).toContain('completed successfully');
      expect(logEntry.message).toContain('autoGroup');
    });
  });

  describe('logOperationFailure', () => {
    it('should log operation failure', () => {
      const error = new Error('Operation failed');
      const metadata = { attempt: 1 };
      
      const logEntry = logOperationFailure('autoGroup', error, metadata);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(logEntry.level).toBe('ERROR');
      expect(logEntry.context.operation).toBe('autoGroup');
    });
  });

  describe('log entry format', () => {
    it('should include timestamp in ISO format', () => {
      const logEntry = logInfo('Test');
      expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should include level', () => {
      const errorEntry = logError(new Error('test'), {});
      const warnEntry = logWarning('test', {});
      const infoEntry = logInfo('test', {});
      const debugEntry = logDebug('test', {});
      
      expect(errorEntry.level).toBe('ERROR');
      expect(warnEntry.level).toBe('WARN');
      expect(infoEntry.level).toBe('INFO');
      expect(debugEntry.level).toBe('DEBUG');
    });

    it('should include message', () => {
      const logEntry = logInfo('Test message');
      expect(logEntry.message).toBe('Test message');
    });

    it('should include sanitized context', () => {
      const context = {
        operation: 'test',
        metadata: { apiKey: 'secret', value: 123 }
      };
      
      const logEntry = logInfo('Test', context);
      expect(logEntry.context.operation).toBe('test');
      expect(logEntry.context.apiKey).toBe('[REDACTED]');
      expect(logEntry.context.value).toBe(123);
    });
  });
});
