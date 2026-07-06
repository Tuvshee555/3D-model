// Runs once when a Next.js server instance starts (Bible §8: validate config at
// boot). Node runtime only — env/config isn't meaningful on the edge runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportConfig } = await import("./lib/config");
    reportConfig();
  }
}
