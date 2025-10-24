import { tool } from "ai";
import { z } from "zod";
import {
  getFileComponents,
  getFileStyles,
  getFileVariables,
} from "@/lib/figma/client";
import { callMCPTool } from "../client";
import {
  cloneMCPContent,
  extractFigmaNodesFromMetadata,
  type FigmaNodeSummary,
  mcpContentToText,
} from "../utils";

type AggregatedVariableCollection = {
  nodeId: string;
  name?: string;
  type?: string;
  variablesText: string;
  rawContent: unknown;
};

type AggregatedComponent = {
  nodeId: string;
  name?: string;
  type?: string;
};

const VARIABLE_NODE_TYPES = ["VARIABLE_COLLECTION", "VARIABLE", "VARIABLES"];

const COMPONENT_NODE_TYPES = ["COMPONENT", "COMPONENT_SET", "INSTANCE"];

function filterNodes(
  nodes: FigmaNodeSummary[],
  allowedTypes: string[]
): FigmaNodeSummary[] {
  const normalizedAllowed = allowedTypes.map((value) => value.toUpperCase());

  return nodes.filter((node) => {
    if (!node.type) {
      return false;
    }

    const normalizedType = node.type.toUpperCase();
    return normalizedAllowed.some((allowed) =>
      normalizedType.includes(allowed)
    );
  });
}

