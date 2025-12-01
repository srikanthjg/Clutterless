import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LLMProvider, BedrockProvider, GeminiProvider, LocalLLMProvider } from './llm-provider.js';

describe('LLMProvider Base Class', () => {
  let provider;

  beforeEach(() => {
    provider = new LLMProvider();
  });

  describe('groupTabs', () => {
    it('should throw error when not implemented', async () => {
      await expect(provider.groupTabs([])).rejects.toThrow('groupTabs() must be implemented by subclass');
    });
  });

  describe('validateResponse', () => {
    it('should validate correct response format', () => {
      const validResponse = {
        groups: [
          {
            name: 'Work',
            tabIndices: [0, 1, 2],
            reasoning: 'Work-related tabs'
          }
        ]
      };

      expect(() => provider.validateResponse(validResponse)).not.toThrow();
    });

    it('should throw error for non-object response', () => {
      expect(() => provider.validateResponse(null)).toThrow('Invalid response: must be an object');
      expect(() => provider.validateResponse('string')).toThrow('Invalid response: must be an object');
    });

    it('should throw error for missing groups array', () => {
      expect(() => provider.validateResponse({})).toThrow('Invalid response: groups must be an array');
    });

    it('should throw error for group without name', () => {
      const invalidResponse = {
        groups: [{ tabIndices: [0, 1] }]
      };
      expect(() => provider.validateResponse(invalidResponse)).toThrow('name is required and must be a string');
    });

    it('should throw error for group without tabIndices', () => {
      const invalidResponse = {
        groups: [{ name: 'Work' }]
      };
      expect(() => provider.validateResponse(invalidResponse)).toThrow('tabIndices must be an array');
    });

    it('should throw error for non-numeric tabIndices', () => {
      const invalidResponse = {
        groups: [{ name: 'Work', tabIndices: ['0', '1'] }]
      };
      expect(() => provider.validateResponse(invalidResponse)).toThrow('all tabIndices must be numbers');
    });
  });

  describe('handleError', () => {
    it('should map network errors to user-friendly messages', () => {
      const error = new Error('ENOTFOUND');
      const handled = provider.handleError(error);
      expect(handled.message).toContain('Network error');
    });

    it('should map timeout errors', () => {
      const error = new Error('ETIMEDOUT');
      const handled = provider.handleError(error);
      expect(handled.message).toContain('Request timed out');
    });

    it('should map authentication errors', () => {
      const error = new Error('UNAUTHORIZED');
      const handled = provider.handleError(error);
      expect(handled.message).toContain('Authentication failed');
    });

    it('should preserve original error', () => {
      const error = new Error('Original error');
      const handled = provider.handleError(error);
      expect(handled.originalError).toBe(error);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should build prompt without custom instructions', () => {
      const prompt = provider.buildSystemPrompt();
      expect(prompt).toContain('Group browser tabs');
      expect(prompt).toContain('2-7 groups');
      expect(prompt).toContain('JSON only');
    });

    it('should include custom prompt when provided', () => {
      const customPrompt = 'Group by project type';
      const prompt = provider.buildSystemPrompt(customPrompt);
      expect(prompt).toContain('User instructions');
      expect(prompt).toContain('Group by project type');
    });

    it('should specify JSON-only response requirement', () => {
      const prompt = provider.buildSystemPrompt();
      expect(prompt).toContain('JSON only');
      expect(prompt).toContain('"groups"');
    });

    it('should include detailed grouping rules', () => {
      const prompt = provider.buildSystemPrompt();
      expect(prompt).toContain('topic, domain, or purpose');
      expect(prompt).toContain('Short group names');
      expect(prompt).toContain('tab index numbers');
    });

    it('should specify required JSON structure', () => {
      const prompt = provider.buildSystemPrompt();
      expect(prompt).toContain('"name"');
      expect(prompt).toContain('"tabIndices"');
      expect(prompt).toContain('"reasoning"');
    });
  });

  describe('formatTabMetadata', () => {
    it('should format tab metadata correctly', () => {
      const tabs = [
        { title: 'Google', url: 'https://google.com' },
        { title: 'GitHub', url: 'https://github.com' }
      ];

      const formatted = provider.formatTabMetadata(tabs);
      expect(formatted).toContain('Tabs (2 total)');
      expect(formatted).toContain('0. Google [google.com]');
      expect(formatted).toContain('1. GitHub [github.com]');
    });

    it('should handle missing content preview', () => {
      const tabs = [{ title: 'Test', url: 'https://test.com' }];
      const formatted = provider.formatTabMetadata(tabs);
      expect(formatted).toContain('0. Test [test.com]');
    });

    it('should truncate long titles to 100 characters', () => {
      const longTitle = 'a'.repeat(150);
      const tabs = [{ title: longTitle, url: 'https://test.com' }];
      const formatted = provider.formatTabMetadata(tabs);
      
      // Title should be truncated to 100 chars
      const titleMatch = formatted.match(/0\. (.+?) \[/);
      expect(titleMatch[1].length).toBeLessThanOrEqual(100);
    });

    it('should extract domain from URL', () => {
      const tabs = [
        { 
          title: 'Test Page', 
          url: 'https://test.com/path/to/page?param=value'
        }
      ];
      const formatted = provider.formatTabMetadata(tabs);
      
      expect(formatted).toContain('[test.com]');
      expect(formatted).not.toContain('/path/to/page');
    });

    it('should handle missing title and URL gracefully', () => {
      const tabs = [{}];
      const formatted = provider.formatTabMetadata(tabs);
      
      expect(formatted).toContain('0. Untitled []');
    });

    it('should include total tab count', () => {
      const tabs = [
        { title: 'Tab 1', url: 'https://test1.com' },
        { title: 'Tab 2', url: 'https://test2.com' },
        { title: 'Tab 3', url: 'https://test3.com' }
      ];
      const formatted = provider.formatTabMetadata(tabs);
      
      expect(formatted).toContain('Tabs (3 total)');
    });
  });
});

describe('BedrockProvider', () => {
  let provider;
  let fetchMock;
  let originalCrypto;

  beforeEach(() => {
    provider = new BedrockProvider('test-key', 'test-secret', 'us-east-1');
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    
    // Store original crypto and mock it
    originalCrypto = global.crypto;
    Object.defineProperty(global, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn(),
          importKey: vi.fn(),
          sign: vi.fn()
        }
      },
      writable: true,
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original crypto
    Object.defineProperty(global, 'crypto', {
      value: originalCrypto,
      writable: true,
      configurable: true
    });
  });

  describe('formatBedrockRequest', () => {
    it('should format request with correct structure', () => {
      const request = provider.formatBedrockRequest('system prompt', 'tab data');
      
      expect(request).toHaveProperty('anthropic_version', 'bedrock-2023-05-31');
      expect(request).toHaveProperty('max_tokens', 2048);
      expect(request).toHaveProperty('temperature', 0.5);
      expect(request).toHaveProperty('system', 'system prompt');
      expect(request.messages).toHaveLength(1);
      expect(request.messages[0].role).toBe('user');
      expect(request.messages[0].content).toContain('tab data');
    });
  });

  describe('parseBedrockResponse', () => {
    it('should parse valid JSON response', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '```json\n{"groups": [{"name": "Work", "tabIndices": [0, 1]}]}\n```'
          }
        ]
      };

      const parsed = provider.parseBedrockResponse(response);
      expect(parsed.groups).toHaveLength(1);
      expect(parsed.groups[0].name).toBe('Work');
    });

    it('should parse JSON without code blocks', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: '{"groups": [{"name": "Work", "tabIndices": [0, 1]}]}'
          }
        ]
      };

      const parsed = provider.parseBedrockResponse(response);
      expect(parsed.groups).toHaveLength(1);
    });

    it('should throw error for missing content', () => {
      expect(() => provider.parseBedrockResponse({})).toThrow('INVALID_RESPONSE');
    });

    it('should throw error for invalid JSON', () => {
      const response = {
        content: [{ type: 'text', text: 'not json' }]
      };
      expect(() => provider.parseBedrockResponse(response)).toThrow('INVALID_RESPONSE');
    });
  });

  describe('invokeBedrockModel', () => {
    it('should handle 401 unauthorized error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      await expect(provider.invokeBedrockModel({})).rejects.toThrow('UNAUTHORIZED');
    });

    it('should handle 429 rate limit error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      });

      await expect(provider.invokeBedrockModel({})).rejects.toThrow('RATE_LIMIT');
    });

    it('should handle successful response', async () => {
      const mockResponse = { content: [{ type: 'text', text: 'response' }] };
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.invokeBedrockModel({});
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('GeminiProvider', () => {
  let provider;
  let fetchMock;

  beforeEach(() => {
    provider = new GeminiProvider('test-api-key');
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatGeminiRequest', () => {
    it('should format request with correct structure', () => {
      const request = provider.formatGeminiRequest('system prompt', 'tab data');
      
      expect(request.contents).toHaveLength(1);
      expect(request.contents[0].parts).toHaveLength(1);
      expect(request.contents[0].parts[0].text).toContain('system prompt');
      expect(request.contents[0].parts[0].text).toContain('tab data');
      expect(request.generationConfig).toHaveProperty('temperature', 0.7);
      expect(request.generationConfig).toHaveProperty('maxOutputTokens', 4096);
    });
  });

  describe('parseGeminiResponse', () => {
    it('should parse valid JSON response', () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '```json\n{"groups": [{"name": "Work", "tabIndices": [0, 1]}]}\n```'
                }
              ]
            }
          }
        ]
      };

      const parsed = provider.parseGeminiResponse(response);
      expect(parsed.groups).toHaveLength(1);
      expect(parsed.groups[0].name).toBe('Work');
    });

    it('should parse JSON without code blocks', () => {
      const response = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: '{"groups": [{"name": "Work", "tabIndices": [0, 1]}]}'
                }
              ]
            }
          }
        ]
      };

      const parsed = provider.parseGeminiResponse(response);
      expect(parsed.groups).toHaveLength(1);
    });

    it('should throw error for missing candidates', () => {
      expect(() => provider.parseGeminiResponse({})).toThrow('INVALID_RESPONSE');
    });

    it('should throw error for invalid structure', () => {
      const response = { candidates: [{}] };
      expect(() => provider.parseGeminiResponse(response)).toThrow('INVALID_RESPONSE');
    });
  });

  describe('invokeGeminiAPI', () => {
    it('should handle 401 unauthorized error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid API key' } })
      });

      await expect(provider.invokeGeminiAPI({})).rejects.toThrow('UNAUTHORIZED');
    });

    it('should handle 429 rate limit error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit' } })
      });

      await expect(provider.invokeGeminiAPI({})).rejects.toThrow('RATE_LIMIT');
    });

    it('should handle 400 bad request error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Bad request' } })
      });

      await expect(provider.invokeGeminiAPI({})).rejects.toThrow('Bad request');
    });

    it('should handle successful response', async () => {
      const mockResponse = { candidates: [] };
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.invokeGeminiAPI({});
      expect(result).toEqual(mockResponse);
    });
  });
});

