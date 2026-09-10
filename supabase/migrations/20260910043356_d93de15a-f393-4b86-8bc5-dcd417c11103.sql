ALTER TABLE public.app_theme_config
  ADD COLUMN IF NOT EXISTS header_height_px integer NOT NULL DEFAULT 230,
  ADD COLUMN IF NOT EXISTS header_bg_image_url text,
  ADD COLUMN IF NOT EXISTS festive_style_active boolean NOT NULL DEFAULT false;

ALTER TABLE public.app_theme_config
  DROP CONSTRAINT IF EXISTS app_theme_config_header_height_px_check;
ALTER TABLE public.app_theme_config
  ADD CONSTRAINT app_theme_config_header_height_px_check
  CHECK (header_height_px BETWEEN 180 AND 380);