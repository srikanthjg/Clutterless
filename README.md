# Clutterless

A Chrome extension that uses AI to intelligently organize browser tabs into logical groups. Reduce tab clutter and improve productivity with automatic or custom-prompted tab organization powered by AWS Bedrock, Google Gemini, or local LLM models.

## Features

- **Automatic Tab Grouping**: Let AI analyze and organize your tabs based on content and context
- **Custom Prompt Grouping**: Provide specific instructions for how you want tabs organized
- **Multiple LLM Providers**: Choose from AWS Bedrock, Google Gemini, or local LLM servers
- **Secure Credential Storage**: Your API keys are stored securely using Chrome's encrypted storage
- **Smart Metadata Extraction**: Intelligently extracts page titles, URLs, and content previews
- **Batch Processing**: Handles large numbers of tabs efficiently (50+ tabs)
- **Privacy-Focused**: Only sends necessary metadata to the LLM, excludes sensitive data
- **Modern UI Design**: Polished interface with rounded corners, gradients, smooth animations, and enhanced accessibility

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top right
4. Click "Load unpacked"
5. Select the directory containing this extension
6. The Clutterless icon should appear in your Chrome toolbar

### Dependencies

Install Node.js dependencies for development and testing:

```bash
npm install
```

## Configuration

Before using the extension, you need to configure your preferred LLM provider. Click the extension icon and select "Configure" to get started.

### Option 1: AWS Bedrock

AWS Bedrock provides access to Claude and other foundation models.

**Prerequisites:**
- AWS account with Bedrock access enabled
- IAM user with Bedrock permissions
- AWS credentials (Access Key ID and Secret Access Key)

**Setup Steps:**
1. Click the extension icon
2. Select "AWS Bedrock" as your provider
3. Enter your AWS credentials:
   - **Access Key ID**: Your AWS access key (e.g., `AKIAIOSFODNN7EXAMPLE`)
   - **Secret Access Key**: Your AWS secret key
   - **Region**: AWS region where Bedrock is available (e.g., `us-east-1`, `us-west-2`)
4. Click "Save Configuration"

**Supported Models:**
- Claude 3 Sonnet
- Claude 3 Haiku