describe('LocalLLMProvider', () => {
  let provider;
  let fetchMock;

  beforeEach(() => {
    provider = new LocalLLMProvider('http://localhost:11434/v1/chat/completions', '', 'llama2');
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    global.AbortSignal = {
      timeout: vi.fn(() => ({}))
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('formatLocalLLMRequest', () => {
    it('should format request with correct structure', () => {
      const request = provider.formatLocalLLMRequest('system prompt', 'tab data');
      
      expect(request).toHaveProperty('model', 'llama2');
      expect(request.messages).toHaveLength(2);
      expect(request.messages[0].role).toBe('system');
      expect(request.messages[0].content).toBe('system prompt');
      expect(request.messages[1].role).toBe('user');
      expect(request.messages[1].content).toContain('tab data');
      expect(request).toHaveProperty('temperature', 0.7);
      expect(request).toHaveProperty('stream', false);
    });
  });

  describe('parseLocalLLMResponse', () => {
    it('should parse valid JSON response', () => {
      const response = {
        choices: [
          {
            message: {
              content: '```json\n{"groups": [{"name": "Work", "tabIndices": [0, 1]}]}\n```'
            }
          }
        ]
      };

      const parsed = provider.parseLocalLLMResponse(response);
      expect(parsed.groups).toHaveLength(1);
      expect(parsed.groups[0].name).toBe('Work');
    });

    it('should parse JSON without code blocks', () => {
      const response = {
        choices: [
          {
            message: {
              content: '{"groups": [{"name": "Work", "tabIndices": [0, 1]}]}'
            }
          }
        ]
      };

      const parsed = provider.parseLocalLLMResponse(response);
      expect(parsed.groups).toHaveLength(1);
    });

    it('should throw error for missing choices', () => {
      expect(() => provider.parseLocalLLMResponse({})).toThrow('INVALID_RESPONSE');
    });

    it('should throw error for missing message content', () => {
      const response = { choices: [{}] };
      expect(() => provider.parseLocalLLMResponse(response)).toThrow('INVALID_RESPONSE');
    });
  });

  describe('invokeLocalLLM', () => {
    it('should include API key in headers when provided', async () => {
      const providerWithKey = new LocalLLMProvider('http://localhost:11434/v1/chat/completions', 'test-key');
      providerWithKey.validateEndpoint = vi.fn();
      
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] })
      });

      await providerWithKey.invokeLocalLLM({});
      
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key'
          })
        })
      );
    });

    it('should handle 401 unauthorized error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized' } })
      });

      await expect(provider.invokeLocalLLM({})).rejects.toThrow('UNAUTHORIZED');
    });

    it('should handle 404 not found error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({})
      });

      await expect(provider.invokeLocalLLM({})).rejects.toThrow('Endpoint not found');
    });

    it('should handle successful response', async () => {
      const mockResponse = { choices: [] };
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await provider.invokeLocalLLM({});
      expect(result).toEqual(mockResponse);
    });
  });

  describe('validateEndpoint', () => {
    it('should succeed for reachable endpoint', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200
      });

      await expect(provider.validateEndpoint()).resolves.not.toThrow();
    });

    it('should throw ECONNREFUSED for 500+ errors', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(provider.validateEndpoint()).rejects.toThrow('ECONNREFUSED');
    });

    it('should throw ETIMEDOUT for timeout', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'AbortError';
      fetchMock.mockRejectedValue(timeoutError);

      await expect(provider.validateEndpoint()).rejects.toThrow('ETIMEDOUT');
    });
  });
});

