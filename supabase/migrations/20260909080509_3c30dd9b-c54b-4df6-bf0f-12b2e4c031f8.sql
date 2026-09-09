-- 1. Orders: delivery instructions + prep time
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_instructions text,
  ADD COLUMN IF NOT EXISTS prep_minutes integer,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;

-- 2. Vendors: opening hours + default prep time
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS open_time time NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS close_time time NOT NULL DEFAULT '22:00',
  ADD COLUMN IF NOT EXISTS default_prep_minutes integer NOT NULL DEFAULT 10;

-- 3. Customer <-> rider chat
CREATE TABLE IF NOT EXISTS public.order_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('CUSTOMER','RIDER','SUPPORT')),
  sender_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_chats TO authenticated;
GRANT ALL ON public.order_chats TO service_role;
ALTER TABLE public.order_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order parties can read chat" ON public.order_chats FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.delivery_partners p ON p.id = o.partner_id
    WHERE o.id = order_chats.order_id
      AND (o.user_id = auth.uid() OR p.user_id = auth.uid())
  ) OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Order parties can send chat" ON public.order_chats FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    LEFT JOIN public.delivery_partners p ON p.id = o.partner_id
    WHERE o.id = order_chats.order_id
      AND (o.user_id = auth.uid() OR p.user_id = auth.uid())
  ) OR public.has_role(auth.uid(), 'admin')
);

-- 4. Rider duty shifts
CREATE TABLE IF NOT EXISTS public.rider_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.delivery_partners(id) ON DELETE CASCADE,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  zone text,
  status text NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','ACTIVE','DONE','CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS rider_shifts_unique ON public.rider_shifts (partner_id, shift_date, start_time);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rider_shifts TO authenticated;
GRANT ALL ON public.rider_shifts TO service_role;
ALTER TABLE public.rider_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Riders manage own shifts" ON public.rider_shifts FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.delivery_partners p WHERE p.id = rider_shifts.partner_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.delivery_partners p WHERE p.id = rider_shifts.partner_id AND p.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- 5. Admin daily money report
CREATE OR REPLACE FUNCTION public.admin_daily_report(_from date, _to date)
RETURNS TABLE (
  day date,
  orders_count bigint,
  collected numeric,
  food_total numeric,
  vendor_payout numeric,
  rider_payout numeric,
  charges numeric,
  discounts numeric,
  profit numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_comm numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT coalesce(vendor_commission_pct, 0) INTO v_comm FROM public.system_settings WHERE id = true;

  RETURN QUERY
  SELECT (o.created_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
         count(*)::bigint,
         round(sum(o.grand_total), 2),
         round(sum(o.food_total), 2),
         round(sum(o.food_total * (1 - v_comm / 100.0)), 2),
         round(sum(o.delivery_fee + o.tip_amount), 2),
         round(sum(o.platform_fee + o.handling_fee + o.packing_fee + o.surge_fee), 2),
         round(sum(o.discount_amount), 2),
         round(sum(o.food_total * v_comm / 100.0 + o.platform_fee + o.handling_fee + o.packing_fee + o.surge_fee - o.discount_amount), 2)
  FROM public.orders o
  WHERE o.status = 'DELIVERED'
    AND (o.created_at AT TIME ZONE 'Asia/Kolkata')::date BETWEEN _from AND _to
  GROUP BY 1
  ORDER BY 1 DESC;
END;
$$;