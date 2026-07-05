import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getGarmentById,
  getStoreById,
  insertTryOn,
  countStoreTryOnsThisMonth,
} from "@/lib/db";
import { generateTryOn } from "@/lib/openai";
import { uploadImage } from "@/lib/cloudinary";
import { getCurrentUser, getOrCreateAnonSession } from "@/lib/auth";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

type TryOnRequestBody = {
  personImage?: string;
  garmentId?: string;
  // Wardrobe-import path: shopper's own item (not in any catalog).
  customGarment?: { description?: string; photo?: string };
  // "Change color" refine — re-render the same item in another color.
  colorOverride?: string;
};

export async function POST(request: NextRequest) {
  let body: TryOnRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { personImage, garmentId, customGarment, colorOverride } = body;

  if (!personImage || !personImage.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "personImage must be a base64 image data URL" },
      { status: 400 }
    );
  }

  // Resolve the garment: catalog item OR ad-hoc custom item.
  let description: string;
  let referencePhoto: string | null;
  let resolvedGarmentId: string | null;
  let garmentName: string;
  let garmentCategory: string;
  let storeId: string | null = null;
  let productUrl: string | null = null;

  if (garmentId) {
    const garment = await getGarmentById(garmentId);
    if (!garment) {
      return NextResponse.json({ error: "Unknown garmentId" }, { status: 400 });
    }

    // Enforce the store's monthly quota (store-owned garments only).
    if (garment.storeId) {
      const store = await getStoreById(garment.storeId);
      const plan = PLANS[store?.plan ?? "free"] ?? PLANS.free;
      const used = await countStoreTryOnsThisMonth(garment.storeId);
      if (used >= plan.tryOnsPerMonth) {
        return NextResponse.json(
          {
            error: `This store has reached its monthly try-on limit (${plan.tryOnsPerMonth}). Upgrade the plan to continue.`,
          },
          { status: 402 }
        );
      }
    }

    description = garment.description;
    referencePhoto = garment.photoUrl;
    resolvedGarmentId = garment.id;
    garmentName = garment.name;
    garmentCategory = garment.category;
    storeId = garment.storeId;
    productUrl = garment.productUrl;
  } else if (customGarment?.description || customGarment?.photo) {
    description = (customGarment.description || "the uploaded garment").trim();
    referencePhoto =
      customGarment.photo && customGarment.photo.startsWith("data:image/")
        ? customGarment.photo
        : null;
    resolvedGarmentId = null;
    garmentName = "My item";
    garmentCategory = "top";
  } else {
    return NextResponse.json(
      { error: "Provide a garmentId or a customGarment" },
      { status: 400 }
    );
  }

  // Optional "change color" refine — sanitize to letters/spaces to keep it a color word.
  const color = (colorOverride ?? "").trim().slice(0, 24).replace(/[^a-zA-Z ]/g, "");
  const finalDescription = color ? `${description}, in ${color}` : description;
  // When re-coloring, the reference photo would fight the color change, so drop it.
  const finalReference = color ? null : referencePhoto;

  const user = await getCurrentUser();
  const sessionId = await getOrCreateAnonSession();

  try {
    const resultDataUrl = await generateTryOn(
      personImage,
      finalDescription,
      finalReference
    );

    const [personImageUrl, resultImageUrl] = await Promise.all([
      uploadImage(personImage, "tryon/person"),
      uploadImage(resultDataUrl, "tryon/result"),
    ]);

    const tryOnId = randomUUID();
    await insertTryOn({
      id: tryOnId,
      sessionId,
      userId: user?.id ?? null,
      storeId,
      garmentId: resolvedGarmentId,
      garmentName,
      garmentCategory,
      personImageUrl,
      resultImageUrl,
    });

    return NextResponse.json({
      id: tryOnId,
      resultImage: resultImageUrl,
      productUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    const status = message.includes("is not set") ? 501 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
