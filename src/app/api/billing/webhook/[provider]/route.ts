import { NextRequest, NextResponse } from "next/server";
import { getProviderByName, applyBillingEvent } from "@/lib/billing";

export const runtime = "nodejs";

// One webhook endpoint for every provider. The provider (from the path) parses +
// verifies its own payload into a normalized BillingEvent; applyBillingEvent
// does the (provider-agnostic) subscription mutation. Adding a provider requires
// no change here. Accepts POST (Stripe) and GET (QPay callback).
async function handle(request: NextRequest, providerName: string) {
  const provider = getProviderByName(providerName);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  try {
    // applyBillingEvent swallows its own write errors, so only a parse/verify
    // failure reaches the catch below (→ 400 for the provider to retry).
    const event = await provider.parseWebhook(request);
    await applyBillingEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const { provider } = await ctx.params;
  return handle(request, provider);
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ provider: string }> }
) {
  const { provider } = await ctx.params;
  return handle(request, provider);
}
