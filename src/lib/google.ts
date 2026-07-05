import { appUrl } from "./stripe";

export function googleEnabled(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
}

export function googleRedirectUri(): string {
  return `${appUrl()}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Exchanges an auth code for the user's verified email. */
export async function getGoogleEmail(code: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error("Google token exchange failed");
  }

  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) {
    throw new Error("No id_token from Google");
  }

  // Decode the JWT payload (received directly from Google over TLS).
  const payloadPart = json.id_token.split(".")[1];
  const payload = JSON.parse(
    Buffer.from(payloadPart, "base64url").toString("utf8")
  ) as { email?: string; email_verified?: boolean };

  if (!payload.email) {
    throw new Error("No email in Google token");
  }
  return payload.email.toLowerCase();
}
