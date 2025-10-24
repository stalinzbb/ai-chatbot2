/**
 * MCP Tool: get_screenshot
 *
 * Generate a screenshot of a Figma node
 */

import { tool } from "ai";
import { z } from "zod";
import { callMCPTool } from "../client";
import { cloneMCPContent } from "../utils";

export const getScreenshot = tool({
  description: `Generate a screenshot or visual image of a Figma component or node. Provide a nodeId in format "123:456" or it uses the currently selected node in Figma Desktop.`,

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

      const result = await callMCPTool("get_screenshot", args);
      const content = cloneMCPContent(result.content);

      return {
        success: true,
        screenshot: content,
        nodeId: nodeId || "currently selected node",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get screenshot from Figma MCP server",
        hint: "Make sure Figma Desktop is running with the relevant file open and the node exists.",
      };
    }
  },
});
