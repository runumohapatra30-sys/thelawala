REVOKE ALL ON FUNCTION public.complete_delivery(uuid, text) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.complete_delivery(uuid, text);