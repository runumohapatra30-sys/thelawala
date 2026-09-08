
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','vendor','rider','customer');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  mobile text,
  email text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer')
  ON CONFLICT DO NOTHING;
  INSERT INTO public.wallets (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- SETTINGS
CREATE TABLE public.system_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  vendor_commission_pct numeric NOT NULL DEFAULT 10,
  base_delivery_distance_km numeric NOT NULL DEFAULT 2,
  base_delivery_fee numeric NOT NULL DEFAULT 20,
  extra_fee_per_km numeric NOT NULL DEFAULT 1.26,
  free_delivery_threshold numeric,
  platform_fee numeric NOT NULL DEFAULT 5,
  enable_platform_fee boolean NOT NULL DEFAULT false,
  handling_fee numeric NOT NULL DEFAULT 4,
  enable_handling_fee boolean NOT NULL DEFAULT true,
  packing_fee numeric NOT NULL DEFAULT 0,
  enable_packing_fee boolean NOT NULL DEFAULT false,
  surge_fee numeric NOT NULL DEFAULT 0,
  enable_surge_fee boolean NOT NULL DEFAULT false,
  cancel_penalty_fee numeric NOT NULL DEFAULT 20,
  enable_online_payment boolean NOT NULL DEFAULT false,
  enable_cod boolean NOT NULL DEFAULT true,
  enable_google_login boolean NOT NULL DEFAULT true,
  payment_gateway text NOT NULL DEFAULT 'cashfree',
  payu_key text,
  payu_app_id text,
  cashfree_app_id text,
  wallet_min_topup numeric NOT NULL DEFAULT 50,
  wallet_max_topup numeric NOT NULL DEFAULT 2000,
  support_number text NOT NULL DEFAULT '9078492360',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_settings TO anon, authenticated;
GRANT ALL ON public.system_settings TO service_role;
GRANT UPDATE ON public.system_settings TO authenticated;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.system_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings admin write" ON public.system_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.system_settings (id) VALUES (true);

-- VENDORS
CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stall_name text NOT NULL,
  owner_name text,
  mobile text,
  photo_url text,
  address text,
  lat numeric NOT NULL DEFAULT 20.2961,
  lng numeric NOT NULL DEFAULT 85.8245,
  is_open boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vendors TO anon, authenticated;
GRANT INSERT, UPDATE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors public read" ON public.vendors FOR SELECT TO anon, authenticated USING (status = 'APPROVED' OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "vendors self insert" ON public.vendors FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "vendors self update" ON public.vendors FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  emoji text,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "categories admin write" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;

INSERT INTO public.categories (name, emoji, sort_order) VALUES
 ('Bhata Dali','🍚',1),('Dahi Bara','🥣',2),('Roll','🌯',3),('Chaat','🥗',4),
 ('Biryani','🍛',5),('Chicken Pakoda','🍗',6),('Momo','🥟',7),('Tiffin','🥞',8),
 ('Chai & Snacks','☕',9),('Sweets','🍮',10);

CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  details text,
  photo_url text,
  unit text DEFAULT '1 plate',
  mrp numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  in_stock boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.menu_items TO authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items public read" ON public.menu_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "items vendor write" ON public.menu_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()));

-- ADDRESSES
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  mobile text NOT NULL,
  pincode text NOT NULL,
  line text NOT NULL,
  landmark text,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- DELIVERY PARTNERS
CREATE TABLE public.delivery_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  mobile text,
  photo_url text,
  vehicle_no text,
  lat numeric,
  lng numeric,
  is_online boolean NOT NULL DEFAULT false,
  is_busy boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_partners TO anon, authenticated;
GRANT INSERT, UPDATE ON public.delivery_partners TO authenticated;
GRANT ALL ON public.delivery_partners TO service_role;
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners read" ON public.delivery_partners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "partners self write" ON public.delivery_partners FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "partners self update" ON public.delivery_partners FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin')) WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- ORDERS
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('TW' || to_char(now(),'YYMMDD') || lpad((floor(random()*100000))::text,5,'0')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  partner_id uuid REFERENCES public.delivery_partners(id),
  status text NOT NULL DEFAULT 'PLACED',
  customer_name text NOT NULL,
  customer_mobile text NOT NULL,
  pincode text NOT NULL,
  address_line text NOT NULL,
  drop_lat numeric NOT NULL,
  drop_lng numeric NOT NULL,
  distance_km numeric NOT NULL DEFAULT 0,
  food_total numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  handling_fee numeric NOT NULL DEFAULT 0,
  packing_fee numeric NOT NULL DEFAULT 0,
  surge_fee numeric NOT NULL DEFAULT 0,
  penalty_fee numeric NOT NULL DEFAULT 0,
  wallet_paid numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  payment_mode text NOT NULL DEFAULT 'COD',
  payment_status text NOT NULL DEFAULT 'PENDING',
  gateway_reference_id text,
  pickup_otp text NOT NULL DEFAULT lpad((floor(random()*10000))::text,4,'0'),
  delivery_otp text NOT NULL DEFAULT lpad((floor(random()*10000))::text,4,'0'),
  cancel_reason text,
  cancelled_by text,
  offered_to uuid REFERENCES public.delivery_partners(id),
  offer_expires_at timestamptz,
  rejected_partner_ids uuid[] NOT NULL DEFAULT '{}',
  accepted_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  proof_photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders read" ON public.orders FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.delivery_partners d WHERE d.user_id = auth.uid() AND (d.id = partner_id OR d.id = offered_to))
);
CREATE POLICY "orders customer insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders update" ON public.orders FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.delivery_partners d WHERE d.user_id = auth.uid() AND (d.id = partner_id OR d.id = offered_to))
) WITH CHECK (true);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  photo_url text,
  qty int NOT NULL DEFAULT 1,
  price numeric NOT NULL,
  mrp numeric NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items read" ON public.order_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (
    o.user_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = o.vendor_id AND v.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.delivery_partners d WHERE d.user_id = auth.uid() AND (d.id = o.partner_id OR d.id = o.offered_to))))
);
CREATE POLICY "order items insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

