/**
 * Unit tests for tab-manager.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Chrome API
global.chrome = {
  tabs: {
    query: vi.fn(),
    group: vi.fn(),
    ungroup: vi.fn()
  },
  tabGroups: {
    update: vi.fn()
  }
};

// Import the module after mocking
const { getAllTabs, createGroup, ungroupTabs } = await import('./tab-manager.js');

describe('Tab Manager', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('getAllTabs', () => {
    it('should query and return all tabs in current window', async () => {
      const mockTabs = [
        { id: 1, title: 'Tab 1', url: 'https://example.com' },
        { id: 2, title: 'Tab 2', url: 'https://test.com' }
      ];

      chrome.tabs.query.mockResolvedValue(mockTabs);

      const result = await getAllTabs();

      expect(chrome.tabs.query).toHaveBeenCalledWith({ currentWindow: true });
      expect(result).toEqual(mockTabs);
    });

    it('should throw error when Chrome API fails', async () => {
      chrome.tabs.query.mockRejectedValue(new Error('API Error'));

      await expect(getAllTabs()).rejects.toThrow('Failed to query tabs: API Error');
    });
  });

  describe('createGroup', () => {
    it('should create a tab group with name and color', async () => {
      const mockGroupId = 123;
      chrome.tabs.group.mockResolvedValue(mockGroupId);
      chrome.tabGroups.update.mockResolvedValue({});

      const result = await createGroup('Work', 'blue', [1, 2, 3]);

      expect(chrome.tabs.group).toHaveBeenCalledWith({ tabIds: [1, 2, 3] });
      expect(chrome.tabGroups.update).toHaveBeenCalledWith(mockGroupId, {
        title: 'Work',
        color: 'blue'
      });
      expect(result).toBe(mockGroupId);
    });

    it('should use grey color for invalid color values', async () => {
      const mockGroupId = 456;
      chrome.tabs.group.mockResolvedValue(mockGroupId);
      chrome.tabGroups.update.mockResolvedValue({});

      await createGroup('Test', 'invalid-color', [1]);

      expect(chrome.tabGroups.update).toHaveBeenCalledWith(mockGroupId, {
        title: 'Test',
        color: 'grey'
      });
    });

    it('should accept all valid Chrome tab group colors', async () => {
      const validColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
      const mockGroupId = 789;
      chrome.tabs.group.mockResolvedValue(mockGroupId);
      chrome.tabGroups.update.mockResolvedValue({});

      for (const color of validColors) {
        await createGroup('Test', color, [1]);
        expect(chrome.tabGroups.update).toHaveBeenCalledWith(mockGroupId, {
          title: 'Test',
          color: color
        });
      }
    });

    it('should throw error when no tab IDs provided', async () => {
      await expect(createGroup('Test', 'blue', [])).rejects.toThrow('No tab IDs provided for grouping');
      await expect(createGroup('Test', 'blue', null)).rejects.toThrow('No tab IDs provided for grouping');
    });

    it('should throw error when tab grouping fails', async () => {
      chrome.tabs.group.mockRejectedValue(new Error('Grouping failed'));

      await expect(createGroup('Test', 'blue', [1, 2])).rejects.toThrow('Failed to create tab group: Grouping failed');
    });

    it('should throw error when group update fails', async () => {
      chrome.tabs.group.mockResolvedValue(123);
      chrome.tabGroups.update.mockRejectedValue(new Error('Update failed'));

      await expect(createGroup('Test', 'blue', [1, 2])).rejects.toThrow('Failed to create tab group: Update failed');
    });
  });

  describe('ungroupTabs', () => {
    it('should ungroup specified tabs', async () => {
      chrome.tabs.ungroup.mockResolvedValue(undefined);

      await ungroupTabs([1, 2, 3]);

      expect(chrome.tabs.ungroup).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should handle empty tab ID array gracefully', async () => {
      await ungroupTabs([]);

      expect(chrome.tabs.ungroup).not.toHaveBeenCalled();
    });

    it('should handle null tab IDs gracefully', async () => {
      await ungroupTabs(null);

      expect(chrome.tabs.ungroup).not.toHaveBeenCalled();
    });

    it('should throw error when ungrouping fails', async () => {
      chrome.tabs.ungroup.mockRejectedValue(new Error('Ungroup failed'));

      await expect(ungroupTabs([1, 2])).rejects.toThrow('Failed to ungroup tabs: Ungroup failed');
    });
  });
});
