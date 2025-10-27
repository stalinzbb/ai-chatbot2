import { tool } from "ai";
import { z } from "zod";
import { searchComponents } from "@/lib/figma/client";
import { FIGMA_FILES } from "@/lib/figma/config";
import {
  type ComponentLocation,
  buildFigmaNodeUrl,
  formatMatchesForPrompt,
  searchFigmaIndex,
} from "@/lib/figma/index-search";

export const queryFigmaComponents = tool({
  description: `Search for components in the Double Good Design System using the locally generated Figma index.
  The tool prioritizes fast keyword lookup across Native and Web component libraries and master files before falling back to the Figma REST API.
  Use this when users ask about specific UI components like buttons, navigation bars, list items, avatars, cards, etc.`,

  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The component name or keyword to search for (e.g., 'button', 'navbar', 'avatar', 'card')"
      ),
    platform: z
      .enum(["native", "web", "both"])
      .optional()
      .describe(
        "Filter by platform: 'native' for iOS/Android, 'web' for web components, or 'both' (default)"
      ),
  }),

  execute: async ({ query, platform = "both" }) => {
    try {
      const indexOutcome = await searchFigmaIndex({
        query,
        platform,
        limit: 12,
      });

      const componentMatches = indexOutcome.matches.filter(
        (match) => match.kind === "component",
      );

      if (componentMatches.length > 0) {
        type GroupedComponent = {
          name: string;
          nodeId: string;
          variant?: string;
          description: string;
          matchedTokens: string[];
          score: number;
          occurrences: ComponentLocation[];
          source: (typeof indexOutcome.matches)[number]["source"];
          figmaLink: string;
        };

        const mapMatch = (
          match: (typeof componentMatches)[number],
        ): GroupedComponent => ({
          name: match.componentName,
          nodeId: match.nodeId,
          variant: match.variant,
          description: match.description ?? "No description available",
          matchedTokens: match.matchedTokens,
          score: Number(match.score.toFixed(2)),
          occurrences: match.locations.slice(0, 5),
          source: match.source,
          figmaLink: buildFigmaNodeUrl(match.fileId, match.nodeId),
        });

        const groups = new Map<
          string,
          {
            fileName: string;
            fileId: string;
            platformLabel: string;
            sourceLabel: string;
            components: GroupedComponent[];
          }
        >();

        for (const match of componentMatches) {
          const key = match.fileId;
          const existingGroup = groups.get(key);

          if (existingGroup) {
            existingGroup.components.push(mapMatch(match));
            continue;
          }

          const platformLabel =
            match.platform === "native"
              ? "Native (iOS/Android React Native)"
              : "Web";
          const sourceLabel =
            match.source === "library" ? "Library" : "Master";

          groups.set(key, {
            fileName: match.fileName,
            fileId: match.fileId,
            platformLabel,
            sourceLabel,
            components: [mapMatch(match)],
          });
        }

        const formattedResults = Array.from(groups.values()).map((group) => ({
          file: group.fileName,
          fileId: group.fileId,
          platform: group.platformLabel,
          source: group.sourceLabel,
          componentsFound: group.components.length,
          components: group.components,
        }));

        const totalFound = formattedResults.reduce(
          (sum, current) => sum + current.componentsFound,
          0,
        );

        return {
          success: true,
          query,
          platform,
          totalResults: totalFound,
          results: formattedResults,
          source: "figma_index",
          tokens: indexOutcome.tokens,
          hints: {
            platform: indexOutcome.platformHint,
            source: indexOutcome.sourceHint,
          },
          promptSummary: formatMatchesForPrompt(indexOutcome),
          message: `Found ${totalFound} indexed components matching "${query}"`,
        };
      }

      const apiResults = await searchComponents(query);

      const filteredResults = apiResults.filter((result) => {
        if (platform === "both") {
          return true;
        }

        const isNative = result.fileId === FIGMA_FILES.NATIVE_COMPONENTS.id;
        const isWeb = result.fileId === FIGMA_FILES.WEB_COMPONENTS.id;

        return (
          (platform === "native" && isNative) || (platform === "web" && isWeb)
        );
      });

      if (filteredResults.length === 0) {
        return {
          success: false,
          source: "figma_api",
          message: `No components found matching "${query}" for platform: ${platform}`,
          suggestions: [
            "Try using different keywords (e.g., 'button', 'nav', 'list', 'input')",
            "Check if the component exists in the Figma files",
            "Ask about design tokens instead if you're looking for styling information",
          ],
        };
      }

      const formattedResults = filteredResults.map((file) => ({
        file: file.fileName,
        fileId: file.fileId,
        platform:
          file.fileId === FIGMA_FILES.NATIVE_COMPONENTS.id
            ? "Native (iOS/Android React Native)"
            : "Web",
        componentsFound: file.components.length,
        components: file.components.map((component) => ({
          name: component.name,
          description: component.description || "No description available",
          figmaLink: `https://www.figma.com/file/${file.fileId}?node-id=${component.key}`,
        })),
      }));

      const totalFound = formattedResults.reduce(
        (acc, file) => acc + file.componentsFound,
        0,
      );

      return {
        success: true,
        query,
        platform,
        totalResults: filteredResults.reduce(
          (acc, file) => acc + file.components.length,
          0,
        ),
        results: formattedResults,
        source: "figma_api",
        message: `Found ${totalFound} components matching "${query}" via Figma API fallback`,
      };
    } catch (error) {
      console.error("Error querying Figma components:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        message:
          "Failed to query Figma components. Please check your Figma API configuration.",
      };
    }
  },
});
