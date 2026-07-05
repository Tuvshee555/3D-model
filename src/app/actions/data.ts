"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, getOrCreateAnonSession } from "@/lib/auth";
import { deleteTryOnsForOwner } from "@/lib/db";

export async function deleteMyTryOnsAction(): Promise<void> {
  const user = await getCurrentUser();
  const sessionId = await getOrCreateAnonSession();
  await deleteTryOnsForOwner({ sessionId, userId: user?.id ?? null });
  revalidatePath("/gallery");
}
