CREATE TABLE public.app_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_text text NOT NULL DEFAULT 'WELCOME TO THELAWALA',
  title text NOT NULL,
  description_1 text,
  description_2 text,
  offer_title text,
  offer_subtitle text,
  cashback_text text,
  cta_button_text text NOT NULL DEFAULT 'Order Now',
  target_route text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_promotions_title_length CHECK (char_length(title) BETWEEN 1 AND 120),
  CONSTRAINT app_promotions_target_route_safe CHECK (target_route IS NULL OR target_route ~ '^/[A-Za-z0-9_./?=&%-]*$')
);

GRANT SELECT ON public.app_promotions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_promotions TO authenticated;
GRANT ALL ON public.app_promotions TO service_role;

ALTER TABLE public.app_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active promotions are public"
ON public.app_promotions FOR SELECT
TO anon, authenticated
USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins create promotions"
ON public.app_promotions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update promotions"
ON public.app_promotions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete promotions"
ON public.app_promotions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_promotions_updated_at
BEFORE UPDATE ON public.app_promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.curated_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_title text NOT NULL DEFAULT 'The best of ThelaWala!',
  bundle_subtitle text NOT NULL DEFAULT 'Curated street picks at special prices',
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  tag text,
  description text,
  original_price numeric NOT NULL CHECK (original_price >= 0),
  offer_price numeric NOT NULL CHECK (offer_price >= 0 AND offer_price <= original_price),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1 CHECK (sort_order > 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT curated_bundles_item_unique UNIQUE (menu_item_id)
);

GRANT SELECT ON public.curated_bundles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.curated_bundles TO authenticated;
GRANT ALL ON public.curated_bundles TO service_role;

ALTER TABLE public.curated_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active curated bundles are public"
ON public.curated_bundles FOR SELECT
TO anon, authenticated
USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins create curated bundles"
ON public.curated_bundles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update curated bundles"
ON public.curated_bundles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete curated bundles"
ON public.curated_bundles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_curated_bundles_updated_at
BEFORE UPDATE ON public.curated_bundles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();