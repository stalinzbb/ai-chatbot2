import type { UserType } from "@/app/(auth)/auth";
import type { ChatModel } from "./models";
import { CHAT_MODEL_IDS } from "./models";

type Entitlements = {
  maxMessagesPerDay: number;
  availableChatModelIds: ChatModel["id"][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 200,
    availableChatModelIds: [...CHAT_MODEL_IDS],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 200,
    availableChatModelIds: [...CHAT_MODEL_IDS],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
