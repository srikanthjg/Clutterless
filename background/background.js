// Service worker for Clutterless extension
// Handles message routing and coordinates tab grouping operations

import { getAllTabs, createGroup } from '../lib/tab-manager.js';
import { saveCredentials, clearCredentials, getConfig, saveConfig } from '../lib/storage-manager.js';
import { BedrockProvider, GeminiProvider, LocalLLMProvider } from '../lib/llm-provider.js';
import { formatErrorMessage } from '../lib/error-handler.js';
import {
  logError,
  logWarning,
  logOperationStart,
  logOperationSuccess,
  logOperationFailure
} from '../lib/error-logger.js';

// Chrome colors available for tab groups
const CHROME_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

// Error messages for user-friendly display
const ERROR_MESSAGES = {
  'INVALID_CREDENTIALS': 'Your API credentials are invalid. Please check your settings.',
  'RATE_LIMIT': 'API rate limit exceeded. Please wait a moment and try again.',
  'NETWORK_ERROR': 'Network error occurred. Please check your connection.',
  'PERMISSION_DENIED': 'Cannot access some tabs. Chrome system pages are not accessible.',
  'LLM_ERROR': 'The AI service encountered an error. Please try again.',
  'NO_CONFIG': 'Please configure your LLM provider first.',
  'EMPTY_PROMPT': 'Please provide grouping instructions.',
  'NO_TABS': 'No tabs available to group.'
};

// Message listener for popup communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async operations
  handleMessage(message)
    .then(response => sendResponse(response))
    .catch(error => {
      logError(error, {
        operation: 'messageHandler',
        metadata: { action: message?.action }
      });
      sendResponse({
        success: false,
        message: formatErrorMessage(error)
      });
    });
  
  // Return true to indicate async response
  return true;
});