describe('Prompt Engineering Tests', () => {
  describe('Work tabs scenario', () => {
    it('should format work-related tabs appropriately', () => {
      const provider = new LLMProvider();
      const workTabs = [
        { title: 'Gmail - Inbox', url: 'https://mail.google.com', contentPreview: 'Work emails and messages' },
        { title: 'Slack - Team Chat', url: 'https://app.slack.com', contentPreview: 'Team communication' },
        { title: 'Jira - Project Board', url: 'https://company.atlassian.net', contentPreview: 'Sprint planning' },
        { title: 'GitHub - Pull Requests', url: 'https://github.com/company/repo', contentPreview: 'Code reviews' }
      ];

      const formatted = provider.formatTabMetadata(workTabs);
      
      expect(formatted).toContain('Gmail - Inbox');
      expect(formatted).toContain('Slack - Team Chat');
      expect(formatted).toContain('Jira - Project Board');
      expect(formatted).toContain('GitHub - Pull Requests');
      expect(formatted).toContain('Tabs (4 total)');
    });
  });

  describe('Personal tabs scenario', () => {
    it('should format personal/entertainment tabs appropriately', () => {
      const provider = new LLMProvider();
      const personalTabs = [
        { title: 'Netflix', url: 'https://netflix.com', contentPreview: 'Watch movies and shows' },
        { title: 'Reddit - r/programming', url: 'https://reddit.com/r/programming', contentPreview: 'Programming discussions' },
        { title: 'YouTube', url: 'https://youtube.com', contentPreview: 'Video content' },
        { title: 'Twitter', url: 'https://twitter.com', contentPreview: 'Social media feed' }
      ];

      const formatted = provider.formatTabMetadata(personalTabs);
      
      expect(formatted).toContain('Netflix');
      expect(formatted).toContain('Reddit');
      expect(formatted).toContain('YouTube');
      expect(formatted).toContain('Twitter');
    });
  });

  describe('Research tabs scenario', () => {
    it('should format research/documentation tabs appropriately', () => {
      const provider = new LLMProvider();
      const researchTabs = [
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', contentPreview: 'JavaScript documentation' },
        { title: 'Stack Overflow', url: 'https://stackoverflow.com', contentPreview: 'Programming Q&A' },
        { title: 'AWS Documentation', url: 'https://docs.aws.amazon.com', contentPreview: 'Cloud services guide' },
        { title: 'Research Paper - arXiv', url: 'https://arxiv.org/abs/123', contentPreview: 'Machine learning paper' }
      ];

      const formatted = provider.formatTabMetadata(researchTabs);
      
      expect(formatted).toContain('MDN Web Docs');
      expect(formatted).toContain('Stack Overflow');
      expect(formatted).toContain('AWS Documentation');
      expect(formatted).toContain('Research Paper');
    });
  });

  describe('Custom prompt scenarios', () => {
    it('should include custom prompt for project-based grouping', () => {
      const provider = new LLMProvider();
      const customPrompt = 'Group tabs by project: Project A (work), Project B (personal), Project C (research)';
      const prompt = provider.buildSystemPrompt(customPrompt);
      
      expect(prompt).toContain('User instructions');
      expect(prompt).toContain('Project A');
      expect(prompt).toContain('Project B');
      expect(prompt).toContain('Project C');
    });

    it('should include custom prompt for domain-based grouping', () => {
      const provider = new LLMProvider();
      const customPrompt = 'Group by domain: google.com tabs together, github.com tabs together';
      const prompt = provider.buildSystemPrompt(customPrompt);
      
      expect(prompt).toContain('google.com');
      expect(prompt).toContain('github.com');
    });

    it('should include custom prompt for time-based grouping', () => {
      const provider = new LLMProvider();
      const customPrompt = 'Group into: Morning reading, Afternoon work, Evening entertainment';
      const prompt = provider.buildSystemPrompt(customPrompt);
      
      expect(prompt).toContain('Morning reading');
      expect(prompt).toContain('Afternoon work');
      expect(prompt).toContain('Evening entertainment');
    });
  });

  describe('Mixed tab scenarios', () => {
    it('should handle tabs with various title lengths', () => {
      const provider = new LLMProvider();
      const mixedTabs = [
        { title: 'Short', url: 'https://short.com' },
        { title: 'Medium length title with some details', url: 'https://medium.com' },
        { title: 'a'.repeat(150), url: 'https://long.com' }
      ];

      const formatted = provider.formatTabMetadata(mixedTabs);
      
      expect(formatted).toContain('0. Short [short.com]');
      expect(formatted).toContain('1. Medium length title');
      expect(formatted).toContain('2.'); // Long title should be present
    });

    it('should extract domain from URLs with query parameters', () => {
      const provider = new LLMProvider();
      const tabs = [
        { title: 'Search', url: 'https://google.com/search?q=test&lang=en' },
        { title: 'Article', url: 'https://site.com/article?id=123&ref=home' }
      ];

      const formatted = provider.formatTabMetadata(tabs);
      
      expect(formatted).toContain('[google.com]');
      expect(formatted).toContain('[site.com]');
    });
  });
});

