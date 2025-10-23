// Figma file configuration for Double Good Design System
export const FIGMA_FILES = {
  NATIVE_COMPONENTS: {
    id: process.env.FIGMA_NATIVE_COMPONENTS_FILE_ID || "",
    name: "Native Components",
    description: "iOS/Android app components (React Native) like Navbar, list items, avatar, etc.",
    priority: "high",
  },
  WEB_COMPONENTS: {
    id: process.env.FIGMA_WEB_COMPONENTS_FILE_ID || "",
    name: "Web Components",
    description: "Figma designs of web components",
    priority: "high",
  },
  NATIVE_MASTER: {
    id: process.env.FIGMA_NATIVE_MASTER_FILE_ID || "",
    name: "Native Master",
    description: "All live native app designs in one file (most updated version)",
    priority: "medium",
  },
  WEB_MASTER: {
    id: process.env.FIGMA_WEB_MASTER_FILE_ID || "",
    name: "Web Master",
    description: "All live web designs in one file (most updated version)",
    priority: "medium",
  },
  PRODUCT_TOKENS: {
    id: process.env.FIGMA_PRODUCT_TOKENS_FILE_ID || "",
    name: "Product Tokens",
    description: "Figma variables/tokens/styles for product design (e.g., border radius: 2X = 16px)",
    priority: "high",
  },
  BRAND_TOKENS: {
    id: process.env.FIGMA_BRAND_TOKENS_FILE_ID || "",
    name: "Brand Tokens",
    description: "Figma variables/tokens/styles for brand identity",
    priority: "high",
  },
} as const;

export type FigmaFileKey = keyof typeof FIGMA_FILES;

// Get all file IDs for batch queries
export const getAllFileIds = (): string[] => {
  return Object.values(FIGMA_FILES)
    .map((file) => file.id)
    .filter((id) => id !== "");
};

// Get high priority files (components and tokens)
export const getHighPriorityFileIds = (): string[] => {
  return Object.values(FIGMA_FILES)
    .filter((file) => file.priority === "high")
    .map((file) => file.id)
    .filter((id) => id !== "");
};

// Find file by ID
export const getFileInfoById = (fileId: string) => {
  return Object.values(FIGMA_FILES).find((file) => file.id === fileId);
};
