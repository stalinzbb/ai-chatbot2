import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import { chatModels } from "./models";

// Configure OpenRouter as a provider
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
    "X-Title": "Double Good Design System Chat",
  },
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    if (process.env.NODE_ENV !== "production" && typeof input === "string") {
      try {
        console.log("[openrouter] request", input, init?.body);
      } catch (error) {
        console.log(
          "[openrouter] request",
          input,
          "[unserializable body]",
          error
        );
      }
    }
    return globalThis.fetch(input, init);
  },
});

const buildTestLanguageModels = () => {
  const {
    artifactModel,
    chatModel,
    reasoningModel,
    titleModel,
  } = require("./models.mock");

  const languageModels: Record<string, unknown> = Object.fromEntries(
    chatModels.map((model) => [
      model.id,
      model.supportsReasoning ? reasoningModel : chatModel,
    ])
  );

  languageModels["title-model"] = titleModel;
  languageModels["artifact-model"] = artifactModel;

  return languageModels;
};

const buildProductionLanguageModels = () => {
  const cache = new Map<string, ReturnType<typeof openrouter.chat>>();

  const getModel = (providerModelId: string) => {
    const cached = cache.get(providerModelId);
    if (cached) {
      return cached;
    }
    const created = openrouter.chat(providerModelId);
    cache.set(providerModelId, created);
    return created;
  };

  const entries = chatModels.map((model) => {
    const baseModel = getModel(model.providerModelId);
    if (model.supportsReasoning) {
      return [
        model.id,
        wrapLanguageModel({
          model: baseModel,
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
      ] as const;
    }
    return [model.id, baseModel] as const;
  });

  const defaultModel = getModel("openai/gpt-4o-mini");

  entries.push(["title-model", defaultModel] as const);
  entries.push(["artifact-model", defaultModel] as const);

  return Object.fromEntries(entries);
};

export const myProvider = customProvider({
  languageModels: isTestEnvironment
    ? buildTestLanguageModels()
    : buildProductionLanguageModels(),
});