describe('Integration Tests', () => {
  describe('End-to-end grouping flow', () => {
    it('should successfully group tabs with BedrockProvider', async () => {
      const provider = new BedrockProvider('test-key', 'test-secret', 'us-east-1');
      
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              groups: [
                { name: 'Work', tabIndices: [0, 1], reasoning: 'Work tabs' },
                { name: 'Personal', tabIndices: [2], reasoning: 'Personal tabs' }
              ]
            })
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const originalCrypto = global.crypto;
      Object.defineProperty(global, 'crypto', {
        value: {
          subtle: {
            digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
            importKey: vi.fn().mockResolvedValue({}),
            sign: vi.fn().mockResolvedValue(new ArrayBuffer(32))
          }
        },
        writable: true,
        configurable: true
      });

      const tabs = [
        { title: 'Email', url: 'https://mail.google.com', contentPreview: 'Inbox' },
        { title: 'Calendar', url: 'https://calendar.google.com', contentPreview: 'Events' },
        { title: 'Facebook', url: 'https://facebook.com', contentPreview: 'Social' }
      ];

      const result = await provider.groupTabs(tabs);
      
      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].name).toBe('Work');
      expect(result.groups[1].name).toBe('Personal');
      
      // Restore original crypto
      Object.defineProperty(global, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true
      });
    });

    it('should successfully group tabs with GeminiProvider', async () => {
      const provider = new GeminiProvider('test-api-key');
      
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    groups: [
                      { name: 'Development', tabIndices: [0, 1], reasoning: 'Dev tools' },
                      { name: 'Documentation', tabIndices: [2], reasoning: 'Docs' }
                    ]
                  })
                }
              ]
            }
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const tabs = [
        { title: 'GitHub', url: 'https://github.com', contentPreview: 'Code' },
        { title: 'VS Code', url: 'https://code.visualstudio.com', contentPreview: 'Editor' },
        { title: 'MDN', url: 'https://developer.mozilla.org', contentPreview: 'Docs' }
      ];

      const result = await provider.groupTabs(tabs);
      
      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].name).toBe('Development');
      expect(result.groups[1].name).toBe('Documentation');
    });

    it('should successfully group tabs with LocalLLMProvider', async () => {
      const provider = new LocalLLMProvider('http://localhost:11434/v1/chat/completions');
      provider.validateEndpoint = vi.fn(); // Skip endpoint validation
      
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                groups: [
                  { name: 'Shopping', tabIndices: [0, 1], reasoning: 'E-commerce sites' },
                  { name: 'News', tabIndices: [2], reasoning: 'News sites' }
                ]
              })
            }
          }
        ]
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const tabs = [
        { title: 'Amazon', url: 'https://amazon.com', contentPreview: 'Shopping' },
        { title: 'eBay', url: 'https://ebay.com', contentPreview: 'Auctions' },
        { title: 'CNN', url: 'https://cnn.com', contentPreview: 'News' }
      ];

      const result = await provider.groupTabs(tabs);
      
      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].name).toBe('Shopping');
      expect(result.groups[1].name).toBe('News');
    });

    it('should handle custom prompts with all providers', async () => {
      const customPrompt = 'Group by topic: technology, entertainment, shopping';
      
      // Test that custom prompt is included in the system prompt
      const provider = new LLMProvider();
      const systemPrompt = provider.buildSystemPrompt(customPrompt);
      
      expect(systemPrompt).toContain('User instructions');
      expect(systemPrompt).toContain('technology');
      expect(systemPrompt).toContain('entertainment');
      expect(systemPrompt).toContain('shopping');
    });
  });
});


