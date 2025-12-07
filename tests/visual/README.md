# Visual Testing Suite

This directory contains comprehensive visual and UI testing for the Clutterless extension's UI enhancements.

## Test Files

### 11.1 Visual Regression Testing (`visual-regression.test.js`)
Tests that verify all UI states display correctly with proper styling:
- Initial unconfigured state
- Configuration form states
- Button styling (gradients, shadows, rounded corners)
- Input field styling
- Card components
- Loading indicators
- Message components
- Animation presence

**Requirements Covered**: All

### 11.2 Cross-Browser Compatibility (`cross-browser.test.js`)
Tests that verify CSS enhancements work across browsers with proper fallbacks:
- CSS custom properties support
- Gradient support and fallbacks
- Border radius support
- Box shadow support
- Animation and transition support
- Flexbox layout
- Font family support

**Requirements Covered**: All

### 11.3 Responsive Behavior (`responsive.test.js`)
Tests that verify the UI adapts correctly to different widths and content states:
- Minimum width (300px) layout
- Maximum width (800px) layout
- Configuration section expansion (Requirement 7.1)
- Provider switching layout (Requirement 7.2)
- Long error message wrapping (Requirement 7.3)
- Custom prompt textarea expansion (Requirement 7.4)
- Configure button centering (Requirement 7.5)

**Requirements Covered**: 7.1, 7.2, 7.3, 7.4, 7.5

### 11.4 Accessibility Compliance (`accessibility.test.js`)
Tests that verify WCAG 2.1 AA compliance:
- Color contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Keyboard navigation
- Focus indicators
- Semantic HTML
- ARIA labels and roles
- Reduced motion support
- Touch target sizes (44px minimum)
- Screen reader compatibility
- Form accessibility

**Requirements Covered**: All

### 11.5 Animation Performance (`animation-performance.test.js`)
Tests that verify animations run smoothly using GPU-accelerated properties:
- GPU-accelerated properties (transform, opacity)
- Animation timing (150ms, 200ms, 300ms, 400ms)
- Will-change property usage
- Animation smoothness
- Animation optimization
- Animation states and keyframes
- Performance metrics
- Transition performance

**Requirements Covered**: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6

## Running Tests

### Run all visual tests:
```bash
npm test -- tests/visual/
```

### Run specific test file:
```bash
npm test -- tests/visual/visual-regression.test.js
npm test -- tests/visual/cross-browser.test.js
npm test -- tests/visual/responsive.test.js
npm test -- tests/visual/accessibility.test.js
npm test -- tests/visual/animation-performance.test.js
```

### Run with watch mode:
```bash
npm run test:watch -- tests/visual/
```

## Manual Testing Checklist

While automated tests cover most scenarios, some aspects require manual verification:

### Visual Regression (11.1)
- [ ] Open extension popup in Chrome
- [ ] Verify all UI elements have rounded corners
- [ ] Verify gradient backgrounds on buttons and messages
- [ ] Verify shadows on cards and buttons
- [ ] Verify animations play smoothly
- [ ] Take screenshots of all states for comparison

### Cross-Browser Compatibility (11.2)
- [ ] Test in Chrome (latest)
- [ ] Test in Edge (latest)
- [ ] Verify gradients display correctly
- [ ] Verify fallback colors work in older browsers
- [ ] Verify animations work smoothly

### Responsive Behavior (11.3)
- [ ] Test at 300px width (minimum)
- [ ] Test at 800px width (maximum)
- [ ] Verify configuration section expands smoothly
- [ ] Verify provider switching animates correctly
- [ ] Verify long error messages wrap properly
- [ ] Verify textarea expands correctly

### Accessibility Compliance (11.4)
- [ ] Run axe DevTools audit (should have 0 violations)
- [ ] Test keyboard navigation (Tab, Shift+Tab, Enter, Space)
- [ ] Verify focus indicators are visible
- [ ] Test with screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Verify color contrast with contrast checker tool
- [ ] Test with prefers-reduced-motion enabled

### Animation Performance (11.5)
- [ ] Open Chrome DevTools Performance tab
- [ ] Record while interacting with UI
- [ ] Verify animations run at 60fps
- [ ] Check for layout thrashing
- [ ] Verify no janky animations
- [ ] Test on lower-end hardware if available

## Test Results

Document test results here:

### Automated Tests
- Visual Regression: ✓ PASS
- Cross-Browser: ✓ PASS
- Responsive: ✓ PASS
- Accessibility: ✓ PASS
- Animation Performance: ✓ PASS

### Manual Tests
- Visual Regression: ⏳ PENDING
- Cross-Browser: ⏳ PENDING
- Responsive: ⏳ PENDING
- Accessibility: ⏳ PENDING
- Animation Performance: ⏳ PENDING

## Notes

The automated tests verify the structure and presence of CSS properties. For complete verification, manual testing in a real browser environment is recommended, especially for:
- Visual appearance and aesthetics
- Animation smoothness and timing
- Cross-browser rendering differences
- Accessibility with real assistive technologies
- Performance on different hardware
