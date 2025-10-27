import { promises as fs } from "fs";
import path from "path";

const FIGMA_INDEX_DIR = path.join(process.cwd(), "figma_index");

type Platform = "native" | "web";
type Source = "library" | "master";

type IndexConfig = {
  fileName: string;
  platform: Platform;
  source: Source;
};

const INDEX_CONFIGS: IndexConfig[] = [
  {
    fileName: "native_components_index.json",
    platform: "native",
    source: "library",
  },
  {
    fileName: "native_master_index.json",
    platform: "native",
    source: "master",
  },
  {
    fileName: "web_components_index.json",
    platform: "web",
    source: "library",
  },
  {
    fileName: "web_master_index.json",
    platform: "web",
    source: "master",
  },
];

type RawIndexComponent = {
  componentId: string;
  componentName: string;
  tags?: string[];
  textSnippets?: string[];
  interactions?: string[];
  variant?: string;
  type?: string;
  mainComponentId?: string;
  description?: string;
};

type RawIndexScreen = {
  screenId?: string;
  screenName?: string;
  hierarchyPath?: string;
  components?: RawIndexComponent[];
};

type RawIndexPage = {
  pageId?: string;
  pageName?: string;
  screens?: RawIndexScreen[];
};

type RawIndexFile = {
  fileId: string;
  fileName: string;
  platform?: string;
  pages?: RawIndexPage[];
};

type RawIndexPayload = {
  generatedAt?: string;
  files?: RawIndexFile[];
};

export type ComponentLocation = {
  pageId?: string;
  pageName?: string;
  screenId?: string;
  screenName?: string;
  hierarchyPath?: string;
};

type TokenCategory =
  | "name"
  | "variant"
  | "tag"
  | "text"
  | "path"
  | "file";

type TokenBuckets = Record<TokenCategory, Set<string>>;

type InternalIndexNode = {
  id: string;
  componentId: string;
  mainComponentId?: string;
  componentName: string;
  normalizedComponentName: string;
  variant?: string;
  description?: string;
  type?: string;
  tags: Set<string>;
  textSnippets: Set<string>;
  interactions: Set<string>;
  fileId: string;
  fileName: string;
  platform: Platform;
  source: Source;
  locations: ComponentLocation[];
  tokens: TokenBuckets;
  allTokens: Set<string>;
  searchText: string;
};

export type FigmaIndexMatch = {
  id: string;
  componentId: string;
  mainComponentId?: string;
  componentName: string;
  variant?: string;
  description?: string;
  type?: string;
  tags: string[];
  textSnippets: string[];
  interactions: string[];
  fileId: string;
  fileName: string;
  platform: Platform;
  source: Source;
  locations: ComponentLocation[];
  score: number;
  matchedTokens: string[];
};

export type SearchOptions = {
  query: string;
  platform?: Platform | "both";
  source?: Source | "both";
  limit?: number;
};

export type SearchOutcome = {
  matches: FigmaIndexMatch[];
  tokens: string[];
  platformHint: Platform | null;
  sourceHint: Source | null;
};

type IndexData = {
  nodes: InternalIndexNode[];
  tokenMap: Map<string, Set<number>>;
};

let cachedIndexPromise: Promise<IndexData> | null = null;

const STOPWORDS = new Set([
  "and",
  "or",
  "the",
  "a",
  "an",
  "to",
  "of",
  "for",
  "in",
  "on",
  "with",
  "without",
  "by",
  "is",
  "are",
  "be",
  "was",
  "were",
  "as",
  "at",
  "from",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "component",
  "components",
  "node",
  "nodes",
  "screen",
  "screens",
]);

const PLATFORM_HINTS: Record<string, Platform> = {
  native: "native",
  ios: "native",
  android: "native",
  mobile: "native",
  web: "web",
  browser: "web",
  desktop: "web",
};

const SOURCE_HINTS: Record<string, Source> = {
  master: "master",
  app: "master",
  production: "master",
  live: "master",
  library: "library",
  libraries: "library",
  components: "library",
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  if (!text) {
    return [];
  }

  const normalized = normalizeText(text);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token && token.length > 1 && !STOPWORDS.has(token));
}

