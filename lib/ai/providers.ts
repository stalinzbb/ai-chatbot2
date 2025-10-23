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
        // Main chat model - Claude 3.5 Sonnet for best Design System understanding
        "chat-model": openrouter("openai/gpt-4o-mini"),
        // Reasoning model - uses Claude 3 Opus for complex reasoning
        "chat-model-reasoning": wrapLanguageModel({
          model: openrouter("openai/gpt-4o-mini"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        // Title model - GPT-4o-mini for cost-effective title generation
        "title-model": openrouter("openai/gpt-4o-mini"),
        // Artifact model - Claude 3.5 Sonnet for document generation
        "artifact-model": openrouter("openai/gpt-4o-mini"),
      },
    });
