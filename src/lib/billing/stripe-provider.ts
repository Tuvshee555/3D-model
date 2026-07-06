// Stripe billing provider (optional / future). This is the ONLY place the Stripe
// SDK is imported. It normalizes Stripe checkout + webhooks into the app's
// provider-agnostic BillingEvent vocabulary.

import Stripe from "stripe";
import type {
  BillingEvent,
  BillingProvider,
  CheckoutParams,
  CheckoutResult,
} from "./provider";

let stripe: Stripe | null = null;
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

export const stripeProvider: BillingProvider = {
  name: "stripe",

  isConfigured() {
    return Boolean(process.env.STRIPE_SECRET_KEY);
  },

  async createCheckout({
    store,
    plan,
    email,
    reference,
    successUrl,
    cancelUrl,
  }: CheckoutParams): Promise<CheckoutResult> {
    if (!plan.stripePriceEnv) {
      throw new Error(`Plan ${plan.id} has no Stripe price configured`);
    }
    const priceId = process.env[plan.stripePriceEnv];
    if (!priceId) throw new Error(`${plan.stripePriceEnv} is not set`);

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email,
      client_reference_id: store.id,
      // `reference` is our billing_invoices row id — echoed back on the webhook.
      metadata: { storeId: store.id, planId: plan.id, reference },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { kind: "redirect", providerRef: session.id, redirectUrl: session.url };
  },

  async parseWebhook(req: Request): Promise<BillingEvent> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("Missing stripe-signature header");

    const rawBody = await req.text();
    const event = getStripe().webhooks.constructEvent(rawBody, signature, secret);

    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const storeId = s.metadata?.storeId ?? s.client_reference_id ?? null;
        const planId = s.metadata?.planId ?? null;
        if (!storeId || !planId) return { type: "ignored" };
        return {
          type: "activated",
          provider: "stripe",
          storeId,
          planId,
          reference: s.metadata?.reference ?? null,
          customerId: typeof s.customer === "string" ? s.customer : null,
          subscriptionId:
            typeof s.subscription === "string" ? s.subscription : null,
        };
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId =
          typeof sub.customer === "string" ? sub.customer : null;
        return { type: "canceled", provider: "stripe", customerId };
      }
      default:
        return { type: "ignored" };
    }
  },
};
