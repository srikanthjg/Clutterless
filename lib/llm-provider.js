// Import AWS SDK modules for Bedrock
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * Base LLM Provider class
 * Defines the interface for all LLM provider implementations
 */
class LLMProvider {
  /**
   * Abstract method to group tabs using LLM
   * @param {Array} tabMetadata - Array of tab metadata objects
   * @param {string} customPrompt - Optional custom user prompt
   * @returns {Promise<Object>} Standard grouping result format
   */
  async groupTabs(tabMetadata, customPrompt = '') {
    throw new Error('groupTabs() must be implemented by subclass');
  }

  /**
   * Validates the standard response format
   * @param {Object} response - Response from LLM
   * @returns {Object} Validated and normalized response
   */
  validateResponse(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response: must be an object');
    }

    if (!Array.isArray(response.groups)) {
      throw new Error('Invalid response: groups must be an array');
    }

    // Validate each group
    response.groups.forEach((group, index) => {
      if (!group.name || typeof group.name !== 'string') {
        throw new Error(`Invalid group at index ${index}: name is required and must be a string`);
      }

      if (!Array.isArray(group.tabIndices)) {
        throw new Error(`Invalid group at index ${index}: tabIndices must be an array`);
      }

      if (group.tabIndices.some(idx => typeof idx !== 'number')) {
        throw new Error(`Invalid group at index ${index}: all tabIndices must be numbers`);
      }
    });

    return response;
  }

  /**
   * Handles errors and converts them to user-friendly messages
   * @param {Error} error - The error to handle
   * @returns {Error} Enhanced error with user-friendly message
   */
  handleError(error) {
    const errorMap = {
      'ENOTFOUND': 'Network error: Unable to reach the API endpoint',
      'ETIMEDOUT': 'Request timed out: The API took too long to respond',
      'ECONNREFUSED': 'Connection refused: The API endpoint is not accessible',
      'UNAUTHORIZED': 'Authentication failed: Invalid credentials',
      'FORBIDDEN': 'Access denied: Check your API permissions',
      'RATE_LIMIT': 'Rate limit exceeded: Please wait before trying again',
      'INVALID_RESPONSE': 'Invalid response from API: Unable to parse the result'
    };

    // Check for known error codes
    const errorCode = error.code || error.message;
    for (const [code, message] of Object.entries(errorMap)) {
      if (errorCode.includes(code)) {
        const enhancedError = new Error(message);
        enhancedError.originalError = error;
        return enhancedError;
      }
    }

    // Return generic error with original message
    const enhancedError = new Error(`LLM Provider Error: ${error.message}`);
    enhancedError.originalError = error;
    return enhancedError;
  }

  /**
   * Builds the system prompt for tab grouping (optimized for speed)
   * @param {string} customPrompt - Optional custom user instructions
   * @returns {string} Complete system prompt
   */
  buildSystemPrompt(customPrompt = '') {
    const basePrompt = `Group browser tabs by topic/purpose. Create 2-7 groups with clear names (2-4 words).
${customPrompt ? `\nUser instructions: ${customPrompt}\n` : ''}
Respond with JSON only:
{
  "groups": [
    {
      "name": "Group Name",
      "tabIndices": [0, 2, 5],
      "reasoning": "Why these belong together"
    }
  ]
}

Rules:
- Group by topic, domain, or purpose
- Short group names (2-4 words)
- Only group tabs that clearly belong together
- Use tab index numbers from the list`;

    return basePrompt;
  }

  /**
   * Formats tab metadata for LLM consumption (optimized for speed and token efficiency)
   * @param {Array} tabMetadata - Array of tab metadata objects
   * @returns {string} Formatted tab information
   */
  formatTabMetadata(tabMetadata) {
    // Compact format: one line per tab with just index, title, and domain
    const formattedTabs = tabMetadata.map((tab, index) => {
      const title = (tab.title || 'Untitled').substring(0, 100); // Limit title length
      const url = tab.url || '';
      
      // Extract just the domain for brevity
      let domain = url;
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname;
      } catch {
        // Keep full URL if parsing fails
      }
      
      return `${index}. ${title} [${domain}]`;
    }).join('\n');

    return `Tabs (${tabMetadata.length} total):\n${formattedTabs}`;
  }
}

// Export for use in other modules (CommonJS for tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LLMProvider };
}

