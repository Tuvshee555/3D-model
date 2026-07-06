// The billing provider seam. Every payment/subscription integration lives behind
// this interface so subscription logic never depends on a specific provider.
// QPay is the default (Mongolian market); Stripe is an optional future provider.
//
// Rules:
// - No business logic outside a provider file may import a provider SDK.
// - The ONLY code that mutates a store's plan is `applyBillingEvent` (index.ts).
// - Adding a provider = one new file implementing BillingProvider + a registry
//   entry. Nothing in the checkout/subscription flow changes.

import type { Plan } from "@/lib/plans";
import type { Store } from "@/lib/types";

export type BillingProviderName = "qpay" | "stripe";

/** What the app hands a provider to start a paid subscription. */
export type CheckoutParams = {
  store: Store;
  plan: Plan;
  email: string;
  /** Our internal billing-invoice row id — the unified ledger key both
   *  providers echo back so we can reconcile a payment to a store + plan. */
  reference: string;
  successUrl: string;
  cancelUrl: string;
};

/** QPay hands back a QR/deeplink set the shopper pays with (no hosted page). */
export type QpayQr = {
  invoiceId: string;
  qrText: string;
  qrImage: string | null;
  deeplinks: { name: string; description: string; link: string }[];
};

/**
 * A normalized checkout handoff. A hosted-page provider (Stripe) returns a
 * redirect; a QR provider (QPay) returns a QR the client renders and polls.
 * `providerRef` is the provider-side id we persist for later reconciliation.
 */
export type CheckoutResult =
  | { kind: "redirect"; providerRef: string; redirectUrl: string }
  | { kind: "qr"; providerRef: string; qr: QpayQr };

/**
 * A provider event normalized to the app's subscription vocabulary. Providers
 * verify authenticity (Stripe signature / QPay payment-check) BEFORE emitting
 * an "activated"; the app trusts these events and mutates the plan.
 */
export type BillingEvent =
  | {
      type: "activated";
      provider: BillingProviderName;
      storeId: string;
      planId: string;
      reference: string | null;
      customerId: string | null;
      subscriptionId: string | null;
    }
  | {
      type: "canceled";
      provider: BillingProviderName;
      storeId?: string | null;
      customerId?: string | null;
    }
  | { type: "ignored" };

export interface BillingProvider {
  readonly name: BillingProviderName;
  /** True when the provider's credentials are present in the environment. */
  isConfigured(): boolean;
  /** Start a paid subscription/checkout for a plan. */
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>;
  /** Parse + verify an incoming provider webhook/callback into a BillingEvent. */
  parseWebhook(req: Request): Promise<BillingEvent>;
}
