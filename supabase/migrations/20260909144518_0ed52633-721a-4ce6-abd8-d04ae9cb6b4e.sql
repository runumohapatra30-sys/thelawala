CREATE TABLE IF NOT EXISTS public.app_dynamic_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  banner_image_url text NOT NULL,
  lottie_url text,
  time_slots text[] NOT NULL DEFAULT '{}',
  weather_tags text[] NOT NULL DEFAULT '{}',
  category_id uuid,
  vendor_id uuid,
  is_enabled boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  ai_reason text,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_dynamic_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_dynamic_assets TO authenticated;
GRANT ALL ON public.app_dynamic_assets TO service_role;

ALTER TABLE public.app_dynamic_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read dynamic assets" ON public.app_dynamic_assets;
CREATE POLICY "Anyone can read dynamic assets" ON public.app_dynamic_assets
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage dynamic assets" ON public.app_dynamic_assets;
CREATE POLICY "Admins manage dynamic assets" ON public.app_dynamic_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_app_dynamic_assets_updated_at ON public.app_dynamic_assets;
CREATE TRIGGER update_app_dynamic_assets_updated_at
  BEFORE UPDATE ON public.app_dynamic_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.complete_delivery(_order_id uuid, _otp text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE o public.orders; v_base numeric; v_earning numeric;
        v_pool numeric; v_retained numeric; v_gift numeric; v_km numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status = 'DELIVERED' THEN RETURN; END IF;
  IF o.delivery_otp IS DISTINCT FROM _otp THEN RAISE EXCEPTION 'Wrong delivery PIN'; END IF;

  v_base := CASE WHEN coalesce(o.base_food_total,0) > 0
                 THEN o.base_food_total
                 ELSE round(coalesce(o.food_total,0) / 1.10, 2) END;
  v_earning := round(v_base * 0.95, 2);

  v_km := coalesce(o.distance_km, 0);
  v_retained := CASE WHEN v_km <= 3 THEN 7 WHEN v_km <= 4 THEN 5 ELSE 10 END;
  v_pool := round(coalesce(o.food_total,0) - v_earning, 2);
  v_gift := greatest(0, round(v_pool - v_retained, 2));

  UPDATE public.orders SET status = 'DELIVERED', delivered_at = now(), completed_at = now(),
    payment_status = CASE WHEN payment_mode = 'COD' THEN 'PAID' ELSE payment_status END,
    updated_at = now()
  WHERE id = _order_id;

  IF o.partner_id IS NOT NULL THEN
    UPDATE public.delivery_partners SET is_busy = false, updated_at = now() WHERE id = o.partner_id;
    INSERT INTO public.payout_ledgers (order_id, party_type, partner_id, amount, note)
      VALUES (_order_id, 'PARTNER', o.partner_id,
              coalesce(o.delivery_fee,0) + coalesce(o.tip_amount,0) + v_gift,
              'Delivery payout (fee + tip + ₹' || v_gift || ' bonus)');
  END IF;

  INSERT INTO public.payout_ledgers (order_id, party_type, vendor_id, amount, note)
    VALUES (_order_id, 'VENDOR', o.vendor_id, v_earning, 'Food payout (95% of stall base price)');
END; $function$;