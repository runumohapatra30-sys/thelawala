
-- COUPONS
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'FLAT' CHECK (discount_type IN ('FLAT','PERCENT')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons readable" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "coupons admin insert" ON public.coupons FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "coupons admin update" ON public.coupons FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "coupons admin delete" ON public.coupons FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id),
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own redemptions" ON public.coupon_redemptions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

INSERT INTO public.coupons (code, description, discount_type, discount_value, min_order, max_discount)
VALUES
 ('THELA50','₹50 off on orders above ₹199','FLAT',50,199,NULL),
 ('FIRST20','20% off up to ₹60 on your order','PERCENT',20,99,60),
 ('CHAI10','₹10 off on any order','FLAT',10,0,NULL);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- RATINGS
CREATE TABLE public.order_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id),
  partner_id uuid REFERENCES public.delivery_partners(id),
  food_stars integer NOT NULL CHECK (food_stars BETWEEN 1 AND 5),
  delivery_stars integer NOT NULL CHECK (delivery_stars BETWEEN 1 AND 5),
  review text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.order_ratings TO authenticated;
GRANT SELECT ON public.order_ratings TO anon;
GRANT ALL ON public.order_ratings TO service_role;
ALTER TABLE public.order_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ratings readable" ON public.order_ratings FOR SELECT USING (true);
CREATE POLICY "rate own order" ON public.order_ratings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own rating" ON public.order_ratings FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- FAVORITES
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "add own favorites" ON public.favorites FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "remove own favorites" ON public.favorites FOR DELETE TO authenticated USING (user_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "read own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, order_id)
    VALUES (
      NEW.user_id,
      CASE NEW.status
        WHEN 'ORDER_PLACED' THEN 'Order placed'
        WHEN 'PREPARING' THEN 'Your food is being prepared'
        WHEN 'READY_FOR_PICKUP' THEN 'Order ready for pickup'
        WHEN 'RIDER_ASSIGNED' THEN 'Delivery partner assigned'
        WHEN 'OUT_FOR_DELIVERY' THEN 'Out for delivery'
        WHEN 'DELIVERED' THEN 'Delivered — enjoy your food!'
        WHEN 'CANCELLED' THEN 'Order cancelled'
        ELSE 'Order update'
      END,
      'Order #' || NEW.code,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER orders_notify AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_order_status();

-- REFERRALS
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id);

UPDATE public.profiles
SET referral_code = 'TW' || upper(substr(replace(id::text,'-',''),1,6))
WHERE referral_code IS NULL;

CREATE OR REPLACE FUNCTION public.set_referral_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := 'TW' || upper(substr(replace(NEW.id::text,'-',''),1,6));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER profiles_referral_code BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();

CREATE OR REPLACE FUNCTION public.apply_referral(_code text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _ref uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _me AND referred_by IS NOT NULL) THEN
    RETURN 'ALREADY_USED';
  END IF;
  SELECT id INTO _ref FROM public.profiles WHERE upper(referral_code) = upper(_code);
  IF _ref IS NULL OR _ref = _me THEN RETURN 'INVALID'; END IF;
  UPDATE public.profiles SET referred_by = _ref WHERE id = _me;
  PERFORM public.wallet_credit(_me, 25, 'REFERRAL', NULL, 'Referral bonus', NULL);
  PERFORM public.wallet_credit(_ref, 25, 'REFERRAL', NULL, 'Friend joined with your code', NULL);
  RETURN 'OK';
END;
$$;
