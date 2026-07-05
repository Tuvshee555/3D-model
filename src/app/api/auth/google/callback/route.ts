import { NextRequest, NextResponse } from "next/server";
import { randomUUID, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getGoogleEmail } from "@/lib/google";
import { createUser, getUserByEmail } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { startSession } from "@/lib/auth";
import { appUrl } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_oauth_state")?.value;
  cookieStore.delete("google_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${appUrl()}/login?error=google`);
  }

  try {
    const email = await getGoogleEmail(code);

    let user = await getUserByEmail(email);
    if (!user) {
      const id = randomUUID();
      // OAuth accounts get a random unusable password hash (login is via Google).
      const randomPassword = randomBytes(24).toString("hex");
      await createUser(id, email, await hashPassword(randomPassword));
      user = { id, email, passwordHash: "" };
    }

    await startSession(user.id);
    return NextResponse.redirect(`${appUrl()}/dashboard`);
  } catch {
    return NextResponse.redirect(`${appUrl()}/login?error=google`);
  }
}
