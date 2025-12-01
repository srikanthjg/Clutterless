/**
 * Error Handler Module
 * Centralized error handling with user-friendly messages and suggested actions
 */

/**
 * Error types categorized by source
 */
const ErrorTypes = {
  // Configuration errors
  NO_CONFIG: 'NO_CONFIG',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MISSING_PROVIDER: 'MISSING_PROVIDER',
  INVALID_PROVIDER: 'INVALID_PROVIDER',
  INVALID_ENDPOINT: 'INVALID_ENDPOINT',
  
  // API errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMIT: 'RATE_LIMIT',
  API_ERROR: 'API_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  
  // Chrome API errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  TAB_ACCESS_ERROR: 'TAB_ACCESS_ERROR',
  GROUP_CREATION_ERROR: 'GROUP_CREATION_ERROR',
  SCRIPT_INJECTION_ERROR: 'SCRIPT_INJECTION_ERROR',
  
  // Input validation errors
  EMPTY_PROMPT: 'EMPTY_PROMPT',
  NO_TABS: 'NO_TABS',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // LLM errors
  LLM_ERROR: 'LLM_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  NO_GROUPS_RETURNED: 'NO_GROUPS_RETURNED',
  
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR'
};

/**
 * Comprehensive error message mapping with user-friendly messages and suggested actions
 */
const ERROR_MESSAGES = {
  // Configuration errors
  [ErrorTypes.NO_CONFIG]: {
    message: 'No LLM provider configured',
    suggestion: 'Please configure your LLM provider in the extension settings before using tab grouping features.',
    severity: 'warning'
  },
  [ErrorTypes.INVALID_CREDENTIALS]: {
    message: 'Invalid API credentials',
    suggestion: 'Please check your API credentials in the settings. Make sure your access keys, API keys, or tokens are correct and have not expired.',
    severity: 'error'
  },
  [ErrorTypes.MISSING_PROVIDER]: {
    message: 'Provider not specified',
    suggestion: 'Please select an LLM provider (AWS Bedrock, Google Gemini, or Local LLM) in the settings.',
    severity: 'warning'
  },
  [ErrorTypes.INVALID_PROVIDER]: {
    message: 'Unknown LLM provider',
    suggestion: 'The selected provider is not supported. Please choose AWS Bedrock, Google Gemini, or Local LLM.',
    severity: 'error'
  },
  [ErrorTypes.INVALID_ENDPOINT]: {
    message: 'Invalid endpoint URL',
    suggestion: 'Please check your Local LLM endpoint URL. It should be in the format: http://localhost:11434/v1/chat/completions',
    severity: 'error'
  },
  
  // API errors
  [ErrorTypes.NETWORK_ERROR]: {
    message: 'Network connection error',
    suggestion: 'Please check your internet connection and try again. If using a Local LLM, ensure the server is running.',
    severity: 'error'
  },
  [ErrorTypes.TIMEOUT]: {
    message: 'Request timed out',
    suggestion: 'The API took too long to respond. Please try again. If the problem persists, the service may be experiencing high load.',
    severity: 'error'
  },
  [ErrorTypes.CONNECTION_REFUSED]: {
    message: 'Cannot connect to API endpoint',
    suggestion: 'The API endpoint is not accessible. For Local LLM, ensure the server is running. For cloud providers, check your network connection.',
    severity: 'error'
  },
  [ErrorTypes.UNAUTHORIZED]: {
    message: 'Authentication failed',
    suggestion: 'Your API credentials are invalid or have expired. Please update your credentials in the settings.',
    severity: 'error'
  },
  [ErrorTypes.FORBIDDEN]: {
    message: 'Access denied',
    suggestion: 'Your account does not have permission to access this API. Please check your API permissions or subscription status.',
    severity: 'error'
  },
  [ErrorTypes.RATE_LIMIT]: {
    message: 'API rate limit exceeded',
    suggestion: 'You have made too many requests. Please wait a few minutes before trying again.',
    severity: 'warning'
  },
  [ErrorTypes.API_ERROR]: {
    message: 'API service error',
    suggestion: 'The LLM service encountered an error. Please try again in a few moments.',
    severity: 'error'
  },
  [ErrorTypes.INVALID_RESPONSE]: {
    message: 'Invalid response from API',
    suggestion: 'The API returned an unexpected response format. This may be a temporary issue. Please try again.',
    severity: 'error'
  },
  
  // Chrome API errors
  [ErrorTypes.PERMISSION_DENIED]: {
    message: 'Permission denied',
    suggestion: 'Cannot access some tabs. Chrome system pages (chrome://) and extension pages are not accessible for security reasons.',
    severity: 'warning'
  },
  [ErrorTypes.TAB_ACCESS_ERROR]: {
    message: 'Cannot access tab',
    suggestion: 'Some tabs could not be accessed. They will be skipped during grouping.',
    severity: 'warning'
  },
  [ErrorTypes.GROUP_CREATION_ERROR]: {
    message: 'Failed to create tab group',
    suggestion: 'An error occurred while creating tab groups. Please try again.',
    severity: 'error'
  },
  [ErrorTypes.SCRIPT_INJECTION_ERROR]: {
    message: 'Cannot inject content script',
    suggestion: 'Failed to extract content from some tabs. They will be grouped based on title and URL only.',
    severity: 'warning'
  },
  
  // Input validation errors
  [ErrorTypes.EMPTY_PROMPT]: {
    message: 'Empty grouping prompt',
    suggestion: 'Please provide instructions for how you want your tabs grouped.',
    severity: 'warning'
  },
  [ErrorTypes.NO_TABS]: {
    message: 'No tabs to group',
    suggestion: 'There are no open tabs to organize. Please open some tabs first.',
    severity: 'warning'
  },
  [ErrorTypes.INVALID_INPUT]: {
    message: 'Invalid input',
    suggestion: 'Please check your input and try again.',
    severity: 'warning'
  },
  
  // LLM errors
  [ErrorTypes.LLM_ERROR]: {
    message: 'LLM processing error',
    suggestion: 'The AI service encountered an error while analyzing your tabs. Please try again.',
    severity: 'error'
  },
  [ErrorTypes.PARSING_ERROR]: {
    message: 'Failed to parse LLM response',
    suggestion: 'The AI response could not be understood. Please try again.',
    severity: 'error'
  },
  [ErrorTypes.NO_GROUPS_RETURNED]: {
    message: 'No groups suggested',
    suggestion: 'The AI could not identify meaningful groups for your tabs. Try providing custom grouping instructions.',
    severity: 'warning'
  },
  
  // Generic errors
  [ErrorTypes.UNKNOWN_ERROR]: {
    message: 'An unexpected error occurred',
    suggestion: 'Please try again. If the problem persists, try reloading the extension.',
    severity: 'error'
  },
  [ErrorTypes.STORAGE_ERROR]: {
    message: 'Storage operation failed',
    suggestion: 'Failed to save or retrieve data. Please check your browser storage permissions.',
    severity: 'error'
  }
};

