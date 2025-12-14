# Testing Bedrock Integration

## Quick Test

To verify your AWS Bedrock credentials work with the extension:

### 1. Set Environment Variables

**For temporary credentials (starting with ASIA):**
```bash
export AWS_ACCESS_KEY_ID=ASIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_SESSION_TOKEN=...
export AWS_REGION=us-east-1  # Optional, defaults to us-east-1
```

**For permanent credentials (starting with AKIA):**
```bash
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1  # Optional, defaults to us-east-1
```

### 2. Run the Test

```bash
node test-bedrock-integration.js
```

### 3. Expected Output

If successful, you should see:
```
Testing Bedrock integration...
Region: us-east-1
Access Key: ASIA... or AKIA...

✓ Bedrock client created successfully

Sending test request to Bedrock...
Model: anthropic.claude-3-haiku-20240307-v1:0

✓ Response received from Bedrock

--- Bedrock Response ---
Status: 200
Request ID: ...

Content: Hello, Bedrock is working!
Stop Reason: end_turn
Usage: {
  "input_tokens": 21,
  "output_tokens": 11
}

✅ SUCCESS! Bedrock integration is working correctly.
```

## Common Errors

### UnrecognizedClientException
- Invalid access key or secret key
- Credentials are for a different region

### InvalidSignatureException
- Secret key is incorrect
- Credentials have been rotated

### AccessDeniedException
- IAM user/role lacks `bedrock:InvokeModel` permission
- Model access not enabled in Bedrock console

### ResourceNotFoundException
- Model not available in this region
- Try region: us-east-1 or us-west-2

## Security Note

⚠️ **Never commit credentials to the repository!**

The test script uses environment variables to keep credentials secure. The actual test file (`test-bedrock-integration.js`) is in `.gitignore` to prevent accidental commits.

If you need to recreate the test file, copy from the example:
```bash
cp test-bedrock-integration.example.js test-bedrock-integration.js
```
