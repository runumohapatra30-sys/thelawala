ALTER TABLE public.app_dynamic_banners
  ADD COLUMN IF NOT EXISTS banner_format text NOT NULL DEFAULT 'HERO',
  ADD COLUMN IF NOT EXISTS grid_image_urls text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.app_dynamic_banners
  DROP CONSTRAINT IF EXISTS app_dynamic_banners_banner_format_check;

ALTER TABLE public.app_dynamic_banners
  ADD CONSTRAINT app_dynamic_banners_banner_format_check
  CHECK (banner_format IN ('HERO', 'SLIM', '4_GRID'));

COMMENT ON COLUMN public.app_dynamic_banners.banner_format IS 'Customer home presentation: HERO, SLIM, or 4_GRID';
COMMENT ON COLUMN public.app_dynamic_banners.grid_image_urls IS 'Four image URLs used when banner_format is 4_GRID';