REVOKE ALL ON FUNCTION public.complete_delivery(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_delivery(uuid, text) TO authenticated;