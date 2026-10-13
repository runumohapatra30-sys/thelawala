ALTER TABLE public.app_dynamic_banners
  DROP CONSTRAINT IF EXISTS app_dynamic_banners_banner_format_check;

ALTER TABLE public.app_dynamic_banners
  ADD CONSTRAINT app_dynamic_banners_banner_format_check
  CHECK (banner_format IN ('HERO', 'SLIM', '4_GRID', 'BEST_VALUE'));

COMMENT ON COLUMN public.app_dynamic_banners.banner_format
  IS 'Customer home presentation: HERO, SLIM, 4_GRID, or BEST_VALUE';