-- WALLET
CREATE TABLE public.wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet" ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('CREDIT','DEBIT')),
  source text NOT NULL CHECK (source IN ('ORDER_PAY','TOPUP','REFUND','CLOSURE','ADJUST')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  gateway_reference_id text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallet txns" ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.wallet_closure_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  gateway_refund_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
GRANT SELECT, INSERT ON public.wallet_closure_requests TO authenticated;
GRANT ALL ON public.wallet_closure_requests TO service_role;
ALTER TABLE public.wallet_closure_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closure own read" ON public.wallet_closure_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "closure own insert" ON public.wallet_closure_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- REFUNDS
CREATE TABLE public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  method text NOT NULL DEFAULT 'WALLET' CHECK (method IN ('WALLET','BANK','SOURCE')),
  bank_account_no text,
  bank_ifsc text,
  bank_holder text,
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','PROCESSING','COMPLETED','REJECTED')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.refund_requests TO authenticated;
GRANT UPDATE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "refunds own read" ON public.refund_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "refunds own insert" ON public.refund_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "refunds admin update" ON public.refund_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- LEDGER
CREATE TABLE public.payout_ledgers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  party_type text NOT NULL CHECK (party_type IN ('VENDOR','PARTNER','ADMIN')),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  partner_id uuid REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_ledgers TO authenticated;
GRANT ALL ON public.payout_ledgers TO service_role;
ALTER TABLE public.payout_ledgers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger read" ON public.payout_ledgers FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.delivery_partners d WHERE d.id = partner_id AND d.user_id = auth.uid())
);

-- triggers
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_vendors_upd BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_items_upd BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_orders_upd BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