/**
 * Maps API error codes to error types
 */
const API_ERROR_CODE_MAP = {
  // HTTP status codes
  400: ErrorTypes.INVALID_INPUT,
  401: ErrorTypes.UNAUTHORIZED,
  403: ErrorTypes.FORBIDDEN,
  404: ErrorTypes.API_ERROR,
  429: ErrorTypes.RATE_LIMIT,
  500: ErrorTypes.API_ERROR,
  502: ErrorTypes.API_ERROR,
  503: ErrorTypes.API_ERROR,
  504: ErrorTypes.TIMEOUT,
  
  // Network error codes
  'ENOTFOUND': ErrorTypes.NETWORK_ERROR,
  'ETIMEDOUT': ErrorTypes.TIMEOUT,
  'ECONNREFUSED': ErrorTypes.CONNECTION_REFUSED,
  'ECONNRESET': ErrorTypes.NETWORK_ERROR,
  'ENETUNREACH': ErrorTypes.NETWORK_ERROR,
  
  // Custom error codes
  'UNAUTHORIZED': ErrorTypes.UNAUTHORIZED,
  'FORBIDDEN': ErrorTypes.FORBIDDEN,
  'RATE_LIMIT': ErrorTypes.RATE_LIMIT,
  'INVALID_RESPONSE': ErrorTypes.INVALID_RESPONSE
};

/**
 * Classifies an error and returns the appropriate error type
 * @param {Error} error - The error to classify
 * @returns {string} The error type
 */
