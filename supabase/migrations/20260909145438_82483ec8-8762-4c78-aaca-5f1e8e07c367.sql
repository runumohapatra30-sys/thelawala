CREATE TABLE public.app_dynamic_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type text NOT NULL CHECK (media_type IN ('image','video')),
  media_url text NOT NULL,
  media_path text,
  target_route text,
  height_px integer NOT NULL DEFAULT 140,
  aspect_ratio text NOT NULL DEFAULT '5/2',
  border_radius integer NOT NULL DEFAULT 16,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_dynamic_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_dynamic_banners TO authenticated;
GRANT ALL ON public.app_dynamic_banners TO service_role;

ALTER TABLE public.app_dynamic_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active dynamic banners"
ON public.app_dynamic_banners FOR SELECT
USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage dynamic banners"
ON public.app_dynamic_banners FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_dynamic_banners_updated_at
BEFORE UPDATE ON public.app_dynamic_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();