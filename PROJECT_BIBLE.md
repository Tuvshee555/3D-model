# PROJECT BIBLE — the single source of truth

> Every Claude Code session and every founder decision follows THIS file.
> If a request contradicts this Bible, stop and reconcile before building.
> Last set by the CTO pass on 2026-07-06. Update deliberately, never casually.

---

## 0. THE THESIS (Decision 0 — everything depends on this)

**We build B2B-distributed, consumer-experienced virtual try-on for small Shopify
apparel merchants.**

- **Who pays:** the merchant (subscription, metered by try-ons).
- **Who uses it:** the merchant's shopper, on the merchant's storefront (widget) or
  a hosted store page.
- **The wow:** the shopper sees the merchant's **real product** on their **own body**,
  in seconds, and buys with confidence.
- **The wedge (ICP):** down-market Shopify apparel shops (roughly $10k–$200k/mo GMV)
  with **high return rates and no in-house photography budget.** Too small for
  enterprise vendors (Veesual/DressX), underserved by everyone else.
- **The job-to-be-done we sell:** *"cut returns and lift conversion without a photo
  shoot."* We do NOT sell "a fun AI toy."
- **The moat we are building (none of these is the model itself):**
  1. Merchant integration depth + the merchant relationship (switching cost).
  2. A proprietary, human-rated dataset of (photo → good try-on) pairs that lets us
     fine-tune a *better-than-generic-API* model over time.
  3. Distribution: every try-on is a branded, shareable growth surface.

**One-line pitch:** *"Let your shoppers see your clothes on themselves — fewer
returns, more sales, no photo shoot."*

**The North-Star metric:** paid **merchant retention** (merchants still paying at
month 3), driven by the leading metric **shopper try-on → add-to-cart rate.**

---

## 1. NON-NEGOTIABLES (violate these and the company dies)

1. **No face/biometric data kept longer than needed.** Unsaved selfies auto-delete
   within 24h. Explicit consent before any upload. This is BIPA/GDPR/COPPA survival,
   not a nicety. (BIPA = statutory damages per person, class-action, no harm needed.)
2. **The output must be flattering AND look like the actual person.** If it's uncanny
   or unflattering, we have no product. Identity preservation is the quality bar.
3. **Every generation's cost and latency is logged.** We never fly blind on COGS.
4. **Pricing is always above COGS.** No plan may lose money at max usage.
5. **A shopper can experience the wow with zero signup.** Signup is only to save/share.
6. **We ship the smallest premium thing.** New features must serve merchant retention
   or the shopper wow. Everything else is deleted, not parked.

---

## 2. WHAT WE ARE / ARE NOT BUILDING (the 20% that is 80%)

**The core product is FOUR things. Nothing else exists until these are world-class:**

1. **Try-on that preserves identity** (shopper photo + merchant product → believable,
   flattering image), fast and cheap.
2. **A shopper flow with zero friction** (try before signup, guided capture, instant
   reveal, 2–3 variants).
3. **A merchant install + catalog** (Shopify import / manual, one-line embed widget,
   usage + billing).
4. **A branded share surface** (every result is a public, shareable, "try it yourself"
   growth asset).

**Deleted from the product (Category E — do not resurrect, see §12):** avatars-as-you,
one-click color recolor, weather/calendar/birthday/wedding planning, fashion-evolution
timeline, confidence-score gamification, achievements/streaks/collections, social feed,
3D/body scans, offline support, public SDK, "AI explains its outfit choice," multi-store
agency workspaces (pre-PMF), lifecycle email drips (pre-PMF).

---

## 3. FEATURE CLASSIFICATION (A–E)

### Category A — BEFORE writing any more code (decisions, not builds)
- Ratify Decision 0 (customer = merchant, user = shopper).
- Lock pricing model: **credit-metered subscriptions, priced above COGS** (see §7).
- Lock the privacy/legal stance: 24h selfie deletion + consent + moderation.
- Define the ICP precisely and write down the one wow metric (try-on → add-to-cart).
- Put it in front of **one real shopper and one real merchant** and watch them.