export const listFileVariables = tool({
  description:
    "Aggregate design tokens, variables, and component nodes for a Figma file or node using MCP tools.",
  inputSchema: z.object({
    fileId: z.string().optional().describe("Figma file ID to inspect"),
    rootNodeId: z
      .string()
      .optional()
      .describe(
        "Node ID to start discovery from. Defaults to current selection when omitted."
      ),
    includeComponents: z
      .boolean()
      .optional()
      .default(true)
      .describe("Whether to include component node summaries"),
    includeRestData: z
      .boolean()
      .optional()
      .default(true)
      .describe(
        "Whether to supplement results with Figma REST API data when fileId is provided"
      ),
    maxVariableCollections: z
      .number()
      .optional()
      .default(10)
      .describe("Limit how many variable collections are expanded"),
  }),
  execute: async ({
    fileId,
    rootNodeId,
    includeComponents = true,
    includeRestData = true,
    maxVariableCollections = 10,
  }) => {
    try {
      const metadataArgs: Record<string, unknown> = {
        clientLanguages: "react,typescript",
        clientFrameworks: "react",
      };

      if (rootNodeId) {
        metadataArgs.nodeId = rootNodeId;
      }

      if (fileId) {
        metadataArgs.fileId = fileId;
      }

      const metadataResult = await callMCPTool("get_metadata", metadataArgs);
      const metadataContent = cloneMCPContent(metadataResult.content);
      const metadataText = mcpContentToText(metadataContent);

      if (!metadataText) {
        return {
          success: false,
          message:
            "Metadata response was empty. Select a node in Figma Desktop or provide a rootNodeId/fileId.",
        };
      }

      const nodes = extractFigmaNodesFromMetadata(metadataText);

      if (nodes.length === 0) {
        return {
          success: false,
          message:
            "No nodes discovered in metadata. Try selecting a frame or providing a more specific nodeId.",
        };
      }

      const variableNodes = filterNodes(nodes, VARIABLE_NODE_TYPES);
      const componentNodes = includeComponents
        ? filterNodes(nodes, COMPONENT_NODE_TYPES)
        : [];

      const variableCollections: AggregatedVariableCollection[] = [];
      const errors: Array<{ nodeId: string; error: string }> = [];

      for (const node of variableNodes.slice(0, maxVariableCollections)) {
        try {
          const variableResult = await callMCPTool("get_variable_defs", {
            nodeId: node.id,
            clientLanguages: "react,typescript",
            clientFrameworks: "react",
          });

          const variableContent = cloneMCPContent(variableResult.content);
          const variablesText = mcpContentToText(variableContent);

          variableCollections.push({
            nodeId: node.id,
            name: node.name,
            type: node.type,
            variablesText,
            rawContent: variableContent,
          });
        } catch (error) {
          errors.push({
            nodeId: node.id,
            error:
              error instanceof Error
                ? error.message
                : "Unknown error retrieving variable definitions",
          });
        }
      }

      const componentSummaries: AggregatedComponent[] = componentNodes.map(
        (node) => ({
          nodeId: node.id,
          name: node.name,
          type: node.type,
        })
      );

      const REST_RESULTS_LIMIT = 50;
      let restStylesTotal = 0;
      let restComponentsTotal = 0;
      let restVariablesTotal = 0;
      let restStyles: Record<string, unknown>[] | undefined;
      let restComponents: Record<string, unknown>[] | undefined;
      let restVariables: Record<string, unknown>[] | undefined;

      if (fileId && includeRestData) {
        const [stylesResult, componentsResult, variablesResult] =
          await Promise.allSettled([
            getFileStyles(fileId),
            getFileComponents(fileId),
            getFileVariables(fileId),
          ]);

        if (stylesResult.status === "fulfilled") {
          const styles = stylesResult.value.meta?.styles ?? [];
          restStylesTotal = styles.length;
          restStyles = styles
            .slice(0, REST_RESULTS_LIMIT)
            .map((style: any) => ({
              nodeId: style.node_id,
              key: style.key,
              type: style.style_type,
              name: style.name,
              description: style.description,
              remote: style.remote,
            }));
        } else {
          errors.push({
            nodeId: fileId,
            error: `Figma REST styles failed: ${
              stylesResult.reason instanceof Error
                ? stylesResult.reason.message
                : String(stylesResult.reason)
            }`,
          });
        }

        if (componentsResult.status === "fulfilled") {
          const components = componentsResult.value.meta?.components ?? {};
          const entries = Object.entries(components);
          restComponentsTotal = entries.length;
          restComponents = entries
            .slice(0, REST_RESULTS_LIMIT)
            .map(([nodeId, component]: [string, any]) => ({
              nodeId,
              key: component.key,
              name: component.name,
              description: component.description,
              createdAt: component.created_at,
              updatedAt: component.updated_at,
            }));
        } else {
          errors.push({
            nodeId: fileId,
            error: `Figma REST components failed: ${
              componentsResult.reason instanceof Error
                ? componentsResult.reason.message
                : String(componentsResult.reason)
            }`,
          });
        }

        if (variablesResult.status === "fulfilled") {
          const variables = variablesResult.value ?? [];
          restVariablesTotal = variables.length;
          restVariables = variables
            .slice(0, REST_RESULTS_LIMIT)
            .map((variable: any) => ({
              name: variable.name,
              type: variable.type,
              properties: variable.properties,
            }));
        } else {
          errors.push({
            nodeId: fileId,
            error: `Figma REST variables failed: ${
              variablesResult.reason instanceof Error
                ? variablesResult.reason.message
                : String(variablesResult.reason)
            }`,
          });
        }
      }

      const restSummary =
        restStylesTotal || restComponentsTotal || restVariablesTotal
          ? {
              styles: restStylesTotal,
              components: restComponentsTotal,
              variables: restVariablesTotal,
              limitPerCategory: REST_RESULTS_LIMIT,
            }
          : undefined;

      const restData =
        restStyles || restComponents || restVariables
          ? {
              styles: restStyles,
              components: restComponents,
              variables: restVariables,
            }
          : undefined;

      return {
        success: true,
        summary: {
          discoveredNodes: nodes.length,
          variableCollections: variableNodes.length,
          componentNodes: componentSummaries.length,
          expandedCollections: variableCollections.length,
        },
        metadataPreview: metadataText.slice(0, 4000),
        variableCollections,
        componentNodes: componentSummaries,
        restSummary,
        restData,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to aggregate resources via MCP",
        hint: "Ensure Figma Desktop MCP server is running and the requested file is open.",
      };
    }
  },
});
