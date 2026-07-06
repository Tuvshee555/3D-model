import { randomUUID } from "node:crypto";
import {
  getCachedGeneration,
  insertGeneration,
  putCachedGeneration,
} from "@/lib/db";
import { uploadImage } from "@/lib/cloudinary";
import { estimateGenerationCostUsd } from "./cost";
import { computeTryOnCacheKey } from "./cache";
import { openAIProvider } from "./openai-provider";
import { falProvider, falEnabled } from "./fal-provider";
import type {
  GenerationKind,
  GenerationOutcome,
  ProviderResult,
  TryOnInput,
  TryOnProvider,
} from "./provider";

export type { TryOnInput } from "./provider";

/** Who/what a generation is for — recorded in telemetry, not used for auth. */
export type GenerationScope = {
  sessionId: string | null;
  userId: string | null;
  storeId: string | null;
  garmentId: string | null;
};

/** Result of a try-on: a hosted result URL and whether it came from cache. */
export type TryOnResult = { resultUrl: string; cached: boolean };

/**
 * Ordered providers to attempt for a try-on. fal.ai (identity-preserving VTON)
 * is preferred when it's configured AND there's a garment image for it to
 * transfer; gpt-image-1 is always the final fallback — it handles text-only
 * garments and covers any fal outage. The first success wins.
 */
function selectTryOnProviders(input: TryOnInput): TryOnProvider[] {
  const providers: TryOnProvider[] = [];
  if (falEnabled() && input.garmentPhoto) {
    providers.push(falProvider);
  }
  providers.push(openAIProvider);
  return providers;
}

/**
 * Persist one telemetry row. Best-effort: a logging failure must NEVER break a
 * generation, so everything here is swallowed.
 */
async function record(
  kind: GenerationKind,
  providerName: string,
  model: string,
  scope: GenerationScope,
  outcome: GenerationOutcome | "cache_hit",
  latencyMs: number,
  costUsd: number | null,
  error: string | null
): Promise<void> {
  try {
    await insertGeneration({
      id: randomUUID(),
      kind,
      provider: providerName,
      model,
      sessionId: scope.sessionId,
      userId: scope.userId,
      storeId: scope.storeId,
      garmentId: scope.garmentId,
      outcome,
      error: error ? error.slice(0, 500) : null,
      latencyMs,
      costUsd,
    });
  } catch {
    // Telemetry is never allowed to break a generation.
  }
}

function costOf(result: ProviderResult): number | null {
  return estimateGenerationCostUsd(result.model, result.size);
}

/**
 * Run a try-on with a result cache in front and provider fallback behind. On a
 * cache hit the providers are never called. On a miss each provider is tried in
 * order (fal.ai → gpt-image-1) until one succeeds; the result is uploaded,
 * cached under the primary provider's key, and logged. Returns the hosted URL.
 *
 * Cache reads/writes are best-effort: a cache-layer error falls back to a
 * normal generation rather than failing the request.
 */
export async function runTryOn(
  input: TryOnInput,
  scope: GenerationScope
): Promise<TryOnResult> {
  const providers = selectTryOnProviders(input);
  const primary = providers[0];
  const cacheKey = computeTryOnCacheKey(primary.name, input);
  const cacheStarted = Date.now();

  let cached: { resultUrl: string; provider: string; model: string } | undefined;
  try {
    cached = await getCachedGeneration(cacheKey);
  } catch {
    cached = undefined; // treat a cache-lookup failure as a miss
  }
  if (cached) {
    await record(
      "try_on",
      cached.provider,
      cached.model,
      scope,
      "cache_hit",
      Date.now() - cacheStarted,
      0,
      null
    );
    return { resultUrl: cached.resultUrl, cached: true };
  }

  let lastError = "Generation failed";
  for (const provider of providers) {
    const started = Date.now();
    try {
      const result = await provider.tryOn(input);
      const resultUrl = await uploadImage(result.image, "tryon/result");
      try {
        await putCachedGeneration({
          cacheKey,
          resultUrl,
          provider: provider.name,
          model: result.model,
        });
      } catch {
        // Best-effort cache write; a failure just regenerates next time.
      }
      await record(
        "try_on",
        provider.name,
        result.model,
        scope,
        "success",
        Date.now() - started,
        costOf(result),
        null
      );
      return { resultUrl, cached: false };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Generation failed";
      await record(
        "try_on",
        provider.name,
        "unknown",
        scope,
        "error",
        Date.now() - started,
        null,
        lastError
      );
      // Fall through to the next provider (e.g. fal.ai → gpt-image-1).
    }
  }
  throw new Error(lastError);
}
