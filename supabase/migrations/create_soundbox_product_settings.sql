ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS soundbox_product jsonb NOT NULL DEFAULT
    '{"front_image_url":null,"back_image_url":null,"packaging_image_url":null,"is_in_stock":false}'::jsonb;

CREATE TABLE IF NOT EXISTS public.soundbox_product_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  front_image_url text,
  back_image_url text,
  packaging_image_url text,
  is_in_stock boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.soundbox_product_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.soundbox_product_settings TO authenticated;
GRANT INSERT, UPDATE ON public.soundbox_product_settings TO authenticated;

ALTER TABLE public.soundbox_product_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users read Soundbox product"
  ON public.soundbox_product_settings;
CREATE POLICY "Authenticated users read Soundbox product"
  ON public.soundbox_product_settings FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins manage Soundbox product"
  ON public.soundbox_product_settings;
CREATE POLICY "Admins manage Soundbox product"
  ON public.soundbox_product_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS update_soundbox_product_settings_updated_at
  ON public.soundbox_product_settings;
CREATE TRIGGER update_soundbox_product_settings_updated_at
  BEFORE UPDATE ON public.soundbox_product_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'soundbox_product_settings'
    )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.soundbox_product_settings;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
