"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import {
  createStore,
  createGarment,
  createGarments,
  deleteGarment,
  getStoreById,
  slugExists,
} from "@/lib/db";
import { uploadImage } from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/auth";
import { parseCsv, csvToGarments } from "@/lib/csv";
import { fetchShopifyProducts } from "@/lib/shopify";

const SWATCHES = ["#3366ff", "#c0392b", "#f1c40f", "#2c3e50", "#c9a876", "#5d7a99"];
function pickSwatch(i: number): string {
  return SWATCHES[i % SWATCHES.length];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = base || "store";
  let slug = root;
  let n = 1;
  while (await slugExists(slug)) {
    n += 1;
    slug = `${root}-${n}`;
  }
  return slug;
}

/** Ensures the current user owns the store; returns the user id or redirects. */
async function requireStoreOwner(storeId: string): Promise<string> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const store = await getStoreById(storeId);
  if (!store || store.userId !== user.id) redirect("/dashboard");
  return user.id;
}

export async function createStoreAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/dashboard");

  const id = randomUUID();
  const slug = await uniqueSlug(slugify(name));
  await createStore({ id, userId: user.id, name, slug });
  redirect(`/dashboard/${id}`);
}

export async function createGarmentAction(formData: FormData): Promise<void> {
  const storeId = String(formData.get("storeId") ?? "");
  await requireStoreOwner(storeId);

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "top");
  const swatch = String(formData.get("swatch") ?? "#888888");
  const description = String(formData.get("description") ?? "").trim();
  const photoDataUrl = String(formData.get("photo") ?? "");
  const productUrlRaw = String(formData.get("productUrl") ?? "").trim();
  const productUrl = /^https?:\/\//.test(productUrlRaw) ? productUrlRaw : null;

  if (!name || !description) redirect(`/dashboard/${storeId}`);

  let photoUrl: string | null = null;
  if (photoDataUrl.startsWith("data:image/")) {
    photoUrl = await uploadImage(photoDataUrl, "tryon/garments");
  }

  await createGarment({
    id: randomUUID(),
    name,
    category,
    swatch,
    description,
    photoUrl,
    productUrl,
    storeId,
  });

  revalidatePath(`/dashboard/${storeId}`);
}

export async function deleteGarmentAction(formData: FormData): Promise<void> {
  const storeId = String(formData.get("storeId") ?? "");
  const garmentId = String(formData.get("garmentId") ?? "");
  await requireStoreOwner(storeId);
  await deleteGarment(garmentId, storeId);
  revalidatePath(`/dashboard/${storeId}`);
}

export type ImportState = { ok?: string; error?: string } | null;

export async function importCsvAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const storeId = String(formData.get("storeId") ?? "");
  await requireStoreOwner(storeId);

  const csvText = String(formData.get("csv") ?? "");
  if (!csvText.trim()) return { error: "Paste some CSV first." };

  const rows = csvToGarments(parseCsv(csvText));
  if (rows.length === 0) {
    return { error: "No valid rows found. Include a header row with a 'name' column." };
  }

  const count = await createGarments(
    rows.map((r, i) => ({
      id: randomUUID(),
      name: r.name,
      category: r.category,
      swatch: pickSwatch(i),
      description: r.description,
      photoUrl: r.photoUrl,
      productUrl: r.productUrl,
      storeId,
    }))
  );

  revalidatePath(`/dashboard/${storeId}`);
  return { ok: `Imported ${count} item${count === 1 ? "" : "s"}.` };
}

export async function importShopifyAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  const storeId = String(formData.get("storeId") ?? "");
  await requireStoreOwner(storeId);

  const domain = String(formData.get("domain") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();
  if (!domain || !token) {
    return { error: "Enter your Shopify domain and Admin API token." };
  }

  try {
    const products = await fetchShopifyProducts(domain, token);
    if (products.length === 0) {
      return { error: "No products found in that Shopify store." };
    }
    const count = await createGarments(
      products.map((p, i) => ({
        id: randomUUID(),
        name: p.title,
        category: p.category,
        swatch: pickSwatch(i),
        description: p.description,
        photoUrl: p.photoUrl,
        productUrl: p.productUrl,
        storeId,
      }))
    );
    revalidatePath(`/dashboard/${storeId}`);
    return { ok: `Imported ${count} product${count === 1 ? "" : "s"} from Shopify.` };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Shopify import failed.",
    };
  }
}
