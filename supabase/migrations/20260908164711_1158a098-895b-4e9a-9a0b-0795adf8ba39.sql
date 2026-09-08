ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tip_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_tip_amount_range;
ALTER TABLE public.orders ADD CONSTRAINT orders_tip_amount_range CHECK (tip_amount >= 0 AND tip_amount <= 500);