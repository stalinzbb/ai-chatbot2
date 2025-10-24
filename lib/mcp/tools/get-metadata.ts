/**
 * MCP Tool: get_metadata
 *
 * Get metadata/structure overview of a Figma page or node
 */

import { tool } from "ai";
import { z } from "zod";
import { callMCPTool } from "../client";
import { cloneMCPContent } from "../utils";

export const getMetadata = tool({
  description: `Get structural metadata for a Figma page or node in XML format with node IDs, layer types, and names. Provide a page ID like "0:1" or component nodeId, or it uses the currently selected node in Figma Desktop.`,

  inputSchema: z.object({
    nodeId: z
      .string()
      .optional()
      .describe(
        'The ID of the node or page in the Figma document (e.g., "0:1" for page, "123:456" for node). If not provided, uses currently selected node.'
      ),
    clientLanguages: z
      .string()
      .optional()
      .default("react,typescript")
      .describe("Comma-separated list of programming languages"),
    clientFrameworks: z
      .string()
      .optional()
      .default("react")
      .describe("Comma-separated list of frameworks"),
  }),

  execute: async ({ nodeId, clientLanguages, clientFrameworks }) => {
    try {
      const args: Record<string, unknown> = {
        clientLanguages: clientLanguages || "react,typescript",
        clientFrameworks: clientFrameworks || "react",
      };

      if (nodeId) {
        args.nodeId = nodeId;
      }

      const result = await callMCPTool("get_metadata", args);
      const content = cloneMCPContent(result.content);

      return {
        success: true,
        metadata: content,
        nodeId: nodeId || "currently selected node",
        hint: "Use the node IDs from this metadata to call get_design_context for detailed information about specific components.",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get metadata from Figma MCP server",
        hint: "Make sure Figma Desktop is running with the relevant file open.",
      };
    }
  },
});
