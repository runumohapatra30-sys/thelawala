ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancel_otp text,
  ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_requested_by text;