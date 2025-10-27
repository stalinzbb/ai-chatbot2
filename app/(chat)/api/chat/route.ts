import { geolocation } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { unstable_cache as cache } from "next/cache";
import { after } from "next/server";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ModelCatalog } from "tokenlens/core";
import { fetchModels } from "tokenlens/fetch";
import { getUsage } from "tokenlens/helpers";
import { auth, type UserType } from "@/app/(auth)/auth";
import type { VisibilityType } from "@/components/visibility-selector";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import type { ChatModel } from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { queryFigmaComponents } from "@/lib/ai/tools/query-figma-components";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import {
  registerStreamController,
  unregisterStreamController,
} from "@/lib/ai/stream-registry";
import { isProductionEnvironment } from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatLastContextById,
} from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";
import { decideEnrichment } from "@/lib/figma/enrichment";
import {
  formatMatchesForPrompt,
  searchFigmaIndex,
} from "@/lib/figma/index-search";
// MCP Tools for Figma Desktop
import {
  getCodeConnectMap,
  getDesignContext,
  getMetadata,
  getScreenshot,
  getVariableDefs,
  listFileVariables,
} from "@/lib/mcp/tools";
import type { ChatMessage } from "@/lib/types";
import type { AppUsage } from "@/lib/usage";
import {
  convertToUIMessages,
  generateUUID,
  getTextFromMessage,
} from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
  async (): Promise<ModelCatalog | undefined> => {
    try {
      return await fetchModels();
    } catch (err) {
      console.warn(
        "TokenLens: catalog fetch failed, using default catalog",
        err
      );
      return; // tokenlens helpers will fall back to defaultCatalog
    }
  },
  ["tokenlens-catalog"],
  { revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (error) {
    // Enhanced error handling with detailed validation feedback
    console.error("[Chat API] Request validation failed:", error);

    // If it's a Zod error, extract specific validation issues
    let cause = "Invalid request format";
    if (error && typeof error === "object" && "issues" in error) {
      const issues = (error as any).issues;
      if (Array.isArray(issues) && issues.length > 0) {
        cause = issues
          .map((issue: any) => {
            const path = issue.path.join(".");
            return `${path}: ${issue.message}`;
          })
          .join("; ");
      }
    }

    return new ChatSDKError("bad_request:api", cause).toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel["id"];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError("unauthorized:chat").toResponse();
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    } else {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    let indexSearchSummary: string | null = null;

    try {
      const latestUserText = getTextFromMessage(message).trim();

      if (latestUserText) {
        const indexSearchOutcome = await searchFigmaIndex({
          query: latestUserText,
          limit: 5,
        });

        indexSearchSummary = formatMatchesForPrompt(indexSearchOutcome, 3);

        if (indexSearchOutcome.matches.length) {
          console.log(
            "[Chat API] Index matches",
            indexSearchOutcome.matches.slice(0, 3).map((match) => ({
              nodeId: match.nodeId,
              fileId: match.fileId,
              component: match.componentName,
              kind: match.kind,
              score: Number(match.score.toFixed(2)),
            }))
          );
        }

        const enrichmentDecision = decideEnrichment(indexSearchOutcome);

        if (enrichmentDecision.shouldAutoEnrich) {
          const { target } = enrichmentDecision;
          console.log(
            "[Chat API] Enrichment trigger",
            target
              ? {
                  nodeId: target.nodeId,
                  fileId: target.fileId,
                  component: target.componentName,
                  platform: target.platform,
                  score: Number(target.score.toFixed(2)),
                }
              : enrichmentDecision
          );

          if (target) {
            const primaryLine = `PRIMARY CANDIDATE → node ${target.nodeId} (${target.componentName})`;
            indexSearchSummary = indexSearchSummary
              ? `${primaryLine}\n${indexSearchSummary}`
              : primaryLine;
          }
        }
      }
    } catch (err) {
      console.warn("[Chat API] Pre-chat index search failed", err);
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    let finalMergedUsage: AppUsage | undefined;

    console.log(
      "[Chat API] Starting stream for chat:",
      id,
      "model:",
      selectedChatModel
    );

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        console.log("[Chat API] Executing streamText...");
        const abortController = new AbortController();
        registerStreamController(streamId, abortController);

        let streamResult: ReturnType<typeof streamText> | null = null;

        const modelsWithoutTools = new Set<ChatModel["id"]>([
          "deepseek-chat-v3-1",
          "deepseek-r1-0528",
        ]);
        const shouldUseTools =
          selectedChatModel !== "chat-model-reasoning" &&
          !modelsWithoutTools.has(selectedChatModel);

        try {
          streamResult = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt({
              selectedChatModel,
              requestHints,
              indexSummary: indexSearchSummary || undefined,
            }),
            messages: convertToModelMessages(uiMessages),
            stopWhen: stepCountIs(5),
            abortSignal: abortController.signal,
            experimental_activeTools: shouldUseTools
              ? [
                  "createDocument",
                  "updateDocument",
                  "requestSuggestions",
                  "getDesignContext",
                  "getVariableDefs",
                  "getMetadata",
                  "getScreenshot",
                  "getCodeConnectMap",
                  "listFileVariables",
                  "queryFigmaComponents",
                ]
              : [],
            experimental_transform: smoothStream({ chunking: "word" }),
            tools: shouldUseTools
              ? {
                  createDocument: createDocument({ session, dataStream }),
                  updateDocument: updateDocument({ session, dataStream }),
                  requestSuggestions: requestSuggestions({
                    session,
                    dataStream,
                  }),
                  // MCP Tools for Figma Desktop
                  getDesignContext,
                  getVariableDefs,
                  getMetadata,
                  getScreenshot,
                  getCodeConnectMap,
                  listFileVariables,
                  queryFigmaComponents,
                }
              : undefined,
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: "stream-text",
            },
            onFinish: async ({ usage }) => {
              console.log(
                "[Chat API] streamText onFinish called with usage:",
                usage
              );
              unregisterStreamController(streamId);
              try {
                const providers = await getTokenlensCatalog();
                const modelId =
                  myProvider.languageModel(selectedChatModel).modelId;
                if (!modelId) {
                  console.log("[Chat API] No modelId found");
                  finalMergedUsage = usage;
                  dataStream.write({
                    type: "data-usage",
                    data: finalMergedUsage,
                  });
                  return;
                }

                if (!providers) {
                  console.log("[Chat API] No providers catalog");
                  finalMergedUsage = usage;
                  dataStream.write({
                    type: "data-usage",
                    data: finalMergedUsage,
                  });
                  return;
                }

                const summary = getUsage({ modelId, usage, providers });
                finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
                console.log("[Chat API] Writing usage data");
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
              } catch (err) {
                console.warn("TokenLens enrichment failed", err);
                finalMergedUsage = usage;
                dataStream.write({
                  type: "data-usage",
                  data: finalMergedUsage,
                });
              }
            },
            onAbort: () => {
              unregisterStreamController(streamId);
            },
            onError: ({ error }) => {
              unregisterStreamController(streamId);
              console.error("[Chat API] streamText error", error);
            },
          });

          dataStream.write({
            type: "data-streamControl",
            data: { streamId },
          });

          streamResult.consumeStream();
        } catch (streamError) {
          unregisterStreamController(streamId);
          throw streamError;
        }

        if (streamResult) {
          dataStream.merge(
            streamResult.toUIMessageStream({
              sendReasoning: true,
            })
          );
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((currentMessage) => ({
            id: currentMessage.id,
            role: currentMessage.role,
            parts: currentMessage.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalMergedUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalMergedUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: (error) => {
        unregisterStreamController(streamId);
        console.error("[Chat API] Stream error:", error);
        return `Error: ${error instanceof Error ? error.message : "An error occurred"}`;
      },
    });

    // const streamContext = getStreamContext();

    // if (streamContext) {
    //   return new Response(
    //     await streamContext.resumableStream(streamId, () =>
    //       stream.pipeThrough(new JsonToSseTransformStream())
    //     )
    //   );
    // }

    return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    // Check for Vercel AI Gateway credit card error
    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatSDKError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
