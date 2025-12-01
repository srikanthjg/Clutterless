/**
 * Unit tests for error-handler.js
 */

import { describe, it, expect } from 'vitest';
import { ErrorTypes, classifyError, getErrorInfo, formatErrorMessage } from './error-handler.js';

describe('Error Handler', () => {
  describe('classifyError', () => {
    it('should classify credential errors', () => {
      const error = new Error('Invalid credentials provided');
      expect(classifyError(error)).toBe(ErrorTypes.INVALID_CREDENTIALS);
    });

    it('should classify rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      expect(classifyError(error)).toBe(ErrorTypes.RATE_LIMIT);
    });

    it('should classify network errors', () => {
      const error = new Error('Network connection failed');
      expect(classifyError(error)).toBe(ErrorTypes.NETWORK_ERROR);
    });

    it('should classify timeout errors', () => {
      const error = new Error('Request timeout');
      expect(classifyError(error)).toBe(ErrorTypes.TIMEOUT);
    });

    it('should classify permission errors', () => {
      const error = new Error('Permission denied');
      expect(classifyError(error)).toBe(ErrorTypes.PERMISSION_DENIED);
    });

    it('should classify parsing errors', () => {
      const error = new Error('Failed to parse JSON response');
      expect(classifyError(error)).toBe(ErrorTypes.PARSING_ERROR);
    });

    it('should classify endpoint errors', () => {
      const error = new Error('Invalid endpoint URL');
      expect(classifyError(error)).toBe(ErrorTypes.INVALID_ENDPOINT);
    });

    it('should classify storage errors', () => {
      const error = new Error('Storage operation failed');
      expect(classifyError(error)).toBe(ErrorTypes.STORAGE_ERROR);
    });

    it('should classify tab access errors', () => {
      const error = new Error('Cannot access tab');
      expect(classifyError(error)).toBe(ErrorTypes.TAB_ACCESS_ERROR);
    });

    it('should classify group creation errors', () => {
      const error = new Error('Failed to create group');
      expect(classifyError(error)).toBe(ErrorTypes.GROUP_CREATION_ERROR);
    });

    it('should classify script injection errors', () => {
      const error = new Error('Cannot inject script');
      expect(classifyError(error)).toBe(ErrorTypes.SCRIPT_INJECTION_ERROR);
    });

    it('should classify errors by error code', () => {
      const error = new Error('Connection failed');
      error.code = 'ECONNREFUSED';
      expect(classifyError(error)).toBe(ErrorTypes.CONNECTION_REFUSED);
    });

    it('should classify errors by HTTP status', () => {
      const error = new Error('Unauthorized');
      error.status = 401;
      expect(classifyError(error)).toBe(ErrorTypes.UNAUTHORIZED);
    });

    it('should return UNKNOWN_ERROR for unrecognized errors', () => {
      const error = new Error('Some random error');
      expect(classifyError(error)).toBe(ErrorTypes.UNKNOWN_ERROR);
    });

    it('should handle null error', () => {
      expect(classifyError(null)).toBe(ErrorTypes.UNKNOWN_ERROR);
    });
  });

  describe('getErrorInfo', () => {
    it('should return error info for error type string', () => {
      const info = getErrorInfo(ErrorTypes.NO_CONFIG);
      expect(info.type).toBe(ErrorTypes.NO_CONFIG);
      expect(info.message).toBe('No LLM provider configured');
      expect(info.suggestion).toContain('configure your LLM provider');
      expect(info.severity).toBe('warning');
    });

    it('should return error info for Error object', () => {
      const error = new Error('Invalid credentials');
      const info = getErrorInfo(error);
      expect(info.type).toBe(ErrorTypes.INVALID_CREDENTIALS);
      expect(info.message).toBe('Invalid API credentials');
      expect(info.suggestion).toContain('check your API credentials');
      expect(info.severity).toBe('error');
    });

    it('should return error info for rate limit', () => {
      const info = getErrorInfo(ErrorTypes.RATE_LIMIT);
      expect(info.message).toBe('API rate limit exceeded');
      expect(info.suggestion).toContain('wait a few minutes');
      expect(info.severity).toBe('warning');
    });

    it('should return error info for network error', () => {
      const info = getErrorInfo(ErrorTypes.NETWORK_ERROR);
      expect(info.message).toBe('Network connection error');
      expect(info.suggestion).toContain('check your internet connection');
      expect(info.severity).toBe('error');
    });

    it('should return error info for unauthorized', () => {
      const info = getErrorInfo(ErrorTypes.UNAUTHORIZED);
      expect(info.message).toBe('Authentication failed');
      expect(info.suggestion).toContain('credentials are invalid or have expired');
      expect(info.severity).toBe('error');
    });

    it('should return default error info for unknown type', () => {
      const info = getErrorInfo('INVALID_TYPE');
      expect(info.type).toBe('INVALID_TYPE');
      expect(info.message).toBe('An unexpected error occurred');
      expect(info.severity).toBe('error');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with suggestion', () => {
      const message = formatErrorMessage(ErrorTypes.NO_CONFIG, true);
      expect(message).toContain('No LLM provider configured');
      expect(message).toContain('configure your LLM provider');
    });

    it('should format error message without suggestion', () => {
      const message = formatErrorMessage(ErrorTypes.NO_CONFIG, false);
      expect(message).toBe('No LLM provider configured');
      expect(message).not.toContain('configure your LLM provider');
    });

    it('should format error from Error object', () => {
      const error = new Error('Rate limit exceeded');
      const message = formatErrorMessage(error, true);
      expect(message).toContain('API rate limit exceeded');
      expect(message).toContain('wait a few minutes');
    });

    it('should format network error', () => {
      const error = new Error('Network connection failed');
      const message = formatErrorMessage(error, true);
      expect(message).toContain('Network connection error');
      expect(message).toContain('check your internet connection');
    });

    it('should format permission error', () => {
      const message = formatErrorMessage(ErrorTypes.PERMISSION_DENIED, true);
      expect(message).toContain('Permission denied');
      expect(message).toContain('Chrome system pages');
    });

    it('should format empty prompt error', () => {
      const message = formatErrorMessage(ErrorTypes.EMPTY_PROMPT, true);
      expect(message).toContain('Empty grouping prompt');
      expect(message).toContain('provide instructions');
    });
  });

  describe('Error severity levels', () => {
    it('should mark configuration errors as warnings', () => {
      const info = getErrorInfo(ErrorTypes.NO_CONFIG);
      expect(info.severity).toBe('warning');
    });

    it('should mark API errors as errors', () => {
      const info = getErrorInfo(ErrorTypes.INVALID_CREDENTIALS);
      expect(info.severity).toBe('error');
    });

    it('should mark rate limits as warnings', () => {
      const info = getErrorInfo(ErrorTypes.RATE_LIMIT);
      expect(info.severity).toBe('warning');
    });

    it('should mark permission errors as warnings', () => {
      const info = getErrorInfo(ErrorTypes.PERMISSION_DENIED);
      expect(info.severity).toBe('warning');
    });
  });

  describe('Error suggestions', () => {
    it('should provide actionable suggestions for configuration errors', () => {
      const info = getErrorInfo(ErrorTypes.NO_CONFIG);
      expect(info.suggestion).toContain('configure');
      expect(info.suggestion).toContain('settings');
    });

    it('should provide actionable suggestions for credential errors', () => {
      const info = getErrorInfo(ErrorTypes.INVALID_CREDENTIALS);
      expect(info.suggestion).toContain('check');
      expect(info.suggestion).toContain('credentials');
    });

    it('should provide actionable suggestions for network errors', () => {
      const info = getErrorInfo(ErrorTypes.NETWORK_ERROR);
      expect(info.suggestion).toContain('connection');
      expect(info.suggestion).toContain('try again');
    });

    it('should provide actionable suggestions for rate limits', () => {
      const info = getErrorInfo(ErrorTypes.RATE_LIMIT);
      expect(info.suggestion).toContain('wait');
      expect(info.suggestion).toContain('minutes');
    });
  });
});