function addTokens(
  buckets: TokenBuckets,
  values: (string | undefined)[],
  category: TokenCategory,
  allTokens: Set<string>,
) {
  const bucket = buckets[category];

  for (const value of values) {
    if (!value) {
      continue;
    }

    for (const token of tokenize(value)) {
      bucket.add(token);
      allTokens.add(token);
    }
  }
}

async function loadIndexFile(config: IndexConfig): Promise<RawIndexPayload | null> {
  const filePath = path.join(FIGMA_INDEX_DIR, config.fileName);

  try {
    const fileContents = await fs.readFile(filePath, "utf8");
    return JSON.parse(fileContents) as RawIndexPayload;
  } catch (error) {
    console.warn(
      `[figma-index] Failed to read or parse ${config.fileName}:`,
      error,
    );
    return null;
  }
}

async function buildIndexData(): Promise<IndexData> {
  const nodes = new Map<string, InternalIndexNode>();

  for (const config of INDEX_CONFIGS) {
    const payload = await loadIndexFile(config);
    if (!payload?.files?.length) {
      continue;
    }

    for (const file of payload.files) {
      const pages = file.pages ?? [];

      for (const page of pages) {
        const screens = page.screens ?? [];

        for (const screen of screens) {
          const components = screen.components ?? [];

          for (const component of components) {
            if (!component?.componentId || !component.componentName) {
              continue;
            }

            const key = `${file.fileId}:${component.componentId}`;
            const location: ComponentLocation = {
              pageId: page.pageId,
              pageName: page.pageName,
              screenId: screen.screenId,
              screenName: screen.screenName,
              hierarchyPath: screen.hierarchyPath,
            };

            if (!nodes.has(key)) {
              const allTokens = new Set<string>();
              const buckets: TokenBuckets = {
                name: new Set<string>(),
                variant: new Set<string>(),
                tag: new Set<string>(),
                text: new Set<string>(),
                path: new Set<string>(),
                file: new Set<string>(),
              };

              addTokens(buckets, [component.componentName], "name", allTokens);
              addTokens(buckets, [component.variant], "variant", allTokens);
              addTokens(buckets, component.tags ?? [], "tag", allTokens);
              addTokens(
                buckets,
                component.textSnippets ?? [],
                "text",
                allTokens,
              );
              addTokens(
                buckets,
                [
                  page.pageName,
                  screen.screenName,
                  screen.hierarchyPath,
                ].filter(Boolean) as string[],
                "path",
                allTokens,
              );
              addTokens(buckets, [file.fileName], "file", allTokens);

              nodes.set(key, {
                id: key,
                componentId: component.componentId,
                mainComponentId: component.mainComponentId,
                componentName: component.componentName,
                normalizedComponentName: normalizeText(component.componentName),
                variant: component.variant,
                description: component.description,
                type: component.type,
                tags: new Set(component.tags ?? []),
                textSnippets: new Set(component.textSnippets ?? []),
                interactions: new Set(component.interactions ?? []),
                fileId: file.fileId,
                fileName: file.fileName,
                platform: config.platform,
                source: config.source,
                locations: [location],
                tokens: buckets,
                allTokens,
                searchText: normalizeText(
                  [
                    component.componentName,
                    component.variant,
                    component.tags?.join(" "),
                    component.textSnippets?.join(" "),
                    page.pageName,
                    screen.screenName,
                    screen.hierarchyPath,
                    file.fileName,
                  ]
                    .filter(Boolean)
                    .join(" "),
                ),
              });
            } else {
              const existing = nodes.get(key)!;

              existing.locations.push(location);

              if (!existing.variant && component.variant) {
                existing.variant = component.variant;
                addTokens(
                  existing.tokens,
                  [component.variant],
                  "variant",
                  existing.allTokens,
                );
              }

              if (!existing.description && component.description) {
                existing.description = component.description;
              }

              if (!existing.type && component.type) {
                existing.type = component.type;
              }

              for (const tag of component.tags ?? []) {
                existing.tags.add(tag);
                addTokens(
                  existing.tokens,
                  [tag],
                  "tag",
                  existing.allTokens,
                );
              }

              for (const snippet of component.textSnippets ?? []) {
                existing.textSnippets.add(snippet);
                addTokens(
                  existing.tokens,
                  [snippet],
                  "text",
                  existing.allTokens,
                );
              }

              for (const interaction of component.interactions ?? []) {
                existing.interactions.add(interaction);
              }

              const additionalText = normalizeText(
                [
                  page.pageName,
                  screen.screenName,
                  screen.hierarchyPath,
                ]
                  .filter(Boolean)
                  .join(" "),
              );

              if (additionalText && !existing.searchText.includes(additionalText)) {
                existing.searchText = `${existing.searchText} ${additionalText}`.trim();
                addTokens(
                  existing.tokens,
                  [additionalText],
                  "path",
                  existing.allTokens,
                );
              }
            }
          }
        }
      }
    }
  }

  const nodeList = Array.from(nodes.values());
  const tokenMap = new Map<string, Set<number>>();

  for (let index = 0; index < nodeList.length; index += 1) {
    const node = nodeList[index];

    for (const token of node.allTokens) {
      if (!tokenMap.has(token)) {
        tokenMap.set(token, new Set<number>());
      }
      tokenMap.get(token)!.add(index);
    }
  }

  return { nodes: nodeList, tokenMap };
}

