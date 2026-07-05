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

export async function uploadImage(
  dataUrl: string,
  folder: string
): Promise<string> {
  ensureConfigured();
  const result = await cloudinary.uploader.upload(dataUrl, { folder });
  return result.secure_url;
}
