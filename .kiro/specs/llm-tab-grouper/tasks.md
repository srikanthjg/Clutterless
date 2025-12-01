# Implementation Plan

- [x] 1. Set up Chrome extension project structure and manifest
  - Create manifest.json with Manifest V3 configuration
  - Define required permissions (tabs, tabGroups, storage, scripting, activeTab)
  - Set up basic directory structure (popup/, background/, content/, lib/)
  - _Requirements: 4.1, 4.2_

- [x] 2. Implement storage manager module
  - [x] 2.1 Create storage-manager.js with credential storage functions
    - Write saveCredentials() function using Chrome storage API
    - Write getCredentials() function with decryption
    - Write clearCredentials() function
    - Write getConfig() and saveConfig() functions
    - _Requirements: 1.5, 7.1_
  
  - [x] 2.2 Add unit tests for storage manager
    - Test credential save/retrieve cycle
    - Test configuration persistence
    - Test error handling for storage failures
    - _Requirements: 1.5, 7.1_

- [x] 3. Create tab manager module
  - [x] 3.1 Implement tab-manager.js with Chrome Tabs API integration
    - Write getAllTabs() function to query open tabs
    - Write createGroup() function to create tab groups with names and colors
    - Write ungroupTabs() function to remove tabs from groups
    - Add error handling for Chrome API failures
    - _Requirements: 2.4, 5.1, 5.2_
  
  - [x] 3.2 Add unit tests for tab manager
    - Mock Chrome Tabs API
    - Test tab querying functionality
    - Test group creation with various parameters
    - Test error handling scenarios
    - _Requirements: 2.4, 5.1_

- [x] 4. Build LLM provider abstraction layer
  - [x] 4.1 Create base LLMProvider class in llm-provider.js
    - Define abstract groupTabs() method
    - Create standard response format interface
    - Add error handling base methods
    - _Requirements: 6.1, 6.2_
  
  - [x] 4.2 Implement BedrockProvider class
    - Write constructor with AWS credential parameters
    - Implement groupTabs() method using AWS SDK
    - Format request payload for Bedrock API
    - Parse Bedrock response into standard format
    - Add Bedrock-specific error handling
    - _Requirements: 1.2, 6.1, 6.2, 6.4_
  
  - [x] 4.3 Implement GeminiProvider class
    - Write constructor with API key parameter
    - Implement groupTabs() method using Gemini REST API
    - Format request payload for Gemini API
    - Parse Gemini response into standard format
    - Add Gemini-specific error handling
    - _Requirements: 1.3, 6.1, 6.2, 6.4_
  
  - [x] 4.4 Implement LocalLLMProvider class
    - Write constructor with endpoint and optional API key
    - Implement groupTabs() method using OpenAI-compatible format
    - Format request for /v1/chat/completions endpoint
    - Parse response into standard format
    - Add local LLM error handling and connection validation
    - _Requirements: 1.4, 1.8, 6.1, 6.2_
  
  - [x] 4.5 Add unit tests for LLM providers
    - Mock API responses for each provider
    - Test request formatting
    - Test response parsing
    - Test error handling for network failures, rate limits, and malformed responses
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

