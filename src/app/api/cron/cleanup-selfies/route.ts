import { NextRequest, NextResponse } from "next/server";
import { getExpiredUnsavedSelfies, clearSelfie } from "@/lib/db";
import { deleteImage } from "@/lib/cloudinary";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bible §1.1: unsaved selfies auto-delete within 24h. Run on a schedule (see
// vercel.json). Deletes the Cloudinary selfie asset and blanks its row for any
// non-favorite try-on older than the TTL; results/garments are untouched.
const TTL_HOURS = 24;

export async function GET(request: NextRequest) {
  // If CRON_SECRET is configured, require it (Vercel Cron sends it as a Bearer
  // token). When unset, allow — the job only deletes already-expired data.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const before = new Date(
    Date.now() - TTL_HOURS * 60 * 60 * 1000
  ).toISOString();

  let deleted = 0;
  let failed = 0;
  try {
    const rows = await getExpiredUnsavedSelfies(before);
    for (const row of rows) {
      try {
        await deleteImage(row.publicId);
        await clearSelfie(row.id);
        deleted += 1;
      } catch {
        failed += 1; // retried on the next run (destroy is idempotent)
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ deleted, failed });
}