// Route messages to appropriate handler functions
async function handleMessage(message) {
  const { action, data } = message;
  
  switch (action) {
    case 'autoGroup':
      return await handleAutoGroup();
    
    case 'customGroup':
      return await handleCustomGroup(data?.prompt);
    
    case 'getConfig':
      return await handleGetConfig();
    
    case 'saveConfig':
      return await handleSaveConfig(data);
    
    case 'clearConfig':
      return await handleClearConfig();
    
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// Handle automatic tab grouping with error recovery
async function handleAutoGroup() {
  logOperationStart('autoGroup');
  let metadata;
  
  try {
    // Collect metadata from all tabs
    metadata = await collectTabMetadata();
    
    // Get configured LLM provider
    const config = await getConfig();
    console.log('[Auto Group] Config loaded:', { 
      provider: config?.provider, 
      configured: config?.configured,
      hasCredentials: !!config?.credentials 
    });
    
    if (!config || !config.configured) {
      logWarning('No LLM provider configured', { operation: 'autoGroup' });
      return {
        success: false,
        message: ERROR_MESSAGES.NO_CONFIG,
        retryable: false
      };
    }
    
    if (!config.credentials) {
      console.error('[Auto Group] Credentials missing from config');
      return {
        success: false,
        message: 'Configuration error: Credentials not found. Please reconfigure your LLM provider.',
        retryable: false
      };
    }
    
    // Create LLM provider instance
    const provider = createLLMProvider(config);
    
    // Send metadata to LLM with system prompt (with retry for transient failures)
    const groupingResult = await callWithRetry(async () => {
      return await provider.groupTabs(metadata);
    }, config.provider);
    
    // Apply grouping results (with graceful degradation)
    const result = await applyGrouping(groupingResult);
    
    // Handle partial success
    if (result.partialSuccess) {
      logOperationSuccess('autoGroup', { 
        groupsCreated: result.groupsCreated,
        failedGroups: result.failedGroups,
        partialSuccess: true
      });
      
      return {
        success: true,
        message: `Created ${result.groupsCreated} group(s). ${result.failedGroups} group(s) could not be created.`,
        data: {
          groupsCreated: result.groupsCreated,
          failedGroups: result.failedGroups,
          partialSuccess: true
        },
        retryable: false // Partial success - no need to retry
      };
    }
    
    logOperationSuccess('autoGroup', { groupsCreated: result.groupsCreated });
    
    return {
      success: true,
      message: `Successfully created ${result.groupsCreated} group(s)`,
      data: {
        groupsCreated: result.groupsCreated
      },
      retryable: false
    };
  } catch (error) {
    logOperationFailure('autoGroup', error, { tabCount: metadata?.length });
    
    // Log detailed error for debugging
    console.error('[Auto Group Error Details]', {
      message: error.message,
      stack: error.stack,
      originalError: error.originalError,
      tabCount: metadata?.length
    });
    
    // Determine if error is retryable
    const retryable = isRetryableError(error);
    
    return {
      success: false,
      message: formatErrorMessage(error),
      retryable,
      data: {
        errorType: error.message
      }
    };
  }
}

// Create LLM provider instance based on configuration
function createLLMProvider(config) {
  const { provider, credentials } = config;
  
  switch (provider) {
    case 'bedrock':
      console.log('[Create Provider] Bedrock credentials:', {
        hasAccessKey: !!credentials.accessKey,
        hasSecretKey: !!credentials.secretKey,
        hasRegion: !!credentials.region,
        hasSessionToken: !!credentials.sessionToken,
        sessionTokenLength: credentials.sessionToken?.length
      });
      return new BedrockProvider(
        credentials.accessKey,
        credentials.secretKey,
        credentials.region,
        credentials.sessionToken || null
      );
    
    case 'gemini':
      return new GeminiProvider(credentials.apiKey);
    
    case 'local':
      return new LocalLLMProvider(
        credentials.endpoint,
        credentials.apiKey
      );
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// Note: mapErrorMessage is now replaced by formatErrorMessage from error-handler.js
// Keeping ERROR_MESSAGES for backward compatibility with existing code

// Handle custom prompt tab grouping with error recovery
async function handleCustomGroup(prompt) {
  logOperationStart('customGroup', { hasPrompt: !!prompt });
  let metadata;
  
  try {
    // Validate user prompt
    if (!prompt || prompt.trim() === '') {
      logWarning('Empty prompt provided', { operation: 'customGroup' });
      return {
        success: false,
        message: ERROR_MESSAGES.EMPTY_PROMPT,
        retryable: false
      };
    }
    
    // Collect metadata from all tabs
    metadata = await collectTabMetadata();
    
    // Get configured LLM provider
    const config = await getConfig();
    if (!config || !config.configured) {
      logWarning('No LLM provider configured', { operation: 'customGroup' });
      return {
        success: false,
        message: ERROR_MESSAGES.NO_CONFIG,
        retryable: false
      };
    }
    
    // Create LLM provider instance
    const provider = createLLMProvider(config);
    
    // Send metadata to LLM with custom prompt (with retry for transient failures)
    const groupingResult = await callWithRetry(async () => {
      return await provider.groupTabs(metadata, prompt.trim());
    }, config.provider);
    
    // Apply grouping results (with graceful degradation)
    const result = await applyGrouping(groupingResult);
    
    // Handle partial success
    if (result.partialSuccess) {
      const groupNames = result.groupNames.join(', ');
      const summaryMessage = `Created ${result.groupsCreated} group(s): ${groupNames}. ${result.failedGroups} group(s) could not be created.`;
      
      logOperationSuccess('customGroup', {
        groupsCreated: result.groupsCreated,
        groupNames: result.groupNames,
        failedGroups: result.failedGroups,
        partialSuccess: true
      });
      
      return {
        success: true,
        message: summaryMessage,
        data: {
          groupsCreated: result.groupsCreated,
          groupNames: result.groupNames,
          failedGroups: result.failedGroups,
          partialSuccess: true
        },
        retryable: false // Partial success - no need to retry
      };
    }
    
    // Build summary message for complete success
    const groupNames = result.groupNames.join(', ');
    const summaryMessage = `Created ${result.groupsCreated} group(s): ${groupNames}`;
    
    logOperationSuccess('customGroup', {
      groupsCreated: result.groupsCreated,
      groupNames: result.groupNames
    });
    
    return {
      success: true,
      message: summaryMessage,
      data: {
        groupsCreated: result.groupsCreated,
        groupNames: result.groupNames
      },
      retryable: false
    };
  } catch (error) {
    logOperationFailure('customGroup', error, { tabCount: metadata?.length });
    
    // Determine if error is retryable
    const retryable = isRetryableError(error);
    
    return {
      success: false,
      message: formatErrorMessage(error),
      retryable,
      data: {
        errorType: error.message
      }
    };
  }
}

// Collect metadata from all open tabs (optimized for speed)
async function collectTabMetadata() {
  try {
    // Query all open tabs
    const tabs = await getAllTabs();
    
    if (!tabs || tabs.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TABS);
    }
    
    // Fast path: Use only tab title and URL (no content extraction)
    // This is much faster and sufficient for grouping in most cases
    const metadata = tabs.map(tab => ({
      id: tab.id,
      index: tab.index,
      title: tab.title || 'Unknown',
      url: tab.url || ''
    }));
    
    return metadata;
  } catch (error) {
    logError(error, { operation: 'collectTabMetadata' });
    throw error;
  }
}

// Note: extractTabMetadata removed - we now use only title and URL for faster performance

// Capture current tab state for recovery
async function captureTabState() {
  try {
    const tabs = await getAllTabs();
    
    // Capture detailed state including group information
    const state = {
      timestamp: Date.now(),
      tabs: tabs.map(tab => ({
        id: tab.id,
        index: tab.index,
        groupId: tab.groupId || null,
        pinned: tab.pinned || false,
        url: tab.url,
        title: tab.title
      }))
    };
    
    // Also capture existing group information
    try {
      const groups = await chrome.tabGroups.query({});
      state.groups = groups.map(group => ({
        id: group.id,
        title: group.title,
        color: group.color,
        collapsed: group.collapsed
      }));
    } catch (error) {
      // Groups API might not be available in all contexts
      state.groups = [];
    }
    
    return state;
  } catch (error) {
    logError(error, { operation: 'captureTabState' });
    return null;
  }
}

// Restore tab state on critical failure
async function restoreTabState(savedState) {
  if (!savedState || !savedState.tabs || savedState.tabs.length === 0) {
    logWarning('No saved state to restore', { operation: 'restoreTabState' });
    return false;
  }
  
  try {
    logWarning('Attempting to restore original tab state after failure', {
      operation: 'restoreTabState',
      metadata: { 
        tabCount: savedState.tabs.length,
        groupCount: savedState.groups?.length || 0,
        stateAge: Date.now() - savedState.timestamp
      }
    });
    
    // Get current tabs to see what changed
    const currentTabs = await getAllTabs();
    const currentTabIds = new Set(currentTabs.map(t => t.id));
    
    // Track restoration progress
    let tabsRestored = 0;
    let tabsFailed = 0;
    
    // Restore each tab to its original group (or ungroup it)
    for (const savedTab of savedState.tabs) {
      // Skip if tab no longer exists
      if (!currentTabIds.has(savedTab.id)) {
        continue;
      }
      
      try {
        const currentTab = currentTabs.find(t => t.id === savedTab.id);
        
        // If tab was ungrouped originally and is now grouped, ungroup it
        if (savedTab.groupId === null && currentTab.groupId !== null) {
          await chrome.tabs.ungroup(savedTab.id);
          tabsRestored++;
        }
        // Note: Re-grouping tabs to their original groups is complex because
        // we would need to recreate the original groups with the same properties
        // For now, we focus on ungrouping tabs that shouldn't be grouped
      } catch (error) {
        tabsFailed++;
        logError(error, {
          operation: 'restoreTabState',
          metadata: { tabId: savedTab.id, tabTitle: savedTab.title }
        });
      }
    }
    
    logWarning(`Tab state restoration completed: ${tabsRestored} restored, ${tabsFailed} failed`, {
      operation: 'restoreTabState',
      metadata: { tabsRestored, tabsFailed }
    });
    
    return tabsRestored > 0 || tabsFailed === 0;
  } catch (error) {
    logError(error, { operation: 'restoreTabState' });
    return false;
  }
}

// Apply grouping results to tabs with graceful degradation
async function applyGrouping(groupingResult) {
  // Capture current state before making changes (error recovery)
  const savedState = await captureTabState();
  
  try {
    if (!groupingResult || !groupingResult.groups || groupingResult.groups.length === 0) {
      throw new Error('No groups returned from LLM');
    }
    
    const groups = groupingResult.groups;
    let groupsCreated = 0;
    const groupNames = [];
    let colorIndex = 0;
    let failedGroups = 0;
    const failedGroupDetails = [];
    
    // Get all tabs to map indices to tab IDs
    const allTabs = await getAllTabs();
    const tabIndexMap = new Map();
    allTabs.forEach(tab => {
      tabIndexMap.set(tab.index, tab.id);
    });
    
    // Create each group with individual error handling (graceful degradation)
    for (const group of groups) {
      try {
        // Skip empty groups
        if (!group.tabIndices || group.tabIndices.length === 0) {
          logWarning('Skipping empty group', {
            operation: 'applyGrouping',
            metadata: { groupName: group.name }
          });
          continue;
        }
        
        // Map tab indices to tab IDs
        const tabIds = group.tabIndices
          .map(index => tabIndexMap.get(index))
          .filter(id => id !== undefined);
        
        if (tabIds.length === 0) {
          logWarning('No valid tabs found for group', {
            operation: 'applyGrouping',
            metadata: { groupName: group.name, requestedIndices: group.tabIndices }
          });
          continue;
        }
        
        // Assign color (cycle through available colors)
        const color = CHROME_COLORS[colorIndex % CHROME_COLORS.length];
        colorIndex++;
        
        // Create the group with retry for transient failures
        await retryGroupCreation(group.name, color, tabIds);
        groupsCreated++;
        groupNames.push(group.name);
        
        logOperationSuccess('createGroup', {
          groupName: group.name,
          tabCount: tabIds.length
        });
      } catch (error) {
        // Continue with other groups even if one fails (graceful degradation)
        failedGroups++;
        failedGroupDetails.push({
          name: group.name,
          error: error.message,
          tabCount: group.tabIndices?.length
        });
        
        logError(error, {
          operation: 'applyGrouping',
          metadata: { groupName: group.name, tabCount: group.tabIndices?.length }
        });
      }
    }
    
    // Determine if this is a partial success or complete failure
    const totalGroups = groups.length;
    const successRate = totalGroups > 0 ? (groupsCreated / totalGroups) : 0;
    
    // Log appropriate message based on success rate
    if (failedGroups > 0) {
      if (groupsCreated > 0) {
        // Partial success - some groups created
        logWarning(`Partial success: Created ${groupsCreated}/${totalGroups} group(s)`, {
          operation: 'applyGrouping',
          metadata: { 
            totalGroups, 
            groupsCreated, 
            failedGroups,
            successRate: `${(successRate * 100).toFixed(1)}%`,
            failedGroupDetails
          }
        });
      } else {
        // Complete failure - no groups created
        logError(new Error('Failed to create any tab groups'), {
          operation: 'applyGrouping',
          metadata: { totalGroups, failedGroups, failedGroupDetails }
        });
      }
    }
    
    // Critical failure: no groups created at all
    if (groupsCreated === 0 && groups.length > 0) {
      // Attempt to restore original state
      const restored = await restoreTabState(savedState);
      
      if (restored) {
        throw new Error('Failed to create any tab groups. Original tab state has been restored.');
      } else {
        throw new Error('Failed to create any tab groups. Unable to fully restore original state.');
      }
    }
    
    // Partial failure: some groups created, some failed
    if (failedGroups > 0 && groupsCreated > 0) {
      // Don't restore state for partial failures - keep successful groups
      logWarning('Some groups were created successfully despite failures', {
        operation: 'applyGrouping',
        metadata: { groupsCreated, failedGroups }
      });
    }
    
    return {
      groupsCreated,
      groupNames,
      failedGroups,
      partialSuccess: failedGroups > 0 && groupsCreated > 0
    };
  } catch (error) {
    // On critical error, attempt to restore original state
    if (savedState) {
      const restored = await restoreTabState(savedState);
      if (!restored) {
        logError(new Error('Failed to restore original tab state'), {
          operation: 'applyGrouping'
        });
      }
    }
    logError(error, { operation: 'applyGrouping' });
    throw error;
  }
}

// Retry group creation with exponential backoff for transient failures
async function retryGroupCreation(name, color, tabIds, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await createGroup(name, color, tabIds);
      return; // Success
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const message = (error.message || '').toLowerCase();
      const isRetryable = message.includes('timeout') || 
                         message.includes('network') ||
                         message.includes('temporary');
      
      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxRetries || !isRetryable) {
        break;
      }
      
      // Wait before retrying (exponential backoff: 100ms, 200ms)
      const delay = 100 * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      logWarning(`Retrying group creation (attempt ${attempt + 1}/${maxRetries})`, {
        operation: 'retryGroupCreation',
        metadata: { groupName: name, delay }
      });
    }
  }
  
  throw lastError;
}