### Category B — BEFORE private alpha
- **Identity-preserving generation** (dedicated VTON model; §9) + **2–3 variants**.
- **Real merchant product imagery** in the try-on (kill the demo swatches for the sell).
- **Try-before-signup** shopper flow.
- **Loading reveal** (staged status + blur-up) and **human-friendly errors**.
- **Face TTL deletion + consent + basic moderation** (nudity/minor guard).
- **Generation cache** (personHash × garmentId) + **cost/latency telemetry**.
- **Atomic rate limiting** (no read-then-write race on an expensive endpoint).

### Category C — BEFORE public launch
- **Branded public share page** (`/o/[id]`, OG image, before/after, "try it yourself").
- **Merchant loop:** "powered by", one-line embed, <10-min self-serve onboarding.
- **Async generation queue** (job row + poll/webhook; NOT Redis/RabbitMQ).
- **Stripe credit metering live** + exposed usage meter + overage handling.
- **Brand + design system** (name, logo, tokens, art-directed result, motion, a11y).
- **Wardrobe/closet** (the one durable retention primitive) — minimal version.
- **Monitoring** (Sentry errors + cost/latency dashboard).

### Category D — AFTER product-market fit
- Refinement loop ("longer sleeves / less baggy / different lighting").
- Outfit building (top + bottom + accessory, consistent body).
- Size/fit recommendation ("true to size on your frame").
- Commerce-triggered notifications (price drop / back-in-stock on saved items).
- Pinterest/SEO programmatic engine; creator program; point-of-purchase extension.
- Multi-store agency workspaces; lifecycle email; affiliate/marketplace.
- Proprietary fine-tuned model on the rated dataset (the real moat).

### Category E — NEVER (unnecessary complexity)
Weather/calendar/birthday/wedding planning, fashion-evolution timeline, confidence-score
gamification, achievements/streaks, social feed/community, 3D/body scans, offline mode,
public SDK, avatars-as-you, one-click recolor, Redis/RabbitMQ, custom-auth rewrite
(current auth works — do not rebuild it), "explain the outfit" as a core feature.

---

## 4. DEPENDENCY MAP (critical path)

| Feature | Depends on | Unlocks | If delayed | Tech-debt risk |
|---|---|---|---|---|
| Identity-preserving gen | model choice (§9), cache | the entire wow, variants, share | product has no reason to exist | LOW (isolated in `lib/tryon`) |
| Generation cache | gen pipeline | cost control, speed, variants | COGS + latency blow up | LOW |
| Async queue | gen pipeline | scale, reliability | 502s under load, sync 60s limit | MED if retrofitted late |
| Cost/latency telemetry | gen pipeline | pricing sanity, monitoring | you can't price or debug | LOW |
| Try-before-signup | flow refactor | top-of-funnel, share | funnel bleeds at the gate | LOW |
| Real merchant imagery | Shopify/manual import | B2B sell, quality | demo looks like a toy | LOW |
| Face TTL deletion | storage lifecycle | legal survival, trust | company-ending liability | LOW now / HIGH later |
| Share page | gen result URL, brand | all free growth | no viral loop | LOW |
| Merchant loop | share page, widget | distribution, network effect | no cheap acquisition | MED |
| Stripe credit metering | telemetry, quota | revenue that covers COGS | you lose money per user | MED |
| Brand/design system | nothing (parallel) | premium feel, trust | looks generic (fatal in fashion) | LOW |
| Wardrobe/closet | accounts | retention | churn after first use | LOW |

**Rule:** the generation pipeline (identity + cache + telemetry + async) is the trunk.
Everything else is a branch. Build the trunk first.

---

## 5. TARGET ARCHITECTURE (rewrite / keep / remove verdicts)

**Stack stays lean and serverless (correct for a solo founder):**
Next.js 16 (App Router) · Neon Postgres · Cloudinary (images) · Stripe · a VTON model
provider (fal.ai or Replicate) with `gpt-image-1` as fallback/refine.

