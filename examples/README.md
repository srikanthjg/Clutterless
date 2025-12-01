# Configuration Examples

This directory contains example configuration files for different LLM providers supported by the LLM Tab Grouper extension.

## Overview

The extension supports three types of LLM providers:

1. **AWS Bedrock** - Cloud-based AI service from Amazon Web Services
2. **Google Gemini** - Cloud-based AI service from Google
3. **Local LLM** - Self-hosted models running on your machine (Ollama, LM Studio, etc.)

## How to Use These Examples

These example files are for **reference only** and show the structure of configuration data. The actual configuration is done through the extension's popup interface.

### Configuration Steps

1. Click the LLM Tab Grouper extension icon in Chrome
2. Click "Configure" button
3. Select your preferred provider
4. Enter your credentials based on the examples below
5. Click "Save Configuration"

## Configuration Examples

### AWS Bedrock

**File:** `bedrock-config.example.json`

**What you need:**
- AWS Account with Bedrock access
- IAM user with `bedrock:InvokeModel` permission
- Access Key ID
- Secret Access Key
- AWS Region (e.g., us-east-1, us-west-2)

**Setup:**
1. Create an IAM user in AWS Console
2. Attach Bedrock permissions (see example file for policy)
3. Generate access keys
4. Enter credentials in the extension

**Supported Models:**
- Claude 3 Sonnet
- Claude 3 Haiku

**Cost:** Pay-per-use based on AWS Bedrock pricing

### Google Gemini

**File:** `gemini-config.example.json`

**What you need:**
- Google account
- Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

**Setup:**
1. Visit Google AI Studio
2. Create or select a project
3. Generate an API key
4. Enter the API key in the extension

**Supported Models:**
- Gemini Pro
- Gemini 1.5 Pro

**Cost:** Free tier available, pay-as-you-go for higher usage

### Ollama (Local LLM)

**File:** `ollama-config.example.json`

**What you need:**
- Ollama installed on your machine
- A downloaded model (e.g., llama3, mistral, phi3)

**Setup:**
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama3`
3. Verify it's running: `curl http://localhost:11434/api/tags`
4. Enter endpoint in extension: `http://localhost:11434/v1/chat/completions`
5. Leave API key blank (not required)

**Recommended Models:**
- **llama3** (4.7GB) - Excellent general-purpose model
- **mistral** (4.1GB) - Fast and efficient
- **phi3** (2.3GB) - Lightweight, good for limited resources
- **mixtral** (26GB) - High quality, requires more resources

**System Requirements:**
- Minimum: 8GB RAM, 10GB disk space
- Recommended: 16GB+ RAM, GPU optional but helpful

**Cost:** Free (runs locally)

### LM Studio (Local LLM)

**File:** `lmstudio-config.example.json`

**What you need:**
- LM Studio installed on your machine
- A downloaded model through LM Studio's interface

**Setup:**
1. Install LM Studio from [lmstudio.ai](https://lmstudio.ai)
2. Open LM Studio and go to "Discover" tab
3. Download a model (e.g., llama-3-8b-instruct, mistral-7b-instruct)
4. Go to "Local Server" tab
5. Select your model and click "Start Server"
6. Enter endpoint in extension: `http://localhost:1234/v1/chat/completions`
7. Leave API key blank (unless you configured one in LM Studio)

**Recommended Models:**
- **Llama 3 8B Instruct** (4.7GB) - Best balance of quality and speed
- **Mistral 7B Instruct** (4.1GB) - Fast responses
- **Phi-3 Mini** (2.3GB) - Lightweight option
- **Mixtral 8x7B Instruct** (26GB) - High quality, needs powerful hardware

**Quantization Guide:**
- **Q4_K_M** - Recommended for most users (best balance)
- **Q5_K_M** - Higher quality, larger size
- **Q3_K_M** - Smaller size for limited resources
- **Q8_0** - Highest quality, largest size

**System Requirements:**
- Minimum: 8GB RAM, 10GB disk space
- Recommended: 16GB+ RAM, NVIDIA GPU with 6GB+ VRAM

**Cost:** Free (runs locally)

## Choosing a Provider

### Choose AWS Bedrock if:
- You want high-quality AI responses
- You're already using AWS services
- You don't mind pay-per-use pricing
- You want cloud-based processing

### Choose Google Gemini if:
- You want a simple setup with just an API key
- You want to try the free tier first
- You prefer Google's AI models
- You want cloud-based processing

### Choose Local LLM (Ollama/LM Studio) if:
- Privacy is a top priority (data never leaves your machine)
- You want to avoid API costs
- You want to work offline
- You have sufficient hardware (8GB+ RAM)
- You're comfortable with local software setup

## Security Best Practices

### For Cloud Providers (Bedrock, Gemini):
- Never commit actual credentials to version control
- Use environment-specific credentials (dev vs prod)
- Rotate API keys regularly
- Monitor API usage and set up billing alerts
- Use least-privilege access (minimal required permissions)

### For Local LLM:
- Keep your LLM software updated
- If you enable API key authentication, use strong keys
- Be cautious when exposing the API to your network
- Monitor resource usage to prevent system slowdowns

## Troubleshooting

### AWS Bedrock
- **Invalid credentials**: Verify Access Key ID and Secret Key
- **Permission denied**: Check IAM policy includes `bedrock:InvokeModel`
- **Region error**: Ensure Bedrock is available in your selected region

### Google Gemini
- **Invalid API key**: Regenerate key in Google AI Studio
- **Quota exceeded**: Check usage limits in your project
- **Rate limit**: Wait a few minutes before retrying

### Ollama
- **Connection refused**: Verify Ollama is running (`ollama list`)
- **Model not found**: Pull the model first (`ollama pull <model>`)
- **Slow responses**: Try a smaller model or close other apps

### LM Studio
- **Server not running**: Check "Local Server" tab, ensure server is started
- **Model not loaded**: Select a model and wait for it to load
- **Port conflict**: Change port in LM Studio settings if 1234 is in use

## Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Ollama Documentation](https://github.com/ollama/ollama)
- [LM Studio Documentation](https://lmstudio.ai/docs)

## Support

For issues with the extension itself, please open an issue on GitHub.

For provider-specific issues:
- AWS Bedrock: Contact AWS Support
- Google Gemini: Check Google AI Studio support
- Ollama: Visit Ollama GitHub or Discord
- LM Studio: Visit LM Studio Discord or support channels
