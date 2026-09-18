DROP POLICY IF EXISTS "partners read" ON public.delivery_partners;
CREATE POLICY "partners read" ON public.delivery_partners FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.orders o
    WHERE (o.partner_id = delivery_partners.id OR o.offered_to = delivery_partners.id)
      AND (
        o.user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = o.vendor_id AND v.owner_id = auth.uid())
      )
  )
);

REVOKE SELECT ON public.vendors FROM anon;
GRANT SELECT (id, stall_name, photo_url, stall_photos, address, zone, lat, lng, is_open, status,
  open_time, close_time, default_prep_minutes, cuisine_types, offer_percent, offer_label,
  created_at, updated_at) ON public.vendors TO anon;