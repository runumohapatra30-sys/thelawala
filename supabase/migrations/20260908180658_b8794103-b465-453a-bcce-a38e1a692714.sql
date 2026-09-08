ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

UPDATE public.orders SET status = CASE status
  WHEN 'PLACED' THEN 'ORDER_PLACED'
  WHEN 'VENDOR_ACCEPTED' THEN 'PREPARING'
  WHEN 'PREPARING' THEN 'PREPARING'
  WHEN 'READY' THEN 'READY_FOR_PICKUP'
  WHEN 'ASSIGNED' THEN 'RIDER_ASSIGNED'
  WHEN 'ARRIVED_AT_VENDOR' THEN 'RIDER_ASSIGNED'
  WHEN 'PICKED_UP' THEN 'OUT_FOR_DELIVERY'
  WHEN 'OUT_FOR_DELIVERY' THEN 'OUT_FOR_DELIVERY'
  WHEN 'DELIVERED' THEN 'DELIVERED'
  WHEN 'CANCELLED' THEN 'CANCELLED'
  ELSE 'ORDER_PLACED' END;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN
  ('ORDER_PLACED','PREPARING','READY_FOR_PICKUP','RIDER_ASSIGNED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'));

ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'ORDER_PLACED';

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS qr_hash text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_scanned_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.orders SET qr_hash = encode(gen_random_bytes(16), 'hex') WHERE qr_hash IS NULL;
UPDATE public.orders SET delivery_otp = lpad((floor(random()*10000))::int::text, 4, '0') WHERE length(delivery_otp) <> 4;
CREATE UNIQUE INDEX IF NOT EXISTS orders_qr_hash_key ON public.orders(qr_hash);

CREATE OR REPLACE FUNCTION public.orders_defaults()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.qr_hash IS NULL THEN NEW.qr_hash := encode(gen_random_bytes(16), 'hex'); END IF;
  IF NEW.delivery_otp IS NULL OR length(NEW.delivery_otp) <> 4 THEN
    NEW.delivery_otp := lpad((floor(random()*10000))::int::text, 4, '0');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS t_orders_defaults ON public.orders;
CREATE TRIGGER t_orders_defaults BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_defaults();

CREATE OR REPLACE FUNCTION public.complete_delivery(_order_id uuid, _otp text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; s public.system_settings; v_comm numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status = 'DELIVERED' THEN RETURN; END IF;
  IF o.delivery_otp IS DISTINCT FROM _otp THEN RAISE EXCEPTION 'Wrong delivery PIN'; END IF;

  SELECT * INTO s FROM public.system_settings WHERE id = true;
  v_comm := round(coalesce(o.food_total,0) * coalesce(s.vendor_commission_pct,0) / 100.0, 2);

  UPDATE public.orders SET status = 'DELIVERED', delivered_at = now(), completed_at = now(),
    payment_status = CASE WHEN payment_mode = 'COD' THEN 'PAID' ELSE payment_status END,
    updated_at = now()
  WHERE id = _order_id;

  IF o.partner_id IS NOT NULL THEN
    UPDATE public.delivery_partners SET is_busy = false, updated_at = now() WHERE id = o.partner_id;
    INSERT INTO public.payout_ledgers (order_id, party_type, partner_id, amount, note)
      VALUES (_order_id, 'PARTNER', o.partner_id, coalesce(o.delivery_fee,0) + coalesce(o.tip_amount,0), 'Delivery payout');
  END IF;

  INSERT INTO public.payout_ledgers (order_id, party_type, vendor_id, amount, note)
    VALUES (_order_id, 'VENDOR', o.vendor_id, coalesce(o.food_total,0) - v_comm, 'Food payout after commission');
END; $$;

GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;