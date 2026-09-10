CREATE TABLE public.home_dynamic_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_type text NOT NULL DEFAULT 'FESTIVE_GRID_4',
  title text NOT NULL DEFAULT '',
  subtitle text,
  bg_color text,
  bg_image_url text,
  cards jsonb NOT NULL DEFAULT '[]'::jsonb,
  item_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_dynamic_sections_type_check CHECK (section_type IN ('FESTIVE_GRID_4','FESTIVE_PICKS_PRODUCTS'))
);

GRANT SELECT ON public.home_dynamic_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_dynamic_sections TO authenticated;
GRANT ALL ON public.home_dynamic_sections TO service_role;

ALTER TABLE public.home_dynamic_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read home sections"
ON public.home_dynamic_sections FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage home sections"
ON public.home_dynamic_sections FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER home_dynamic_sections_updated_at
BEFORE UPDATE ON public.home_dynamic_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.app_theme_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_bg_color text NOT NULL DEFAULT '#FACC15',
  temporary_bg_color text,
  is_temporary_active boolean NOT NULL DEFAULT false,
  temporary_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_theme_config TO anon;
GRANT SELECT, INSERT, UPDATE ON public.app_theme_config TO authenticated;
GRANT ALL ON public.app_theme_config TO service_role;

ALTER TABLE public.app_theme_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read theme"
ON public.app_theme_config FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Admins manage theme"
ON public.app_theme_config FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER app_theme_config_updated_at
BEFORE UPDATE ON public.app_theme_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_theme_config (current_bg_color) VALUES ('#FACC15');

ALTER PUBLICATION supabase_realtime ADD TABLE public.home_dynamic_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_theme_config;