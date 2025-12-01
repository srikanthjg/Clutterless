# Extension Icons

This directory contains the extension icons in the required sizes:
- ✅ icon16.png (16x16) - Toolbar icon
- ✅ icon48.png (48x48) - Extension management page
- ✅ icon128.png (128x128) - Chrome Web Store and installation

## Source Icon
- `llm-tab-group.png` - Original source icon

## Regenerating Icons

If you update the source icon, run the generation script:
```bash
./generate-icons.sh
```

This script uses `sips` (built-in macOS tool) to resize the source icon to all required sizes.
