import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { Garment, Store, TryOnRecord, User } from "./types";

let sql: NeonQueryFunction<false, false> | null = null;

function getSql(): NeonQueryFunction<false, false> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!sql) {
    sql = neon(url);
  }
  return sql;
}

/* ---------- Users & auth sessions ---------- */

export async function createUser(
  id: string,
  email: string,
  passwordHash: string
): Promise<void> {
  await getSql()`
    INSERT INTO users (id, email, password_hash)
    VALUES (${id}, ${email}, ${passwordHash})
  `;
}

export async function getUserByEmail(
  email: string
): Promise<{ id: string; email: string; passwordHash: string } | undefined> {
  const rows = await getSql()`
    SELECT id, email, password_hash AS "passwordHash"
    FROM users
    WHERE email = ${email}
  `;
  return rows[0] as
    | { id: string; email: string; passwordHash: string }
    | undefined;
}

export async function createAuthSession(
  token: string,
  userId: string,
  expiresAt: Date
): Promise<void> {
  await getSql()`
    INSERT INTO auth_sessions (token, user_id, expires_at)
    VALUES (${token}, ${userId}, ${expiresAt.toISOString()})
  `;
}

export async function getUserByToken(token: string): Promise<User | undefined> {
  const rows = await getSql()`
    SELECT u.id, u.email
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND s.expires_at > now()
  `;
  return rows[0] as User | undefined;
}

export async function deleteAuthSession(token: string): Promise<void> {
  await getSql()`DELETE FROM auth_sessions WHERE token = ${token}`;
}

/**
 * GDPR right-to-erasure: delete the account and everything it owns.
 * try_ons.user_id is ON DELETE SET NULL, so remove the owner's try-ons first;
 * the user's stores (and their garments/try-ons) plus auth sessions then
 * cascade away with the users row.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  await getSql()`DELETE FROM try_ons WHERE user_id = ${userId}`;
  await getSql()`DELETE FROM users WHERE id = ${userId}`;
}

/* ---------- Stores ---------- */

export async function createStore(store: {
  id: string;
  userId: string;
  name: string;
  slug: string;
}): Promise<void> {
  await getSql()`
    INSERT INTO stores (id, user_id, name, slug)
    VALUES (${store.id}, ${store.userId}, ${store.name}, ${store.slug})
  `;
}

export async function getStoresByUser(userId: string): Promise<Store[]> {
  const rows = await getSql()`
    SELECT id, user_id AS "userId", name, slug, plan, created_at AS "createdAt"
    FROM stores
    WHERE user_id = ${userId}
    ORDER BY created_at
  `;
  return rows as Store[];
}

export async function getStoreById(id: string): Promise<Store | undefined> {
  const rows = await getSql()`
    SELECT id, user_id AS "userId", name, slug, plan, created_at AS "createdAt"
    FROM stores
    WHERE id = ${id}
  `;
  return rows[0] as Store | undefined;
}

export async function getStoreBySlug(slug: string): Promise<Store | undefined> {
  const rows = await getSql()`
    SELECT id, user_id AS "userId", name, slug, plan, created_at AS "createdAt"
    FROM stores
    WHERE slug = ${slug}
  `;
  return rows[0] as Store | undefined;
}

export async function slugExists(slug: string): Promise<boolean> {
  const rows = await getSql()`SELECT 1 FROM stores WHERE slug = ${slug}`;
  return rows.length > 0;
}

/**
 * Provider-agnostic plan mutation. The billing_provider / customer / subscription
 * ids are whatever the active BillingProvider issued — no column is Stripe- or
 * QPay-specific. This is the only place a store's plan changes for billing.
 */
export async function updateStoreBilling(
  storeId: string,
  billing: {
    plan: string;
    provider: string | null;
    customerId: string | null;
    subscriptionId: string | null;
  }
): Promise<void> {
  await getSql()`
    UPDATE stores
    SET plan = ${billing.plan},
        billing_provider = ${billing.provider},
        billing_customer_id = ${billing.customerId},
        billing_subscription_id = ${billing.subscriptionId}
    WHERE id = ${storeId}
  `;
}