| Component | Verdict | Reason |
|---|---|---|
| Image generation (`lib/openai.ts`) | **REWRITE NOW** | Move to dedicated VTON model (garment-mask, identity-safe). Wrap behind `lib/tryon/` provider interface so we can swap/finetune later. Single biggest value lever. |
| Sync 60s API route | **REWRITE → async job** | Provider async + job row + poll/webhook. Removes the 60s cliff and holds-open functions. |
| Caching | **ADD (underengineered → build)** | Content-hash cache in Postgres/Cloudinary. Instant + free repeats. |
| Rate limiting | **IMPROVE** | Make atomic (single conditional statement / transaction). |
| Storage lifecycle | **ADD** | TTL delete unsaved selfies (24h). Keep results/garments. |
| Telemetry | **ADD** | Log cost, latency, model, outcome per generation. |
| Auth (scrypt, sessions) | **KEEP — do NOT rewrite** | It works and is out of the value path. Rewriting = churn, zero user value. Revisit only if it breaks. |
| Stripe billing | **KEEP + extend to credit metering** | Plumbing is fine; change the unit to credits. |
| Multi-store (user→many stores) | **KEEP schema, DE-EMPHASIZE** | One merchant = one store for now. Don't build agency workspace features. |
| CSV / Shopify import | **KEEP** | Cheap, core to B2B onboarding. |
| Avatars, color recolor | **REMOVE** | Gimmicks that dilute the wow and burn API. |
| Google OAuth, Resend email | **KEEP but defer polish** | Low cost, gated; not on the critical path. |
| Queue infra (Redis/RabbitMQ) | **DO NOT ADD** | Overengineering for this scale. Postgres job rows suffice. |

**Folder shape (target):**
```
src/lib/tryon/        # provider interface, prompt builder, cache, identity/mask logic
src/lib/billing/      # stripe + credit metering
src/lib/storage/      # cloudinary + TTL lifecycle
src/lib/telemetry/    # cost/latency/outcome logging
src/lib/db.ts         # queries (keep flat until it's >~600 lines, then split)
src/app/(shop)/       # shopper flow (try, result, share, gallery)
src/app/(merchant)/   # merchant dashboard (catalog, usage, billing, embed)
src/app/(site)/       # marketing + legal
src/app/widget/       # embeddable shopper try-on
src/app/api/          # thin routes → call lib/*
```
Refactor toward this **as you touch files**, not in a big-bang rewrite.

---

## 6. REDESIGNED USER FLOWS (fewer clicks, fewer decisions)

**Shopper try-on (target: wow in ≤ 3 taps, no signup):**
1. Land on widget/store → tap a product's **"See it on me."**
2. **Guided capture** (camera with silhouette overlay) or upload → auto-frame (crop is
   optional/advanced, not mandatory).
3. **Reveal** with staged status → 2–3 variants → pick one.
4. Inline: **Buy** (merchant link) · **Save/Share** (this is where we ask for an
   account, *after* the wow).
*Deleted from the old flow:* the mode toggle (photo/avatar), mandatory crop, color
swatches, and the pre-wow signup+consent wall (consent becomes a one-line checkbox at
capture, not a signup gate).

**Merchant onboarding (target: live in <10 min):**
1. Sign up → 2. Connect Shopify (or paste a product) → 3. Copy one embed line →
4. See usage + upgrade. No multi-step wizard, no agency concepts.

**Principle:** every screen removed is a conversion point saved. Count clicks on every
change; if a change adds a tap before the wow, it must remove two elsewhere.

---

## 7. BUSINESS MODEL & PRICING (must beat COGS)

- **Unit is a credit = one generation.** Meter hard, expose the meter.
- **COGS reality:** a VTON generation costs roughly a few cents; `gpt-image-1` more.
  **No plan may lose money at full usage** — this killed the old pricing (Growth
  $99/3,000 could cost more than $99 in API).
- **Merchant tiers (illustrative, re-derive from real COGS before launch):**
  Free trial (small credit grant) → Starter → Growth → Pay-as-you-go overage.
  Price on *value* (returns saved / conversion lift), not on cost — but never below cost.
