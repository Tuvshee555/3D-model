import { randomUUID } from "node:crypto";
import { insertGeneration } from "@/lib/db";
import { estimateGenerationCostUsd } from "./cost";
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
  result: ProviderResult | null,
  scope: GenerationScope,
  outcome: GenerationOutcome,
  latencyMs: number,
  error: string | null
): Promise<void> {
  try {
    await insertGeneration({
      id: randomUUID(),
      kind,
      provider: providerName,
      model: result?.model ?? "unknown",
      sessionId: scope.sessionId,
      userId: scope.userId,
      storeId: scope.storeId,
      garmentId: scope.garmentId,
      outcome,
      error: error ? error.slice(0, 500) : null,
      latencyMs,
      costUsd:
        outcome === "success" && result
          ? estimateGenerationCostUsd(result.model, result.size)
          : null,
    });
  } catch {
    // Telemetry is never allowed to break a generation.
  }
}

/**
 * Run a try-on through the provider, logging cost/latency/outcome. Returns the
 * result image data URL. On failure it logs an error row and rethrows the
 * original error so the route can shape the HTTP response exactly as before.
 */
export async function runTryOn(
  input: TryOnInput,
  scope: GenerationScope
): Promise<string> {
  const provider = getProvider();
  const started = Date.now();
  try {
    const result = await provider.tryOn(input);
    await record("try_on", provider.name, result, scope, "success", Date.now() - started, null);
    return result.image;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    await record("try_on", provider.name, null, scope, "error", Date.now() - started, message);
    throw err;
  }
}

/** Run an avatar-base generation through the provider, with the same telemetry. */
export async function runAvatar(
  input: AvatarInput,
  scope: GenerationScope
): Promise<string> {
  const provider = getProvider();
  const started = Date.now();
  try {
    const result = await provider.avatar(input);
    await record("avatar", provider.name, result, scope, "success", Date.now() - started, null);
    return result.image;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    await record("avatar", provider.name, null, scope, "error", Date.now() - started, message);
    throw err;
  }
}