export async function getStoreByBillingCustomer(
  provider: string,
  customerId: string
): Promise<Store | undefined> {
  const rows = await getSql()`
    SELECT id, user_id AS "userId", name, slug, plan, created_at AS "createdAt"
    FROM stores
    WHERE billing_provider = ${provider} AND billing_customer_id = ${customerId}
  `;
  return rows[0] as Store | undefined;
}

/* ---------- Billing invoices (provider-agnostic ledger) ---------- */

export type BillingInvoice = {
  id: string;
  storeId: string;
  planId: string;
  provider: string;
  providerRef: string | null;
  amount: number | null;
  currency: string | null;
  status: string; // 'pending' | 'paid' | 'canceled'
};

export async function createBillingInvoice(inv: {
  id: string;
  storeId: string;
  planId: string;
  provider: string;
  amount: number | null;
  currency: string | null;
}): Promise<void> {
  await getSql()`
    INSERT INTO billing_invoices (id, store_id, plan_id, provider, amount, currency, status)
    VALUES (${inv.id}, ${inv.storeId}, ${inv.planId}, ${inv.provider}, ${inv.amount}, ${inv.currency}, 'pending')
  `;
}

export async function setBillingInvoiceRef(
  id: string,
  providerRef: string
): Promise<void> {
  await getSql()`UPDATE billing_invoices SET provider_ref = ${providerRef} WHERE id = ${id}`;
}

export async function setBillingInvoiceStatus(
  id: string,
  status: string
): Promise<void> {
  await getSql()`UPDATE billing_invoices SET status = ${status} WHERE id = ${id}`;
}

export async function getBillingInvoice(
  id: string
): Promise<BillingInvoice | undefined> {
  const rows = await getSql()`
    SELECT id, store_id AS "storeId", plan_id AS "planId", provider,
           provider_ref AS "providerRef", amount::float AS amount, currency, status
    FROM billing_invoices
    WHERE id = ${id}
  `;
  return rows[0] as BillingInvoice | undefined;
}

/* ---------- Garments ---------- */

/** The built-in sample catalog (store_id IS NULL). */
export async function getSampleCatalog(): Promise<Garment[]> {
  const rows = await getSql()`
    SELECT id, name, category, swatch, description,
           photo_url AS "photoUrl", product_url AS "productUrl", store_id AS "storeId",
           brand, price::float AS price, sizes
    FROM garments
    WHERE store_id IS NULL
    ORDER BY name
  `;
  return rows as Garment[];
}

export async function getGarmentsByStore(storeId: string): Promise<Garment[]> {
  const rows = await getSql()`
    SELECT id, name, category, swatch, description,
           photo_url AS "photoUrl", product_url AS "productUrl", store_id AS "storeId",
           brand, price::float AS price, sizes
    FROM garments
    WHERE store_id = ${storeId}
    ORDER BY created_at DESC
  `;
  return rows as Garment[];
}

export async function getGarmentById(id: string): Promise<Garment | undefined> {
  const rows = await getSql()`
    SELECT id, name, category, swatch, description,
           photo_url AS "photoUrl", product_url AS "productUrl", store_id AS "storeId",
           brand, price::float AS price, sizes
    FROM garments
    WHERE id = ${id}
  `;
  return rows[0] as Garment | undefined;
}

type GarmentInsert = {
  id: string;
  name: string;
  category: string;
  swatch: string;
  description: string;
  photoUrl: string | null;
  productUrl: string | null;
  storeId: string;
  brand?: string | null;
  price?: number | null;
  sizes?: string | null;
};

export async function createGarment(garment: GarmentInsert): Promise<void> {
  await getSql()`
    INSERT INTO garments (id, name, category, swatch, description, photo_url, product_url, store_id, brand, price, sizes)
    VALUES (${garment.id}, ${garment.name}, ${garment.category}, ${garment.swatch},
            ${garment.description}, ${garment.photoUrl}, ${garment.productUrl}, ${garment.storeId},
            ${garment.brand ?? null}, ${garment.price ?? null}, ${garment.sizes ?? null})
  `;
}

