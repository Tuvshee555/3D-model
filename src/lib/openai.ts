import OpenAI, { toFile, type Uploadable } from "openai";

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

async function toUploadable(
  source: string,
  name: string
): Promise<Uploadable> {
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
 * Generates a try-on preview. If `garmentPhoto` (a data URL or remote URL) is
 * provided, the garment shown in that photo is transferred onto the person;
 * otherwise the clothing is described by `garmentDescription` in text only.
 */
export async function generateTryOn(
  personPhotoDataUrl: string,
  garmentDescription: string,
  garmentPhoto?: string | null
): Promise<string> {
  const openai = getClient();
  const personFile = await toUploadable(personPhotoDataUrl, "person");

  let image: Uploadable | Uploadable[] = personFile;
  let prompt: string;

  if (garmentPhoto) {
    const garmentFile = await toUploadable(garmentPhoto, "garment");
    image = [personFile, garmentFile];
    prompt = `The first image is a person. The second image is a garment: ${garmentDescription}. Edit the first image so the person is wearing that exact garment from the second image — match its color, pattern, and cut faithfully. Keep the person's face, body pose, proportions, and the background exactly the same. Make it photorealistic, well-fitted, and naturally lit to match the original photo.`;
  } else {
    prompt = `Edit this photo so the person is wearing ${garmentDescription}. Keep their face, body pose, proportions, and the background exactly the same — only change the clothing. Make the new garment look photorealistic, well-fitted, and naturally lit to match the original photo.`;
  }

  const result = await openai.images.edit({
    model: "gpt-image-1",
    image,
    prompt,
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image returned from the AI provider");
  }
  return `data:image/png;base64,${b64}`;
}

/**
 * Produces a neutral full-body base photo for an avatar preset, which is then
 * dressed by the normal try-on edit pipeline.
 */
export async function generateAvatarBase(
  avatarDescription: string
): Promise<string> {
  const openai = getClient();
  const result = await openai.images.generate({
    model: "gpt-image-1",
    prompt: `A photorealistic full-body photo of ${avatarDescription}. Sharp, well-lit, realistic proportions, standing centered.`,
    size: "1024x1536",
  });

  const b64 = result.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("No image returned from the AI provider");
  }
  return `data:image/png;base64,${b64}`;
}
