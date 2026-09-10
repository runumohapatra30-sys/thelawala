ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS offer_percent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS offer_label text;

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_offer_percent_check;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_offer_percent_check CHECK (offer_percent >= 0 AND offer_percent <= 70);