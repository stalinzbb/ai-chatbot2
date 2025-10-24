/**
 * @deprecated This tool uses Figma REST API and has been replaced by MCP tools.
 * Use the following MCP tools instead:
 * - getMetadata: To explore file structure and find components
 * - getDesignContext: To get component details and code
 * - getCodeConnectMap: To find component usage in codebase
 *
 * This file is kept for reference and potential fallback only.
 */

import { tool } from "ai";
import { z } from "zod";
import { searchComponents, getComponent } from "@/lib/figma/client";
import { FIGMA_FILES } from "@/lib/figma/config";

export const queryFigmaComponents = tool({
  description: `Search for components in the Double Good Design System Figma files.
  This includes Native Components (iOS/Android React Native) and Web Components.
  Use this when users ask about specific UI components like buttons, navigation bars, list items, avatars, cards, etc.`,

  inputSchema: z.object({
    query: z
      .string()
      .describe("The component name or keyword to search for (e.g., 'button', 'navbar', 'avatar', 'card')"),
    platform: z
      .enum(["native", "web", "both"])
      .optional()
      .describe("Filter by platform: 'native' for iOS/Android, 'web' for web components, or 'both' (default)"),
  }),

  execute: async ({ query, platform = "both" }) => {
    try {
      // Search across all component files
      const results = await searchComponents(query);

      // Filter by platform if specified
      const filteredResults = results.filter((result) => {
        if (platform === "both") return true;

        const isNative = result.fileId === FIGMA_FILES.NATIVE_COMPONENTS.id;
        const isWeb = result.fileId === FIGMA_FILES.WEB_COMPONENTS.id;

        return (platform === "native" && isNative) || (platform === "web" && isWeb);
      });

      if (filteredResults.length === 0) {
        return {
          success: false,
          message: `No components found matching "${query}" for platform: ${platform}`,
          suggestions: [
            "Try using different keywords (e.g., 'button', 'nav', 'list', 'input')",
            "Check if the component exists in the Figma files",
            "Ask about design tokens instead if you're looking for styling information",
          ],
        };
      }

      // Format results for LLM
      const formattedResults = filteredResults.map((file) => ({
        file: file.fileName,
        fileId: file.fileId,
        platform: file.fileId === FIGMA_FILES.NATIVE_COMPONENTS.id
          ? "Native (iOS/Android React Native)"
          : "Web",
        componentsFound: file.components.length,
        components: file.components.map((component) => ({
          name: component.name,
          description: component.description || "No description available",
          figmaLink: `https://www.figma.com/file/${file.fileId}?node-id=${component.key}`,
        })),
      }));

      return {
        success: true,
        query,
        platform,
        totalResults: filteredResults.reduce((acc, file) => acc + file.components.length, 0),
        results: formattedResults,
        message: `Found ${formattedResults.reduce((acc, file) => acc + file.componentsFound, 0)} components matching "${query}"`,
      };
    } catch (error) {
      console.error("Error querying Figma components:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        message: "Failed to query Figma components. Please check your Figma API configuration.",
      };
    }
  },
});