describe('Security: HTTPS Validation for LocalLLMProvider', () => {
  let mockFetch;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject non-HTTPS endpoints for remote servers', async () => {
    const provider = new LocalLLMProvider('http://api.example.com/v1/chat');
    
    await expect(provider.validateEndpoint()).rejects.toThrow('Only HTTPS connections are allowed');
  });

  it('should accept HTTPS endpoints', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });

    const provider = new LocalLLMProvider('https://api.example.com/v1/chat');
    
    await expect(provider.validateEndpoint()).resolves.not.toThrow();
  });

  it('should allow HTTP for localhost', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });

    const provider = new LocalLLMProvider('http://localhost:11434/v1/chat');
    
    await expect(provider.validateEndpoint()).resolves.not.toThrow();
  });

  it('should allow HTTP for 127.0.0.1', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });

    const provider = new LocalLLMProvider('http://127.0.0.1:8080/api');
    
    await expect(provider.validateEndpoint()).resolves.not.toThrow();
  });

  it('should allow HTTP for IPv6 localhost [::1]', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });

    const provider = new LocalLLMProvider('http://[::1]:3000/api');
    
    await expect(provider.validateEndpoint()).resolves.not.toThrow();
  });

  it('should reject HTTP for non-localhost IP addresses', async () => {
    const provider = new LocalLLMProvider('http://192.168.1.100:8080/api');
    
    await expect(provider.validateEndpoint()).rejects.toThrow('Only HTTPS connections are allowed');
  });

  it('should reject HTTP for domain names', async () => {
    const provider = new LocalLLMProvider('http://myserver.local/api');
    
    await expect(provider.validateEndpoint()).rejects.toThrow('Only HTTPS connections are allowed');
  });

  it('should validate HTTPS before checking connectivity', async () => {
    // Even if fetch would succeed, HTTPS validation should fail first
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });

    const provider = new LocalLLMProvider('http://insecure-api.com/v1/chat');
    
    await expect(provider.validateEndpoint()).rejects.toThrow('Only HTTPS connections are allowed');
    
    // Fetch should not be called if HTTPS validation fails
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should handle network errors after HTTPS validation passes', async () => {
    mockFetch.mockRejectedValue(new Error('ECONNREFUSED'));

    const provider = new LocalLLMProvider('https://api.example.com/v1/chat');
    
    await expect(provider.validateEndpoint()).rejects.toThrow('ECONNREFUSED');
  });

  it('should handle timeout errors', async () => {
    mockFetch.mockRejectedValue({ name: 'AbortError' });

    const provider = new LocalLLMProvider('https://api.example.com/v1/chat');
    
    await expect(provider.validateEndpoint()).rejects.toThrow('ETIMEDOUT');
  });
});
