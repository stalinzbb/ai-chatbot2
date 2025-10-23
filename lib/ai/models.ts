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
    description: "Advanced AI assistant specialized in Design Systems and Figma components",
  },
  {
    id: "chat-model-reasoning",
    name: "Claude 3 Opus (Reasoning)",
    description:
      "Deep reasoning model for complex Design System architecture questions",
  },
];
