CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  image_path text,
  target_type text NOT NULL DEFAULT 'NONE',
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  priority integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active banners" ON public.banners FOR SELECT USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage banners insert" ON public.banners FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage banners update" ON public.banners FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage banners delete" ON public.banners FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER t_banners_upd BEFORE UPDATE ON public.banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  theme_bg_color text,
  theme_bg_image_url text,
  top_tab_icon_url text,
  top_tab_label text,
  promo_cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  deals_section_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.campaigns TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns FOR SELECT USING (is_active OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage campaigns insert" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage campaigns update" ON public.campaigns FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage campaigns delete" ON public.campaigns FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER t_campaigns_upd BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS base_food_total numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.complete_delivery(_order_id uuid, _otp text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE o public.orders; v_base numeric; v_earning numeric;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF o.id IS NULL THEN RAISE EXCEPTION 'Order not found'; END IF;
  IF o.status = 'DELIVERED' THEN RETURN; END IF;
  IF o.delivery_otp IS DISTINCT FROM _otp THEN RAISE EXCEPTION 'Wrong delivery PIN'; END IF;

  v_base := CASE WHEN coalesce(o.base_food_total,0) > 0
                 THEN o.base_food_total
                 ELSE round(coalesce(o.food_total,0) / 1.10, 2) END;
  v_earning := round(v_base * 0.95, 2);

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
    VALUES (_order_id, 'VENDOR', o.vendor_id, v_earning, 'Food payout (95% of stall base price)');
END; $function$;