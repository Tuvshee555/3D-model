import { NextRequest, NextResponse } from "next/server";
import { setTryOnFavorite } from "@/lib/db";
import { getCurrentUser, getOrCreateAnonSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { isFavorite?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const isFavorite = Boolean(body.isFavorite);
  const user = await getCurrentUser();
  const sessionId = await getOrCreateAnonSession();

  const updated = await setTryOnFavorite(id, isFavorite, {
    sessionId,
    userId: user?.id ?? null,
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Try-on not found or not yours" },
      { status: 404 }
    );
  }

  return NextResponse.json({ id, isFavorite });
}