async function getIndexData(): Promise<IndexData> {
  if (!cachedIndexPromise) {
    cachedIndexPromise = buildIndexData();
  }

  return cachedIndexPromise;
}

function extractHints(tokens: Set<string>) {
  let platformHint: Platform | null = null;
  let sourceHint: Source | null = null;

  for (const token of Array.from(tokens)) {
    if (!platformHint && PLATFORM_HINTS[token]) {
      platformHint = PLATFORM_HINTS[token];
      tokens.delete(token);
    }

    if (!sourceHint && SOURCE_HINTS[token]) {
      sourceHint = SOURCE_HINTS[token];
      tokens.delete(token);
    }
  }

  return { platformHint, sourceHint };
}

function scoreMatch(
  node: InternalIndexNode,
  queryTokens: string[],
  normalizedQuery: string,
  platformHint: Platform | null,
  sourceHint: Source | null,
) {
  const matchedTokens = new Set<string>();
  let score = 0;

  for (const token of queryTokens) {
    if (node.tokens.name.has(token)) {
      score += 8;
      matchedTokens.add(token);
    } else if (node.tokens.variant.has(token)) {
      score += 6;
      matchedTokens.add(token);
    } else if (node.tokens.tag.has(token)) {
      score += 5;
      matchedTokens.add(token);
    } else if (node.tokens.text.has(token)) {
      score += 4;
      matchedTokens.add(token);
    } else if (node.tokens.path.has(token)) {
      score += 3;
      matchedTokens.add(token);
    } else if (node.tokens.file.has(token)) {
      score += 2;
      matchedTokens.add(token);
    } else if (node.searchText.includes(token)) {
      score += 1;
      matchedTokens.add(token);
    }
  }

  if (normalizedQuery && node.searchText.includes(normalizedQuery)) {
    score += 6;
  }

  if (
    normalizedQuery &&
    normalizedQuery === node.normalizedComponentName &&
    normalizedQuery.length > 0
  ) {
    score += 10;
  }

  if (queryTokens.length > 0) {
    const coverage = matchedTokens.size / queryTokens.length;
    if (coverage >= 1) {
      score += 4;
    } else if (coverage >= 0.6) {
      score += 2;
    }
  }

  if (platformHint && node.platform === platformHint) {
    score += 5;
  }

  if (sourceHint && node.source === sourceHint) {
    score += 3;
  }

  if (node.source === "library") {
    score += 1.5;
  }

  if (node.locations.length > 1) {
    score += Math.min(2, node.locations.length * 0.25);
  }

  return { score, matchedTokens: Array.from(matchedTokens) };
}

