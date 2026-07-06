// The generation provider seam (Bible §5 / §9). All AI generation goes through a
// TryOnProvider so we can swap in a dedicated identity-preserving VTON model
// (fal.ai / Replicate) or a fine-tuned model later WITHOUT touching callers.

export type GenerationKind = "try_on";
export type GenerationOutcome = "success" | "error";

export type TryOnInput = {
  /** The shopper's photo as a base64 image data URL. */
  personPhoto: string;
  /** Text description of the garment (used as-is or to caption the reference). */
  garmentDescription: string;
  /** The garment reference image (data URL or remote URL). Null = text-only. */
  garmentPhoto?: string | null;
};

export type ProviderResult = {
  /** Generated image as a base64 data URL (data:image/png;base64,...). */
  image: string;
  /** Model identifier, e.g. "gpt-image-1" — recorded in telemetry. */
  model: string;
  /** Output size, e.g. "1024x1536", used for cost estimation. Optional. */
  size?: string;
};

export interface TryOnProvider {
  /** Provider name, e.g. "openai" — recorded in telemetry. */
  readonly name: string;
  tryOn(input: TryOnInput): Promise<ProviderResult>;
}