// ES6 export for browser extension
export { LLMProvider };


/**
 * AWS Bedrock Provider implementation
 * Uses AWS SDK to communicate with Bedrock Runtime API
 */
class BedrockProvider extends LLMProvider {
  /**
   * @param {string} accessKey - AWS access key ID
   * @param {string} secretKey - AWS secret access key
   * @param {string} region - AWS region (e.g., 'us-east-1')
   * @param {string} sessionToken - AWS session token (optional, for temporary credentials)
   * @param {string} modelId - Bedrock model ID (default: Claude 3.5 Sonnet for best balance of speed and quality)
   */
  constructor(accessKey, secretKey, region, sessionToken = null, modelId = 'anthropic.claude-3-5-sonnet-20240620-v1:0') {
    super();
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.region = region;
    this.sessionToken = sessionToken;
    this.modelId = modelId;
    
    // Initialize AWS SDK client
    this.client = this.createBedrockClient();
  }

  /**
   * Creates Bedrock Runtime client with proper credentials
   * @returns {BedrockRuntimeClient} Configured Bedrock client
   */
  createBedrockClient() {
    const credentials = {
      accessKeyId: this.accessKey,
      secretAccessKey: this.secretKey
    };
    
    // Add session token if present (for temporary credentials)
    if (this.sessionToken) {
      credentials.sessionToken = this.sessionToken;
    }
    
    return new BedrockRuntimeClient({
      region: this.region,
      credentials: credentials
    });
  }

  /**
   * Groups tabs using AWS Bedrock
   * @param {Array} tabMetadata - Array of tab metadata objects
   * @param {string} customPrompt - Optional custom user prompt
   * @returns {Promise<Object>} Grouping result
   */
  async groupTabs(tabMetadata, customPrompt = '') {
    try {
      console.log('[Bedrock] Starting groupTabs with', tabMetadata.length, 'tabs');
      
      const systemPrompt = this.buildSystemPrompt(customPrompt);
      const formattedTabs = this.formatTabMetadata(tabMetadata);
      
      const requestPayload = this.formatBedrockRequest(systemPrompt, formattedTabs);
      console.log('[Bedrock] Invoking model:', this.modelId);
      
      // Use AWS SDK to invoke model
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(requestPayload)
      });
      
      const response = await this.client.send(command);
      console.log('[Bedrock] Received response');
      
      // Parse response body using TextDecoder
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const parsedResponse = this.parseBedrockResponse(responseBody);
      console.log('[Bedrock] Parsed response, groups:', parsedResponse.groups?.length);
      
