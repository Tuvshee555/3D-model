import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getGarmentById,
  getStoreById,
  insertTryOn,
  countStoreTryOnsThisMonth,
  countRecentTryOns,
} from "@/lib/db";
import { runTryOn } from "@/lib/tryon";
import { uploadImageDetailed } from "@/lib/cloudinary";
import { getCurrentUser, getOrCreateAnonSession } from "@/lib/auth";
import {
  PLANS,
  FREE_TRYON_LIMIT,
  FREE_TRYON_WINDOW_HOURS,
  MAX_IMAGE_BYTES,
} from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Approximate the decoded byte size of a base64 data URL without decoding it. */
function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

type TryOnRequestBody = {
  personImage?: string;
  garmentId?: string;
  // Wardrobe-import path: shopper's own item (not in any catalog).
  customGarment?: { description?: string; photo?: string };
};

export async function POST(request: NextRequest) {
  let body: TryOnRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { personImage, garmentId, customGarment } = body;

  if (!personImage || !personImage.startsWith("data:image/")) {
    return NextResponse.json(
      { error: "personImage must be a base64 image data URL" },
      { status: 400 }
    );
  }

  // Reject oversized uploads before spending an AI call on them.
  if (
    dataUrlBytes(personImage) > MAX_IMAGE_BYTES ||
    (customGarment?.photo &&
      customGarment.photo.startsWith("data:image/") &&
      dataUrlBytes(customGarment.photo) > MAX_IMAGE_BYTES)
  ) {
    return NextResponse.json(
      { error: "Image is too large. Please use a photo under 15 MB." },
      { status: 413 }
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

  const finalDescription = description;
  const finalReference = referencePhoto;

  const user = await getCurrentUser();
  const sessionId = await getOrCreateAnonSession();

  // Free-tier abuse guard: try-ons not billed to a store's monthly quota (the
  // public demo catalog and custom wardrobe uploads) are capped per shopper
  // over a rolling window so the AI endpoint can't be run up anonymously.
  if (!storeId) {
    const since = new Date(
      Date.now() - FREE_TRYON_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();
    const recent = await countRecentTryOns(
      { sessionId, userId: user?.id ?? null },
      since
    );
    if (recent >= FREE_TRYON_LIMIT) {
      return NextResponse.json(
        {
          error: `You've reached the free limit of ${FREE_TRYON_LIMIT} try-ons per day. Add a store plan for higher limits.`,
        },
        { status: 429 }
      );
    }
  }

  try {
    // runTryOn owns the result upload + cache; person image is uploaded in
    // parallel since it doesn't depend on the generation.
    const [{ resultUrl: resultImageUrl }, person] = await Promise.all([
      runTryOn(
        {
          personPhoto: personImage,
          garmentDescription: finalDescription,
          garmentPhoto: finalReference,
        },
        {
          sessionId,
          userId: user?.id ?? null,
          storeId,
          garmentId: resolvedGarmentId,
        }
      ),
      uploadImageDetailed(personImage, "tryon/person"),
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
      personImageUrl: person.url,
      personImagePublicId: person.publicId,
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
