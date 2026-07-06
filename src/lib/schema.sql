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
ALTER TABLE garments ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE garments ADD COLUMN IF NOT EXISTS price NUMERIC;
-- Comma-separated size options, e.g. 'S,M,L,XL' (kept as text for simple mapping).
ALTER TABLE garments ADD COLUMN IF NOT EXISTS sizes TEXT;

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
-- Cloudinary public_id of the person selfie, so the 24h TTL job can delete it
-- (Bible §1.1: unsaved selfies auto-delete within 24h). NULL once deleted/absent.
ALTER TABLE try_ons ADD COLUMN IF NOT EXISTS person_image_public_id TEXT;

CREATE INDEX IF NOT EXISTS try_ons_session_id_idx ON try_ons (session_id);
CREATE INDEX IF NOT EXISTS try_ons_user_id_idx ON try_ons (user_id);
CREATE INDEX IF NOT EXISTS try_ons_store_id_idx ON try_ons (store_id);

-- Generation telemetry — one row per AI generation (Bible §1.3 / §8): never fly
-- blind on COGS. Records model, latency, outcome, and estimated cost so we can
-- price above cost and debug the pipeline. garment_id stays FK-free (custom
-- wardrobe items have no catalog garment).
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  session_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  garment_id TEXT,
  outcome TEXT NOT NULL,
  error TEXT,
  latency_ms INTEGER NOT NULL,
  cost_usd NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generations_created_at_idx ON generations (created_at);
CREATE INDEX IF NOT EXISTS generations_store_id_idx ON generations (store_id);
CREATE INDEX IF NOT EXISTS generations_outcome_idx ON generations (outcome);

