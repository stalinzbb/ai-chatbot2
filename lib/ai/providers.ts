import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";

// Configure OpenRouter as a provider
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
    "X-Title": "Double Good Design System Chat",
  },
  fetch: async (input, init) => {
    if (process.env.NODE_ENV !== "production" && typeof input === "string") {
      try {
        console.log("[openrouter] request", input, init?.body);
      } catch (error) {
        console.log("[openrouter] request", input, "[unserializable body]", error);
      }
    }
    return fetch(input, init);
  },
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        // Main chat model - GPT-4o-mini for general chat handling
        "chat-model": openrouter.chat("openai/gpt-4o-mini"),
        // Reasoning model - runs through the same model but with reasoning middleware
        "chat-model-reasoning": wrapLanguageModel({
          model: openrouter.chat("openai/gpt-4o-mini"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        // Title model - GPT-4o-mini for cost-effective title generation
        "title-model": openrouter.chat("openai/gpt-4o-mini"),
        // Artifact model - GPT-4o-mini for document generation
        "artifact-model": openrouter.chat("openai/gpt-4o-mini"),
      },
    });
