import type { FigmaIndexMatch, SearchOutcome } from "./index-search";

export type EnrichmentDecision = {
  shouldAutoEnrich: boolean;
  reason: string;
  target?: {
    fileId: string;
    nodeId: string;
    componentName: string;
    platform: FigmaIndexMatch["platform"];
    source: FigmaIndexMatch["source"];
    score: number;
    matchedTokens: string[];
  };
};

type Options = {
  minimumScore?: number;
  minimumCoverage?: number;
};

const DEFAULT_OPTIONS: Required<Options> = {
  minimumScore: 18,
  minimumCoverage: 0.6,
};

export function decideEnrichment(
  outcome: SearchOutcome | null,
  options: Options = {},
): EnrichmentDecision {
  if (!outcome || !outcome.matches.length) {
    return {
      shouldAutoEnrich: false,
      reason: "No index matches available",
    };
  }

  const { minimumScore, minimumCoverage } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const topMatch = outcome.matches[0];

  if (topMatch.kind !== "component") {
    return {
      shouldAutoEnrich: false,
      reason: `Top match is a ${topMatch.kind}, skipping auto-enrichment`,
    };
  }
  const coverage =
    outcome.tokens.length > 0
      ? topMatch.matchedTokens.length / outcome.tokens.length
      : 1;

  if (topMatch.score < minimumScore) {
    return {
      shouldAutoEnrich: false,
      reason: `Top score ${topMatch.score.toFixed(2)} is below threshold ${minimumScore}`,
    };
  }

  if (coverage < minimumCoverage) {
    return {
      shouldAutoEnrich: false,
      reason: `Token coverage ${coverage.toFixed(2)} is below threshold ${minimumCoverage}`,
    };
  }

  return {
    shouldAutoEnrich: true,
    reason: "High-confidence index match",
    target: {
      fileId: topMatch.fileId,
      nodeId: topMatch.nodeId,
      componentName: topMatch.componentName,
      platform: topMatch.platform,
      source: topMatch.source,
      score: topMatch.score,
      matchedTokens: topMatch.matchedTokens,
    },
  };
}
