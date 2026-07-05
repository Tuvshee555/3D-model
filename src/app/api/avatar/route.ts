import { NextRequest, NextResponse } from "next/server";
import { getAvatar } from "@/lib/avatars";
import { generateAvatarBase } from "@/lib/openai";

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
    const image = await generateAvatarBase(description);
    return NextResponse.json({ image });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    const status = message.includes("is not set") ? 501 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
