ALTER TABLE public.payment_credentials
  ADD COLUMN IF NOT EXISTS cashfree_app_id text,
  ADD COLUMN IF NOT EXISTS cashfree_secret text;