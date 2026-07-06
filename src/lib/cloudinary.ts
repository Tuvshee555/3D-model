import { v2 as cloudinary } from "cloudinary";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
  const api_key = process.env.CLOUDINARY_API_KEY;
  const api_secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error("Cloudinary environment variables are not set");
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

/** Upload and return both the URL and the public_id (needed to delete later). */
export async function uploadImageDetailed(
  dataUrl: string,
  folder: string
): Promise<{ url: string; publicId: string }> {
  ensureConfigured();
  const result = await cloudinary.uploader.upload(dataUrl, { folder });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function uploadImage(
  dataUrl: string,
  folder: string
): Promise<string> {
  const { url } = await uploadImageDetailed(dataUrl, folder);
  return url;
}

/** Permanently delete an asset by public_id. Idempotent (no-op if already gone). */
export async function deleteImage(publicId: string): Promise<void> {
  ensureConfigured();
  await cloudinary.uploader.destroy(publicId);
}
