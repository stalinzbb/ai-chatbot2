/**
 * MCP Tool: get_design_context
 *
 * Generate UI code for a given node or the currently selected node in Figma Desktop
 */

import { tool } from "ai";
import { z } from "zod";
import { callMCPTool } from "../client";

export const getDesignContext = tool({
  description: `Generate UI code and design context for a Figma component/node. Use this when user asks about component implementation details or wants to see code for a Figma design. You can provide a nodeId in format "123:456" or extract from Figma URLs. If no nodeId is provided, it uses the currently selected node in Figma Desktop.`,

  inputSchema: z.object({
    nodeId: z
      .string()
      .optional()
      .describe(
        'The ID of the node in the Figma document (e.g., "123:456" or "123-456"). If not provided, uses currently selected node in Figma Desktop. Can be extracted from Figma URLs.'
      ),
    clientLanguages: z
      .string()
      .optional()
      .default("react,typescript")
      .describe(
        'Comma-separated list of programming languages (e.g., "react,typescript")'
      ),
    clientFrameworks: z
      .string()
      .optional()
      .default("react")
      .describe('Comma-separated list of frameworks (e.g., "react")'),
    forceCode: z
      .boolean()
      .optional()
      .describe("Force code return even if output size is too large"),
  }),

  execute: async ({ nodeId, clientLanguages, clientFrameworks, forceCode }) => {
    try {
      const args: Record<string, unknown> = {
        clientLanguages: clientLanguages || "react,typescript",
        clientFrameworks: clientFrameworks || "react",
      };

      // Only add optional parameters if they're provided
      if (nodeId) {
        args.nodeId = nodeId;
      }
      if (forceCode !== undefined) {
        args.forceCode = forceCode;
      }

      const result = await callMCPTool("get_design_context", args);

      return {
        success: true,
        data: result.content,
        nodeId: nodeId || "currently selected node",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get design context from Figma MCP server",
        hint: "Make sure Figma Desktop is running and the file with the requested node is open.",
      };
    }
  },
});