export async function searchFigmaIndex(
  options: SearchOptions,
): Promise<SearchOutcome> {
  const limit = options.limit ?? 10;
  const rawQuery = options.query ?? "";
  const normalizedQuery = normalizeText(rawQuery);

  if (!normalizedQuery) {
    return { matches: [], tokens: [], platformHint: null, sourceHint: null };
  }

  const rawTokens = new Set(tokenize(rawQuery));
  const { platformHint, sourceHint } = extractHints(rawTokens);

  const queryTokens = Array.from(rawTokens);
  const platformFilter =
    options.platform && options.platform !== "both"
      ? options.platform
      : platformHint;
  const sourceFilter =
    options.source && options.source !== "both"
      ? options.source
      : sourceHint;

  const { nodes, tokenMap } = await getIndexData();

  const candidateIds = new Set<number>();

  for (const token of queryTokens) {
    const indices = tokenMap.get(token);
    if (indices) {
      for (const index of indices) {
        candidateIds.add(index);
      }
    }
  }

  if (!candidateIds.size) {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (node.searchText.includes(normalizedQuery)) {
        candidateIds.add(index);
      }
    }
  }

  const matches: FigmaIndexMatch[] = [];

  for (const index of candidateIds) {
    const node = nodes[index];

    if (platformFilter && node.platform !== platformFilter) {
      continue;
    }

    if (sourceFilter && node.source !== sourceFilter) {
      continue;
    }

    const { score, matchedTokens } = scoreMatch(
      node,
      queryTokens,
      normalizedQuery,
      platformFilter ?? platformHint ?? null,
      sourceFilter ?? sourceHint ?? null,
    );

    if (score <= 0) {
      continue;
    }

    matches.push({
      id: node.id,
      componentId: node.componentId,
      mainComponentId: node.mainComponentId,
      componentName: node.componentName,
      variant: node.variant,
      description: node.description,
      type: node.type,
      tags: Array.from(node.tags),
      textSnippets: Array.from(node.textSnippets),
      interactions: Array.from(node.interactions),
      fileId: node.fileId,
      fileName: node.fileName,
      platform: node.platform,
      source: node.source,
      locations: node.locations,
      score,
      matchedTokens,
    });
  }

  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.componentName.localeCompare(b.componentName);
  });

  return {
    matches: matches.slice(0, limit),
    tokens: queryTokens,
    platformHint: platformFilter ?? platformHint ?? null,
    sourceHint: sourceFilter ?? sourceHint ?? null,
  };
}

export function formatMatchesForPrompt(
  outcome: SearchOutcome,
  limit = 3,
): string | null {
  if (!outcome.matches.length) {
    return null;
  }

  const lines = outcome.matches.slice(0, limit).map((match, index) => {
    const primaryLocation = match.locations[0];
    const locationLabel = primaryLocation
      ? [primaryLocation.pageName, primaryLocation.screenName]
          .filter(Boolean)
          .join(" / ")
      : null;
    const pathLabel =
      primaryLocation?.hierarchyPath &&
      primaryLocation.hierarchyPath !== locationLabel
        ? primaryLocation.hierarchyPath
        : null;

    const variantLabel = match.variant ? ` — ${match.variant}` : "";
    const platformLabel = match.platform === "native" ? "Native" : "Web";
    const sourceLabel = match.source === "library" ? "Library" : "Master";

    const parts = [
      `${index + 1}. ${platformLabel} ${sourceLabel}`,
      `${match.componentName}${variantLabel}`,
      `node ${match.componentId}`,
      `file ${match.fileName}`,
    ];

    if (locationLabel) {
      parts.push(`location ${locationLabel}`);
    }
    if (pathLabel) {
      parts.push(`path ${pathLabel}`);
    }

    return parts.join(" • ");
  });

  return lines.join("\n");
}

export function buildFigmaNodeUrl(fileId: string, nodeId: string) {
  const encodedNodeId = encodeURIComponent(nodeId).replace(/%3A/gi, "%3A");
  return `https://www.figma.com/file/${fileId}?node-id=${encodedNodeId}`;
}
