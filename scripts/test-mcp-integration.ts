/**
 * MCP Integration Test Script
 *
 * This script tests the MCP client and tool integration.
 * Make sure Figma Desktop is running with a file open before running this test.
 *
 * Run with: npx tsx scripts/test-mcp-integration.ts
 */

import { mcpClient, callMCPTool } from '../lib/mcp/client';

async function testMCPIntegration() {
  console.log('🧪 Testing MCP Integration...\n');

  try {
    // Test 1: Connect to MCP server
    console.log('Test 1: Connecting to Figma Desktop MCP server...');
    await mcpClient.connect();
    console.log('✅ Connected successfully!\n');

    // Test 2: List available tools
    console.log('Test 2: Listing available tools...');
    const toolsResponse = await mcpClient.listTools();
    console.log(`✅ Found ${toolsResponse.tools.length} tools:`);
    toolsResponse.tools.forEach((tool) => {
      console.log(`   - ${tool.name}`);
    });
    console.log('');

    // Test 3: Call get_variable_defs (no nodeId - uses currently selected)
    console.log('Test 3: Calling get_variable_defs (for currently selected node)...');
    try {
      const varsResult = await callMCPTool('get_variable_defs', {
        clientLanguages: 'react,typescript',
        clientFrameworks: 'react',
      });
      console.log('✅ get_variable_defs executed successfully');
      console.log('   Result preview:', JSON.stringify(varsResult.content).substring(0, 200) + '...');
      console.log('');
    } catch (error) {
      console.log('⚠️  get_variable_defs failed (this is expected if no node is selected)');
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      console.log('');
    }

    // Test 4: Call get_metadata (no nodeId - uses currently selected)
    console.log('Test 4: Calling get_metadata (for currently selected node or page)...');
    try {
      const metadataResult = await callMCPTool('get_metadata', {
        clientLanguages: 'react,typescript',
        clientFrameworks: 'react',
      });
      console.log('✅ get_metadata executed successfully');
      console.log('   Result preview:', JSON.stringify(metadataResult.content).substring(0, 200) + '...');
      console.log('');
    } catch (error) {
      console.log('⚠️  get_metadata failed (this is expected if no node is selected)');
      console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown'}`);
      console.log('');
    }

    console.log('✨ MCP Integration tests completed!\n');
    console.log('📝 Summary:');
    console.log('   - MCP client connection: ✅ Working');
    console.log('   - Tool listing: ✅ Working');
    console.log('   - Tool execution: Check individual test results above');
    console.log('');
    console.log('💡 To test with specific node IDs:');
    console.log('   1. Open a Figma file in Figma Desktop');
    console.log('   2. Select a component or frame');
    console.log('   3. The tools will work with the selected node');
    console.log('   OR provide a nodeId parameter (e.g., "123:456")');
    console.log('');

  } catch (error) {
    console.error('❌ MCP Integration test failed:');
    console.error(error);

    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Make sure:');
      console.error('   1. Figma Desktop is running');
      console.error('   2. MCP server is enabled in Figma Desktop');
      console.error('   3. Server is running on http://127.0.0.1:3845/mcp');
    }
  } finally {
    // Disconnect
    console.log('\n🔌 Disconnecting...');
    await mcpClient.disconnect();
    console.log('✅ Disconnected.\n');
  }
}

// Run the test
testMCPIntegration();
