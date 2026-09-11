DROP POLICY IF EXISTS "Everyone can see live festive photos" ON public.home_festive_photos;
CREATE POLICY "Everyone can see live festive photos" ON public.home_festive_photos FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can view active banners" ON public.banners;
CREATE POLICY "Anyone can view active banners" ON public.banners FOR SELECT TO anon, authenticated USING (is_active = true);

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;