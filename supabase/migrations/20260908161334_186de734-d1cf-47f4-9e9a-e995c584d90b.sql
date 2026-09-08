
DROP POLICY "vendors public read" ON public.vendors;
CREATE POLICY "vendors anon read" ON public.vendors FOR SELECT TO anon USING (status = 'APPROVED');
CREATE POLICY "vendors auth read" ON public.vendors FOR SELECT TO authenticated USING (status = 'APPROVED' OR owner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
