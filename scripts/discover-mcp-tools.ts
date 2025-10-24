/**
 * MCP Discovery Script
 *
 * This script connects to the Figma Desktop MCP server and discovers:
 * 1. Available tools/methods
 * 2. Their input schemas
 * 3. Tool descriptions
 *
 * Run with: npx tsx scripts/discover-mcp-tools.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const MCP_SERVER_URL = 'http://127.0.0.1:3845/mcp';

async function discoverMCPTools() {
  console.log('🔍 Discovering Figma Desktop MCP server tools...\n');
  console.log(`📡 Connecting to: ${MCP_SERVER_URL}\n`);

  let client: Client | null = null;

  try {
    // Create StreamableHTTP transport for HTTP MCP server
    console.log('1️⃣  Creating StreamableHTTP transport...');
    const transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));

    // Create MCP client
    console.log('2️⃣  Creating MCP client...');
    client = new Client(
      {
        name: 'figma-mcp-discovery',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Connect to the server
    console.log('3️⃣  Connecting to Figma Desktop MCP server...');
    await client.connect(transport);
    console.log('   ✅ Connected successfully!\n');

    // Get server info
    const serverVersion = await client.getServerVersion();
    console.log('📋 Server Information:');
    console.log(`   Protocol Version: ${serverVersion?.protocolVersion || 'Unknown'}`);
    console.log('');

    // List available tools
    console.log('4️⃣  Requesting tools list...');
    const toolsResponse = await client.listTools();

    if (!toolsResponse.tools || toolsResponse.tools.length === 0) {
      console.log('⚠️  No tools found!');
      return;
    }

    console.log(`   ✅ Found ${toolsResponse.tools.length} tools!\n`);
    console.log('═'.repeat(80));

    toolsResponse.tools.forEach((tool, index) => {
      console.log(`\n${index + 1}. ${tool.name}`);
      console.log('─'.repeat(80));

      if (tool.description) {
        console.log(`Description: ${tool.description}`);
      }

      if (tool.inputSchema) {
        console.log('\nInput Schema:');
        console.log(JSON.stringify(tool.inputSchema, null, 2));
      }

      console.log('');
    });

    console.log('═'.repeat(80));
    console.log('\n📋 Summary of discovered tools:\n');

    toolsResponse.tools.forEach((tool) => {
      const schema = tool.inputSchema as any;
      const requiredParams = schema?.required || [];
      const allParams = schema?.properties ? Object.keys(schema.properties) : [];
      const optionalParams = allParams.filter(
        (key) => !requiredParams.includes(key)
      );

      console.log(`  • ${tool.name}`);
      if (tool.description) {
        console.log(`    ${tool.description}`);
      }
      if (requiredParams.length > 0) {
        console.log(`    Required params: ${requiredParams.join(', ')}`);
      }
      if (optionalParams.length > 0) {
        console.log(`    Optional params: ${optionalParams.join(', ')}`);
      }
      console.log('');
    });

    console.log('✨ Discovery complete!\n');

  } catch (error) {
    console.error('❌ Error discovering MCP tools:');

    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      console.error(`   Stack: ${error.stack}`);

      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Make sure Figma Desktop is running and MCP server is enabled!');
        console.error('   Check Figma > Preferences > MCP Server settings');
      }
    } else {
      console.error(error);
    }
  } finally {
    // Clean up
    if (client) {
      try {
        await client.close();
        console.log('\n🔌 Connection closed.');
      } catch (err) {
        // Ignore close errors
      }
    }
  }
}

// Run the discovery
discoverMCPTools();
