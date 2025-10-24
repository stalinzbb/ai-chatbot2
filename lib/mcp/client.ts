/**
 * MCP Client for Figma Desktop Integration
 *
 * This module provides a singleton MCP client that connects to the Figma Desktop MCP server.
 * It manages the connection lifecycle and provides methods to call MCP tools.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// MCP Server Configuration
const MCP_SERVER_URL = process.env.FIGMA_MCP_SERVER_URL || 'http://127.0.0.1:3845/mcp';

/**
 * Singleton MCP Client Instance
 * Maintains a single connection to the Figma Desktop MCP server
 */
class MCPClientManager {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private isConnecting = false;
  private connectionPromise: Promise<void> | null = null;

  /**
   * Initialize and connect to the MCP server
   */
  async connect(): Promise<void> {
    // If already connected, return immediately
    if (this.client) {
      return;
    }

    // If currently connecting, wait for the existing connection attempt
    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise;
    }

    // Start new connection attempt
    this.isConnecting = true;
    this.connectionPromise = this._doConnect();

    try {
      await this.connectionPromise;
    } finally {
      this.isConnecting = false;
      this.connectionPromise = null;
    }
  }

  private async _doConnect(): Promise<void> {
    try {
      console.log('[MCP] Connecting to Figma Desktop MCP server:', MCP_SERVER_URL);

      // Create StreamableHTTP transport
      this.transport = new StreamableHTTPClientTransport(new URL(MCP_SERVER_URL));

      // Create MCP client
      this.client = new Client(
        {
          name: 'dg-ds-chatbot',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Connect to server with timeout
      const connectPromise = this.client.connect(this.transport);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout after 5 seconds')), 5000)
      );

      await Promise.race([connectPromise, timeoutPromise]);

      console.log('[MCP] Successfully connected to Figma Desktop MCP server');
    } catch (error) {
      console.error('[MCP] Failed to connect to Figma Desktop MCP server:', error);

      // Clean up on failure
      this.client = null;
      this.transport = null;

      throw new Error(
        `Failed to connect to Figma Desktop MCP server. Make sure Figma Desktop is running and MCP server is enabled. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.log('[MCP] Disconnected from Figma Desktop MCP server');
      } catch (error) {
        console.error('[MCP] Error disconnecting:', error);
      } finally {
        this.client = null;
        this.transport = null;
      }
    }
  }

  /**
   * Call a tool on the MCP server
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    // Ensure we're connected (with timeout)
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client is not connected');
    }

    try {
      console.log(`[MCP] Calling tool: ${toolName}`, args);

      // Add timeout to tool call
      const callPromise = this.client.callTool({
        name: toolName,
        arguments: args,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tool call timeout after 10 seconds')), 10000)
      );

      const result = await Promise.race([callPromise, timeoutPromise]);

      console.log(`[MCP] Tool ${toolName} completed successfully`);
      return result;
    } catch (error) {
      console.error(`[MCP] Error calling tool ${toolName}:`, error);
      throw new Error(
        `Failed to call MCP tool "${toolName}": ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * List all available tools from the MCP server
   */
  async listTools() {
    await this.connect();

    if (!this.client) {
      throw new Error('MCP client is not connected');
    }

    return this.client.listTools();
  }

  /**
   * Check if the client is connected
   */
  isConnected(): boolean {
    return this.client !== null;
  }
}

// Export singleton instance
export const mcpClient = new MCPClientManager();

/**
 * Helper function to call MCP tools
 * This is the main interface for the rest of the application
 */
export async function callMCPTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  return mcpClient.callTool(toolName, args);
}

/**
 * Helper function to ensure MCP client is connected
 * Call this at application startup or when needed
 */
export async function ensureMCPConnection(): Promise<boolean> {
  try {
    await mcpClient.connect();
    return true;
  } catch (error) {
    console.error('[MCP] Failed to ensure connection:', error);
    return false;
  }
}

/**
 * Gracefully disconnect MCP client
 * Call this during application shutdown
 */
export async function disconnectMCP(): Promise<void> {
  await mcpClient.disconnect();
}
