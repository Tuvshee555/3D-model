export type Plan = {
  id: string;
  name: string;
  priceUsd: number; // monthly, 0 = free
  tryOnsPerMonth: number;
  blurb: string;
  features: string[];
  // Stripe price id, read from env so it can differ per environment.
  stripePriceEnv?: string;
  // QPay charge amount in MNT (the default Mongolian rail), ~₮3,450/USD.
  priceMnt?: number;
};

// Pricing note (Bible §7): quotas are sized so no paid plan loses money at the
// generation cost — fal.ai VTON ≈ $0.05/gen (primary), gpt-image-1 ≈ $0.12/gen
// (fallback), reduced further by the result cache. These are COGS-safe interim
// numbers; the strategic up-market / ROI-anchored reprice is still a founder call.

export const PLANS: Record<string, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    tryOnsPerMonth: 25,
    blurb: "Kick the tires on your own store.",
    features: ["25 try-ons / month", "1 store", "Embeddable widget"],
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceUsd: 29,
    tryOnsPerMonth: 250,
    blurb: "For small shops going live.",
    features: [
      "250 try-ons / month",
      "Unlimited catalog items",
      "Embeddable widget",
      "Email support",
    ],
    stripePriceEnv: "STRIPE_PRICE_STARTER",
    priceMnt: 99000,
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceUsd: 99,
    tryOnsPerMonth: 1000,
    blurb: "For stores driving real volume.",
    features: [
      "1,000 try-ons / month",
      "Everything in Starter",
      "Priority support",
      "Analytics",
    ],
    stripePriceEnv: "STRIPE_PRICE_GROWTH",
    priceMnt: 349000,
  },
};

export const PLAN_ORDER = ["free", "starter", "growth"] as const;

// Abuse/cost guard for try-ons that aren't billed to a store's monthly quota —
// i.e. the public demo catalog and custom wardrobe uploads. Without this, the
// gpt-image-1 endpoint (real money per call) is uncapped for anonymous users.
// Rolling window, counted per browser session and/or logged-in user.
export const FREE_TRYON_WINDOW_HOURS = 24;
export const FREE_TRYON_LIMIT = 20;

// Reject oversized uploads before they ever reach the AI provider (decoded bytes).
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
