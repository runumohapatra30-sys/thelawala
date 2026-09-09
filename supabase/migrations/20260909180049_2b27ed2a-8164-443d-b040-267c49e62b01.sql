CREATE OR REPLACE FUNCTION public.complete_delivery(_order_id uuid, _otp text, _proof_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  o public.orders;
  v_partner_id uuid;
  v_base numeric;
  v_earning numeric;
  v_pool numeric;
  v_retained numeric;
  v_gift numeric;
  v_km numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT id INTO v_partner_id
  FROM public.delivery_partners
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_partner_id IS NULL OR o.partner_id IS DISTINCT FROM v_partner_id THEN
    RAISE EXCEPTION 'This order is not assigned to you';
  END IF;
  IF o.status = 'DELIVERED' THEN RETURN; END IF;
  IF o.status IS DISTINCT FROM 'OUT_FOR_DELIVERY' THEN
    RAISE EXCEPTION 'Order is not out for delivery';
  END IF;
  IF trim(coalesce(_proof_path, '')) = '' THEN
    RAISE EXCEPTION 'Delivery photo is required';
  END IF;
  IF trim(coalesce(o.delivery_otp, '')) IS DISTINCT FROM trim(coalesce(_otp, '')) THEN
    RAISE EXCEPTION 'Wrong delivery PIN';
  END IF;

  v_base := CASE WHEN coalesce(o.base_food_total, 0) > 0
                 THEN o.base_food_total
                 ELSE round(coalesce(o.food_total, 0) / 1.10, 2) END;
  v_earning := round(v_base * 0.95, 2);
  v_km := coalesce(o.distance_km, 0);
  v_retained := CASE WHEN v_km <= 3 THEN 7 WHEN v_km <= 4 THEN 5 ELSE 10 END;
  v_pool := round(coalesce(o.food_total, 0) - v_earning, 2);
  v_gift := greatest(0, round(v_pool - v_retained, 2));

  UPDATE public.orders
  SET status = 'DELIVERED',
      proof_photo_url = _proof_path,
      delivered_at = now(),
      completed_at = now(),
      payment_status = CASE WHEN payment_mode = 'COD' THEN 'PAID' ELSE payment_status END,
      updated_at = now()
  WHERE id = _order_id;

  UPDATE public.delivery_partners
  SET is_busy = false, updated_at = now()
  WHERE id = o.partner_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.payout_ledgers
    WHERE order_id = _order_id AND party_type = 'PARTNER'
  ) THEN
    INSERT INTO public.payout_ledgers (order_id, party_type, partner_id, amount, note)
    VALUES (_order_id, 'PARTNER', o.partner_id,
            coalesce(o.delivery_fee, 0) + coalesce(o.tip_amount, 0) + v_gift,
            'Delivery payout (fee + tip + ₹' || v_gift || ' bonus)');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.payout_ledgers
    WHERE order_id = _order_id AND party_type = 'VENDOR'
  ) THEN
    INSERT INTO public.payout_ledgers (order_id, party_type, vendor_id, amount, note)
    VALUES (_order_id, 'VENDOR', o.vendor_id, v_earning, 'Food payout (95% of stall base price)');
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_delivery(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, text, text) TO authenticated;