ALTER TABLE public.app_theme_config
  ADD COLUMN IF NOT EXISTS theme_token text NOT NULL DEFAULT 'DEFAULT_YELLOW';

ALTER TABLE public.app_theme_config
  DROP CONSTRAINT IF EXISTS app_theme_config_theme_token_check;

ALTER TABLE public.app_theme_config
  ADD CONSTRAINT app_theme_config_theme_token_check
  CHECK (theme_token IN ('SKY_BLUE','WARM_OCHRE','DEFAULT_YELLOW'));