CREATE TABLE public.commerce_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  allowed_prices numeric[] not null default '{}',
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.commerce_campaigns TO anon, authenticated;
GRANT ALL ON public.commerce_campaigns TO service_role;
ALTER TABLE public.commerce_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active campaigns" ON public.commerce_campaigns FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage campaigns" ON public.commerce_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.commerce_campaign_items (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.commerce_campaigns(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  offer_price numeric not null check (offer_price > 0),
  source text not null default 'admin' check (source in ('admin', 'vendor')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (campaign_id, menu_item_id, vendor_id)
);
GRANT SELECT ON public.commerce_campaign_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.commerce_campaign_items TO authenticated;
GRANT ALL ON public.commerce_campaign_items TO service_role;
ALTER TABLE public.commerce_campaign_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active campaign items" ON public.commerce_campaign_items FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins manage campaign items" ON public.commerce_campaign_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Vendors opt in their own items" ON public.commerce_campaign_items FOR INSERT TO authenticated WITH CHECK (source = 'vendor' AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()));
CREATE POLICY "Vendors update their own opt-ins" ON public.commerce_campaign_items FOR UPDATE TO authenticated USING (source = 'vendor' AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid())) WITH CHECK (source = 'vendor' AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()));
CREATE POLICY "Vendors remove their own opt-ins" ON public.commerce_campaign_items FOR DELETE TO authenticated USING (source = 'vendor' AND EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.owner_id = auth.uid()));

CREATE TABLE public.promo_credit_settings (
  id boolean primary key default true,
  is_enabled boolean not null default false,
  credit_amount numeric not null default 80,
  daily_delivery_threshold integer not null default 1,
  rolling_delivery_threshold integer not null default 3,
  rolling_window_days integer not null default 7,
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.promo_credit_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.promo_credit_settings TO authenticated;
GRANT ALL ON public.promo_credit_settings TO service_role;
ALTER TABLE public.promo_credit_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read promo credit settings" ON public.promo_credit_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage promo credit settings" ON public.promo_credit_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.promo_credit_settings (id, is_enabled, credit_amount) VALUES (true, false, 80);
INSERT INTO public.commerce_campaigns (slug, title, description, allowed_prices, is_active) VALUES ('99-store', '99 Store', 'Meals at ₹99 + Free Delivery', '{49,89,99}', true);