const CHAT_MODEL_DEFINITIONS = [
  {
    id: "chat-model",
    name: "GPT-4o Mini",
    description:
      "OpenAI GPT-4o Mini for all chat interactions, optimized for Design System support with excellent function calling",
    providerModelId: "openai/gpt-4o-mini",
  },
  {
    id: "chat-model-reasoning",
    name: "GPT-4o Mini (Reasoning)",
    description:
      "GPT-4o Mini reasoning mode for complex Design System architecture questions",
    providerModelId: "openai/gpt-4o-mini",
    supportsReasoning: true,
  },
  {
    id: "anthropic-claude-sonnet-4-5",
    name: "Claude 4.5 Sonnet",
    description: "Anthropic Claude Sonnet 4.5 with strong reasoning and tool use",
    providerModelId: "anthropic/claude-sonnet-4.5",
  },
  {
    id: "anthropic-claude-haiku-4-5",
    name: "Claude 4.5 Haiku",
    description: "Anthropic Claude Haiku 4.5 for fast, lightweight responses",
    providerModelId: "anthropic/claude-haiku-4.5",
  },
  {
    id: "google-gemini-2-5-pro",
    name: "Gemini 2.5 Pro",
    description: "Google Gemini 2.5 Pro for high-quality multimodal reasoning",
    providerModelId: "google/gemini-2.5-pro",
  },
  {
    id: "google-gemini-2-5-flash",
    name: "Gemini 2.5 Flash",
    description: "Google Gemini 2.5 Flash for rapid, cost-effective outputs",
    providerModelId: "google/gemini-2.5-flash",
  },
  {
    id: "deepseek-chat-v3-1",
    name: "DeepSeek V3.1",
    description: "DeepSeek Chat V3.1 (free tier) for balanced cost and performance",
    providerModelId: "deepseek/deepseek-chat-v3.1:free",
  },
  {
    id: "deepseek-r1-0528",
    name: "DeepSeek R1 (0528)",
    description: "DeepSeek R1 reasoning model (May 28 build) for exploratory analysis",
    providerModelId: "deepseek/deepseek-r1-0528:free",
  },
  {
    id: "xai-grok-code-fast-1",
    name: "Grok Code Fast",
    description: "xAI Grok Code Fast 1 tuned for accelerated code assistance",
    providerModelId: "x-ai/grok-code-fast-1",
  },
  {
    id: "anthropic-claude-sonnet-4",
    name: "Claude 4 Sonnet",
    description: "Anthropic Claude Sonnet 4 for reliable general-purpose support",
    providerModelId: "anthropic/claude-sonnet-4",
  },
  {
    id: "zai-glm-4-6",
    name: "GLM 4.6",
    description: "Zhipu AI GLM 4.6 for multilingual, high-context reasoning",
    providerModelId: "z-ai/glm-4.6",
  },
  {
    id: "openai-gpt-5",
    name: "GPT-5",
    description: "OpenAI GPT-5 for state-of-the-art general intelligence",
    providerModelId: "openai/gpt-5",
  },
  {
    id: "qwen3-coder",
    name: "Qwen3 Coder",
    description: "Qwen3 Coder optimized for advanced code generation and refactoring",
    providerModelId: "qwen/qwen3-coder",
  },
] as const;

export type ChatModel = (typeof CHAT_MODEL_DEFINITIONS)[number];
export type ChatModelId = ChatModel["id"];

export const DEFAULT_CHAT_MODEL: ChatModelId = "chat-model";

export const chatModels: ChatModel[] = [...CHAT_MODEL_DEFINITIONS];

export const CHAT_MODEL_IDS = chatModels.map((model) => model.id) as ChatModelId[];

export const CHAT_MODEL_ID_ENUM = CHAT_MODEL_IDS as [ChatModelId, ...ChatModelId[]];
