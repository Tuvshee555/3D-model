# Outfit Copilot

AI virtual try-on. Shoppers upload a photo (or pick an avatar) and see a
photorealistic preview of themselves wearing catalog items. Stores add their own
catalog and embed a try-on widget on their product pages.

## Stack

- **Next.js 16** (App Router, Turbopack, React 19)
- **Neon** Postgres (`@neondatabase/serverless`)
- **OpenAI** `gpt-image-1` (try-on edits + avatar generation)
- **Cloudinary** image hosting
- Hand-rolled email/password auth (Node `scrypt`) + optional Google OAuth
- Tailwind v4

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the values (see .env.local comments)
npm run db:migrate           # idempotent: creates tables + seeds the demo catalog
npm run dev
```

Required env: `DATABASE_URL`, `OPENAI_API_KEY`, `CLOUDINARY_*`. Everything else is
optional — see `.env.local`, where every key has a comment explaining what it's
for and where to get it.

## Feature map

- **Onboarding**: email/password + Google login; guest use (anonymous cookie)
- **Photo capture**: upload a photo (camera capture on mobile) — try before signup
- **Catalog**: search + category filter; try on your own wardrobe item; per-store
  catalogs with CSV or Shopify import
- **Try-on**: identity-preserving VTON (fal.ai IDM-VTON) with a real garment photo,
  falling back to gpt-image-1; result cache + cost/latency telemetry per generation
- **Result actions**: favorite, share (Web Share API), "View details / Buy" link
- **Gallery**: saved try-ons per account/device, with delete-all
- **Widget**: `/widget/[slug]` embeddable per store (copy-paste snippet in dashboard)
- **Billing**: Stripe subscriptions with per-plan monthly try-on quota enforcement
- **Analytics**: GA4 + Mixpanel events (try_on_started/completed, share, buy_click)
- **Privacy**: consent copy, data deletion, `/privacy` + `/terms`, mobile tab bar

## Optional integrations (code built; add keys to enable)

Turn on when their env vars are set: **Stripe** (`STRIPE_*`), **Google login**
(`GOOGLE_CLIENT_*`), **Analytics** (`NEXT_PUBLIC_GA_ID` / `NEXT_PUBLIC_MIXPANEL_TOKEN`),
**Email** (`RESEND_API_KEY` / `EMAIL_FROM`). **Shopify import** needs no env key —
store owners paste their domain + Admin token in the dashboard.

## Data model (`src/lib/schema.sql`)

- `users`, `auth_sessions` — auth
- `stores` — multi-tenant; each user can own several (plan, Stripe ids)
- `garments` — catalog; `store_id NULL` = built-in demo catalog; has photo + product url
- `try_ons` — one row per generation (session/user/store, Cloudinary URLs, favorite,
  denormalized garment name/category so ad-hoc "wardrobe" try-ons still label)

Re-run `npm run db:migrate` anytime — it's idempotent.

## Not built (non-code)

The spec's business-plan sections — team hiring, GTM, competitor analysis, KPI
targets, cost tables — are strategy, not code.

## Known limitations

- No rate limiting on `/api/try-on` beyond the per-store monthly quota — each call
  costs OpenAI + Cloudinary usage.
- Try-on latency is model-bound (~10–30s), above the spec's <5s aspiration.
