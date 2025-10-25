export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "GLM-4.6",
    description:
      "Z-AI GLM-4.6 model for all chat interactions, optimized for Design System support",
  },
  {
    id: "chat-model-reasoning",
    name: "GLM-4.6 (Reasoning)",
    description:
      "GLM-4.6 reasoning mode for complex Design System architecture questions",
  },
];
