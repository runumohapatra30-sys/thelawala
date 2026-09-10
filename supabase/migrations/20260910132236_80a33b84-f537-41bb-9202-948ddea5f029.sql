CREATE TABLE public.home_festive_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  link_url text,
  size_mode text NOT NULL DEFAULT 'FULL' CHECK (size_mode IN ('FULL','COMPACT')),
  display_order integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.home_festive_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_festive_photos TO authenticated;
GRANT ALL ON public.home_festive_photos TO service_role;

ALTER TABLE public.home_festive_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can see live festive photos"
  ON public.home_festive_photos FOR SELECT
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage festive photos"
  ON public.home_festive_photos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_home_festive_photos_updated_at
  BEFORE UPDATE ON public.home_festive_photos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.home_festive_photos;

ALTER TABLE public.addresses ALTER COLUMN lat SET DEFAULT 0;
ALTER TABLE public.addresses ALTER COLUMN lng SET DEFAULT 0;