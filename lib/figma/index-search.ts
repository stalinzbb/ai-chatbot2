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

type NodeKind = "component" | "screen" | "page";

type InternalIndexNode = {
  id: string;
  nodeId: string;
  componentId?: string;
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
  kind: NodeKind;
  locations: ComponentLocation[];
  tokens: TokenBuckets;
  allTokens: Set<string>;
  searchText: string;
  counts?: {
    screens?: number;
    components?: number;
  };
};

export type FigmaIndexMatch = {
  id: string;
  nodeId: string;
  componentId?: string;
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
  kind: NodeKind;
  locations: ComponentLocation[];
  score: number;
  matchedTokens: string[];
  counts?: {
    screens?: number;
    components?: number;
  };
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
  "how",
  "many",
  "much",
  "does",
  "do",
  "did",
  "exist",
  "exists",
  "please",
  "about",
  "tell",
  "show",
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

type KeywordHints = {
  component: boolean;
  screen: boolean;
  page: boolean;
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

function createEmptyTokenBuckets(): TokenBuckets {
  return {
    name: new Set<string>(),
    variant: new Set<string>(),
    tag: new Set<string>(),
    text: new Set<string>(),
    path: new Set<string>(),
    file: new Set<string>(),
  };
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

      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const page = pages[pageIndex];
        const screens = page.screens ?? [];
        const totalComponents = screens.reduce(
          (sum, current) => sum + (current.components?.length ?? 0),
          0,
        );
        const pageNodeId = page.pageId ?? `page-${pageIndex}`;
        const pageKey = `${file.fileId}:page:${pageNodeId}`;

        if (!nodes.has(pageKey)) {
          const allTokens = new Set<string>();
          const buckets = createEmptyTokenBuckets();

          addTokens(buckets, [page.pageName], "name", allTokens);
          addTokens(
            buckets,
            [
              `${screens.length} screens`,
              `${totalComponents} components`,
              "page",
            ],
            "text",
            allTokens,
          );
          addTokens(buckets, [file.fileName, "page"], "file", allTokens);

          nodes.set(pageKey, {
            id: pageKey,
            nodeId: pageNodeId,
            componentName: page.pageName ?? "Unnamed Page",
            normalizedComponentName: normalizeText(page.pageName ?? ""),
            tags: new Set<string>(),
            textSnippets: new Set<string>(),
            interactions: new Set<string>(),
            fileId: file.fileId,
            fileName: file.fileName,
            platform: config.platform,
            source: config.source,
            kind: "page",
            locations: [
              {
                pageId: page.pageId,
                pageName: page.pageName,
              },
            ],
            tokens: buckets,
            allTokens,
            searchText: normalizeText(
              [
                page.pageName,
                "page",
                `${screens.length} screens`,
                `${totalComponents} components`,
                file.fileName,
              ]
                .filter(Boolean)
                .join(" "),
            ),
            counts: {
              screens: screens.length || undefined,
              components: totalComponents || undefined,
            },
          });
        }

        for (let screenIndex = 0; screenIndex < screens.length; screenIndex += 1) {
          const screen = screens[screenIndex];
          const components = screen.components ?? [];
          const screenNodeId =
            screen.screenId ?? `screen-${pageIndex}-${screenIndex}`;
          const screenKey = `${file.fileId}:screen:${screenNodeId}`;
          const screenComponentCount = components.length;

          if (!nodes.has(screenKey)) {
            const allTokens = new Set<string>();
            const buckets = createEmptyTokenBuckets();

            addTokens(buckets, [screen.screenName], "name", allTokens);
            addTokens(
              buckets,
              [
                screen.hierarchyPath,
                page.pageName,
              ],
              "path",
              allTokens,
            );
            addTokens(
              buckets,
              [
                "screen",
                `${screenComponentCount} components`,
              ],
              "text",
              allTokens,
            );
            addTokens(buckets, [file.fileName, "screen"], "file", allTokens);

            nodes.set(screenKey, {
              id: screenKey,
              nodeId: screenNodeId,
              componentName: screen.screenName ?? "Unnamed Screen",
              normalizedComponentName: normalizeText(screen.screenName ?? ""),
              description:
                screenComponentCount > 0
                  ? `${screenComponentCount} components`
                  : undefined,
              tags: new Set<string>(),
              textSnippets: new Set<string>(),
              interactions: new Set<string>(),
              fileId: file.fileId,
              fileName: file.fileName,
              platform: config.platform,
              source: config.source,
              kind: "screen",
              locations: [
                {
                  pageId: page.pageId,
                  pageName: page.pageName,
                  screenId: screen.screenId,
                  screenName: screen.screenName,
                  hierarchyPath: screen.hierarchyPath,
                },
              ],
              tokens: buckets,
              allTokens,
              searchText: normalizeText(
                [
                  screen.screenName,
                  screen.hierarchyPath,
                  page.pageName,
                  "screen",
                  file.fileName,
                  `${screenComponentCount} components`,
                ]
                  .filter(Boolean)
                  .join(" "),
              ),
              counts:
                screenComponentCount > 0
                  ? { components: screenComponentCount }
                  : undefined,
            });
          } else {
            const existingScreen = nodes.get(screenKey)!;

            existingScreen.locations.push({
              pageId: page.pageId,
              pageName: page.pageName,
              screenId: screen.screenId,
              screenName: screen.screenName,
              hierarchyPath: screen.hierarchyPath,
            });

            if (
              screenComponentCount > 0 &&
              !existingScreen.counts?.components
            ) {
              existingScreen.counts = {
                ...(existingScreen.counts ?? {}),
                components: screenComponentCount,
              };
            }

            const additionalText = normalizeText(
              [
                screen.screenName,
                screen.hierarchyPath,
                page.pageName,
              ]
                .filter(Boolean)
                .join(" "),
            );

            if (
              additionalText &&
              !existingScreen.searchText.includes(additionalText)
            ) {
              existingScreen.searchText = `${existingScreen.searchText} ${additionalText}`.trim();
              addTokens(
                existingScreen.tokens,
                [additionalText],
                "path",
                existingScreen.allTokens,
              );
            }
          }

          for (const component of components) {
            if (!component?.componentId || !component.componentName) {
              continue;
            }

            const key = `${file.fileId}:component:${component.componentId}`;
            const location: ComponentLocation = {
              pageId: page.pageId,
              pageName: page.pageName,
              screenId: screen.screenId,
              screenName: screen.screenName,
              hierarchyPath: screen.hierarchyPath,
            };

            if (!nodes.has(key)) {
              const allTokens = new Set<string>();
              const buckets = createEmptyTokenBuckets();

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
              addTokens(
                buckets,
                [file.fileName],
                "file",
                allTokens,
              );
              addTokens(buckets, ["component"], "text", allTokens);

              nodes.set(key, {
                id: key,
                nodeId: component.componentId,
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
                kind: "component",
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
                    "component",
                  ]
                    .filter(Boolean)
                    .join(" "),
                ),
              });
            } else {
              const existingComponent = nodes.get(key)!;

              existingComponent.locations.push(location);

              if (!existingComponent.variant && component.variant) {
                existingComponent.variant = component.variant;
                addTokens(
                  existingComponent.tokens,
                  [component.variant],
                  "variant",
                  existingComponent.allTokens,
                );
              }

              if (!existingComponent.description && component.description) {
                existingComponent.description = component.description;
              }

              if (!existingComponent.type && component.type) {
                existingComponent.type = component.type;
              }

              for (const tag of component.tags ?? []) {
                if (!existingComponent.tags.has(tag)) {
                  existingComponent.tags.add(tag);
                  addTokens(
                    existingComponent.tokens,
                    [tag],
                    "tag",
                    existingComponent.allTokens,
                  );
                }
              }

              for (const snippet of component.textSnippets ?? []) {
                if (!existingComponent.textSnippets.has(snippet)) {
                  existingComponent.textSnippets.add(snippet);
                  addTokens(
                    existingComponent.tokens,
                    [snippet],
                    "text",
                    existingComponent.allTokens,
                  );
                }
              }

              for (const interaction of component.interactions ?? []) {
                existingComponent.interactions.add(interaction);
              }

              addTokens(
                existingComponent.tokens,
                [
                  page.pageName,
                  screen.screenName,
                  screen.hierarchyPath,
                ].filter(Boolean) as string[],
                "path",
                existingComponent.allTokens,
              );
              addTokens(
                existingComponent.tokens,
                [file.fileName],
                "file",
                existingComponent.allTokens,
              );
              addTokens(
                existingComponent.tokens,
                ["component"],
                "text",
                existingComponent.allTokens,
              );

              const additionalText = normalizeText(
                [
                  page.pageName,
                  screen.screenName,
                  screen.hierarchyPath,
                  "component",
                ]
                  .filter(Boolean)
                  .join(" "),
              );

              if (
                additionalText &&
                !existingComponent.searchText.includes(additionalText)
              ) {
                existingComponent.searchText = `${existingComponent.searchText} ${additionalText}`.trim();
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
  keywordHints: KeywordHints,
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

  if (keywordHints.component) {
    if (node.kind === "component") {
      score += 5;
    } else if (node.kind === "screen") {
      score -= 1;
    } else {
      score -= 2;
    }
  }

  if (keywordHints.screen) {
    if (node.kind === "screen") {
      score += 7;
    } else if (node.kind === "page") {
      score += 4;
    } else {
      score -= 2;
    }
  }

  if (keywordHints.page) {
    if (node.kind === "page") {
      score += 7;
    } else if (node.kind === "screen") {
      score += 3;
    } else {
      score -= 2;
    }
  }

  if (node.counts?.screens) {
    score += Math.min(4, node.counts.screens * 0.5);
  }

  if (node.counts?.components && node.kind !== "component") {
    score += Math.min(3, node.counts.components * 0.25);
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
  const keywordHints: KeywordHints = {
    component: queryTokens.some(
      (token) => token === "component" || token === "components",
    ),
    screen: queryTokens.some(
      (token) => token === "screen" || token === "screens",
    ),
    page: queryTokens.some((token) => token === "page" || token === "pages"),
  };
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

  if (!candidateIds.size && queryTokens.length) {
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      let matchedCount = 0;

      for (const token of queryTokens) {
        if (node.searchText.includes(token)) {
          matchedCount += 1;
        }
      }

      const requiredMatches = Math.max(
        1,
        Math.ceil(queryTokens.length * 0.5),
      );

      if (matchedCount >= requiredMatches) {
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
      keywordHints,
    );

    if (score <= 0) {
      continue;
    }

    matches.push({
      id: node.id,
      nodeId: node.nodeId,
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
      kind: node.kind,
      locations: node.locations,
      score,
      matchedTokens,
      counts: node.counts,
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

    const platformLabel = match.platform === "native" ? "Native" : "Web";
    const sourceLabel = match.source === "library" ? "Library" : "Master";
    const kindLabel =
      match.kind === "component"
        ? "Component"
        : match.kind === "screen"
          ? "Screen"
          : "Page";
    const variantLabel =
      match.kind === "component" && match.variant
        ? ` — ${match.variant}`
        : "";

    const detailParts: string[] = [];
    if (match.kind === "page") {
      if (typeof match.counts?.screens === "number") {
        detailParts.push(`screens ${match.counts.screens}`);
      }
      if (typeof match.counts?.components === "number") {
        detailParts.push(`components ${match.counts.components}`);
      }
    } else if (match.kind === "screen") {
      if (typeof match.counts?.components === "number") {
        detailParts.push(`components ${match.counts.components}`);
      }
    }

    const parts = [
      `${index + 1}. ${platformLabel} ${sourceLabel} ${kindLabel}`,
      `${match.componentName}${variantLabel}`,
      `node ${match.nodeId}`,
      `file ${match.fileName}`,
    ];

    if (detailParts.length) {
      parts.push(detailParts.join(", "));
    }

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
