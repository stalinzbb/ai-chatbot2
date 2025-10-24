/**
 * Test Chat API Script
 *
 * This script tests the chat API endpoint directly to see if it's working.
 * Run with: npx tsx scripts/test-chat-api.ts
 */

async function testChatAPI() {
  console.log('🧪 Testing Chat API...\n');

  const testMessage = {
    id: 'test-chat-id',
    message: {
      id: 'test-message-id',
      role: 'user',
      parts: [{ type: 'text', text: 'Hello, can you help me?' }],
    },
    selectedChatModel: 'chat-model',
    selectedVisibilityType: 'private',
  };

  try {
    console.log('📤 Sending test message to API...');
    console.log('Message:', JSON.stringify(testMessage, null, 2));
    console.log('');

    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage),
    });

    console.log('📥 Response status:', response.status, response.statusText);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('');

    if (!response.ok) {
      console.error('❌ API returned error status');
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    // Read the streaming response
    if (!response.body) {
      console.error('❌ No response body');
      return;
    }

    console.log('✅ Streaming response started...');
    console.log('Reading stream:');
    console.log('─'.repeat(80));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log('─'.repeat(80));
        console.log('✅ Stream ended');
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventCount++;
          const data = line.slice(6);

          // Only show first 5 events and last few
          if (eventCount <= 5 || eventCount % 10 === 0) {
            console.log(`Event ${eventCount}:`, data.substring(0, 100) + (data.length > 100 ? '...' : ''));
          }
        }
      }
    }

    console.log('');
    console.log(`📊 Total events received: ${eventCount}`);
    console.log('');
    console.log('✅ Chat API test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:');
    console.error(error);

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Make sure the dev server is running: pnpm dev');
      }
    }
  }
}

// Run the test
testChatAPI();
