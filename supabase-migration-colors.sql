-- Run this in Supabase SQL Editor to enable multiple product colors.
-- Adds a JSONB colors array to both product tables and color_name on order line items.

ALTER TABLE featured_timepieces
  ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT '[]'::jsonb;

ALTER TABLE premium_products
  ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT '[]'::jsonb;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS color_name text;

-- Example colors shape stored in jsonb:
-- [
--   { "name": "Gold", "hex": "#c8a45e", "image_url": "https://..." },
--   { "name": "Silver", "hex": "#c0c0c0", "image_url": "https://..." }
-- ]
