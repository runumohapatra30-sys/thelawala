ALTER TABLE public.payout_ledgers ADD COLUMN IF NOT EXISTS eligible_at timestamptz;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS gst_pct numeric NOT NULL DEFAULT 0;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS tds_pct numeric NOT NULL DEFAULT 0;