ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS gst_pct numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tds_pct numeric NOT NULL DEFAULT 0;

ALTER TABLE public.payout_ledgers
  ADD COLUMN IF NOT EXISTS eligible_at timestamptz;

UPDATE public.payout_ledgers
SET eligible_at = created_at + interval '3 days'
WHERE eligible_at IS NULL;

CREATE OR REPLACE FUNCTION public.vendor_balance(_vendor_id uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT greatest(0,
    coalesce((SELECT sum(amount) FROM public.payout_ledgers
      WHERE party_type='VENDOR' AND vendor_id=_vendor_id
        AND coalesce(eligible_at, created_at) <= now()), 0)
    - coalesce((SELECT sum(amount) FROM public.payout_requests
      WHERE party_type='VENDOR' AND vendor_id=_vendor_id AND status IN ('PENDING','APPROVED')), 0)
  )
$$;

CREATE OR REPLACE FUNCTION public.complete_delivery(_order_id uuid, _otp text, _proof_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  o public.orders;
  v_partner_id uuid;
  v_commission numeric := 10;
  v_gst numeric := 0;
  v_tds numeric := 0;
  v_vendor_payout numeric;
  v_pool numeric;
  v_retained numeric;
  v_gift numeric;
  v_km numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  SELECT id INTO v_partner_id FROM public.delivery_partners WHERE user_id = auth.uid() LIMIT 1;
  IF v_partner_id IS NULL OR o.partner_id IS DISTINCT FROM v_partner_id THEN RAISE EXCEPTION 'This order is not assigned to you'; END IF;
  IF o.status = 'DELIVERED' THEN RETURN; END IF;
  IF o.status IS DISTINCT FROM 'OUT_FOR_DELIVERY' THEN RAISE EXCEPTION 'Order is not out for delivery'; END IF;
  IF trim(coalesce(_proof_path, '')) = '' THEN RAISE EXCEPTION 'Delivery photo is required'; END IF;
  IF trim(coalesce(o.delivery_otp, '')) IS DISTINCT FROM trim(coalesce(_otp, '')) THEN RAISE EXCEPTION 'Wrong delivery PIN'; END IF;

  SELECT coalesce(vendor_commission_pct, 10), coalesce(gst_pct, 0), coalesce(tds_pct, 0)
    INTO v_commission, v_gst, v_tds FROM public.system_settings WHERE id = true;
  v_vendor_payout := greatest(0, round(
    coalesce(o.grand_total, 0)
    - coalesce(o.grand_total, 0) * v_commission / 100
    - coalesce(o.grand_total, 0) * v_gst / 100
    - coalesce(o.grand_total, 0) * v_tds / 100
    - coalesce(o.discount_amount, 0), 2));
  v_km := coalesce(o.distance_km, 0);
  v_retained := CASE WHEN v_km <= 3 THEN 7 WHEN v_km <= 4 THEN 5 ELSE 10 END;
  v_pool := round(coalesce(o.food_total, 0) - v_vendor_payout, 2);
  v_gift := greatest(0, round((v_pool - v_retained) * 0.5, 2));

  UPDATE public.orders SET status = 'DELIVERED', proof_photo_url = _proof_path, delivered_at = now(), completed_at = now(),
    payment_status = CASE WHEN payment_mode = 'COD' THEN 'PAID' ELSE payment_status END, updated_at = now()
    WHERE id = _order_id;
  UPDATE public.delivery_partners SET is_busy = false, updated_at = now() WHERE id = o.partner_id;

  IF NOT EXISTS (SELECT 1 FROM public.payout_ledgers WHERE order_id = _order_id AND party_type = 'PARTNER') THEN
    INSERT INTO public.payout_ledgers (order_id, party_type, partner_id, amount, note, eligible_at)
    VALUES (_order_id, 'PARTNER', o.partner_id, coalesce(o.delivery_fee, 0) + coalesce(o.tip_amount, 0) + v_gift,
      'Delivery payout (fee + tip + bonus)', now() + interval '3 days');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.payout_ledgers WHERE order_id = _order_id AND party_type = 'VENDOR') THEN
    INSERT INTO public.payout_ledgers (order_id, party_type, vendor_id, amount, note, eligible_at)
    VALUES (_order_id, 'VENDOR', o.vendor_id, v_vendor_payout,
      'Order total less commission, GST, TDS and discount', now() + interval '3 days');
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_delivery(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, text, text) TO authenticated;