      return this.validateResponse(parsedResponse);
    } catch (error) {
      console.error('[Bedrock] Error in groupTabs:', error.message, error);
      throw this.handleBedrockError(error);
    }
  }

  /**
   * Formats request payload for Bedrock API (optimized for speed)
   * @param {string} systemPrompt - System instructions
   * @param {string} tabData - Formatted tab metadata
   * @returns {Object} Bedrock request payload
   */
  formatBedrockRequest(systemPrompt, tabData) {
    return {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 2048, // Reduced for faster response
      temperature: 0.5, // Lower temperature for faster, more focused responses
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${tabData}\n\nGroup these tabs (JSON only):`
        }
      ]
    };
  }

  /**
   * Enhanced error handling for AWS SDK errors
   * @param {Error} error - The error from AWS SDK
   * @returns {Error} Enhanced error with user-friendly message
   */
  handleBedrockError(error) {
    // AWS SDK provides structured error information
    const errorCode = error.name || error.code;
    const errorMessage = error.message || 'Unknown error';
    
    console.error('[Bedrock] Error details:', {
      name: error.name,
      code: errorCode,
      message: errorMessage,
      statusCode: error.$metadata?.httpStatusCode
    });
    
    // Handle specific AWS SDK error types
    if (errorCode === 'UnrecognizedClientException' || errorCode === 'InvalidSignatureException') {
      return new Error('Invalid AWS credentials. Please check your Access Key and Secret Key are correct.');
    }
    
    if (errorCode === 'AccessDeniedException') {
      return new Error('AWS credentials lack Bedrock permissions. Add the "bedrock:InvokeModel" IAM permission.');
    }
    
    if (errorCode === 'ResourceNotFoundException') {
      return new Error(`Bedrock not available in selected region "${this.region}". Try us-east-1, us-west-2, or eu-west-1.`);
    }
    
    if (errorCode === 'ThrottlingException') {
      return new Error('Rate limit exceeded. Please wait a moment before trying again.');
    }
    
    if (errorCode === 'ValidationException') {
      return new Error(`Invalid request: ${errorMessage}`);
    }
    
    // Network errors
    if (error.name === 'NetworkingError' || error.code === 'ENOTFOUND') {
      return new Error('Network error: Unable to reach AWS Bedrock. Check your internet connection.');
    }
    
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return new Error('Request timed out: The API took too long to respond. Please try again.');
    }
    
    // Generic error with details
    return new Error(`Bedrock API error: ${errorMessage}`);
  }

  /**
   * Parses Bedrock response into standard format
   * @param {Object} response - Raw Bedrock response
   * @returns {Object} Parsed grouping result
   */
  parseBedrockResponse(response) {
    if (!response.content || !Array.isArray(response.content)) {
      throw new Error('INVALID_RESPONSE: Missing content array');
    }

    // Extract text from content blocks
    const textContent = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');

    if (!textContent) {
      throw new Error('INVALID_RESPONSE: No text content in response');
    }

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                     textContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('INVALID_RESPONSE: No JSON found in response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`INVALID_RESPONSE: Failed to parse JSON - ${error.message}`);
    }
  }


}

// Export BedrockProvider (CommonJS for tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports.BedrockProvider = BedrockProvider;
}

// ES6 export for browser extension
export { BedrockProvider };


/**
 * Google Gemini Provider implementation
 * Uses Gemini REST API for tab grouping
 */
class GeminiProvider extends LLMProvider {
  /**
   * @param {string} apiKey - Google Gemini API key
   * @param {string} model - Gemini model name (default: 'gemini-3-pro-preview')
   */
  constructor(apiKey, model = 'gemini-3-pro-preview') {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  }

  /**
   * Groups tabs using Google Gemini
   * @param {Array} tabMetadata - Array of tab metadata objects
   * @param {string} customPrompt - Optional custom user prompt
   * @returns {Promise<Object>} Grouping result
   */
  async groupTabs(tabMetadata, customPrompt = '') {
    try {
      const systemPrompt = this.buildSystemPrompt(customPrompt);
      const formattedTabs = this.formatTabMetadata(tabMetadata);
      
      const requestPayload = this.formatGeminiRequest(systemPrompt, formattedTabs);
      const response = await this.invokeGeminiAPI(requestPayload);
      const parsedResponse = this.parseGeminiResponse(response);
      
      return this.validateResponse(parsedResponse);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Formats request payload for Gemini API
   * @param {string} systemPrompt - System instructions
   * @param {string} tabData - Formatted tab metadata
   * @returns {Object} Gemini request payload
   */
  formatGeminiRequest(systemPrompt, tabData) {
    return {
      contents: [
        {
          parts: [
            {
              text: `${systemPrompt}\n\nHere are the tabs to analyze:\n\n${tabData}\n\nPlease group these tabs and respond with JSON only.`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 0.95,
        topK: 40
      }
    };
  }

  /**
   * Invokes Gemini API
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} API response
   */
  async invokeGeminiAPI(payload) {
    const url = `${this.endpoint}?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('UNAUTHORIZED');
      } else if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      } else if (response.status === 400) {
        const errorMessage = errorData.error?.message || 'Bad request';
        throw new Error(`Gemini API error: ${errorMessage}`);
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Parses Gemini response into standard format
   * @param {Object} response - Raw Gemini response
   * @returns {Object} Parsed grouping result
   */
  parseGeminiResponse(response) {
    if (!response.candidates || !Array.isArray(response.candidates) || response.candidates.length === 0) {
      throw new Error('INVALID_RESPONSE: No candidates in response');
    }

    const candidate = response.candidates[0];
    
    if (!candidate.content || !candidate.content.parts || !Array.isArray(candidate.content.parts)) {
      throw new Error('INVALID_RESPONSE: Invalid candidate structure');
    }

    // Extract text from parts
    const textContent = candidate.content.parts
      .filter(part => part.text)
      .map(part => part.text)
      .join('');

    if (!textContent) {
      throw new Error('INVALID_RESPONSE: No text content in response');
    }

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                     textContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('INVALID_RESPONSE: No JSON found in response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`INVALID_RESPONSE: Failed to parse JSON - ${error.message}`);
    }
  }
}

