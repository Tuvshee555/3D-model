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
import type {
  AvatarInput,
  GenerationKind,
  GenerationOutcome,
  ProviderResult,
  TryOnInput,
  TryOnProvider,
} from "./provider";

export type { TryOnInput, AvatarInput } from "./provider";

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
 * The active generation provider. Single provider for now; this is the seam that
 * lets us swap in a dedicated VTON model later without touching any caller.
 */
function getProvider(): TryOnProvider {
  return openAIProvider;
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
 * Run a try-on through the provider with a result cache in front. On a cache hit
 * the provider is never called (instant, zero cost). On a miss the result is
 * uploaded to storage, cached, and logged. Returns the hosted result URL.
 *
 * Cache reads/writes are best-effort: if the cache layer errors, we fall back to
 * a normal generation rather than failing the request.
 */
export async function runTryOn(
  input: TryOnInput,
  scope: GenerationScope
): Promise<TryOnResult> {
  const provider = getProvider();
  const cacheKey = computeTryOnCacheKey(provider.name, input);
  const started = Date.now();

  let cached: { resultUrl: string; model: string } | undefined;
  try {
    cached = await getCachedGeneration(cacheKey);
  } catch {
    cached = undefined; // treat a cache-lookup failure as a miss
  }
  if (cached) {
    await record(
      "try_on",
      provider.name,
      cached.model,
      scope,
      "cache_hit",
      Date.now() - started,
      0,
      null
    );
    return { resultUrl: cached.resultUrl, cached: true };
  }

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
      // Best-effort cache write; a failure just means the next identical
      // request regenerates.
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
    const message = err instanceof Error ? err.message : "Generation failed";
    await record(
      "try_on",
      provider.name,
      "unknown",
      scope,
      "error",
      Date.now() - started,
      null,
      message
    );
    throw err;
  }
}

/**
 * Run an avatar-base generation through the provider with telemetry. Returns the
 * image as a data URL (avatars are held client-side, not cached or hosted).
 */
export async function runAvatar(
  input: AvatarInput,
  scope: GenerationScope
): Promise<string> {
  const provider = getProvider();
  const started = Date.now();
  try {
    const result = await provider.avatar(input);
    await record(
      "avatar",
      provider.name,
      result.model,
      scope,
      "success",
      Date.now() - started,
      costOf(result),
      null
    );
    return result.image;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    await record(
      "avatar",
      provider.name,
      "unknown",
      scope,
      "error",
      Date.now() - started,
      null,
      message
    );
    throw err;
  }
}
