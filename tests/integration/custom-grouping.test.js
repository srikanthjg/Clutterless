import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Integration Test: Custom Prompt Grouping Flow
 * 
 * Tests the end-to-end flow of custom prompt-based tab grouping:
 * 1. Open tabs with known content
 * 2. Provide specific grouping instructions
 * 3. Verify groups match user intent
 * 4. Test with ambiguous prompts
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

describe('Custom Prompt Grouping Integration Tests', () => {
  let mockChrome;
  let mockTabs;
  let createdGroups;
  let groupedTabs;

  beforeEach(() => {
    // Reset state
    createdGroups = [];
    groupedTabs = new Map();

    // Reset global fetch mock to a spy
    global.fetch = vi.fn();

    // Set up mock tabs with known content for testing
    mockTabs = [
      { id: 1, index: 0, title: 'React Documentation', url: 'https://react.dev/', windowId: 1 },
      { id: 2, index: 1, title: 'Vue.js Guide', url: 'https://vuejs.org/guide/', windowId: 1 },
      { id: 3, index: 2, title: 'Angular Tutorial', url: 'https://angular.io/tutorial', windowId: 1 },
      { id: 4, index: 3, title: 'Python Tutorial', url: 'https://docs.python.org/3/tutorial/', windowId: 1 },
      { id: 5, index: 4, title: 'Java Documentation', url: 'https://docs.oracle.com/javase/', windowId: 1 },
      { id: 6, index: 5, title: 'Go by Example', url: 'https://gobyexample.com/', windowId: 1 },
      { id: 7, index: 6, title: 'Amazon Shopping', url: 'https://www.amazon.com/', windowId: 1 },
      { id: 8, index: 7, title: 'Netflix', url: 'https://www.netflix.com/', windowId: 1 }
    ];

    // Mock Chrome APIs
    mockChrome = {
      tabs: {
        query: vi.fn().mockResolvedValue(mockTabs),
        group: vi.fn().mockImplementation(({ tabIds }) => {
          const groupId = createdGroups.length + 1;
          tabIds.forEach(tabId => groupedTabs.set(tabId, groupId));
          return Promise.resolve(groupId);
        }),
        sendMessage: vi.fn().mockImplementation((tabId) => {
          const tab = mockTabs.find(t => t.id === tabId);
          if (tab) {
            return Promise.resolve({
              title: tab.title,
              url: tab.url,
              contentPreview: `Content preview for ${tab.title}`
            });
          }
          return Promise.reject(new Error('Tab not found'));
        })
      },
      tabGroups: {
        update: vi.fn().mockImplementation((groupId, { title, color }) => {
          const group = createdGroups.find(g => g.id === groupId);
          if (group) {
            group.title = title;
            group.color = color;
          } else {
            createdGroups.push({ id: groupId, title, color });
          }
          return Promise.resolve();
        })
      },
      storage: {
        local: {
          get: vi.fn().mockImplementation((keys) => {
            const result = {};
            if (keys === 'llm_config' || (Array.isArray(keys) && keys.includes('llm_config'))) {
              result.llm_config = {
                provider: 'gemini',
                configured: true
              };
            }
            if (keys === 'llm_credentials' || (Array.isArray(keys) && keys.includes('llm_credentials'))) {
              result.llm_credentials = {
                provider: 'gemini',
                credentials: { apiKey: 'test-api-key' },
                timestamp: Date.now()
              };
            }
            return Promise.resolve(result);
          }),
          set: vi.fn().mockResolvedValue()
        }
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue([
          { result: { title: 'Test', url: 'https://test.com', contentPreview: 'Test content' } }
        ])
      },
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn()
        }
      }
    };

    global.chrome = mockChrome;
  });

  it('should group tabs according to specific user instructions', async () => {
    const { handleCustomGroup } = await import('../../background/background.js');

    const customPrompt = 'Group by programming language: Frontend frameworks, Backend languages, and Entertainment';

    // Mock LLM response that follows user instructions
    const mockLLMResponse = {
      groups: [
        {
          name: 'Frontend Frameworks',
          tabIndices: [0, 1, 2], // React, Vue, Angular
          reasoning: 'JavaScript frontend frameworks'
        },
        {
          name: 'Backend Languages',
          tabIndices: [3, 4, 5], // Python, Java, Go
          reasoning: 'Backend programming languages'
        },
        {
          name: 'Entertainment',
          tabIndices: [6, 7], // Amazon, Netflix
          reasoning: 'Shopping and streaming services'
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockLLMResponse) }]
          }
        }]
      })
    });

    const result = await handleCustomGroup(customPrompt);

    // Verify success
    expect(result.success).toBe(true);
    expect(result.data.groupsCreated).toBe(3);

    // Verify groups match user intent
    expect(createdGroups.map(g => g.title)).toEqual([
      'Frontend Frameworks',
      'Backend Languages',
      'Entertainment'
    ]);

    // Verify correct tabs were grouped
    expect(groupedTabs.get(1)).toBe(1); // React
    expect(groupedTabs.get(2)).toBe(1); // Vue
    expect(groupedTabs.get(3)).toBe(1); // Angular
    expect(groupedTabs.get(4)).toBe(2); // Python
    expect(groupedTabs.get(5)).toBe(2); // Java
    expect(groupedTabs.get(6)).toBe(2); // Go
    expect(groupedTabs.get(7)).toBe(3); // Amazon
    expect(groupedTabs.get(8)).toBe(3); // Netflix
  });

  it('should include custom prompt in LLM request', async () => {
    const { handleCustomGroup } = await import('../../background/background.js');

    const customPrompt = 'Create exactly 2 groups: Work and Personal';

    const mockLLMResponse = {
      groups: [
        { name: 'Work', tabIndices: [0, 1, 2, 3, 4, 5], reasoning: 'Work-related tabs' },
        { name: 'Personal', tabIndices: [6, 7], reasoning: 'Personal tabs' }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockLLMResponse) }]
          }
        }]
      })
    });

    await handleCustomGroup(customPrompt);

    // Verify fetch was called with custom prompt
    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = global.fetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    
    // Verify custom prompt is included in the request
    expect(requestBody.contents[0].parts[0].text).toContain(customPrompt);
  });

  it('should handle ambiguous prompts with LLM interpretation', async () => {
    const { handleCustomGroup } = await import('../../background/background.js');

    const ambiguousPrompt = 'Group these somehow';

    // LLM interprets ambiguous prompt and creates reasonable groups
    const mockLLMResponse = {
      groups: [
        {
          name: 'Documentation',
          tabIndices: [0, 1, 2, 3, 4, 5],
          reasoning: 'Technical documentation and tutorials'
        },
        {
          name: 'Other',
          tabIndices: [6, 7],
          reasoning: 'Non-technical websites'
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockLLMResponse) }]
          }
        }]
      })
    });

    const result = await handleCustomGroup(ambiguousPrompt);

    // Verify LLM still creates groups despite ambiguous prompt
    expect(result.success).toBe(true);
    expect(result.data.groupsCreated).toBeGreaterThan(0);
    expect(createdGroups.length).toBeGreaterThan(0);
  });

  it('should reject empty custom prompts', async () => {
    const { handleCustomGroup } = await import('../../background/background.js');

    const emptyPrompt = '';

    const result = await handleCustomGroup(emptyPrompt);

    // Verify validation error
    expect(result.success).toBe(false);
    expect(result.message).toContain('grouping instructions');

    // Verify no groups were created
    expect(createdGroups.length).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should show summary of created groups after custom grouping', async () => {
    const { handleCustomGroup } = await import('../../background/background.js');

    const customPrompt = 'Group by technology type';

    const mockLLMResponse = {
      groups: [
        { name: 'Frontend', tabIndices: [0, 1, 2], reasoning: 'Frontend frameworks' },
        { name: 'Backend', tabIndices: [3, 4, 5], reasoning: 'Backend languages' }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockLLMResponse) }]
          }
        }]
      })
    });

    const result = await handleCustomGroup(customPrompt);

    // Verify summary information is included
    expect(result.success).toBe(true);
    expect(result.data.groupsCreated).toBe(2);
    expect(result.message).toBeDefined();
    expect(result.message).toContain('2');
  });

  it('should handle complex multi-criteria custom prompts', async () => {
    const { handleCustomGroup } = await import('../../background/background.js');

    const complexPrompt = 'Group by: 1) Programming language type (compiled vs interpreted), 2) Purpose (learning vs entertainment)';

    const mockLLMResponse = {
      groups: [
        {
          name: 'Compiled Languages',
          tabIndices: [4, 5], // Java, Go
          reasoning: 'Compiled programming languages'
        },
        {
          name: 'Interpreted Languages',
          tabIndices: [0, 1, 2, 3], // React, Vue, Angular, Python
          reasoning: 'Interpreted languages and frameworks'
        },
        {
          name: 'Entertainment',
          tabIndices: [6, 7], // Amazon, Netflix
          reasoning: 'Non-learning content'
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify(mockLLMResponse) }]
          }
        }]
      })
    });

    const result = await handleCustomGroup(complexPrompt);

    // Verify LLM handles complex criteria
    expect(result.success).toBe(true);
    expect(result.data.groupsCreated).toBe(3);
    expect(createdGroups.length).toBe(3);
  });

  it('should handle whitespace-only prompts as invalid', async () => {
    const { handleCustomGroup } = await import('../../background/background.js');

    const whitespacePrompt = '   \n\t  ';

    const result = await handleCustomGroup(whitespacePrompt);

    // Verify validation error
    expect(result.success).toBe(false);
    expect(result.message).toBeDefined();

    // Verify no API call was made
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
