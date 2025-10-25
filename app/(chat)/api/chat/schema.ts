import { z } from "zod";
import { CHAT_MODEL_ID_ENUM } from "@/lib/ai/models";

const textPartSchema = z.object({
  type: z.enum(["text"]),
  text: z.string().min(1).max(10000), // Increased from 2000 to 10000 characters
});

const filePartSchema = z.object({
  type: z.enum(["file"]),
  mediaType: z.enum(["image/jpeg", "image/png"]),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(["user"]),
    parts: z.array(partSchema),
  }),
  selectedChatModel: z.enum(CHAT_MODEL_ID_ENUM),
  selectedVisibilityType: z.enum(["public", "private"]),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
