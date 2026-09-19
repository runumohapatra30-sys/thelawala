CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.can_view_delivery_partner(_partner_id uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    LEFT JOIN public.vendors v ON v.id = o.vendor_id
    WHERE (o.partner_id = _partner_id OR o.offered_to = _partner_id)
      AND (o.user_id = _viewer_id OR v.owner_id = _viewer_id)
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_delivery_partner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_delivery_partner(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "partners read" ON public.delivery_partners;
CREATE POLICY "partners read"
ON public.delivery_partners
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR private.can_view_delivery_partner(id, auth.uid())
);

DROP FUNCTION IF EXISTS public.can_view_delivery_partner(uuid, uuid);