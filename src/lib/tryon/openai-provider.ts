import OpenAI, { toFile, type Uploadable } from "openai";
import type { ProviderResult, TryOnInput, TryOnProvider } from "./provider";

const MODEL = "gpt-image-1";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}

/** dataUrl looks like "data:image/jpeg;base64,/9j/4AAQ..." */
function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = /^data:(image\/\w+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error("Expected a base64 image data URL");
  }
  const [, mimeType, base64] = match;
  return { mimeType, buffer: Buffer.from(base64, "base64") };
}

async function toUploadable(source: string, name: string): Promise<Uploadable> {
  if (source.startsWith("data:")) {
    const { mimeType, buffer } = parseDataUrl(source);
    const extension = mimeType.split("/")[1] ?? "png";
    return toFile(buffer, `${name}.${extension}`, { type: mimeType });
  }
  // Otherwise treat as a remote URL (e.g. Cloudinary) and fetch the bytes.
  const res = await fetch(source);
  if (!res.ok) {
    throw new Error(`Failed to fetch reference image (${res.status})`);
  }
  const mimeType = res.headers.get("content-type") ?? "image/png";
  const extension = mimeType.split("/")[1] ?? "png";
  const buffer = Buffer.from(await res.arrayBuffer());
  return toFile(buffer, `${name}.${extension}`, { type: mimeType });
}

/**
 * The current gpt-image-1 provider. Full-image edit: if `garmentPhoto` is given
 * the garment in it is transferred onto the person; otherwise the clothing is
 * described in text only. (Bible marks this for eventual replacement by a
 * garment-mask VTON model — that swap happens behind this same interface.)
 */
export const openAIProvider: TryOnProvider = {
  name: "openai",

  async tryOn(input: TryOnInput): Promise<ProviderResult> {
    const openai = getClient();
    const personFile = await toUploadable(input.personPhoto, "person");

    let image: Uploadable | Uploadable[] = personFile;
    let prompt: string;

    if (input.garmentPhoto) {
      const garmentFile = await toUploadable(input.garmentPhoto, "garment");
      image = [personFile, garmentFile];
      prompt = `The first image is a person. The second image is a garment: ${input.garmentDescription}. Edit the first image so the person is wearing that exact garment from the second image — match its color, pattern, and cut faithfully. Keep the person's face, body pose, proportions, and the background exactly the same. Make it photorealistic, well-fitted, and naturally lit to match the original photo.`;
    } else {
      prompt = `Edit this photo so the person is wearing ${input.garmentDescription}. Keep their face, body pose, proportions, and the background exactly the same — only change the clothing. Make the new garment look photorealistic, well-fitted, and naturally lit to match the original photo.`;
    }

    const result = await openai.images.edit({ model: MODEL, image, prompt });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("No image returned from the AI provider");
    }
    return { image: `data:image/png;base64,${b64}`, model: MODEL };
  },
};
