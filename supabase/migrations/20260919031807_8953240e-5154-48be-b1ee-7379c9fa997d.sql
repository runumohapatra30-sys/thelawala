CREATE OR REPLACE FUNCTION private.is_order_rider(_partner_id uuid, _offered_to uuid, _viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_partners d
    WHERE d.user_id = _viewer_id
      AND (d.id = _partner_id OR d.id = _offered_to)
  );
$$;

CREATE OR REPLACE FUNCTION private.is_online_approved_rider(_viewer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delivery_partners d
    WHERE d.user_id = _viewer_id
      AND d.status = 'APPROVED'
      AND d.is_online = true
  );
$$;

REVOKE ALL ON FUNCTION private.is_order_rider(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_online_approved_rider(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_order_rider(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_online_approved_rider(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "orders read" ON public.orders;
CREATE POLICY "orders read"
ON public.orders
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = orders.vendor_id AND v.owner_id = auth.uid()
  )
  OR private.is_order_rider(partner_id, offered_to, auth.uid())
  OR (
    partner_id IS NULL
    AND broadcast_at IS NOT NULL
    AND status IN ('SEARCHING_RIDER', 'READY_FOR_PICKUP', 'ORDER_ACCEPTED')
    AND private.is_online_approved_rider(auth.uid())
  )
);

DROP POLICY IF EXISTS "orders update" ON public.orders;
CREATE POLICY "orders update"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.vendors v
    WHERE v.id = orders.vendor_id AND v.owner_id = auth.uid()
  )
  OR private.is_order_rider(partner_id, offered_to, auth.uid())
)
WITH CHECK (true);