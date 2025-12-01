import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

describe('Popup UI Integration Tests', () => {
  let dom;
  let document;
  let window;
  let chrome;

  beforeEach(() => {
    // Load HTML
    const html = fs.readFileSync(path.resolve(__dirname, 'popup.html'), 'utf-8');
    dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
    document = dom.window.document;
    window = dom.window;

    // Mock Chrome API BEFORE loading the script
    chrome = {
      runtime: {
        sendMessage: vi.fn(),
        lastError: null
      }
    };
    
    // Set chrome on window object so the script can access it
    window.chrome = chrome;
    global.chrome = chrome;
    global.document = document;
    global.window = window;

    // Load CSS (for completeness, though not tested directly)
    const css = fs.readFileSync(path.resolve(__dirname, 'popup.css'), 'utf-8');
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Load and execute popup.js
    const js = fs.readFileSync(path.resolve(__dirname, 'popup.js'), 'utf-8');
    const script = document.createElement('script');
    script.textContent = js;
    document.body.appendChild(script);
  });

  describe('Configuration Flow', () => {
    it('should display not configured state initially', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ success: true, data: { configured: false } });
      });

      // Trigger DOMContentLoaded
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));

      const statusText = document.getElementById('status-text');
      const statusIndicator = document.getElementById('status-indicator');
      
      expect(statusText.textContent).toBe('Not configured');
      expect(statusIndicator.classList.contains('configured')).toBe(false);
    });

    it('should display configured state when provider is set', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ 
          success: true, 
          data: { configured: true, provider: 'bedrock' } 
        });
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);

      await new Promise(resolve => setTimeout(resolve, 10));

      const statusText = document.getElementById('status-text');
      const statusIndicator = document.getElementById('status-indicator');
      
      expect(statusText.textContent).toContain('AWS Bedrock');
      expect(statusIndicator.classList.contains('configured')).toBe(true);
    });

    it('should show Bedrock credential fields when Bedrock is selected', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ success: true, data: { configured: false } });
      });

      // Trigger DOMContentLoaded to setup event listeners
      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const providerSelect = document.getElementById('provider-select');
      const bedrockFields = document.getElementById('bedrock-fields');
      const geminiFields = document.getElementById('gemini-fields');
      const localFields = document.getElementById('local-fields');

      providerSelect.value = 'bedrock';
      providerSelect.dispatchEvent(new window.Event('change'));

      expect(bedrockFields.classList.contains('hidden')).toBe(false);
      expect(geminiFields.classList.contains('hidden')).toBe(true);
      expect(localFields.classList.contains('hidden')).toBe(true);
    });

    it('should show Gemini credential fields when Gemini is selected', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ success: true, data: { configured: false } });
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const providerSelect = document.getElementById('provider-select');
      const bedrockFields = document.getElementById('bedrock-fields');
      const geminiFields = document.getElementById('gemini-fields');
      const localFields = document.getElementById('local-fields');

      providerSelect.value = 'gemini';
      providerSelect.dispatchEvent(new window.Event('change'));

      expect(bedrockFields.classList.contains('hidden')).toBe(true);
      expect(geminiFields.classList.contains('hidden')).toBe(false);
      expect(localFields.classList.contains('hidden')).toBe(true);
    });

    it('should show Local LLM credential fields when Local is selected', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ success: true, data: { configured: false } });
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const providerSelect = document.getElementById('provider-select');
      const bedrockFields = document.getElementById('bedrock-fields');
      const geminiFields = document.getElementById('gemini-fields');
      const localFields = document.getElementById('local-fields');

      providerSelect.value = 'local';
      providerSelect.dispatchEvent(new window.Event('change'));

      expect(bedrockFields.classList.contains('hidden')).toBe(true);
      expect(geminiFields.classList.contains('hidden')).toBe(true);
      expect(localFields.classList.contains('hidden')).toBe(false);
    });

    it('should validate Bedrock credentials before saving', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ success: true, data: { configured: false } });
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const providerSelect = document.getElementById('provider-select');
      const saveBtn = document.getElementById('save-config-btn');
      const messageArea = document.getElementById('message-area');

      providerSelect.value = 'bedrock';
      providerSelect.dispatchEvent(new window.Event('change'));

      // Don't fill in credentials
      saveBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(messageArea.classList.contains('hidden')).toBe(false);
      expect(messageArea.classList.contains('error')).toBe(true);
    });

    it('should save valid Bedrock configuration', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'saveConfig') {
          callback({ success: true });
        } else {
          callback({ success: true, data: { configured: false } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const providerSelect = document.getElementById('provider-select');
      const accessKey = document.getElementById('bedrock-access-key');
      const secretKey = document.getElementById('bedrock-secret-key');
      const region = document.getElementById('bedrock-region');
      const saveBtn = document.getElementById('save-config-btn');

      providerSelect.value = 'bedrock';
      providerSelect.dispatchEvent(new window.Event('change'));

      accessKey.value = 'test-access-key';
      secretKey.value = 'test-secret-key';
      region.value = 'us-east-1';

      saveBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'saveConfig',
          data: expect.objectContaining({
            provider: 'bedrock',
            credentials: expect.objectContaining({
              accessKey: 'test-access-key',
              secretKey: 'test-secret-key',
              region: 'us-east-1'
            })
          })
        }),
        expect.any(Function)
      );
    });

    it('should validate Local LLM endpoint URL format', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ success: true, data: { configured: false } });
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const providerSelect = document.getElementById('provider-select');
      const endpoint = document.getElementById('local-endpoint');
      const saveBtn = document.getElementById('save-config-btn');
      const messageArea = document.getElementById('message-area');

      providerSelect.value = 'local';
      providerSelect.dispatchEvent(new window.Event('change'));

      endpoint.value = 'invalid-url';
      saveBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(messageArea.classList.contains('hidden')).toBe(false);
      expect(messageArea.textContent).toContain('valid endpoint URL');
    });
  });

  describe('Auto Grouping', () => {
    it('should trigger auto grouping when button is clicked', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'autoGroup') {
          callback({ success: true, data: { groupsCreated: 3 } });
        } else {
          callback({ success: true, data: { configured: true, provider: 'bedrock' } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const autoGroupBtn = document.getElementById('auto-group-btn');
      autoGroupBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        { action: 'autoGroup' },
        expect.any(Function)
      );
    });

    it('should display success message with group count', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'autoGroup') {
          callback({ success: true, data: { groupsCreated: 5 } });
        } else {
          callback({ success: true, data: { configured: true, provider: 'bedrock' } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const autoGroupBtn = document.getElementById('auto-group-btn');
      autoGroupBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      const messageArea = document.getElementById('message-area');
      const messageContent = document.getElementById('message-content');

      expect(messageArea.classList.contains('hidden')).toBe(false);
      expect(messageArea.classList.contains('success')).toBe(true);
      expect(messageContent.textContent).toContain('5 tab groups');
    });

    it('should show loading state during auto grouping', async () => {
      let resolveCallback;
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'autoGroup') {
          resolveCallback = callback;
        } else {
          callback({ success: true, data: { configured: true, provider: 'bedrock' } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const autoGroupBtn = document.getElementById('auto-group-btn');
      const loadingIndicator = document.getElementById('loading-indicator');

      autoGroupBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(loadingIndicator.classList.contains('hidden')).toBe(false);

      // Resolve the operation
      resolveCallback({ success: true, data: { groupsCreated: 2 } });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(loadingIndicator.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Custom Grouping', () => {
    it('should validate custom prompt is not empty', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        callback({ success: true, data: { configured: true, provider: 'bedrock' } });
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const customGroupBtn = document.getElementById('custom-group-btn');
      const messageArea = document.getElementById('message-area');

      customGroupBtn.click();

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(messageArea.classList.contains('hidden')).toBe(false);
      expect(messageArea.textContent).toContain('enter grouping instructions');
    });

    it('should send custom prompt to service worker', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'customGroup') {
          callback({ success: true, data: { groupsCreated: 4 } });
        } else {
          callback({ success: true, data: { configured: true, provider: 'bedrock' } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const customPrompt = document.getElementById('custom-prompt');
      const customGroupBtn = document.getElementById('custom-group-btn');

      customPrompt.value = 'Group by project: work, personal, research';
      customGroupBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'customGroup',
          data: { prompt: 'Group by project: work, personal, research' }
        }),
        expect.any(Function)
      );
    });

    it('should clear prompt after successful grouping', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'customGroup') {
          callback({ success: true, data: { groupsCreated: 3 } });
        } else {
          callback({ success: true, data: { configured: true, provider: 'bedrock' } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const customPrompt = document.getElementById('custom-prompt');
      const customGroupBtn = document.getElementById('custom-group-btn');

      customPrompt.value = 'Test prompt';
      customGroupBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(customPrompt.value).toBe('');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when auto grouping fails', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'autoGroup') {
          callback({ success: false, message: 'API rate limit exceeded' });
        } else {
          callback({ success: true, data: { configured: true, provider: 'bedrock' } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const autoGroupBtn = document.getElementById('auto-group-btn');
      autoGroupBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      const messageArea = document.getElementById('message-area');
      const messageContent = document.getElementById('message-content');

      expect(messageArea.classList.contains('hidden')).toBe(false);
      expect(messageArea.classList.contains('error')).toBe(true);
      expect(messageContent.textContent).toContain('API rate limit exceeded');
    });

    it('should display error when configuration save fails', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'saveConfig') {
          callback({ success: false, message: 'Invalid credentials' });
        } else {
          callback({ success: true, data: { configured: false } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const providerSelect = document.getElementById('provider-select');
      const apiKey = document.getElementById('gemini-api-key');
      const saveBtn = document.getElementById('save-config-btn');

      providerSelect.value = 'gemini';
      providerSelect.dispatchEvent(new window.Event('change'));

      apiKey.value = 'invalid-key';
      saveBtn.click();

      await new Promise(resolve => setTimeout(resolve, 50));

      const messageArea = document.getElementById('message-area');
      expect(messageArea.classList.contains('error')).toBe(true);
      expect(messageArea.textContent).toContain('Invalid credentials');
    });
  });

  describe('Loading State Transitions', () => {
    it('should hide action section during loading', async () => {
      let resolveCallback;
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'autoGroup') {
          resolveCallback = callback;
        } else {
          callback({ success: true, data: { configured: true, provider: 'bedrock' } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const autoGroupBtn = document.getElementById('auto-group-btn');
      const actionSection = document.getElementById('action-section');

      autoGroupBtn.click();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(actionSection.classList.contains('hidden')).toBe(true);

      resolveCallback({ success: true, data: { groupsCreated: 2 } });
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(actionSection.classList.contains('hidden')).toBe(false);
    });

    it('should show action section after loading completes', async () => {
      chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        if (msg.action === 'autoGroup') {
          callback({ success: true, data: { groupsCreated: 3 } });
        } else {
          callback({ success: true, data: { configured: true, provider: 'bedrock' } });
        }
      });

      const event = new window.Event('DOMContentLoaded');
      document.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));

      const autoGroupBtn = document.getElementById('auto-group-btn');
      const actionSection = document.getElementById('action-section');
      const loadingIndicator = document.getElementById('loading-indicator');

      autoGroupBtn.click();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(loadingIndicator.classList.contains('hidden')).toBe(true);
      expect(actionSection.classList.contains('hidden')).toBe(false);
    });
  });
});
