// Central config validation (Bible §8: validate config at boot). Required keys
// gate core functionality; optional keys just enable integrations.

const REQUIRED = [
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

const OPTIONAL = [
  "FAL_KEY",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_GA_ID",
  "NEXT_PUBLIC_MIXPANEL_TOKEN",
] as const;

export function checkConfig(): {
  missingRequired: string[];
  missingOptional: string[];
} {
  const missingRequired = REQUIRED.filter((k) => !process.env[k]);
  const missingOptional = OPTIONAL.filter((k) => !process.env[k]);
  return { missingRequired, missingOptional };
}

/**
 * Log a clear config summary at startup. Warns rather than crashing so a deploy
 * that populates env a moment later still boots; missing REQUIRED keys are
 * logged as an error so they surface immediately in logs.
 */
export function reportConfig(): void {
  const { missingRequired, missingOptional } = checkConfig();
  if (missingRequired.length) {
    console.error(
      `[config] MISSING REQUIRED env: ${missingRequired.join(
        ", "
      )} — core features will fail until these are set.`
    );
  } else {
    console.log("[config] all required env present.");
  }
  if (missingOptional.length) {
    console.warn(
      `[config] optional env not set (integrations disabled): ${missingOptional.join(
        ", "
      )}`
    );
  }
}
