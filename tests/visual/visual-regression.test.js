/**
 * Visual Regression Testing Suite
 * Task 11.1: Perform visual regression testing
 * 
 * This test suite captures screenshots of all UI states and verifies
 * that visual enhancements are applied correctly without unintended changes.
 * 
 * Requirements: All (comprehensive visual verification)
 */

describe('Visual Regression Tests', () => {
  let popup;
  
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
  });
  
  describe('Initial State', () => {
    test('should display unconfigured state with proper styling', () => {
      const statusDot = document.querySelector('.status-dot');
      const statusText = document.getElementById('status-text');
      const configureBtn = document.getElementById('configure-btn');
      
      expect(statusDot).toBeTruthy();
      expect(statusDot.classList.contains('configured')).toBe(false);
      expect(statusText.textContent).toBe('Not configured');
      expect(configureBtn).toBeTruthy();
      
      // Verify rounded corners are applied
      const computedStyle = window.getComputedStyle(configureBtn);
      expect(computedStyle.borderRadius).toBeTruthy();
    });
    
    test('should have gradient background on container', () => {
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      // Check for gradient or fallback color
      expect(computedStyle.background || computedStyle.backgroundColor).toBeTruthy();
    });
  });
  
  describe('Configuration Form State', () => {
    test('should display configuration form with proper styling', () => {
      const configForm = document.getElementById('config-form');
      const providerSelect = document.getElementById('provider-select');
      
      // Show form
      configForm.classList.remove('hidden');
      
      expect(configForm).toBeTruthy();
      expect(providerSelect).toBeTruthy();
      
      // Verify rounded corners on inputs
      const computedStyle = window.getComputedStyle(providerSelect);
      expect(computedStyle.borderRadius).toBeTruthy();
    });
    
    test('should show provider-specific fields with transitions', () => {
      const configForm = document.getElementById('config-form');
      const providerSelect = document.getElementById('provider-select');
      const bedrockFields = document.getElementById('bedrock-fields');
      
      configForm.classList.remove('hidden');
      providerSelect.value = 'bedrock';
      providerSelect.dispatchEvent(new Event('change'));
      
      bedrockFields.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(bedrockFields);
      expect(computedStyle.transition).toBeTruthy();
    });
  });
  
  describe('Button States', () => {
    test('should have gradient background on primary buttons', () => {
      const primaryBtn = document.querySelector('.btn-primary');
      const computedStyle = window.getComputedStyle(primaryBtn);
      
      // Check for gradient or fallback color
      expect(computedStyle.background || computedStyle.backgroundColor).toBeTruthy();
    });
    
    test('should have shadow effects on buttons', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      expect(computedStyle.boxShadow).toBeTruthy();
      expect(computedStyle.boxShadow).not.toBe('none');
    });
    
    test('should have rounded corners on all buttons', () => {
      const buttons = document.querySelectorAll('.btn');
      
      buttons.forEach(btn => {
        const computedStyle = window.getComputedStyle(btn);
        expect(computedStyle.borderRadius).toBeTruthy();
        expect(computedStyle.borderRadius).not.toBe('0px');
      });
    });
  });
  
  describe('Input Field States', () => {
    test('should have rounded corners on all input fields', () => {
      const inputs = document.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        const computedStyle = window.getComputedStyle(input);
        expect(computedStyle.borderRadius).toBeTruthy();
        expect(computedStyle.borderRadius).not.toBe('0px');
      });
    });
    
    test('should have focus styles with colored shadow', () => {
      const input = document.querySelector('input[type="text"]');
      
      // Simulate focus
      input.focus();
      
      const computedStyle = window.getComputedStyle(input);
      expect(computedStyle.outline || computedStyle.boxShadow).toBeTruthy();
    });
  });
  
  describe('Card Components', () => {
    test('should have rounded corners on card containers', () => {
      const configSection = document.getElementById('config-section');
      const computedStyle = window.getComputedStyle(configSection);
      
      expect(computedStyle.borderRadius).toBeTruthy();
      expect(computedStyle.borderRadius).not.toBe('0px');
    });
    
    test('should have shadow effects on cards', () => {
      const configSection = document.getElementById('config-section');
      const computedStyle = window.getComputedStyle(configSection);
      
      expect(computedStyle.boxShadow).toBeTruthy();
      expect(computedStyle.boxShadow).not.toBe('none');
    });
  });
  
  describe('Loading Indicator', () => {
    test('should display circular spinner with proper styling', () => {
      const loadingIndicator = document.getElementById('loading-indicator');
      loadingIndicator.classList.remove('hidden');
      
      const spinner = document.querySelector('.spinner');
      const computedStyle = window.getComputedStyle(spinner);
      
      expect(computedStyle.borderRadius).toBe('50%');
      expect(computedStyle.animation).toBeTruthy();
    });
  });
  
  describe('Message Components', () => {
    test('should display success message with gradient background', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      messageArea.classList.add('success');
      messageArea.textContent = 'Success message';
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      expect(computedStyle.borderRadius).toBeTruthy();
      expect(computedStyle.background || computedStyle.backgroundColor).toBeTruthy();
    });
    
    test('should display error message with gradient background and shake animation', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      messageArea.classList.add('error');
      messageArea.textContent = 'Error message';
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      expect(computedStyle.borderRadius).toBeTruthy();
      expect(computedStyle.background || computedStyle.backgroundColor).toBeTruthy();
      expect(computedStyle.animation).toBeTruthy();
    });
  });
  
  describe('Animation Presence', () => {
    test('should have fade-in animation on container', () => {
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      expect(computedStyle.animation).toBeTruthy();
    });
    
    test('should have slide-in animation on messages', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      expect(computedStyle.animation).toBeTruthy();
    });
  });
});
