export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "Claude 3.5 Sonnet",
    description:
      "Anthropic Claude 3.5 Sonnet for all chat interactions, optimized for Design System support",
  },
  {
    id: "chat-model-reasoning",
    name: "Claude 3.5 Sonnet (Reasoning)",
    description:
      "Claude 3.5 Sonnet reasoning mode for complex Design System architecture questions",
  },
];