// Export GeminiProvider (CommonJS for tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports.GeminiProvider = GeminiProvider;
}

// ES6 export for browser extension
export { GeminiProvider };


/**
 * Local LLM Provider implementation
 * Uses OpenAI-compatible API format (Ollama, LM Studio, LocalAI, etc.)
 */
class LocalLLMProvider extends LLMProvider {
  /**
   * @param {string} endpoint - Local LLM endpoint URL
   * @param {string} apiKey - Optional API key for secured servers
   * @param {string} model - Model name (default: 'llama2')
   */
  constructor(endpoint, apiKey = '', model = 'llama2') {
    super();
    this.endpoint = endpoint;
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Groups tabs using Local LLM
   * @param {Array} tabMetadata - Array of tab metadata objects
   * @param {string} customPrompt - Optional custom user prompt
   * @returns {Promise<Object>} Grouping result
   */
  async groupTabs(tabMetadata, customPrompt = '') {
    try {
      // Validate endpoint connectivity first
      await this.validateEndpoint();
      
      const systemPrompt = this.buildSystemPrompt(customPrompt);
      const formattedTabs = this.formatTabMetadata(tabMetadata);
      
      const requestPayload = this.formatLocalLLMRequest(systemPrompt, formattedTabs);
      const response = await this.invokeLocalLLM(requestPayload);
      const parsedResponse = this.parseLocalLLMResponse(response);
      
      return this.validateResponse(parsedResponse);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validates that the endpoint is reachable and uses HTTPS
   * @returns {Promise<void>}
   */
  async validateEndpoint() {
    try {
      // Validate HTTPS (allow localhost for development)
      const urlObj = new URL(this.endpoint);
      const isLocalhost = urlObj.hostname === 'localhost' || 
                         urlObj.hostname === '127.0.0.1' ||
                         urlObj.hostname === '[::1]';
      
      if (!isLocalhost && urlObj.protocol !== 'https:') {
        throw new Error('Only HTTPS connections are allowed for security. Use https:// instead of http://');
      }
      
      // Try to reach the endpoint with a simple request
      const response = await fetch(this.endpoint, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      // Accept any response that's not a network error
      if (!response.ok && response.status >= 500) {
        throw new Error('ECONNREFUSED');
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('ETIMEDOUT');
      }
      throw error;
    }
  }

  /**
   * Formats request payload for OpenAI-compatible API
   * @param {string} systemPrompt - System instructions
   * @param {string} tabData - Formatted tab metadata
   * @returns {Object} Request payload
   */
  formatLocalLLMRequest(systemPrompt, tabData) {
    return {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Here are the tabs to analyze:\n\n${tabData}\n\nPlease group these tabs and respond with JSON only.`
        }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      stream: false
    };
  }

  /**
   * Invokes Local LLM API
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} API response
   */
  async invokeLocalLLM(payload) {
    const headers = {
      'Content-Type': 'application/json'
    };

    // Add API key if provided
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('UNAUTHORIZED');
      } else if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      } else if (response.status === 404) {
        throw new Error('Endpoint not found. Please check your Local LLM configuration.');
      }
      
      throw new Error(`Local LLM API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Parses Local LLM response into standard format
   * @param {Object} response - Raw API response
   * @returns {Object} Parsed grouping result
   */
  parseLocalLLMResponse(response) {
    // OpenAI-compatible format
    if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
      throw new Error('INVALID_RESPONSE: No choices in response');
    }

    const choice = response.choices[0];
    
    if (!choice.message || !choice.message.content) {
      throw new Error('INVALID_RESPONSE: No message content in response');
    }

    const textContent = choice.message.content;

    // Extract JSON from response (may be wrapped in markdown code blocks)
    const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                     textContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error('INVALID_RESPONSE: No JSON found in response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    
    try {
      return JSON.parse(jsonText);
    } catch (error) {
      throw new Error(`INVALID_RESPONSE: Failed to parse JSON - ${error.message}`);
    }
  }
}

// Export LocalLLMProvider (CommonJS for tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports.LocalLLMProvider = LocalLLMProvider;
}

// ES6 export for browser extension
export { LocalLLMProvider };
