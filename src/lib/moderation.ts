import OpenAI from "openai";

// Basic image moderation guard (Bible §1.1 / §8): screen shopper photos for
// disallowed content (sexual / minors / etc.) before spending an AI call. Uses
// OpenAI's omni-moderation model. Fail-open on any error so a moderation outage
// degrades to "allow" rather than taking the whole product down — a true flag
// still blocks.

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export async function moderateImage(
  imageDataUrl: string
): Promise<{ flagged: boolean; reason?: string }> {
  const openai = getClient();
  if (!openai) return { flagged: false }; // can't moderate without a key

  try {
    const res = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: [{ type: "image_url", image_url: { url: imageDataUrl } }],
    });
    const result = res.results?.[0];
    if (result?.flagged) {
      const categories = result.categories as unknown as Record<string, boolean>;
      const reason = Object.keys(categories).find((k) => categories[k]);
      return { flagged: true, reason };
    }
    return { flagged: false };
  } catch {
    return { flagged: false }; // fail open on moderation outage
  }
}