- [x] 5. Implement content script for tab metadata extraction
  - [x] 5.1 Create content.js with metadata extraction logic
    - Extract page title
    - Extract URL
    - Handle extraction errors gracefully
    - _Requirements: 5.1, 5.2, 5.3, 5.5, 7.4_
  
  - [x] 5.2 Add message listener for service worker communication
    - Listen for 'extractContent' action
    - Send extracted metadata back to service worker
    - Handle restricted pages (chrome://) appropriately
    - _Requirements: 5.4, 5.6_
  
  - [x] 5.3 Add unit tests for content script
    - Test metadata extraction from mock DOM
    - Test error handling for inaccessible elements
    - Test filtering of sensitive data
    - _Requirements: 5.3, 5.5, 7.4_

- [x] 6. Build service worker background script
  - [x] 6.1 Create background.js with message handling
    - Set up message listener for popup communication
    - Route messages to appropriate handler functions
    - Implement response messaging back to popup
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
  
  - [x] 6.2 Implement collectTabMetadata() function
    - Query all open tabs using tab manager
    - Inject content script into each accessible tab
    - Collect metadata responses from content scripts
    - Handle tabs that cannot be accessed
    - Process tabs in batches for large counts (>50 tabs)
    - _Requirements: 2.1, 2.7, 5.1, 5.2, 5.3, 5.5, 5.6_
  
  - [x] 6.3 Implement handleAutoGroup() function
    - Call collectTabMetadata()
    - Get configured LLM provider from storage
    - Send metadata to LLM provider with system prompt
    - Parse grouping results
    - Call applyGrouping() with results
    - Handle errors and display user-friendly messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_
  
  - [x] 6.4 Implement handleCustomGroup() function
    - Validate user prompt is not empty
    - Call collectTabMetadata()
    - Get configured LLM provider from storage
    - Send metadata to LLM with custom prompt included
    - Parse grouping results
    - Call applyGrouping() with results
    - Show summary of created groups
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_
  
  - [x] 6.5 Implement applyGrouping() function
    - Parse LLM grouping response
    - Create tab groups using tab manager
    - Assign colors to groups (cycle through Chrome's color options)
    - Move tabs to their assigned groups
    - Leave ungrouped tabs as-is
    - Handle errors during group creation
    - _Requirements: 2.3, 2.4, 2.5, 2.6_
  
  - [x] 6.6 Add retry logic with exponential backoff
    - Create callWithRetry() utility function
    - Implement exponential backoff (1s, 2s delays)
    - Retry API calls up to 2 times on failure
    - _Requirements: 6.3_
  
  - [x] 6.7 Add configuration management functions
    - Implement getConfig() to retrieve stored configuration
    - Implement saveConfig() to store configuration
    - Validate credentials before saving
    - Test endpoint connectivity for local LLM
    - _Requirements: 1.5, 1.6, 1.8_
  
  - [x] 6.8 Add unit tests for service worker functions
    - Test message routing
    - Test metadata collection with mocked tabs
    - Test auto grouping flow
    - Test custom grouping flow
    - Test error handling scenarios
    - _Requirements: 2.6, 3.4, 6.6, 6.7_

- [x] 7. Create popup UI
  - [x] 7.1 Build popup.html structure
    - Create configuration section with provider selection
    - Add credential input fields (conditional based on provider)
    - Create action buttons (Auto Group, Custom Group, Configure)
    - Add loading indicator element
    - Add message display area for results and errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 7.2 Style popup with popup.css
    - Create clean, simple layout
    - Style buttons with clear visual hierarchy
    - Add loading spinner animation
    - Style success and error messages distinctly
    - Ensure responsive design for popup dimensions
    - _Requirements: 4.1_
  
  - [x] 7.3 Implement popup.js interaction logic
    - Load and display current configuration status on open
    - Handle provider selection changes
    - Show/hide credential fields based on provider
    - Validate input fields before submission
    - Send configuration to service worker
    - Handle Auto Group button click
    - Handle Custom Group button click with prompt input
    - Display loading state during operations
    - Display success messages with group count
    - Display error messages with suggested actions
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 7.4 Add integration tests for popup UI
    - Test configuration flow for each provider
    - Test auto grouping trigger
    - Test custom grouping with prompt
    - Test error message display
    - Test loading state transitions
    - _Requirements: 4.6, 4.7_

- [x] 8. Implement LLM prompt engineering
  - [x] 8.1 Create system prompt template
    - Write clear instructions for tab grouping
    - Define grouping rules (2-7 groups, concise names)
    - Specify JSON response format
    - Add placeholder for custom user prompt
    - _Requirements: 2.2, 3.2_
  
  - [x] 8.2 Format tab metadata for LLM input
    - Structure tabs array with index, title, URL, content
    - Truncate long content appropriately
    - Escape special characters for JSON
    - _Requirements: 2.1, 5.3_
  
  - [x] 8.3 Test prompts with each LLM provider
    - Verify response format consistency
    - Test with various tab scenarios (work, personal, research)
    - Test with custom prompts
    - Adjust prompt based on provider-specific behavior
    - _Requirements: 2.2, 2.3, 3.2, 3.3_

- [x] 9. Add comprehensive error handling
  - [x] 9.1 Create error message mapping
    - Define user-friendly messages for each error type
    - Map API error codes to readable messages
    - Include suggested actions in error messages
    - _Requirements: 2.6, 4.7, 6.4, 6.5_
  
  - [x] 9.2 Implement error logging
    - Log errors to console for debugging
    - Exclude sensitive information from logs
    - Include context (operation, provider, timestamp)
    - _Requirements: 6.7, 7.6_
  
  - [x] 9.3 Add error recovery mechanisms
    - Implement graceful degradation for partial failures
    - Preserve original tab state on critical errors
    - Provide retry options for transient failures
    - _Requirements: 2.6, 6.3_

- [x] 10. Implement security measures
  - [x] 10.1 Add credential encryption for storage
    - Use Chrome's secure storage API
    - Encrypt sensitive credentials before storing
    - Decrypt on retrieval
    - _Requirements: 7.1_
  
  - [x] 10.2 Implement HTTPS-only API communication
    - Validate all API endpoints use HTTPS
    - Reject insecure connections
    - Add exception for localhost development
    - _Requirements: 7.5_
  
  - [x] 10.3 Add content filtering for sensitive data
    - Filter password input fields from content extraction
    - Filter credit card input fields
    - Filter other sensitive form data
    - _Requirements: 7.4_
  
  - [x] 10.4 Add unit tests for security measures
    - Test credential encryption/decryption
    - Test HTTPS validation
    - Test sensitive data filtering
    - _Requirements: 7.1, 7.4, 7.5_

- [x] 11. Create end-to-end integration tests
  - [x] 11.1 Test complete auto grouping flow
    - Set up test environment with multiple tabs
    - Configure test LLM provider
    - Trigger auto grouping
    - Verify groups are created correctly
    - Verify tabs are moved appropriately
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 11.2 Test custom prompt grouping flow
    - Open tabs with known content
    - Provide specific grouping instructions
    - Verify groups match user intent
    - Test with ambiguous prompts
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 11.3 Test configuration flows for all providers
    - Test Bedrock configuration and validation
    - Test Gemini configuration and validation
    - Test Local LLM configuration and validation
    - Test switching between providers
    - Test invalid credential handling
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.8_
  
  - [x] 11.4 Test edge cases and error scenarios
    - Test with 50+ tabs (batching)
    - Test with mixed tab types (regular, chrome://, restricted)
    - Test with network disconnected
    - Test with invalid API credentials
    - Test with API rate limiting
    - _Requirements: 2.7, 5.4, 5.6, 6.3, 6.5_

- [x] 12. Add documentation and polish
  - [x] 12.1 Create README.md with setup instructions
    - Document installation steps
    - Explain configuration for each provider
    - Provide usage examples
    - Include troubleshooting section
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 12.2 Add inline code comments
    - Document complex functions
    - Explain LLM prompt engineering decisions
    - Document API integration details
    - _Requirements: All_
  
  - [x] 12.3 Create example configurations
    - Provide example for Bedrock setup
    - Provide example for Gemini setup
    - Provide example for local Ollama setup
    - Provide example for local LM Studio setup
    - _Requirements: 1.2, 1.3, 1.4_