/** Bulk-insert garments for a store (CSV / Shopify import). Returns count inserted. */
export async function createGarments(
  garments: Array<GarmentInsert>
): Promise<number> {
  let inserted = 0;
  for (const g of garments) {
    await getSql()`
      INSERT INTO garments (id, name, category, swatch, description, photo_url, product_url, store_id, brand, price, sizes)
      VALUES (${g.id}, ${g.name}, ${g.category}, ${g.swatch}, ${g.description}, ${g.photoUrl}, ${g.productUrl}, ${g.storeId},
              ${g.brand ?? null}, ${g.price ?? null}, ${g.sizes ?? null})
    `;
    inserted += 1;
  }
  return inserted;
}

/**
 * Count a shopper's try-ons since a timestamp — the free-tier abuse guard for
 * generations that aren't billed to a store quota. Matched per browser session
 * and, if signed in, per user.
 */
export async function countRecentTryOns(
  scope: { sessionId: string; userId: string | null },
  sinceIso: string
): Promise<number> {
  const rows = scope.userId
    ? await getSql()`
        SELECT count(*)::int AS n FROM try_ons
        WHERE created_at >= ${sinceIso}
          AND (user_id = ${scope.userId} OR session_id = ${scope.sessionId})
      `
    : await getSql()`
        SELECT count(*)::int AS n FROM try_ons
        WHERE created_at >= ${sinceIso} AND session_id = ${scope.sessionId}
      `;
  return (rows[0] as { n: number }).n;
}

/** Count try-ons for a store in the current calendar month (for quota checks). */
export async function countStoreTryOnsThisMonth(
  storeId: string
): Promise<number> {
  const rows = await getSql()`
    SELECT count(*)::int AS n
    FROM try_ons
    WHERE store_id = ${storeId}
      AND created_at >= date_trunc('month', now())
  `;
  return (rows[0] as { n: number }).n;
}

export async function deleteGarment(
  id: string,
  storeId: string
): Promise<void> {
  await getSql()`
    DELETE FROM garments WHERE id = ${id} AND store_id = ${storeId}
  `;
}

/* ---------- Generation telemetry ---------- */

/** Record one AI generation (cost/latency/outcome). See schema `generations`. */
export async function insertGeneration(g: {
  id: string;
  kind: string;
  provider: string;
  model: string;
  sessionId: string | null;
  userId: string | null;
  storeId: string | null;
  garmentId: string | null;
  outcome: string;
  error: string | null;
  latencyMs: number;
  costUsd: number | null;
}): Promise<void> {
  await getSql()`
    INSERT INTO generations (id, kind, provider, model, session_id, user_id,
                             store_id, garment_id, outcome, error, latency_ms, cost_usd)
    VALUES (${g.id}, ${g.kind}, ${g.provider}, ${g.model}, ${g.sessionId},
            ${g.userId}, ${g.storeId}, ${g.garmentId}, ${g.outcome}, ${g.error},
            ${g.latencyMs}, ${g.costUsd})
  `;
}

/* ---------- Generation cache ---------- */

/** Look up a cached result by content-hash key. Provider is baked into the key. */
export async function getCachedGeneration(
  cacheKey: string
): Promise<{ resultUrl: string; provider: string; model: string } | undefined> {
  const rows = await getSql()`
    SELECT result_url AS "resultUrl", provider, model
    FROM generation_cache
    WHERE cache_key = ${cacheKey}
  `;
  return rows[0] as
    | { resultUrl: string; provider: string; model: string }
    | undefined;
}

/** Store a result under its content-hash key. No-op if another request won the race. */
export async function putCachedGeneration(row: {
  cacheKey: string;
  resultUrl: string;
  provider: string;
  model: string;
}): Promise<void> {
  await getSql()`
    INSERT INTO generation_cache (cache_key, result_url, provider, model)
    VALUES (${row.cacheKey}, ${row.resultUrl}, ${row.provider}, ${row.model})
    ON CONFLICT (cache_key) DO NOTHING
  `;
}

/* ---------- Try-ons ---------- */

