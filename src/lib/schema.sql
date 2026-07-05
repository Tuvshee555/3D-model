-- Users (email + password auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auth sessions (login tokens) — distinct from the anonymous try-on session cookie
CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);

-- Stores (each user can own several; multi-tenant)
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stores_user_id_idx ON stores (user_id);

-- Garments (catalog). store_id NULL = the built-in sample/demo catalog.
CREATE TABLE IF NOT EXISTS garments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  swatch TEXT NOT NULL,
  description TEXT NOT NULL
);

ALTER TABLE garments ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;
ALTER TABLE garments ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE garments ADD COLUMN IF NOT EXISTS product_url TEXT;
ALTER TABLE garments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS garments_store_id_idx ON garments (store_id);

-- Try-ons (one row per generation)
CREATE TABLE IF NOT EXISTS try_ons (
  id UUID PRIMARY KEY,
  session_id TEXT NOT NULL,
  garment_id TEXT NOT NULL REFERENCES garments(id),
  person_image_url TEXT NOT NULL,
  result_image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE try_ons ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE try_ons ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;
ALTER TABLE try_ons ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
-- Ad-hoc (wardrobe-import) try-ons have no catalog garment: allow NULL garment_id
-- and keep a denormalized name/category so the gallery still labels them.
ALTER TABLE try_ons ALTER COLUMN garment_id DROP NOT NULL;
ALTER TABLE try_ons ADD COLUMN IF NOT EXISTS garment_name TEXT;
ALTER TABLE try_ons ADD COLUMN IF NOT EXISTS garment_category TEXT;

CREATE INDEX IF NOT EXISTS try_ons_session_id_idx ON try_ons (session_id);
CREATE INDEX IF NOT EXISTS try_ons_user_id_idx ON try_ons (user_id);
CREATE INDEX IF NOT EXISTS try_ons_store_id_idx ON try_ons (store_id);

-- Seed the built-in sample catalog (store_id stays NULL)
INSERT INTO garments (id, name, category, swatch, description) VALUES
  ('crew-tee-red', 'Classic Crew Tee', 'top', '#c0392b', 'a fitted red crew-neck cotton t-shirt with short sleeves'),
  ('linen-shirt-white', 'Linen Button-Up', 'top', '#ecf0f1', 'a relaxed-fit white linen button-up shirt with long sleeves, top button undone'),
  ('wrap-dress-navy', 'Wrap Midi Dress', 'dress', '#2c3e50', 'a navy blue wrap-style midi dress with a fitted waist and short sleeves'),
  ('sundress-yellow', 'Summer Sundress', 'dress', '#f1c40f', 'a light yellow floral sundress with thin straps and a flowing skirt'),
  ('denim-jacket', 'Classic Denim Jacket', 'outerwear', '#5d7a99', 'a classic blue denim jacket, worn open over whatever they already have on'),
  ('wool-coat-camel', 'Wool Overcoat', 'outerwear', '#c9a876', 'a camel-colored wool overcoat, knee length, worn open')
ON CONFLICT (id) DO NOTHING;
