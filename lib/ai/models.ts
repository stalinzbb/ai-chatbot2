export const DEFAULT_CHAT_MODEL: string = "chat-model";

export type ChatModel = {
  id: string;
  name: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "chat-model",
    name: "GPT-4o Mini",
    description:
      "Fast and cost-effective AI assistant specialized in Design Systems and Figma components",
  },
  {
    id: "chat-model-reasoning",
    name: "GPT-4o Mini (Reasoning)",
    description:
      "Reasoning model for complex Design System architecture questions",
  },
];
