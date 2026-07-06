/** The app's public base URL, used to build absolute redirect/callback URLs. */
export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
