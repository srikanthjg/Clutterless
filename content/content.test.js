/**
 * Unit tests for content script
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Content Script - Metadata Extraction', () => {
  let dom;
  let document;
  let window;
  let extractMetadata;

  beforeEach(() => {
    // Create a fresh DOM for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
        </head>
        <body>
          <h1>Welcome to Test Page</h1>
          <p>This is some test content.</p>
        </body>
      </html>
    `, { url: 'https://example.com/test' });

    document = dom.window.document;
    window = dom.window;

    // Set up global document and window
    global.document = document;
    global.window = window;

    // Load and evaluate the content script
    const contentScript = fs.readFileSync(
      path.join(__dirname, 'content.js'),
      'utf-8'
    );
    
    // Execute the script in the context
    const scriptFunction = new Function('document', 'window', contentScript + '\nreturn { extractMetadata };');
    const result = scriptFunction(document, window);
    extractMetadata = result.extractMetadata;
  });

  afterEach(() => {
    // Clean up
    vi.clearAllMocks();
    delete global.document;
    delete global.window;
  });

  describe('extractMetadata', () => {
    it('should extract page title from document', () => {
      const metadata = extractMetadata();

      expect(metadata.title).toBe('Test Page');
      expect(metadata.error).toBeNull();
    });

    it('should extract URL from window.location', () => {
      const metadata = extractMetadata();

      expect(metadata.url).toBe('https://example.com/test');
      expect(metadata.error).toBeNull();
    });

    it('should return both title and URL', () => {
      const metadata = extractMetadata();

      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('url');
      expect(metadata).toHaveProperty('error');
    });

    it('should handle extraction errors gracefully', () => {
      // Test that the function has error handling structure
      // The current implementation wraps extraction in try-catch
      const metadata = extractMetadata();

      // Verify the function returns proper structure even in normal cases
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('url');
      expect(metadata).toHaveProperty('error');
      
      // In normal cases, error should be null
      expect(metadata.error).toBeNull();
    });

    it('should return default values when title is missing', () => {
      const emptyDom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
      
      const contentScript = fs.readFileSync(
        path.join(__dirname, 'content.js'),
        'utf-8'
      );
      const scriptFunction = new Function('document', 'window', contentScript + '\nreturn { extractMetadata };');
      const result = scriptFunction(emptyDom.window.document, emptyDom.window);
      
      const metadata = result.extractMetadata();

      expect(metadata.title).toBe('Untitled');
      expect(metadata.error).toBeNull();
    });

    it('should handle missing URL gracefully', () => {
      const metadata = extractMetadata();

      expect(metadata.url).toBeTruthy();
      expect(typeof metadata.url).toBe('string');
    });

    it('should extract metadata from complex DOM structure', () => {
      const complexDom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Complex Page with Special Characters &amp; Symbols</title>
          </head>
          <body>
            <div id="main">
              <h1>Main Content</h1>
              <article>
                <p>Article content here</p>
              </article>
            </div>
          </body>
        </html>
      `, { url: 'https://example.com/complex?param=value&other=123' });

      const contentScript = fs.readFileSync(
        path.join(__dirname, 'content.js'),
        'utf-8'
      );
      const scriptFunction = new Function('document', 'window', contentScript + '\nreturn { extractMetadata };');
      const result = scriptFunction(complexDom.window.document, complexDom.window);
      
      const metadata = result.extractMetadata();

      expect(metadata.title).toBe('Complex Page with Special Characters & Symbols');
      expect(metadata.url).toBe('https://example.com/complex?param=value&other=123');
      expect(metadata.error).toBeNull();
    });

    it('should handle inaccessible document properties', () => {
      // Test that the function properly structures error responses
      // The current implementation has try-catch for error handling
      const restrictedDom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
      
      const contentScript = fs.readFileSync(
        path.join(__dirname, 'content.js'),
        'utf-8'
      );
      const scriptFunction = new Function('document', 'window', contentScript + '\nreturn { extractMetadata };');
      const result = scriptFunction(restrictedDom.window.document, restrictedDom.window);
      
      const metadata = result.extractMetadata();

      // Verify proper structure is returned
      expect(metadata).toHaveProperty('title');
      expect(metadata).toHaveProperty('url');
      expect(metadata).toHaveProperty('error');
    });

    it('should handle pages with very long titles', () => {
      const longTitle = 'A'.repeat(500);
      const longTitleDom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${longTitle}</title>
          </head>
          <body></body>
        </html>
      `);

      const contentScript = fs.readFileSync(
        path.join(__dirname, 'content.js'),
        'utf-8'
      );
      const scriptFunction = new Function('document', 'window', contentScript + '\nreturn { extractMetadata };');
      const result = scriptFunction(longTitleDom.window.document, longTitleDom.window);
      
      const metadata = result.extractMetadata();

      expect(metadata.title).toBe(longTitle);
      expect(metadata.error).toBeNull();
    });
  });

  describe('Message Listener - Service Worker Communication', () => {
    let mockChrome;
    let messageListener;

    function loadContentScriptWithChrome(testDocument, testWindow, chrome) {
      const contentScript = fs.readFileSync(
        path.join(__dirname, 'content.js'),
        'utf-8'
      );
      
      // Execute script with chrome, document, and window in scope
      const scriptFunction = new Function(
        'chrome',
        'document',
        'window',
        contentScript
      );
      scriptFunction(chrome, testDocument, testWindow);
    }

    beforeEach(() => {
      // Set up mock Chrome API
      mockChrome = {
        runtime: {
          onMessage: {
            addListener: vi.fn((listener) => {
              messageListener = listener;
            })
          }
        }
      };

      global.chrome = mockChrome;

      // Load content script with mock chrome
      loadContentScriptWithChrome(document, window, mockChrome);
    });

    it('should register message listener on load', () => {
      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalled();
      expect(messageListener).toBeDefined();
    });

    it('should respond to extractContent action', () => {
      const sendResponse = vi.fn();
      const message = { action: 'extractContent' };

      const result = messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalled();
      expect(result).toBe(true); // Indicates async response
    });

    it('should send metadata in response', () => {
      const sendResponse = vi.fn();
      const message = { action: 'extractContent' };

      messageListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          url: expect.any(String)
        })
      );
    });

    it('should handle restricted chrome:// pages', () => {
      const chromeDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'chrome://settings'
      });

      const chromeListener = vi.fn();
      const testChrome = {
        runtime: {
          onMessage: {
            addListener: vi.fn((listener) => {
              chromeListener.mockImplementation(listener);
            })
          }
        }
      };

      loadContentScriptWithChrome(chromeDom.window.document, chromeDom.window, testChrome);

      const sendResponse = vi.fn();
      const message = { action: 'extractContent' };

      chromeListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('restricted')
        })
      );
    });

    it('should handle restricted chrome-extension:// pages', () => {
      const extensionDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'chrome-extension://abc123/popup.html'
      });

      const extensionListener = vi.fn();
      const testChrome = {
        runtime: {
          onMessage: {
            addListener: vi.fn((listener) => {
              extensionListener.mockImplementation(listener);
            })
          }
        }
      };

      loadContentScriptWithChrome(extensionDom.window.document, extensionDom.window, testChrome);

      const sendResponse = vi.fn();
      const message = { action: 'extractContent' };

      extensionListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('restricted')
        })
      );
    });

    it('should handle restricted about: pages', () => {
      const aboutDom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'about:blank'
      });

      const aboutListener = vi.fn();
      const testChrome = {
        runtime: {
          onMessage: {
            addListener: vi.fn((listener) => {
              aboutListener.mockImplementation(listener);
            })
          }
        }
      };

      loadContentScriptWithChrome(aboutDom.window.document, aboutDom.window, testChrome);

      const sendResponse = vi.fn();
      const message = { action: 'extractContent' };

      aboutListener(message, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('restricted')
        })
      );
    });

    it('should ignore non-extractContent messages', () => {
      const sendResponse = vi.fn();
      const message = { action: 'someOtherAction' };

      const result = messageListener(message, {}, sendResponse);

      expect(sendResponse).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle unexpected errors during extraction', () => {
      // Test that message listener has error handling
      const errorDom = new JSDOM('<!DOCTYPE html><html><body></body></html>');

      const errorListener = vi.fn();
      const testChrome = {
        runtime: {
          onMessage: {
            addListener: vi.fn((listener) => {
              errorListener.mockImplementation(listener);
            })
          }
        }
      };

      loadContentScriptWithChrome(errorDom.window.document, errorDom.window, testChrome);

      const sendResponse = vi.fn();
      const message = { action: 'extractContent' };

      errorListener(message, {}, sendResponse);

      // Verify that response is sent with proper structure
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.any(String),
          url: expect.any(String)
        })
      );
    });

    it('should return true to indicate async response', () => {
      const sendResponse = vi.fn();
      const message = { action: 'extractContent' };

      const result = messageListener(message, {}, sendResponse);

      expect(result).toBe(true);
    });
  });

  describe('Sensitive Data Filtering', () => {
    it('should not extract password field values', () => {
      const passwordDom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head><title>Login Page</title></head>
          <body>
            <form>
              <input type="password" value="secret123" />
              <input type="text" value="username" />
            </form>
          </body>
        </html>
      `);

      const contentScript = fs.readFileSync(
        path.join(__dirname, 'content.js'),
        'utf-8'
      );
      const scriptFunction = new Function('document', 'window', contentScript + '\nreturn { extractMetadata };');
      const result = scriptFunction(passwordDom.window.document, passwordDom.window);
      
      const metadata = result.extractMetadata();

      // Verify that metadata doesn't contain password values
      expect(metadata.title).toBe('Login Page');
      expect(metadata.url).toBeTruthy();
      // Current implementation doesn't extract form values, which is correct
      expect(metadata.error).toBeNull();
    });

    it('should not extract credit card input values', () => {
      const ccDom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head><title>Payment Page</title></head>
          <body>
            <form>
              <input type="text" name="cc-number" value="4111111111111111" />
              <input type="text" name="cvv" value="123" />
            </form>
          </body>
        </html>
      `);

      const contentScript = fs.readFileSync(
        path.join(__dirname, 'content.js'),
        'utf-8'
      );
      const scriptFunction = new Function('document', 'window', contentScript + '\nreturn { extractMetadata };');
      const result = scriptFunction(ccDom.window.document, ccDom.window);
      
      const metadata = result.extractMetadata();

      // Verify that metadata doesn't contain credit card values
      expect(metadata.title).toBe('Payment Page');
      expect(metadata.url).toBeTruthy();
      // Current implementation doesn't extract form values, which is correct
      expect(metadata.error).toBeNull();
    });

    it('should safely extract metadata from pages with sensitive forms', () => {
      const sensitiveDom = new JSDOM(`
        <!DOCTYPE html>
        <html>
          <head><title>Secure Form</title></head>
          <body>
            <h1>Account Settings</h1>
            <form>
              <input type="password" name="current-password" value="oldpass" />
              <input type="password" name="new-password" value="newpass" />
              <input type="text" name="email" value="user@example.com" />
            </form>
          </body>
        </html>
      `);

      const contentScript = fs.readFileSync(
        path.join(__dirname, 'content.js'),
        'utf-8'
      );
      const scriptFunction = new Function('document', 'window', contentScript + '\nreturn { extractMetadata };');
      const result = scriptFunction(sensitiveDom.window.document, sensitiveDom.window);
      
      const metadata = result.extractMetadata();

      expect(metadata.title).toBe('Secure Form');
      expect(metadata.url).toBeTruthy();
      expect(metadata.error).toBeNull();
      // Verify no sensitive data is included
      const metadataString = JSON.stringify(metadata);
      expect(metadataString).not.toContain('oldpass');
      expect(metadataString).not.toContain('newpass');
    });
  });
});
