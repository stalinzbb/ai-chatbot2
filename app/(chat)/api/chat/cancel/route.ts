import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { cancelStreamController } from "@/lib/ai/stream-registry";
import { deleteStreamIdById } from "@/lib/db/queries";
import { ChatSDKError } from "@/lib/errors";

const cancelSchema = z.object({
  streamId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const body = await request.json().catch(() => null);
  const parsed = cancelSchema.safeParse(body);

  if (!parsed.success) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  const { streamId } = parsed.data;

  try {
    const cancelled = cancelStreamController(streamId);
    await deleteStreamIdById({ streamId });

    return NextResponse.json({ cancelled });
  } catch (error) {
    console.error("[Chat API] Cancel failed", error);
    return new ChatSDKError("offline:chat").toResponse();
  }
}