function classifyError(error) {
  if (!error) {
    return ErrorTypes.UNKNOWN_ERROR;
  }
  
  const message = (error.message || '').toLowerCase();
  const code = error.code || '';
  
  // Check API error codes first
  if (API_ERROR_CODE_MAP[code]) {
    return API_ERROR_CODE_MAP[code];
  }
  
  // Check HTTP status codes
  if (error.status && API_ERROR_CODE_MAP[error.status]) {
    return API_ERROR_CODE_MAP[error.status];
  }
  
  // Pattern matching on error message (case-insensitive)
  if (message.includes('rate limit') || message.includes('quota') || message.includes('too many requests')) {
    return ErrorTypes.RATE_LIMIT;
  }
  if (message.includes('credentials') || message.includes('authentication') || message.includes('api key')) {
    return ErrorTypes.INVALID_CREDENTIALS;
  }
  if (message.includes('network') || message.includes('econnrefused')) {
    return ErrorTypes.NETWORK_ERROR;
  }
  if (message.includes('timeout') || message.includes('etimedout')) {
    return ErrorTypes.TIMEOUT;
  }
  if (message.includes('connection') && (message.includes('refused') || message.includes('failed'))) {
    return ErrorTypes.CONNECTION_REFUSED;
  }
  if (message.includes('permission') || message.includes('denied')) {
    return ErrorTypes.PERMISSION_DENIED;
  }
  if (message.includes('endpoint') || (message.includes('invalid') && message.includes('url'))) {
    return ErrorTypes.INVALID_ENDPOINT;
  }
  if (message.includes('parse') || message.includes('json') || message.includes('invalid_response')) {
    return ErrorTypes.PARSING_ERROR;
  }
  if (message.includes('no groups') || (message.includes('empty') && message.includes('group'))) {
    return ErrorTypes.NO_GROUPS_RETURNED;
  }
  if (message.includes('storage')) {
    return ErrorTypes.STORAGE_ERROR;
  }
  if (message.includes('tab') && message.includes('access')) {
    return ErrorTypes.TAB_ACCESS_ERROR;
  }
  if (message.includes('group') && message.includes('create')) {
    return ErrorTypes.GROUP_CREATION_ERROR;
  }
  if (message.includes('script') || message.includes('inject')) {
    return ErrorTypes.SCRIPT_INJECTION_ERROR;
  }
  
  // Check for explicit error types in original message
  const originalMessage = error.message || '';
  for (const [type, _] of Object.entries(ERROR_MESSAGES)) {
    if (originalMessage.includes(type)) {
      return type;
    }
  }
  
  return ErrorTypes.UNKNOWN_ERROR;
}

/**
 * Gets user-friendly error information for an error
 * @param {Error|string} error - The error or error type
 * @returns {Object} Error information with message, suggestion, and severity
 */
function getErrorInfo(error) {
  let errorType;
  
  if (typeof error === 'string') {
    // Direct error type provided
    errorType = error;
  } else if (error instanceof Error) {
    // Classify the error
    errorType = classifyError(error);
  } else {
    errorType = ErrorTypes.UNKNOWN_ERROR;
  }
  
  // Get error info from mapping
  const errorInfo = ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ErrorTypes.UNKNOWN_ERROR];
  
  return {
    type: errorType,
    message: errorInfo.message,
    suggestion: errorInfo.suggestion,
    severity: errorInfo.severity
  };
}

/**
 * Formats error information into a user-friendly message
 * @param {Error|string} error - The error or error type
 * @param {boolean} includeSuggestion - Whether to include the suggestion
 * @returns {string} Formatted error message
 */
function formatErrorMessage(error, includeSuggestion = true) {
  const errorInfo = getErrorInfo(error);
  
  if (includeSuggestion) {
    return `${errorInfo.message}. ${errorInfo.suggestion}`;
  }
  
  return errorInfo.message;
}

// Export for use in other modules (CommonJS for tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ErrorTypes,
    ERROR_MESSAGES,
    classifyError,
    getErrorInfo,
    formatErrorMessage
  };
}

// ES6 exports for browser extension
export {
  ErrorTypes,
  ERROR_MESSAGES,
  classifyError,
  getErrorInfo,
  formatErrorMessage
};
