import * as Figma from "figma-api";
import type { Redis } from "redis";
import { FIGMA_FILES, getFileInfoById } from "./config";

// Cache duration: 1 hour for Figma data (to reduce API calls)
const CACHE_TTL = 3600;

// Initialize Figma client
export const getFigmaClient = () => {
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) {
    throw new Error("FIGMA_ACCESS_TOKEN is not configured");
  }
  return new Figma.Api({ personalAccessToken: token });
};

// Initialize Redis client for caching (optional)
let redisClient: Redis | null = null;

export const getRedisClient = async (): Promise<Redis | null> => {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    try {
      const { createClient } = await import("redis");
      redisClient = createClient({ url: process.env.REDIS_URL });
      await redisClient.connect();
    } catch (error) {
      console.warn("Redis not available, caching disabled:", error);
      return null;
    }
  }

  return redisClient;
};

// Cache wrapper for Figma API calls
async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = await getRedisClient();

  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      console.warn("Redis get error:", error);
    }
  }

  const data = await fetcher();

  if (redis) {
    try {
      await redis.setEx(key, CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      console.warn("Redis set error:", error);
    }
  }

  return data;
}

// Fetch file metadata
export async function getFileInfo(fileId: string) {
  const client = getFigmaClient();
  return withCache(`figma:file:${fileId}`, () => client.getFile(fileId));
}

// Fetch file components
export async function getFileComponents(fileId: string) {
  const client = getFigmaClient();
  return withCache(`figma:components:${fileId}`, () =>
    client.getFileComponents(fileId)
  );
}

// Fetch file styles (for tokens)
export async function getFileStyles(fileId: string) {
  const client = getFigmaClient();
  return withCache(`figma:styles:${fileId}`, () =>
    client.getFileStyles(fileId)
  );
}

// Fetch component details
export async function getComponent(fileId: string, nodeId: string) {
  const client = getFigmaClient();
  return withCache(`figma:node:${fileId}:${nodeId}`, () =>
    client.getFileNodes(fileId, [nodeId])
  );
}

// Search for components across all files
export async function searchComponents(query: string) {
  const fileIds = Object.values(FIGMA_FILES)
    .map((file) => file.id)
    .filter((id) => id !== "");

  const results = await Promise.allSettled(
    fileIds.map(async (fileId) => {
      const components = await getFileComponents(fileId);
      const fileInfo = getFileInfoById(fileId);

      return {
        fileId,
        fileName: fileInfo?.name || "Unknown",
        components: Object.entries(components.meta?.components || {})
          .filter(([, component]) =>
            component.name.toLowerCase().includes(query.toLowerCase())
          )
          .map(([key, component]) => ({
            key,
            name: component.name,
            description: component.description,
          })),
      };
    })
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<any> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value)
    .filter((file) => file.components.length > 0);
}

// Get all design tokens from token files
export async function getDesignTokens() {
  const tokenFiles = [
    FIGMA_FILES.PRODUCT_TOKENS,
    FIGMA_FILES.BRAND_TOKENS,
  ].filter((file) => file.id !== "");

  const results = await Promise.allSettled(
    tokenFiles.map(async (file) => {
      const [styles, fileData] = await Promise.all([
        getFileStyles(file.id),
        getFileInfo(file.id),
      ]);

      return {
        fileName: file.name,
        fileId: file.id,
        styles: styles.meta?.styles || [],
        variables: extractVariablesFromFile(fileData),
      };
    })
  );

  return results
    .filter(
      (result): result is PromiseFulfilledResult<any> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);
}

// Extract variables from file (simplified - Figma API has complex variable structure)
function extractVariablesFromFile(fileData: any) {
  // This is a simplified version - you may need to adjust based on actual Figma API response
  const variables: any[] = [];

  if (fileData.document?.children) {
    // Recursively search for frames that might contain variable definitions
    const extractFromNode = (node: any) => {
      if (node.name?.includes("Variable") || node.name?.includes("Token")) {
        variables.push({
          name: node.name,
          type: node.type,
          properties: node.absoluteBoundingBox,
        });
      }
      if (node.children) {
        node.children.forEach(extractFromNode);
      }
    };

    fileData.document.children.forEach(extractFromNode);
  }

  return variables;
}

// Search for specific design token
export async function searchDesignToken(tokenName: string) {
  const tokens = await getDesignTokens();

  return tokens.flatMap((file) => {
    const matchingStyles = file.styles.filter((style: any) =>
      style.name.toLowerCase().includes(tokenName.toLowerCase())
    );

    const matchingVariables = file.variables.filter((variable: any) =>
      variable.name.toLowerCase().includes(tokenName.toLowerCase())
    );

    return {
      fileName: file.fileName,
      fileId: file.fileId,
      matches: {
        styles: matchingStyles,
        variables: matchingVariables,
      },
    };
  });
}
