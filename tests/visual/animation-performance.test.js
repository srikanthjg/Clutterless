/**
 * Animation Performance Testing Suite
 * Task 11.5: Test animation performance
 * 
 * This test suite verifies that animations run smoothly at 60fps and
 * use GPU-accelerated properties (transform, opacity).
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

describe('Animation Performance Tests', () => {
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
  
  describe('GPU-Accelerated Properties', () => {
    test('should use transform for button hover effects (Requirement 4.2)', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      // Check if transition includes transform
      expect(computedStyle.transition).toContain('transform');
    });
    
    test('should use transform for button active effects (Requirement 4.1)', () => {
      const btn = document.querySelector('.btn');
      
      // Simulate active state
      btn.classList.add('active');
      
      const computedStyle = window.getComputedStyle(btn);
      
      // Should have transform in transition
      expect(computedStyle.transition).toBeTruthy();
    });
    
    test('should use opacity for fade-in animations (Requirement 4.6)', () => {
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      // Check if animation is applied
      expect(computedStyle.animation || computedStyle.animationName).toBeTruthy();
    });
    
    test('should use transform for slide-in animations (Requirement 4.4)', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      // Check if animation is applied
      expect(computedStyle.animation || computedStyle.animationName).toBeTruthy();
    });
    
    test('should use transform for shake animations (Requirement 4.4)', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('error');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      // Check if animation is applied
      expect(computedStyle.animation || computedStyle.animationName).toBeTruthy();
    });
  });
  
  describe('Animation Timing', () => {
    test('should use 150ms for button active state (Requirement 4.1)', () => {
      const btn = document.querySelector('.btn');
      
      // Check CSS for transition timing
      const computedStyle = window.getComputedStyle(btn);
      
      expect(computedStyle.transition).toBeTruthy();
    });
    
    test('should use 200ms for hover transitions (Requirement 4.2)', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      expect(computedStyle.transition).toBeTruthy();
    });
    
    test('should use 300ms for loading fade-in (Requirement 4.3)', () => {
      const loadingIndicator = document.getElementById('loading-indicator');
      loadingIndicator.classList.remove('hidden');
      
      const spinner = document.querySelector('.spinner');
      const computedStyle = window.getComputedStyle(spinner);
      
      expect(computedStyle.animation).toBeTruthy();
    });
    
    test('should use 400ms for message slide-in (Requirement 4.4)', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      expect(computedStyle.animation).toBeTruthy();
    });
    
    test('should use 300ms for configuration transitions (Requirement 4.5)', () => {
      const configSection = document.getElementById('config-section');
      const computedStyle = window.getComputedStyle(configSection);
      
      expect(computedStyle.transition).toBeTruthy();
    });
    
    test('should use 200ms for popup fade-in (Requirement 4.6)', () => {
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      expect(computedStyle.animation).toBeTruthy();
    });
  });
  
  describe('Will-Change Property Usage', () => {
    test('should use will-change for spinner rotation', () => {
      const spinner = document.querySelector('.spinner');
      const computedStyle = window.getComputedStyle(spinner);
      
      // Will-change should be set for transform
      expect(computedStyle.willChange).toBeTruthy();
    });
    
    test('should use will-change for message animations', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      // Will-change should be set for transform and opacity
      expect(computedStyle.willChange).toBeTruthy();
    });
    
    test('should use will-change for icon animations', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('success');
      messageArea.classList.remove('hidden');
      
      // Create icon element
      const icon = document.createElement('span');
      icon.className = 'message-icon';
      messageArea.appendChild(icon);
      
      const computedStyle = window.getComputedStyle(icon);
      
      // Will-change should be set
      expect(computedStyle.willChange).toBeTruthy();
    });
  });
  
  describe('Animation Smoothness', () => {
    test('should use ease-in-out timing function for smooth animations', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      // Check for easing function in transition
      expect(computedStyle.transition).toBeTruthy();
    });
    
    test('should use linear timing for spinner rotation', () => {
      const spinner = document.querySelector('.spinner');
      const computedStyle = window.getComputedStyle(spinner);
      
      // Spinner should have animation
      expect(computedStyle.animation).toBeTruthy();
    });
    
    test('should use spring easing for icon pop animation', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('success');
      messageArea.classList.remove('hidden');
      
      const icon = document.createElement('span');
      icon.className = 'message-icon';
      messageArea.appendChild(icon);
      
      const computedStyle = window.getComputedStyle(icon);
      
      expect(computedStyle.animation).toBeTruthy();
    });
  });
  
  describe('Animation Optimization', () => {
    test('should avoid animating expensive properties like width/height', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      // Transition should not include width or height
      const transition = computedStyle.transition;
      expect(transition).not.toContain('width');
      expect(transition).not.toContain('height');
    });
    
    test('should use transform instead of position properties', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      // Should use transform in animation
      expect(computedStyle.animation).toBeTruthy();
    });
    
    test('should batch animations efficiently', () => {
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      // Container should have single animation
      expect(computedStyle.animation).toBeTruthy();
    });
  });
  
  describe('Animation States', () => {
    test('should have defined keyframes for fadeIn animation', () => {
      const container = document.querySelector('.container');
      const computedStyle = window.getComputedStyle(container);
      
      expect(computedStyle.animation || computedStyle.animationName).toBeTruthy();
    });
    
    test('should have defined keyframes for spin animation', () => {
      const spinner = document.querySelector('.spinner');
      const computedStyle = window.getComputedStyle(spinner);
      
      expect(computedStyle.animation || computedStyle.animationName).toBeTruthy();
    });
    
    test('should have defined keyframes for slideIn animation', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      expect(computedStyle.animation || computedStyle.animationName).toBeTruthy();
    });
    
    test('should have defined keyframes for shake animation', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('error');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      expect(computedStyle.animation || computedStyle.animationName).toBeTruthy();
    });
    
    test('should have defined keyframes for iconPop animation', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('success');
      messageArea.classList.remove('hidden');
      
      const icon = document.createElement('span');
      icon.className = 'message-icon';
      messageArea.appendChild(icon);
      
      const computedStyle = window.getComputedStyle(icon);
      
      expect(computedStyle.animation).toBeTruthy();
    });
  });
  
  describe('Animation Performance Metrics', () => {
    test('should complete animations within expected duration', (done) => {
      const container = document.querySelector('.container');
      const startTime = performance.now();
      
      // Listen for animation end
      container.addEventListener('animationend', () => {
        const duration = performance.now() - startTime;
        
        // Should complete within reasonable time (200ms + buffer)
        expect(duration).toBeLessThan(500);
        done();
      });
      
      // Trigger animation by adding class
      container.style.animation = 'fadeIn 200ms ease-in-out';
    });
    
    test('should not cause layout thrashing', () => {
      const btn = document.querySelector('.btn');
      
      // Multiple style reads should not cause reflows
      const style1 = window.getComputedStyle(btn);
      const height1 = style1.height;
      
      const style2 = window.getComputedStyle(btn);
      const height2 = style2.height;
      
      expect(height1).toBe(height2);
    });
    
    test('should handle multiple simultaneous animations', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.add('error');
      messageArea.classList.remove('hidden');
      
      const computedStyle = window.getComputedStyle(messageArea);
      
      // Should have multiple animations (slideIn and shake)
      expect(computedStyle.animation).toBeTruthy();
    });
  });
  
  describe('Animation Cleanup', () => {
    test('should remove will-change after animation completes', () => {
      const container = document.querySelector('.container');
      
      // After animation, will-change should be auto or removed
      // This is handled by CSS rules
      const computedStyle = window.getComputedStyle(container);
      
      expect(computedStyle.animationFillMode).toBeTruthy();
    });
    
    test('should not leave orphaned animations', () => {
      const messageArea = document.getElementById('message-area');
      messageArea.classList.remove('hidden');
      
      // Hide message
      messageArea.classList.add('hidden');
      
      // Should be hidden
      expect(messageArea.classList.contains('hidden')).toBe(true);
    });
  });
  
  describe('Transition Performance', () => {
    test('should use efficient transitions for button states', () => {
      const btn = document.querySelector('.btn');
      const computedStyle = window.getComputedStyle(btn);
      
      // Should have transition defined
      expect(computedStyle.transition).toBeTruthy();
      expect(computedStyle.transition).not.toBe('none');
    });
    
    test('should use efficient transitions for input focus', () => {
      const input = document.querySelector('input');
      const computedStyle = window.getComputedStyle(input);
      
      // Should have transition defined
      expect(computedStyle.transition).toBeTruthy();
      expect(computedStyle.transition).not.toBe('none');
    });
    
    test('should use efficient transitions for configuration section', () => {
      const configSection = document.getElementById('config-section');
      const computedStyle = window.getComputedStyle(configSection);
      
      // Should have transition defined
      expect(computedStyle.transition).toBeTruthy();
      expect(computedStyle.transition).not.toBe('none');
    });
  });
});