// Retry API calls with exponential backoff
// Implements error recovery for transient failures
async function callWithRetry(fn, provider, maxRetries = 2) {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = isRetryableError(error);
      
      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxRetries || !isRetryable) {
        if (!isRetryable) {
          logWarning('Non-retryable error encountered', {
            operation: 'callWithRetry',
            provider,
            metadata: { attempt: attempt + 1, errorType: error.message }
          });
        }
        break;
      }
      
      // Calculate delay: 1s, 2s for attempts 0, 1
      const delay = 1000 * (attempt + 1);
      
      logWarning(`Retrying after error (attempt ${attempt + 1}/${maxRetries})`, {
        operation: 'callWithRetry',
        provider,
        metadata: { delay, errorMessage: error.message }
      });
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed
  logOperationFailure('callWithRetry', lastError, {
    provider,
    metadata: { maxRetries, finalAttempt: true }
  });
  throw lastError;
}

// Determine if an error is retryable
function isRetryableError(error) {
  const message = (error.message || '').toLowerCase();
  
  // Retryable errors: ONLY network issues, timeouts, and server errors
  // Rate limits are NOT retryable - they need longer backoff periods
  const retryablePatterns = [
    'network',
    'timeout',
    'etimedout',
    'econnreset',
    '500',
    '502',
    '503',
    '504'
  ];
  
  // Non-retryable errors: authentication, invalid input, not found
  const nonRetryablePatterns = [
    'credentials',
    'authentication',
    'unauthorized',
    '401',
    'forbidden',
    '403',
    'not found',
    '404',
    'invalid',
    'bad request',
    '400'
  ];
  
  // Check non-retryable first (takes precedence)
  if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
    return false;
  }
  
  // Check retryable patterns
  if (retryablePatterns.some(pattern => message.includes(pattern))) {
    return true;
  }
  
  // Default to retryable for unknown errors (conservative approach)
  return true;
}

