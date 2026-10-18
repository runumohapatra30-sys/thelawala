CREATE TABLE public.app_visual_engine_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  is_enabled boolean NOT NULL DEFAULT false,
  flash_deal_enabled boolean NOT NULL DEFAULT false,
  flash_menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  flash_price numeric CHECK (flash_price IS NULL OR flash_price > 0),
  flash_image_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_visual_engine_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_visual_engine_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.app_visual_engine_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_visual_engine_settings TO authenticated;

CREATE POLICY "Public can read visual engine settings"
ON public.app_visual_engine_settings FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage visual engine settings"
ON public.app_visual_engine_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_visual_engine_settings_updated_at
BEFORE UPDATE ON public.app_visual_engine_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
