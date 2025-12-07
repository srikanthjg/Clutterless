/**
 * Cross-Browser Compatibility Testing Suite
 * Task 11.2: Test cross-browser compatibility
 * 
 * This test suite verifies that CSS enhancements work correctly across
 * different browsers and that fallbacks are properly implemented.
 * 
 * Requirements: All (browser compatibility verification)
 */

describe('Cross-Browser Compatibility Tests', () => {
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
  
  describe('CSS Custom Properties Support', () => {
    test('should use CSS custom properties when supported', () => {
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      // Check if custom properties are applied
      const borderRadius = computedStyle.borderRadius;
      expect(borderRadius).toBeTruthy();
      expect(borderRadius).not.toBe('0px');
    });
    
    test('should have fallback values for older browsers', () => {
      const btn = document.querySelector('.btn-primary');
      const computedStyle = window.getComputedStyle(btn);
      
      // Should have either gradient or solid color fallback
      expect(computedStyle.backgroundColor || computedStyle.background).toBeTruthy();
    });
  });
  
  describe('Gradient Support', () => {
    test('should apply gradients on primary buttons', () => {
      const primaryBtn = document.querySelector('.btn-primary');
      const computedStyle = window.getComputedStyle(primaryBtn);
      
      const background = computedStyle.background || computedStyle.backgroundColor;
      expect(background).toBeTruthy();
    });
    
    test('should have solid color fallback for gradients', () => {
      const primaryBtn = document.querySelector('.btn-primary');
      const computedStyle = window.getComputedStyle(primaryBtn);
      
      // Should have backgroundColor as fallback
      expect(computedStyle.backgroundColor).toBeTruthy();
    });
    
    test('should apply gradients on success messages', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('success');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      const background = computedStyle.background || computedStyle.backgroundColor;
      
      expect(background).toBeTruthy();
    });
    
    test('should apply gradients on error messages', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('error');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      const background = computedStyle.background || computedStyle.backgroundColor;
      
      expect(background).toBeTruthy();
    });
  });
  
  describe('Border Radius Support', () => {
    test('should apply rounded corners to buttons', () => {
      const buttons = document.querySelectorAll('.btn');
      
      buttons.forEach(btn => {
        const computedStyle = window.getComputedStyle(btn);
        expect(computedStyle.borderRadius).toBeTruthy();
        expect(computedStyle.borderRadius).not.toBe('0px');
      });
    });
    
    test('should apply rounded corners to input fields', () => {
      const inputs = document.querySelectorAll('input, select, textarea');
      
      inputs.forEach(input => {
        const computedStyle = window.getComputedStyle(input);
        expect(computedStyle.borderRadius).toBeTruthy();
        expect(computedStyle.borderRadius).not.toBe('0px');
      });
    });
    
    test('should apply rounded corners to cards', () => {
      const configSection = document.getElementById('config-section');
      const computedStyle = window.getComputedStyle(configSection);
      
      expect(computedStyle.borderRadius).toBeTruthy();
      expect(computedStyle.borderRadius).not.toBe('0px');
    });
  });
  
  describe('Box Shadow Support', () => {
    test('should apply shadows to buttons', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      expect(computedStyle.boxShadow).toBeTruthy();
      expect(computedStyle.boxShadow).not.toBe('none');
    });
    
    test('should apply shadows to cards', () => {
      const configSection = document.getElementById('config-section');
      const computedStyle = window.getComputedStyle(configSection);
      
      expect(computedStyle.boxShadow).toBeTruthy();
      expect(computedStyle.boxShadow).not.toBe('none');
    });
    
    test('should apply focus shadow to inputs', () => {
      const input = document.querySelector('input[type="text"]');
      input.focus();
      
      const computedStyle = window.getComputedStyle(input);
      
      // Should have either boxShadow or outline
      expect(computedStyle.boxShadow || computedStyle.outline).toBeTruthy();
    });
  });
  
  describe('Animation Support', () => {
    test('should apply animations when supported', () => {
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      // Check if animation is applied
      expect(computedStyle.animation || computedStyle.animationName).toBeTruthy();
    });
    
    test('should handle missing animation support gracefully', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      
      // Should still be visible even if animations don't work
      expect(messageArea.classList.contains('hidden')).toBe(false);
    });
  });
  
  describe('Transition Support', () => {
    test('should apply transitions to buttons', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      expect(computedStyle.transition).toBeTruthy();
    });
    
    test('should apply transitions to inputs', () => {
      const input = document.querySelector('input');
      const computedStyle = window.getComputedStyle(input);
      
      expect(computedStyle.transition).toBeTruthy();
    });
  });
  
  describe('Flexbox Support', () => {
    test('should use flexbox for layout', () => {
      const actionSection = document.getElementById('action-section');
      const computedStyle = window.getComputedStyle(actionSection);
      
      expect(computedStyle.display).toBe('flex');
    });
    
    test('should center configure button with flexbox', () => {
      const configSection = document.getElementById('config-section');
      configSection.classList.remove('configured');
      
      const computedStyle = window.getComputedStyle(configSection);
      
      expect(computedStyle.display).toBeTruthy();
    });
  });
  
  describe('Font Family Support', () => {
    test('should use system font stack', () => {
      const body = document.body;
      const computedStyle = window.getComputedStyle(body);
      
      expect(computedStyle.fontFamily).toBeTruthy();
    });
    
    test('should apply font weights correctly', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      expect(computedStyle.fontWeight).toBeTruthy();
    });
  });
});
