// DOM Elements
const configSection = document.getElementById('config-section');
const configForm = document.getElementById('config-form');
const configureBtn = document.getElementById('configure-btn');
const saveConfigBtn = document.getElementById('save-config-btn');
const cancelConfigBtn = document.getElementById('cancel-config-btn');
const providerSelect = document.getElementById('provider-select');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');

const bedrockFields = document.getElementById('bedrock-fields');
const geminiFields = document.getElementById('gemini-fields');
const localFields = document.getElementById('local-fields');

const actionSection = document.getElementById('action-section');
const autoGroupBtn = document.getElementById('auto-group-btn');
const customGroupBtn = document.getElementById('custom-group-btn');
const customPrompt = document.getElementById('custom-prompt');

const loadingIndicator = document.getElementById('loading-indicator');
const loadingText = document.getElementById('loading-text');
const messageArea = document.getElementById('message-area');
const messageContent = document.getElementById('message-content');

// Initialize popup on load
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfiguration();
  setupEventListeners();
  
  // Restore popup state if available
  const { popupState } = await chrome.storage.local.get('popupState');
  
  if (popupState && (Date.now() - popupState.timestamp) < 300000) { // 5 minutes
    providerSelect.value = popupState.provider;
    handleProviderChange();
    
    if (popupState.provider === 'bedrock') {
      document.getElementById('bedrock-access-key').value = popupState.accessKey || '';
      document.getElementById('bedrock-secret-key').value = popupState.secretKey || '';
      document.getElementById('bedrock-session-token').value = popupState.sessionToken || '';
      document.getElementById('bedrock-region').value = popupState.region || '';
    } else if (popupState.provider === 'gemini') {
      document.getElementById('gemini-api-key').value = popupState.geminiApiKey || '';
    } else if (popupState.provider === 'local') {
      document.getElementById('local-endpoint').value = popupState.localEndpoint || '';
      document.getElementById('local-api-key').value = popupState.localApiKey || '';
    }
  }
});

// Save popup state when window loses focus
window.addEventListener('blur', () => {
  const state = {
    provider: providerSelect.value,
    accessKey: document.getElementById('bedrock-access-key').value,
    secretKey: document.getElementById('bedrock-secret-key').value,
    sessionToken: document.getElementById('bedrock-session-token').value,
    region: document.getElementById('bedrock-region').value,
    geminiApiKey: document.getElementById('gemini-api-key').value,
    localEndpoint: document.getElementById('local-endpoint').value,
    localApiKey: document.getElementById('local-api-key').value,
    timestamp: Date.now()
  };
  
  chrome.storage.local.set({ popupState: state });
});

