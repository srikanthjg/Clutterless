import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Integration Test: Complete Auto Grouping Flow
 * 
 * Tests the end-to-end flow of automatic tab grouping:
 * 1. Set up test environment with multiple tabs
 * 2. Configure test LLM provider
 * 3. Trigger auto grouping
 * 4. Verify groups are created correctly
 * 5. Verify tabs are moved appropriately
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

describe('Auto Grouping Integration Tests', () => {
  let mockChrome;
  let mockTabs;
  let createdGroups;
  let groupedTabs;

  beforeEach(() => {
    // Reset state
    createdGroups = [];
    groupedTabs = new Map();

    // Set up mock tabs with diverse content
    mockTabs = [
      { id: 1, index: 0, title: 'GitHub - Project Repository', url: 'https://github.com/user/project', windowId: 1 },
      { id: 2, index: 1, title: 'Stack Overflow - JavaScript Question', url: 'https://stackoverflow.com/questions/123', windowId: 1 },
      { id: 3, index: 2, title: 'AWS Console - EC2 Dashboard', url: 'https://console.aws.amazon.com/ec2', windowId: 1 },
      { id: 4, index: 3, title: 'Gmail - Inbox', url: 'https://mail.google.com/mail/u/0/', windowId: 1 },
      { id: 5, index: 4, title: 'YouTube - Tutorial Video', url: 'https://www.youtube.com/watch?v=abc', windowId: 1 },
      { id: 6, index: 5, title: 'AWS Documentation - Lambda', url: 'https://docs.aws.amazon.com/lambda/', windowId: 1 },
      { id: 7, index: 6, title: 'LinkedIn - Feed', url: 'https://www.linkedin.com/feed/', windowId: 1 },
      { id: 8, index: 7, title: 'MDN Web Docs - JavaScript', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', windowId: 1 }
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

  it('should complete full auto grouping flow successfully', async () => {
    // Import modules after mocking chrome
    const { handleAutoGroup } = await import('../../background/background.js');
    
    // Mock LLM response
    const mockLLMResponse = {
      groups: [
        {
          name: 'Development',
          tabIndices: [0, 1, 7], // GitHub, Stack Overflow, MDN
          reasoning: 'Development and coding resources'
        },
        {
          name: 'AWS Cloud',
          tabIndices: [2, 5], // AWS Console, AWS Docs
          reasoning: 'AWS cloud services'
        },
        {
          name: 'Social & Media',
          tabIndices: [3, 4, 6], // Gmail, YouTube, LinkedIn
          reasoning: 'Communication and social media'
        }
      ]
    };

    // Mock fetch for LLM API call
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

    // Execute auto grouping
    const result = await handleAutoGroup();

    // Verify success
    expect(result.success).toBe(true);
    expect(result.groupsCreated).toBe(3);

    // Verify tabs were queried
    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ currentWindow: true });

    // Verify groups were created
    expect(createdGroups.length).toBe(3);
    expect(createdGroups.map(g => g.title)).toEqual(['Development', 'AWS Cloud', 'Social & Media']);

    // Verify tabs were grouped correctly
    expect(groupedTabs.get(1)).toBe(1); // GitHub in group 1
    expect(groupedTabs.get(2)).toBe(1); // Stack Overflow in group 1
    expect(groupedTabs.get(8)).toBe(1); // MDN in group 1
    expect(groupedTabs.get(3)).toBe(2); // AWS Console in group 2
    expect(groupedTabs.get(6)).toBe(2); // AWS Docs in group 2
    expect(groupedTabs.get(4)).toBe(3); // Gmail in group 3
    expect(groupedTabs.get(5)).toBe(3); // YouTube in group 3
    expect(groupedTabs.get(7)).toBe(3); // LinkedIn in group 3
  });

  it('should handle metadata collection from all tabs', async () => {
    const { collectTabMetadata } = await import('../../background/background.js');

    const metadata = await collectTabMetadata();

    // Verify all tabs were processed
    expect(metadata.length).toBe(8);
    
    // Verify metadata structure
    metadata.forEach((tab, index) => {
      expect(tab).toHaveProperty('index', index);
      expect(tab).toHaveProperty('title');
      expect(tab).toHaveProperty('url');
      expect(tab).toHaveProperty('contentPreview');
    });
  });

  it('should apply grouping results correctly', async () => {
    const { applyGrouping } = await import('../../background/background.js');

    const groupingResult = {
      groups: [
        { name: 'Work', tabIndices: [0, 1, 2], color: 'blue' },
        { name: 'Personal', tabIndices: [3, 4], color: 'green' }
      ]
    };

    await applyGrouping(groupingResult);

    // Verify groups were created
    expect(mockChrome.tabs.group).toHaveBeenCalledTimes(2);
    expect(mockChrome.tabGroups.update).toHaveBeenCalledTimes(2);

    // Verify group names and colors
    expect(createdGroups).toContainEqual({ id: 1, title: 'Work', color: 'blue' });
    expect(createdGroups).toContainEqual({ id: 2, title: 'Personal', color: 'green' });
  });

  it('should handle errors gracefully during auto grouping', async () => {
    const { handleAutoGroup } = await import('../../background/background.js');

    // Mock LLM API failure
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await handleAutoGroup();

    // Verify error handling
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Network error');

    // Verify no groups were created
    expect(createdGroups.length).toBe(0);
  });

  it('should leave ungrouped tabs untouched', async () => {
    const { applyGrouping } = await import('../../background/background.js');

    const groupingResult = {
      groups: [
        { name: 'Group 1', tabIndices: [0, 1], color: 'blue' }
      ],
      ungrouped: [2, 3, 4, 5, 6, 7] // These should remain ungrouped
    };

    await applyGrouping(groupingResult);

    // Verify only specified tabs were grouped
    expect(mockChrome.tabs.group).toHaveBeenCalledTimes(1);
    expect(groupedTabs.size).toBe(2); // Only 2 tabs grouped
    expect(groupedTabs.has(1)).toBe(true);
    expect(groupedTabs.has(2)).toBe(true);
    expect(groupedTabs.has(3)).toBe(false); // Ungrouped tabs
  });
});