export async function insertTryOn(entry: {
  id: string;
  sessionId: string;
  userId: string | null;
  storeId: string | null;
  garmentId: string | null;
  garmentName: string;
  garmentCategory: string;
  personImageUrl: string;
  personImagePublicId: string | null;
  resultImageUrl: string;
}): Promise<void> {
  await getSql()`
    INSERT INTO try_ons (id, session_id, user_id, store_id, garment_id,
                         garment_name, garment_category, person_image_url,
                         person_image_public_id, result_image_url)
    VALUES (${entry.id}, ${entry.sessionId}, ${entry.userId}, ${entry.storeId},
            ${entry.garmentId}, ${entry.garmentName}, ${entry.garmentCategory},
            ${entry.personImageUrl}, ${entry.personImagePublicId}, ${entry.resultImageUrl})
  `;
}

/**
 * Unsaved (non-favorite) selfies older than the cutoff that still have a stored
 * Cloudinary id — the 24h TTL job deletes these (Bible §1.1).
 */
export async function getExpiredUnsavedSelfies(
  beforeIso: string
): Promise<Array<{ id: string; publicId: string }>> {
  const rows = await getSql()`
    SELECT id, person_image_public_id AS "publicId"
    FROM try_ons
    WHERE is_favorite = false
      AND person_image_public_id IS NOT NULL
      AND created_at < ${beforeIso}
    LIMIT 500
  `;
  return rows as Array<{ id: string; publicId: string }>;
}

/** Blank a deleted selfie's URL + id after its Cloudinary asset is destroyed. */
export async function clearSelfie(id: string): Promise<void> {
  await getSql()`
    UPDATE try_ons
    SET person_image_url = '', person_image_public_id = NULL
    WHERE id = ${id}
  `;
}

export async function getTryOnsBySession(
  sessionId: string
): Promise<TryOnRecord[]> {
  const rows = await getSql()`
    SELECT
      t.id AS "id",
      t.person_image_url AS "personImageUrl",
      t.result_image_url AS "resultImageUrl",
      t.created_at AS "createdAt",
      t.is_favorite AS "isFavorite",
      COALESCE(g.name, t.garment_name, 'Custom item') AS "garmentName",
      COALESCE(g.category, t.garment_category, 'top') AS "garmentCategory"
    FROM try_ons t
    LEFT JOIN garments g ON g.id = t.garment_id
    WHERE t.session_id = ${sessionId}
    ORDER BY t.created_at DESC
  `;
  return rows as TryOnRecord[];
}

export async function getTryOnsByUser(userId: string): Promise<TryOnRecord[]> {
  const rows = await getSql()`
    SELECT
      t.id AS "id",
      t.person_image_url AS "personImageUrl",
      t.result_image_url AS "resultImageUrl",
      t.created_at AS "createdAt",
      t.is_favorite AS "isFavorite",
      COALESCE(g.name, t.garment_name, 'Custom item') AS "garmentName",
      COALESCE(g.category, t.garment_category, 'top') AS "garmentCategory"
    FROM try_ons t
    LEFT JOIN garments g ON g.id = t.garment_id
    WHERE t.user_id = ${userId}
    ORDER BY t.created_at DESC
  `;
  return rows as TryOnRecord[];
}

/** Toggle favorite; scoped to the owning session or user so nobody can flip others' rows. */
export async function setTryOnFavorite(
  tryOnId: string,
  isFavorite: boolean,
  scope: { sessionId: string; userId: string | null }
): Promise<boolean> {
  const rows = scope.userId
    ? await getSql()`
        UPDATE try_ons SET is_favorite = ${isFavorite}
        WHERE id = ${tryOnId} AND (user_id = ${scope.userId} OR session_id = ${scope.sessionId})
        RETURNING id
      `
    : await getSql()`
        UPDATE try_ons SET is_favorite = ${isFavorite}
        WHERE id = ${tryOnId} AND session_id = ${scope.sessionId}
        RETURNING id
      `;
  return rows.length > 0;
}

/** Delete all try-ons belonging to a shopper (their account and/or this browser). */
export async function deleteTryOnsForOwner(scope: {
  sessionId: string;
  userId: string | null;
}): Promise<number> {
  const rows = scope.userId
    ? await getSql()`
        DELETE FROM try_ons
        WHERE user_id = ${scope.userId} OR session_id = ${scope.sessionId}
        RETURNING id
      `
    : await getSql()`
        DELETE FROM try_ons WHERE session_id = ${scope.sessionId} RETURNING id
      `;
  return rows.length;
}
