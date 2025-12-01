/**
 * Tab Manager Module
 * Handles Chrome Tabs API integration for querying tabs and managing tab groups
 */

/**
 * Query all open tabs in the current window
 * @returns {Promise<Array>} Array of tab objects
 * @throws {Error} If Chrome API fails
 */
async function getAllTabs() {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs;
  } catch (error) {
    throw new Error(`Failed to query tabs: ${error.message}`);
  }
}

/**
 * Create a tab group with specified name, color, and tabs
 * @param {string} name - Group name
 * @param {string} color - Chrome tab group color (grey, blue, red, yellow, green, pink, purple, cyan, orange)
 * @param {Array<number>} tabIds - Array of tab IDs to add to the group
 * @returns {Promise<number>} The created group ID
 * @throws {Error} If group creation fails
 */
async function createGroup(name, color, tabIds) {
  try {
    if (!tabIds || tabIds.length === 0) {
      throw new Error('No tab IDs provided for grouping');
    }

    // Validate color
    const validColors = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];
    const groupColor = validColors.includes(color) ? color : 'grey';

    // Create the group by grouping the tabs
    const groupId = await chrome.tabs.group({ tabIds });

    // Update the group with name and color
    await chrome.tabGroups.update(groupId, {
      title: name,
      color: groupColor
    });

    return groupId;
  } catch (error) {
    throw new Error(`Failed to create tab group: ${error.message}`);
  }
}

/**
 * Remove tabs from their groups (ungroup them)
 * @param {Array<number>} tabIds - Array of tab IDs to ungroup
 * @returns {Promise<void>}
 * @throws {Error} If ungrouping fails
 */
async function ungroupTabs(tabIds) {
  try {
    if (!tabIds || tabIds.length === 0) {
      return; // Nothing to ungroup
    }

    await chrome.tabs.ungroup(tabIds);
  } catch (error) {
    throw new Error(`Failed to ungroup tabs: ${error.message}`);
  }
}

// Export functions for use in other modules (CommonJS for tests)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAllTabs,
    createGroup,
    ungroupTabs
  };
}

// ES6 exports for browser extension
export {
  getAllTabs,
  createGroup,
  ungroupTabs
};
