import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Test credentials from environment variables
const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  sessionToken: process.env.AWS_SESSION_TOKEN || '',
  region: process.env.AWS_REGION || 'us-east-1'
};

// Validate that credentials are provided
if (!credentials.accessKeyId || !credentials.secretAccessKey) {
  console.error('❌ ERROR: AWS credentials not found!');
  console.error('\nPlease set the following environment variables:');
  console.error('  export AWS_ACCESS_KEY_ID=<your-access-key>');
  console.error('  export AWS_SECRET_ACCESS_KEY=<your-secret-key>');
  console.error('  export AWS_SESSION_TOKEN=<your-session-token>  # Required for temporary credentials (ASIA...)');
  console.error('  export AWS_REGION=us-east-1  # Optional, defaults to us-east-1');
  console.error('\nThen run: node test-bedrock-integration.js');
  process.exit(1);
}

// Check if this is a temporary credential (starts with ASIA)
if (credentials.accessKeyId.startsWith('ASIA') && !credentials.sessionToken) {
  console.error('❌ ERROR: Temporary credentials detected but AWS_SESSION_TOKEN is missing!');
  console.error('\nTemporary credentials (starting with ASIA) require three parts:');
  console.error('  1. AWS_ACCESS_KEY_ID');
  console.error('  2. AWS_SECRET_ACCESS_KEY');
  console.error('  3. AWS_SESSION_TOKEN (MISSING!)');
  console.error('\nPlease provide the session token or use permanent credentials (starting with AKIA).');
  process.exit(1);
}

console.log('Testing Bedrock integration...');
console.log('Region:', credentials.region);
console.log('Access Key:', credentials.accessKeyId.substring(0, 8) + '...');

async function testBedrockCall() {
  try {
    // Create Bedrock client
    const clientConfig = {
      region: credentials.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey
      }
    };
    
    // Add session token if present (required for temporary credentials)
    if (credentials.sessionToken) {
      clientConfig.credentials.sessionToken = credentials.sessionToken;
      console.log('Using temporary credentials with session token');
    }
    
    const client = new BedrockRuntimeClient(clientConfig);

    console.log('\n✓ Bedrock client created successfully');

    // Prepare a simple test prompt
    const prompt = 'Say "Hello, Bedrock is working!" in one sentence.';
    
    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };

    console.log('\nSending test request to Bedrock...');
    console.log('Model: anthropic.claude-3-haiku-20240307-v1:0');

    // Invoke the model
    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    });

    const response = await client.send(command);
    
    console.log('\n✓ Response received from Bedrock');

    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('\n--- Bedrock Response ---');
    console.log('Status:', response.$metadata.httpStatusCode);
    console.log('Request ID:', response.$metadata.requestId);
    console.log('\nContent:', responseBody.content[0].text);
    console.log('Stop Reason:', responseBody.stop_reason);
    console.log('Usage:', JSON.stringify(responseBody.usage, null, 2));
    
    console.log('\n✅ SUCCESS! Bedrock integration is working correctly.');
    return true;

  } catch (error) {
    console.error('\n❌ ERROR:', error.name);
    console.error('Message:', error.message);
    
    if (error.name === 'UnrecognizedClientException') {
      console.error('\n💡 This usually means:');
      console.error('   - Invalid access key or secret key');
      console.error('   - Credentials are for a different region');
    } else if (error.name === 'InvalidSignatureException') {
      console.error('\n💡 This usually means:');
      console.error('   - Secret key is incorrect');
      console.error('   - Credentials have been rotated');
    } else if (error.name === 'AccessDeniedException') {
      console.error('\n💡 This usually means:');
      console.error('   - IAM user/role lacks bedrock:InvokeModel permission');
      console.error('   - Model access not enabled in Bedrock console');
    } else if (error.name === 'ResourceNotFoundException') {
      console.error('\n💡 This usually means:');
      console.error('   - Model not available in this region');
      console.error('   - Try region: us-east-1 or us-west-2');
    }
    
    return false;
  }
}

// Run the test
testBedrockCall().then(success => {
  process.exit(success ? 0 : 1);
});
