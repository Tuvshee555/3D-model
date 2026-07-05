import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  getStoreById,
  getStoreByStripeCustomer,
  updateStorePlan,
} from "@/lib/db";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set" },
      { status: 501 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const storeId =
          session.metadata?.storeId ?? session.client_reference_id ?? null;
        const planId = session.metadata?.planId ?? null;
        if (storeId && planId && PLANS[planId]) {
          const store = await getStoreById(storeId);
          if (store) {
            await updateStorePlan(
              storeId,
              planId,
              typeof session.customer === "string" ? session.customer : null,
              typeof session.subscription === "string"
                ? session.subscription
                : null
            );
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : null;
        if (customerId) {
          const store = await getStoreByStripeCustomer(customerId);
          if (store) {
            await updateStorePlan(store.id, "free", customerId, null);
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
