import { tool } from "ai";
import { z } from "zod";
import { getDesignTokens, searchDesignToken } from "@/lib/figma/client";

export const getDesignTokensTool = tool({
  description: `Retrieve design tokens and variables from the Double Good Design System.
  Design tokens include spacing, colors, typography, border radius, shadows, and other design primitives.
  For example: border-radius (2X = 16px), color tokens, spacing scales, etc.
  Use this when users ask about styling values, design tokens, variables, or design system primitives.`,

  inputSchema: z.object({
    tokenName: z
      .string()
      .optional()
      .describe("Specific token name to search for (e.g., 'border-radius', 'color-primary', 'spacing-2x'). Leave empty to get all tokens."),
    tokenType: z
      .enum(["all", "color", "spacing", "typography", "border", "shadow", "other"])
      .optional()
      .describe("Filter by token type. Use 'all' or leave empty to get all types."),
  }),

  execute: async ({ tokenName, tokenType = "all" }) => {
    try {
      // If searching for specific token
      if (tokenName) {
        const results = await searchDesignToken(tokenName);

        const hasResults = results.some(
          (file) => file.matches.styles.length > 0 || file.matches.variables.length > 0
        );

        if (!hasResults) {
          return {
            success: false,
            message: `No design tokens found matching "${tokenName}"`,
            suggestions: [
              "Try using different keywords (e.g., 'radius', 'spacing', 'color')",
              "Check the token naming convention in your design system",
              "Ask to see all available tokens to explore",
            ],
          };
        }

        const formattedResults = results
          .filter((file) => file.matches.styles.length > 0 || file.matches.variables.length > 0)
          .map((file) => ({
            file: file.fileName,
            fileId: file.fileId,
            figmaLink: `https://www.figma.com/file/${file.fileId}`,
            styles: file.matches.styles.map((style: any) => ({
              name: style.name,
              type: style.style_type,
              description: style.description || "No description",
            })),
            variables: file.matches.variables.map((variable: any) => ({
              name: variable.name,
              type: variable.type,
              properties: variable.properties,
            })),
          }));

        return {
          success: true,
          search: tokenName,
          results: formattedResults,
          totalStyles: formattedResults.reduce((acc, file) => acc + file.styles.length, 0),
          totalVariables: formattedResults.reduce((acc, file) => acc + file.variables.length, 0),
          message: `Found design tokens matching "${tokenName}"`,
        };
      }

      // Get all tokens
      const allTokens = await getDesignTokens();

      if (allTokens.length === 0) {
        return {
          success: false,
          message: "No design tokens found. Please check your Figma token file configuration.",
        };
      }

      const formattedResults = allTokens.map((file) => {
        let styles = file.styles;

        // Filter by type if specified
        if (tokenType !== "all") {
          styles = styles.filter((style: any) => {
            const styleName = style.name.toLowerCase();
            switch (tokenType) {
              case "color":
                return style.style_type === "FILL" || styleName.includes("color");
              case "spacing":
                return styleName.includes("spacing") || styleName.includes("padding") || styleName.includes("margin");
              case "typography":
                return style.style_type === "TEXT" || styleName.includes("font") || styleName.includes("text");
              case "border":
                return styleName.includes("border") || styleName.includes("radius");
              case "shadow":
                return style.style_type === "EFFECT" || styleName.includes("shadow");
              default:
                return true;
            }
          });
        }

        return {
          file: file.fileName,
          fileId: file.fileId,
          figmaLink: `https://www.figma.com/file/${file.fileId}`,
          totalStyles: styles.length,
          totalVariables: file.variables.length,
          styles: styles.slice(0, 20).map((style: any) => ({
            name: style.name,
            type: style.style_type,
            description: style.description || "No description",
          })),
          variables: file.variables.slice(0, 20).map((variable: any) => ({
            name: variable.name,
            type: variable.type,
          })),
          note: styles.length > 20 ? `Showing first 20 of ${styles.length} styles` : undefined,
        };
      });

      return {
        success: true,
        tokenType,
        results: formattedResults,
        totalFiles: formattedResults.length,
        message: tokenType === "all"
          ? "Retrieved all design tokens from Product and Brand token files"
          : `Retrieved ${tokenType} tokens from design system`,
      };
    } catch (error) {
      console.error("Error getting design tokens:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        message: "Failed to retrieve design tokens. Please check your Figma API configuration.",
      };
    }
  },
});
