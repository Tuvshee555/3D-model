// Billing seam entry point: provider registry, provider selection (config /
// country driven), and the ONE provider-agnostic function that mutates a store's
// plan. Nothing outside a provider file imports a payment SDK; subscription logic
// never changes when a provider is added.

import {
  getStoreByBillingCustomer,
  setBillingInvoiceStatus,
  updateStoreBilling,
} from "@/lib/db";
import { qpayProvider } from "./qpay-provider";
import { stripeProvider } from "./stripe-provider";
import type { BillingEvent, BillingProvider, BillingProviderName } from "./provider";

export type {
  BillingProvider,
  BillingProviderName,
  BillingEvent,
  CheckoutParams,
  CheckoutResult,
  QpayQr,
} from "./provider";

const REGISTRY: Record<BillingProviderName, BillingProvider> = {
  qpay: qpayProvider,
  stripe: stripeProvider,
};

export function getProviderByName(name: string): BillingProvider | undefined {
  return REGISTRY[name as BillingProviderName];
}

/**
 * Choose the billing provider. Precedence:
 *   1. explicit `opts.provider`
 *   2. BILLING_PROVIDER env (hard override)
 *   3. country → Stripe outside Mongolia when it's configured
 *   4. default → QPay (the Mongolian-market default, Bible §0)
 */
export function getBillingProvider(opts?: {
  provider?: string;
  country?: string;
}): BillingProvider {
  if (opts?.provider && REGISTRY[opts.provider as BillingProviderName]) {
    return REGISTRY[opts.provider as BillingProviderName];
  }
  const forced = process.env.BILLING_PROVIDER as BillingProviderName | undefined;
  if (forced && REGISTRY[forced]) return REGISTRY[forced];

  const country = (
    opts?.country ??
    process.env.BILLING_DEFAULT_COUNTRY ??
    "MN"
  ).toUpperCase();
  if (country !== "MN" && stripeProvider.isConfigured()) return stripeProvider;
  return qpayProvider;
}

/**
 * Apply a normalized provider event. The ONLY code that changes a store's plan
 * for billing — provider-agnostic by construction, so adding a provider never
 * touches this function. Swallows its own write errors so a webhook is never
 * failed by a downstream issue (providers retry).
 */
export async function applyBillingEvent(event: BillingEvent): Promise<void> {
  try {
    switch (event.type) {
      case "activated": {
        await updateStoreBilling(event.storeId, {
          plan: event.planId,
          provider: event.provider,
          customerId: event.customerId,
          subscriptionId: event.subscriptionId,
        });
        if (event.reference) {
          await setBillingInvoiceStatus(event.reference, "paid");
        }
        break;
      }
      case "canceled": {
        let storeId = event.storeId ?? null;
        if (!storeId && event.customerId) {
          const store = await getStoreByBillingCustomer(
            event.provider,
            event.customerId
          );
          storeId = store?.id ?? null;
        }
        if (storeId) {
          await updateStoreBilling(storeId, {
            plan: "free",
            provider: event.provider,
            customerId: event.customerId ?? null,
            subscriptionId: null,
          });
        }
        break;
      }
      case "ignored":
        break;
    }
  } catch {
    // A billing event must never crash the webhook route.
  }
}