// Get current configuration
async function handleGetConfig() {
  try {
    const config = await getConfig();
    return {
      success: true,
      data: config  // Return config directly, not nested
    };
  } catch (error) {
    logError(error, { operation: 'getConfig' });
    return {
      success: false,
      message: formatErrorMessage(error)
    };
  }
}

// Save configuration
async function handleSaveConfig(configData) {
  logOperationStart('saveConfig', { provider: configData?.provider });
  
  try {
    // Validate required fields
    if (!configData || !configData.provider) {
      logWarning('Missing provider in config', { operation: 'saveConfig' });
      return {
        success: false,
        message: 'Provider is required'
      };
    }
    
    // Validate credentials based on provider
    const validationError = validateCredentials(configData);
    if (validationError) {
      logWarning('Credential validation failed', {
        operation: 'saveConfig',
        metadata: { provider: configData.provider, error: validationError }
      });
      return {
        success: false,
        message: validationError
      };
    }
    
    // Test endpoint connectivity for local LLM
    if (configData.provider === 'local') {
      try {
        await testLocalEndpoint(configData.credentials.endpoint, configData.credentials.apiKey);
      } catch (error) {
        logError(error, {
          operation: 'testLocalEndpoint',
          metadata: { endpoint: configData.credentials.endpoint }
        });
        return {
          success: false,
          message: `Cannot connect to local LLM endpoint: ${error.message}`
        };
      }
    }
    
    // Save credentials
    await saveCredentials(configData.provider, configData.credentials);
    
    // Save config
    const config = {
      provider: configData.provider,
      configured: true
    };
    await saveConfig(config);
    
    logOperationSuccess('saveConfig', { provider: configData.provider });
    
    return {
      success: true,
      message: 'Configuration saved successfully'
    };
  } catch (error) {
    logOperationFailure('saveConfig', error, { provider: configData?.provider });
    return {
      success: false,
      message: formatErrorMessage(error)
    };
  }
}

