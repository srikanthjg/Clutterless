/**
 * Error Logger Module
 * Provides structured error logging with context while excluding sensitive information
 */

import { classifyError, getErrorInfo } from './error-handler.js';

/**
 * Log levels
 */
const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Sensitive field patterns to exclude from logs
 */
const SENSITIVE_PATTERNS = [
  /api[_-]?key/i,
  /access[_-]?key/i,
  /secret[_-]?key/i,
  /password/i,
  /token/i,
  /auth/i,
  /credential/i,
  /bearer/i
];

/**
 * Checks if a field name contains sensitive information
 * @param {string} fieldName - The field name to check
 * @returns {boolean} True if field is sensitive
 */
function isSensitiveField(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') {
    return false;
  }
  
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Sanitizes an object by removing sensitive fields
 * @param {any} obj - The object to sanitize
 * @param {number} depth - Current recursion depth
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {any} Sanitized object
 */
function sanitizeObject(obj, depth = 0, maxDepth = 3) {
  // Prevent infinite recursion
  if (depth > maxDepth) {
    return '[Max depth reached]';
  }
  
  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Handle primitives
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1, maxDepth));
  }
  
  // Handle objects
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveField(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1, maxDepth);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Formats a log entry with timestamp and context
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} context - Additional context
 * @returns {Object} Formatted log entry
 */
function formatLogEntry(level, message, context = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: sanitizeObject(context)
  };
}

/**
 * Logs an error with context
 * @param {Error|string} error - The error to log
 * @param {Object} context - Additional context information
 * @param {string} context.operation - The operation that failed
 * @param {string} context.provider - The LLM provider being used
 * @param {Object} context.metadata - Additional metadata
 */
function logError(error, context = {}) {
  const errorInfo = getErrorInfo(error);
  const errorType = classifyError(error);
  
  const logEntry = formatLogEntry(LogLevel.ERROR, errorInfo.message, {
    errorType,
    severity: errorInfo.severity,
    operation: context.operation || 'unknown',
    provider: context.provider || 'unknown',
    originalMessage: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...sanitizeObject(context.metadata || {})
  });
  
  console.error('[LLM Tab Grouper]', logEntry);
  
  return logEntry;
}

/**
 * Logs a warning with context
 * @param {string} message - Warning message
 * @param {Object} context - Additional context information
 */
function logWarning(message, context = {}) {
  const logEntry = formatLogEntry(LogLevel.WARN, message, {
    operation: context.operation || 'unknown',
    provider: context.provider || 'unknown',
    ...sanitizeObject(context.metadata || {})
  });
  
  console.warn('[LLM Tab Grouper]', logEntry);
  
  return logEntry;
}

/**
 * Logs an info message with context
 * @param {string} message - Info message
 * @param {Object} context - Additional context information
 */
function logInfo(message, context = {}) {
  const logEntry = formatLogEntry(LogLevel.INFO, message, {
    operation: context.operation || 'unknown',
    ...sanitizeObject(context.metadata || {})
  });
  
  console.info('[LLM Tab Grouper]', logEntry);
  
  return logEntry;
}

/**
 * Logs a debug message with context
 * @param {string} message - Debug message
 * @param {Object} context - Additional context information
 */
function logDebug(message, context = {}) {
  const logEntry = formatLogEntry(LogLevel.DEBUG, message, {
    operation: context.operation || 'unknown',
    ...sanitizeObject(context.metadata || {})
  });
  
  console.debug('[LLM Tab Grouper]', logEntry);
  
  return logEntry;
}

/**
 * Logs the start of an operation
 * @param {string} operation - Operation name
 * @param {Object} metadata - Operation metadata
 */
function logOperationStart(operation, metadata = {}) {
  return logInfo(`Starting operation: ${operation}`, {
    operation,
    metadata: sanitizeObject(metadata)
  });
}

/**
 * Logs the successful completion of an operation
 * @param {string} operation - Operation name
 * @param {Object} result - Operation result
 */
function logOperationSuccess(operation, result = {}) {
  return logInfo(`Operation completed successfully: ${operation}`, {
    operation,
    metadata: sanitizeObject(result)
  });
}

/**
 * Logs the failure of an operation
 * @param {string} operation - Operation name
 * @param {Error} error - The error that occurred
 * @param {Object} metadata - Additional metadata
 */
function logOperationFailure(operation, error, metadata = {}) {
  return logError(error, {
    operation,
    metadata: sanitizeObject(metadata)
  });
}

// Export for use in other modules (CommonJS for tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LogLevel,
    logError,
    logWarning,
    logInfo,
    logDebug,
    logOperationStart,
    logOperationSuccess,
    logOperationFailure,
    sanitizeObject,
    isSensitiveField
  };
}

// ES6 exports for browser extension
export {
  LogLevel,
  logError,
  logWarning,
  logInfo,
  logDebug,
  logOperationStart,
  logOperationSuccess,
  logOperationFailure,
  sanitizeObject,
  isSensitiveField
};
