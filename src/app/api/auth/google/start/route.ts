import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { buildGoogleAuthUrl, googleEnabled } from "@/lib/google";

export const runtime = "nodejs";

export async function GET() {
  if (!googleEnabled()) {
    return NextResponse.json(
      { error: "Google login is not configured (set GOOGLE_CLIENT_ID/SECRET)" },
      { status: 501 }
    );
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildGoogleAuthUrl(state));
}
