import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type MCPTextContent = CallToolResult["content"];

const TEXT_TYPES = new Set(["text", "plain_text", "markdown"]);

export type FigmaNodeSummary = {
  id: string;
  type?: string;
  name?: string;
};

/**
 * MCP results often return frozen/readonly structures which can cause
 * downstream consumers (Vercel AI SDK tooling) to throw when attempting
 * to mutate or annotate them. This helper safely deep-clones the content
 * payload so that it becomes a plain, mutable JavaScript structure.
 */
export function cloneMCPContent(
  content: CallToolResult["content"]
): CallToolResult["content"] {
  if (!content) {
    return [];
  }

  try {
    return structuredClone(content);
  } catch (error) {
    // structuredClone may be unavailable in older runtimes; fall back to JSON cloning
    try {
      return JSON.parse(JSON.stringify(content));
    } catch (jsonError) {
      console.warn("[MCP] Failed to clone tool content", error, jsonError);
      return Array.isArray(content) ? [...content] : content;
    }
  }
}

export function mcpContentToText(content: CallToolResult["content"]): string {
  if (!content || content.length === 0) {
    return "";
  }

  return content
    .map((item) => {
      if (item && typeof item === "object" && "type" in item) {
        if (TEXT_TYPES.has(String(item.type))) {
          return "text" in item ? String(item.text ?? "") : "";
        }
        if ("data" in item && typeof item.data === "string") {
          return item.data;
        }
      }
      return "";
    })
    .filter((chunk) => chunk.length > 0)
    .join("\n");
}

export function extractFigmaNodesFromMetadata(
  metadataText: string
): FigmaNodeSummary[] {
  if (!metadataText) {
    return [];
  }

  const nodeRegex = /<node\b[^>]*>/g;
  const attrRegex = (attr: string, tag: string) => {
    const match = tag.match(new RegExp(`${attr}="([^"]+)"`, "i"));
    return match ? match[1] : undefined;
  };

  const nodes: FigmaNodeSummary[] = [];
  while (true) {
    const match = nodeRegex.exec(metadataText);

    if (!match) {
      break;
    }

    const tag = match[0];
    const id = attrRegex("id", tag) ?? attrRegex("node-id", tag);

    if (!id) {
      continue;
    }

    const type = attrRegex("type", tag) ?? attrRegex("node-type", tag);
    const name = attrRegex("name", tag);

    nodes.push({ id, type, name });
  }

  return nodes;
}
