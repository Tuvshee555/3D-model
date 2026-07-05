import { cookies } from "next/headers";
import { randomBytes, randomUUID } from "node:crypto";
import {
  createAuthSession,
  deleteAuthSession,
  getUserByToken,
} from "./db";
import type { User } from "./types";

export const AUTH_COOKIE = "auth_token";
export const ANON_SESSION_COOKIE = "session_id";
const SESSION_DAYS = 30;

/** Reads the auth cookie and returns the logged-in user, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  const user = await getUserByToken(token);
  return user ?? null;
}

/** Creates an auth session row and sets the cookie. Call from a Server Action / route. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await createAuthSession(token, userId, expiresAt);

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (token) {
    await deleteAuthSession(token);
    cookieStore.delete(AUTH_COOKIE);
  }
}

/** Returns the anonymous try-on session id, creating one if absent. */
export async function getOrCreateAnonSession(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ANON_SESSION_COOKIE)?.value;
  if (existing) return existing;
  const id = randomUUID();
  cookieStore.set(ANON_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
  return id;
}