// Clear configuration
async function handleClearConfig() {
  logOperationStart('clearConfig');
  
  try {
    await clearCredentials();
    await saveConfig({ configured: false });
    
    logOperationSuccess('clearConfig');
    
    return {
      success: true,
      message: 'Configuration cleared'
    };
  } catch (error) {
    logOperationFailure('clearConfig', error);
    return {
      success: false,
      message: formatErrorMessage(error)
    };
  }
}

// Validate credentials based on provider
function validateCredentials(config) {
  const { provider, credentials } = config;
  
  if (!credentials) {
    return 'Credentials are required';
  }
  
  switch (provider) {
    case 'bedrock':
      if (!credentials.accessKey || !credentials.secretKey || !credentials.region) {
        return 'AWS credentials require access key, secret key, and region';
      }
      break;
    
    case 'gemini':
      if (!credentials.apiKey) {
        return 'Gemini API key is required';
      }
      break;
    
    case 'local':
      if (!credentials.endpoint) {
        return 'Local LLM endpoint is required';
      }
      // Validate endpoint format
      try {
        new URL(credentials.endpoint);
      } catch {
        return 'Invalid endpoint URL format';
      }
      break;
    
    default:
      return `Unknown provider: ${provider}`;
  }
  
  return null;
}

// Test local LLM endpoint connectivity
async function testLocalEndpoint(endpoint, apiKey) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Simple connectivity test - try to reach the endpoint
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'test',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    });
    
    // We don't care about the response content, just that we can connect
    // Even a 400 or 404 means the endpoint is reachable
    if (response.status >= 500) {
      throw new Error(`Server error: ${response.status}`);
    }
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Endpoint is not reachable. Please check the URL and ensure the server is running.');
    }
    throw error;
  }
}

// Export functions for testing
export {
  handleAutoGroup,
  handleCustomGroup,
  collectTabMetadata,
  applyGrouping,
  handleGetConfig as getConfig,
  handleSaveConfig as saveConfig
};
