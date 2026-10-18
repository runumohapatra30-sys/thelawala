CREATE TABLE public.promo_credit_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled boolean NOT NULL DEFAULT false,
  credit_amount numeric NOT NULL DEFAULT 80 CHECK (credit_amount > 0),
  daily_delivery_threshold integer NOT NULL DEFAULT 2 CHECK (daily_delivery_threshold > 0),
  rolling_delivery_threshold integer NOT NULL DEFAULT 7 CHECK (rolling_delivery_threshold > 0),
  rolling_window_days integer NOT NULL DEFAULT 7 CHECK (rolling_window_days > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.promo_credit_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.promo_credit_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.promo_credit_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.promo_credit_settings TO authenticated;

CREATE POLICY "Public can read enabled free cash rules"
ON public.promo_credit_settings FOR SELECT TO anon, authenticated
USING (is_enabled OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage free cash rules"
ON public.promo_credit_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_promo_credit_settings_updated_at
BEFORE UPDATE ON public.promo_credit_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.commerce_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]+$'),
  title text NOT NULL,
  description text,
  allowed_prices integer[] NOT NULL DEFAULT ARRAY[49, 99],
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commerce_campaigns_title_length CHECK (char_length(title) BETWEEN 1 AND 100),
  CONSTRAINT commerce_campaigns_prices_valid CHECK (
    cardinality(allowed_prices) > 0
    AND 0 < ALL (allowed_prices)
  )
);

INSERT INTO public.commerce_campaigns (slug, title, description, allowed_prices)
VALUES
  ('99-store', '99 Store', 'Meals at ₹99 + free delivery', ARRAY[49, 89, 99]),
  ('flat-49', 'Flat ₹49 Deals', 'Selected street-food picks at ₹49', ARRAY[49])
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE public.commerce_campaigns ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.commerce_campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.commerce_campaigns TO authenticated;

CREATE POLICY "Public can read active commerce campaigns"
ON public.commerce_campaigns FOR SELECT TO anon, authenticated
USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage commerce campaigns"
ON public.commerce_campaigns FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_commerce_campaigns_updated_at
BEFORE UPDATE ON public.commerce_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.commerce_campaign_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.commerce_campaigns(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  offer_price numeric NOT NULL CHECK (offer_price > 0),
  source text NOT NULL CHECK (source IN ('vendor', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT commerce_campaign_items_unique UNIQUE (campaign_id, menu_item_id, source)
);

CREATE INDEX commerce_campaign_items_campaign_active_idx
ON public.commerce_campaign_items (campaign_id, is_active);

CREATE FUNCTION public.validate_commerce_campaign_item()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  menu_vendor_id uuid;
  menu_price numeric;
  campaign_prices integer[];
BEGIN
  SELECT vendor_id, price INTO menu_vendor_id, menu_price
  FROM public.menu_items
  WHERE id = NEW.menu_item_id;

  IF menu_vendor_id IS NULL OR menu_vendor_id <> NEW.vendor_id THEN
    RAISE EXCEPTION 'Campaign item must belong to the selected vendor.';
  END IF;
  SELECT allowed_prices INTO campaign_prices
  FROM public.commerce_campaigns
  WHERE id = NEW.campaign_id;
  IF campaign_prices IS NULL OR NOT (NEW.offer_price = ANY(campaign_prices)) THEN
    RAISE EXCEPTION 'Campaign item price must match an allowed campaign tier.';
  END IF;
  IF NEW.offer_price > round(menu_price * 1.1) THEN
    RAISE EXCEPTION 'Campaign price cannot exceed the customer menu price.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_commerce_campaign_item
BEFORE INSERT OR UPDATE ON public.commerce_campaign_items
FOR EACH ROW EXECUTE FUNCTION public.validate_commerce_campaign_item();

ALTER TABLE public.commerce_campaign_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.commerce_campaign_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.commerce_campaign_items TO authenticated;

CREATE POLICY "Public can read live campaign items"
ON public.commerce_campaign_items FOR SELECT TO anon, authenticated
USING (
  (
    is_active
    AND EXISTS (
      SELECT 1
      FROM public.commerce_campaigns c
      JOIN public.vendors v ON v.id = commerce_campaign_items.vendor_id
      JOIN public.menu_items m ON m.id = commerce_campaign_items.menu_item_id
      WHERE c.id = commerce_campaign_items.campaign_id
        AND c.is_active
        AND v.status = 'APPROVED'
        AND m.in_stock
    )
  )
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = commerce_campaign_items.vendor_id AND v.owner_id = auth.uid()
  )
);

CREATE POLICY "Vendors and admins create campaign items"
ON public.commerce_campaign_items FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    source = 'vendor'
    AND EXISTS (
      SELECT 1
      FROM public.vendors v
      JOIN public.menu_items m ON m.vendor_id = v.id
      JOIN public.commerce_campaigns c ON c.id = commerce_campaign_items.campaign_id
      WHERE v.id = commerce_campaign_items.vendor_id
        AND v.owner_id = auth.uid()
        AND v.status = 'APPROVED'
        AND m.id = commerce_campaign_items.menu_item_id
        AND m.in_stock
        AND c.is_active
        AND commerce_campaign_items.offer_price = ANY(c.allowed_prices)
    )
  )
);

CREATE POLICY "Vendors and admins update campaign items"
ON public.commerce_campaign_items FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = commerce_campaign_items.vendor_id AND v.owner_id = auth.uid()
      AND commerce_campaign_items.source = 'vendor'
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR (
    source = 'vendor'
    AND EXISTS (
      SELECT 1
      FROM public.vendors v
      JOIN public.menu_items m ON m.vendor_id = v.id
      JOIN public.commerce_campaigns c ON c.id = commerce_campaign_items.campaign_id
      WHERE v.id = commerce_campaign_items.vendor_id
        AND v.owner_id = auth.uid()
        AND v.status = 'APPROVED'
        AND m.id = commerce_campaign_items.menu_item_id
        AND m.in_stock
        AND c.is_active
        AND commerce_campaign_items.offer_price = ANY(c.allowed_prices)
    )
  )
);

CREATE POLICY "Vendors and admins delete campaign items"
ON public.commerce_campaign_items FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = commerce_campaign_items.vendor_id AND v.owner_id = auth.uid()
      AND commerce_campaign_items.source = 'vendor'
  )
);

CREATE POLICY "Admins can notify vendors about campaigns"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_commerce_campaign_items_updated_at
BEFORE UPDATE ON public.commerce_campaign_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.campaigns (
  title, is_active, theme_bg_color, top_tab_label, promo_cards, deals_section_active
)
SELECT
  'Durga Puja Celebration',
  false,
  'linear-gradient(135deg,#5b1c38,#d34546,#f7b654)',
  'Durga Puja',
  '[
    {"title":"Make-up & beauty","subtitle":"Get ready to celebrate","image_url":"","redirect_category_or_filter":"beauty"},
    {"title":"Festive gifting","subtitle":"Share something special","image_url":"","redirect_category_or_filter":"gift"},
    {"title":"Feasting & sweets","subtitle":"Treats for the pandal","image_url":"","redirect_category_or_filter":"sweet"},
    {"title":"Puja essentials","subtitle":"Everything for the celebration","image_url":"","redirect_category_or_filter":"puja"},
    {"title":"Celebrate together","subtitle":"Feast with your favourites","image_url":"","redirect_category_or_filter":"feast"}
  ]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaigns WHERE lower(title) = lower('Durga Puja Celebration')
);