**IAM Permissions Required:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": "arn:aws:bedrock:*::foundation-model/*"
    }
  ]
}
```

### Option 2: Google Gemini

Google Gemini provides powerful AI capabilities through a simple API.

**Prerequisites:**
- Google Cloud account
- Gemini API key

**Setup Steps:**
1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Click the extension icon
3. Select "Google Gemini" as your provider
4. Enter your API key
5. Click "Save Configuration"

**Supported Models:**
- Gemini Pro

### Option 3: Local LLM

Run your own LLM locally using Ollama, LM Studio, or other OpenAI-compatible servers.

**Prerequisites:**
- Local LLM server running (Ollama, LM Studio, LocalAI, etc.)
- Server accessible via HTTP/HTTPS

**Setup Steps:**
1. Start your local LLM server (see examples below)
2. Click the extension icon
3. Select "Local LLM" as your provider
4. Enter your endpoint URL (e.g., `http://localhost:11434/v1/chat/completions`)
5. (Optional) Enter API key if your server requires authentication
6. Click "Save Configuration"

**Ollama Example:**
```bash
# Install Ollama from https://ollama.ai
# Pull a model
ollama pull llama3

# Ollama automatically provides OpenAI-compatible API at:
# http://localhost:11434/v1/chat/completions
```

**LM Studio Example:**
```bash
# Download LM Studio from https://lmstudio.ai
# Load a model in LM Studio
# Enable "Local Server" in LM Studio settings
# Default endpoint: http://localhost:1234/v1/chat/completions
```

**LocalAI Example:**
```bash
# Run LocalAI with Docker
docker run -p 8080:8080 localai/localai:latest

# Endpoint: http://localhost:8080/v1/chat/completions
```

## Usage

### Automatic Tab Grouping

Let the AI automatically analyze and organize your tabs:

1. Open multiple tabs you want to organize
2. Click the extension icon
3. Click "Auto Group"
4. Wait for the AI to analyze your tabs (usually 5-10 seconds)
5. Your tabs will be organized into logical groups

**Example Result:**
- Group "Work" (blue): Work-related tabs, project documentation
- Group "Research" (green): Articles, papers, reference materials
- Group "Shopping" (red): E-commerce sites, product pages
- Group "Social" (yellow): Social media, communication platforms

### Custom Prompt Grouping

Provide specific instructions for how you want tabs organized:

1. Click the extension icon
2. Click "Custom Group"
3. Enter your grouping instructions, for example:
   - "Group by project: Frontend, Backend, DevOps"
   - "Separate work tabs from personal tabs"
   - "Group all documentation together"
   - "Create groups for each programming language"
4. Click "Submit"
5. Your tabs will be organized according to your instructions

### Tips for Best Results

- **Be specific**: Clear instructions yield better grouping results
- **Limit groups**: Aim for 3-7 groups for optimal organization
- **Regular cleanup**: Group tabs regularly before they accumulate
- **Descriptive titles**: Pages with clear titles are easier to group
- **Review results**: The AI makes suggestions; adjust groups manually if needed

## Troubleshooting

### "Invalid credentials" error

**Problem**: Your API credentials are not working.

**Solutions:**
- **AWS Bedrock**: Verify your Access Key ID and Secret Access Key are correct
- **Google Gemini**: Check your API key at [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Local LLM**: Ensure your server is running and the endpoint URL is correct
- Try reconfiguring with fresh credentials

### "Cannot access some tabs" warning

**Problem**: Some tabs cannot be grouped.

**Explanation**: Chrome restricts access to certain pages for security:
- `chrome://` pages (settings, extensions)
- `chrome-extension://` pages
- Chrome Web Store pages
- Some restricted internal pages

**Solution**: This is normal behavior. These tabs will remain ungrouped.

### "API rate limit exceeded" error

**Problem**: Too many requests to the LLM API.

**Solutions:**
- Wait a few minutes before trying again
- **AWS Bedrock**: Check your service quotas in AWS Console
- **Google Gemini**: Review your API quota limits
- **Local LLM**: Ensure your server has sufficient resources

### "Network error" message

**Problem**: Cannot connect to the LLM service.

**Solutions:**
- Check your internet connection
- **AWS Bedrock**: Verify the region is correct and Bedrock is available
- **Google Gemini**: Check if the Gemini API is accessible from your location
- **Local LLM**: Ensure your server is running (`curl http://localhost:11434/v1/models`)
- Check firewall settings

### Extension not working after installation

**Problem**: Extension icon appears but doesn't respond.

**Solutions:**
1. Check Chrome DevTools for errors:
   - Right-click extension icon → "Inspect popup"
   - Check Console for error messages
2. Reload the extension:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension
3. Check permissions:
   - Ensure the extension has required permissions
   - Try reinstalling the extension

### Groups not created as expected

**Problem**: The AI creates unexpected groupings.

**Solutions:**
- Try using Custom Prompt mode with specific instructions
- Ensure tabs have descriptive titles
- Check that page content loaded properly before grouping
- Try grouping fewer tabs at once (20-30 tabs)
- Different LLM providers may produce different results; try another provider

### Local LLM not responding

**Problem**: Local LLM endpoint configured but not working.

**Solutions:**
1. Verify server is running:
   ```bash
   # For Ollama
   curl http://localhost:11434/v1/models
   
   # For LM Studio
   curl http://localhost:1234/v1/models
   ```
2. Check endpoint URL format:
   - Must include full path: `/v1/chat/completions`
   - Use `http://` for localhost (HTTPS not required)
3. Check server logs for errors
4. Ensure model is loaded in your LLM server
5. Try a different model if current one isn't responding

## UI Design & Visual Enhancements

Clutterless features a modern, polished user interface built with a comprehensive design system approach. The UI enhancements focus on creating a professional, accessible, and visually appealing experience.

### Design System

The extension uses a **CSS design token system** for consistency and maintainability:

- **Color Gradients**: Smooth gradient backgrounds for buttons and messages
  - Primary gradient (purple): Used for main action buttons
  - Success gradient (green): Used for success messages
  - Error gradient (red): Used for error messages
  - Background gradient (light gray): Subtle background for the main container

- **Spacing Scale**: Consistent spacing throughout the interface
  - Extra small (4px), Small (8px), Medium (12px), Large (16px), Extra large (24px)

- **Border Radius Scale**: Modern rounded corners on all elements
  - Small (6px): Input fields
  - Medium (8px): Buttons and messages
  - Large (12px): Card containers
  - Extra large (16px): Main popup window
  - Full (50%): Circular elements like loading spinner

- **Shadow System**: Depth and elevation through shadows
  - Small shadow: Base buttons and elements
  - Medium shadow: Cards and hover states
  - Large shadow: Popup window
  - Focus shadow: Interactive elements when focused

- **Typography**: Clean, readable text hierarchy
  - System font stack for native feel
  - Semibold weights for buttons and headings
  - 14px base font size for comfortable reading

### Visual Features

**Smooth Animations**
- Fade-in animation when popup opens (200ms)
- Slide-in animation for success/error messages (400ms)
- Smooth rotation for loading spinner
- Scale-down effect on button clicks (150ms)
- Hover effects with subtle lift and shadow enhancement
- Shake animation for error messages to draw attention

**Interactive Feedback**
- Gradient backgrounds that brighten on hover
- Colored shadows on input focus
- Visual depth through layered shadows
- Animated checkmark icon for successful operations
- Smooth transitions between all UI states

**Responsive Layout**
- Expandable configuration section with smooth height transitions
- Adaptive layout when switching between LLM providers
- Text wrapping for long error messages
- Expandable textarea for custom prompts
- Centered layout when no configuration exists

### Accessibility

The UI is designed with **WCAG 2.1 AA compliance** in mind:

- **Color Contrast**: All text meets minimum 4.5:1 contrast ratio
  - Primary gradient with white text: 4.5:1+ contrast
  - Success gradient with white text: 4.5:1+ contrast
  - Error gradient with white text: 7:1+ contrast (AAA compliant)

- **Keyboard Navigation**: Full keyboard accessibility
  - Visible focus indicators on all interactive elements
  - Logical tab order through the interface
  - Enhanced focus states for keyboard users

- **Reduced Motion Support**: Respects user preferences
  - Animations disabled for users with motion sensitivity
  - Transitions reduced to minimal durations
  - `prefers-reduced-motion` media query support

- **Touch Targets**: Minimum 44px height for all buttons
- **Screen Reader Support**: Semantic HTML and ARIA labels

### Browser Compatibility

The UI uses modern CSS features with graceful fallbacks:

- **CSS Custom Properties**: Full support in Chrome 88+
- **CSS Gradients**: Solid color fallbacks for older browsers
- **Flexbox & Grid**: Full support in target browsers
- **Progressive Enhancement**: Core functionality works without advanced CSS

### Performance Optimization

- **GPU-Accelerated Animations**: Uses `transform` and `opacity` for 60fps animations
- **Efficient Selectors**: Minimal specificity conflicts
- **Will-Change Property**: Applied judiciously for smooth animations
- **Paint Optimization**: Minimized repaints and reflows

## Privacy & Security

- **Credential Storage**: API keys are encrypted using Chrome's secure storage API
- **Data Transmission**: Only tab titles, URLs, and content previews are sent to the LLM
- **No Logging**: Sensitive information is never logged
- **HTTPS Only**: All cloud API communications use secure HTTPS connections
- **Sensitive Data Filtering**: Password fields and credit card inputs are excluded
- **Local Processing**: When using local LLM, data never leaves your machine

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- lib/llm-provider.test.js
```

### Project Structure

```
├── manifest.json           # Extension manifest (Manifest V3)
├── popup/                  # Popup UI
│   ├── popup.html         # UI structure
│   ├── popup.css          # Styling
│   └── popup.js           # UI logic
├── background/             # Service worker
│   └── background.js      # Background processing
├── content/                # Content scripts
│   └── content.js         # Tab metadata extraction
├── lib/                    # Shared libraries
│   ├── llm-provider.js    # LLM provider abstraction
│   ├── storage-manager.js # Credential storage
│   ├── tab-manager.js     # Tab operations
│   ├── error-handler.js   # Error handling
│   └── error-logger.js    # Error logging
├── tests/                  # Test files
│   └── integration/       # Integration tests
└── icons/                  # Extension icons
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

## Acknowledgments

- Built with Chrome Extension Manifest V3
- Powered by AWS Bedrock, Google Gemini, and local LLM providers
- Inspired by the need for better tab management in modern browsers

## Repository

https://github.com/srikanthjg/Clutterless
