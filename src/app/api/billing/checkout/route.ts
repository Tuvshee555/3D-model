import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import {
  getStoreById,
  createBillingInvoice,
  setBillingInvoiceRef,
} from "@/lib/db";
import { PLANS } from "@/lib/plans";
import { getBillingProvider } from "@/lib/billing";
import { appUrl } from "@/lib/urls";

export const runtime = "nodejs";

// Provider-agnostic checkout. Picks a BillingProvider (QPay by default), writes
// a ledger row, and returns either a redirect (Stripe) or a QR (QPay). The
// subscription logic below never references a specific provider.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    storeId?: string;
    planId?: string;
    provider?: string;
    country?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { storeId, planId, provider: providerName, country } = body;
  const plan = planId ? PLANS[planId] : undefined;
  if (!storeId || !plan || plan.priceUsd === 0) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const store = await getStoreById(storeId);
  if (!store || store.userId !== user.id) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const provider = getBillingProvider({ provider: providerName, country });
  if (!provider.isConfigured()) {
    return NextResponse.json(
      { error: `Billing provider "${provider.name}" is not configured` },
      { status: 501 }
    );
  }

  const reference = randomUUID();
  const currency = provider.name === "qpay" ? "MNT" : "USD";
  const amount =
    provider.name === "qpay" ? plan.priceMnt ?? null : plan.priceUsd;
  await createBillingInvoice({
    id: reference,
    storeId: store.id,
    planId: plan.id,
    provider: provider.name,
    amount,
    currency,
  });

  try {
    const result = await provider.createCheckout({
      store,
      plan,
      email: user.email,
      reference,
      successUrl: `${appUrl()}/dashboard/${store.id}?upgraded=1`,
      cancelUrl: `${appUrl()}/pricing?store=${store.id}`,
    });
    await setBillingInvoiceRef(reference, result.providerRef);

    if (result.kind === "redirect") {
      return NextResponse.json({
        kind: "redirect",
        redirectUrl: result.redirectUrl,
      });
    }
    return NextResponse.json({ kind: "qr", reference, qr: result.qr });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout failed";
    const status =
      message.includes("is not set") || message.includes("not configured")
        ? 501
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
