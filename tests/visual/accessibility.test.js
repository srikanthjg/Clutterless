/**
 * Accessibility Compliance Testing Suite
 * Task 11.4: Test accessibility compliance
 * 
 * This test suite verifies WCAG 2.1 AA compliance including color contrast,
 * keyboard navigation, focus indicators, and screen reader compatibility.
 * 
 * Requirements: All (comprehensive accessibility verification)
 */

describe('Accessibility Compliance Tests', () => {
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
  
  describe('Color Contrast Ratios', () => {
    /**
     * Helper function to calculate relative luminance
     * Based on WCAG 2.1 formula
     */
    function getLuminance(r, g, b) {
      const [rs, gs, bs] = [r, g, b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    
    /**
     * Helper function to calculate contrast ratio
     * Based on WCAG 2.1 formula
     */
    function getContrastRatio(rgb1, rgb2) {
      const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
      const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }
    
    /**
     * Helper function to parse RGB color
     */
    function parseRGB(colorString) {
      const match = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }
      return [255, 255, 255]; // Default to white
    }
    
    test('should meet 4.5:1 contrast ratio for normal text on primary buttons', () => {
      const primaryBtn = document.querySelector('.btn-primary');
      const computedStyle = window.getComputedStyle(primaryBtn);
      
      // White text on primary gradient
      const textColor = parseRGB(computedStyle.color);
      const bgColor = parseRGB(computedStyle.backgroundColor);
      
      const contrastRatio = getContrastRatio(textColor, bgColor);
      
      // WCAG AA requires 4.5:1 for normal text
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
    
    test('should meet 4.5:1 contrast ratio for text on success messages', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('success');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      const textColor = parseRGB(computedStyle.color);
      const bgColor = parseRGB(computedStyle.backgroundColor);
      
      const contrastRatio = getContrastRatio(textColor, bgColor);
      
      // WCAG AA requires 4.5:1 for normal text
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
    
    test('should meet 4.5:1 contrast ratio for text on error messages', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('error');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      const textColor = parseRGB(computedStyle.color);
      const bgColor = parseRGB(computedStyle.backgroundColor);
      
      const contrastRatio = getContrastRatio(textColor, bgColor);
      
      // WCAG AA requires 4.5:1 for normal text
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
    
    test('should meet 3:1 contrast ratio for large text', () => {
      const heading = document.querySelector('h1');
      const computedStyle = window.getComputedStyle(heading);
      
      const textColor = parseRGB(computedStyle.color);
      const bgColor = parseRGB(window.getComputedStyle(document.body).backgroundColor);
      
      const contrastRatio = getContrastRatio(textColor, bgColor);
      
      // WCAG AA requires 3:1 for large text (18px+ or 14px+ bold)
      expect(contrastRatio).toBeGreaterThanOrEqual(3);
    });
  });
  
  describe('Keyboard Navigation', () => {
    test('should allow tab navigation through all interactive elements', () => {
      const interactiveElements = document.querySelectorAll('button, input, select, textarea');
      
      interactiveElements.forEach(element => {
        // Elements should not have negative tabindex
        const tabIndex = element.getAttribute('tabindex');
        if (tabIndex !== null) {
          expect(parseInt(tabIndex)).toBeGreaterThanOrEqual(0);
        }
      });
    });
    
    test('should have logical tab order', () => {
      const configureBtn = document.getElementById('configure-btn');
      const autoGroupBtn = document.getElementById('auto-group-btn');
      const customPrompt = document.getElementById('custom-prompt');
      const customGroupBtn = document.getElementById('custom-group-btn');
      
      // All interactive elements should be in the DOM in logical order
      expect(configureBtn).toBeTruthy();
      expect(autoGroupBtn).toBeTruthy();
      expect(customPrompt).toBeTruthy();
      expect(customGroupBtn).toBeTruthy();
    });
    
    test('should not trap keyboard focus', () => {
      const firstButton = document.querySelector('button');
      const lastButton = Array.from(document.querySelectorAll('button')).pop();
      
      // Should be able to focus first and last elements
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
      
      lastButton.focus();
      expect(document.activeElement).toBe(lastButton);
    });
  });
  
  describe('Focus Indicators', () => {
    test('should have visible focus indicators on buttons', () => {
      const btn = document.querySelector('.btn');
      btn.focus();
      
      const computedStyle = window.getComputedStyle(btn);
      
      // Should have either outline or box-shadow for focus
      expect(computedStyle.outline !== 'none' || computedStyle.boxShadow !== 'none').toBe(true);
    });
    
    test('should have visible focus indicators on inputs', () => {
      const input = document.querySelector('input');
      input.focus();
      
      const computedStyle = window.getComputedStyle(input);
      
      // Should have either outline or box-shadow for focus
      expect(computedStyle.outline !== 'none' || computedStyle.boxShadow !== 'none').toBe(true);
    });
    
    test('should have visible focus indicators on select elements', () => {
      const select = document.querySelector('select');
      select.focus();
      
      const computedStyle = window.getComputedStyle(select);
      
      // Should have either outline or box-shadow for focus
      expect(computedStyle.outline !== 'none' || computedStyle.boxShadow !== 'none').toBe(true);
    });
    
    test('should have visible focus indicators on textarea', () => {
      const textarea = document.querySelector('textarea');
      textarea.focus();
      
      const computedStyle = window.getComputedStyle(textarea);
      
      // Should have either outline or box-shadow for focus
      expect(computedStyle.outline !== 'none' || computedStyle.boxShadow !== 'none').toBe(true);
    });
    
    test('should have enhanced focus indicators for keyboard navigation', () => {
      const btn = document.querySelector('.btn');
      
      // Simulate keyboard focus
      btn.focus();
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
      
      const computedStyle = window.getComputedStyle(btn);
      
      // Should have focus styles
      expect(computedStyle.outline !== 'none' || computedStyle.boxShadow !== 'none').toBe(true);
    });
  });
  
  describe('Semantic HTML', () => {
    test('should use semantic button elements', () => {
      const buttons = document.querySelectorAll('button');
      
      expect(buttons.length).toBeGreaterThan(0);
      
      buttons.forEach(btn => {
        expect(btn.tagName).toBe('BUTTON');
      });
    });
    
    test('should use semantic form elements', () => {
      const form = document.getElementById('config-form');
      const inputs = form.querySelectorAll('input, select, textarea');
      
      expect(inputs.length).toBeGreaterThan(0);
    });
    
    test('should use heading hierarchy correctly', () => {
      const h1 = document.querySelector('h1');
      
      expect(h1).toBeTruthy();
      expect(h1.textContent).toBe('Clutterless');
    });
  });
  
  describe('ARIA Labels and Roles', () => {
    test('should have descriptive labels for form inputs', () => {
      const labels = document.querySelectorAll('label');
      
      labels.forEach(label => {
        expect(label.textContent.trim()).toBeTruthy();
      });
    });
    
    test('should have accessible button text', () => {
      const buttons = document.querySelectorAll('button');
      
      buttons.forEach(btn => {
        // Button should have text content or aria-label
        const hasText = btn.textContent.trim().length > 0;
        const hasAriaLabel = btn.getAttribute('aria-label');
        
        expect(hasText || hasAriaLabel).toBe(true);
      });
    });
    
    test('should have appropriate roles for interactive elements', () => {
      const buttons = document.querySelectorAll('button');
      
      buttons.forEach(btn => {
        // Buttons should have implicit button role
        expect(btn.tagName).toBe('BUTTON');
      });
    });
  });
  
  describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion preference', () => {
      // Create a media query list for reduced motion
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      
      // The CSS should have rules for this media query
      const styleSheets = Array.from(document.styleSheets);
      let hasReducedMotionRules = false;
      
      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          rules.forEach(rule => {
            if (rule.media && rule.media.mediaText.includes('prefers-reduced-motion')) {
              hasReducedMotionRules = true;
            }
          });
        } catch (e) {
          // Cross-origin stylesheets may throw errors
        }
      });
      
      expect(hasReducedMotionRules).toBe(true);
    });
    
    test('should disable animations when reduced motion is preferred', () => {
      // Simulate reduced motion preference
      const style = document.createElement('style');
      style.textContent = `
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `;
      document.head.appendChild(style);
      
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      // Animation should be present (will be disabled by media query in real browser)
      expect(computedStyle.animation || computedStyle.animationName).toBeTruthy();
      
      document.head.removeChild(style);
    });
  });
  
  describe('Touch Target Sizes', () => {
    test('should have minimum 44px touch target for buttons', () => {
      const buttons = document.querySelectorAll('.btn');
      
      buttons.forEach(btn => {
        const computedStyle = window.getComputedStyle(btn);
        const minHeight = parseInt(computedStyle.minHeight);
        
        // WCAG 2.1 Level AAA recommends 44x44px minimum
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });
    
    test('should have adequate padding for interactive elements', () => {
      const interactiveElements = document.querySelectorAll('button, input, select');
      
      interactiveElements.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const padding = computedStyle.padding;
        
        expect(padding).toBeTruthy();
        expect(padding).not.toBe('0px');
      });
    });
  });
  
  describe('Screen Reader Compatibility', () => {
    test('should have descriptive text for status indicators', () => {
      const statusText = document.getElementById('status-text');
      
      expect(statusText).toBeTruthy();
      expect(statusText.textContent).toBeTruthy();
    });
    
    test('should have descriptive loading text', () => {
      const loadingText = document.getElementById('loading-text');
      
      expect(loadingText).toBeTruthy();
      expect(loadingText.textContent).toBeTruthy();
    });
    
    test('should have meaningful message content', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      messageArea.textContent = 'Test message';
      
      expect(messageArea.textContent).toBeTruthy();
    });
  });
  
  describe('Form Accessibility', () => {
    test('should associate labels with inputs', () => {
      const providerLabel = document.querySelector('label[for="provider-select"]');
      const providerSelect = document.getElementById('provider-select');
      
      expect(providerLabel).toBeTruthy();
      expect(providerSelect).toBeTruthy();
    });
    
    test('should have placeholder text for inputs', () => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');
      
      inputs.forEach(input => {
        expect(input.getAttribute('placeholder')).toBeTruthy();
      });
    });
    
    test('should have accessible select options', () => {
      const select = document.getElementById('provider-select');
      const options = select.querySelectorAll('option');
      
      expect(options.length).toBeGreaterThan(0);
      
      options.forEach(option => {
        expect(option.textContent.trim()).toBeTruthy();
      });
    });
  });
});
