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

export async function updateStorePlan(
  storeId: string,
  plan: string,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null
): Promise<void> {
  await getSql()`
    UPDATE stores
    SET plan = ${plan},
        stripe_customer_id = ${stripeCustomerId},
        stripe_subscription_id = ${stripeSubscriptionId}
    WHERE id = ${storeId}
  `;
}

export async function getStoreByStripeCustomer(
  customerId: string
): Promise<Store | undefined> {
  const rows = await getSql()`
    SELECT id, user_id AS "userId", name, slug, plan, created_at AS "createdAt"
    FROM stores
    WHERE stripe_customer_id = ${customerId}
  `;
  return rows[0] as Store | undefined;
}

/* ---------- Garments ---------- */

/** The built-in sample catalog (store_id IS NULL). */
export async function getSampleCatalog(): Promise<Garment[]> {
  const rows = await getSql()`
    SELECT id, name, category, swatch, description,
           photo_url AS "photoUrl", product_url AS "productUrl", store_id AS "storeId"
    FROM garments
    WHERE store_id IS NULL
    ORDER BY name
  `;
  return rows as Garment[];
}

export async function getGarmentsByStore(storeId: string): Promise<Garment[]> {
  const rows = await getSql()`
    SELECT id, name, category, swatch, description,
           photo_url AS "photoUrl", product_url AS "productUrl", store_id AS "storeId"
    FROM garments
    WHERE store_id = ${storeId}
    ORDER BY created_at DESC
  `;
  return rows as Garment[];
}

export async function getGarmentById(id: string): Promise<Garment | undefined> {
  const rows = await getSql()`
    SELECT id, name, category, swatch, description,
           photo_url AS "photoUrl", product_url AS "productUrl", store_id AS "storeId"
    FROM garments
    WHERE id = ${id}
  `;
  return rows[0] as Garment | undefined;
}

export async function createGarment(garment: {
  id: string;
  name: string;
  category: string;
  swatch: string;
  description: string;
  photoUrl: string | null;
  productUrl: string | null;
  storeId: string;
}): Promise<void> {
  await getSql()`
    INSERT INTO garments (id, name, category, swatch, description, photo_url, product_url, store_id)
    VALUES (${garment.id}, ${garment.name}, ${garment.category}, ${garment.swatch},
            ${garment.description}, ${garment.photoUrl}, ${garment.productUrl}, ${garment.storeId})
  `;
}

/** Bulk-insert garments for a store (CSV / Shopify import). Returns count inserted. */
export async function createGarments(
  garments: Array<{
    id: string;
    name: string;
    category: string;
    swatch: string;
    description: string;
    photoUrl: string | null;
    productUrl: string | null;
    storeId: string;
  }>
): Promise<number> {
  let inserted = 0;
  for (const g of garments) {
    await getSql()`
      INSERT INTO garments (id, name, category, swatch, description, photo_url, product_url, store_id)
      VALUES (${g.id}, ${g.name}, ${g.category}, ${g.swatch}, ${g.description}, ${g.photoUrl}, ${g.productUrl}, ${g.storeId})
    `;
    inserted += 1;
  }
  return inserted;
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
  resultImageUrl: string;
}): Promise<void> {
  await getSql()`
    INSERT INTO try_ons (id, session_id, user_id, store_id, garment_id,
                         garment_name, garment_category, person_image_url, result_image_url)
    VALUES (${entry.id}, ${entry.sessionId}, ${entry.userId}, ${entry.storeId},
            ${entry.garmentId}, ${entry.garmentName}, ${entry.garmentCategory},
            ${entry.personImageUrl}, ${entry.resultImageUrl})
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
