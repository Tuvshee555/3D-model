import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getGarmentById,
  getStoreById,
  insertTryOn,
  reserveRateSlot,
  releaseRateSlot,
} from "@/lib/db";
import { runTryOn } from "@/lib/tryon";
import { moderateImage } from "@/lib/moderation";
import { uploadImageDetailed } from "@/lib/cloudinary";
import { getCurrentUser, getOrCreateAnonSession } from "@/lib/auth";
import { PLANS, FREE_TRYON_LIMIT, MAX_IMAGE_BYTES } from "@/lib/plans";

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
  // Explicit consent captured at the upload step (Bible §1.1).
  consent?: boolean;
};

export async function POST(request: NextRequest) {
  let body: TryOnRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { personImage, garmentId, customGarment, consent } = body;

  // Explicit consent is required before we process anyone's photo (Bible §1.1).
  if (consent !== true) {
    return NextResponse.json(
      { error: "Consent is required to generate a try-on." },
      { status: 400 }
    );
  }

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

  // Moderation guard: screen the photo before spending an AI call (Bible §1.1).
  const moderation = await moderateImage(personImage);
  if (moderation.flagged) {
    return NextResponse.json(
      {
        error:
          "This image can't be processed. Please use a clear, appropriate photo of yourself.",
      },
      { status: 400 }
    );
  }

  // Atomic rate reservation (Bible §8) — unify shopper (free, per-day) and
  // merchant (per-store, per-month) metering into one race-free path. Reserved
  // before generation; refunded below on a cache hit or a failed generation.
  const now = new Date();
  let rateKey: string;
  if (storeId) {
    const store = await getStoreById(storeId);
    const plan = PLANS[store?.plan ?? "free"] ?? PLANS.free;
    rateKey = `store:${storeId}:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`;
    if (!(await reserveRateSlot(rateKey, plan.tryOnsPerMonth))) {
      return NextResponse.json(
        {
          error: `This store has reached its monthly try-on limit (${plan.tryOnsPerMonth}). Upgrade the plan to continue.`,
        },
        { status: 402 }
      );
    }
  } else {
    rateKey = `free:${user?.id ?? sessionId}:${now.toISOString().slice(0, 10)}`;
    if (!(await reserveRateSlot(rateKey, FREE_TRYON_LIMIT))) {
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
    const [{ resultUrl: resultImageUrl, cached }, person] = await Promise.all([
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

    // A cache hit cost nothing — refund the reserved slot.
    if (cached) await releaseRateSlot(rateKey).catch(() => {});

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
    // A failed generation shouldn't consume a rate slot.
    await releaseRateSlot(rateKey).catch(() => {});
    const message = error instanceof Error ? error.message : "Generation failed";
    const status = message.includes("is not set") ? 501 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
