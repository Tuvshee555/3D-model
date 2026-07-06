import { NextRequest, NextResponse } from "next/server";
import { getAvatar } from "@/lib/avatars";
import { runAvatar } from "@/lib/tryon";
import { getCurrentUser, getOrCreateAnonSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: { avatarId?: string; extra?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const avatar = body.avatarId ? getAvatar(body.avatarId) : undefined;
  if (!avatar) {
    return NextResponse.json({ error: "Unknown avatarId" }, { status: 400 });
  }

  const extra = (body.extra ?? "").trim().slice(0, 200);
  const description = extra
    ? `${avatar.description}, ${extra}`
    : avatar.description;

  try {
    const user = await getCurrentUser();
    const sessionId = await getOrCreateAnonSession();
    const image = await runAvatar(
      { description },
      { sessionId, userId: user?.id ?? null, storeId: null, garmentId: null }
    );
    return NextResponse.json({ image });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    const status = message.includes("is not set") ? 501 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