-- Generation result cache (Bible §5/§8): a content-hash key → stored result URL,
-- so identical (provider × person photo × garment) try-ons are served instantly
-- and bill zero. Provider is part of the key upstream, so cache entries never
-- collide across providers/models — this table is provider-agnostic.
CREATE TABLE IF NOT EXISTS generation_cache (
  cache_key TEXT PRIMARY KEY,
  result_url TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generation_cache_created_at_idx ON generation_cache (created_at);

-- Seed the built-in sample catalog (store_id stays NULL). ~50 items across all
-- five categories so the demo is searchable/filterable out of the box.
INSERT INTO garments (id, name, category, swatch, description) VALUES
  -- Tops
  ('crew-tee-red', 'Classic Crew Tee', 'top', '#c0392b', 'a fitted red crew-neck cotton t-shirt with short sleeves'),
  ('linen-shirt-white', 'Linen Button-Up', 'top', '#ecf0f1', 'a relaxed-fit white linen button-up shirt with long sleeves, top button undone'),
  ('polo-navy', 'Pique Polo', 'top', '#34495e', 'a navy pique cotton polo shirt with a two-button placket and short sleeves'),
  ('oxford-blue', 'Oxford Shirt', 'top', '#aac4dd', 'a light blue oxford cotton button-down shirt with long sleeves'),
  ('graphic-tee-black', 'Graphic Tee', 'top', '#1c1c1c', 'a black cotton crew-neck t-shirt with a small chest graphic'),
  ('henley-grey', 'Waffle Henley', 'top', '#7f8c8d', 'a heather-grey waffle-knit henley with a three-button placket and long sleeves'),
  ('knit-sweater-cream', 'Cable Knit Sweater', 'top', '#efe6d5', 'a cream cable-knit wool crew-neck sweater'),
  ('turtleneck-black', 'Ribbed Turtleneck', 'top', '#2c2c2c', 'a fitted black ribbed turtleneck top with long sleeves'),
  ('flannel-red', 'Flannel Shirt', 'top', '#a83232', 'a red and black buffalo-check flannel shirt worn buttoned'),
  ('blouse-blush', 'Silk Blouse', 'top', '#e8b4b8', 'a blush-pink silk blouse with a relaxed drape and long sleeves'),
  ('tank-white', 'Ribbed Tank', 'top', '#f5f5f5', 'a fitted white ribbed cotton tank top'),
  -- Bottoms
  ('jeans-indigo', 'Slim Jeans', 'bottom', '#2c3e6b', 'slim-fit indigo denim jeans with a straight leg'),
  ('jeans-black', 'Black Skinny Jeans', 'bottom', '#1a1a1a', 'black skinny-fit stretch denim jeans'),
  ('chinos-khaki', 'Chino Trousers', 'bottom', '#c2b280', 'khaki cotton chino trousers with a tapered leg'),
  ('trousers-charcoal', 'Tailored Trousers', 'bottom', '#3b3b3b', 'charcoal-grey tailored wool trousers with a straight leg'),
  ('shorts-beige', 'Linen Shorts', 'bottom', '#d8c7a9', 'beige linen shorts sitting just above the knee'),
  ('cargo-olive', 'Cargo Pants', 'bottom', '#556b2f', 'olive-green cotton cargo pants with side pockets'),
  ('skirt-denim', 'Denim Mini Skirt', 'bottom', '#4a6fa5', 'a mid-blue denim A-line mini skirt'),
  ('skirt-pleated-black', 'Pleated Midi Skirt', 'bottom', '#202020', 'a black pleated midi skirt that falls below the knee'),
  ('leggings-black', 'Athletic Leggings', 'bottom', '#111111', 'black high-waisted athletic leggings, full length'),
  ('joggers-grey', 'Fleece Joggers', 'bottom', '#8a8a8a', 'heather-grey fleece jogger sweatpants with cuffed ankles'),
  -- Dresses
  ('wrap-dress-navy', 'Wrap Midi Dress', 'dress', '#2c3e50', 'a navy blue wrap-style midi dress with a fitted waist and short sleeves'),
  ('sundress-yellow', 'Summer Sundress', 'dress', '#f1c40f', 'a light yellow floral sundress with thin straps and a flowing skirt'),
  ('lbd', 'Little Black Dress', 'dress', '#0f0f0f', 'a fitted black sleeveless cocktail dress ending above the knee'),
  ('maxi-floral', 'Floral Maxi Dress', 'dress', '#b5651d', 'a flowing floral-print maxi dress with short sleeves'),
  ('shirt-dress-olive', 'Shirt Dress', 'dress', '#6b8e23', 'an olive button-front shirt dress with a belted waist and short sleeves'),
  ('slip-dress-emerald', 'Satin Slip Dress', 'dress', '#0b6e4f', 'an emerald-green satin slip dress with thin straps, midi length'),
  ('sweater-dress-grey', 'Sweater Dress', 'dress', '#9099a2', 'a grey ribbed-knit long-sleeve sweater dress, above the knee'),
  ('bodycon-red', 'Bodycon Dress', 'dress', '#b21f2d', 'a red fitted bodycon dress with short sleeves, knee length'),
  ('a-line-teal', 'A-Line Day Dress', 'dress', '#1abc9c', 'a teal A-line day dress with a fitted bodice and short sleeves'),
  -- Outerwear
  ('denim-jacket', 'Classic Denim Jacket', 'outerwear', '#5d7a99', 'a classic blue denim jacket, worn open over whatever they already have on'),
  ('wool-coat-camel', 'Wool Overcoat', 'outerwear', '#c9a876', 'a camel-colored wool overcoat, knee length, worn open'),
  ('leather-jacket-black', 'Leather Biker Jacket', 'outerwear', '#1b1b1b', 'a black leather biker jacket with silver zippers, worn open'),
  ('bomber-green', 'Bomber Jacket', 'outerwear', '#3d4a2a', 'an olive nylon bomber jacket with ribbed cuffs, worn zipped halfway'),
  ('trench-beige', 'Trench Coat', 'outerwear', '#c8b18f', 'a beige double-breasted trench coat, knee length, worn open with the belt tied'),
  ('puffer-black', 'Puffer Jacket', 'outerwear', '#171717', 'a black quilted puffer jacket, worn zipped'),
  ('blazer-navy', 'Tailored Blazer', 'outerwear', '#24344d', 'a navy single-breasted tailored blazer, worn open'),
  ('cardigan-oatmeal', 'Chunky Cardigan', 'outerwear', '#d9cdb8', 'an oatmeal chunky-knit cardigan, worn open'),
  ('parka-khaki', 'Hooded Parka', 'outerwear', '#78745c', 'a khaki hooded parka with a fur-trimmed hood, worn open'),
  -- Accessories
  ('sunglasses-black', 'Classic Sunglasses', 'accessory', '#101010', 'black wayfarer-style sunglasses'),
  ('beanie-grey', 'Knit Beanie', 'accessory', '#6e6e6e', 'a grey ribbed-knit beanie'),
  ('cap-black', 'Baseball Cap', 'accessory', '#1a1a1a', 'a plain black baseball cap worn forward'),
  ('fedora-tan', 'Wool Fedora', 'accessory', '#b08d57', 'a tan wool fedora hat'),
  ('scarf-red-plaid', 'Plaid Scarf', 'accessory', '#8b1a1a', 'a red plaid wool scarf draped around the neck'),
  ('silk-scarf-teal', 'Silk Neck Scarf', 'accessory', '#1a8f8f', 'a teal silk scarf tied at the neck'),
  ('tote-tan', 'Leather Tote', 'accessory', '#a97142', 'a tan leather tote bag carried on the shoulder'),
  ('crossbody-black', 'Crossbody Bag', 'accessory', '#151515', 'a small black leather crossbody bag worn across the body'),
  ('belt-brown', 'Leather Belt', 'accessory', '#5c3a21', 'a brown leather belt with a simple silver buckle'),
  ('necklace-gold', 'Gold Pendant Necklace', 'accessory', '#d4af37', 'a delicate gold pendant necklace'),
  ('watch-silver', 'Steel Watch', 'accessory', '#c0c0c0', 'a stainless-steel wristwatch with a round face, worn on the wrist')
ON CONFLICT (id) DO NOTHING;

-- Give the demo catalog size options so the "red dress, size L" filter has data.
UPDATE garments SET sizes = 'S,M,L,XL'
  WHERE store_id IS NULL AND sizes IS NULL
    AND category IN ('top', 'bottom', 'dress', 'outerwear');
UPDATE garments SET sizes = 'One size'
  WHERE store_id IS NULL AND sizes IS NULL AND category = 'accessory';
