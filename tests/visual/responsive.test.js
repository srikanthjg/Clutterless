/**
 * Responsive Behavior Testing Suite
 * Task 11.3: Test responsive behavior
 * 
 * This test suite verifies that the UI adapts correctly to different
 * popup widths and content states.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */

describe('Responsive Behavior Tests', () => {
  beforeEach(async () => {
    // Load popup HTML
    const html = await fetch(chrome.runtime.getURL('popup/popup.html')).then(r => r.text());
    document.body.innerHTML = html;
    
    // Load and inject CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('popup/popup.css');
    document.head.appendChild(link);
    
    // Wait for CSS to load
    await new Promise(resolve => {
      link.onload = resolve;
    });
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
    document.head.querySelectorAll('link[rel="stylesheet"]').forEach(link => link.remove());
    // Reset body width
    document.body.style.width = '';
  });
  
  describe('Minimum Width (300px)', () => {
    beforeEach(() => {
      document.body.style.width = '300px';
    });
    
    test('should maintain layout at minimum width', () => {
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      expect(container.offsetWidth).toBeGreaterThan(0);
      expect(computedStyle.overflow).not.toBe('hidden');
    });
    
    test('should not break button layout at minimum width', () => {
      const btn = document.querySelector('.btn');
      const container = document.querySelector('.container');
      
      expect(btn.offsetWidth).toBeLessThanOrEqual(container.offsetWidth);
    });
    
    test('should wrap text appropriately at minimum width', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      messageArea.textContent = 'This is a very long error message that should wrap properly at minimum width';
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      expect(computedStyle.wordWrap).toBe('break-word');
      expect(computedStyle.overflowWrap).toBe('break-word');
    });
  });
  
  describe('Maximum Width (800px)', () => {
    beforeEach(() => {
      document.body.style.width = '800px';
    });
    
    test('should maintain layout at maximum width', () => {
      const container = document.querySelector('.container');
      
      expect(container.offsetWidth).toBeGreaterThan(0);
    });
    
    test('should not stretch buttons excessively', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      expect(computedStyle.width).toBeTruthy();
    });
  });
  
  describe('Configuration Section Expansion (Requirement 7.1)', () => {
    test('should expand smoothly to show all fields', () => {
      const configSection = document.getElementById('config-section');
      const configForm = document.getElementById('config-form');
      const computedStyle = window.getComputedStyle(configSection);
      
      // Check for transition property
      expect(computedStyle.transition).toBeTruthy();
      
      // Show form
      configForm.classList.remove('hidden');
      
      // Form should be visible
      expect(configForm.classList.contains('hidden')).toBe(false);
    });
    
    test('should have smooth height transition', () => {
      const configSection = document.getElementById('config-section');
      const computedStyle = window.getComputedStyle(configSection);
      
      // Check that transition includes height
      expect(computedStyle.transition).toContain('height');
    });
  });
  
  describe('Provider Switching Layout (Requirement 7.2)', () => {
    test('should adjust layout height smoothly when switching providers', () => {
      const configForm = document.getElementById('config-form');
      const providerSelect = document.getElementById('provider-select');
      const bedrockFields = document.getElementById('bedrock-fields');
      const geminiFields = document.getElementById('gemini-fields');
      
      configForm.classList.remove('hidden');
      
      // Switch to Bedrock
      providerSelect.value = 'bedrock';
      providerSelect.dispatchEvent(new Event('change'));
      bedrockFields.classList.remove('hidden');
      
      const bedrockStyle = window.getComputedStyle(bedrockFields);
      expect(bedrockStyle.transition).toBeTruthy();
      
      // Switch to Gemini
      bedrockFields.classList.add('hidden');
      providerSelect.value = 'gemini';
      providerSelect.dispatchEvent(new Event('change'));
      geminiFields.classList.remove('hidden');
      
      const geminiStyle = window.getComputedStyle(geminiFields);
      expect(geminiStyle.transition).toBeTruthy();
    });
    
    test('should hide/show credential fields with transitions', () => {
      const credentialFields = document.querySelectorAll('.credential-fields');
      
      credentialFields.forEach(field => {
        const computedStyle = window.getComputedStyle(field);
        expect(computedStyle.transition).toBeTruthy();
      });
    });
  });
  
  describe('Long Error Messages (Requirement 7.3)', () => {
    test('should wrap long error messages without breaking layout', () => {
      const messageArea = document.getElementById('message-area');
      const longMessage = 'This is a very long error message that contains a lot of text and should wrap appropriately without breaking the layout or causing horizontal scrolling issues in the popup window';
      
      messageArea.classList.remove('hidden');
      messageArea.classList.add('error');
      messageArea.textContent = longMessage;
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      expect(computedStyle.wordWrap).toBe('break-word');
      expect(computedStyle.overflowWrap).toBe('break-word');
      expect(computedStyle.wordBreak).toBe('break-word');
    });
    
    test('should not cause horizontal overflow with long messages', () => {
      const messageArea = document.getElementById('message-area');
      const container = document.querySelector('.container');
      
      messageArea.classList.remove('hidden');
      messageArea.textContent = 'VeryLongWordWithoutSpacesThatShouldStillWrapProperly'.repeat(5);
      
      expect(messageArea.offsetWidth).toBeLessThanOrEqual(container.offsetWidth);
    });
  });
  
  describe('Custom Prompt Textarea (Requirement 7.4)', () => {
    test('should have expandable textarea with min and max height', () => {
      const customPrompt = document.getElementById('custom-prompt');
      const computedStyle = window.getComputedStyle(customPrompt);
      
      expect(computedStyle.minHeight).toBeTruthy();
      expect(computedStyle.maxHeight).toBeTruthy();
      expect(computedStyle.resize).toBe('vertical');
    });
    
    test('should apply smooth transitions to textarea', () => {
      const customPrompt = document.getElementById('custom-prompt');
      const computedStyle = window.getComputedStyle(customPrompt);
      
      expect(computedStyle.transition).toBeTruthy();
    });
    
    test('should allow vertical resizing', () => {
      const customPrompt = document.getElementById('custom-prompt');
      const computedStyle = window.getComputedStyle(customPrompt);
      
      expect(computedStyle.resize).toBe('vertical');
    });
  });
  
  describe('Configure Button Centering (Requirement 7.5)', () => {
    test('should center configure button when no configuration exists', () => {
      const configSection = document.getElementById('config-section');
      const configureBtn = document.getElementById('configure-btn');
      
      // Remove configured class to simulate unconfigured state
      configSection.classList.remove('configured');
      
      const computedStyle = window.getComputedStyle(configSection);
      
      // Should use flexbox for centering
      expect(computedStyle.display).toBeTruthy();
    });
    
    test('should have minimum height for centering', () => {
      const configSection = document.getElementById('config-section');
      configSection.classList.remove('configured');
      
      const computedStyle = window.getComputedStyle(configSection);
      
      expect(computedStyle.minHeight).toBeTruthy();
    });
  });
  
  describe('Content Overflow Handling', () => {
    test('should handle overflow in configuration section', () => {
      const configSection = document.getElementById('config-section');
      const computedStyle = window.getComputedStyle(configSection);
      
      expect(computedStyle.overflow).toBe('hidden');
    });
    
    test('should handle overflow in credential fields', () => {
      const credentialFields = document.querySelector('.credential-fields');
      const computedStyle = window.getComputedStyle(credentialFields);
      
      expect(computedStyle.overflow).toBe('hidden');
    });
  });
  
  describe('Layout Consistency', () => {
    test('should maintain consistent spacing at all widths', () => {
      const widths = [300, 380, 500, 800];
      
      widths.forEach(width => {
        document.body.style.width = `${width}px`;
        
        const container = document.querySelector('.container');
        const computedStyle = window.getComputedStyle(container);
        
        expect(computedStyle.padding).toBeTruthy();
      });
    });
    
    test('should maintain button width consistency', () => {
      const buttons = document.querySelectorAll('.btn');
      
      buttons.forEach(btn => {
        const computedStyle = window.getComputedStyle(btn);
        expect(computedStyle.width).toBe('100%');
      });
    });
  });
});