- **First customer = the merchant**, not the consumer. Highest LTV, highest margin,
  lowest CAC (they bring their own shopper traffic).
- **Consumer stays free** (growth-funded, viral), never a subscription — you cannot
  out-subscribe a free Google product.

---

## 8. BACKEND SYSTEMS SPEC

- **Auth:** keep current scrypt + session cookies. Add password reset only when a real
  user needs it.
- **Database (Neon):** add `generations` telemetry table (cost, ms, model, outcome),
  `jobs` table (async status), `sizes/brand/price` already added. Migrations stay in
  `schema.sql`; **prod migrate is a release step, not an afterthought.**
- **Caching:** `cache_key = hash(personImage) + garmentId + variantParams` → stored
  result URL. Serve cache-hits instantly, bill zero.
- **Queue/Workers:** async provider call → `jobs` row → client polls (or provider
  webhook flips the row). No external queue infra.
- **Storage:** Cloudinary; **unsaved selfies get a 24h TTL**; results/garments persist.
  Consider R2 later for cost — not now.
- **Analytics:** funnel events (view → capture → generate → variant-pick → buy/save →
  share). Keep GA/Mixpanel gating.
- **Monitoring:** Sentry for errors; a lightweight cost/latency dashboard from the
  `generations` table.
- **Rate limiting:** atomic (single SQL conditional insert or a transaction) so parallel
  requests can't all pass the check. Unify shopper + merchant metering into one path.
- **Payments/Subscriptions:** Stripe; credit metering; reconcile webhook → plan/credits;
  test the money path.
- **Security:** no raw error strings to users; validate config at boot; per-tenant
  scoping on every query; signed URLs where possible.

---

## 9. AI PIPELINE SPEC (the heart)

**Move off "full-image edit" to garment-region try-on:**
- **Primary model:** a dedicated VTON model (e.g. IDM-VTON / CatVTON / Kolors-class via
  fal.ai or Replicate) that repaints **only the garment region** and leaves the face/
  body untouched → identity is preserved *by construction*, not by prompt-praying.
- **`gpt-image-1`:** demote to fallback / optional refine pass, not the base.
- **Provider abstraction:** `lib/tryon/provider.ts` so we can swap or add a fine-tuned
  model later without touching callers.
- **Realism:** feed real garment photo (not text), condition on pose; light negative
  prompts; auto re-blend face/hands if drift is detected.
- **Reduce hallucination:** constrain to the garment mask; cheap acceptance classifier
  before showing the result; regenerate on failure.
- **Variants:** generate 2–3 cheaply, show the best set, let the user pick (masks
  variance, feels generous).
- **Latency:** target p50 < ~10s *perceived* via progressive/low-res preview + staged
  status; async for slow paths.
- **Cost:** cache aggressively; downscale for preview, upscale only on save; choose the
  cheapest size/quality that holds quality; batch merchant catalog pre-generation.
- **Consistency:** garment-mask approach keeps body/lighting stable across items → makes
  future outfit-building coherent.
- **Data flywheel:** log which variant users pick + which convert → the rated dataset
  that trains the eventual proprietary model (the moat).

---

## 10. FRONTEND SYSTEMS SPEC

- **Component architecture:** small, dumb presentational components; logic in
  `lib/*` and server actions; the try-on wizard is a state machine, not prop-drilling.
