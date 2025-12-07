/**
 * Test Setup File
 * Configures the test environment for visual and functional tests
 */

// Mock Chrome API
global.chrome = {
  runtime: {
    getURL: (path) => `chrome-extension://test-extension-id/${path}`,
    sendMessage: (message, callback) => {
      if (callback) {
        callback({ success: true, data: {} });
      }
      return Promise.resolve({ success: true, data: {} });
    },
    lastError: null
  },
  storage: {
    local: {
      get: (keys, callback) => {
        if (callback) {
          callback({});
        }
        return Promise.resolve({});
      },
      set: (items, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }
    }
  },
  tabs: {
    query: (queryInfo, callback) => {
      if (callback) {
        callback([]);
      }
      return Promise.resolve([]);
    },
    group: (tabIds, callback) => {
      if (callback) {
        callback(1);
      }
      return Promise.resolve(1);
    }
  },
  tabGroups: {
    update: (groupId, updateProperties, callback) => {
      if (callback) {
        callback();
      }
      return Promise.resolve();
    }
  }
};

// Mock fetch for loading HTML and CSS files
global.fetch = async (url) => {
  if (url.includes('popup.html')) {
    return {
      text: async () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clutterless</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="container popup-container">
    <div class="fade-in-wrapper">
      <h1 class="popup-title">Clutterless</h1>
      
      <div id="config-section" class="card config-card">
        <div class="config-status status-indicator">
          <span id="status-indicator" class="status-dot status-dot-error"></span>
          <span id="status-text" class="status-text">Not configured</span>
        </div>
        
        <div id="config-form" class="form config-form hidden">
          <label for="provider-select" class="form-label">LLM Provider:</label>
          <select id="provider-select" class="form-select form-input">
            <option value="">Select provider...</option>
            <option value="bedrock">AWS Bedrock</option>
            <option value="gemini">Google Gemini</option>
            <option value="local">Local LLM</option>
          </select>
          
          <div id="bedrock-fields" class="credential-fields form-group hidden">
            <input type="text" id="bedrock-access-key" class="form-input form-text-input" placeholder="AWS Access Key" />
            <input type="password" id="bedrock-secret-key" class="form-input form-password-input" placeholder="AWS Secret Key" />
            <input type="password" id="bedrock-session-token" class="form-input form-password-input" placeholder="AWS Session Token (optional)" />
            <input type="text" id="bedrock-region" class="form-input form-text-input" placeholder="Region (e.g., us-east-1)" />
          </div>
          
          <div id="gemini-fields" class="credential-fields form-group hidden">
            <input type="password" id="gemini-api-key" class="form-input form-password-input" placeholder="Gemini API Key" />
          </div>
          
          <div id="local-fields" class="credential-fields form-group hidden">
            <input type="text" id="local-endpoint" class="form-input form-text-input" placeholder="Endpoint URL" />
            <input type="password" id="local-api-key" class="form-input form-password-input" placeholder="API Key (optional)" />
          </div>
          
          <button id="save-config-btn" class="btn btn-primary action-btn">Save Configuration</button>
          <button id="cancel-config-btn" class="btn btn-secondary action-btn">Cancel</button>
        </div>
        
        <button id="configure-btn" class="btn btn-secondary action-btn">Configure</button>
      </div>
      
      <div id="action-section" class="action-section hidden">
        <button id="auto-group-btn" class="btn btn-primary action-btn">Auto Group Tabs</button>
        
        <div id="custom-group-section" class="custom-group-section">
          <input type="text" id="custom-prompt" class="form-input form-text-input custom-prompt-input" placeholder="Enter custom grouping instructions..." />
          <button id="custom-group-btn" class="btn btn-primary action-btn">Custom Group</button>
        </div>
      </div>
      
      <div id="loading-indicator" class="loading-indicator hidden">
        <div class="spinner loading-spinner"></div>
        <p id="loading-text" class="loading-text">Processing...</p>
      </div>
    </div>
    
    <div class="slide-in-wrapper">
      <div id="message-area" class="message message-container hidden"></div>
    </div>
  </div>
</body>
</html>
      `
    };
  }
  
  return {
    text: async () => ''
  };
};

// Mock performance API
if (typeof performance === 'undefined') {
  global.performance = {
    now: () => Date.now()
  };
}

// Mock matchMedia for reduced motion tests
global.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true
});
