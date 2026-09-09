CREATE TABLE public.app_page_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_app text NOT NULL CHECK (target_app IN ('customer','vendor','rider')),
  page_name text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_app, page_name)
);

GRANT SELECT ON public.app_page_layouts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_page_layouts TO authenticated;
GRANT ALL ON public.app_page_layouts TO service_role;

ALTER TABLE public.app_page_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view layouts" ON public.app_page_layouts FOR SELECT USING (true);
CREATE POLICY "Admins manage layouts" ON public.app_page_layouts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_page_layouts_updated_at BEFORE UPDATE ON public.app_page_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_page_layouts;