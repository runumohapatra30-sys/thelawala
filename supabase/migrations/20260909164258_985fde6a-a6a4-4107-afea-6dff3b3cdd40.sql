CREATE OR REPLACE FUNCTION public.admin_storage_usage()
RETURNS TABLE(bucket_id text, bytes bigint, files bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY
  SELECT o.bucket_id::text,
         coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint,
         count(*)::bigint
  FROM storage.objects o
  GROUP BY o.bucket_id;
END; $$;

REVOKE ALL ON FUNCTION public.admin_storage_usage() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_storage_usage() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_unused_banner_objects()
RETURNS TABLE(path text, size_bytes bigint, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  RETURN QUERY
  SELECT o.name::text,
         coalesce((o.metadata->>'size')::bigint, 0)::bigint,
         o.created_at
  FROM storage.objects o
  WHERE o.bucket_id = 'banners'
    AND o.created_at < now() - interval '7 days'
    AND NOT EXISTS (SELECT 1 FROM public.banners b WHERE b.image_path = o.name)
    AND NOT EXISTS (SELECT 1 FROM public.app_dynamic_banners d WHERE d.media_path = o.name)
  ORDER BY o.created_at;
END; $$;

REVOKE ALL ON FUNCTION public.admin_unused_banner_objects() FROM public;
GRANT EXECUTE ON FUNCTION public.admin_unused_banner_objects() TO authenticated;