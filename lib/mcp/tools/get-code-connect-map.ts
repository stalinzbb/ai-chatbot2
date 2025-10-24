/**
 * MCP Tool: get_code_connect_map
 *
 * Get mapping between Figma nodes and code components
 */

import { tool } from "ai";
import { z } from "zod";
import { callMCPTool } from "../client";
import { cloneMCPContent } from "../utils";

export const getCodeConnectMap = tool({
  description: `Get the mapping between Figma components and their code implementations showing where components are used in the codebase. Provide a nodeId in format "123:456" or it uses the currently selected node in Figma Desktop.`,

  inputSchema: z.object({
    nodeId: z
      .string()
      .optional()
      .describe(
        'The ID of the node in the Figma document (e.g., "123:456"). If not provided, uses currently selected node in Figma Desktop.'
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

      const result = await callMCPTool("get_code_connect_map", args);
      const content = cloneMCPContent(result.content);

      return {
        success: true,
        codeConnectMap: content,
        nodeId: nodeId || "currently selected node",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get Code Connect map from Figma MCP server",
        hint: "Make sure Figma Desktop is running and Code Connect has been set up for this component.",
      };
    }
  },
});
