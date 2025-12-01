/**
 * Content script for extracting tab metadata
 * Injected into tabs to gather page information for LLM-based grouping
 * 
 * Security Note: This script only extracts page title and URL, which are
 * non-sensitive metadata. No page content or form data is accessed.
 */

/**
 * Extracts metadata from the current page
 * @returns {Object} Metadata object containing title and url
 */
function extractMetadata() {
  try {
    // Extract page title from document
    const title = document.title || 'Untitled';

    // Extract URL from window.location
    const url = window.location.href;

    return {
      title,
      url,
      error: null
    };
  } catch (error) {
    // Handle extraction errors gracefully
    return {
      title: document.title || 'Error',
      url: window.location.href || '',
      error: error.message
    };
  }
}

/**
 * Message listener for service worker communication
 * Handles requests to extract content from the page
 */
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Listen for 'extractContent' action
    if (message.action === 'extractContent') {
      try {
        // Check if we're on a restricted page (chrome://, etc.)
        if (window.location.protocol === 'chrome:' || 
            window.location.protocol === 'chrome-extension:' ||
            window.location.protocol === 'about:') {
          // Handle restricted pages appropriately
          sendResponse({
            title: document.title || 'Restricted Page',
            url: window.location.href,
            error: 'Cannot access content on restricted pages'
          });
          return true;
        }

        // Extract metadata and send back to service worker
        const metadata = extractMetadata();
        sendResponse(metadata);
      } catch (error) {
        // Handle any unexpected errors
        sendResponse({
          title: document.title || 'Error',
          url: window.location.href || '',
          error: error.message
        });
      }
      
      // Return true to indicate async response
      return true;
    }
  });
}

// Export for testing (Node.js environment)
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    extractMetadata
  };
}
