import { NextRequest, NextResponse } from "next/server";
import { getStripe, appUrl } from "@/lib/stripe";
import { getCurrentUser } from "@/lib/auth";
import { getStoreById } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { storeId?: string; planId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { storeId, planId } = body;
  const plan = planId ? PLANS[planId] : undefined;
  if (!storeId || !plan || plan.priceUsd === 0 || !plan.stripePriceEnv) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const store = await getStoreById(storeId);
  if (!store || store.userId !== user.id) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const priceId = process.env[plan.stripePriceEnv];
  if (!priceId) {
    return NextResponse.json(
      { error: `${plan.stripePriceEnv} is not set` },
      { status: 501 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: store.id,
      metadata: { storeId: store.id, planId: plan.id },
      success_url: `${appUrl()}/dashboard/${store.id}?upgraded=1`,
      cancel_url: `${appUrl()}/pricing?store=${store.id}`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout failed";
    const status = message.includes("is not set") ? 501 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
