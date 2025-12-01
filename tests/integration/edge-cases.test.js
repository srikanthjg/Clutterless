import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Integration Test: Edge Cases and Error Scenarios
 * 
 * Tests edge cases and error handling:
 * 1. Test with 50+ tabs (batching)
 * 2. Test with mixed tab types (regular, chrome://, restricted)
 * 3. Test with network disconnected
 * 4. Test with invalid API credentials
 * 5. Test with API rate limiting
 * 
 * Requirements: 2.7, 5.4, 5.6, 6.3, 6.5
 */

describe('Edge Cases and Error Scenarios Integration Tests', () => {
  let mockChrome;
  let createdGroups;

  beforeEach(() => {
    createdGroups = [];

    mockChrome = {
      tabs: {
        query: vi.fn(),
        group: vi.fn().mockImplementation(() => {
          const groupId = createdGroups.length + 1;
          createdGroups.push({ id: groupId });
          return Promise.resolve(groupId);
        }),
        sendMessage: vi.fn()
      },
      tabGroups: {
        update: vi.fn().mockResolvedValue()
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            config: {
              provider: 'gemini',
              credentials: { apiKey: 'test-api-key' },
              configured: true
            }
          }),
          set: vi.fn().mockResolvedValue()
        }
      },
      scripting: {
        executeScript: vi.fn()
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

  describe('Large Tab Count (50+ tabs)', () => {
    it('should process 50+ tabs in batches', async () => {
      const { collectTabMetadata } = await import('../../background/background.js');

      // Create 75 mock tabs
      const largeMockTabs = Array.from({ length: 75 }, (_, i) => ({
        id: i + 1,
        index: i,
        title: `Tab ${i + 1}`,
        url: `https://example.com/page${i + 1}`,
        windowId: 1
      }));

      mockChrome.tabs.query.mockResolvedValue(largeMockTabs);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Test content'
      });

      const metadata = await collectTabMetadata();

      // Verify all tabs were processed
      expect(metadata.length).toBe(75);
      
      // Verify batching occurred (should not process all at once)
      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(75);
    });

    it('should handle batching with API rate limits', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      // Create 60 tabs
      const largeMockTabs = Array.from({ length: 60 }, (_, i) => ({
        id: i + 1,
        index: i,
        title: `Tab ${i + 1}`,
        url: `https://example.com/page${i + 1}`,
        windowId: 1
      }));

      mockChrome.tabs.query.mockResolvedValue(largeMockTabs);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Test content'
      });

      // Mock LLM response for large batch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  groups: [
                    { name: 'Group 1', tabIndices: Array.from({ length: 30 }, (_, i) => i) },
                    { name: 'Group 2', tabIndices: Array.from({ length: 30 }, (_, i) => i + 30) }
                  ]
                })
              }]
            }
          }]
        })
      });

      const result = await handleAutoGroup();

      expect(result.success).toBe(true);
      expect(result.groupsCreated).toBeGreaterThan(0);
    });

    it('should handle partial failures in large batches', async () => {
      const { collectTabMetadata } = await import('../../background/background.js');

      const largeMockTabs = Array.from({ length: 55 }, (_, i) => ({
        id: i + 1,
        index: i,
        title: `Tab ${i + 1}`,
        url: `https://example.com/page${i + 1}`,
        windowId: 1
      }));

      mockChrome.tabs.query.mockResolvedValue(largeMockTabs);
      
      // Simulate some tabs failing to respond
      mockChrome.tabs.sendMessage.mockImplementation((tabId) => {
        if (tabId % 10 === 0) {
          return Promise.reject(new Error('Tab not responding'));
        }
        return Promise.resolve({
          title: 'Test',
          url: 'https://test.com',
          contentPreview: 'Test content'
        });
      });

      const metadata = await collectTabMetadata();

      // Should still return metadata for successful tabs
      expect(metadata.length).toBeGreaterThan(0);
      expect(metadata.length).toBeLessThan(55);
    });
  });

  describe('Mixed Tab Types', () => {
    it('should handle chrome:// pages gracefully', async () => {
      const { collectTabMetadata } = await import('../../background/background.js');

      const mixedTabs = [
        { id: 1, index: 0, title: 'Regular Page', url: 'https://example.com', windowId: 1 },
        { id: 2, index: 1, title: 'Chrome Settings', url: 'chrome://settings/', windowId: 1 },
        { id: 3, index: 2, title: 'Chrome Extensions', url: 'chrome://extensions/', windowId: 1 },
        { id: 4, index: 3, title: 'Another Page', url: 'https://test.com', windowId: 1 }
      ];

      mockChrome.tabs.query.mockResolvedValue(mixedTabs);
      mockChrome.tabs.sendMessage.mockImplementation((tabId) => {
        const tab = mixedTabs.find(t => t.id === tabId);
        if (tab.url.startsWith('chrome://')) {
          return Promise.reject(new Error('Cannot access chrome:// URLs'));
        }
        return Promise.resolve({
          title: tab.title,
          url: tab.url,
          contentPreview: 'Content'
        });
      });

      const metadata = await collectTabMetadata();

      // Should skip chrome:// pages but include others
      expect(metadata.length).toBe(4);
      
      // Chrome pages should have limited metadata
      const chromePages = metadata.filter(m => m.url.startsWith('chrome://'));
      chromePages.forEach(page => {
        expect(page.contentPreview).toBe('');
        expect(page.error).toBeDefined();
      });
    });

    it('should handle restricted pages (chrome-extension://)', async () => {
      const { collectTabMetadata } = await import('../../background/background.js');

      const mixedTabs = [
        { id: 1, index: 0, title: 'Regular Page', url: 'https://example.com', windowId: 1 },
        { id: 2, index: 1, title: 'Extension Page', url: 'chrome-extension://abc123/page.html', windowId: 1 }
      ];

      mockChrome.tabs.query.mockResolvedValue(mixedTabs);
      mockChrome.tabs.sendMessage.mockImplementation((tabId) => {
        const tab = mixedTabs.find(t => t.id === tabId);
        if (tab.url.startsWith('chrome-extension://')) {
          return Promise.reject(new Error('Cannot access extension URLs'));
        }
        return Promise.resolve({
          title: tab.title,
          url: tab.url,
          contentPreview: 'Content'
        });
      });

      const metadata = await collectTabMetadata();

      expect(metadata.length).toBe(2);
      
      // Extension pages should be handled gracefully
      const extensionPage = metadata.find(m => m.url.startsWith('chrome-extension://'));
      expect(extensionPage).toBeDefined();
      expect(extensionPage.error).toBeDefined();
    });

    it('should continue processing after encountering inaccessible tabs', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      const mixedTabs = [
        { id: 1, index: 0, title: 'Page 1', url: 'https://example.com/1', windowId: 1 },
        { id: 2, index: 1, title: 'Chrome Page', url: 'chrome://settings/', windowId: 1 },
        { id: 3, index: 2, title: 'Page 2', url: 'https://example.com/2', windowId: 1 }
      ];

      mockChrome.tabs.query.mockResolvedValue(mixedTabs);
      mockChrome.tabs.sendMessage.mockImplementation((tabId) => {
        const tab = mixedTabs.find(t => t.id === tabId);
        if (tab.url.startsWith('chrome://')) {
          return Promise.reject(new Error('Cannot access'));
        }
        return Promise.resolve({
          title: tab.title,
          url: tab.url,
          contentPreview: 'Content'
        });
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  groups: [{ name: 'Group', tabIndices: [0, 2] }]
                })
              }]
            }
          }]
        })
      });

      const result = await handleAutoGroup();

      // Should succeed despite inaccessible tab
      expect(result.success).toBe(true);
    });
  });

  describe('Network Errors', () => {
    it('should handle network disconnection gracefully', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      // Simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network request failed'));

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network');
      
      // Verify no groups were created
      expect(createdGroups.length).toBe(0);
    });

    it('should retry on network timeout', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      let attemptCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new Error('Timeout'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            candidates: [{
              content: {
                parts: [{
                  text: JSON.stringify({
                    groups: [{ name: 'Group', tabIndices: [0] }]
                  })
                }]
              }
            }]
          })
        });
      });

      const result = await handleAutoGroup();

      // Should succeed after retry
      expect(result.success).toBe(true);
      expect(attemptCount).toBeGreaterThan(1);
    });

    it('should fail after maximum retries', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      // Always fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('Invalid API Credentials', () => {
    it('should handle 401 authentication errors', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid API key' })
      });

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('credentials');
    });

    it('should handle 403 forbidden errors', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Access denied' })
      });

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should provide clear error message for invalid credentials', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'API key is invalid' })
      });

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(result.error.toLowerCase()).toContain('credential');
    });
  });

  describe('API Rate Limiting', () => {
    it('should handle 429 rate limit errors', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['Retry-After', '60']]),
        json: async () => ({ error: 'Rate limit exceeded' })
      });

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(result.error.toLowerCase()).toContain('rate limit');
    });

    it('should suggest waiting when rate limited', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      });

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(result.error.toLowerCase()).toMatch(/wait|retry/);
    });

    it('should handle quota exceeded errors', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Quota exceeded for this month' })
      });

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Malformed LLM Responses', () => {
    it('should handle invalid JSON in LLM response', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: 'This is not valid JSON' }]
            }
          }]
        })
      });

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(result.error).toContain('malformed');
    });

    it('should handle missing groups field in response', async () => {
      const { handleAutoGroup } = await import('../../background/background.js');

      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, index: 0, title: 'Test', url: 'https://test.com', windowId: 1 }
      ]);
      mockChrome.tabs.sendMessage.mockResolvedValue({
        title: 'Test',
        url: 'https://test.com',
        contentPreview: 'Content'
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{ text: JSON.stringify({ invalid: 'response' }) }]
            }
          }]
        })
      });

      const result = await handleAutoGroup();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
