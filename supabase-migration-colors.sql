ALTER TABLE featured_timepieces
  ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT '[]'::jsonb;

ALTER TABLE premium_products
  ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT '[]'::jsonb;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS color_name text;