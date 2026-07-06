// APPROXIMATE per-image COGS estimates (USD). gpt-image-1 is billed on output
// image tokens; these are rough per-image figures whose ONLY job right now is to
// make sure every generation records *a* cost, so we can price above COGS
// (Bible §1.4, §7) and spot expensive paths. CALIBRATE these against real OpenAI
// invoices once volume exists — this table is the single place to do it.
const OPENAI_IMAGE_COST_USD: Record<string, number> = {
  "1024x1024": 0.08,
  "1024x1536": 0.12,
  "1536x1024": 0.12,
  default: 0.12,
};

/**
 * Best-effort cost estimate for a generation. Returns null (not 0) for models we
 * don't have figures for, so "unknown" is distinguishable from "free" in the data.
 */
export function estimateGenerationCostUsd(
  model: string,
  size?: string
): number | null {
  if (model === "gpt-image-1") {
    return OPENAI_IMAGE_COST_USD[size ?? "default"] ?? OPENAI_IMAGE_COST_USD.default;
  }
  // fal.ai IDM-VTON — approximate per-run price; calibrate against fal invoices.
  if (model === "fal-ai/idm-vton") {
    return 0.05;
  }
  return null;
}
