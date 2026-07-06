import { uploadImage } from "@/lib/cloudinary";
import type { ProviderResult, TryOnInput, TryOnProvider } from "./provider";

// Identity-preserving virtual try-on (Bible §9): IDM-VTON repaints only the
// garment region, leaving the face/body untouched, so identity is preserved by
// construction rather than by prompt. Called via fal's synchronous endpoint.
const MODEL = "fal-ai/idm-vton";
const ENDPOINT = `https://fal.run/${MODEL}`;

/** fal.ai is available only when a key is configured. */
export function falEnabled(): boolean {
  return Boolean(process.env.FAL_KEY);
}

/**
 * IDM-VTON takes image URLs. A remote URL is passed through; inline data
 * (a base64 data URL) is uploaded to Cloudinary first so fal always receives a
 * fetchable URL regardless of payload size.
 */
async function ensureRemoteUrl(source: string): Promise<string> {
  if (/^https?:\/\//.test(source)) return source;
  if (source.startsWith("data:")) {
    return uploadImage(source, "tryon/fal-input");
  }
  throw new Error("Unsupported image source for the fal provider");
}

export const falProvider: TryOnProvider = {
  name: "fal",

  async tryOn(input: TryOnInput): Promise<ProviderResult> {
    const key = process.env.FAL_KEY;
    if (!key) {
      throw new Error("FAL_KEY is not set");
    }
    if (!input.garmentPhoto) {
      // IDM-VTON needs a garment image; the orchestrator should have chosen the
      // text-capable fallback. Guard anyway so we fail fast into that fallback.
      throw new Error("fal IDM-VTON requires a garment image");
    }

    const [humanUrl, garmentUrl] = await Promise.all([
      ensureRemoteUrl(input.personPhoto),
      ensureRemoteUrl(input.garmentPhoto),
    ]);

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Key ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        human_image_url: humanUrl,
        garment_image_url: garmentUrl,
        description: input.garmentDescription,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`fal.ai error ${res.status}: ${detail.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      image?: { url?: string; content_type?: string };
    };
    const imageUrl = json.image?.url;
    if (!imageUrl) {
      throw new Error("fal.ai returned no image");
    }

    // Fetch the result and return it as a data URL to match the provider
    // contract (callers upload/host it downstream).
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      throw new Error(`Failed to fetch fal result image (${imgRes.status})`);
    }
    const mime =
      json.image?.content_type ??
      imgRes.headers.get("content-type") ??
      "image/png";
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    return {
      image: `data:${mime};base64,${buffer.toString("base64")}`,
      model: MODEL,
    };
  },

  async avatar(): Promise<ProviderResult> {
    // IDM-VTON is garment-transfer only; avatar bases stay on the image model.
    throw new Error("fal provider does not support avatar generation");
  },
};