- **State:** local component state + server actions; **no global state library** until
  proven necessary (it won't be soon).
- **Design system:** define tokens (color, type scale, radius, spacing, motion) ONCE;
  editorial serif headings + clean sans; one confident accent; art-directed dark mode.
  Fashion is judged on taste — this is not optional.
- **Motion:** the **reveal** is the signature moment — blur-up + fade + a beat of
  anticipation. Micro-interactions elsewhere stay subtle.
- **Result screen:** full-bleed, image-dominant, everything else subordinate.
- **Accessibility:** WCAG AA — labels, focus states, contrast, tap targets ≥ 44px, alt
  text, no color-only affordances.
- **Performance/images:** responsive, lazy, upscale-on-save; never block the reveal on
  non-critical assets.
- **Errors/empty states:** human copy, seeded delight (sample results in empty gallery).

---

## 11. ROADMAP TO v1.0 (solo founder, ~8 weeks)

> Difficulty S/M/L. Risk = chance it slips or breaks something.

**Week 0 — Decisions (NO code).** Goals: ratify Decision 0, pricing model, legal
stance; recruit 1 merchant + 3 shoppers to test. Deliverable: this Bible ratified.
Acceptance: a real person completes the *current* try-on while you watch and you write
down where they hesitate. Difficulty S. Risk LOW.

**Week 1 — AI trunk.** Goals: identity-preserving VTON via provider, async job + poll,
cache, cost/latency telemetry. Deliverable: `lib/tryon/*`, `jobs` + `generations`
tables. Acceptance: identity preserved on ≥8/10 test photos; p50 perceived < 12s; every
gen logs cost. Difficulty L. Risk HIGH (core bet).

**Week 2 — Shopper flow.** Goals: try-before-signup, real merchant imagery in try-on,
2–3 variants + pick, staged reveal, friendly errors, guided capture. Acceptance: a
stranger completes a try-on with no login in <60s and says "that looks like me."
Difficulty M. Risk MED.

**Week 3 — Trust + money.** Goals: 24h selfie TTL, consent, moderation guard, Stripe
credit metering + usage meter, atomic rate limit. Acceptance: unsaved selfie is gone in
24h (verified in storage); overage blocked; webhook reconciles credits. Difficulty M.
Risk MED (legal + billing).

**Week 4 — Growth surface.** Goals: branded `/o/[id]` share page (OG + before/after +
"try it yourself"), merchant "powered by" + one-line embed + <10-min onboarding.
Acceptance: a shared link produces a new try-on; a test merchant installs in <10 min.
Difficulty M. Risk MED.

**Week 5 — Brand + design.** Goals: name, logo, tokens, art-directed result + reveal
motion, a11y pass. Acceptance: passes "would a shopper screenshot this?"; Lighthouse
a11y > 90. Difficulty M. Risk LOW.

**Week 6 — Retention + hardening.** Goals: minimal wardrobe/closet, Sentry + cost
dashboard, tenant-isolation + billing tests, load test. Acceptance: closet persists;
error rate < 1%; no cross-tenant leak in tests. Difficulty M. Risk MED.

**Week 7 — Private alpha.** Goals: 3–5 real merchants live; instrument funnel; fix top
drop-offs. Acceptance: ≥1 merchant says they'd pay; try-on→add-to-cart measured.
Difficulty M. Risk HIGH (truth arrives here).

**Week 8 — Public launch (v1.0).** Goals: turn on the share loop, seed Pinterest, ship
pricing. Acceptance: first paying merchant; a share link brings organic try-ons.
Difficulty M. Risk MED.

---

## 12. GLOSSARY OF DELETED IDEAS (do not resurrect without overturning §0)

avatars-as-you · one-click color recolor · weather / calendar / birthday / wedding
planning · fashion-evolution timeline · confidence-score gamification · achievements /
streaks / collections · social feed / community · 3D / body scans · offline support ·
public SDK · "AI explains its outfit choice" as core · multi-store agency workspaces
(pre-PMF) · lifecycle email drips (pre-PMF) · Redis/RabbitMQ · rewriting working auth.

If a future session proposes one of these, the answer is **no** unless the thesis in §0
has formally changed and this file was updated first.

---

## 13. HOW TO USE THIS FILE (for future Claude Code sessions)

- Read this before proposing or building anything.
- Every new feature must map to §2 (core four) or a Category (§3). If it's Category D/E,
  do not build it; say so.
- Respect the §1 non-negotiables absolutely.
- Prefer editing toward the §5 target architecture over big rewrites.
- If the user asks for something that contradicts §0, surface the contradiction first.
