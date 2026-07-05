"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { createUser, getUserByEmail, deleteUserAccount } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { startSession, endSession, getCurrentUser } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export type AuthState = { error: string } | null;

function normalizeEmail(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim().toLowerCase();
}

export async function signupAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  // Consent + age gate (13+, COPPA) — required for image processing.
  if (formData.get("consent") !== "on") {
    return {
      error:
        "Please confirm you're 13+ and agree to the Terms and Privacy Policy.",
    };
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  await createUser(id, email, passwordHash);
  await sendWelcomeEmail(email); // no-op if email isn't configured
  await startSession(id);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  await startSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

/** GDPR erasure: permanently delete the signed-in user and all their data. */
export async function deleteAccountAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  await deleteUserAccount(user.id);
  await endSession();
  redirect("/");
}
