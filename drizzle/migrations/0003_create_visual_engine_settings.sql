CREATE TABLE public.app_visual_engine_settings (
  id integer primary key default 1,
  is_enabled boolean not null default false,
  flash_deal_enabled boolean not null default false,
  flash_menu_item_id uuid references public.menu_items(id) on delete set null,
  flash_price numeric,
  flash_image_url text,
  updated_at timestamptz not null default now()
);
GRANT SELECT ON public.app_visual_engine_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.app_visual_engine_settings TO authenticated;
GRANT ALL ON public.app_visual_engine_settings TO service_role;
ALTER TABLE public.app_visual_engine_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read visual engine settings" ON public.app_visual_engine_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage visual engine settings" ON public.app_visual_engine_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.app_visual_engine_settings (id) VALUES (1);
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_visual_engine_settings;