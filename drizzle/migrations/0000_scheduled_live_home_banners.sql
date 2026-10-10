ALTER TABLE public.app_dynamic_banners
 ADD COLUMN title text NOT NULL DEFAULT '',
 ADD COLUMN subtitle text NOT NULL DEFAULT '',
 ADD COLUMN badge text NOT NULL DEFAULT '',
 ADD COLUMN theme_color text,
 ADD COLUMN starts_at timestamptz,
 ADD COLUMN ends_at timestamptz;
ALTER TABLE public.app_dynamic_banners ADD CONSTRAINT banner_theme_color_format CHECK (theme_color IS NULL OR theme_color ~ '^#[0-9A-Fa-f]{6}$');
ALTER TABLE public.app_dynamic_banners ADD CONSTRAINT banner_schedule_order CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at);
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'app_dynamic_banners') THEN
 ALTER PUBLICATION supabase_realtime ADD TABLE public.app_dynamic_banners;
 END IF;
END $$;