// Load and display current configuration status
async function loadConfiguration() {
  try {
    const response = await sendMessage({ action: 'getConfig' });
    
    if (response.success && response.data && response.data.configured) {
      // Show configured state
      statusIndicator.classList.add('configured');
      statusText.textContent = `Configured: ${getProviderDisplayName(response.data.provider)}`;
      configureBtn.textContent = 'Reconfigure';
      
      // Make sure config form is hidden and action section is visible
      configForm.classList.add('hidden');
      actionSection.classList.remove('hidden');
      
      console.log('Configuration loaded - showing action section');
    } else {
      // Show not configured state
      statusIndicator.classList.remove('configured');
      statusText.textContent = 'Not configured';
      configureBtn.textContent = 'Configure';
      actionSection.classList.add('hidden');
      
      console.log('No configuration found - hiding action section');
    }
  } catch (error) {
    console.error('Failed to load configuration:', error);
    showMessage('Failed to load configuration', 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  configureBtn.addEventListener('click', showConfigForm);
  saveConfigBtn.addEventListener('click', saveConfiguration);
  cancelConfigBtn.addEventListener('click', hideConfigForm);
  providerSelect.addEventListener('change', handleProviderChange);
  autoGroupBtn.addEventListener('click', handleAutoGroup);
  customGroupBtn.addEventListener('click', handleCustomGroup);
}

// Show configuration form
function showConfigForm() {
  configForm.classList.remove('hidden');
  configureBtn.classList.add('hidden');
  actionSection.classList.add('hidden');
}

// Hide configuration form
function hideConfigForm() {
  configForm.classList.add('hidden');
  configureBtn.classList.remove('hidden');
  providerSelect.value = '';
  hideAllCredentialFields();
  clearCredentialInputs();
  
  // Note: Don't show/hide action section here
  // Let loadConfiguration() handle that after checking config status
}

// Handle provider selection changes
function handleProviderChange() {
  const provider = providerSelect.value;
  hideAllCredentialFields();
  
  if (provider === 'bedrock') {
    bedrockFields.classList.remove('hidden');
  } else if (provider === 'gemini') {
    geminiFields.classList.remove('hidden');
  } else if (provider === 'local') {
    localFields.classList.remove('hidden');
  }
}

// Hide all credential fields
function hideAllCredentialFields() {
  bedrockFields.classList.add('hidden');
  geminiFields.classList.add('hidden');
  localFields.classList.add('hidden');
}

// Clear credential inputs
function clearCredentialInputs() {
  document.getElementById('bedrock-access-key').value = '';
  document.getElementById('bedrock-secret-key').value = '';
  document.getElementById('bedrock-session-token').value = '';
  document.getElementById('bedrock-region').value = '';
  document.getElementById('gemini-api-key').value = '';
  document.getElementById('local-endpoint').value = '';
  document.getElementById('local-api-key').value = '';
}

// Validate Bedrock credentials format
function validateBedrockCredentials(credentials) {
  const { accessKey, secretKey, region, sessionToken } = credentials;
  
  // Validate access key format
  // AKIA = permanent credentials (20 chars total)
  // ASIA = temporary credentials (20 chars total, requires session token)
  if (!accessKey) {
    return {
      valid: false,
      error: 'Access Key is required.'
    };
  }
  
  const isPermanent = accessKey.startsWith('AKIA');
  const isTemporary = accessKey.startsWith('ASIA');
  
  if (!isPermanent && !isTemporary) {
    return {
      valid: false,
      error: 'Invalid Access Key format. Should start with AKIA (permanent) or ASIA (temporary).'
    };
  }
  
  if (accessKey.length !== 20) {
    return {
      valid: false,
      error: 'Invalid Access Key length. Should be exactly 20 characters.'
    };
  }
  
  // Temporary credentials require session token
  if (isTemporary && !sessionToken) {
    return {
      valid: false,
      error: 'Temporary credentials (ASIA...) require a session token.'
    };
  }
  
  // Validate secret key length (40 chars)
  if (!secretKey || secretKey.length !== 40) {
    return {
      valid: false,
      error: 'Invalid Secret Key format. Should be exactly 40 characters.'
    };
  }
  
  // Validate region format (xx-xxxx-N)
  if (!region || !region.match(/^[a-z]{2}-[a-z]+-\d$/)) {
    return {
      valid: false,
      error: 'Invalid region format. Example: us-east-1'
    };
  }
  
  // Optional session token validation
  if (sessionToken && sessionToken.length < 100) {
    return {
      valid: false,
      error: 'Session token appears invalid. It should be a long string (typically 500+ characters).'
    };
  }
  
  return { valid: true };
}

// Validate configuration inputs
function validateConfiguration(provider, credentials) {
  if (!provider) {
    showMessage('Please select a provider', 'error');
    return false;
  }
  
  if (provider === 'bedrock') {
    if (!credentials.accessKey || !credentials.secretKey || !credentials.region) {
      showMessage('Please fill in all AWS Bedrock credentials', 'error');
      return false;
    }
    
    // Perform format validation
    const validation = validateBedrockCredentials(credentials);
    if (!validation.valid) {
      showMessage(validation.error, 'error');
      return false;
    }
  } else if (provider === 'gemini') {
    if (!credentials.apiKey) {
      showMessage('Please enter your Gemini API key', 'error');
      return false;
    }
  } else if (provider === 'local') {
    if (!credentials.endpoint) {
      showMessage('Please enter the Local LLM endpoint URL', 'error');
      return false;
    }
    // Validate URL format
    try {
      new URL(credentials.endpoint);
    } catch (e) {
      showMessage('Please enter a valid endpoint URL', 'error');
      return false;
    }
  }
  
  return true;
}

// Save configuration
async function saveConfiguration() {
  const provider = providerSelect.value;
  let credentials = {};
  
  if (provider === 'bedrock') {
    const sessionToken = document.getElementById('bedrock-session-token').value.trim();
    credentials = {
      accessKey: document.getElementById('bedrock-access-key').value.trim(),
      secretKey: document.getElementById('bedrock-secret-key').value.trim(),
      region: document.getElementById('bedrock-region').value.trim()
    };
    // Add session token if provided
    if (sessionToken) {
      credentials.sessionToken = sessionToken;
      console.log('[Popup] Session token provided, length:', sessionToken.length);
    } else {
      console.log('[Popup] No session token provided');
    }
  } else if (provider === 'gemini') {
    credentials = {
      apiKey: document.getElementById('gemini-api-key').value.trim()
    };
  } else if (provider === 'local') {
    credentials = {
      endpoint: document.getElementById('local-endpoint').value.trim(),
      apiKey: document.getElementById('local-api-key').value.trim() || undefined
    };
  }
  
  if (!validateConfiguration(provider, credentials)) {
    return;
  }
  
  showLoading('Saving configuration...');
  
  try {
    const response = await sendMessage({
      action: 'saveConfig',
      data: { provider, credentials }
    });
    
    hideLoading();
    
    if (response.success) {
      // Clear popup state after successful save
      await chrome.storage.local.remove('popupState');
      
      // Clear and hide the form
      hideConfigForm();
      
      // Reload configuration to update UI
      await loadConfiguration();
      
      // Show success message after UI is updated
      showMessage('Configuration saved successfully! You can now group your tabs.', 'success');
    } else {
      showMessage(response.message || 'Failed to save configuration', 'error');
    }
  } catch (error) {
    hideLoading();
    showMessage('Error saving configuration: ' + error.message, 'error');
  }
}

// Handle Auto Group button click with retry support
async function handleAutoGroup() {
  showLoading('Analyzing and grouping tabs...');
  hideMessage();
  
  try {
    const response = await sendMessage({ action: 'autoGroup' });
    
    hideLoading();
    
    if (response.success) {
      const groupCount = response.data?.groupsCreated || 0;
      const partialSuccess = response.data?.partialSuccess;
      
      if (partialSuccess) {
        // Partial success - some groups created, some failed
        showMessage(response.message, 'warning');
      } else {
        // Complete success
        showMessage(`Successfully created ${groupCount} tab group${groupCount !== 1 ? 's' : ''}`, 'success');
      }
    } else {
      // Check if error is retryable
      if (response.retryable) {
        showMessageWithRetry(response.message, 'autoGroup');
      } else {
        showMessage(response.message || 'Failed to group tabs', 'error');
      }
    }
  } catch (error) {
    hideLoading();
    showMessage('Error during auto grouping: ' + error.message, 'error');
  }
}

// Handle Custom Group button click with retry support
async function handleCustomGroup() {
  const prompt = customPrompt.value.trim();
  
  if (!prompt) {
    showMessage('Please enter grouping instructions', 'error');
    return;
  }
  
  showLoading('Grouping tabs with custom instructions...');
  hideMessage();
  
  try {
    const response = await sendMessage({
      action: 'customGroup',
      data: { prompt }
    });
    
    hideLoading();
    
    if (response.success) {
      const groupCount = response.data?.groupsCreated || 0;
      const partialSuccess = response.data?.partialSuccess;
      
      if (partialSuccess) {
        // Partial success - some groups created, some failed
        showMessage(response.message, 'warning');
      } else {
        // Complete success
        showMessage(`Successfully created ${groupCount} tab group${groupCount !== 1 ? 's' : ''} based on your instructions`, 'success');
      }
      customPrompt.value = '';
    } else {
      // Check if error is retryable
      if (response.retryable) {
        showMessageWithRetry(response.message, 'customGroup', { prompt });
      } else {
        showMessage(response.message || 'Failed to group tabs', 'error');
      }
    }
  } catch (error) {
    hideLoading();
    showMessage('Error during custom grouping: ' + error.message, 'error');
  }
}

// Show loading state
function showLoading(text = 'Processing...') {
  loadingText.textContent = text;
  loadingIndicator.classList.remove('hidden');
  actionSection.classList.add('hidden');
  configSection.classList.add('hidden');
}

// Hide loading state
function hideLoading() {
  loadingIndicator.classList.add('hidden');
  configSection.classList.remove('hidden');
  
  if (statusIndicator.classList.contains('configured')) {
    actionSection.classList.remove('hidden');
  }
}

// Show message
function showMessage(text, type = 'error') {
  // Clear existing content
  messageArea.innerHTML = '';
  
  // Create icon element
  const icon = document.createElement('span');
  icon.className = 'message-icon';
  messageArea.appendChild(icon);
  
  // Create content element
  const content = document.createElement('div');
  content.id = 'message-content';
  content.textContent = text;
  messageArea.appendChild(content);
  
  // Set message type class
  messageArea.className = type;
  messageArea.classList.remove('hidden');
  
  // Auto-hide success and warning messages after 5 seconds
  if (type === 'success' || type === 'warning') {
    setTimeout(() => {
      hideMessage();
    }, 5000);
  }
}

// Show message with retry option for transient failures
function showMessageWithRetry(text, action, data = null) {
  // Clear existing content
  messageArea.innerHTML = '';
  
  // Create icon element
  const icon = document.createElement('span');
  icon.className = 'message-icon';
  messageArea.appendChild(icon);
  
  // Create content element
  const content = document.createElement('div');
  content.id = 'message-content';
  content.textContent = text + ' ';
  messageArea.appendChild(content);
  
  // Set message type class
  messageArea.className = 'error';
  messageArea.classList.remove('hidden');
  
  // Create retry button
  const retryBtn = document.createElement('button');
  retryBtn.textContent = 'Retry';
  retryBtn.className = 'retry-btn';
  retryBtn.style.marginLeft = '10px';
  retryBtn.style.padding = '4px 12px';
  retryBtn.style.fontSize = '12px';
  retryBtn.style.cursor = 'pointer';
  retryBtn.style.backgroundColor = '#4CAF50';
  retryBtn.style.color = 'white';
  retryBtn.style.border = 'none';
  retryBtn.style.borderRadius = '4px';
  
  retryBtn.addEventListener('click', async () => {
    hideMessage();
    
    if (action === 'autoGroup') {
      await handleAutoGroup();
    } else if (action === 'customGroup' && data?.prompt) {
      customPrompt.value = data.prompt;
      await handleCustomGroup();
    }
  });
  
  content.appendChild(retryBtn);
}

// Hide message
function hideMessage() {
  messageArea.classList.add('hidden');
  // Clear content to reset for next message
  messageArea.innerHTML = '';
}

// Send message to service worker
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Get provider display name
function getProviderDisplayName(provider) {
  const names = {
    bedrock: 'AWS Bedrock',
    gemini: 'Google Gemini',
    local: 'Local LLM'
  };
  return names[provider] || provider;
}
